# Backend API Dockerfile
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./

RUN npm ci

COPY . .

RUN npm run build

# Production image
FROM node:20-alpine

WORKDIR /app

COPY package*.json ./

RUN npm ci --only=production

COPY --from=builder /app/dist ./dist

# Note: Scripts are mounted via volume in docker-compose.yml
# Note: For the update feature to work, the container needs:
#   1. Docker socket mounted: -v /var/run/docker.sock:/var/run/docker.sock
#   2. Docker CLI installed in the host or mounted
#   3. Scripts directory mounted: -v ./scripts:/app/scripts

EXPOSE 3000

CMD ["node", "dist/index.js"]
