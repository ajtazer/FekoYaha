import type { Env } from './types';
import { Room } from './room';

// Export the Room Durable Object
export { Room };

// Keyword validation: lowercase, alphanumeric + hyphen, max 32 chars
const KEYWORD_REGEX = /^[a-z0-9][a-z0-9-]{0,30}[a-z0-9]$|^[a-z0-9]$/;

function validateKeyword(keyword: string): boolean {
  return KEYWORD_REGEX.test(keyword) && keyword.length <= 32;
}

// Generate HTML for homepage
function getHomepageHTML(): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>FekoYaha - Share Anything, Anywhere</title>
  <meta name="description" content="Simple, persistent, no-login sharing rooms. Paste text or images and access from any device.">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="/styles.css">
</head>
<body class="homepage">
  <div class="hero">
    <div class="hero-content">
      <div class="logo">
        <span class="logo-icon">📡</span>
        <h1>FekoYaha</h1>
      </div>
      <p class="tagline">Share anything. Access anywhere. No signup needed.</p>
      
      <form class="room-form" id="roomForm">
        <div class="input-wrapper">
          <input 
            type="text" 
            id="keywordInput" 
            placeholder="Enter a keyword to create or join a room" 
            autocomplete="off"
            spellcheck="false"
            maxlength="32"
          >
          <button type="submit" id="enterBtn">
            <span>Enter</span>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M5 12h14M12 5l7 7-7 7"/>
            </svg>
          </button>
        </div>
        <p class="hint">Use lowercase letters, numbers, and hyphens (e.g., my-notes, work2025)</p>
      </form>
      
      <div class="features">
        <div class="feature">
          <span class="feature-icon">💬</span>
          <span>Real-time chat</span>
        </div>
        <div class="feature">
          <span class="feature-icon">🖼️</span>
          <span>Paste images</span>
        </div>
        <div class="feature">
          <span class="feature-icon">💾</span>
          <span>Persistent storage</span>
        </div>
        <div class="feature">
          <span class="feature-icon">📱</span>
          <span>Cross-device</span>
        </div>
      </div>
    </div>
  </div>
  
  <div id="galaxyContainer" class="galaxy-container"></div>
  
  <script type="importmap">
  {
    "imports": {
      "ogl": "https://cdn.jsdelivr.net/npm/ogl@1.0.8/+esm"
    }
  }
  </script>
  <script type="module" src="/galaxy.js"></script>
  
  <script src="/app.js"></script>
