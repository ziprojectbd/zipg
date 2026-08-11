# syntax=docker/dockerfile:1
#
# zi-pay Backend — Multi-stage build for Coolify
# Build context: project root (needs pnpm-lock.yaml and workspace config)
# Express.js API server running on port 5001
#
# pnpm is pinned via packageManager: "pnpm@<version>" in package.json.
# corepack reads that field so all environments use the SAME pnpm version.
###############################################################################

############################## BUILD STAGE ####################################
FROM node:22-alpine AS build

RUN corepack enable

WORKDIR /app

# Give tsc build headroom
ENV NODE_OPTIONS="--max-old-space-size=2048"

# Copy workspace manifests for proper pnpm workspace resolution
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY backend/package.json ./backend/package.json

# Install all dependencies (including dev deps needed for tsc build)
RUN pnpm install --frozen-lockfile

# Copy backend source
COPY backend ./backend

# Build TypeScript -> dist/
RUN pnpm --dir backend build

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
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY backend/package.json ./backend/package.json

# Install production dependencies only
RUN corepack enable && pnpm install --frozen-lockfile --prod

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
