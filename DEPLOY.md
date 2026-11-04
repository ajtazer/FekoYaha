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

## Architecture: two parts

FekoYaha is deployed in two pieces:

- **Frontend** (this repo's `app/`, built with Vite to `dist/`) is a static
  React site hosted on **GitHub Pages**. It deploys automatically on push to
  `main` via `.github/workflows/deploy.yml`, and talks to the backend over
  HTTPS + WebSocket.
- **Backend** (`src/`) runs on **Cloudflare Workers** with Durable Objects
  (rooms), R2 (files) and KV (room tracking). Deploy it with `npm run deploy`.

The frontend finds the backend automatically: `localhost` uses a local
`wrangler dev`, production uses the Worker URL (see `app/lib/config.ts`).

---

## Environment Variables

For production, you can add secrets:

```bash
npx wrangler secret put SECRET_NAME
```
