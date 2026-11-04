# 📡 FekoYaha
> **Throw it here.** A free, instant, and secure chat & image sharing space.

FekoYaha is a modern, real-time communication platform built on the edge. No signups, no tracking, just instant sharing through private or public "keywords".

![FekoYaha Preview](https://raw.githubusercontent.com/ajtazer/FekoYaha/main/public/assets/icon.png)

## ✨ Features
- **🚀 Ultra-Fast Real-time Chat**: Powered by Cloudflare Durable Objects for low-latency message broadcasting.
- **🖼️ Share almost anything**: Images, video, audio, PDFs, documents and archives (up to 100 MB), streamed to R2 with inline previews and an upload progress bar.
- **🌌 Cyber-glass UI**: A responsive React + shadcn/ui interface with a starfield/aurora background and neon-cyan accents.
- **⚡ Persistent history**: Recent messages are kept in the room's Durable Object and replayed on join.
- **🛡️ Admin dashboard**: Lock, clear or delete rooms, with participant metadata (location, device, IP).
- **🔒 Privacy first**: No signup, no cookies, no tracking. Just pick a keyword and start sharing.

## 🛠️ Tech Stack
- **Frontend**: React + TypeScript, Vite, Tailwind CSS v4, shadcn/ui
- **Backend Server**: Cloudflare Workers
- **State Management**: Cloudflare Durable Objects (WebSocket Hibernation API)
- **Storage**: Cloudflare R2 (files)
- **Metadata**: Cloudflare KV (room tracking)

## 💻 Develop
```bash
npm install
npm run dev          # Vite dev server (frontend)
npm run dev:worker   # wrangler dev (backend) in another terminal
npm run build        # type-check + build the frontend into dist/
```
The frontend deploys to GitHub Pages automatically on push to `main`
(`.github/workflows/deploy.yml`). Deploy the Worker with `npm run deploy`.

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
