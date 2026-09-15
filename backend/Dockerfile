# syntax=docker/dockerfile:1
#
# zi-pay Backend — Multi-stage build for Coolify
# Build context: project root (needs yarn.lock + root workspaces config)
# Express.js API server running on port 5001
#
# Yarn (classic v1) workspaces: the root yarn.lock locks the whole monorepo,
# so `COPY package.json yarn.lock` is enough for a reproducible install.
# yarn install is faster and far lighter on CPU/RAM than npm install.
#
# Performance: the yarn cache is mounted as a BuildKit cache, and production
# dependencies are installed in their own stage so the runtime image never
# runs a second full install.
###############################################################################

ARG NODE_VERSION=22-alpine

######################## PRODUCTION DEPENDENCIES ##############################
FROM node:${NODE_VERSION} AS prod-deps

RUN corepack enable && corepack prepare yarn@1.22.22 --activate

WORKDIR /app

ENV NODE_ENV=production

# Copy workspace manifests for proper yarn workspace resolution
COPY package.json yarn.lock ./
COPY backend/package.json ./backend/package.json
COPY frontend/package.json ./frontend/package.json

# Install production dependencies only (cached across builds).
# yarn workspaces may place unhoistable packages inside the backend workspace,
# so the directory is created to guarantee the runtime COPY has a source.
RUN --mount=type=cache,target=/usr/local/share/.cache/yarn \
    yarn install --frozen-lockfile --non-interactive --production \
      --network-timeout 600000 \
  && mkdir -p /app/backend/node_modules

############################## BUILD STAGE ####################################
FROM node:${NODE_VERSION} AS build

RUN corepack enable && corepack prepare yarn@1.22.22 --activate

WORKDIR /app

# Give tsc build headroom
ENV NODE_OPTIONS="--max-old-space-size=2048"

# Copy workspace manifests for proper yarn workspace resolution
COPY package.json yarn.lock ./
COPY backend/package.json ./backend/package.json
COPY frontend/package.json ./frontend/package.json

# Install all dependencies including dev deps (cached across builds)
RUN --mount=type=cache,target=/usr/local/share/.cache/yarn \
    yarn install --frozen-lockfile --non-interactive \
      --network-timeout 600000

# Copy backend source
COPY backend ./backend

# Build TypeScript -> dist/
RUN yarn workspace zi-pay-backend build

############################### RUNTIME STAGE #################################
FROM node:${NODE_VERSION} AS runtime

ENV NODE_ENV=production
ENV NODE_OPTIONS="--enable-source-maps"

# Install tini (proper PID 1) and tzdata (Bangladesh timezone for payment logic)
RUN apk add --no-cache tini tzdata \
  && cp /usr/share/zoneinfo/Asia/Dhaka /etc/localtime \
  && echo "Asia/Dhaka" > /etc/timezone

WORKDIR /app

# Production dependencies (already pruned — no second install at build time)
COPY --from=prod-deps /app/node_modules ./node_modules
COPY --from=prod-deps /app/package.json ./package.json
COPY --from=prod-deps /app/backend/package.json ./backend/package.json
COPY --from=prod-deps /app/backend/node_modules ./backend/node_modules

# Copy built application from build stage
COPY --from=build /app/backend/dist ./backend/dist

# Create uploads directory (writable, mountable via volume)
RUN mkdir -p /app/backend/uploads

# Run as non-root user
RUN addgroup -S nodejsg && adduser -S nodejs -G nodejsg \
  && chown -R nodejs:nodejsg /app
USER nodejs

EXPOSE 5001

# Health check (uses internal port)
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:5001/health').then(r=>{if(!r.ok)process.exit(1)}).catch(()=>process.exit(1))" || exit 1

# tini = proper PID 1 + signal forwarding for graceful shutdown
ENTRYPOINT ["/sbin/tini", "--"]

# Start the Express server
CMD ["node", "backend/dist/server.js"]
