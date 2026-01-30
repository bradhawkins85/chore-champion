#!/bin/bash
# ChoreQuest Internal Update Script
# This script is designed to be called from within the container
# It triggers a Docker Compose update on the host

set -e

echo "ChoreQuest Update Triggered from Container"
echo "==========================================="
echo ""

# This script will use Docker socket to trigger an update
# The actual update will be performed by docker-compose on the host

# Check if we have access to docker socket
if [ ! -S /var/run/docker.sock ]; then
    echo "ERROR: Docker socket not available"
    echo "To enable updates from the dashboard, mount the Docker socket:"
    echo "  -v /var/run/docker.sock:/var/run/docker.sock"
    exit 1
fi

# Get the container's compose project name
COMPOSE_PROJECT=$(docker inspect --format='{{index .Config.Labels "com.docker.compose.project"}}' $(hostname) 2>/dev/null || echo "")

if [ -z "$COMPOSE_PROJECT" ]; then
    echo "ERROR: Could not determine compose project name"
    exit 1
fi

echo "Compose Project: $COMPOSE_PROJECT"
echo ""

# Create backup before updating
echo "Creating pre-update backup..."
docker exec ${COMPOSE_PROJECT}-backup-1 /scripts/backup.sh 2>/dev/null || \
    docker exec ${COMPOSE_PROJECT}_backup_1 /scripts/backup.sh 2>/dev/null || \
    echo "WARNING: Could not create backup (backup container not found)"

echo ""
echo "Pulling latest images..."
# Try to determine which compose file is being used
if docker container inspect ${COMPOSE_PROJECT}-traefik-1 >/dev/null 2>&1 || \
   docker container inspect ${COMPOSE_PROJECT}_traefik_1 >/dev/null 2>&1; then
    COMPOSE_FILE="docker-compose.traefik.yml"
elif docker container inspect ${COMPOSE_PROJECT}-backup-1 >/dev/null 2>&1 || \
     docker container inspect ${COMPOSE_PROJECT}_backup_1 >/dev/null 2>&1; then
    COMPOSE_FILE="docker-compose.prod.yml"
else
    COMPOSE_FILE="docker-compose.yml"
fi

echo "Using compose file: $COMPOSE_FILE"
echo ""

# Pull the latest images
docker compose -f $COMPOSE_FILE pull

echo ""
echo "Recreating containers..."
# Recreate containers with new images
docker compose -f $COMPOSE_FILE up -d --force-recreate --remove-orphans

echo ""
echo "Cleaning up old images..."
docker image prune -f

echo ""
echo "✓ Update completed successfully!"
echo ""
