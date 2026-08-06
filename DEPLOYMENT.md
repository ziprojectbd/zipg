# zi-pay — Coolify Deployment Guide (pay.zipremiumservices.com)

This project deploys to **Coolify** as a Docker Compose stack. The Express
backend serves **both** the API (`/api/...`) and the built frontend SPA from a
single container.

## What Was Set Up

| File | Purpose |
|------|---------|
| `Dockerfile` | Multi-stage build: pnpm install → backend `tsc` build → frontend `vite` build → slim runtime with tini + tzdata |
| `docker-compose.yml` | `app` (Express 3001) + `mongo` (MongoDB 7) with health checks, volumes, restart policy |
| `.dockerignore` | Excludes node_modules, dist, `.env`, and dead Next.js/v0 artifacts from the image |
| `.env.example` | Template of every production variable Coolify should set |
| `deploy/nginx.zipay.conf` | Reference Nginx config (not required by Coolify — see below) |

## Deploying on Coolify (web UI)

1. **New project / resource → Docker Compose.**
2. Point it at this repository (git), branch `main`.
3. Coolify will read the root `docker-compose.yml`.
4. Set **Environment Variables** (all read via `${VAR}` interpolation):

| Variable | Required | Example / Note |
|----------|----------|----------------|
| `VITE_API_URL` | yes | `https://pay.zipremiumservices.com` |
| `VITE_SOCKET_URL` | yes | `https://pay.zipremiumservices.com` |
| `VITE_MAIN_SITE_URL` | yes | `https://zipremiumservices.com` |
| `VITE_GOOGLE_CLIENT_ID` | yes | your Google OAuth client ID |
| `MONGODB_URI` | **yes** | Atlas URI, e.g. `mongodb+srv://USER:PASS@cluster0.xxx.mongodb.net/zipay` |
| `JWT_SECRET` | **yes** | `node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"` |
| `WEBHOOK_SIGNING_SECRET` | **yes** | `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` |
| `JWT_ACCESS_EXPIRY` | no | `15m` |
| `JWT_REFRESH_EXPIRY` | no | `7d` |
| `FRONTEND_URL` | no | `https://pay.zipremiumservices.com` |
| `CORS_ORIGINS` | no | `https://pay.zipremiumservices.com,https://zipremiumservices.com,https://www.zipremiumservices.com` |

5. **Networking:** In Coolify set **Ports Exposes → 3001**. Set the domain
   `pay.zipremiumservices.com` and enable **HTTPS / Let's Encrypt**.
6. **Deploy.**

### Using the bundled MongoDB (instead of Atlas)

If you don't provide `MONGODB_URI`, the compose file spins up its own `mongo`
service. Set these two extra variables:

| Variable | Example |
|----------|---------|
| `MONGO_INITDB_ROOT_USERNAME` | `zipay` |
| `MONGO_INITDB_ROOT_PASSWORD` | a strong password |

The app then connects automatically to `mongodb://zipay:<pw>@mongo:27017/zipay?authSource=admin`.

> ⚠️ Switching between Atlas and bundled Mongo changes **where your data lives.**
> Choose one and stick with it. `mongo-data` is a named volume, so it survives
> redeploys.

## HTTPS / SSL / Mixed content

- Coolify's proxy terminates TLS with Let's Encrypt, so this config has **no mixed
  content**: the entire app is served over `https://`.
- The Express container only listens on `:3001` internally (HTTP); the proxy
  terminates TLS. `server.ts` sets `app.set('trust proxy', 1)` so
  `req.ip` / rate-limiters work behind the proxy.
- `.env.example` deliberately has **no** `http://` hardcoded URLs in production.

## After first deploy

1. If you're using the bundled MongoDB and there is **no admin user yet**, seed
   the database: run `docker exec -it <app-container> node backend/seed.js` —
   or create your super_admin through the app's normal flow.
   > The seed script (`backend/src/seed.ts`) reads `MONGODB_URI` the same way the
   > server does, so it connects to the same DB.
2. Set `JWT_SECRET` and `WEBHOOK_SIGNING_SECRET` to **real** generated values in
   Coolify (never the placeholders).
3. Verify:
   - `https://pay.zipremiumservices.com/` → landing page
   - `https://pay.zipremiumservices.com/health` → JSON `status: ok`
   - `https://pay.zipremiumservices.com/payment/invoice?requestId=...`
   - `https://pay.zipremiumservices.com/pay` → checkout
   - `https://pay.zipremiumservices.com/admin/login` → admin panel
4. Update your DNS: a matching `A`/`CNAME` record pointing at the Coolify host
   with the domain `pay.zipremiumservices.com`.

### Payment routes summary

The gateway's **own** SPA routes (client-side, served by the container via the
SPA fallback):

| Route | Purpose |
|-------|---------|
| `/` | Landing |
| `/pay` | Public checkout (create payment) |
| `/payment/invoice` | bKash-style invoice page |
| `/track` & `/status/:requestId` | Payment status |
| `/admin/*` | Admin panel |

`/payment/process`, `/payment/success`, `/payment/failed` are **not** part of
this gateway — the invoice page redirects the buyer back to the **main merchant
site** (`zipremiumservices.com/payment/process...`) after confirmation, per
`returnUrl`. Those live on the merchant application, not this repo.

## Verification checklist (run before going live)

- [x] Backend `pnpm --dir backend build` → `dist/server.js` (verified)
- [x] Frontend `pnpm --dir frontend build` with prod `VITE_*` → `dist/` (verified)
- [x] No `localhost` / `127.0.0.1` / `:5173` / `:3000` left in production bundles (verified)
- [x] CORS allowed origins = production domains
- [x] `FRONTEND_URL` default = `https://pay.zipremiumservices.com`
- [x] MongoDB default points at compose `mongo` service
- [x] `SystemSettings` seeded defaults use https prod domain (no localhost)
- [x] Docker HEALTHCHECK on `/health`
- [x] `restart: unless-stopped`
- [x] Graceful shutdown via tini + SIGTERM handler

## Troubleshooting

- **Container restarts / DB error:** confirm `MONGODB_URI` or the mongo creds;
  the app retries Mongo 5× with backoff, then exits.
- **CORS errors in browser:** add the exact origin shown in the console error to
  `CORS_ORIGINS` (it's an allow-list).
- **Socket.IO won't connect:** Coolify (Traefik) must forward WebSockets; enable
  WebSocket support for the domain in Coolify.
- **White page on deep link** (e.g. `.../payment/invoice`): ensure the compose
  service uses the SPA fallback — it does, and it ships the built index.html.