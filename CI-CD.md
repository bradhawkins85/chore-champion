# ChoreQuest CI/CD Configuration Guide

This document explains the CI/CD pipeline setup for ChoreQuest.

## Overview

ChoreQuest uses GitHub Actions for continuous integration and deployment:

1. **Main Pipeline** (`ci-cd.yml`) - Runs on every push/PR
2. **Release Pipeline** (`docker-release.yml`) - Runs on tagged releases
3. **Docker Multi-arch** - Builds for amd64, arm64, and arm/v7

## Pipeline Stages

### 1. Test & Lint
- ESLint code quality checks
- TypeScript type checking
- Unit tests (if configured)
- Runs on all branches

### 2. Build
- Installs dependencies with `npm ci`
- Builds production bundle
- Uploads artifacts for deployment
- Validates build integrity

### 3. Docker Build & Push
- Multi-stage Docker build
- Pushes to GitHub Container Registry (GHCR)
- Tags: `latest`, `main-SHA`, `develop-SHA`
- Only on main/develop branches

### 4. Security Scan
- Trivy vulnerability scanning
- SARIF report upload to GitHub Security
- Automatic security alerts
- Only on main branch

### 5. Deploy
- Preview deployments for PRs
- Production deployment on main
- Configurable deployment targets

## Setup Instructions

### 1. Enable GitHub Container Registry

1. Go to repository **Settings** → **Actions** → **General**
2. Under "Workflow permissions", select:
   - ✅ Read and write permissions
   - ✅ Allow GitHub Actions to create and approve pull requests
3. Save changes

### 2. Access Docker Images

Images are published to:
```
ghcr.io/YOUR_USERNAME/chorequest:latest
ghcr.io/YOUR_USERNAME/chorequest:main-SHA
ghcr.io/YOUR_USERNAME/chorequest:v1.0.0
```

Pull images:
```bash
# Latest version
docker pull ghcr.io/YOUR_USERNAME/chorequest:latest

# Specific commit
docker pull ghcr.io/YOUR_USERNAME/chorequest:main-abc1234

# Specific version
docker pull ghcr.io/YOUR_USERNAME/chorequest:v1.0.0
```

### 3. Configure Docker Hub (Optional)

To publish images to Docker Hub in addition to GitHub Container Registry:

#### Quick Setup

