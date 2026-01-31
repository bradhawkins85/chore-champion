#!/bin/bash

# ChoreQuest Development Startup Script
# This script starts all required services for local development

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🏆 ChoreQuest Development Setup${NC}"
echo "================================"
echo ""

# Check if ports are in use
PORTS_IN_USE=()
if lsof -ti:3000 >/dev/null 2>&1; then
    PORTS_IN_USE+=("3000")
fi
if lsof -ti:5000 >/dev/null 2>&1; then
    PORTS_IN_USE+=("5000")
fi

if [ ${#PORTS_IN_USE[@]} -gt 0 ]; then
    echo -e "${YELLOW}⚠️  Warning: Some required ports are already in use:${NC}"
    for port in "${PORTS_IN_USE[@]}"; do
        PID=$(lsof -ti:$port)
        PROCESS=$(ps -p $PID -o comm= 2>/dev/null || echo "unknown")
        echo "  • Port $port (PID: $PID, Process: $PROCESS)"
    done
    echo ""
    echo -e "${YELLOW}These processes will be stopped automatically.${NC}"
    echo -e "${YELLOW}Press Ctrl+C within 5 seconds to cancel...${NC}"
    sleep 5
    
    for port in "${PORTS_IN_USE[@]}"; do
        PID=$(lsof -ti:$port 2>/dev/null)
        if [ ! -z "$PID" ]; then
            kill $PID 2>/dev/null || true
            echo -e "${GREEN}✓${NC} Stopped process on port $port"
        fi
    done
    sleep 2
    echo ""
fi

# Function to cleanup on exit
cleanup() {
    echo ""
    echo -e "${YELLOW}🛑 Shutting down services...${NC}"
    
    # Kill background processes
    if [ ! -z "$API_PID" ]; then
        kill $API_PID 2>/dev/null || true
        echo -e "${GREEN}✓${NC} API server stopped"
    fi
    
    if [ ! -z "$VITE_PID" ]; then
        kill $VITE_PID 2>/dev/null || true
        echo -e "${GREEN}✓${NC} Vite dev server stopped"
    fi
    
    echo -e "${GREEN}✅ Cleanup complete${NC}"
    exit 0
}

# Trap SIGINT and SIGTERM
trap cleanup INT TERM

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo -e "${RED}❌ Docker is required but not installed${NC}"
    echo "Please install Docker: https://docs.docker.com/get-docker/"
    exit 1
fi

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js is required but not installed${NC}"
    echo "Please install Node.js 20+: https://nodejs.org/"
    exit 1
fi

echo -e "${BLUE}1. Starting MySQL Database...${NC}"

# Check if MySQL container is already running
if docker ps --format '{{.Names}}' | grep -q '^chorequest-mysql-dev$'; then
    echo -e "${GREEN}✓${NC} MySQL container already running"
else
    # Stop and remove any existing container
    docker rm -f chorequest-mysql-dev 2>/dev/null || true
    
    # Start MySQL container
    docker run -d \
        --name chorequest-mysql-dev \
        -e MYSQL_ROOT_PASSWORD=rootpassword \
        -e MYSQL_DATABASE=chorequest \
        -e MYSQL_USER=chorequest \
        -e MYSQL_PASSWORD=chorequest \
        -p 3306:3306 \
        mysql:8.0
    
    echo -e "${GREEN}✓${NC} MySQL container started"
    echo -e "${YELLOW}⏳ Waiting for MySQL to be ready...${NC}"
    
    # Wait for MySQL to be ready (max 30 seconds)
    for i in {1..30}; do
        if docker exec chorequest-mysql-dev mysqladmin ping -h localhost -u chorequest -pchorequest 2>/dev/null | grep -q "mysqld is alive"; then
            echo -e "${GREEN}✓${NC} MySQL is ready"
            break
        fi
        sleep 1
        if [ $i -eq 30 ]; then
            echo -e "${RED}❌ MySQL failed to start within 30 seconds${NC}"
            exit 1
        fi
    done
fi

echo ""
echo -e "${BLUE}2. Installing Dependencies...${NC}"

# Install root dependencies if needed
if [ ! -d "node_modules" ]; then
    echo "Installing frontend dependencies..."
    npm install
else
    echo -e "${GREEN}✓${NC} Frontend dependencies already installed"
fi

# Install server dependencies if needed
if [ ! -d "server/node_modules" ]; then
    echo "Installing server dependencies..."
    cd server
    npm install
    cd ..
else
    echo -e "${GREEN}✓${NC} Server dependencies already installed"
fi

echo ""
echo -e "${BLUE}3. Starting API Server...${NC}"

# Set environment variables for API server
export MYSQL_HOST=localhost
export MYSQL_PORT=3306
export MYSQL_USER=chorequest
export MYSQL_PASSWORD=chorequest
export MYSQL_DATABASE=chorequest
export PORT=3000
export NODE_ENV=development

# Start API server in background
cd server
npm run dev > ../api-server.log 2>&1 &
API_PID=$!
cd ..

echo -e "${GREEN}✓${NC} API server started (PID: $API_PID, logs: api-server.log)"

# Wait for API server to be ready
echo -e "${YELLOW}⏳ Waiting for API server to be ready...${NC}"
for i in {1..30}; do
    if curl -s http://localhost:3000/api/health > /dev/null 2>&1; then
        echo -e "${GREEN}✓${NC} API server is ready"
        break
    fi
    sleep 1
    if [ $i -eq 30 ]; then
        echo -e "${RED}❌ API server failed to start within 30 seconds${NC}"
        echo "Check api-server.log for errors"
        cleanup
        exit 1
    fi
done

echo ""
echo -e "${BLUE}4. Starting Vite Dev Server...${NC}"

# Start Vite dev server in background
npm run dev > vite-server.log 2>&1 &
VITE_PID=$!

echo -e "${GREEN}✓${NC} Vite dev server started (PID: $VITE_PID, logs: vite-server.log)"

# Wait for Vite to be ready
echo -e "${YELLOW}⏳ Waiting for Vite dev server to be ready...${NC}"
for i in {1..30}; do
    if curl -s http://localhost:5000 > /dev/null 2>&1; then
        echo -e "${GREEN}✓${NC} Vite dev server is ready"
        break
    fi
    sleep 1
    if [ $i -eq 30 ]; then
        echo -e "${RED}❌ Vite dev server failed to start within 30 seconds${NC}"
        echo "Check vite-server.log for errors"
        cleanup
        exit 1
    fi
done

echo ""
echo -e "${GREEN}✅ All services started successfully!${NC}"
echo ""
echo -e "${BLUE}📋 Service Information:${NC}"
echo "  • Frontend:  http://localhost:5000"
echo "  • API:       http://localhost:3000"
echo "  • MySQL:     localhost:3306 (user: chorequest, password: chorequest)"
echo ""
echo -e "${BLUE}📝 Log Files:${NC}"
echo "  • API Server: api-server.log"
echo "  • Vite:       vite-server.log"
echo ""
echo -e "${YELLOW}Press Ctrl+C to stop all services${NC}"
echo ""

# Keep the script running and tail both log files
tail -f api-server.log vite-server.log
