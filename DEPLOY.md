# FekoYaha Deployment Guide

## Cloudflare Deployment

### Prerequisites

1. **Cloudflare Account** - [Create one free](https://dash.cloudflare.com/sign-up)
2. **Wrangler CLI** (already installed in project)

### Step 1: Login to Cloudflare

```bash
npx wrangler login
```

This opens a browser to authenticate.

### Step 2: Create R2 Bucket

```bash
npx wrangler r2 bucket create fekoyaha-files
```

### Step 3: Create KV Namespace (optional, for future rate limiting)

```bash
npx wrangler kv namespace create KV
```

Copy the ID from output and update `wrangler.toml`:
```toml
[[kv_namespaces]]
binding = "KV"
id = "YOUR_KV_ID_HERE"
```

### Step 4: Deploy

```bash
npm run deploy
```

Your app will be live at: `https://fekoyaha.<your-subdomain>.workers.dev`

### Custom Domain (Optional)

1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com)
2. Workers & Pages → Your Worker → Triggers
3. Add Custom Domain

---

## ⚠️ About GitHub Pages

**GitHub Pages won't work for this app** because:
- It only hosts static files (HTML, CSS, JS)
- FekoYaha needs a backend (Workers, Durable Objects, R2, WebSockets)

**Cloudflare Workers** provides everything needed:
- Edge computing (backend)
- Durable Objects (persistent rooms)
- R2 (file storage)
- WebSocket support
- Free tier: 100,000 requests/day

---

## Environment Variables

For production, you can add secrets:

```bash
npx wrangler secret put SECRET_NAME
```
