#!/bin/bash
# ChoreQuest Production Deployment Script

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

cd "$PROJECT_DIR"

echo "ChoreQuest Production Deployment"
echo "================================="
echo ""

if [ ! -f .env ]; then
    echo "ERROR: .env file not found!"
    echo "Please copy .env.example to .env and configure it."
    exit 1
fi

source .env

echo "Configuration loaded:"
echo "  - Port: ${CHOREQUEST_PORT:-8080}"
echo "  - Timezone: ${TIMEZONE:-UTC}"
echo "  - Data Path: ${DATA_PATH:-./data}"
echo "  - Backup Path: ${BACKUP_PATH:-./backups}"
echo "  - MySQL Data Path: ${MYSQL_DATA_PATH:-./mysql-data}"
echo ""

mkdir -p "${DATA_PATH:-./data}"
mkdir -p "${BACKUP_PATH:-./backups}"
mkdir -p "${MYSQL_DATA_PATH:-./mysql-data}"
chmod +x scripts/*.sh

echo "Building Docker image..."
docker compose -f docker-compose.prod.yml build --no-cache

echo ""
echo "Stopping existing containers..."
docker compose -f docker-compose.prod.yml down

echo ""
echo "Starting ChoreQuest..."
docker compose -f docker-compose.prod.yml up -d

echo ""
echo "Waiting for services to become healthy..."
sleep 10

if docker ps | grep -q chorequest-app; then
    echo ""
    echo "✓ Deployment successful!"
    echo ""
    echo "ChoreQuest is now running at:"
    echo "  http://localhost:${CHOREQUEST_PORT:-8080}"
    echo ""
    echo "To view logs:"
    echo "  docker compose -f docker-compose.prod.yml logs -f"
    echo ""
    echo "To stop:"
    echo "  docker compose -f docker-compose.prod.yml down"
    echo ""
else
    echo ""
    echo "✗ Deployment failed. Check logs:"
    echo "  docker compose -f docker-compose.prod.yml logs"
    exit 1
fi
