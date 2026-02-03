# Version Management Guide

This guide explains how application versioning works in ChoreQuest and how to properly manage versions for releases.

## Overview

ChoreQuest uses a cascading version system that automatically manages versions from multiple sources:

1. **VITE_APP_VERSION** environment variable (highest priority)
2. **package.json** version field (automatic fallback)
3. **Default "1.0.0"** (last resort fallback)

## Quick Start

### For Regular Development
Just update `package.json` and build - the version is automatically used:

```bash
# Update version in package.json
npm version patch  # 1.0.0 -> 1.0.1
npm version minor  # 1.0.1 -> 1.1.0
npm version major  # 1.1.0 -> 2.0.0

# Build (automatically uses package.json version)
npm run build

# Check the generated version
cat dist/version.json
```

### For GitHub Releases
1. Update `package.json` version
2. Commit and push changes
3. Create a GitHub release with a tag matching the version (e.g., `v1.2.3`)
4. GitHub Actions automatically builds and publishes Docker images with the correct version

## Version Flow

### Local Development
```
package.json (version: 1.0.0)
    ↓
vite.config.ts reads package.json
    ↓
version.json generated with "1.0.0"
    ↓
Service worker uses "chorequest-1-0-0" cache
```

### GitHub Release (e.g., v1.2.3)
```
GitHub Release Tag: v1.2.3
    ↓
docker-release.yml extracts "v1.2.3"
    ↓
Docker build with VITE_APP_VERSION=v1.2.3
    ↓
vite.config.ts uses env var "v1.2.3"
    ↓
version.json generated with "v1.2.3"
    ↓
Service worker uses "chorequest-v1-2-3" cache
    ↓
Docker images tagged: v1.2.3 and latest
```

### Docker Build (Manual)
```bash
# Option 1: Use package.json version
docker build -t chorequest:latest .

# Option 2: Override with build arg
docker build --build-arg VITE_APP_VERSION=1.5.0 -t chorequest:1.5.0 .
```

## GitHub Actions Workflows

### docker-release.yml (Production Releases)
Triggered by: Creating a GitHub release

What it does:
- Extracts version from release tag (e.g., `v1.2.3` → `1.2.3`)
- Builds Docker images for multiple platforms (amd64, arm64, arm/v7)
- Passes `VITE_APP_VERSION` as build argument
- Publishes to GitHub Container Registry
- Publishes to Docker Hub (if credentials configured)
- Tags images as both version (`1.2.3`) and `latest`

### ci-cd.yml (Continuous Integration)
Triggered by: Pushes to main or develop branches

What it does:
- Reads version from `package.json`
- Builds Docker images with that version
- Tags images with branch name and SHA

## Best Practices

### Versioning Strategy

Follow semantic versioning (MAJOR.MINOR.PATCH):

- **MAJOR**: Breaking changes (e.g., 1.0.0 → 2.0.0)
- **MINOR**: New features, backwards compatible (e.g., 1.0.0 → 1.1.0)
- **PATCH**: Bug fixes, backwards compatible (e.g., 1.0.0 → 1.0.1)

### Release Process

1. **Update version in package.json:**
   ```bash
   npm version patch  # or minor, or major
   ```

2. **Commit and push:**
   ```bash
   git push origin main
   git push origin --tags
   ```

3. **Create GitHub release:**
   - Go to GitHub repository → Releases → New release
   - Choose the tag that was just pushed
   - Fill in release notes
   - Publish release

4. **Wait for automation:**
   - GitHub Actions builds Docker images automatically
   - Images are published to registries
   - Check Actions tab for progress

### Version Verification

After deployment, verify the version:

```bash
# Check version in Docker image
docker run --rm chorequest:latest cat /usr/share/nginx/html/version.json

# Check version on running instance
curl https://your-domain.com/version.json

# Check in browser
# Open DevTools → Application → Service Workers
# Check cache names should include version
```

## Troubleshooting

### Version not updating after release

**Problem**: Built version still shows old version despite new release

**Solutions**:
1. Check that GitHub Actions workflow completed successfully
2. Verify `VITE_APP_VERSION` was passed in workflow logs
3. Pull latest Docker image: `docker pull ghcr.io/bradhawkins85/chorequest:latest`
4. If using cached images, use `--pull always` flag

### Service worker not updating

**Problem**: Users still seeing old cached content

**Solutions**:
1. Verify `version.json` has new version: `curl https://your-domain.com/version.json`
2. Clear browser cache and hard reload (Ctrl+Shift+R / Cmd+Shift+R)
3. Check service worker in DevTools → Application → Service Workers
4. Users should be prompted to reload when version changes

### Docker build fails with version error

**Problem**: Build fails when passing `VITE_APP_VERSION`

**Solutions**:
1. Ensure version format is valid (no spaces, special chars except dots and dashes)
2. Check Dockerfile has `ARG VITE_APP_VERSION=1.0.0` line
3. Verify build argument syntax: `--build-arg VITE_APP_VERSION=1.2.3`

## Examples

### Example 1: Patch Release (Bug Fix)

```bash
# Current version: 1.0.0
npm version patch
# New version: 1.0.1

git push origin main --tags

# Create GitHub release with tag v1.0.1
# GitHub Actions builds and publishes automatically
```

### Example 2: Minor Release (New Feature)

```bash
# Current version: 1.0.1
npm version minor
# New version: 1.1.0

git push origin main --tags

# Create GitHub release with tag v1.1.0
```

### Example 3: Major Release (Breaking Changes)

```bash
# Current version: 1.1.0
npm version major
# New version: 2.0.0

git push origin main --tags

# Create GitHub release with tag v2.0.0
# Include migration guide in release notes
```

### Example 4: Manual Docker Build

```bash
# Build specific version locally
docker build --build-arg VITE_APP_VERSION=1.2.3 -t chorequest:1.2.3 .

# Verify version in built image
docker run --rm chorequest:1.2.3 cat /usr/share/nginx/html/version.json
```

## Technical Details

### vite.config.ts Implementation

The version resolution logic in `vite.config.ts`:

```typescript
const getAppVersion = (): string => {
  // 1. Check environment variable (highest priority)
  if (process.env.VITE_APP_VERSION) {
    return process.env.VITE_APP_VERSION;
  }
  
  // 2. Read from package.json (automatic fallback)
  try {
    const packageJson = JSON.parse(readFileSync('package.json', 'utf-8'));
    return packageJson.version || '1.0.0';
  } catch (error) {
    // 3. Default fallback
    return '1.0.0';
  }
};
```

### Generated version.json

The build generates a `version.json` file:

```json
{
  "version": "1.2.3",
  "buildTime": "2026-02-03T05:45:34.101Z"
}
```

This file is:
- Fetched by service worker at install time
- Used to create version-specific cache names
- Checked periodically by PWA for updates
- Publicly accessible at `/version.json`

## Related Documentation

- [CACHE_BUSTING.md](./CACHE_BUSTING.md) - Cache busting mechanism details
- [DEPLOYMENT.md](./DEPLOYMENT.md) - Deployment instructions
- [CI-CD.md](./CI-CD.md) - CI/CD pipeline documentation
