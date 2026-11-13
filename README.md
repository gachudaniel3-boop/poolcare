# Poolcare Contractors Website

## Run the website and Admin Portal

Install Node.js, create a root `.env` file from `.env.example`, and set the administrator, MongoDB Atlas, and Cloudinary values. URL-encode reserved characters in the MongoDB username/password (including `@`, `:`, `/`, `?`, `#`, `[`, and `]`). In PowerShell, use `npm.cmd` if the execution policy blocks `npm.ps1`:

```powershell
npm.cmd install
npm.cmd run build
npm.cmd start
```

`npm run build` generates the local minified Tailwind stylesheet. The generated `assets/css/tailwind.css` is served directly and does not require Tailwind at runtime.

Open `http://localhost:5000` for the public site or `http://localhost:5000/admin.html` for the Admin Portal. The root `index.html` forwards to the public site, where `PICTURES/p-assets/download.mp4` plays as a preloader while the page initializes. The server seeds each missing MongoDB content record with built-in defaults; it never replaces existing database content at startup. Projects, services, reviews, products, estimator settings, plans, and branding are stored in MongoDB. Images and videos uploaded in the Admin Portal are stored in Cloudinary, and their URLs are saved in MongoDB.

Keep `.env` out of version control. The Express server—not browser JavaScript—reads `ADMIN_PASSWORD`, `MONGODB_URI`, and Cloudinary credentials. The Cloudinary API secret is used only by the server. Never add secrets to `assets/js` or a frontend environment bundle.

The Admin Portal compares passwords on the server. Bearer tokens are stored as hashes in MongoDB, expire after eight hours, and are revoked when the administrator logs out. Browser localStorage is used only when the site is opened directly as a local file; HTTP/API errors are surfaced instead of being reported as successful local saves. Existing localStorage customizations are not automatically imported into MongoDB: recreate them in the Admin Portal after connecting the database.

Each content list is currently stored in one MongoDB document. Revision checks reject simultaneous conflicting writes with HTTP 409 instead of silently overwriting newer content. Keep an eye on MongoDB's 16 MB document limit; large review/project collections should be normalized into separate documents before growing at scale.

For another device on the same network, run the server on this computer and open `http://<this-computer-LAN-IP>:5000`. `localhost` on another device refers to that other device. For access outside the local network, deploy this Node server behind HTTPS on a public host and use that host's URL. Set `TRUST_PROXY=true` only when your deployment uses a trusted reverse proxy; otherwise leave it false. Localhost cross-origin development access is disabled when `NODE_ENV=production`.

## API contract

`assets/js/api.js` centralizes the content routes below. Authenticated requests automatically include `Authorization: Bearer <token>`.

| Method | Route | Purpose |
|---|---|---|
| GET | `/api/site-data` | Load public site content |
| GET, POST | `/api/projects` | List and create projects |
| PATCH, DELETE | `/api/projects/:id` | Update or remove a project |
| GET, POST | `/api/services` | List and create services |
| PATCH, DELETE | `/api/services/:id` | Update or remove a service |
| GET, POST | `/api/reviews` | Public GET returns approved reviews; POST queues a visitor review as pending. Authenticated admin GET may return the moderation queue. |
| PATCH, DELETE | `/api/reviews/:id` | Approve or remove a review |
| GET, POST | `/api/products` | List and create store items |
| PATCH, DELETE | `/api/products/:id` | Update or remove a store item |
| GET, PUT | `/api/estimator` | Read and update estimator values |
| GET, PATCH | `/api/maintenance-plans` | Read and update maintenance plans |
| GET, PUT | `/api/branding` | Read and update website identity |
| POST | `/api/uploads` | Upload image/video media and return its URL |
| POST | `/api/admin/login` | Verify admin password and return a session token |
| GET | `/api/admin/verify` | Validate the bearer token |
| POST | `/api/admin/logout` | Revoke the bearer token |
| GET | `/api/health` | Report server and MongoDB readiness |

Admin content writes and uploads require server-side authorization. Public review submissions are always stored as pending; only an authenticated administrator can approve or delete reviews. Uploads accept supported image/video formats up to 50 MB. Quote requests and store orders are sent through WhatsApp only; there is no lead/order database or payment processing. Login and public-review rate limits are currently in-memory and per server instance, so use a shared rate-limit store before scaling horizontally. Font Awesome and Google Fonts remain third-party CDN dependencies, and the page still uses inline event handlers; replace these with pinned/local assets and remove inline handlers before enforcing a strict Content Security Policy.
