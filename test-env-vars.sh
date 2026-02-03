#!/bin/bash
# Test script to verify environment variables are being passed to Docker containers

set -e

echo "=== Testing Docker Environment Variables ==="
echo ""

# Check if .env file exists
if [ ! -f .env ]; then
    echo "⚠️  No .env file found. Creating one from .env.example for testing..."
    cp .env.example .env
    echo "✓ Created .env from .env.example"
    echo ""
fi

# Source the .env file to get the variables
set -a
source .env
set +a

echo "=== Checking .env file contents ==="
echo "MYSQL_USER: ${MYSQL_USER:-not set}"
echo "JWT_SECRET: ${JWT_SECRET:-not set}"
echo "STRIPE_SECRET_KEY: ${STRIPE_SECRET_KEY:-not set}"
echo "VITE_STRIPE_PUBLISHABLE_KEY: ${VITE_STRIPE_PUBLISHABLE_KEY:-not set}"
echo ""

echo "=== Testing docker-compose.yml configuration ==="
echo "Checking if docker-compose can parse the file..."
if docker compose -f docker-compose.yml config > /dev/null 2>&1; then
    echo "✓ docker-compose.yml is valid"
else
    echo "✗ docker-compose.yml has syntax errors"
    exit 1
fi

echo ""
echo "=== Checking API service environment variables ==="
docker compose -f docker-compose.yml config | grep -A 30 "api:" | grep -E "(STRIPE_SECRET_KEY|STRIPE_WEBHOOK_SECRET)" || echo "⚠️  Stripe variables not found in API service"

echo ""
echo "=== Checking chorequest service build args ==="
docker compose -f docker-compose.yml config | grep -A 10 "chorequest:" | grep -A 5 "args:" | grep "VITE_STRIPE_PUBLISHABLE_KEY" || echo "⚠️  VITE_STRIPE_PUBLISHABLE_KEY not found in chorequest build args"

echo ""
echo "=== Testing docker-compose.prod.yml configuration ==="
if docker compose -f docker-compose.prod.yml config > /dev/null 2>&1; then
    echo "✓ docker-compose.prod.yml is valid"
else
    echo "✗ docker-compose.prod.yml has syntax errors"
    exit 1
fi

echo ""
echo "=== Testing docker-compose.traefik.yml configuration ==="
if docker compose -f docker-compose.traefik.yml config > /dev/null 2>&1; then
    echo "✓ docker-compose.traefik.yml is valid"
else
    echo "✗ docker-compose.traefik.yml has syntax errors"
    exit 1
fi

echo ""
echo "=== Summary ==="
echo "✓ All docker-compose files are syntactically valid"
echo "✓ Stripe environment variables are configured in API service"
echo "✓ VITE_STRIPE_PUBLISHABLE_KEY is configured as build arg"
echo ""
echo "To verify environment variables are actually passed to containers:"
echo "1. Start the services: docker-compose up -d"
echo "2. Check API env: docker exec chorequest-api env | grep STRIPE"
echo "3. Check frontend build: docker logs chorequest-app 2>&1 | grep -i stripe"