</body>
</html>`;
}

// Generate HTML for room page
function getRoomHTML(keyword: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${keyword} - FekoYaha</title>
  <meta name="description" content="FekoYaha room: ${keyword}">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="/styles.css">
</head>
<body class="room-page">
  <div class="room-container">
    <!-- Top Bar -->
    <header class="room-header">
      <div class="room-info">
        <a href="/" class="back-btn" title="Back to home">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M19 12H5M12 19l-7-7 7-7"/>
          </svg>
        </a>
        <div class="room-title">
          <span class="room-icon">📡</span>
          <h1 id="roomKeyword">${keyword}</h1>
        </div>
      </div>
      <div class="room-actions">
        <button class="action-btn" id="copyLinkBtn" title="Copy room link">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
            <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/>
          </svg>
          <span>Copy Link</span>
        </button>
        <div class="users-count" id="usersCount">
          <span class="users-dot"></span>
          <span id="userCountNum">0</span> online
        </div>
      </div>
    </header>

    <!-- Room Status Modal -->
    <div class="modal-overlay" id="roomStatusModal">
      <div class="modal">
        <div class="modal-icon" id="modalIcon">🔍</div>
        <h2 id="modalTitle">Checking room...</h2>
        <p id="modalMessage">Please wait while we check if this room exists.</p>
        <div class="modal-actions" id="modalActions" style="display: none;">
          <button class="btn btn-primary" id="modalPrimaryBtn">Create Room</button>
        </div>
      </div>
    </div>

    <!-- Nickname Modal -->
    <div class="modal-overlay" id="nicknameModal" style="display: none;">
      <div class="modal">
        <div class="modal-icon">👤</div>
        <h2>Choose a Nickname</h2>
        <p>This will be shown with your messages.</p>
        <form id="nicknameForm">
          <input 
            type="text" 
            id="nicknameInput" 
            placeholder="Enter your nickname" 
            maxlength="20"
            autocomplete="off"
          >
          <button type="submit" class="btn btn-primary">Join Room</button>
        </form>
      </div>
    </div>

    <!-- Messages Area -->
    <main class="messages-area" id="messagesArea">
      <div class="messages-list" id="messagesList">
        <!-- Messages will be inserted here -->
      </div>
      <button class="new-messages-btn" id="newMessagesBtn" style="display: none;">
        ↓ New messages
      </button>
    </main>

    <!-- Composer -->
    <footer class="composer" id="composer" style="display: none;">
      <div class="composer-inner">
        <div class="user-badge" id="userBadge">
          <span class="user-color" id="userColor"></span>
          <span class="user-nickname" id="userNickname">You</span>
        </div>
        <form class="message-form" id="messageForm">
          <div class="input-area">
            <textarea 
              id="messageInput" 
              placeholder="Type a message or paste an image..."
              rows="1"
            ></textarea>
            <button type="submit" class="send-btn" id="sendBtn" disabled>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"/>
              </svg>
            </button>
          </div>
          <div class="upload-preview" id="uploadPreview" style="display: none;">
            <img id="previewImage" src="" alt="Preview">
            <button type="button" class="remove-preview" id="removePreview">×</button>
          </div>
        </form>
      </div>
    </footer>
  </div>

  <!-- Image Lightbox -->
  <div class="lightbox" id="lightbox" style="display: none;">
    <button class="lightbox-close" id="lightboxClose">×</button>
    <img id="lightboxImage" src="" alt="Enlarged image">
  </div>

  <script>
    window.ROOM_KEYWORD = "${keyword}";
  </script>
  <script src="/room.js"></script>
</body>
</html>`;
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;

    // Log all requests
    console.log(`[Worker] ${request.method} ${path}`);

    // CORS headers for API requests
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    };

    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    // Serve static files
    if (path === '/styles.css') {
      return new Response(getStylesCSS(), {
        headers: { 'Content-Type': 'text/css' },
      });
    }

    if (path === '/app.js') {
      return new Response(getAppJS(), {
        headers: { 'Content-Type': 'application/javascript' },
      });
    }

    if (path === '/room.js') {
      return new Response(getRoomJS(), {
        headers: { 'Content-Type': 'application/javascript' },
      });
    }

    if (path === '/galaxy.js') {
      return new Response(getGalaxyJS(), {
        headers: { 'Content-Type': 'application/javascript' },
      });
    }

    // Serve uploaded files from R2
    if (path.startsWith('/files/')) {
      const key = path.slice(7);
      const object = await env.BUCKET.get(key);

      if (!object) {
        return new Response('File not found', { status: 404 });
      }

      const headers = new Headers();
      object.writeHttpMetadata(headers);
      headers.set('Cache-Control', 'public, max-age=31536000');

      return new Response(object.body, { headers });
    }

    // API routes
    if (path.startsWith('/api/room/')) {
      const parts = path.split('/');
      const keyword = parts[3];

      if (!keyword || !validateKeyword(keyword)) {
        return new Response(JSON.stringify({ error: 'Invalid room keyword' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        });
      }

      const roomId = env.ROOMS.idFromName(keyword);
      const room = env.ROOMS.get(roomId);

      // Room info
      if (parts[4] === 'info' && request.method === 'GET') {
        const response = await room.fetch(new Request('http://room/info'));
        const data = await response.json();
        return new Response(JSON.stringify(data), {
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        });
      }

      // Create room
      if (parts[4] === 'create' && request.method === 'POST') {
        const response = await room.fetch(new Request('http://room/create', {
          method: 'POST',
          body: JSON.stringify({ keyword }),
          headers: { 'Content-Type': 'application/json' },
        }));
        const data = await response.json();
        return new Response(JSON.stringify(data), {
          status: response.status,
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        });
      }

      // WebSocket connection
      if (parts[4] === 'ws') {
        if (request.headers.get('Upgrade') !== 'websocket') {
          return new Response('Expected WebSocket', { status: 426 });
        }

        const wsUrl = new URL('http://room/ws');
        wsUrl.search = url.search;

        return room.fetch(new Request(wsUrl.toString(), {
          headers: request.headers,
        }));
      }

      // Upload request - generate signed URL for R2
      if (parts[4] === 'upload' && request.method === 'POST') {
        const body = await request.json() as { filename: string; contentType: string; size: number };

        // Validate file
        const maxSize = 20 * 1024 * 1024; // 20MB
        if (body.size > maxSize) {
          return new Response(JSON.stringify({ error: 'File too large (max 20MB)' }), {
            status: 400,
            headers: { 'Content-Type': 'application/json', ...corsHeaders },
          });
        }

        const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
        if (!allowedTypes.includes(body.contentType)) {
          return new Response(JSON.stringify({ error: 'Invalid file type' }), {
            status: 400,
            headers: { 'Content-Type': 'application/json', ...corsHeaders },
          });
        }

        // Generate unique key
        const ext = body.filename.split('.').pop() || 'bin';
        const key = `${keyword}/${Date.now()}-${crypto.randomUUID()}.${ext}`;

        // For direct upload, we'll use a simple approach - client uploads via POST
        // Return the key and file URL
        const fileUrl = `/files/${key}`;

        return new Response(JSON.stringify({
          key,
          fileUrl,
          uploadUrl: `/api/room/${keyword}/upload-file`,
        }), {
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        });
      }

      // Direct file upload to R2
      if (parts[4] === 'upload-file' && request.method === 'POST') {
        const formData = await request.formData();
        const fileEntry = formData.get('file');
        const keyEntry = formData.get('key');

        if (!fileEntry || typeof fileEntry === 'string' || !keyEntry || typeof keyEntry !== 'string') {
          return new Response(JSON.stringify({ error: 'Missing file or key' }), {
            status: 400,
            headers: { 'Content-Type': 'application/json', ...corsHeaders },
          });
        }

        const file = fileEntry as File;
        const key = keyEntry;

        await env.BUCKET.put(key, file.stream(), {
          httpMetadata: {
            contentType: file.type,
          },
        });

        return new Response(JSON.stringify({ success: true, fileUrl: `/files/${key}` }), {
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        });
      }
    }

    // Homepage
    if (path === '/' || path === '') {
      return new Response(getHomepageHTML(), {
        headers: { 'Content-Type': 'text/html' },
      });
    }

    // Room page - any other path is treated as a room keyword
    const keyword = path.slice(1).toLowerCase();
    if (validateKeyword(keyword)) {
      return new Response(getRoomHTML(keyword), {
        headers: { 'Content-Type': 'text/html' },
      });
    }

    return new Response('Not Found', { status: 404 });
  },
};

