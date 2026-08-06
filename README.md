# ZI Pay

ZI Pay is a Vite + React operations console backed by an Express + TypeScript payment API.

## Run locally

```bash
pnpm install
pnpm dev
```

Frontend: `http://localhost:5173` · API: `http://localhost:4000/health`

Copy `backend/.env.example` and `frontend/.env.example` into local env files before connecting MongoDB, webhook signing, and production URLs. The first API login request provisions a development user; replace that flow with your Mongo-backed user repository before production.
