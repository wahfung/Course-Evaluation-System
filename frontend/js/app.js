const API_BASE = window.location.protocol === 'file:'
    ? 'http://127.0.0.1:8000/api'
    : `${window.location.origin}/api`;

async function apiFetch(endpoint, options = {}) {
    const token = localStorage.getItem('token');

    const headers = {
        'Content-Type': 'application/json',
        ...options.headers
    };

    // Add token authentication header
    if (token) {
        headers['Authorization'] = `Token ${token}`;
    }

    const config = {
        ...options,
        headers
    };

    const response = await fetch(`${API_BASE}${endpoint}`, config);
    if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
            // Token expired or invalid, redirect to login
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            window.location.href = 'index.html';
            return;
        }
        throw new Error(`API Error: ${response.statusText}`);
    }
    // Handle empty response (204 No Content)
    if (response.status === 204) {
        return null;
    }
    return response.json();
}

function checkAuth() {
    const user = JSON.parse(localStorage.getItem('user'));
    const token = localStorage.getItem('token');
    if (!user || !token) {
        window.location.href = 'index.html';
    }
    return user;
}

function logout() {
    const token = localStorage.getItem('token');
    fetch(`${API_BASE}/auth/logout/`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': token ? `Token ${token}` : ''
        }
    }).finally(() => {
        localStorage.removeItem('user');
        localStorage.removeItem('token');
        window.location.href = 'index.html';
    });
}
