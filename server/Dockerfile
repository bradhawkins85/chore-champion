# Backend API Dockerfile
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./

RUN npm ci

COPY . .

RUN npm run build

# Production image
FROM node:20-alpine

# Install Docker CLI for update functionality
RUN apk add --no-cache docker-cli docker-compose

WORKDIR /app

COPY package*.json ./

RUN npm ci --only=production

COPY --from=builder /app/dist ./dist

# Note: Scripts are mounted via volume in docker-compose.yml

EXPOSE 3000

CMD ["node", "dist/index.js"]
