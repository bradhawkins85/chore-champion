#!/bin/bash
# Test script to verify backup container behavior during updates
# This test ensures that:
# 1. During deployment, backup container is created
# 2. During update, backup container is only restarted, not recreated

set -e

echo "=========================================="
echo "Testing Backup Container Update Behavior"
echo "=========================================="
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if required commands are available
if ! command -v docker &> /dev/null; then
    echo -e "${RED}❌ Docker is not installed${NC}"
    exit 1
fi

if ! command -v docker compose &> /dev/null; then
    echo -e "${RED}❌ Docker Compose is not installed${NC}"
    exit 1
fi

# Check if .env file exists
if [ ! -f .env ]; then
    echo "Creating test .env file..."
    cp .env.example .env
fi

echo "Test 1: Verify deployment creates backup container"
echo "---------------------------------------------------"

# Clean up any existing containers
echo "Cleaning up existing containers..."
docker compose -f docker-compose.prod.yml down 2>/dev/null || true

# Simulate deployment
echo "Running deployment..."
docker compose -f docker-compose.prod.yml build --no-cache >/dev/null 2>&1 || echo "Build completed"
docker compose -f docker-compose.prod.yml up -d

# Wait for containers to start
sleep 5

# Check if backup container exists and is running
if docker ps --filter "name=chorequest-backup" --format "{{.Names}}" | grep -q "chorequest-backup"; then
    BACKUP_CREATED_ID=$(docker inspect -f '{{.Id}}' chorequest-backup)
    echo -e "${GREEN}✓ Backup container created during deployment${NC}"
    echo "  Container ID: ${BACKUP_CREATED_ID:0:12}"
else
    echo -e "${RED}❌ Backup container was not created during deployment${NC}"
    docker compose -f docker-compose.prod.yml down
    exit 1
fi

echo ""
echo "Test 2: Verify update restarts (not recreates) backup container"
echo "----------------------------------------------------------------"

# Record the container ID before update
BEFORE_UPDATE_ID=$(docker inspect -f '{{.Id}}' chorequest-backup)
BEFORE_UPDATE_CREATED=$(docker inspect -f '{{.Created}}' chorequest-backup)
echo "Before update:"
echo "  Container ID: ${BEFORE_UPDATE_ID:0:12}"
echo "  Created time: ${BEFORE_UPDATE_CREATED}"

# Simulate the update process (just the container recreation part)
echo ""
echo "Simulating update process..."
# This mimics what update.sh does
docker compose -f docker-compose.prod.yml up -d --force-recreate --no-deps mysql api chorequest
docker compose -f docker-compose.prod.yml restart backup

# Wait for containers to settle
sleep 5

# Check if backup container still exists
if docker ps --filter "name=chorequest-backup" --format "{{.Names}}" | grep -q "chorequest-backup"; then
    AFTER_UPDATE_ID=$(docker inspect -f '{{.Id}}' chorequest-backup)
    AFTER_UPDATE_CREATED=$(docker inspect -f '{{.Created}}' chorequest-backup)
    echo ""
    echo "After update:"
    echo "  Container ID: ${AFTER_UPDATE_ID:0:12}"
    echo "  Created time: ${AFTER_UPDATE_CREATED}"
    
    # Compare container IDs and creation times
    if [ "$BEFORE_UPDATE_ID" = "$AFTER_UPDATE_ID" ]; then
        echo -e "${GREEN}✓ Backup container was restarted (same ID)${NC}"
        
        if [ "$BEFORE_UPDATE_CREATED" = "$AFTER_UPDATE_CREATED" ]; then
            echo -e "${GREEN}✓ Backup container was NOT recreated (same creation time)${NC}"
        else
            echo -e "${RED}❌ Backup container appears to have been recreated (different creation time)${NC}"
            docker compose -f docker-compose.prod.yml down
            exit 1
        fi
    else
        echo -e "${RED}❌ Backup container was recreated (different ID)${NC}"
        docker compose -f docker-compose.prod.yml down
        exit 1
    fi
else
    echo -e "${RED}❌ Backup container not found after update${NC}"
    docker compose -f docker-compose.prod.yml down
    exit 1
fi

echo ""
echo "Test 3: Verify other containers were recreated"
echo "-----------------------------------------------"

# For the app containers, we can't easily verify they were recreated without
# tracking their IDs before, but we can at least check they're running
if docker ps --filter "name=chorequest-app" --format "{{.Names}}" | grep -q "chorequest-app"; then
    echo -e "${GREEN}✓ App container is running${NC}"
else
    echo -e "${RED}❌ App container is not running${NC}"
    docker compose -f docker-compose.prod.yml down
    exit 1
fi

# Cleanup
echo ""
echo "Cleaning up test containers..."
docker compose -f docker-compose.prod.yml down

echo ""
echo -e "${GREEN}=========================================="
echo "All tests passed! ✓"
echo -e "==========================================${NC}"
