# Coolify Deployment Guide — zi-pay

Deploy **zi-pay** to production using Coolify. The frontend proxies `/api` and
`/socket.io` to the backend itself — **no backend domain is required**.

## Architecture

```
                      ┌─────────────────────────────┐
   app.domain.com ──► │  Coolify Proxy (Traefik)   │ ──► frontend (nginx:80)
                      │    SSL: Let's Encrypt      │       │
                      │                            │       │ proxy /api, /socket.io
                      │                            │       ▼
                      │                            │    backend (Express:5001)
                      └─────────────────────────────┘       │
                                                             ▼
                                       MongoDB (EXTERNAL — Coolify-managed / Atlas)
```

| Service   | Container  | Internal Port | External Domain          |
|-----------|------------|---------------|--------------------------|
| Frontend  | nginx      | 80            | `pay.domain.com`         |
| Backend   | Express    | 5001          | (internal — no domain)   |
| Database  | MongoDB    | 27017         | (external / managed)     |

## Prerequisites

1. **Coolify** instance running on a VPS (DigitalOcean, Hetzner, Vultr, etc.)
2. **GitHub repository** with your code
3. **Cloudflare** DNS access
4. **Atlas MongoDB** or use Coolify-managed MongoDB

## Cloudflare DNS Configuration

Create these records pointing to your Coolify server's IP address:

| Type  | Name          | Value                | Proxy |
|-------|---------------|----------------------|-------|
| A     | `app`         | `<COOLIFY_IP>`       | DNS only (grey cloud) |
| A     | `api`         | `<COOLIFY_IP>`       | DNS only (grey cloud) |
| A     | `@`           | `<COOLIFY_IP>`       | DNS only (grey cloud) |
| A     | `www`         | `<COOLIFY_IP>`       | DNS only (grey cloud) |

> ⚠️ **Important:** Set to **DNS only** (grey cloud) if Coolify issues its own SSL
> certificates. If you enable Cloudflare proxying (orange cloud), set Coolify SSL to
> **Flexible** to avoid SSL certificate mismatch errors.

## Coolify Deployment — Frontend

### Create the Frontend Resource

1. In Coolify, click **New Resource** → **Public Repository** → **GitHub App**.
2. Connect your GitHub repository and select the branch (e.g. `main`).
3. Choose **Docker Compose** build type pointing at `docker-compose.yaml` at the repo root
   (this builds both frontend + backend in one stack), **or** use separate **Dockerfile**
   resources (frontend = `frontend/Dockerfile`, backend = `backend/Dockerfile`, both with
   build context = repo root).

### Frontend Build Configuration

> ⚠️ When using the compose file the frontend **does NOT need a backend domain**.
> `VITE_API_URL=/api` (same-origin, proxied by nginx). The defaults in the compose
> file and `frontend/.env.production` already do this — only override if you know why.

In the resource's **Build** section, set these **Build Arguments** (these are `VITE_*` variables baked into the frontend bundle):

| Argument                 | Example Value                                       |
|--------------------------|-----------------------------------------------------|
| `VITE_API_URL`           | `/api` (same-origin — no backend domain needed)    |
| `VITE_SOCKET_URL`        | *(leave empty)* — socket uses the same origin too   |
| `VITE_MAIN_SITE_URL`     | `https://domain.com`                                |
| `VITE_GOOGLE_CLIENT_ID`  | `your-google-oauth-client-id.apps.googleusercontent.com` |

### Frontend Domains

Config                | Value
----------------------|--------------------------------
Ports Exposes         | `80`

#### Domain Configuration

1. In the resource, go to **Domains**.
2. Add `https://pay.domain.com` (and optionally `https://www.domain.com`).
3. Enable **HTTPS / Let's Encrypt** (Coolify automatically gets SSL certificates).

> The nginx container proxies `/api/*` and `/socket.io/*` to the backend service
> over the internal Docker network — same-origin, so **no CORS and no API domain**.

## Coolify Deployment — Backend

Use "New Resource" → "Public Repository" → "GitHub App", or create your own from a Docker Compose based on this repo's `docker-compose.yaml` — provided as the default.

> 💡 The backend does **not** need its own domain — the frontend nginx proxies
> `/api` and `/socket.io` to it internally. If you deploy backend as a separate
> resource, **do not** add a public domain; keep it internal.

