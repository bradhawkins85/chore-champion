# Update Feature Documentation

## Overview

ChoreQuest includes a built-in update feature that allows administrators to check for and install the latest version directly from the Parent Dashboard, without needing SSH access or command-line tools.

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
   - Pulls latest images
   - Recreates containers
   - Cleans up old images

### Configuration

The update feature requires these Docker Compose configurations:

```yaml
api:
  volumes:
    - /var/run/docker.sock:/var/run/docker.sock:ro  # Docker socket access
    - ./scripts:/app/scripts:ro                      # Update scripts
```

These are already configured in the default docker-compose files.

### Version Management

- Current version is defined in `src/components/UpdateSettings.tsx`
- Latest version is fetched from GitHub releases
- Version comparison is done by tag name (e.g., `v1.0.0`, `v1.1.0`)

### Security Considerations

1. **Docker Socket Access**: The API container has read-only access to the Docker socket
2. **Script Permissions**: Update scripts are mounted read-only
3. **Parent Mode Only**: Updates can only be triggered from Parent Mode (PIN protected)
4. **Automatic Backups**: A backup is created before each update

## Troubleshooting

### "Update is only available when running in Docker"

This message appears if ChoreQuest is not running in a Docker container. The update feature requires Docker.

**Solution**: Deploy ChoreQuest using Docker Compose as described in the README.

### "Update script not found"

The API container cannot find the update script.

**Solution**: 
1. Ensure the `scripts` directory is mounted in docker-compose.yml
2. Check that `update-internal.sh` exists and is executable
3. Restart the API container: `docker-compose restart api`

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