1. **Create Docker Hub Access Token:**
   - Go to [hub.docker.com/settings/security](https://hub.docker.com/settings/security)
   - Click "New Access Token"
   - Description: "ChoreQuest CI/CD"
   - Permissions: Read, Write, Delete
   - Copy the token

2. **Add Secrets to GitHub:**
   - Go to repository Settings → Secrets and variables → Actions
   - Click "New repository secret"
   - Add:
     - Name: `DOCKERHUB_USERNAME`, Value: your-dockerhub-username
     - Name: `DOCKERHUB_TOKEN`, Value: paste-the-token

#### Detailed Instructions

For complete step-by-step instructions with screenshots and troubleshooting:
- **📖 Full Guide:** [GITHUB_SECRETS_SETUP.md](./GITHUB_SECRETS_SETUP.md)
- **⚡ Quick Reference:** [SECRETS_QUICK_REFERENCE.md](./SECRETS_QUICK_REFERENCE.md)

#### What Happens

- ✅ **With secrets configured:** Images pushed to both GHCR and Docker Hub
- ✅ **Without secrets:** Images pushed to GHCR only (still works perfectly!)

Images will be published to:
```bash
# GitHub Container Registry (always)
ghcr.io/YOUR_USERNAME/chorequest:latest

# Docker Hub (if secrets configured)
docker.io/YOUR_USERNAME/chorequest:latest
```

### 4. Configure Deployment Target

Edit `.github/workflows/ci-cd.yml` to add your deployment:

#### Vercel
```yaml
- name: Deploy to Vercel
  run: |
    npm i -g vercel
    vercel --token ${{ secrets.VERCEL_TOKEN }} --prod
```

Add `VERCEL_TOKEN` secret to repository.

#### Netlify
```yaml
- name: Deploy to Netlify
  run: |
    npm i -g netlify-cli
    netlify deploy --prod --dir=dist --auth ${{ secrets.NETLIFY_AUTH_TOKEN }}
```

Add `NETLIFY_AUTH_TOKEN` secret to repository.

#### AWS S3
```yaml
- name: Deploy to S3
  uses: aws-actions/configure-aws-credentials@v4
  with:
    aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
    aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
    aws-region: us-east-1

- name: Sync to S3
  run: |
    aws s3 sync dist/ s3://your-bucket-name/ --delete
```

Add AWS secrets to repository.

## Workflow Triggers

### Automatic Triggers
- **Push** to `main` or `develop` branches
- **Pull Request** to `main` branch
- **Release** publication (tags)

### Manual Triggers
Run workflows manually from GitHub Actions tab:
1. Go to **Actions** tab
2. Select workflow
3. Click **Run workflow**
4. Choose branch

## Build Optimization

### Cache Strategy
The pipeline uses GitHub Actions cache to speed up builds:
- npm dependencies cached
- Docker layer caching with BuildKit
- Reduces build time by 50-70%

### Multi-Architecture Builds
Builds for multiple platforms simultaneously:
- `linux/amd64` - Standard x86_64 servers
- `linux/arm64` - ARM servers (AWS Graviton, etc.)
- `linux/arm/v7` - Raspberry Pi and similar

## Security Features

### Vulnerability Scanning
Trivy scans Docker images for:
- OS package vulnerabilities
- Language-specific vulnerabilities
- Misconfigurations
- Exposed secrets

Results appear in:
- GitHub Security tab
- Pull request checks
- Email notifications (if configured)

### Security Best Practices
- Images run as non-root user
- Multi-stage builds minimize attack surface
- Health checks for container monitoring
- Security headers in nginx config

## Monitoring & Logs

### View Build Logs
1. Go to **Actions** tab
2. Click on workflow run
3. Click on job to view logs

### Container Logs
```bash
# Docker Compose
docker-compose logs -f

# Docker
docker logs -f chorequest

# Last 100 lines
docker logs --tail 100 chorequest
```

### Health Checks
```bash
# Check container health
docker inspect --format='{{.State.Health.Status}}' chorequest

# Direct health endpoint
curl http://localhost:8080/health
```

## Troubleshooting

### Build Fails on GitHub Actions

**Problem:** npm install fails
```yaml
# Solution: Clear cache and retry
- name: Clear npm cache
  run: npm cache clean --force
```

**Problem:** Docker build fails
```yaml
# Solution: Build without cache
- name: Build without cache
  run: docker build --no-cache -t chorequest:latest .
```

### Images Not Pushing to Registry

**Problem:** Permission denied
- Check workflow permissions in Settings
- Verify GITHUB_TOKEN has write access

**Problem:** Rate limited
- Use cache to reduce pushes
- Schedule builds during off-peak hours

### Security Scan Failures

**Problem:** Critical vulnerabilities found
- Update base image in Dockerfile
- Update npm dependencies
- Review Trivy report in Security tab

## Performance Tips

1. **Enable Dependency Caching**
   - Already configured in workflows
   - Reduces install time by 60%

2. **Parallel Jobs**
   - Tests and builds run in parallel
   - Saves 2-3 minutes per run

3. **Conditional Deployments**
   - Only deploy on main branch
   - Skip unnecessary steps on PRs

4. **BuildKit Caching**
   - Docker layers cached between runs
   - Faster subsequent builds

## Custom Workflows

### Add New Workflow

Create `.github/workflows/custom.yml`:

```yaml
name: Custom Workflow

on:
  workflow_dispatch:
  schedule:
    - cron: '0 2 * * *'  # Daily at 2am

jobs:
  custom:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Custom task
        run: echo "Custom task here"
```

### Add Pre-deploy Tests

In `ci-cd.yml`, add before deploy:

```yaml
- name: Integration Tests
  run: npm run test:e2e

- name: Lighthouse CI
  uses: treosh/lighthouse-ci-action@v10
  with:
    urls: 'http://localhost:8080'
```

## Status Badges

Add to README.md:

```markdown
![CI/CD](https://github.com/USERNAME/chorequest/actions/workflows/ci-cd.yml/badge.svg)
![Docker](https://github.com/USERNAME/chorequest/actions/workflows/docker-release.yml/badge.svg)
![Security](https://github.com/USERNAME/chorequest/actions/workflows/security.yml/badge.svg)
```

## Release Process

### Creating a Release

1. **Tag the version:**
   ```bash
   git tag -a v1.0.0 -m "Release version 1.0.0"
   git push origin v1.0.0
   ```

2. **Create GitHub Release:**
   - Go to **Releases** tab
   - Click **Draft a new release**
   - Select your tag
   - Add release notes
   - Publish release

3. **Automatic builds:**
   - Docker images built automatically
   - Tagged with version number
   - Published to registries

### Version Naming
- `v1.0.0` - Major release
- `v1.1.0` - Feature addition
- `v1.1.1` - Bug fix
- `v2.0.0-beta.1` - Pre-release

## Support

For issues with CI/CD:
1. Check workflow logs
2. Review documentation
3. Open GitHub issue with:
   - Workflow name
   - Error message
   - Run ID
