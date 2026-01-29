#!/bin/bash

# ChoreQuest MySQL Backend Quick Setup Script
# This script helps set up the MySQL backend for Docker deployment

set -e

echo "==================================="
echo "ChoreQuest MySQL Backend Setup"
echo "==================================="
echo ""

# Check if .env exists
if [ ! -f .env ]; then
    echo "Creating .env file from .env.example..."
    cp .env.example .env
    echo "✓ Created .env file"
    echo ""
    echo "⚠️  IMPORTANT: Please edit .env and set secure passwords!"
    echo "   - MYSQL_ROOT_PASSWORD"
    echo "   - MYSQL_PASSWORD"
    echo ""
else
    echo "✓ .env file already exists"
fi

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed. Please install Docker first."
    exit 1
fi

echo "✓ Docker is installed"

# Check if Docker Compose is available
if command -v docker-compose &> /dev/null; then
    COMPOSE_CMD="docker-compose"
elif docker compose version &> /dev/null; then
    COMPOSE_CMD="docker compose"
else
    echo "❌ Docker Compose is not available. Please install Docker Compose."
    exit 1
fi

echo "✓ Docker Compose is available"
echo ""

# Ask user which deployment mode
echo "Select deployment mode:"
echo "1) Development (docker-compose.yml)"
echo "2) Production (docker-compose.prod.yml)"
read -p "Enter choice [1-2]: " choice

case $choice in
    1)
        COMPOSE_FILE="docker-compose.yml"
        ;;
    2)
        COMPOSE_FILE="docker-compose.prod.yml"
        # Create data directories for production
        mkdir -p ./data ./backups ./mysql-data
        echo "✓ Created data directories"
        ;;
    *)
        echo "Invalid choice. Defaulting to development mode."
        COMPOSE_FILE="docker-compose.yml"
        ;;
esac

echo ""
echo "Using configuration: $COMPOSE_FILE"
echo ""

# Validate configuration
echo "Validating Docker Compose configuration..."
if $COMPOSE_CMD -f $COMPOSE_FILE config > /dev/null 2>&1; then
    echo "✓ Configuration is valid"
else
    echo "❌ Configuration validation failed"
    $COMPOSE_CMD -f $COMPOSE_FILE config
    exit 1
fi

echo ""
read -p "Do you want to start the services now? [y/N]: " start_now

if [[ $start_now =~ ^[Yy]$ ]]; then
    echo ""
    echo "Starting services..."
    echo "This may take a few minutes on first run..."
    echo ""
    
    $COMPOSE_CMD -f $COMPOSE_FILE up -d
    
    echo ""
    echo "✓ Services started!"
    echo ""
    echo "Waiting for services to be healthy..."
    sleep 10
    
    # Check service health
    echo ""
    echo "Service Status:"
    $COMPOSE_CMD -f $COMPOSE_FILE ps
    
    echo ""
    echo "==================================="
    echo "Setup Complete!"
    echo "==================================="
    echo ""
    echo "Access your application at: http://localhost:8080"
    echo ""
    echo "Useful commands:"
    echo "  - View logs: $COMPOSE_CMD -f $COMPOSE_FILE logs -f"
    echo "  - Stop services: $COMPOSE_CMD -f $COMPOSE_FILE down"
    echo "  - Restart services: $COMPOSE_CMD -f $COMPOSE_FILE restart"
    echo ""
    echo "For more information, see MYSQL_BACKEND.md"
else
    echo ""
    echo "==================================="
    echo "Setup Complete!"
    echo "==================================="
    echo ""
    echo "To start the services, run:"
    echo "  $COMPOSE_CMD -f $COMPOSE_FILE up -d"
    echo ""
    echo "For more information, see MYSQL_BACKEND.md"
fi
