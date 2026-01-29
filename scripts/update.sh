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
docker exec chorequest-backup /scripts/backup.sh || echo "WARNING: Backup container not running"

echo ""
echo "Pulling latest code/image..."
if [ -f Dockerfile ]; then
    git pull || echo "Not a git repository, skipping pull"
    echo "Building new image..."
    docker compose -f docker-compose.prod.yml build --no-cache
else
    docker compose -f docker-compose.prod.yml pull
fi

echo ""
echo "Recreating containers..."
docker compose -f docker-compose.prod.yml up -d --force-recreate

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
