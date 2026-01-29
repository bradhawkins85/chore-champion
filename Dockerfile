# Multi-stage build for ChoreQuest
# Stage 1: Build the application
FROM node:22-bookworm-slim AS builder

WORKDIR /app

# Build argument to disable SSL verification if needed for corporate proxies
# Set to "true" during build if encountering SSL certificate issues
ARG DISABLE_SSL_VERIFY=false

COPY package*.json ./

# Install dependencies
# Note: Using npm install with --legacy-peer-deps due to peer dependency conflicts
# npm ci is preferred but may have issues with npm 10.x in some Docker environments
RUN if [ "$DISABLE_SSL_VERIFY" = "true" ]; then npm config set strict-ssl false; fi && \
    npm install --legacy-peer-deps

COPY . .

RUN npm run build

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
