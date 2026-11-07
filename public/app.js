let authToken = localStorage.getItem('trustvault_token') || "";
let currentUser = JSON.parse(localStorage.getItem('trustvault_user') || "{}");
let allDocuments = [];

// Initialize Dashboard if token exists
window.onload = () => {
    if (authToken) {
        showDashboard();
    }
};

function switchTab(tab) {
    const loginForm = document.getElementById('loginForm');
    const regForm = document.getElementById('registerForm');
    const tabBtns = document.querySelectorAll('.tab-btn');

    if (tab === 'login') {
        loginForm.classList.remove('hidden');
        regForm.classList.add('hidden');
        tabBtns[0].classList.add('active');
        tabBtns[1].classList.remove('active');
    } else {
        loginForm.classList.add('hidden');
        regForm.classList.remove('hidden');
        tabBtns[0].classList.remove('active');
        tabBtns[1].classList.add('active');
    }
}

async function handleLogin(e) {
    e.preventDefault();
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;

    try {
        const res = await fetch('/api/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });
        const data = await res.json();

        if (data.success) {
            authToken = data.token;
            
            // Decode payload from JWT Token
            const payload = JSON.parse(atob(authToken.split('.')[1]));
            currentUser = payload;

            localStorage.setItem('trustvault_token', authToken);
            localStorage.setItem('trustvault_user', JSON.stringify(currentUser));

            showDashboard();
        } else {
            alert("Login Failed: " + data.error);
        }
    } catch (err) {
        alert("Error logging in: " + err.message);
    }
}

async function handleRegister(e) {
    e.preventDefault();
    const username = document.getElementById('regUsername').value;
    const email = document.getElementById('regEmail').value;
    const password = document.getElementById('regPassword').value;
    const role = document.getElementById('regRole').value;

    try {
        const res = await fetch('/api/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, email, password, role })
        });
        const data = await res.json();

        if (data.success) {
            alert("Account created successfully! You can now log in.");
            switchTab('login');
            document.getElementById('loginEmail').value = email;
        } else {
            alert("Registration Failed: " + data.error);
        }
    } catch (err) {
        alert("Error creating account: " + err.message);
    }
}

function showDashboard() {
    document.getElementById('authBox').classList.add('hidden');
    document.getElementById('mainDashboard').classList.remove('hidden');
    document.getElementById('userInfo').classList.remove('hidden');
    document.getElementById('userRoleBadge').textContent = currentUser.role || 'Viewer';

    // Hide Upload Section if User is NOT Admin
    if (currentUser.role !== 'Admin') {
        document.getElementById('uploadCard').classList.add('hidden');
    } else {
        document.getElementById('uploadCard').classList.remove('hidden');
    }

    loadVaultData();
    loadAuditLogs();
}

function logout() {
    authToken = "";
    currentUser = {};
    localStorage.clear();
    document.getElementById('mainDashboard').classList.add('hidden');
    document.getElementById('userInfo').classList.add('hidden');
    document.getElementById('authBox').classList.remove('hidden');
}

async function handleUpload(e) {
    e.preventDefault();
    const title = document.getElementById('uploadTitle').value;
    const fileInput = document.getElementById('uploadFile');

    const formData = new FormData();
    formData.append('title', title);
    formData.append('file', fileInput.files[0]);

    try {
        const res = await fetch('/api/documents/upload', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${authToken}` },
            body: formData
        });
        const data = await res.json();

        if (data.success) {
            alert("Document successfully uploaded to TrustVault!");
            document.getElementById('uploadTitle').value = "";
            fileInput.value = "";
            loadVaultData();
            loadAuditLogs();
        } else {
            alert("Upload failed: " + data.error);
        }
    } catch (err) {
        alert("Upload error: " + err.message);
    }
}

async function loadVaultData() {
    try {
        const res = await fetch('/api/documents');
        const data = await res.json();

        if (data.success) {
            allDocuments = data.documents;
            renderDocumentsTable(allDocuments);
            updateStats(allDocuments);
        }
    } catch (err) {
        console.error("Failed to load documents:", err);
    }
}

function renderDocumentsTable(docs) {
    const tbody = document.getElementById('vaultTableBody');
    tbody.innerHTML = "";

    if (docs.length === 0) {
        tbody.innerHTML = `<tr><td colspan="4" style="text-align: center; color: var(--text-muted);">No documents match your query.</td></tr>`;
        return;
    }

    docs.forEach(doc => {
        const tr = document.createElement('tr');
        const statusBadge = doc.is_revoked 
            ? `<span class="status-tag status-revoked">Revoked</span>`
            : `<span class="status-tag status-active">Active</span>`;

        // Admin Actions vs Viewer Actions
        let actionButtons = `<button class="action-btn btn-download" onclick="downloadFile(${doc.id}, '${doc.title}')">Download</button>`;
        
        if (currentUser.role === 'Admin' && !doc.is_revoked) {
            actionButtons += `<button class="action-btn btn-revoke" onclick="revokeFile(${doc.id})">Revoke</button>`;
        }

        tr.innerHTML = `
            <td>#${doc.id}</td>
            <td><strong>${doc.title}</strong></td>
            <td>${statusBadge}</td>
            <td>${actionButtons}</td>
        `;
        tbody.appendChild(tr);
    });
}

function updateStats(docs) {
    const total = docs.length;
    const revoked = docs.filter(d => d.is_revoked).length;
    const active = total - revoked;

    document.getElementById('statTotal').textContent = total;
    document.getElementById('statActive').textContent = active;
    document.getElementById('statRevoked').textContent = revoked;
}

function filterDocuments() {
    const query = document.getElementById('searchInput').value.toLowerCase();
    const filtered = allDocuments.filter(doc => doc.title.toLowerCase().includes(query));
    renderDocumentsTable(filtered);
}

async function downloadFile(id, title) {
    try {
        const res = await fetch(`/api/documents/${id}/download`, {
            method: 'GET',
            headers: { 'Authorization': `Bearer ${authToken}` }
        });

        if (!res.ok) {
            const err = await res.json();
            alert("Security Alert: " + err.error);
            loadAuditLogs();
            return;
        }

        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${title}.txt`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        
        loadAuditLogs();
    } catch (err) {
        alert("Download failed: " + err.message);
    }
}

async function revokeFile(id) {
    if (!confirm(`Are you sure you want to revoke Document #${id}?`)) return;

    try {
        const res = await fetch(`/api/documents/${id}/revoked`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' }
        });
        const data = await res.json();

        if (data.success) {
            alert("Document revoked.");
            loadVaultData();
            loadAuditLogs();
        } else {
            alert("Error: " + data.error);
        }
    } catch (err) {
        alert("Revoke error: " + err.message);
    }
}

async function loadAuditLogs() {
    try {
        const res = await fetch('/api/audit-logs', {
            method: 'GET',
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        const data = await res.json();

        if (data.success) {
            document.getElementById('auditLogsView').textContent = JSON.stringify(data.logs, null, 2);
        }
    } catch (err) {
        console.error("Failed to load audit logs:", err);
    }
}