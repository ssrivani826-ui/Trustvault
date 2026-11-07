# 🔒 TrustVault — Secure Document Sharing & Verifiable Audit Trail

TrustVault is a secure document management system built as part of the **SNOVASYS Fresher Hiring Challenge 2026 (RISE)**. It prioritizes server-side authorization, tamper-resistant audit trails, immediate access revocation, and defensible security controls.

---

## 🚀 Features Implemented
1. **Secure Authentication:** User registration with salted password hashing (`bcryptjs`) and JSON Web Token (JWT) issuance (`/api/login`).
2. **Server-Side Authorization (`verifyToken`):** Strict middleware verifying JWT tokens and role grants on every protected request.
3. **Secure File Uploads:** Multer-backed storage utilizing random unique hashes to prevent path traversal and unauthorized direct access.
4. **Immediate Access Revocation:** Real-time database checks for `is_revoked`. Revoked files immediately block downloading, returning `403 Forbidden`.
5. **Verifiable Audit Trail:** Automatic tracking of both successful document downloads and blocked/unauthorized attempts, capturing user IDs, actions, detailed contexts, and client IP addresses.

---

## 🛠️ Tech Stack
- **Backend:** Node.js, Express.js
- **Database:** PostgreSQL (`pg` pool connection)
- **Security:** `bcryptjs` (hashing), `jsonwebtoken` (JWT auth), `multer` (file upload handling)
- **Frontend:** HTML5, CSS3, Vanilla JavaScript (served via Express static middleware)

---

## ⚙️ Local Installation & Setup Instructions

1. **Clone the Repository / Open Project Folder:**
   Open your project directory (`V:\Trustvault`) in VS Code.

2. **Install Dependencies:**
   Run the following command in your terminal:
   ```bash
   npm install