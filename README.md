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
