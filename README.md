# zi-pay — Production Payment Gateway

Production-ready, Dockerized payment gateway with separate frontend and backend services deployed via Coolify.

## Project Structure
            

```
zi-pay/
├── frontend/          # Vite + React + TypeScript + Tailwind
│   ├── Dockerfile     # Multi-stage build (node → nginx)
│   ├── nginx.conf     # SPA routing config
│   └── src/
├── backend/           # Express.js + MongoDB + Socket.IO
│   ├── Dockerfile     # Multi-stage build (node → runtime)
│   └── src/
│       ├── config/    # App & database configuration
│       ├── controllers/
│       ├── middleware/ # Auth, rate-limiter, validation, error handler
│       ├── models/    # Mongoose schemas
│       ├── routes/    # API route definitions
│       ├── services/  # Business logic
│       ├── socket/    # Socket.IO setup
│       ├── cron/      # Background jobs
│       └── validators/
├── docker-compose.yml # Production compose (Coolify reads this)
├── docs/
│   └── COOLIFY_DEPLOYMENT.md
├── scripts/
├── .env.example       # All environment variables documented
├── .gitignore
├── .dockerignore
└── package.json       # Monorepo scripts (dev, build, lint)
```

## Quick Start (Local Development)

### Prerequisites

- Node.js 22+ with pnpm
- Docker + Docker Compose
- MongoDB (local or Atlas)

### 1. Install dependencies

```bash
pnpm install
```

### 2. Create local `.env` files

```bash
cp .env.example .env
cp frontend/.env frontend/.env
cp backend/.env backend/.env
```

Edit `backend/.env` with your local MongoDB URI.

### 3. Start development servers

```bash
pnpm dev
```

- **Frontend**: `http://localhost:5173` (Vite dev server)
- **Backend API**: `http://localhost:5001` (Express)
- **Health**: `http://localhost:5001/health`

## Build

```bash
# Build everything
pnpm build

# Build frontend only
pnpm build:frontend

# Build backend only
pnpm build:backend
```

## Production Deployment (Coolify)

See [docs/COOLIFY_DEPLOYMENT.md](docs/COOLIFY_DEPLOYMENT.md) for full deployment instructions.

### Domain Architecture

```
https://app.domain.com   → Frontend (nginx SPA)
https://api.domain.com   → Backend (Express API)
```

### Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `VITE_API_URL` | Backend API URL (baked into frontend at build time) | Yes |
| `VITE_SOCKET_URL` | Socket.IO URL | Yes |
| `VITE_MAIN_SITE_URL` | Main site URL for redirects | Yes |
| `VITE_GOOGLE_CLIENT_ID` | Google OAuth Client ID | Yes |
| `MONGODB_URI` | MongoDB connection string | Yes |
| `JWT_SECRET` | JWT signing secret (64+ chars) | Yes |
| `WEBHOOK_SIGNING_SECRET` | HMAC webhook signing secret | Yes |
| `FRONTEND_URL` | Frontend URL for CORS/redirects | No |
| `CORS_ORIGINS` | Comma-separated allowed origins | No |

### Docker Build

```bash
# Build and run all services
docker compose up -d --build

# Build frontend only
docker compose build frontend

# Build backend only
docker compose build backend

# View logs
docker compose logs -f
```

## API Endpoints

| Endpoint | Description |
|----------|-------------|
| `GET /health` | Health check |
| `POST /api/v1/auth/login` | Admin login |
| `POST /api/v1/auth/google` | Google OAuth login |
| `POST /api/v1/payments/public/create` | Create public payment |
| `GET /api/v1/payments/public/status/:id` | Payment status |
| `GET /api/v1/admin/dashboard/overview` | Dashboard metrics |
| `GET /api/v1/admin/payments` | List payments |

> `/api/v1/*` is the current API. `/api/*` (no v1) is retained for backward compatibility.

## License

Private — All rights reserved.
