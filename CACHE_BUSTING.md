# Cache Busting Implementation

This document describes the cache busting mechanism implemented to prevent old pages from loading after an upgrade.

## Overview

The application uses a version-based cache busting strategy that ensures users always see the latest version of the application after an upgrade.

## Version Management

The application version is managed through a cascading system:

1. **Environment Variable** (`VITE_APP_VERSION`): Highest priority - explicitly set during build
2. **package.json**: Fallback - automatically read if env var is not set
3. **Default**: "1.0.0" - used if both above fail

### Automatic Version from GitHub Releases

When creating a GitHub release (e.g., `v1.2.3`):
- The `docker-release.yml` workflow extracts the tag version
- Passes it as `VITE_APP_VERSION` build argument to Docker
- Docker build uses this version to generate `version.json`
- Service worker and PWA cache are versioned accordingly

### Local Development

For local builds, the version is automatically read from `package.json`:

```bash
# Uses version from package.json (currently 1.0.0)
npm run build

# Override with specific version
VITE_APP_VERSION=1.2.3 npm run build
```

### Updating the Version

To update the application version:

1. **For releases**: Update `package.json` version, commit, and create a GitHub release with matching tag
2. **For dev builds**: Version from `package.json` is used automatically
3. **For Docker builds**: Pass `--build-arg VITE_APP_VERSION=x.y.z`

## How It Works

### 1. Version File Generation

During build time, a `version.json` file is automatically generated in the `dist` folder containing:
- `version`: The app version from `VITE_APP_VERSION` environment variable (defaults to "1.0.0")
- `buildTime`: ISO timestamp of when the build was created

This is handled by a custom Vite plugin in `vite.config.ts`.

### 2. Dynamic Service Worker Cache Names

The service worker (`public/service-worker.js`) dynamically loads the version from `version.json` and uses it to create version-specific cache names:
- Main cache: `chorequest-{version}` (e.g., `chorequest-1-2-3`)
- Runtime cache: `chorequest-runtime-{version}`

When a new version is deployed:
1. The service worker fetches `/version.json` during installation
2. Cache names are updated with the new version
3. Old caches are automatically deleted during the activation phase

### 3. Client-Side Version Checking

The PWA helper (`src/lib/pwaHelper.ts`) periodically checks for version updates:
- On app initialization, it checks the current version
- Every 5 minutes, it checks if a new version is available
- If a new version is detected, it prompts the user to reload
- Upon confirmation, all caches are cleared and the page reloads

### 4. Service Worker Update Detection

When a new service worker is available:
- The user is prompted to reload and update
- The new service worker is activated immediately
- The page reloads to load the latest version

## Usage

### Version Management Priority

The version is determined in the following order:
1. `VITE_APP_VERSION` environment variable (if set)
2. Version from `package.json` (automatic fallback)
3. Default "1.0.0" (if both fail)

### Building with a Version

**Automatic (recommended):**
```bash
# Update package.json version first
npm version 1.2.3
npm run build
```

**Manual override:**
```bash
VITE_APP_VERSION=1.2.3 npm run build
```

### GitHub Release Workflow

When you create a new release on GitHub:
1. Create a release with a tag like `v1.2.3`
2. The `docker-release.yml` workflow automatically:
   - Extracts version from the tag
   - Builds Docker image with `VITE_APP_VERSION=1.2.3`
   - Publishes to GitHub Container Registry and Docker Hub
   - Tags images as both `1.2.3` and `latest`

### Docker Deployment

**Using GitHub Container Registry (automatic versioning):**
```bash
# Pull latest release
docker pull ghcr.io/bradhawkins85/chorequest:latest

# Or specific version
docker pull ghcr.io/bradhawkins85/chorequest:v1.2.3
```

**Building locally with specific version:**
```bash
docker build --build-arg VITE_APP_VERSION=1.2.3 -t chorequest .
```

**Building locally (uses package.json):**
```bash
docker build -t chorequest .
```

### Automatic Cache Cleanup

When users visit the site after an upgrade:
1. The service worker detects the version mismatch
2. Old caches are automatically deleted
3. New content is cached with the new version
4. Users are prompted to reload if they're on an old version

## Benefits

- **No stale content**: Users always see the latest version after refresh
- **Automatic cleanup**: Old caches don't accumulate on user devices
- **Progressive enhancement**: Falls back to default versioning if version.json is unavailable
- **User-friendly**: Clear prompts guide users through updates
- **Docker-compatible**: Works seamlessly with containerized deployments

## Testing

To test version management and cache busting:

### Test 1: Default version from package.json
```bash
npm run build
cat dist/version.json
# Should show: {"version": "1.0.0", "buildTime": "..."}
```

### Test 2: Override with environment variable
```bash
VITE_APP_VERSION=2.0.0 npm run build
cat dist/version.json
# Should show: {"version": "2.0.0", "buildTime": "..."}
```

### Test 3: Docker build with version
```bash
docker build --build-arg VITE_APP_VERSION=3.0.0 -t chorequest:test .
# Version should be embedded in the built image
```

### Test 4: Cache busting in browser
1. Build and run version 1.0.0
2. Open browser DevTools > Application > Cache Storage
3. Note cache names: `chorequest-1-0-0`, `chorequest-runtime-1-0-0`
4. Build and deploy version 2.0.0
5. Reload page - should be prompted to update
6. Check cache names: old caches deleted, new ones created with `2-0-0`
