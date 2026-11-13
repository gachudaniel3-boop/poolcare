const crypto = require('crypto');
const fs = require('fs');
const os = require('os');
const path = require('path');
const vm = require('vm');
const dotenv = require('dotenv');
const express = require('express');
const mongoose = require('mongoose');
const cloudinary = require('cloudinary').v2;
const multer = require('multer');

dotenv.config({ path: path.join(__dirname, '.env') });

const requiredEnvironment = [
    'ADMIN_PASSWORD',
    'MONGODB_URI',
    'CLOUDINARY_CLOUD_NAME',
    'CLOUDINARY_API_KEY',
    'CLOUDINARY_API_SECRET'
];
const missingEnvironment = requiredEnvironment.filter(key => !process.env[key]);
if (missingEnvironment.length) {
    console.error(`Missing required .env settings: ${missingEnvironment.join(', ')}`);
    process.exit(1);
}

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true
});

const app = express();
const loginAttempts = new Map();
const reviewAttempts = new Map();
const SESSION_TTL_MS = 8 * 60 * 60 * 1000;
const LOGIN_WINDOW_MS = 15 * 60 * 1000;
const MAX_LOGIN_ATTEMPTS = 5;
const REVIEW_WINDOW_MS = 60 * 60 * 1000;
const MAX_REVIEW_SUBMISSIONS = 5;
const CONTENT_KEYS = [
    'projects',
    'services',
    'reviews',
    'products',
    'estimatorConfig',
    'maintenancePlans',
    'branding'
];

const siteContentSchema = new mongoose.Schema({
    key: { type: String, required: true, unique: true },
    value: { type: mongoose.Schema.Types.Mixed, required: true },
    revision: { type: Number, required: true, default: 0 }
}, { timestamps: true, minimize: false });
const SiteContent = mongoose.model('SiteContent', siteContentSchema);
const adminSessionSchema = new mongoose.Schema({
    tokenHash: { type: String, required: true, unique: true },
    expiresAt: { type: Date, required: true, expires: 0 }
}, { versionKey: false });
const AdminSession = mongoose.model('AdminSession', adminSessionSchema);

app.disable('x-powered-by');
app.set('trust proxy', process.env.TRUST_PROXY === 'true' ? 1 : false);
app.use((req, res, next) => {
    res.set({
        'X-Content-Type-Options': 'nosniff',
        'X-Frame-Options': 'SAMEORIGIN',
        'Referrer-Policy': 'strict-origin-when-cross-origin',
        'Permissions-Policy': 'camera=(), microphone=(), geolocation=()'
    });
    if (process.env.NODE_ENV === 'production') {
        res.set('Strict-Transport-Security', 'max-age=31536000');
    }
    next();
});

function loadSeedData() {
    const context = { window: {} };
    const source = fs.readFileSync(path.join(__dirname, 'assets', 'js', 'data.js'), 'utf8');
    vm.runInNewContext(source, context, { timeout: 1000 });
    if (!context.window.PoolcareData) throw new Error('Shared site defaults are unavailable.');
    return JSON.parse(JSON.stringify(context.window.PoolcareData));
}

const seedData = loadSeedData();

function asyncRoute(handler) {
    return (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next);
}

function fail(status, message) {
    const error = new Error(message);
    error.status = status;
    throw error;
}