// CSS Styles
function getStylesCSS(): string {
  return `/* FekoYaha - Modern Dark Theme */

:root {
  --bg-primary: #000000;
  --bg-secondary: #0a0a0a;
  --bg-tertiary: #111111;
  --bg-glass: rgba(0, 0, 0, 0.85);
  --bg-glass-light: rgba(20, 20, 20, 0.7);
  
  --text-primary: #ffffff;
  --text-secondary: #a0e0e0;
  --text-muted: #508080;
  
  --accent-primary: #00d4d4;
  --accent-secondary: #00ffff;
  --accent-glow: rgba(0, 212, 212, 0.4);
  
  --success: #10b981;
  --warning: #f59e0b;
  --error: #ef4444;
  
  --border-color: rgba(0, 212, 212, 0.15);
  --border-hover: rgba(0, 255, 255, 0.25);
  
  --radius-sm: 8px;
  --radius-md: 12px;
  --radius-lg: 16px;
  --radius-xl: 24px;
  
  --shadow-sm: 0 2px 8px rgba(0, 0, 0, 0.5);
  --shadow-md: 0 4px 16px rgba(0, 0, 0, 0.6);
  --shadow-lg: 0 8px 32px rgba(0, 0, 0, 0.7);
  --shadow-glow: 0 0 40px var(--accent-glow);
  
  --font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}

* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

html, body {
  height: 100%;
  font-family: var(--font-family);
  background: var(--bg-primary);
  color: var(--text-primary);
  line-height: 1.5;
  -webkit-font-smoothing: antialiased;
}

/* ===== HOMEPAGE ===== */
.homepage {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  overflow: hidden;
}

.hero {
  position: relative;
  z-index: 10;
  padding: 2rem;
  width: 100%;
  max-width: 600px;
}

.hero-content {
  background: var(--bg-glass);
  backdrop-filter: blur(20px);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-xl);
  padding: 3rem;
  text-align: center;
  box-shadow: var(--shadow-lg);
}

.logo {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.75rem;
  margin-bottom: 0.75rem;
}

.logo-icon {
  font-size: 2.5rem;
  animation: pulse 2s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.1); }
}

.logo h1 {
  font-size: 2.5rem;
  font-weight: 700;
  background: linear-gradient(135deg, var(--accent-primary), var(--accent-secondary));
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.tagline {
  color: var(--text-secondary);
  font-size: 1.1rem;
  margin-bottom: 2.5rem;
}

.room-form {
  margin-bottom: 2.5rem;
}

.input-wrapper {
  display: flex;
  gap: 0.75rem;
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-lg);
  padding: 0.5rem;
  transition: all 0.3s ease;
}

.input-wrapper:focus-within {
  border-color: var(--accent-primary);
  box-shadow: var(--shadow-glow);
}

.input-wrapper input {
  flex: 1;
  background: transparent;
  border: none;
  outline: none;
  color: var(--text-primary);
  font-size: 1rem;
  padding: 0.75rem 1rem;
  font-family: inherit;
}

.input-wrapper input::placeholder {
  color: var(--text-muted);
}

.input-wrapper button {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  background: linear-gradient(135deg, var(--accent-primary), var(--accent-secondary));
  color: white;
  border: none;
  border-radius: var(--radius-md);
  padding: 0.75rem 1.5rem;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  font-family: inherit;
}

.input-wrapper button:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-glow);
}

.input-wrapper button:active {
  transform: translateY(0);
}

.hint {
  color: var(--text-muted);
  font-size: 0.85rem;
  margin-top: 1rem;
}

.features {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 1rem;
}

.feature {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1rem;
  background: var(--bg-tertiary);
  border-radius: var(--radius-md);
  font-size: 0.9rem;
  color: var(--text-secondary);
  transition: all 0.3s ease;
}

.feature:hover {
  background: var(--bg-glass-light);
  color: var(--text-primary);
  transform: translateY(-2px);
}

.feature-icon {
  font-size: 1.25rem;
}

/* Galaxy Background */
.galaxy-container {
  position: fixed;
  inset: 0;
  width: 100%;
  height: 100%;
  z-index: 0;
}

.galaxy-container canvas {
  width: 100% !important;
  height: 100% !important;
}

/* ===== ROOM PAGE ===== */
.room-page {
  height: 100vh;
  display: flex;
  flex-direction: column;
}

.room-container {
  flex: 1;
  display: flex;
  flex-direction: column;
  max-width: 900px;
  width: 100%;
  margin: 0 auto;
  position: relative;
}

/* Room Header */
.room-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1rem 1.5rem;
  background: var(--bg-glass);
  backdrop-filter: blur(20px);
  border-bottom: 1px solid var(--border-color);
  position: sticky;
  top: 0;
  z-index: 100;
}

.room-info {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.back-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  background: var(--bg-tertiary);
  border-radius: var(--radius-sm);
  color: var(--text-secondary);
  text-decoration: none;
  transition: all 0.2s ease;
}

.back-btn:hover {
  background: var(--bg-glass-light);
  color: var(--text-primary);
}

.room-title {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.room-icon {
  font-size: 1.25rem;
}

.room-title h1 {
  font-size: 1.25rem;
  font-weight: 600;
}

.room-actions {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.action-btn {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  background: var(--bg-tertiary);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-sm);
  color: var(--text-secondary);
  font-size: 0.875rem;
  cursor: pointer;
  transition: all 0.2s ease;
  font-family: inherit;
}

.action-btn:hover {
  background: var(--bg-glass-light);
  border-color: var(--border-hover);
  color: var(--text-primary);
}

.users-count {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  background: var(--bg-tertiary);
  border-radius: var(--radius-sm);
  font-size: 0.875rem;
  color: var(--text-secondary);
}

.users-dot {
  width: 8px;
  height: 8px;
  background: var(--success);
  border-radius: 50%;
  animation: blink 2s ease-in-out infinite;
}

@keyframes blink {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

/* Modals */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.8);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 200;
  padding: 1rem;
}

.modal {
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-xl);
  padding: 2.5rem;
  max-width: 400px;
  width: 100%;
  text-align: center;
  animation: modalIn 0.3s ease;
}

@keyframes modalIn {
  from {
    opacity: 0;
    transform: scale(0.95) translateY(10px);
  }
  to {
    opacity: 1;
    transform: scale(1) translateY(0);
  }
}

.modal-icon {
  font-size: 3rem;
  margin-bottom: 1rem;
}

.modal h2 {
  font-size: 1.5rem;
  margin-bottom: 0.5rem;
}

.modal p {
  color: var(--text-secondary);
  margin-bottom: 1.5rem;
}

.modal-actions {
  display: flex;
  gap: 1rem;
  justify-content: center;
}

.modal input {
  width: 100%;
  background: var(--bg-tertiary);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  padding: 0.875rem 1rem;
  color: var(--text-primary);
  font-size: 1rem;
  margin-bottom: 1rem;
  outline: none;
  font-family: inherit;
  transition: all 0.2s ease;
}

.modal input:focus {
  border-color: var(--accent-primary);
  box-shadow: 0 0 0 3px var(--accent-glow);
}

.btn {
  padding: 0.875rem 2rem;
  border-radius: var(--radius-md);
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  border: none;
  font-family: inherit;
}

.btn-primary {
  background: linear-gradient(135deg, var(--accent-primary), var(--accent-secondary));
  color: white;
}

.btn-primary:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-glow);
}

/* Messages Area */
.messages-area {
  flex: 1;
  overflow-y: auto;
  padding: 1rem 1.5rem;
  display: flex;
  flex-direction: column;
  position: relative;
}

.messages-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.message {
  display: flex;
  gap: 0.75rem;
  padding: 0.75rem 1rem;
  border-radius: var(--radius-md);
  animation: messageIn 0.3s ease;
}

@keyframes messageIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.message:hover {
  background: var(--bg-tertiary);
}

.message-avatar {
  width: 36px;
  height: 36px;
  border-radius: var(--radius-sm);
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  font-size: 0.875rem;
  flex-shrink: 0;
}

.message-content {
  flex: 1;
  min-width: 0;
}

.message-header {
  display: flex;
  align-items: baseline;
  gap: 0.5rem;
  margin-bottom: 0.25rem;
}

.message-sender {
  font-weight: 600;
  font-size: 0.9rem;
}

.message-time {
  font-size: 0.75rem;
  color: var(--text-muted);
}

.message-text {
  color: var(--text-secondary);
  word-wrap: break-word;
  white-space: pre-wrap;
}

.message-image {
  max-width: 300px;
  max-height: 300px;
  border-radius: var(--radius-md);
  margin-top: 0.5rem;
  cursor: pointer;
  transition: transform 0.2s ease;
}

.message-image:hover {
  transform: scale(1.02);
}

.message.system {
  justify-content: center;
  padding: 0.5rem;
}

.message.system .message-text {
  font-size: 0.85rem;
  color: var(--text-muted);
  font-style: italic;
}

.new-messages-btn {
  position: sticky;
  bottom: 1rem;
  align-self: center;
  padding: 0.5rem 1rem;
  background: var(--accent-primary);
  color: white;
  border: none;
  border-radius: var(--radius-lg);
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  box-shadow: var(--shadow-md);
  animation: bounce 1s ease infinite;
  font-family: inherit;
}

@keyframes bounce {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-5px); }
}

/* Composer */
.composer {
  padding: 1rem 1.5rem;
  background: var(--bg-glass);
  backdrop-filter: blur(20px);
  border-top: 1px solid var(--border-color);
}

.composer-inner {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.user-badge {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.85rem;
}

.user-color {
  width: 12px;
  height: 12px;
  border-radius: 4px;
}

.user-nickname {
  font-weight: 500;
  color: var(--text-secondary);
}

.message-form {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.input-area {
  display: flex;
  gap: 0.75rem;
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-lg);
  padding: 0.5rem;
  transition: all 0.2s ease;
}

.input-area:focus-within {
  border-color: var(--accent-primary);
}

.input-area textarea {
  flex: 1;
  background: transparent;
  border: none;
  outline: none;
  color: var(--text-primary);
  font-size: 1rem;
  padding: 0.75rem;
  resize: none;
  max-height: 150px;
  font-family: inherit;
}

.input-area textarea::placeholder {
  color: var(--text-muted);
}

.send-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  background: var(--accent-primary);
  border: none;
  border-radius: var(--radius-md);
  color: white;
  cursor: pointer;
  transition: all 0.2s ease;
  flex-shrink: 0;
}

.send-btn:hover:not(:disabled) {
  background: var(--accent-secondary);
  transform: scale(1.05);
}

.send-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.upload-preview {
  position: relative;
  display: inline-block;
}

.upload-preview img {
  max-width: 200px;
  max-height: 150px;
  border-radius: var(--radius-md);
  border: 1px solid var(--border-color);
}

.remove-preview {
  position: absolute;
  top: -8px;
  right: -8px;
  width: 24px;
  height: 24px;
  background: var(--error);
  color: white;
  border: none;
  border-radius: 50%;
  font-size: 1rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* Lightbox */
.lightbox {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.95);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 300;
  padding: 2rem;
}

.lightbox img {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
  border-radius: var(--radius-md);
}

.lightbox-close {
  position: absolute;
  top: 1.5rem;
  right: 1.5rem;
  width: 44px;
  height: 44px;
  background: var(--bg-tertiary);
  border: 1px solid var(--border-color);
  border-radius: 50%;
  color: var(--text-primary);
  font-size: 1.5rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
}

.lightbox-close:hover {
  background: var(--bg-glass-light);
}

/* Scrollbar */
::-webkit-scrollbar {
  width: 8px;
}

::-webkit-scrollbar-track {
  background: var(--bg-secondary);
}

::-webkit-scrollbar-thumb {
  background: var(--bg-tertiary);
  border-radius: 4px;
}

::-webkit-scrollbar-thumb:hover {
  background: var(--text-muted);
}

/* Mobile Responsive */
@media (max-width: 640px) {
  .hero-content {
    padding: 2rem 1.5rem;
  }
  
  .logo h1 {
    font-size: 2rem;
  }
  
  .features {
    grid-template-columns: 1fr;
  }
  
  .room-header {
    flex-wrap: wrap;
    gap: 0.75rem;
  }
  
  .room-actions {
    width: 100%;
    justify-content: space-between;
  }
  
  .action-btn span {
    display: none;
  }
  
  .message-image {
    max-width: 100%;
  }
}
`;
}

