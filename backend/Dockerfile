# syntax=docker/dockerfile:1
#
# zi-pay Backend — Multi-stage build for Coolify
# Build context: project root (needs yarn.lock + root workspaces config)
# Express.js API server running on port 5001
#
# Yarn (classic v1) workspaces: the root yarn.lock locks the whole monorepo,
# so `COPY package.json yarn.lock` is enough for a reproducible install.
# yarn install is faster and far lighter on CPU/RAM than npm install.
###############################################################################

############################## BUILD STAGE ####################################
FROM node:22-alpine AS build

RUN corepack enable && corepack prepare yarn@1.22.22 --activate

WORKDIR /app

# Give tsc build headroom
ENV NODE_OPTIONS="--max-old-space-size=2048"

# Copy workspace manifests for proper yarn workspace resolution
COPY package.json yarn.lock ./
COPY backend/package.json ./backend/package.json
COPY frontend/package.json ./frontend/package.json

# Install all dependencies (including dev deps needed for tsc build)
RUN yarn install --frozen-lockfile --non-interactive

# Copy backend source
COPY backend ./backend

# Build TypeScript -> dist/
RUN yarn workspace zi-pay-backend build

############################### RUNTIME STAGE #################################
FROM node:22-alpine AS runtime

ENV NODE_ENV=production
ENV NODE_OPTIONS="--enable-source-maps"

# Install tini (proper PID 1) and tzdata (Bangladesh timezone for payment logic)
RUN apk add --no-cache tini tzdata \
  && cp /usr/share/zoneinfo/Asia/Dhaka /etc/localtime \
  && echo "Asia/Dhaka" > /etc/timezone

WORKDIR /app

# Copy package manifests for production dependency install
COPY package.json yarn.lock ./
COPY backend/package.json ./backend/package.json
COPY frontend/package.json ./frontend/package.json

# Install production dependencies only (NODE_ENV=production makes yarn skip dev deps)
RUN corepack enable && corepack prepare yarn@1.22.22 --activate \
  && yarn install --frozen-lockfile --non-interactive

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
