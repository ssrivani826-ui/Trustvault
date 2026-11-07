# TrustVault AI Work Log (PROMPTS.md)

## Entry 1: Project Initialization & Authentication
- **Date/Time:** 03-Nov-2026, 10:30 AM
- **Task & Prompt:** Initialize Node.js backend with Express, PostgreSQL connection pool, bcryptjs password hashing, and JWT token authentication routes (`/api/register`, `/api/login`).
- **Generated Result:** Provided complete server-side setup for user management and secure login tokens.
- **Security/Quality Issue Found:** Needed proper middleware to protect downstream routes and prevent unauthenticated access.
- **Verification Method:** Tested registration and login endpoints via PowerShell and native scripts.
- **Fix Made:** Implemented `verifyToken` middleware checking the `Authorization: Bearer <token>` header.
- **Remaining Concern:** Ensuring token expiration and secret management via `.env`.

## Entry 2: File Upload and PowerShell Compatibility
- **Date/Time:** 03-Nov-2026, 02:00 PM
- **Task & Prompt:** Implement secure document upload using `multer` and test it via terminal.
- **Generated Result:** Setup `/api/documents/upload` with local destination storage and file parsing.
- **Security/Quality Issue Found:** Windows PowerShell 5.1 threw `Cannot find type [System.Net.Http.MultipartFormDataContent]` errors during curl/HTTP testing.
- **Verification Method:** Ran custom node test scripts.
- **Fix Made:** Switched to native Node.js `fetch` and `FormData` with `fs.readFileSync` for seamless file uploads without extra module dependencies.
- **Remaining Concern:** Enforcing strict allowlist for file types and MIME checks.

## Entry 3: Audit Logging & Revocation Enforcement
- **Date/Time:** 03-Nov-2026, 04:30 PM
- **Task & Prompt:** Implement immediate access revocation and track download attempts (both successful and blocked) inside an audit trail.
- **Generated Result:** Added `is_revoked` flag to documents and `logAudit` helper for tracking actions and client IPs (`req.ip`).
- **Security/Quality Issue Found:** Old links or cached states could potentially bypass checks if not evaluated live.
- **Verification Method:** Tested downloading a revoked document ID; verified `403 Forbidden` response and `DOWNLOAD_BLOCKED` event insertion.
- **Fix Made:** Enforced live database lookup on every download request to check `document.is_revoked` before streaming bytes.
- **Remaining Concern:** Exporting signed checkpoints for audit verification.

## Entry 4: Frontend Dashboard Integration & Routing Fix
- **Date/Time:** 04-Nov-2026, 11:15 AM
- **Task & Prompt:** Create a simple HTML/JS frontend dashboard (`public/index.html` & `public/app.js`) to visually manage logins, uploads, and audit logs.
- **Generated Result:** Provided browser UI code and static serving configuration.
- **Security/Quality Issue Found:** Express root route (`app.get('/')`) was intercepting requests, returning JSON health-check text instead of loading `public/index.html`.
- **Verification Method:** Opened `http://localhost:5000` in Chrome.
- **Fix Made:** Moved `app.use(express.static('public'))` to the top and relocated health check route to `/api/health`.
- **Remaining Concern:** Adding dynamic document list and single-click revocation buttons to the UI.