// Homepage JavaScript
function getAppJS(): string {
  return `// Homepage JavaScript
const form = document.getElementById('roomForm');
const input = document.getElementById('keywordInput');

// Keyword validation regex
const KEYWORD_REGEX = /^[a-z0-9][a-z0-9-]*[a-z0-9]$|^[a-z0-9]$/;

function validateKeyword(keyword) {
  return keyword.length >= 1 && 
         keyword.length <= 32 && 
         KEYWORD_REGEX.test(keyword);
}

// Auto-lowercase input
input.addEventListener('input', (e) => {
  const value = e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '');
  e.target.value = value;
});

// Handle form submission
form.addEventListener('submit', (e) => {
  e.preventDefault();
  
  const keyword = input.value.trim().toLowerCase();
  
  if (!keyword) {
    input.focus();
    return;
  }
  
  if (!validateKeyword(keyword)) {
    alert('Invalid keyword. Use lowercase letters, numbers, and hyphens (2-32 characters).');
    return;
  }
  
  // Navigate to room
  window.location.href = '/' + keyword;
});

// Focus input on load
input.focus();

// Easter egg: typing "help" shows features
input.addEventListener('keyup', (e) => {
  if (input.value === 'help') {
    input.value = '';
    alert('🚀 FekoYaha Features:\\n\\n• Create rooms with simple keywords\\n• Real-time messaging\\n• Paste images directly\\n• No signup required\\n• Works on any device');
  }
});
`;
}

