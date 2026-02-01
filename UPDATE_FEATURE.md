# Update Feature Documentation

## Overview

ChoreQuest includes a built-in update feature that allows administrators to check for and install the latest version directly from the Parent Dashboard, without needing SSH access or command-line tools.

> **⚠️ IMPORTANT - First-Time Setup Required**
>
> If you're seeing the error **"No releases found for this repository"** when checking for updates, you need to create the initial v1.0.0 release on GitHub first. This is a one-time setup.
>
> **→ See [RELEASE_SETUP.md](./RELEASE_SETUP.md) for step-by-step instructions.**

## Features

- **Check for Updates**: Query GitHub for the latest release version
- **Version Comparison**: Automatically compare current version with latest available
- **One-Click Update**: Trigger updates directly from the web interface
- **Automatic Backup**: Creates a backup before updating
- **Safe Rollback**: Backup available if update fails
- **Zero Downtime**: Minimal interruption during update process

## Requirements

For the update feature to work, your ChoreQuest deployment must:

1. **Run in Docker**: The update feature requires Docker containers
2. **Use Docker Compose**: Must be deployed using docker-compose.yml
3. **Mount Docker Socket**: The API container needs access to the Docker socket
4. **Mount Scripts Directory**: Update scripts must be accessible to the API container
5. **Have GitHub Releases**: At least one release must be published on GitHub ([setup guide](./RELEASE_SETUP.md))

These requirements are automatically met if you deployed using:
- `docker-compose.yml` (development)
- `docker-compose.prod.yml` (production)

## How to Use

### Accessing the Update Feature

1. Log into Parent Mode using your PIN
2. Navigate to the **Settings** tab
3. Scroll down to the **Software Updates** section

### Checking for Updates

1. Click the **Check for Updates** button
2. The system will query GitHub for the latest release
3. If a new version is available, you'll see:
   - Current version number
   - Latest available version
   - An **Update Now** button

### Installing Updates

1. After checking for updates, click **Update Now**
2. Confirm the update in the dialog box
3. The update process will:
   - Create a pre-update backup
   - Pull the latest Docker images
   - Recreate containers with new images
   - Clean up old images
4. The application will restart automatically
5. Refresh your browser to see the new version

**Note**: The update process typically takes 1-3 minutes depending on your internet connection and server performance.

## Technical Details

### How It Works

1. **Frontend Component** (`UpdateSettings.tsx`):
   - Displays current version
   - Fetches latest release from GitHub API
   - Provides UI for triggering updates

2. **Backend API Endpoint** (`/api/update`):
   - Validates Docker environment
   - Executes update script
   - Returns status to frontend

3. **Update Script** (`update-internal.sh`):
   - Runs inside the API container
   - Uses Docker socket to control host Docker
   - Detects deployment type (source-based or registry-based)
   - **For source-based deployments:**
     - Detects if the deployment is a git repository
     - Fetches latest changes from GitHub using `git fetch`
     - Resets to the latest version using `git reset --hard origin/<branch>`
     - Rebuilds Docker images with updated code
     - Recreates containers
   - **For registry-based deployments:**
     - Pulls latest images from container registry (ghcr.io)
     - Recreates containers
   - Cleans up old images

### Deployment Types

#### Source-Based Deployment (Recommended)
This is the default deployment method where you clone the repository and run docker-compose:
```bash
git clone https://github.com/bradhawkins85/chore-champion.git
cd chore-champion
docker-compose -f docker-compose.prod.yml up -d
```

With source-based deployment, the "Update Now" button will:
1. Detect the current git branch
2. Fetch the latest code from GitHub using `git fetch origin`
3. Reset to the latest version using `git reset --hard origin/<branch>`
4. Rebuild images with the new code
5. Restart containers

This approach is more reliable than `git pull` as it doesn't require merge operations or worry about local changes.

#### Registry-Based Deployment
This method pulls pre-built images from GitHub Container Registry:
```bash
# Set in .env file:
DOCKER_IMAGE=ghcr.io/bradhawkins85/chorequest:latest
# Note: API image is still built from source
```

With registry-based deployment, the "Update Now" button will:
1. Pull the latest images from the registry
2. Restart containers

**Note:** Currently, only the main application image is published to the registry. The API is built from source in both deployment types.

### Configuration

The update feature requires these Docker Compose configurations:

```yaml
api:
  volumes:
    - /var/run/docker.sock:/var/run/docker.sock:ro  # Docker socket access (read-only)
    - /usr/bin/docker:/usr/bin/docker:ro              # Docker CLI binary (read-only)
    - ./scripts:/app/scripts:ro                       # Update scripts (read-only)
```

These are already configured in the default docker-compose files.

**Security Note**: All mounts are configured as read-only (:ro) to minimize security risks.

### Version Management

- Current version is defined in `src/components/UpdateSettings.tsx`
- Latest version is fetched from GitHub releases
- Version comparison is done by tag name (e.g., `v1.0.0`, `v1.1.0`)

### Security Considerations

