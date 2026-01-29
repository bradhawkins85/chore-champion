# Multi-stage build for ChoreQuest
# Stage 1: Build the application  
FROM node:lts-bookworm-slim AS builder

WORKDIR /app

COPY package*.json ./

# Workaround for npm install issues in Docker environments
# Set npm to use legacy peer deps and disable strict SSL if needed
RUN npm config set strict-ssl false && \
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
