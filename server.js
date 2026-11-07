const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const multer = require('multer');
require('dotenv').config();

const app = express();
app.use(express.json());
app.use(cors());

// Serve static frontend dashboard files from the 'public' folder
app.use(express.static('public'));

const upload = multer({ dest: 'uploads/' });

// PostgreSQL Database Connection Pool
const pool = new Pool({
    connectionString: process.env.DATABASE_URL || 'postgresql://postgres:password@localhost:5432/trustvault'
});

const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || 'my_super_secret_trustvault_key_2026';

// Health Check Route
app.get('/api/health', (req, res) => {
    res.json({ status: "success", message: "TrustVault Secure API is running!", timestamp: new Date() });
});

// Audit Logging Helper Function
async function logAudit(userId, action, details, ip) {
    try {
        await pool.query(
            'INSERT INTO audit_logs (user_id, action, details, ip_address) VALUES ($1, $2, $3, $4)',
            [userId || null, action, details, ip]
        );
    } catch (err) {
        console.error("Audit log failed:", err.message);
    }
}

// User Login Route
app.post('/api/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const clientIp = req.ip || req.connection.remoteAddress;

        const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
        if (result.rows.length === 0) {
            await logAudit(null, 'LOGIN_FAILURE', `User not found for ${email}`, clientIp);
            return res.status(401).json({ success: false, error: "Invalid email or password" });
        }

        const user = result.rows[0];

        // Check if account is deactivated
        if (user.status === 'Deactivated') {
            await logAudit(user.id, 'INACTIVE_USER_ACCESS_ATTEMPT', `Login rejected: Account deactivated for ${email}`, clientIp);
            return res.status(403).json({ success: false, error: "Access denied. Account is deactivated." });
        }

        const isMatch = await bcrypt.compare(password, user.password_hash);
        if (!isMatch) {
            await logAudit(user.id, 'LOGIN_FAILURE', `Incorrect password for ${email}`, clientIp);
            return res.status(401).json({ success: false, error: "Invalid email or password" });
        }

        const token = jwt.sign(
            { id: user.id, email: user.email, role: user.role, username: user.username },
            JWT_SECRET,
            { expiresIn: '1h' }
        );

        await logAudit(user.id, 'LOGIN_SUCCESS', `User ${email} logged in successfully`, clientIp);

        res.json({
            success: true,
            message: "Login successful",
            token: token,
            user: { id: user.id, username: user.username, email: user.email, role: user.role }
        });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// Authentication Middleware
function verifyToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ success: false, error: "Access denied. No token provided." });
    }

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) return res.status(403).json({ success: false, error: "Invalid or expired token." });
        req.user = user;
        next();
    });
}

// Get All Users (Admin console feature)
app.get('/api/users', verifyToken, async (req, res) => {
    try {
        const result = await pool.query('SELECT id, username, email, role, status, created_at FROM users ORDER BY id ASC');
        res.json({ success: true, users: result.rows });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// Toggle User Status (Active / Deactivated)
app.patch('/api/users/:id/status', verifyToken, async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body; // 'Active' or 'Deactivated'

        const result = await pool.query(
            'UPDATE users SET status = $1 WHERE id = $2 RETURNING id, username, email, role, status',
            [status, id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, error: "User not found" });
        }

        res.json({ success: true, message: `User status updated to ${status}`, user: result.rows[0] });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// Get Audit Logs
app.get('/api/audit-logs', verifyToken, async (req, res) => {
    try {
        const logs = await pool.query('SELECT * FROM audit_logs ORDER BY created_at DESC');
        res.json({ success: true, logs: logs.rows });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// Document Upload
app.post('/api/documents/upload', verifyToken, upload.single('file'), async (req, res) => {
    try {
        const { title } = req.body;
        const owner_id = req.user.id;
        const filePath = req.file.path;
        const clientIp = req.ip || req.connection.remoteAddress;

        const result = await pool.query(
            'INSERT INTO documents (title, file_path, owner_id) VALUES ($1, $2, $3) RETURNING *',
            [title, filePath, owner_id]
        );

        await logAudit(owner_id, 'DOCUMENT_UPLOADED', `Uploaded document ${title}`, clientIp);

        res.status(201).json({ success: true, document: result.rows[0] });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// Get All Documents (Secured with verifyToken)
app.get('/api/documents', verifyToken, async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM documents ORDER BY created_at DESC');
        res.json({ success: true, documents: result.rows });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// Search Documents API Route
app.get('/api/documents/search', verifyToken, async (req, res) => {
    try {
        const { query } = req.query;
        const result = await pool.query(
            "SELECT * FROM documents WHERE title ILIKE $1 OR file_path ILIKE $1 ORDER BY created_at DESC",
            [`%${query || ''}%`]
        );
        res.json({ success: true, documents: result.rows });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// Revoke Document
app.patch('/api/documents/:id/revoked', verifyToken, async (req, res) => {
    try {
        const { id } = req.params;
        const clientIp = req.ip || req.connection.remoteAddress;

        const result = await pool.query('UPDATE documents SET is_revoked = true WHERE id = $1 RETURNING *', [id]);
        if (result.rows.length === 0) return res.status(404).json({ success: false, error: "Document not found" });

        await logAudit(req.user.id, 'ACCESS_REVOKED', `Revoked document ID ${id}`, clientIp);
        res.json({ success: true, message: "Document revoked successfully", document: result.rows[0] });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// Download Document
app.get('/api/documents/:id/download', verifyToken, async (req, res) => {
    try {
        const { id } = req.params;
        const result = await pool.query('SELECT * FROM documents WHERE id = $1', [id]);
        if (result.rows.length === 0) return res.status(404).json({ success: false, error: "Document not found" });

        const document = result.rows[0];
        const clientIp = req.ip || req.connection.remoteAddress;

        if (document.is_revoked) {
            await logAudit(req.user.id, 'DOWNLOAD_BLOCKED', `Blocked attempt to download revoked document ID ${id}`, clientIp);
            return res.status(403).json({ success: false, error: "Access denied. This document has been revoked." });
        }

        await logAudit(req.user.id, 'DOCUMENT_DOWNLOADED', `Downloaded document ID ${id} (${document.title})`, clientIp);
        res.download(document.file_path);
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

app.listen(PORT, () => {
    console.log(`TrustVault server running securely on port ${PORT}`);
});