# Production Deployment Checklist — zi-pay

## 1. Prerequisites

- [ ] Coolify instance running (VPS with Docker)
- [ ] GitHub repository connected (Coolify GitHub App)
- [ ] Cloudflare DNS access for `app.domain.com` and `api.domain.com`
- [ ] MongoDB database (Atlas or Coolify-managed)

## 2. DNS Configuration

| Type | Name | Value | Proxy Status |
|------|------|-------|--------------|
| A | `app` | `<COOLIFY_SERVER_IP>` | DNS only (grey) |
| A | `api` | `<COOLIFY_SERVER_IP>` | DNS only (grey) |

- [ ] DNS records created
- [ ] DNS propagation verified (`dig app.domain.com`)

## 3. Secrets Generation

```bash
# JWT secret (64+ random chars)
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"

# Webhook signing secret
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

- [ ] `JWT_SECRET` generated and stored
- [ ] `WEBHOOK_SIGNING_SECRET` generated and stored
- [ ] Google OAuth Client ID created for `app.domain.com` (authorized redirect URIs: `https://app.domain.com/...`)

## 4. Frontend Deployment (Coolify)

- [ ] New resource → repository → branch `main`
- [ ] Ports Exposes: `80`
- [ ] Domain: `https://app.domain.com` (HTTPS enabled / Let's Encrypt)
- [ ] Build args set:
  - `VITE_API_URL=https://api.domain.com`
  - `VITE_SOCKET_URL=https://api.domain.com`
  - `VITE_MAIN_SITE_URL=https://domain.com`
  - `VITE_GOOGLE_CLIENT_ID=<your-client-id>`
- [ ] Auto Deploy enabled
- [ ] Deploy successful

**Verification:**
- [ ] `https://app.domain.com/` loads
- [ ] `/pay` checkout page works
- [ ] `/admin/login` shows login
- [ ] Pages use CSS/JS from `app.domain.com` (no `localhost`)

## 5. Backend Deployment (Coolify)

- [ ] New resource → repository → branch `main`
- [ ] Dockerfile: `backend/Dockerfile`
- [ ] Ports Exposes: `5001`
- [ ] Domain: `https://api.domain.com` (HTTPS enabled)
- [ ] Environment variables set:
  - `MONGODB_URI` = Atlas/managed MongoDB URI
  - `JWT_SECRET` = generated secret
  - `WEBHOOK_SIGNING_SECRET` = generated secret
  - `FRONTEND_URL` = `https://app.domain.com`
  - `CORS_ORIGINS` = `https://app.domain.com,https://domain.com,https://www.domain.com`
  - `GOOGLE_CLIENT_ID` = your client ID
- [ ] Auto Deploy enabled

**Verification:**
- [ ] `curl https://api.domain.com/health` returns `{"status":"ok",...}`
- [ ] `curl https://api.domain.com/api/v1/public/pay-settings` returns settings

## 6. End-to-End Verification

- [ ] Admin login via Google works: `https://app.domain.com/admin/login`
- [ ] Dashboard loads real metrics
- [ ] Transactions / payments flow works
- [ ] Socket.IO live updates work (payment created → appears in dashboard)
- [ ] No CORS errors in browser console
- [ ] No mixed-content warnings (all HTTPS)
- [ ] Health checks passing in Coolify UI (green)

## 7. Security Hardening

- [ ] MongoDB: root password rotated from default
- [ ] `MONGODB_URI` restricted to Coolify server IP (Atlas network access)
- [ ] JWT secret not in any committed file
- [ ] Rate limiting active (`express-rate-limit`)
- [ ] Helmet security headers verified via `curl -I https://api.domain.com`
- [ ] Default admin user created with strong password
- [ ] `robots.txt` present

## 8. Monitoring & Logs

- [ ] Coolify logs viewable
- [ ] `docker compose logs backend` / Coolify log viewer catches API errors
- [ ] Cron jobs active (payment expiry, device offline detection)
- [ ] Container restarts under control (health checks passing)

## 9. Rollback Plan

- [ ] Deployments in Coolify keep previous versions
- [ ] `MONGODB_URI` is the only stateful dependency (persist backups)
- [ ] Atlas automated backups enabled

## 10. Going Live

- [ ] All above complete
- [ ] DNS proxied (orange cloud) only after Coolify SSL verified working
- [ ] Update `www.domain.com` to point to frontend
- [ ] Monitor logs for 24h after launch