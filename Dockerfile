# syntax=docker/dockerfile:1
#
# zi-pay — single multi-stage build for Coolify (https://pay.zipremiumservices.com)
#
# Architecture:
#   The Express backend serves BOTH the API (/api/...) AND the built frontend
#   SPA (frontend/dist) in production (see backend/src/server.ts). So we ship
#   ONE container: compiled backend + compiled frontend, run with node.
#
# pnpm is pinned via packageManager: "pnpm@<version>" in package.json. corepack
# reads that field, so ALL environments (CI, Coolify, docker) use the SAME pnpm
# version that produced pnpm-lock.yaml (lockfileVersion 9). This is the number
# ONE cause of "works locally, fails in Docker" — a stale/incompatible pnpm.
###############################################################################

############################## BUILD STAGE ####################################
FROM node:22-alpine AS build

# pnpm is the package manager for this monorepo. corepack installs the exact
# version declared in packageManager (see package.json).
RUN corepack enable

WORKDIR /app

# Give the Vite / tsc build headroom. Coolify builds can run in small
# containers; without this, the 2400-line single-file frontend can OOM.
ENV NODE_OPTIONS="--max-old-space-size=4096"

# ----- Build-time Vite args (baked into the SPA bundle) -----
# These MUST be provided by docker-compose / Coolify / .env
ARG VITE_API_URL=https://pay.zipremiumservices.com
ARG VITE_SOCKET_URL=https://pay.zipremiumservices.com
ARG VITE_MAIN_SITE_URL=https://zipremiumservices.com
ARG VITE_GOOGLE_CLIENT_ID=""

ENV VITE_API_URL=$VITE_API_URL
ENV VITE_SOCKET_URL=$VITE_SOCKET_URL
ENV VITE_MAIN_SITE_URL=$VITE_MAIN_SITE_URL
ENV VITE_GOOGLE_CLIENT_ID=$VITE_GOOGLE_CLIENT_ID

# Copy manifests first for better layer caching
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY frontend/package.json ./frontend/package.json
COPY backend/package.json ./backend/package.json

# Install ALL workspace deps (incl. dev deps needed for the build)
RUN pnpm install --frozen-lockfile

# Copy the actual source
COPY frontend ./frontend
COPY backend ./backend

# Build the backend (tsc -> dist)
RUN pnpm --dir backend build

# Build the frontend (tsc + vite build -> frontend/dist)
# Uses VITE_* env vars set above — NO localhost in the production bundle.
RUN pnpm --dir frontend build

############################### RUNTIME STAGE #################################
FROM node:22-alpine AS runtime

ENV NODE_ENV=production
# Enable source maps + better container logging
ENV NODE_OPTIONS="--enable-source-maps"

# Correct timezone for Bangladesh (payment/expiry logic is Asia/Dhaka)
# fetch is available via Node 22 globals (no undici package needed).
RUN apk add --no-cache tini tzdata \
  && cp /usr/share/zoneinfo/Asia/Dhaka /etc/localtime \
  && echo "Asia/Dhaka" > /etc/timezone

WORKDIR /app

# Copy the produced build artifacts
COPY --from=build /app/backend/dist ./backend/dist
COPY --from=build /app/frontend/dist ./frontend/dist

# Copy the FULL installed workspace node_modules. Doing this instead of a
# `pnpm install --prod` re-run avoids a second resolve step (and any lockfile /
# network drift) after the build. pnpm top-level node_modules are real dirs and
# each workspace package's node_modules are symlinks into the shared .pnpm
# store; copying both preserves the relative symlink structure.
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/backend/node_modules ./backend/node_modules
COPY --from=build /app/package.json ./package.json
COPY --from=build /app/backend/package.json ./backend/package.json

# Writable dir for uploads (mountable via volume)
RUN mkdir -p /app/backend/uploads

# Run as a non-root user
RUN addgroup -S nodejsg && adduser -S nodejs -G nodejsg \
  && chown -R nodejs:nodejsg /app
USER nodejs

EXPOSE 3001

# Coolify / Docker health check (uses internal port, not the exposed one)
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:3001/health').then(r=>{if(!r.ok)process.exit(1)}).catch(()=>process.exit(1))" || exit 1

# tini = proper PID 1 + signal forwarding for graceful shutdown
ENTRYPOINT ["/sbin/tini", "--"]

# Start the Express server (serves API + SPA)
CMD ["node", "backend/dist/server.js"]