// Room JavaScript
function getRoomJS(): string {
  return `// Room JavaScript
const keyword = window.ROOM_KEYWORD;

// DOM Elements
const roomStatusModal = document.getElementById('roomStatusModal');
const modalIcon = document.getElementById('modalIcon');
const modalTitle = document.getElementById('modalTitle');
const modalMessage = document.getElementById('modalMessage');
const modalActions = document.getElementById('modalActions');
const modalPrimaryBtn = document.getElementById('modalPrimaryBtn');

const nicknameModal = document.getElementById('nicknameModal');
const nicknameForm = document.getElementById('nicknameForm');
const nicknameInput = document.getElementById('nicknameInput');

const messagesArea = document.getElementById('messagesArea');
const messagesList = document.getElementById('messagesList');
const newMessagesBtn = document.getElementById('newMessagesBtn');

const composer = document.getElementById('composer');
const messageForm = document.getElementById('messageForm');
const messageInput = document.getElementById('messageInput');
const sendBtn = document.getElementById('sendBtn');
const uploadPreview = document.getElementById('uploadPreview');
const previewImage = document.getElementById('previewImage');
const removePreview = document.getElementById('removePreview');

const userBadge = document.getElementById('userBadge');
const userColor = document.getElementById('userColor');
const userNickname = document.getElementById('userNickname');
const userCountNum = document.getElementById('userCountNum');

const copyLinkBtn = document.getElementById('copyLinkBtn');
const lightbox = document.getElementById('lightbox');
const lightboxImage = document.getElementById('lightboxImage');
const lightboxClose = document.getElementById('lightboxClose');

// State
let ws = null;
let reconnectAttempts = 0;
let pendingImage = null;
let isScrolledUp = false;
let nickname = localStorage.getItem('fekoyaha_nickname') || '';
let color = localStorage.getItem('fekoyaha_color') || '';

// Color palette
const COLORS = [
  '#E91E63', '#9C27B0', '#673AB7', '#3F51B5',
  '#2196F3', '#00BCD4', '#009688', '#4CAF50',
  '#FF9800', '#FF5722', '#795548', '#607D8B',
];

function getRandomColor() {
  return COLORS[Math.floor(Math.random() * COLORS.length)];
}

// Initialize
async function init() {
  try {
    // Check if room exists
    const response = await fetch('/api/room/' + keyword + '/info');
    const data = await response.json();
    
    if (data.exists) {
      showJoinPrompt();
    } else {
      showCreatePrompt();
    }
  } catch (error) {
    showError('Failed to check room status');
  }
}

function showCreatePrompt() {
  modalIcon.textContent = '✨';
  modalTitle.textContent = 'Create Room';
  modalMessage.textContent = 'This room does not exist yet. Would you like to create it?';
  modalActions.style.display = 'flex';
  modalPrimaryBtn.textContent = 'Create Room';
  modalPrimaryBtn.onclick = createRoom;
}

function showJoinPrompt() {
  modalIcon.textContent = '👋';
  modalTitle.textContent = 'Join Room';
  modalMessage.textContent = 'This room exists. Click below to join.';
  modalActions.style.display = 'flex';
  modalPrimaryBtn.textContent = 'Join Room';
  modalPrimaryBtn.onclick = promptNickname;
}

function showError(message) {
  modalIcon.textContent = '❌';
  modalTitle.textContent = 'Error';
  modalMessage.textContent = message;
  modalActions.style.display = 'flex';
  modalPrimaryBtn.textContent = 'Go Home';
  modalPrimaryBtn.onclick = () => window.location.href = '/';
}

async function createRoom() {
  modalIcon.textContent = '⏳';
  modalTitle.textContent = 'Creating...';
  modalMessage.textContent = 'Setting up your room...';
  modalActions.style.display = 'none';
  
  try {
    const response = await fetch('/api/room/' + keyword + '/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });
    
    if (response.ok) {
      promptNickname();
    } else {
      const data = await response.json();
      showError(data.error || 'Failed to create room');
    }
  } catch (error) {
    showError('Failed to create room');
  }
}

function promptNickname() {
  roomStatusModal.style.display = 'none';
  
  // Check if we already have a nickname
  if (nickname) {
    if (!color) {
      color = getRandomColor();
      localStorage.setItem('fekoyaha_color', color);
    }
    connectWebSocket();
    return;
  }
  
  nicknameModal.style.display = 'flex';
  nicknameInput.focus();
}

nicknameForm.addEventListener('submit', (e) => {
  e.preventDefault();
  
  const value = nicknameInput.value.trim();
  if (!value) {
    nicknameInput.focus();
    return;
  }
  
  nickname = value.slice(0, 20);
  color = getRandomColor();
  
  localStorage.setItem('fekoyaha_nickname', nickname);
  localStorage.setItem('fekoyaha_color', color);
  
  nicknameModal.style.display = 'none';
  connectWebSocket();
});

function connectWebSocket() {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const wsUrl = protocol + '//' + window.location.host + '/api/room/' + keyword + '/ws?nickname=' + encodeURIComponent(nickname) + '&color=' + encodeURIComponent(color);
  
  ws = new WebSocket(wsUrl);
  
  ws.onopen = () => {
    console.log('Connected to room');
    reconnectAttempts = 0;
    showComposer();
  };
  
  ws.onmessage = (event) => {
    const data = JSON.parse(event.data);
    handleMessage(data);
  };
  
  ws.onclose = () => {
    console.log('Disconnected');
    if (reconnectAttempts < 5) {
      reconnectAttempts++;
      setTimeout(connectWebSocket, 1000 * reconnectAttempts);
    }
  };
  
  ws.onerror = (error) => {
    console.error('WebSocket error:', error);
  };
}

function showComposer() {
  composer.style.display = 'block';
  userNickname.textContent = nickname;
  userColor.style.background = color;
  messageInput.focus();
}

function handleMessage(data) {
  switch (data.type) {
    case 'history':
      renderHistory(data.payload.messages);
      break;
    case 'message':
      appendMessage(data.payload);
      break;
    case 'users':
      updateUsers(data.payload);
      break;
    case 'error':
      console.error('Server error:', data.payload.message);
      break;
  }
}

function renderHistory(messages) {
  messagesList.innerHTML = '';
  messages.forEach(msg => appendMessage(msg, false));
  scrollToBottom();
}

function appendMessage(msg, animate = true) {
  const div = document.createElement('div');
  div.className = 'message' + (msg.type === 'system' ? ' system' : '');
  if (!animate) div.style.animation = 'none';
  
  if (msg.type === 'system') {
    div.innerHTML = '<span class="message-text">' + escapeHtml(msg.content) + '</span>';
  } else {
    const initial = msg.sender.nickname.charAt(0).toUpperCase();
    const time = formatTime(msg.timestamp);
    
    let contentHtml = '<p class="message-text">' + escapeHtml(msg.content) + '</p>';
    
    if (msg.type === 'image' && msg.content.startsWith('/files/')) {
      contentHtml = '<img class="message-image" src="' + msg.content + '" alt="Shared image" onclick="openLightbox(this.src)">';
    }
    
    div.innerHTML = 
      '<div class="message-avatar" style="background: ' + msg.sender.color + '">' + initial + '</div>' +
      '<div class="message-content">' +
        '<div class="message-header">' +
          '<span class="message-sender" style="color: ' + msg.sender.color + '">' + escapeHtml(msg.sender.nickname) + '</span>' +
          '<span class="message-time">' + time + '</span>' +
        '</div>' +
        contentHtml +
      '</div>';
  }
  
  messagesList.appendChild(div);
  
  if (!isScrolledUp) {
    scrollToBottom();
  } else if (animate) {
    newMessagesBtn.style.display = 'block';
  }
}

function updateUsers(payload) {
  userCountNum.textContent = payload.count;
}

function formatTime(timestamp) {
  const date = new Date(timestamp);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function scrollToBottom() {
  messagesArea.scrollTop = messagesArea.scrollHeight;
}

// Scroll detection
messagesArea.addEventListener('scroll', () => {
  const threshold = 100;
  isScrolledUp = messagesArea.scrollHeight - messagesArea.scrollTop - messagesArea.clientHeight > threshold;
  if (!isScrolledUp) {
    newMessagesBtn.style.display = 'none';
  }
});

newMessagesBtn.addEventListener('click', () => {
  scrollToBottom();
  newMessagesBtn.style.display = 'none';
});

// Message sending
messageInput.addEventListener('input', () => {
  sendBtn.disabled = !messageInput.value.trim() && !pendingImage;
  
  // Auto-resize textarea
  messageInput.style.height = 'auto';
  messageInput.style.height = Math.min(messageInput.scrollHeight, 150) + 'px';
});

// Send on Enter key (Shift+Enter for newline)
messageInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    if (messageInput.value.trim() || pendingImage) {
      messageForm.dispatchEvent(new Event('submit', { cancelable: true }));
    }
  }
});

messageForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  
  if (pendingImage) {
    await sendImage();
    return;
  }
  
  const content = messageInput.value.trim();
  if (!content) return;
  
  sendMessage('text', content);
  messageInput.value = '';
  messageInput.style.height = 'auto';
  sendBtn.disabled = true;
});

function sendMessage(type, content) {
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({
      type: 'message',
      payload: { type, content }
    }));
  }
}

// Image handling
messageInput.addEventListener('paste', (e) => {
  const items = e.clipboardData?.items;
  if (!items) return;
  
  for (const item of items) {
    if (item.type.startsWith('image/')) {
      e.preventDefault();
      const file = item.getAsFile();
      if (file) handleImageFile(file);
      return;
    }
  }
});

// Drag and drop
messagesArea.addEventListener('dragover', (e) => {
  e.preventDefault();
  messagesArea.style.background = 'rgba(124, 58, 237, 0.1)';
});

messagesArea.addEventListener('dragleave', () => {
  messagesArea.style.background = '';
});

messagesArea.addEventListener('drop', (e) => {
  e.preventDefault();
  messagesArea.style.background = '';
  
  const file = e.dataTransfer?.files[0];
  if (file && file.type.startsWith('image/')) {
    handleImageFile(file);
  }
});

function handleImageFile(file) {
  if (file.size > 20 * 1024 * 1024) {
    alert('Image too large (max 20MB)');
    return;
  }
  
  pendingImage = file;
  
  const reader = new FileReader();
  reader.onload = (e) => {
    previewImage.src = e.target.result;
    uploadPreview.style.display = 'block';
    sendBtn.disabled = false;
  };
  reader.readAsDataURL(file);
}

removePreview.addEventListener('click', () => {
  pendingImage = null;
  uploadPreview.style.display = 'none';
  previewImage.src = '';
  sendBtn.disabled = !messageInput.value.trim();
});

async function sendImage() {
  if (!pendingImage) return;
  
  try {
    // Get upload URL
    const response = await fetch('/api/room/' + keyword + '/upload', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        filename: pendingImage.name,
        contentType: pendingImage.type,
        size: pendingImage.size,
      }),
    });
    
    if (!response.ok) {
      const data = await response.json();
      alert(data.error || 'Upload failed');
      return;
    }
    
    const { key, fileUrl } = await response.json();
    
    // Upload file
    const formData = new FormData();
    formData.append('file', pendingImage);
    formData.append('key', key);
    
    const uploadResponse = await fetch('/api/room/' + keyword + '/upload-file', {
      method: 'POST',
      body: formData,
    });
    
    if (uploadResponse.ok) {
      sendMessage('image', fileUrl);
      pendingImage = null;
      uploadPreview.style.display = 'none';
      previewImage.src = '';
      sendBtn.disabled = true;
    } else {
      alert('Upload failed');
    }
  } catch (error) {
    console.error('Upload error:', error);
    alert('Upload failed');
  }
}

// Copy link
copyLinkBtn.addEventListener('click', async () => {
  try {
    await navigator.clipboard.writeText(window.location.href);
    copyLinkBtn.querySelector('span').textContent = 'Copied!';
    setTimeout(() => {
      copyLinkBtn.querySelector('span').textContent = 'Copy Link';
    }, 2000);
  } catch (error) {
    // Fallback
    const input = document.createElement('input');
    input.value = window.location.href;
    document.body.appendChild(input);
    input.select();
    document.execCommand('copy');
    document.body.removeChild(input);
  }
});

// Lightbox
window.openLightbox = function(src) {
  lightboxImage.src = src;
  lightbox.style.display = 'flex';
};

lightboxClose.addEventListener('click', () => {
  lightbox.style.display = 'none';
});

lightbox.addEventListener('click', (e) => {
  if (e.target === lightbox) {
    lightbox.style.display = 'none';
  }
});

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && lightbox.style.display === 'flex') {
    lightbox.style.display = 'none';
  }
});

// Start
init();
`;
}

