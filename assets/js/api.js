// Browser code uses the Express API for shared content and never receives .env credentials.
(function() {
    const DATA_KEY = 'poolcare-site-data';
    const TOKEN_KEY = 'poolcare-admin-token';
    const MAX_DEMO_UPLOAD_BYTES = 2 * 1024 * 1024;
    const API_BASE_URL = location.protocol === 'http:' &&
        ['localhost', '127.0.0.1'].includes(location.hostname) &&
        location.port !== '5000'
        ? 'http://localhost:5000'
        : '';
    let demoMode = location.protocol === 'file:';

    function clone(value) {
        return JSON.parse(JSON.stringify(value));
    }

    function readData() {
        try {
            const serialized = localStorage.getItem(DATA_KEY);
            return serialized ? JSON.parse(serialized) : null;
        } catch (error) {
            throw new Error(`Local site data could not be read: ${error.message}`);
        }
    }

    function writeData(data) {
        try {
            localStorage.setItem(DATA_KEY, JSON.stringify(data));
        } catch (error) {
            throw new Error(`Local site data could not be saved: ${error.message}`);
        }
    }

    function requireSeedData() {
        if (!window.PoolcareData) throw new Error('Poolcare shared default data has not loaded.');
        return clone(window.PoolcareData);
    }

    async function request(path, options, requireApi) {
        if (location.protocol === 'file:') {
            if (requireApi) throw new Error('Admin sign-in requires the site to be served by its Express server.');
            demoMode = true;
            return null;
        }
        try {
            const headers = { ...(options && options.headers ? options.headers : {}) };
            const token = sessionStorage.getItem(TOKEN_KEY);
            if (token) headers.Authorization = `Bearer ${token}`;
            const response = await fetch(`${API_BASE_URL}${path}`, {
                credentials: 'same-origin',
                ...options,
                headers
            });
            if (requireApi && response.status === 405) {
                throw new Error('The admin API rejected this request (HTTP 405). Start the Poolcare Express server and open http://localhost:5000/admin.html.');
            }
            if (response.status === 404) {
                if (requireApi) {
                    const error = new Error(`API route not found: ${path}`);
                    error.status = response.status;
                    throw error;
                }
                throw new Error(`API route not found: ${path}`);
            }
            if (response.status === 204) {
                demoMode = false;
                return {};
            }
            const contentType = response.headers.get('content-type') || '';
            if (!contentType.includes('application/json')) {
                if (requireApi) throw new Error(`The admin API returned an invalid response (${response.status}).`);
                throw new Error(`The Poolcare API returned an invalid response (${response.status}).`);
            }
            const result = await response.json();
            if (!response.ok) {
                const error = new Error(result.message || `API request failed (${response.status}).`);
                error.status = response.status;
                if (response.status === 429) {
                    error.retryAfterSeconds = Number(result.retryAfterSeconds || response.headers.get('Retry-After') || 0);
                }
                throw error;
            }
            demoMode = false;
            return result;
        } catch (error) {
            if (error instanceof TypeError) {
                if (requireApi) throw new Error(`The Poolcare admin API is unavailable: ${error.message}`);
                throw new Error(`The Poolcare API is unavailable: ${error.message}`);
            }
            throw error;
        }
    }

    async function initialize(defaults) {
        const remote = await request('/api/site-data');
        if (remote) {
            const local = readData();
            const merged = { ...clone(defaults), ...(local || {}), ...remote };
            return merged;
        }
        const local = readData();
        if (local) return { ...clone(defaults), ...local };
        const initial = clone(defaults);
        writeData(initial);
        return initial;
    }

    function readCollection(collection) {
        const data = readData() || requireSeedData();
        return clone(data[collection] || []);
    }

    async function getCollection(endpoint, collection) {
        const remote = await request(`/api/${endpoint}`);
        return remote ? (Array.isArray(remote) ? remote : remote[collection] || []) : readCollection(collection);
    }

    async function addCollectionItem(endpoint, collection, item) {
        const remote = await request(`/api/${endpoint}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(item)
        });
        if (remote) {
            const current = readData() || requireSeedData();
            current[collection] = await getCollection(endpoint, collection);
            writeData(current);
            return remote.item || remote;
        }
        const current = readData() || requireSeedData();
        current[collection].push(clone(item));
        writeData(current);
        return item;
    }

    async function updateCollectionItem(endpoint, collection, id, updates) {
        const remote = await request(`/api/${endpoint}/${encodeURIComponent(id)}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updates)
        });
        if (remote) {
            const current = readData() || requireSeedData();
            current[collection] = await getCollection(endpoint, collection);
            writeData(current);
            return remote.item || remote;
        }
        const current = readData() || requireSeedData();
        const item = current[collection].find(entry => entry.id === id);
        if (!item) throw new Error(`Could not find ${collection} item "${id}".`);
        Object.assign(item, clone(updates));
        writeData(current);
        return item;
    }

    async function deleteCollectionItem(endpoint, collection, id) {
        const remote = await request(`/api/${endpoint}/${encodeURIComponent(id)}`, { method: 'DELETE' });
        if (remote) {
            const current = readData() || requireSeedData();
            current[collection] = await getCollection(endpoint, collection);
            writeData(current);
            return;
        }
        const current = readData() || requireSeedData();
        current[collection] = current[collection].filter(entry => entry.id !== id);
        writeData(current);
    }

    async function updateDocument(endpoint, key, updates) {
        const remote = await request(endpoint, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updates)
        });
        if (remote) {
            const current = readData() || requireSeedData();
            current[key] = remote[key] || remote;
            writeData(current);
            return current[key];
        }
        const current = readData() || requireSeedData();
        current[key] = { ...current[key], ...clone(updates) };
        writeData(current);
        return current[key];
    }

    function encodeFile(file) {
        if (file.size > MAX_DEMO_UPLOAD_BYTES) {
            throw new Error('Local preview uploads must be 2 MB or smaller. Run the Express server to upload larger files to Cloudinary.');
        }
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = () => reject(new Error('The selected media file could not be read.'));
            reader.readAsDataURL(file);
        });
    }

    async function uploadMedia(file, mediaType) {
        if (!file) throw new Error('Choose a file to upload.');
        const isImage = file.type.startsWith('image/');
        const isVideo = file.type.startsWith('video/');
        if (mediaType === 'image' && !isImage) throw new Error('Choose an image file.');
        if (mediaType === 'media' && !isImage && !isVideo) throw new Error('Choose an image or video file.');
        const formData = new FormData();
        formData.append('file', file);
        const remote = await request('/api/uploads', { method: 'POST', body: formData });
        if (remote) {
            if (!remote.url) throw new Error('The media upload response did not include a URL.');
            return remote.url;
        }
        return encodeFile(file);
    }

    async function loginAdmin(password) {
        const remote = await request('/api/admin/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ password })
        }, true);
        if (!remote || remote.success !== true || !remote.token) {
            throw new Error('The admin login response did not include a valid session token.');
        }
        sessionStorage.setItem(TOKEN_KEY, remote.token);
        return { mode: 'server' };
    }

    async function hasAdminSession() {
        if (!sessionStorage.getItem(TOKEN_KEY)) return false;
        try {
            const remote = await request('/api/admin/verify', {}, true);
            if (remote && remote.success === true && remote.authenticated === true) return true;
            sessionStorage.removeItem(TOKEN_KEY);
            return false;
        } catch (error) {
            if (error.status === 401) {
                sessionStorage.removeItem(TOKEN_KEY);
                return false;
            }
            throw error;
        }
    }

    async function logoutAdmin() {
        if (!sessionStorage.getItem(TOKEN_KEY)) return;
        try {
            await request('/api/admin/logout', { method: 'POST' }, true);
        } finally {
            sessionStorage.removeItem(TOKEN_KEY);
        }
    }

    window.PoolcareAPI = {
        get isDemoMode() { return demoMode; },
        initialize,
        getProjects: () => getCollection('projects', 'projects'),
        addProject: item => addCollectionItem('projects', 'projects', item),
        deleteProject: id => deleteCollectionItem('projects', 'projects', id),
        getServices: () => getCollection('services', 'services'),
        addService: item => addCollectionItem('services', 'services', item),
        deleteService: id => deleteCollectionItem('services', 'services', id),
        getReviews: () => getCollection('reviews', 'reviews'),
        submitReview: review => addCollectionItem('reviews', 'reviews', review),
        addReview: review => addCollectionItem('reviews', 'reviews', review),
        approveReview: id => updateCollectionItem('reviews', 'reviews', id, { status: 'approved' }),
        deleteReview: id => deleteCollectionItem('reviews', 'reviews', id),
        getProducts: () => getCollection('products', 'products'),
        addProduct: item => addCollectionItem('products', 'products', item),
        deleteProduct: id => deleteCollectionItem('products', 'products', id),
        getEstimatorConfig: async () => {
            const remote = await request('/api/estimator');
            return remote ? (remote.estimatorConfig || remote) : (readData() || requireSeedData()).estimatorConfig;
        },
        updateEstimatorConfig: updates => updateDocument('/api/estimator', 'estimatorConfig', updates),
        getMaintenancePlans: () => getCollection('maintenance-plans', 'maintenancePlans'),
        updateMaintenancePlan: (id, updates) => updateCollectionItem('maintenance-plans', 'maintenancePlans', id, updates),
        getBranding: async () => {
            const remote = await request('/api/branding');
            return remote ? (remote.branding || remote) : (readData() || requireSeedData()).branding;
        },
        updateBranding: updates => updateDocument('/api/branding', 'branding', updates),
        uploadMedia,
        loginAdmin,
        hasAdminSession,
        logoutAdmin
    };
})();
