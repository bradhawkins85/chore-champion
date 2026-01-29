#!/bin/bash
# ChoreQuest Health Check Script

set -e

CONTAINER_NAME="chorequest-app"
HEALTH_ENDPOINT="http://localhost:${CHOREQUEST_PORT:-8080}/health"

echo "ChoreQuest Health Check"
echo "======================="
echo ""

if ! docker ps | grep -q "$CONTAINER_NAME"; then
    echo "✗ Container is not running!"
    exit 1
fi

CONTAINER_STATUS=$(docker inspect --format='{{.State.Health.Status}}' "$CONTAINER_NAME" 2>/dev/null || echo "unknown")

echo "Container Status: $CONTAINER_STATUS"

if [ "$CONTAINER_STATUS" = "healthy" ]; then
    echo "✓ Container is healthy"
else
    echo "✗ Container is not healthy"
    echo ""
    echo "Recent logs:"
    docker logs --tail 50 "$CONTAINER_NAME"
    exit 1
fi

if command -v curl &> /dev/null; then
    echo ""
    echo "Testing health endpoint..."
    if curl -f -s "$HEALTH_ENDPOINT" > /dev/null; then
        echo "✓ Health endpoint responding"
    else
        echo "✗ Health endpoint not responding"
        exit 1
    fi
fi

echo ""
echo "Container Details:"
docker ps --filter "name=$CONTAINER_NAME" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"

echo ""
echo "Volume Usage:"
docker exec "$CONTAINER_NAME" df -h /usr/share/nginx/html/data 2>/dev/null || echo "No data volume mounted"

echo ""
echo "✓ All health checks passed"
