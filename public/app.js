// FekoYaha - Frontend Logic
const homePage = document.getElementById('homePage');
const roomPage = document.getElementById('roomPage');
const roomForm = document.getElementById('roomForm');
const keywordInput = document.getElementById('keywordInput');

// Configuration
// Change this to your Cloudflare Worker URL when deploying
const API_BASE = window.location.hostname === 'localhost' ? 'http://localhost:8787' : 'https://fekoyaha.ajcoolx619.workers.dev';

function getApiUrl(path) {
    return `${API_BASE}${path}`;
}

function getWsUrl(path) {
    const protocol = API_BASE.startsWith('https') ? 'wss:' : 'ws:';
    const host = API_BASE.replace(/^https?:\/\//, '');
    return `${protocol}//${host}${path}`;
}

// Navigation handling
function navigate() {
    const params = new URLSearchParams(window.location.search);
    const keyword = params.get('room');

    if (keyword) {
        showRoom(keyword);
    } else {
        showHome();
    }
}

function showHome() {
    homePage.style.display = 'flex';
    roomPage.style.display = 'none';
    keywordInput.focus();
}

function showRoom(keyword) {
    homePage.style.display = 'none';
    roomPage.style.display = 'flex';
    document.getElementById('roomKeywordDisplay').textContent = keyword;
    window.ROOM_KEYWORD = keyword;
    if (window.initRoom) window.initRoom();
}

// Keyword validation
const KEYWORD_REGEX = /^[a-z0-9][a-z0-9-]*[a-z0-9]$|^[a-z0-9]$/;

function validateKeyword(keyword) {
    return keyword.length >= 1 && keyword.length <= 32 && KEYWORD_REGEX.test(keyword);
}

// Auto-lowercase input
keywordInput.addEventListener('input', (e) => {
    const value = e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '');
    e.target.value = value;
});

// Handle form submission
roomForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const keyword = keywordInput.value.trim().toLowerCase();

    if (!keyword) {
        keywordInput.focus();
        return;
    }

    if (!validateKeyword(keyword)) {
        alert('Invalid keyword. Use lowercase letters, numbers, and hyphens (2-32 characters).');
        return;
    }

    // Update URL and navigate
    const newUrl = new URL(window.location.href);
    newUrl.searchParams.set('room', keyword);
    window.history.pushState({}, '', newUrl);
    navigate();
});

// Back to home
document.getElementById('backToHome').addEventListener('click', (e) => {
    e.preventDefault();
    const newUrl = new URL(window.location.href);
    newUrl.searchParams.delete('room');
    window.history.pushState({}, '', newUrl);
    navigate();
});

// Initial navigation
window.addEventListener('popstate', navigate);
navigate();

// Focus input on load
if (homePage.style.display !== 'none') {
    keywordInput.focus();
}

// Export config for room.js
window.FEKO_CONFIG = {
    getApiUrl,
    getWsUrl
};
