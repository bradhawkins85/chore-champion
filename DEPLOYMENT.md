# ChoreQuest Deployment Guide

This guide covers various deployment options for ChoreQuest, from Docker containers to static hosting platforms.

## Table of Contents

- [Docker Deployment](#docker-deployment)
- [CI/CD Pipeline](#cicd-pipeline)
- [Static Hosting](#static-hosting)
- [Environment Variables](#environment-variables)
- [Monitoring](#monitoring)

## Docker Deployment

### Prerequisites

- Docker 20.10+
- Docker Compose 2.0+
- 512MB RAM minimum
- 100MB disk space

### Quick Start with Docker

```bash
# Build and start the application
docker-compose up -d

# Access the application
open http://localhost:8080
```

### Manual Docker Build

```bash
# Build the image
docker build -t chorequest:latest .

# Run the container
docker run -d \
  --name chorequest \
  -p 8080:80 \
  --restart unless-stopped \
  chorequest:latest
```

### Using Pre-built Images

```bash
# Pull from GitHub Container Registry
docker pull ghcr.io/OWNER/chorequest:latest

# Run the container
docker run -d \
  --name chorequest \
  -p 8080:80 \
  ghcr.io/OWNER/chorequest:latest
```

### Docker Compose Configuration

The `docker-compose.yml` file includes:
- Automatic container restart
- Health checks every 30 seconds
- Port mapping (8080:80)
- Network isolation

### Deployment Script

Use the included deployment script for common tasks:

```bash
# Make script executable
chmod +x scripts/deploy.sh

# Build application
./scripts/deploy.sh build

# Build Docker image
./scripts/deploy.sh docker

# Start application
./scripts/deploy.sh start

# View logs
./scripts/deploy.sh logs

# Stop application
./scripts/deploy.sh stop

# Restart application
./scripts/deploy.sh restart

# Clean up
./scripts/deploy.sh clean
```

## CI/CD Pipeline

ChoreQuest includes GitHub Actions workflows for automated building, testing, and deployment.

### Workflows

#### Main CI/CD Pipeline (`.github/workflows/ci-cd.yml`)

Triggered on:
- Push to `main` or `develop` branches
- Pull requests to `main`
- Manual workflow dispatch

Jobs:
1. **Test & Lint** - Runs linting and type checking
2. **Build** - Builds the application and uploads artifacts
3. **Docker Build** - Builds and pushes Docker images to GHCR
4. **Deploy Preview** - Deploys PR previews
5. **Deploy Production** - Deploys to production (main branch only)
6. **Security Scan** - Scans Docker images for vulnerabilities

#### Release Pipeline (`.github/workflows/docker-release.yml`)

Triggered on:
- New release publication
- Manual workflow dispatch

Builds multi-architecture Docker images (amd64, arm64, arm/v7) and pushes to:
- GitHub Container Registry (GHCR)
- Docker Hub (if credentials configured)

### Setting Up GitHub Actions

1. **Enable GitHub Container Registry**:
   - Go to repository Settings → Actions → General
   - Enable "Read and write permissions" for GITHUB_TOKEN

2. **Configure Docker Hub** (Optional but Recommended):
   
   Docker Hub publishing requires two repository secrets:
   - `DOCKERHUB_USERNAME` - Your Docker Hub username
   - `DOCKERHUB_TOKEN` - Docker Hub access token
   
   **Quick Setup:**
   ```bash
   # 1. Create access token at hub.docker.com
   # 2. Add secrets in repository Settings → Secrets and variables → Actions
   ```
   
   **Detailed Instructions:**
   - See [GITHUB_SECRETS_SETUP.md](./GITHUB_SECRETS_SETUP.md) for complete step-by-step guide
   - See [SECRETS_QUICK_REFERENCE.md](./SECRETS_QUICK_REFERENCE.md) for quick reference
   
   **Note:** If Docker Hub secrets are not configured, the workflow will still work and push images to GitHub Container Registry only.

3. **Configure Deployment** (optional):
   - Add deployment credentials as secrets
   - Update deployment steps in workflows

### Accessing Built Images

Images are available at:
```
ghcr.io/OWNER/chorequest:latest
ghcr.io/OWNER/chorequest:main-SHA
ghcr.io/OWNER/chorequest:VERSION
```

## Static Hosting

ChoreQuest is a static single-page application (SPA) that can be hosted on any static hosting platform.

### Vercel

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel --prod
```

Or connect your GitHub repository in the Vercel dashboard for automatic deployments.

### Netlify

```bash
# Install Netlify CLI
npm i -g netlify-cli

# Build and deploy
npm run build
netlify deploy --prod --dir=dist
```

Or create a `netlify.toml`:

```toml
[build]
  command = "npm run build"
  publish = "dist"

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
```

### GitHub Pages

1. Enable GitHub Pages in repository settings
2. Use the GitHub Actions workflow:

```yaml
# .github/workflows/pages.yml
name: Deploy to GitHub Pages

on:
  push:
    branches: [ main ]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - run: npm ci
      - run: npm run build
      - uses: peaceiris/actions-gh-pages@v3
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          publish_dir: ./dist
```

### Cloudflare Pages

1. Connect repository in Cloudflare Pages dashboard
2. Build settings:
   - Build command: `npm run build`
   - Build output directory: `dist`

### AWS S3 + CloudFront

```bash
# Build the application
npm run build

# Sync to S3
aws s3 sync dist/ s3://your-bucket-name/ --delete

# Invalidate CloudFront cache
aws cloudfront create-invalidation \
  --distribution-id YOUR_DIST_ID \
  --paths "/*"
```

## Environment Variables

ChoreQuest runs entirely in the browser and doesn't require server-side environment variables. All configuration is stored in the browser using the Spark KV API.

For build-time configuration, you can create a `.env` file:

```bash
# .env
VITE_APP_NAME=ChoreQuest
VITE_APP_VERSION=1.0.0
```

Access in code:
```typescript
import.meta.env.VITE_APP_NAME
```

## Production Considerations

### Performance

- Enable compression (gzip/brotli) on your web server
- Set appropriate cache headers for static assets
- Use a CDN for global distribution
- Enable HTTP/2 or HTTP/3

### Security

The included nginx configuration provides:
- Security headers (X-Frame-Options, CSP, etc.)
- HTTPS redirection (configure in your reverse proxy)
- Content type protection

For production:
1. Always use HTTPS
2. Configure proper CORS if needed
3. Implement rate limiting at reverse proxy level
4. Regular security updates for base images

### Monitoring

Health check endpoint: `http://localhost:8080/health`

Monitor:
- Container health status
- HTTP response codes
- Resource usage (CPU, memory)
- Storage usage for persistent volumes

Example with Docker:
```bash
# Check health status
docker inspect --format='{{.State.Health.Status}}' chorequest

# View resource usage
docker stats chorequest
```

## Troubleshooting

### Container won't start

```bash
# Check logs
docker logs chorequest

# Verify port availability
lsof -i :8080
```

### Build failures

```bash
# Clear cache and rebuild
npm clean-install
npm run build

# Docker build with no cache
docker build --no-cache -t chorequest:latest .
```

### Permission issues

```bash
# Fix file permissions
chmod +x scripts/deploy.sh

# Docker permissions
sudo usermod -aG docker $USER
```

## Support

For issues and questions:
- GitHub Issues: [Repository Issues]
- Documentation: [README.md](./README.md)
