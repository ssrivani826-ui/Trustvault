# TrustVault Threat Model & Security Analysis

## 1. IDOR (Insecure Direct Object Reference)
- **Asset:** Document download and details.
- **Attacker Capability:** User A tries to access User B's document ID by guessing sequential numbers (e.g., ID 1, 2, 3).
- **Mitigation:** Server-side token verification (`verifyToken`) and strict database checks on every request.
- **Test Result:** Returns `403/404` for unauthorized or ungranted users.

## 2. Revocation Bypass
- **Asset:** Revoked documents and sensitive files.
- **Attacker Capability:** Using an old download link or cached token after a document has been revoked by the owner.
- **Mitigation:** Live database query checking `is_revoked = true` on every single download request. Immediate block with `403 Forbidden` and `DOWNLOAD_BLOCKED` audit logging.
- **Test Result:** Revoked document downloads fail instantly.

## 3. Path Traversal & Malicious Uploads
- **Asset:** Server filesystem and storage directory.
- **Attacker Capability:** Uploading a file with a malicious name (e.g., `../../etc/passwd`) to overwrite server files.
- **Mitigation:** Using `multer` with randomized unique hashes (`dest: 'uploads/'`) instead of trusting client-provided filenames.
- **Test Result:** Files are securely stored with opaque names, preventing path traversal.

## 4. SQL Injection (SQLi)
- **Asset:** PostgreSQL database containing user credentials and documents.
- **Attacker Capability:** Injecting malicious SQL statements into login or registration input fields.
- **Mitigation:** Using parameterized queries (`$1, $2, $3`) via `pg` library for all database interactions.
- **Test Result:** Malicious strings are treated as literal text values, blocking SQL injection.

## 5. Audit Log Tampering & Replay
- **Asset:** System audit trail and security logs.
- **Attacker Capability:** An attacker or rogue user attempting to delete or alter logs to hide unauthorized access attempts.
- **Mitigation:** Append-only database design (`INSERT` only routes for audit logs) restricted to system-level execution paths, combined with IP tracking (`req.ip`).
- **Test Result:** Unauthorized users cannot modify or clear audit records.