function isRecord(value) {
    return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function requireRecord(value, label) {
    if (!isRecord(value)) fail(400, `${label} must be an object.`);
    return value;
}

function readString(value, label, maxLength, required) {
    if (typeof value !== 'string') {
        if (!required && value == null) return '';
        fail(400, `${label} must be text.`);
    }
    const text = value.trim();
    if (required && !text) fail(400, `${label} is required.`);
    if (text.length > maxLength) fail(400, `${label} must be ${maxLength} characters or fewer.`);
    return text;
}

function readMediaUrl(value, label, allowLocalAsset) {
    const mediaUrl = readString(value, label, 2048, true);
    if (allowLocalAsset && /^PICTURES\/(?!.*(?:^|\/)\.\.(?:\/|$))[A-Za-z0-9._/-]+$/.test(mediaUrl)) {
        return mediaUrl;
    }
    let parsed;
    try {
        parsed = new URL(mediaUrl);
    } catch {
        fail(400, `${label} must be an https URL.`);
    }
    if (parsed.protocol !== 'https:' || parsed.username || parsed.password) {
        fail(400, `${label} must be a public https URL without embedded credentials.`);
    }
    return parsed.href;
}

function readNumber(value, label, min, max) {
    const number = Number(value);
    if (!Number.isFinite(number) || number < min || number > max) {
        fail(400, `${label} must be a number from ${min} to ${max}.`);
    }
    return number;
}

function normalizeCollectionItem(collection, input, existing) {
    const body = requireRecord(input, 'Item');
    const item = existing ? { ...existing } : {};
    const stringFields = {
        projects: {
            title: [120, true],
            category: [100, false],
            location: [120, true],
            type: [100, true],
            duration: [60, false],
            desc: [4000, false]
        },
        services: {
            name: [120, true],
            desc: [1000, true],
            cat: [40, false],
            icon: [80, false]
        },
        reviews: {
            name: [100, true],
            location: [120, true],
            comment: [2000, true],
            date: [80, false]
        },
        products: {
            name: [120, true],
            desc: [1000, false]
        }
    };
    const fields = stringFields[collection];
    if (!fields) fail(500, 'Unsupported content collection.');

    if (!existing) {
        item.id = typeof body.id === 'string' && body.id.trim()
            ? readString(body.id, 'Item id', 120, true)
            : crypto.randomUUID();
        if (!/^[A-Za-z0-9][A-Za-z0-9_-]*$/.test(item.id)) {
            fail(400, 'Item id may contain only letters, numbers, hyphens, and underscores.');
        }
    }

    for (const [field, [maxLength, required]] of Object.entries(fields)) {
        if (Object.prototype.hasOwnProperty.call(body, field)) {
            item[field] = readString(body[field], field, maxLength, required);
        } else if (!existing && required) {
            fail(400, `${field} is required.`);
        }
    }

    if (collection === 'projects') {
        if (Object.prototype.hasOwnProperty.call(body, 'mainImg')) {
            item.mainImg = readMediaUrl(body.mainImg, 'Project media', false);
        } else if (!existing) {
            fail(400, 'Project media is required.');
        }
        if (Object.prototype.hasOwnProperty.call(body, 'isVideo')) {
            if (typeof body.isVideo !== 'boolean') fail(400, 'isVideo must be a boolean.');
            item.isVideo = body.isVideo;
        } else if (!existing) {
            item.isVideo = false;
        }
    }

    if (collection === 'products') {
        if (Object.prototype.hasOwnProperty.call(body, 'img')) {
            item.img = readMediaUrl(body.img, 'Product image', false);
        } else if (!existing) {
            fail(400, 'Product image is required.');
        }
        if (Object.prototype.hasOwnProperty.call(body, 'price')) {
            item.price = readNumber(body.price, 'Price', 0, 1000000000);
        } else if (!existing) {
            fail(400, 'Price is required.');
        }
    }

    if (collection === 'reviews') {
        if (Object.prototype.hasOwnProperty.call(body, 'rating')) {
            item.rating = readNumber(body.rating, 'Rating', 1, 5);
            if (!Number.isInteger(item.rating)) fail(400, 'Rating must be a whole number from 1 to 5.');
        } else if (!existing) {
            fail(400, 'Rating is required.');
        }
        if (Object.prototype.hasOwnProperty.call(body, 'status')) {
            if (!['pending', 'approved'].includes(body.status)) fail(400, 'Review status is invalid.');
            item.status = body.status;
        } else if (!existing) {
            item.status = 'pending';
        }
        if (!item.date) item.date = 'Just now';
    }

    if (collection === 'services') {
        if (!item.cat) item.cat = 'maintenance';
        if (!item.icon) item.icon = 'fa-water';
    }

    return item;
}

function normalizeEstimator(input, current) {
    const body = requireRecord(input, 'Estimator configuration');
    const config = { ...current };
    const numericFields = [
        'tilingAddonPerSqm',
        'filtrationAddonPerSqm',
        'chlorinePricePerKg',
        'phReducerPricePerKg',
        'algaecidePricePerLiter'
    ];
    for (const field of numericFields) {
        if (Object.prototype.hasOwnProperty.call(body, field)) {
            config[field] = readNumber(body[field], field, 0, 1000000000);
        }
    }
    if (Object.prototype.hasOwnProperty.call(body, 'buildRates')) {
        if (!Array.isArray(body.buildRates) || body.buildRates.length < 1 || body.buildRates.length > 20) {
            fail(400, 'Construction rates must contain between 1 and 20 pool types.');
        }
        config.buildRates = body.buildRates.map((rate, index) => {
            requireRecord(rate, `Construction rate ${index + 1}`);
            return {
                label: readString(rate.label, `Construction rate ${index + 1} label`, 100, true),
                value: readNumber(rate.value, `Construction rate ${index + 1}`, 0, 1000000000)
            };
        });
    }
    return config;
}

function normalizePlan(input, current) {
    const body = requireRecord(input, 'Maintenance plan');
    const plan = { ...current };
    if (Object.prototype.hasOwnProperty.call(body, 'name')) plan.name = readString(body.name, 'Plan name', 80, true);
    if (Object.prototype.hasOwnProperty.call(body, 'price')) plan.price = readNumber(body.price, 'Monthly price', 0, 1000000000);
    if (Object.prototype.hasOwnProperty.call(body, 'frequency')) plan.frequency = readString(body.frequency, 'Visit frequency', 120, true);
    if (Object.prototype.hasOwnProperty.call(body, 'services')) {
        if (!Array.isArray(body.services) || body.services.length > 30) fail(400, 'Plan services must be an array.');
        plan.services = body.services.map((service, index) => readString(service, `Service ${index + 1}`, 160, true));
        if (!plan.services.length) fail(400, 'Add at least one included service.');
    }
    if (Object.prototype.hasOwnProperty.call(body, 'featured')) {
        if (typeof body.featured !== 'boolean') fail(400, 'featured must be a boolean.');
        plan.featured = body.featured;
    }
    return plan;
}

function normalizeBranding(input, current) {
    const body = requireRecord(input, 'Branding');
    const branding = { ...current };
    if (Object.prototype.hasOwnProperty.call(body, 'brandName')) {
        branding.brandName = readString(body.brandName, 'Brand name', 60, true);
    }
    if (Object.prototype.hasOwnProperty.call(body, 'brandSubtitle')) {
        branding.brandSubtitle = readString(body.brandSubtitle, 'Brand subtitle', 60, false);
    }
    if (Object.prototype.hasOwnProperty.call(body, 'logoUrl')) {
        branding.logoUrl = readMediaUrl(body.logoUrl, 'Logo image', true);
    }
    return branding;
}

async function getContentRecord(key) {
    const record = await SiteContent.findOne({ key }).lean();
    if (!record) throw new Error(`Missing database content: ${key}`);
    return record;
}

async function getContent(key) {
    return (await getContentRecord(key)).value;
}

async function setContent(key, value, revision) {
    const result = await SiteContent.updateOne(
        { key, revision },
        { $set: { value }, $inc: { revision: 1 } },
        { runValidators: true }
    );
    if (result.matchedCount !== 1) {
        fail(409, 'Content changed during this update. Reload the page and try again.');
    }
    return value;
}

function digest(value) {
    return crypto.createHash('sha256').update(value, 'utf8').digest();
}

async function getAdminSession(req) {
    const match = /^Bearer ([^\s]+)$/.exec(req.get('authorization') || '');
    if (!match) return null;
    const tokenKey = digest(match[1]).toString('hex');
    const session = await AdminSession.findOne({
        tokenHash: tokenKey,
        expiresAt: { $gt: new Date() }
    }).select('_id').lean();
    return session ? tokenKey : null;
}

function unauthorized(res) {
    return res.status(401).json({ success: false, message: 'Invalid or expired admin session.' });
}

const requireAdmin = asyncRoute(async (req, res, next) => {
    const sessionKey = await getAdminSession(req);
    if (!sessionKey) return unauthorized(res);
    req.adminSessionKey = sessionKey;
    next();
});

function failIfDuplicate(items, itemId) {
    if (items.some(item => item.id === itemId)) fail(409, 'An item with this id already exists.');
}

function collectionRoutes(collection) {
    app.get(`/api/${collection}`, asyncRoute(async (req, res) => {
        const items = await getContent(collection);
        const isAdmin = collection === 'reviews' && Boolean(await getAdminSession(req));
        res.json(collection === 'reviews' && !isAdmin
            ? items.filter(review => review.status === 'approved')
            : items);
    }));

    app.post(`/api/${collection}`, requireAdmin, asyncRoute(async (req, res) => {
        const record = await getContentRecord(collection);
        const items = record.value;
        const item = normalizeCollectionItem(collection, req.body, null);
        failIfDuplicate(items, item.id);
        items.push(item);
        await setContent(collection, items, record.revision);
        res.status(201).json({ item });
    }));

    app.patch(`/api/${collection}/:id`, requireAdmin, asyncRoute(async (req, res) => {
        const record = await getContentRecord(collection);
        const items = record.value;
        const index = items.findIndex(item => item.id === req.params.id);
        if (index < 0) fail(404, 'The requested item was not found.');
        const item = normalizeCollectionItem(collection, req.body, items[index]);
        items[index] = item;
        await setContent(collection, items, record.revision);
        res.json({ item });
    }));

    app.delete(`/api/${collection}/:id`, requireAdmin, asyncRoute(async (req, res) => {
        const record = await getContentRecord(collection);
        const items = record.value;
        const filtered = items.filter(item => item.id !== req.params.id);
        if (filtered.length === items.length) fail(404, 'The requested item was not found.');
        await setContent(collection, filtered, record.revision);
        res.json({ success: true });
    }));
}

const allowedOrigins = new Set(['localhost', '127.0.0.1']);
app.use('/api', (req, res, next) => {
    res.set('Cache-Control', 'no-store');
    const origin = req.get('origin');
    if (!origin) return next();
    let parsedOrigin;
    try {
        parsedOrigin = new URL(origin);
    } catch {
        return res.status(403).json({ success: false, message: 'This origin is not allowed.' });
    }
    const sameOriginHost = parsedOrigin.host === req.get('host');
    const localDevelopmentOrigin = process.env.NODE_ENV !== 'production'
        && allowedOrigins.has(parsedOrigin.hostname);
    if (!sameOriginHost && !localDevelopmentOrigin) {
        return res.status(403).json({ success: false, message: 'This origin is not allowed.' });
    }
    res.set('Access-Control-Allow-Origin', origin);
    res.set('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
    res.set('Access-Control-Allow-Headers', 'Authorization, Content-Type');
    res.vary('Origin');
    if (req.method === 'OPTIONS') return res.sendStatus(204);
    next();
});
app.use(express.json({ limit: '1mb' }));

app.get('/api/health', (_req, res) => {
    const databaseReady = mongoose.connection.readyState === 1;
    res.status(databaseReady ? 200 : 503).json({
        status: databaseReady ? 'ok' : 'unavailable',
        database: databaseReady ? 'connected' : 'disconnected'
    });
});

app.post('/api/admin/login', asyncRoute(async (req, res) => {
    const password = req.body && req.body.password;
    if (typeof password !== 'string' || password.length === 0) {
        return res.status(400).json({ success: false, message: 'Password is required.' });
    }
    const ip = req.ip;
    const now = Date.now();
    for (const [address, entry] of loginAttempts) {
        if (now - entry.startedAt >= LOGIN_WINDOW_MS) loginAttempts.delete(address);
    }
    const attempt = loginAttempts.get(ip);
    if (attempt && now - attempt.startedAt < LOGIN_WINDOW_MS && attempt.count >= MAX_LOGIN_ATTEMPTS) {
        const retryAfter = Math.ceil((LOGIN_WINDOW_MS - (now - attempt.startedAt)) / 1000);
        res.set('Retry-After', String(retryAfter));
        return res.status(429).json({
            success: false,
            message: 'Too many sign-in attempts. Try again later.',
            retryAfterSeconds: retryAfter
        });
    }
    if (!attempt || now - attempt.startedAt >= LOGIN_WINDOW_MS) {
        loginAttempts.set(ip, { startedAt: now, count: 0 });
    }
    if (!crypto.timingSafeEqual(digest(password), digest(process.env.ADMIN_PASSWORD))) {
        loginAttempts.get(ip).count += 1;
        return res.status(401).json({ success: false, message: 'Incorrect administrator password.' });
    }
    loginAttempts.delete(ip);
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + SESSION_TTL_MS);
    await AdminSession.create({ tokenHash: digest(token).toString('hex'), expiresAt });
    return res.json({ success: true, token, expiresAt });
}));

app.get('/api/admin/verify', requireAdmin, (req, res) => {
    res.json({ success: true, authenticated: true });
});

app.post('/api/admin/logout', requireAdmin, asyncRoute(async (req, res) => {
    await AdminSession.deleteOne({ tokenHash: req.adminSessionKey });
    res.json({ success: true });
}));

app.get('/api/site-data', asyncRoute(async (req, res) => {
    const entries = await Promise.all(CONTENT_KEYS.map(async key => [key, await getContent(key)]));
    const data = Object.fromEntries(entries);
    if (!(await getAdminSession(req))) data.reviews = data.reviews.filter(review => review.status === 'approved');
    res.json(data);
}));

collectionRoutes('projects');
collectionRoutes('services');
collectionRoutes('products');

app.get('/api/reviews', asyncRoute(async (req, res) => {
    const reviews = await getContent('reviews');
    res.json((await getAdminSession(req)) ? reviews : reviews.filter(review => review.status === 'approved'));
}));

app.post('/api/reviews', asyncRoute(async (req, res) => {
    const isAdmin = Boolean(await getAdminSession(req));
    const body = requireRecord(req.body, 'Review');
    if (body.status === 'approved' && !isAdmin) return unauthorized(res);
    const record = await getContentRecord('reviews');
    const reviews = record.value;
    const review = normalizeCollectionItem('reviews', {
        ...body,
        status: isAdmin ? (body.status || 'approved') : 'pending'
    }, null);
    failIfDuplicate(reviews, review.id);
    if (!isAdmin) {
        const now = Date.now();
        for (const [address, entry] of reviewAttempts) {
            if (now - entry.startedAt >= REVIEW_WINDOW_MS) reviewAttempts.delete(address);
        }
        let attempt = reviewAttempts.get(req.ip);
        if (attempt && now - attempt.startedAt < REVIEW_WINDOW_MS && attempt.count >= MAX_REVIEW_SUBMISSIONS) {
            const retryAfter = Math.ceil((REVIEW_WINDOW_MS - (now - attempt.startedAt)) / 1000);
            res.set('Retry-After', String(retryAfter));
            return res.status(429).json({
                success: false,
                message: 'Too many review submissions. Please try again later.',
                retryAfterSeconds: retryAfter
            });
        }
        if (!attempt || now - attempt.startedAt >= REVIEW_WINDOW_MS) {
            attempt = { startedAt: now, count: 0 };
            reviewAttempts.set(req.ip, attempt);
        }
        attempt.count += 1;
    }
    reviews.push(review);
    await setContent('reviews', reviews, record.revision);
    res.status(201).json({ item: review });
}));

app.patch('/api/reviews/:id', requireAdmin, asyncRoute(async (req, res) => {
    const record = await getContentRecord('reviews');
    const reviews = record.value;
    const index = reviews.findIndex(review => review.id === req.params.id);
    if (index < 0) fail(404, 'The requested review was not found.');
    reviews[index] = normalizeCollectionItem('reviews', req.body, reviews[index]);
    await setContent('reviews', reviews, record.revision);
    res.json({ item: reviews[index] });
}));

app.delete('/api/reviews/:id', requireAdmin, asyncRoute(async (req, res) => {
    const record = await getContentRecord('reviews');
    const reviews = record.value;
    const filtered = reviews.filter(review => review.id !== req.params.id);
    if (filtered.length === reviews.length) fail(404, 'The requested review was not found.');
    await setContent('reviews', filtered, record.revision);
    res.json({ success: true });
}));

app.get('/api/estimator', asyncRoute(async (req, res) => {
    res.json({ estimatorConfig: await getContent('estimatorConfig') });
}));

app.put('/api/estimator', requireAdmin, asyncRoute(async (req, res) => {
    const record = await getContentRecord('estimatorConfig');
    const estimatorConfig = normalizeEstimator(req.body, record.value);
    await setContent('estimatorConfig', estimatorConfig, record.revision);
    res.json({ estimatorConfig });
}));

app.get('/api/maintenance-plans', asyncRoute(async (req, res) => {
    res.json(await getContent('maintenancePlans'));
}));

app.patch('/api/maintenance-plans/:id', requireAdmin, asyncRoute(async (req, res) => {
    const record = await getContentRecord('maintenancePlans');
    const plans = record.value;
    const index = plans.findIndex(plan => plan.id === req.params.id);
    if (index < 0) fail(404, 'The requested maintenance plan was not found.');
    plans[index] = normalizePlan(req.body, plans[index]);
    await setContent('maintenancePlans', plans, record.revision);
    res.json({ item: plans[index] });
}));

app.get('/api/branding', asyncRoute(async (req, res) => {
    res.json({ branding: await getContent('branding') });
}));

app.put('/api/branding', requireAdmin, asyncRoute(async (req, res) => {
    const record = await getContentRecord('branding');
    const branding = normalizeBranding(req.body, record.value);
    await setContent('branding', branding, record.revision);
    res.json({ branding });
}));

const upload = multer({
    storage: multer.diskStorage({
        destination: (_req, _file, callback) => callback(null, os.tmpdir()),
        filename: (_req, _file, callback) => callback(null, `poolcare-${crypto.randomUUID()}`)
    }),
    limits: { fileSize: 50 * 1024 * 1024, files: 1 },
    fileFilter: (_req, file, callback) => {
        const supported = new Set([
            'image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif',
            'video/mp4', 'video/webm', 'video/quicktime'
        ]);
        if (!supported.has(file.mimetype)) {
            const error = new Error('Upload a JPEG, PNG, WebP, GIF, AVIF, MP4, WebM, or MOV file.');
            error.status = 415;
            return callback(error);
        }
        callback(null, true);
    }
});

app.post('/api/uploads', requireAdmin, upload.single('file'), asyncRoute(async (req, res) => {
    if (!req.file) fail(400, 'Choose an image or video file to upload.');
    try {
        const isVideo = req.file.mimetype.startsWith('video/');
        const result = await cloudinary.uploader.upload(req.file.path, {
            folder: 'poolcare',
            resource_type: isVideo ? 'video' : 'image'
        });
        res.status(201).json({
            url: result.secure_url,
            publicId: result.public_id,
            resourceType: result.resource_type
        });
    } catch (error) {
        error.status = 502;
        error.publicMessage = 'Cloudinary could not store this media. Check the Cloudinary configuration and try again.';
        throw error;
    } finally {
        try {
            await fs.promises.unlink(req.file.path);
        } catch (error) {
            if (error.code !== 'ENOENT') {
                console.error('Temporary upload cleanup failed.', error.name || 'Error');
            }
        }
    }
}));

const privateStaticPaths = new Set([
    '/server.js',
    '/package.json',
    '/package-lock.json',
    '/readme.md',
    '/tailwind.config.js'
]);
app.use((req, res, next) => {
    const requestPath = req.path.toLowerCase();
    if (privateStaticPaths.has(requestPath)
        || /^\/(?:node_modules|\.git)(?:\/|$)/.test(requestPath)) {
        return res.sendStatus(404);
    }
    next();
});
app.use(express.static(__dirname, { dotfiles: 'deny', index: 'index.html' }));

app.use((error, req, res, next) => {
    if (res.headersSent) return next(error);
    if (error instanceof multer.MulterError) {
        const status = error.code === 'LIMIT_FILE_SIZE' ? 413 : 400;
        return res.status(status).json({
            success: false,
            message: status === 413 ? 'Media must be 50 MB or smaller.' : 'The uploaded file could not be processed.'
        });
    }
    if (error.type === 'entity.parse.failed') {
        return res.status(400).json({ success: false, message: 'Request body must contain valid JSON.' });
    }
    if (error.type === 'entity.too.large') {
        return res.status(413).json({ success: false, message: 'Request body is too large.' });
    }
    if (error.status) {
        return res.status(error.status).json({ success: false, message: error.publicMessage || error.message });
    }
    console.error('Request failed.', error.name || 'Error');
    return res.status(500).json({ success: false, message: 'An unexpected server error occurred.' });
});

async function startServer() {
    try {
        await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 10000 });
    } catch (error) {
        console.error(
            `MongoDB connection failed (${error.name || 'Error'}). Check the database username/password, percent-encode reserved URI characters, and allow this server IP in Atlas Network Access.`
        );
        process.exit(1);
    }

    await SiteContent.init();
    await AdminSession.init();
    for (const key of CONTENT_KEYS) {
        await SiteContent.updateOne(
            { key },
            { $setOnInsert: { value: seedData[key], revision: 0 } },
            { upsert: true }
        );
    }
    await SiteContent.updateMany(
        { revision: { $exists: false } },
        { $set: { revision: 0 } }
    );

    const port = Number(process.env.PORT || 5000);
    if (!Number.isInteger(port) || port < 1 || port > 65535) {
        console.error('PORT must be an integer between 1 and 65535.');
        process.exit(1);
    }
    const host = process.env.HOST || '0.0.0.0';
    app.listen(port, host, () => {
        console.log(`Poolcare site running on port ${port}; MongoDB content storage is connected.`);
    });
}

startServer().catch(error => {
    console.error('Poolcare server startup failed.', error.name || 'Error');
    process.exit(1);
});
