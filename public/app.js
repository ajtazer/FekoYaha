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

// Export config for room.js immediately
window.FEKO_CONFIG = {
    getApiUrl,
    getWsUrl
};

// Navigation handling
function navigate() {
    const path = window.location.pathname;
    const segments = path.split('/').filter(Boolean);

    let keyword = null;

    // Check if we are on GitHub Pages (ajtazer.github.io)
    if (window.location.hostname.includes('github.io')) {
        if (segments.length >= 2) {
            keyword = segments[1];
        }
    } else {
        if (segments.length >= 1) {
            keyword = segments[0];
        }
    }

    if (keyword && validateKeyword(keyword)) {
        showRoom(keyword);
    } else {
        showHome();
    }
}

function showHome() {
    if (homePage) {
        document.body.style.overflow = '';
        homePage.style.display = 'flex';
        if (roomPage) roomPage.style.display = 'none';
        if (keywordInput) keywordInput.focus();
    }
}

function showRoom(keyword) {
    if (roomPage) {
        document.body.style.overflow = 'hidden';
        if (homePage) homePage.style.display = 'none';
        roomPage.style.display = 'flex';
        const display = document.getElementById('roomKeywordDisplay');
        if (display) display.textContent = keyword;
        window.ROOM_KEYWORD = keyword;

        const startInit = () => {
            if (typeof window.initRoom === 'function') {
                window.initRoom();
            } else {
                // Retry until room.js is loaded
                setTimeout(startInit, 200);
            }
        };
        startInit();
    }
}

const KEYWORD_REGEX = /^[a-z0-9]{1,32}$/;

function validateKeyword(keyword) {
    return keyword.length >= 1 && keyword.length <= 32 && KEYWORD_REGEX.test(keyword);
}

if (keywordInput) {
    keywordInput.addEventListener('input', (e) => {
        const value = e.target.value.toLowerCase().replace(/[^a-z0-9]/g, '');
        e.target.value = value;
    });
}

if (roomForm) {
    roomForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const keyword = keywordInput.value.trim().toLowerCase();

        if (!keyword || !validateKeyword(keyword)) {
            alert('Invalid keyword. Use 1-32 lowercase letters and numbers only.');
            return;
        }

        let baseUrl = window.location.origin;
        if (window.location.hostname.includes('github.io')) {
            baseUrl += '/FekoYaha';
        }

        window.history.pushState({}, '', `${baseUrl}/${keyword}`);
        navigate();
    });
}

const backToHome = document.getElementById('backToHome');
if (backToHome) {
    backToHome.addEventListener('click', (e) => {
        e.preventDefault();
        let baseUrl = window.location.origin;
        if (window.location.hostname.includes('github.io')) {
            baseUrl += '/FekoYaha';
        }
        window.history.pushState({}, '', baseUrl + '/');
        navigate();
    });
}

window.addEventListener('popstate', navigate);
navigate();

if (homePage && homePage.style.display !== 'none') {
    if (keywordInput) keywordInput.focus();
}
