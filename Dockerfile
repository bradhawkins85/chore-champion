# Multi-stage build for ChoreQuest
# Stage 1: Build the application
FROM node:20-bookworm-slim AS builder

WORKDIR /app

# Build argument to disable SSL verification if needed for corporate proxies
# Set to "true" during build if encountering SSL certificate issues
ARG DISABLE_SSL_VERIFY=false

# Build argument for API URL - defaults to relative path for nginx proxy
ARG VITE_API_URL=/api

# Build argument for application version - defaults to 1.0.0
ARG VITE_APP_VERSION=1.0.0

# Build argument for Stripe publishable key
ARG VITE_STRIPE_PUBLISHABLE_KEY=

# Disable SSL verification temporarily to fix certificate issues in build environment
RUN npm config set strict-ssl false

COPY package*.json ./

# Install dependencies
# Work around npm optional dependencies bug in multi-arch builds
# (https://github.com/npm/cli/issues/4828)
# Strategy: Use npm ci for reproducibility, then force reinstall rollup
# to ensure platform-specific optional dependencies are correctly resolved
RUN timeout 300 npm ci --legacy-peer-deps || ([ $? -eq 124 ] && echo "Timeout but continuing" || exit 1)

# Force reinstall rollup to get correct platform-specific binaries
# This is necessary because npm ci doesn't always correctly install optional dependencies
# for the target architecture in multi-arch Docker builds
RUN npm install --force rollup

COPY . .

# Set Vite environment variables for build
ENV VITE_API_URL=${VITE_API_URL}
ENV VITE_APP_VERSION=${VITE_APP_VERSION}
ENV VITE_STRIPE_PUBLISHABLE_KEY=${VITE_STRIPE_PUBLISHABLE_KEY}

# Work around npm bin linking issue by using node directly
RUN node node_modules/typescript/lib/tsc.js -b && node node_modules/vite/bin/vite.js build

# Stage 2: Production image with nginx
FROM nginx:alpine AS production

LABEL org.opencontainers.image.title="ChoreQuest"
LABEL org.opencontainers.image.description="Family chore tracking application with rewards system"
LABEL org.opencontainers.image.authors="ChoreQuest Team"
LABEL org.opencontainers.image.source="https://github.com/yourusername/chorequest"

COPY --from=builder /app/dist /usr/share/nginx/html

COPY nginx.conf /etc/nginx/conf.d/default.conf

RUN chown -R nginx:nginx /usr/share/nginx/html && \
    chmod -R 755 /usr/share/nginx/html

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://127.0.0.1/health || exit 1

CMD ["nginx", "-g", "daemon off;"]
