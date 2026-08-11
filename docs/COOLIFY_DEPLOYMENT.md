# Coolify Deployment Guide — zi-pay

Deploy **zi-pay** to production using Coolify with separate frontend and backend domains.

## Architecture

```
                      ┌─────────────────────────────┐
   app.domain.com ──► │  Coolify Proxy (Traefik)   │ ──► frontend (nginx:80)
                      │    SSL: Let's Encrypt      │
   api.domain.com ──► │                            │ ──► backend (Express:5001)
                      └─────────────────────────────┘
                                   │
                              MongoDB (mongo:27017)
```

| Service   | Container | Internal Port | External Domain               |
|-----------|-----------|---------------|-------------------------------|
| Frontend  | nginx     | 80            | `app.domain.com`              |
| Backend   | Express   | 5001          | `api.domain.com`              |
| Database  | MongoDB   | 27017         | (internal only)               |

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
3. Choose **Docker Image** & **Dockerfile** build type.

### Frontend Build Configuration

In the resource's **Build** section, set these **Build Arguments** (these are `VITE_*` variables baked into the frontend bundle):

| Argument                 | Example Value                                       |
|--------------------------|-----------------------------------------------------|
| `VITE_API_URL`           | `https://api.domain.com`                            |
| `VITE_SOCKET_URL`        | `https://api.daydomain.com`                         |
| `VITE_MAIN_SITE_URL`     | `https://domain.com`                                |
| `VITE_GOOGLE_CLIENT_ID`  | `your-google-oauth-client-id.apps.googleusercontent.com` |

### Frontend Domains

Config                | Value
----------------------|--------------------------------
Ports Exposes         | `80`

#### Domain Configuration

1. In the resource, go to **Domains**.
2. Add `https://app.domain.com` (and optionally `https://www.domain.com`).
3. Enable **HTTPS / Let's Encrypt** (Coolify automatically gets SSL certificates).

> Optional: The same frontend container can serve multiple domains (app.domain.com, panel.domain.com) by adding them to Domains.

## Coolify Deployment — Backend

Use "New Resource" → "Public Repository" → "GitHub App", or create your own from a Docker Compose based on this repo's `docker-compose.yml` — provided as a reference.

If you want **separate deployments** (each with its own build process and domain):

1. Create a new resource for the **backend** by using the Dockerfile at `backend/Dockerfile` (build context = monorepo root).
2. Set **Ports Exposes** → `5001`.
3. Domain → `https://api.domain.com` with HTTPS enabled.

### Backend Environment Variables

| Variable        | Required | Example / Note                                                |
|-----------------|----------
| `MONGODB_URI`   | yes      | Atlas URI or Coolify-managed MongoDB connection string       |
| `JWT_SECRET`    | yes      | `node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"` |
| `WEBHOOK_SIGNING_SECRET` | yes | `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` |
| `FRONTEND_URL`  | no       | `https://app.domain.com`                                     |
| `CORS_ORIGINS`  | no       | comma-separated list of allowed origins                      |
| `GOOGLE_CLIENT_ID` | yes    | Google OAuth Client ID                                      |
| `JWT_ACCESS_EXPIRY` | no    | `15m`                                                      |
| `JWT_REFRESH_EXPIRY` | no   | `7d`                                                     |
| `PORT`          | no       | `5001` (default)                                           |
| `NODE_ENV`      | no       | `production` (default)                                     |

### Healthchecks

Coolify uses the Docker HEALTHCHECK from the Dockerfile. Verify `/health` responds:

```
https://api.domain.com/health
```

Returns `{"status":"ok","service":"zi-pay-api",...}`.

## Auto-Deployment from GitHub

1. In Coolify resource → **General Settings**, enable **Auto Deploy**.
2. On every push to the selected branch, Coolify automatically rebuilds and redeploys.
3. GitHub Webhooks are configured automatically by the Coolify GitHub App.

## Troubleshooting

### CORS errors in browser

Add the exact origin shown in the console error to `CORS_ORIGINS` (it's an allow-list).

### Socket.IO won't connect

Coolify (Traefik) must forward WebSockets. Ensure Websocket forwarding is enabled for the domain(s) in Coolify (usually automatic with HTTPS).

### Mixed content

CSS / JS requests blocked over HTTP if the site itself is HTTPS. Ensure Coolify's proxy sends `X-Forwarded-Proto: https` (automatic) and the frontend fetches `https://api.domain.com` (not http).

### Frontend links to `localhost` in production bundle

The `VITE_*` variables are baked at build time. Do not set them to `http://localhost` in production builds.

## Production Checklist

- [ ] DNS records created for `app.domain.com` & `api.domain.com` (gray, DNS-only if using Coolify SSL)
- [ ] Frontend build args = production domains
- [ ] Backend `MONGODB_URI` points to Atlas/coolify-managed DB
- [ ] Backend `JWT_SECRET` & `WEBHOOK_SIGNING_SECRET` set to generated values
- [ ] `CORS_ORIGINS` includes the frontend domain(s)
- [ ] Frontend domain & Backend domain both have HTTPS enabled
- [ ] Both resources configured with **Ports Exposes** (frontend 80, backend 5001)
- [ ] **Auto deploy** enabled
- [ ] `curl https://api.domain.com/health` returns `ok`
- [ ] Login to `https://app.domain.com/admin/login` works