// Galaxy background animation using WebGL shaders (adapted from React Bits)
function getGalaxyJS(): string {
  return `import { Renderer, Program, Mesh, Color, Triangle } from 'ogl';

const vertexShader = \`
attribute vec2 uv;
attribute vec2 position;

varying vec2 vUv;

void main() {
  vUv = uv;
  gl_Position = vec4(position, 0, 1);
}
\`;

const fragmentShader = \`
precision highp float;

uniform float uTime;
uniform vec3 uResolution;
uniform vec2 uFocal;
uniform vec2 uRotation;
uniform float uStarSpeed;
uniform float uDensity;
uniform float uHueShift;
uniform float uSpeed;
uniform vec2 uMouse;
uniform float uGlowIntensity;
uniform float uSaturation;
uniform bool uMouseRepulsion;
uniform float uTwinkleIntensity;
uniform float uRotationSpeed;
uniform float uRepulsionStrength;
uniform float uMouseActiveFactor;
uniform float uAutoCenterRepulsion;
uniform bool uTransparent;

varying vec2 vUv;

#define NUM_LAYER 4.0
#define STAR_COLOR_CUTOFF 0.2
#define MAT45 mat2(0.7071, -0.7071, 0.7071, 0.7071)
#define PERIOD 3.0

float Hash21(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}

float tri(float x) {
  return abs(fract(x) * 2.0 - 1.0);
}

float tris(float x) {
  float t = fract(x);
  return 1.0 - smoothstep(0.0, 1.0, abs(2.0 * t - 1.0));
}

float trisn(float x) {
  float t = fract(x);
  return 2.0 * (1.0 - smoothstep(0.0, 1.0, abs(2.0 * t - 1.0))) - 1.0;
}

vec3 hsv2rgb(vec3 c) {
  vec4 K = vec4(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);
  vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
  return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
}

float Star(vec2 uv, float flare) {
  float d = length(uv);
  float m = (0.05 * uGlowIntensity) / d;
  float rays = smoothstep(0.0, 1.0, 1.0 - abs(uv.x * uv.y * 1000.0));
  m += rays * flare * uGlowIntensity;
  uv *= MAT45;
  rays = smoothstep(0.0, 1.0, 1.0 - abs(uv.x * uv.y * 1000.0));
  m += rays * 0.3 * flare * uGlowIntensity;
  m *= smoothstep(1.0, 0.2, d);
  return m;
}

vec3 StarLayer(vec2 uv) {
  vec3 col = vec3(0.0);

  vec2 gv = fract(uv) - 0.5;
  vec2 id = floor(uv);

  for (int y = -1; y <= 1; y++) {
    for (int x = -1; x <= 1; x++) {
      vec2 offset = vec2(float(x), float(y));
      vec2 si = id + vec2(float(x), float(y));
      float seed = Hash21(si);
      float size = fract(seed * 345.32);
      float glossLocal = tri(uStarSpeed / (PERIOD * seed + 1.0));
      float flareSize = smoothstep(0.9, 1.0, size) * glossLocal;

      float red = smoothstep(STAR_COLOR_CUTOFF, 1.0, Hash21(si + 1.0)) + STAR_COLOR_CUTOFF;
      float blu = smoothstep(STAR_COLOR_CUTOFF, 1.0, Hash21(si + 3.0)) + STAR_COLOR_CUTOFF;
      float grn = min(red, blu) * seed;
      vec3 base = vec3(red, grn, blu);

      float hue = atan(base.g - base.r, base.b - base.r) / (2.0 * 3.14159) + 0.5;
      hue = fract(hue + uHueShift / 360.0);
      float sat = length(base - vec3(dot(base, vec3(0.299, 0.587, 0.114)))) * uSaturation;
      float val = max(max(base.r, base.g), base.b);
      base = hsv2rgb(vec3(hue, sat, val));

      vec2 pad = vec2(tris(seed * 34.0 + uTime * uSpeed / 10.0), tris(seed * 38.0 + uTime * uSpeed / 30.0)) - 0.5;

      float star = Star(gv - offset - pad, flareSize);
      vec3 color = base;

      float twinkle = trisn(uTime * uSpeed + seed * 6.2831) * 0.5 + 1.0;
      twinkle = mix(1.0, twinkle, uTwinkleIntensity);
      star *= twinkle;

      col += star * size * color;
    }
  }

  return col;
}

void main() {
  vec2 focalPx = uFocal * uResolution.xy;
  vec2 uv = (vUv * uResolution.xy - focalPx) / uResolution.y;

  vec2 mouseNorm = uMouse - vec2(0.5);

  if (uAutoCenterRepulsion > 0.0) {
    vec2 centerUV = vec2(0.0, 0.0);
    float centerDist = length(uv - centerUV);
    vec2 repulsion = normalize(uv - centerUV) * (uAutoCenterRepulsion / (centerDist + 0.1));
    uv += repulsion * 0.05;
  } else if (uMouseRepulsion) {
    vec2 mousePosUV = (uMouse * uResolution.xy - focalPx) / uResolution.y;
    float mouseDist = length(uv - mousePosUV);
    vec2 repulsion = normalize(uv - mousePosUV) * (uRepulsionStrength / (mouseDist + 0.1));
    uv += repulsion * 0.05 * uMouseActiveFactor;
  } else {
    vec2 mouseOffset = mouseNorm * 0.1 * uMouseActiveFactor;
    uv += mouseOffset;
  }

  float autoRotAngle = uTime * uRotationSpeed;
  mat2 autoRot = mat2(cos(autoRotAngle), -sin(autoRotAngle), sin(autoRotAngle), cos(autoRotAngle));
  uv = autoRot * uv;

  uv = mat2(uRotation.x, -uRotation.y, uRotation.y, uRotation.x) * uv;

  vec3 col = vec3(0.0);

  for (float i = 0.0; i < 1.0; i += 1.0 / NUM_LAYER) {
    float depth = fract(i + uStarSpeed * uSpeed);
    float scale = mix(20.0 * uDensity, 0.5 * uDensity, depth);
    float fade = depth * smoothstep(1.0, 0.9, depth);
    col += StarLayer(uv * scale + i * 453.32) * fade;
  }

  if (uTransparent) {
    float alpha = length(col);
    alpha = smoothstep(0.0, 0.3, alpha);
    alpha = min(alpha, 1.0);
    gl_FragColor = vec4(col, alpha);
  } else {
    gl_FragColor = vec4(col, 1.0);
  }
}
\`;

// Configuration - cyan/teal theme matching FekoYaha
const config = {
  focal: [0.5, 0.5],
  rotation: [1.0, 0.0],
  starSpeed: 0.5,
  density: 1.5,
  hueShift: 175,  // Cyan-teal range (matches #00d4d4)
  speed: 0.8,
  glowIntensity: 0.6,
  saturation: 1.0,  // Full saturation for vibrant cyan
  mouseRepulsion: true,
  repulsionStrength: 2.5,
  twinkleIntensity: 0.5,
  rotationSpeed: 0.03,
  autoCenterRepulsion: 0,
  transparent: false
};

const ctn = document.getElementById('galaxyContainer');
const targetMousePos = { x: 0.5, y: 0.5 };
const smoothMousePos = { x: 0.5, y: 0.5 };
let targetMouseActive = 0.0;
let smoothMouseActive = 0.0;

const renderer = new Renderer({
  alpha: config.transparent,
  premultipliedAlpha: false
});
const gl = renderer.gl;

if (config.transparent) {
  gl.enable(gl.BLEND);
  gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
  gl.clearColor(0, 0, 0, 0);
} else {
  gl.clearColor(0, 0, 0, 1);
}

let program;

function resize() {
  renderer.setSize(ctn.offsetWidth, ctn.offsetHeight);
  if (program) {
    program.uniforms.uResolution.value = new Color(
      gl.canvas.width,
      gl.canvas.height,
      gl.canvas.width / gl.canvas.height
    );
  }
}
window.addEventListener('resize', resize);
resize();

const geometry = new Triangle(gl);
program = new Program(gl, {
  vertex: vertexShader,
  fragment: fragmentShader,
  uniforms: {
    uTime: { value: 0 },
    uResolution: {
      value: new Color(gl.canvas.width, gl.canvas.height, gl.canvas.width / gl.canvas.height)
    },
    uFocal: { value: new Float32Array(config.focal) },
    uRotation: { value: new Float32Array(config.rotation) },
    uStarSpeed: { value: config.starSpeed },
    uDensity: { value: config.density },
    uHueShift: { value: config.hueShift },
    uSpeed: { value: config.speed },
    uMouse: { value: new Float32Array([smoothMousePos.x, smoothMousePos.y]) },
    uGlowIntensity: { value: config.glowIntensity },
    uSaturation: { value: config.saturation },
    uMouseRepulsion: { value: config.mouseRepulsion },
    uTwinkleIntensity: { value: config.twinkleIntensity },
    uRotationSpeed: { value: config.rotationSpeed },
    uRepulsionStrength: { value: config.repulsionStrength },
    uMouseActiveFactor: { value: 0.0 },
    uAutoCenterRepulsion: { value: config.autoCenterRepulsion },
    uTransparent: { value: config.transparent }
  }
});

const mesh = new Mesh(gl, { geometry, program });

function update(t) {
  requestAnimationFrame(update);
  
  program.uniforms.uTime.value = t * 0.001;
  program.uniforms.uStarSpeed.value = (t * 0.001 * config.starSpeed) / 10.0;

  const lerpFactor = 0.05;
  smoothMousePos.x += (targetMousePos.x - smoothMousePos.x) * lerpFactor;
  smoothMousePos.y += (targetMousePos.y - smoothMousePos.y) * lerpFactor;
  smoothMouseActive += (targetMouseActive - smoothMouseActive) * lerpFactor;

  program.uniforms.uMouse.value[0] = smoothMousePos.x;
  program.uniforms.uMouse.value[1] = smoothMousePos.y;
  program.uniforms.uMouseActiveFactor.value = smoothMouseActive;

  renderer.render({ scene: mesh });
}

requestAnimationFrame(update);
ctn.appendChild(gl.canvas);

// Mouse interaction
ctn.addEventListener('mousemove', (e) => {
  const rect = ctn.getBoundingClientRect();
  const x = (e.clientX - rect.left) / rect.width;
  const y = 1.0 - (e.clientY - rect.top) / rect.height;
  targetMousePos.x = x;
  targetMousePos.y = y;
  targetMouseActive = 1.0;
});

ctn.addEventListener('mouseleave', () => {
  targetMouseActive = 0.0;
});

console.log('[Galaxy] WebGL background initialized with cyan theme');
`;
}
