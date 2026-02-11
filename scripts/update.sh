#!/bin/bash
# ChoreQuest Update Script
# Updates the application to the latest version

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

cd "$PROJECT_DIR"

echo "ChoreQuest Update"
echo "================="
echo ""

if [ ! -f .env ]; then
    echo "ERROR: .env file not found!"
    exit 1
fi

source .env

echo "Creating pre-update backup..."

# Check if backup container exists
if ! docker inspect chorequest-backup > /dev/null 2>&1; then
    echo "WARNING: Backup container not found - skipping backup"
else
    # Wait for backup container to be running (max 30 seconds)
    BACKUP_WAIT=0
    BACKUP_MAX_WAIT=30
    while [ $BACKUP_WAIT -lt $BACKUP_MAX_WAIT ]; do
        CONTAINER_STATE=$(docker inspect -f '{{.State.Status}}' chorequest-backup 2>/dev/null)
        
        if [ "$CONTAINER_STATE" = "running" ]; then
            echo "✓ Backup container is running"
            break
        fi
        
        # Container is not running, show appropriate message and wait
        if [ "$CONTAINER_STATE" = "restarting" ]; then
            echo "Waiting for backup container to finish restarting... ($BACKUP_WAIT/$BACKUP_MAX_WAIT seconds)"
        else
            echo "Backup container is in state '${CONTAINER_STATE:-unknown}' - waiting..."
        fi
        
        sleep 2
        BACKUP_WAIT=$((BACKUP_WAIT + 2))
    done
    
    # Check final state after loop
    CONTAINER_STATE=$(docker inspect -f '{{.State.Status}}' chorequest-backup 2>/dev/null || echo "")
    
    # Attempt backup if container is running
    if [ "$CONTAINER_STATE" = "running" ]; then
        if docker exec chorequest-backup /scripts/backup.sh; then
            echo "✓ Backup completed successfully"
        else
            echo "WARNING: Backup failed but continuing with update"
        fi
    else
        echo "WARNING: Backup container not ready after ${BACKUP_MAX_WAIT}s (state: ${CONTAINER_STATE:-unknown})"
        echo "Skipping backup and continuing with update"
    fi
fi

echo ""
echo "Checking for updates..."
UPDATE_AVAILABLE=false

if [ -f Dockerfile ]; then
    # Source-based deployment - check git if it's a repository
    if [ -d .git ]; then
        echo "Checking git repository for updates..."
        CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo "main")
        echo "Current branch: ${CURRENT_BRANCH}"
        
        # Get current commit
        LOCAL_COMMIT=$(git rev-parse HEAD 2>/dev/null)
        
        if git fetch origin; then
            echo "✓ Fetched latest changes"
            
            # Get remote commit
            REMOTE_COMMIT=$(git rev-parse "origin/${CURRENT_BRANCH}" 2>/dev/null)
            
            if [ "$LOCAL_COMMIT" != "$REMOTE_COMMIT" ]; then
                echo "✓ Updates available from GitHub"
                UPDATE_AVAILABLE=true
                
                echo "Updating to latest version..."
                if git reset --hard "origin/${CURRENT_BRANCH}"; then
                    echo "✓ Code updated to latest version from GitHub"
                else
                    echo "WARNING: Failed to reset to origin/${CURRENT_BRANCH}"
                    echo "Continuing with current code..."
                    UPDATE_AVAILABLE=false
                fi
            else
                echo "✓ Already up to date (${LOCAL_COMMIT:0:8})"
            fi
        else
            echo "WARNING: Git fetch failed"
            echo "Cannot check for updates. Assuming no updates available."
        fi
    else
        echo "Not a git repository"
        echo "Building images anyway since we can't check for updates..."
        UPDATE_AVAILABLE=true
    fi
    
    if [ "$UPDATE_AVAILABLE" = "true" ]; then
        echo ""
        echo "Building new image..."
        docker compose -f docker-compose.prod.yml build --no-cache
    fi
else
    # Registry-based deployment - check for image updates
    # Note: Docker doesn't provide a reliable way to check for updates without pulling
    # We'll pull and check if any images were updated
    echo "Checking for image updates from registry..."
    echo "(This will pull images to check for updates)"
    
    # Capture the output of docker compose pull
    PULL_OUTPUT=$(docker compose -f docker-compose.prod.yml pull 2>&1)
    
    # Check if any images were actually updated (not just cached)
    # Look for "Downloaded newer image" which only appears when images are actually updated
    if echo "$PULL_OUTPUT" | grep -q "Downloaded newer image"; then
        echo "✓ Updates available from registry"
        UPDATE_AVAILABLE=true
    else
        echo "✓ Already up to date"
        # Images were already up to date, no need to redeploy
    fi
fi

if [ "$UPDATE_AVAILABLE" = "true" ]; then
    echo ""
    echo "Recreating containers..."
    docker compose -f docker-compose.prod.yml up -d --force-recreate
else
    echo ""
    echo "No updates available - skipping build and deployment"
    echo "✓ ChoreQuest is already running the latest version"
    exit 0
fi

echo ""
echo "Cleaning up old images..."
docker image prune -f

echo ""
echo "Waiting for services to become healthy..."
sleep 10

if docker ps | grep -q chorequest-app; then
    echo ""
    echo "✓ Update successful!"
    echo ""
    echo "ChoreQuest is now running the latest version"
    echo ""
else
    echo ""
    echo "✗ Update failed. Attempting rollback..."
    echo "Check backups in ${BACKUP_PATH:-./backups}"
    exit 1
fi
