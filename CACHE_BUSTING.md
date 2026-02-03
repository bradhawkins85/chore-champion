# Cache Busting Implementation

This document describes the cache busting mechanism implemented to prevent old pages from loading after an upgrade.

## Overview

The application uses a version-based cache busting strategy that ensures users always see the latest version of the application after an upgrade.

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

### Building with a Version

Set the `VITE_APP_VERSION` environment variable during build:

```bash
VITE_APP_VERSION=1.2.3 npm run build
```

### Docker Deployment

The Dockerfile supports passing the version as a build argument:

```bash
docker build --build-arg VITE_APP_VERSION=1.2.3 -t chorequest .
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

To test cache busting:

1. Build version 1.0.0:
   ```bash
   VITE_APP_VERSION=1.0.0 npm run build
   npm run preview
   ```

2. Load the app in a browser and check cache names in DevTools

3. Build version 2.0.0:
   ```bash
   VITE_APP_VERSION=2.0.0 npm run build
   ```

4. Deploy and reload - you should be prompted to update

5. Check DevTools to see old caches removed and new caches created