1. **Docker Socket Access**: The API container has read-only access to the Docker socket
2. **Docker Binary**: The Docker binary is mounted read-only from the host
3. **Script Permissions**: Update scripts are mounted read-only
4. **Parent Mode Only**: Updates can only be triggered from Parent Mode (PIN protected)
5. **Automatic Backups**: A backup is created before each update
6. **Path Validation**: Server validates script paths to prevent command injection
7. **Version Validation**: Semantic version comparison prevents incorrect version detection

## Troubleshooting

### "No releases found for this repository" ⚠️

**This is the most common error for first-time users.**

The update checker cannot find any releases on GitHub because none have been published yet. This is expected for new installations.

**Solution**: Create the initial v1.0.0 release on GitHub. This is a one-time setup:

1. **Quick Fix**: See [RELEASE_SETUP.md](./RELEASE_SETUP.md) for detailed step-by-step instructions
2. **Summary**: Go to https://github.com/bradhawkins85/chore-champion/releases and create a new release with tag `v1.0.0`
3. **Verification**: After creating the release, the update checker will work immediately

### "Update is only available when running in Docker"

This message appears if ChoreQuest is not running in a Docker container. The update feature requires Docker.

**Solution**: Deploy ChoreQuest using Docker Compose as described in the README.

### "Update script not found"

The API container cannot find the update script.

**Solution**: 
1. Ensure the `scripts` directory is mounted in docker-compose.yml:
   ```yaml
   volumes:
     - ./scripts:/app/scripts:ro
   ```
2. Check that `update-internal.sh` exists and is executable:
   ```bash
   ls -la scripts/update-internal.sh
   chmod +x scripts/update-internal.sh
   ```
3. Restart the API container: `docker-compose restart api`

### "Update script is not executable"

The update script exists but doesn't have execute permissions.

**Solution**:
```bash
chmod +x scripts/update-internal.sh
docker-compose restart api
```

### "Failed to trigger update"

General error when the update process cannot start.

**Solution**:
1. Check Docker logs: `docker-compose logs api`
2. Verify Docker socket is mounted: `docker exec chorequest-api ls -la /var/run/docker.sock`
3. Ensure Docker client is installed in API container
4. Check permissions on the Docker socket

### Update fails or containers don't restart

The update script encountered an error.

**Solution**:
1. Check update logs: `docker exec chorequest-api cat /tmp/update.log`
2. Manually run the update: `make update` or `./scripts/update.sh`
3. Restore from backup if needed: `make restore BACKUP=filename.tar.gz`

### "Git fetch failed" or "Failed to pull images from registry"

The update script couldn't fetch the latest code or images.

**For source-based deployments:**
1. Ensure your deployment directory is a git repository with a remote configured
2. Check git remote: `git remote -v` (should show GitHub repository)
3. The update script uses `git fetch` and `git reset --hard`, which doesn't require authentication for public repositories
4. If you see "Failed to reset" errors, ensure there are no file permission issues in your deployment directory
5. Alternatively, manually update and rebuild:
   ```bash
   cd /path/to/chore-champion
   git fetch origin
   git reset --hard origin/main  # or your branch name
   docker-compose -f docker-compose.prod.yml build --pull
   docker-compose -f docker-compose.prod.yml up -d --force-recreate
   ```

**For registry-based deployments:**
1. Verify the image exists in the registry
2. Check your DOCKER_IMAGE environment variable in .env
3. Ensure you have network access to ghcr.io

### Application doesn't load after update

Browser may be caching old version.

**Solution**:
1. Hard refresh your browser: Ctrl+F5 (Windows/Linux) or Cmd+Shift+R (Mac)
2. Clear browser cache
3. Try incognito/private browsing mode

## Manual Update (Alternative Method)

If the automatic update feature is not available or fails, you can update manually:

### Using Make (Recommended)

```bash
make update
```

### Using Shell Script

```bash
./scripts/update.sh
```

### Using Docker Compose Directly

```bash
# Create backup
docker exec chorequest-backup /scripts/backup.sh

# Pull latest images
docker-compose -f docker-compose.prod.yml pull

# Recreate containers
docker-compose -f docker-compose.prod.yml up -d --force-recreate

# Clean up
docker image prune -f
```

## Backup and Rollback

### Automatic Backups

- A backup is automatically created before each update
- Backups are stored in the `backups` directory
- Backups are timestamped (e.g., `chorequest_backup_20240101_020000.tar.gz`)

### Manual Backup

```bash
make backup
```

### Restore from Backup

```bash
make restore BACKUP=chorequest_backup_20240101_020000.tar.gz
```

## Future Enhancements

Potential improvements for the update feature:

- [ ] Automatic update scheduling
- [ ] Release notes display in UI
- [ ] Update rollback from UI
- [ ] Beta/stable channel selection
- [ ] Update notifications
- [ ] Changelog viewer
- [ ] Pre-update compatibility check

## Support

For issues with the update feature:

1. Check this documentation
2. Review Docker and API logs
3. Open an issue on GitHub with:
   - Current version
   - Error messages
   - Docker logs
   - Steps to reproduce

---

**Last Updated**: January 2026
**Minimum Version**: 1.0.0
