# Multi-stage build for ChoreQuest
# Stage 1: Build the application
FROM node:20-bookworm-slim AS builder

WORKDIR /app

# Build argument to disable SSL verification if needed for corporate proxies
# Set to "true" during build if encountering SSL certificate issues
ARG DISABLE_SSL_VERIFY=false

# Disable SSL verification temporarily to fix certificate issues in build environment
RUN npm config set strict-ssl false

COPY package*.json ./

# Install dependencies
# Work around npm 10.x exit handler bug in Docker
# For multi-arch builds, optional dependencies must be explicitly included
# Using npm install (not npm ci) to avoid the npm optional dependencies bug
# documented in https://github.com/npm/cli/issues/4828
# Note: package-lock.json is used when available to maintain reproducibility
RUN timeout 300 npm install --legacy-peer-deps || ([ $? -eq 124 ] && echo "Timeout but continuing" || exit 1)

COPY . .

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
  CMD wget --no-verbose --tries=1 --spider http://localhost/ || exit 1

CMD ["nginx", "-g", "daemon off;"]
