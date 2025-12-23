# 📡 FekoYaha
> **Throw it here.** A free, instant, and secure chat & image sharing space.

FekoYaha is a modern, real-time communication platform built on the edge. No signups, no tracking, just instant sharing through private or public "keywords".

![FekoYaha Preview](https://raw.githubusercontent.com/ajtazer/FekoYaha/main/public/assets/icon.png)

## ✨ Features
- **🚀 Ultra-Fast Real-time Chat**: Powered by Cloudflare Durable Objects for low-latency message broadcasting.
- **🖼️ Instant Media Sharing**: Direct-to-R2 image uploads with real-time pulsing loaders and previews.
- **🌌 Cyber-Glassmorphism UI**: A stunning, responsive design with starry backgrounds and neon cyan accents.
- **⚡ Persistent History**: Infinite scroll search through hundreds of messages, stored safely in R2.
- **🛡️ Admin Dashboard**: Full control over rooms (Lock, Clear, Delete) with detailed participant metadata (IP, Location, Device).
- **🔒 Privacy First**: No signup, no cookies, and no tracking. Just pick a keyword and start sharing.

## 🛠️ Tech Stack
- **Frontend**: Vanilla JS, CSS3 (Custom Glassmorphism Design System)
- **Backend Server**: Cloudflare Workers
- **State Management**: Cloudflare Durable Objects (WebSocket Hibernation API)
- **Storage**: Cloudflare R2 (Images/Media)
- **Metadata**: Cloudflare KV (Room Tracking)

## 🏗️ Architecture

FekoYaha runs entirely on Cloudflare's edge network. The architecture leverages **Durable Objects** for real-time WebSocket coordination and persistent state management.

![Architecture Diagram](public/assets/arch%20diagram.png)

### How It Works
1. **User joins a room** → Worker routes to the correct Durable Object based on keyword
2. **WebSocket established** → DO maintains all connections for real-time messaging
3. **Messages sent** → DO broadcasts to all connected clients and persists to storage
4. **Files uploaded** → Worker streams directly to R2, returns URL to chat
5. **Admin actions** → Worker validates password, proxies requests to target DO

## 🚀 Deployment
Deploy to Cloudflare in seconds:

```bash
# Install dependencies
npm install

# Deploy to Cloudflare
npm run deploy

# Set your admin password
npx wrangler secret put ADMIN_PASSWORD
```

---
Made with ❤️ by [tazer](https://github.com/ajtazer) & antigravity.
