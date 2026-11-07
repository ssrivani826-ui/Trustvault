-- Create Users Table
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(100) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(50) DEFAULT 'Viewer', -- 'Admin' or 'Viewer'
    status VARCHAR(50) DEFAULT 'Active', -- 'Active' or 'Deactivated'
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create Documents Table
CREATE TABLE IF NOT EXISTS documents (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    file_path TEXT NOT NULL,
    owner_id INT REFERENCES users(id),
    is_revoked BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create Audit Logs Table
CREATE TABLE IF NOT EXISTS audit_logs (
    id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(id),
    action VARCHAR(100) NOT NULL,
    details TEXT,
    ip_address VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Seed Default Admin User (Password: secretpassword123)
INSERT INTO users (username, email, password_hash, role, status) 
VALUES ('SecOps Admin', 'admin@trustvault.com', '$2a$10$X7vQjX3nO3W2vF0z8bF8z.2f8z8z8z8z8z8z8z8z8z8z8z8z8z8zO', 'Admin', 'Active')
ON CONFLICT (email) DO NOTHING;