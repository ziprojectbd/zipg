# syntax=docker/dockerfile:1
#
# zi-pay Frontend — Multi-stage build for Coolify
# Build context: project root (needs yarn.lock + root workspaces config)
# Serves the Vite + React SPA via nginx on port 80
#
# Build args: Vite build-time variables (VITE_*) must be provided during build.
# Runtime: No env vars needed — all VITE_* are baked into the bundle.
#
# Performance: the yarn cache is mounted as a BuildKit cache so repeat
# deploys skip re-downloading the whole dependency tree.
###############################################################################

ARG NODE_VERSION=22-alpine

############################## BUILD STAGE ####################################
FROM node:${NODE_VERSION} AS build

RUN corepack enable && corepack prepare yarn@1.22.22 --activate

WORKDIR /app

# Give Vite / tsc build headroom
ENV NODE_OPTIONS="--max-old-space-size=4096"

# Build-time Vite variables — embedded in the JS bundle at build time
# VITE_API_URL is relative (/api) → same-origin requests proxied by nginx
ARG VITE_API_URL=/api
ARG VITE_SOCKET_URL=
ARG VITE_MAIN_SITE_URL=https://zipremiumservices.com
ARG VITE_GOOGLE_CLIENT_ID=""

ENV VITE_API_URL=$VITE_API_URL
ENV VITE_SOCKET_URL=$VITE_SOCKET_URL
ENV VITE_MAIN_SITE_URL=$VITE_MAIN_SITE_URL
ENV VITE_GOOGLE_CLIENT_ID=$VITE_GOOGLE_CLIENT_ID

# Copy workspace manifests for proper yarn workspace resolution
COPY package.json yarn.lock ./
COPY frontend/package.json ./frontend/package.json
COPY backend/package.json ./backend/package.json

# Install dependencies (cached across builds).
# The cache id is unique to this image with sharing=locked: the backend image
# installs in parallel, and two builds writing one cache dir corrupts it.
RUN --mount=type=cache,id=yarn-frontend,target=/usr/local/share/.cache/yarn,sharing=locked \
    yarn install --frozen-lockfile --non-interactive \
      --network-timeout 600000

# Copy frontend source
COPY frontend ./frontend

# Build the production bundle
RUN yarn workspace zi-pay-frontend build

############################### RUNTIME STAGE #################################
FROM nginx:1.27-alpine AS runtime

# Remove default nginx config
RUN rm /etc/nginx/conf.d/default.conf

# Copy custom nginx config
COPY frontend/nginx.conf /etc/nginx/conf.d/default.conf

# Copy built frontend assets from build stage
COPY --from=build /app/frontend/dist /usr/share/nginx/html

# Create non-root user for nginx
RUN addgroup -S nginxgroup && adduser -S nginxuser -G nginxgroup \
  && chown -R nginxuser:nginxgroup /usr/share/nginx/html \
  && chown -R nginxuser:nginxgroup /var/cache/nginx \
  && chown -R nginxuser:nginxgroup /var/log/nginx \
  && touch /var/run/nginx.pid \
  && chown -R nginxuser:nginxgroup /var/run/nginx.pid

EXPOSE 80

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://127.0.0.1:80/ || exit 1

CMD ["nginx", "-g", "daemon off;"]