If you want **separate deployments** (each with its own build process):

1. Create a new resource for the **backend** by using the Dockerfile at `backend/Dockerfile` (build context = monorepo root).
2. Set **Ports Exposes** → `5001`.
3. **Do not** add a public domain. (If Coolify requires one, add a private/internal label only.)

### Backend Environment Variables

| Variable        | Required | Example / Note                                                |
|-----------------|----------|---------------------------------------------------------------|
| `MONGODB_URI`   | yes      | **Coolify-managed MongoDB URL or Atlas.** No bundled mongo container — do NOT use `mongo` hostname. |
| `JWT_SECRET`    | yes      | `node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"` |
| `WEBHOOK_SIGNING_SECRET` | yes | `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` |
| `FRONTEND_URL`  | no       | `https://pay.domain.com`                                     |
| `CORS_ORIGINS`  | no       | comma-separated list of allowed origins                      |
| `GOOGLE_CLIENT_ID` | yes    | Google OAuth Client ID                                      |
| `JWT_ACCESS_EXPIRY` | no    | `15m`                                                      |
| `JWT_REFRESH_EXPIRY` | no   | `7d`                                                     |
| `PORT`          | no       | `5001` (default)                                           |
| `NODE_ENV`      | no       | `production` (default)                                     |

### Healthchecks

Coolify uses the Docker HEALTHCHECK from the Dockerfile. Verify `/health` responds
(through the frontend proxy, since the backend has no public domain):

```
https://pay.domain.com/api/health
```

Returns `{"status":"ok","service":"zi-pay-api",...}`.

> If the backend restarts repeatedly: check the container logs for the
> `MONGODB_URI` error — the DB is external now, so the URL must be the
> Coolify-managed / Atlas connection string, **not** `mongodb://mongo:27017`.

## Auto-Deployment from GitHub

1. In Coolify resource → **General Settings**, enable **Auto Deploy**.
2. On every push to the selected branch, Coolify automatically rebuilds and redeploys.
3. GitHub Webhooks are configured automatically by the Coolify GitHub App.

## Troubleshooting

### Backend keeps restarting (restart loop)

The most common cause: `MONGODB_URI` is empty or points at the old internal
`mongodb://mongo:27017/zipay` host. There is no `mongo` container anymore.
Fix: set `MONGODB_URI` on the backend resource to the **Coolify-managed database
URL** (the one Coolify prints for the database you created) or your Atlas URI.

### CORS errors in browser

With same-origin proxying (`VITE_API_URL=/api`) the browser never does
cross-origin requests, so CORS errors should be gone. If you still see them,
make sure `CORS_ORIGINS` includes the exact origin shown in the console error
(it's an allow-list) and that the frontend nginx is proxying (not 404ing) `/api`.

### Socket.IO won't connect

Coolify (Traefik) must forward WebSockets. Ensure Websocket forwarding is enabled for the domain(s) in Coolify (usually automatic with HTTPS).

### Mixed content

CSS / JS requests blocked over HTTP if the site itself is HTTPS. With same-origin
proxying this can't happen — the frontend only talks to its own origin, which is HTTPS.

### Frontend links to `localhost` in production bundle

The `VITE_*` variables are baked at build time. Do not set them to `http://localhost`
in production builds. Use `VITE_API_URL=/api` and let nginx proxy to the backend.

## Production Checklist

- [ ] DNS record created for `pay.domain.com` (gray, DNS-only if using Coolify SSL)
- [ ] No `api.*` DNS record needed anymore — the frontend proxies `/api` to the backend
- [ ] Backend `MONGODB_URI` = **Coolify-managed MongoDB URL** or Atlas (no bundled mongo)
- [ ] Backend `JWT_SECRET` & `WEBHOOK_SIGNING_SECRET` set to generated values
- [ ] `CORS_ORIGINS` includes the frontend domain(s)
- [ ] Frontend domain has HTTPS enabled; backend has no public domain
- [ ] Resources configured with **Ports Exposes** (frontend 80, backend 5001)
- [ ] **Auto deploy** enabled
- [ ] `curl https://pay.domain.com/api/health` returns `ok`
- [ ] Login to `https://pay.domain.com/admin/login` works