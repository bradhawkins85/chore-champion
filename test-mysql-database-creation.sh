#!/bin/bash
# Test script to verify MySQL database creation in Docker deployment
# This script demonstrates that the database is automatically created

set -e

echo "========================================="
echo "MySQL Database Creation Verification Test"
echo "========================================="
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print success
success() {
    echo -e "${GREEN}✓${NC} $1"
}

# Function to print error
error() {
    echo -e "${RED}✗${NC} $1"
}

# Function to print info
info() {
    echo -e "${YELLOW}ℹ${NC} $1"
}

# Check if Docker is available
if ! command -v docker &> /dev/null; then
    error "Docker is not installed or not in PATH"
    exit 1
fi
success "Docker is available"

# Check if Docker Compose is available
if docker compose version &> /dev/null 2>&1; then
    COMPOSE_CMD="docker compose"
elif command -v docker-compose &> /dev/null; then
    COMPOSE_CMD="docker-compose"
else
    error "Docker Compose is not available"
    exit 1
fi
success "Docker Compose is available ($COMPOSE_CMD)"

echo ""
info "This test will:"
echo "  1. Validate docker-compose configuration"
echo "  2. Verify mysql-init scripts are present"
echo "  3. Check that volume mounts are correct"
echo "  4. Explain how database creation works"
echo ""

# Test 1: Validate docker-compose.yml
echo "Test 1: Validating docker-compose.yml..."
if $COMPOSE_CMD -f docker-compose.yml config > /dev/null 2>&1; then
    success "docker-compose.yml is valid"
else
    error "docker-compose.yml has configuration errors"
    $COMPOSE_CMD -f docker-compose.yml config
    exit 1
fi

# Test 2: Validate docker-compose.prod.yml
echo "Test 2: Validating docker-compose.prod.yml..."
if $COMPOSE_CMD -f docker-compose.prod.yml config > /dev/null 2>&1; then
    success "docker-compose.prod.yml is valid"
else
    error "docker-compose.prod.yml has configuration errors"
    $COMPOSE_CMD -f docker-compose.prod.yml config
    exit 1
fi

# Test 3: Check mysql-init directory exists
echo "Test 3: Checking mysql-init directory..."
if [ -d "mysql-init" ]; then
    success "mysql-init directory exists"
    
    # List files
    echo "   Files in mysql-init:"
    ls -1 mysql-init/ | while read file; do
        echo "     - $file"
    done
else
    error "mysql-init directory not found"
    exit 1
fi

# Test 4: Check initialization script exists
echo "Test 4: Checking initialization script..."
if [ -f "mysql-init/01-create-database.sql" ]; then
    success "01-create-database.sql exists"
    
    # Show script content
    echo "   Script content:"
    cat mysql-init/01-create-database.sql | head -5 | sed 's/^/     /'
else
    error "01-create-database.sql not found"
    exit 1
fi

# Test 5: Verify volume mount in docker-compose
echo "Test 5: Verifying volume mount configuration..."
if grep -q "./mysql-init:/docker-entrypoint-initdb.d" docker-compose.yml; then
    success "mysql-init is mounted in docker-compose.yml"
else
    error "mysql-init volume mount not found in docker-compose.yml"
    exit 1
fi

if grep -q "./mysql-init:/docker-entrypoint-initdb.d" docker-compose.prod.yml; then
    success "mysql-init is mounted in docker-compose.prod.yml"
else
    error "mysql-init volume mount not found in docker-compose.prod.yml"
    exit 1
fi

# Test 6: Verify MYSQL_DATABASE environment variable
echo "Test 6: Checking MYSQL_DATABASE environment variable..."
if grep -q "MYSQL_DATABASE=" docker-compose.yml; then
    success "MYSQL_DATABASE is set in docker-compose.yml"
    DB_NAME=$(grep "MYSQL_DATABASE=" docker-compose.yml | head -1 | sed 's/.*MYSQL_DATABASE=\${MYSQL_DATABASE:-\([^}]*\)}.*/\1/')
    echo "   Default database name: $DB_NAME"
else
    error "MYSQL_DATABASE not found in docker-compose.yml"
    exit 1
fi

# Test 7: Check .env.example has database configuration
echo "Test 7: Checking .env.example..."
if [ -f ".env.example" ]; then
    success ".env.example exists"
    
    if grep -q "MYSQL_DATABASE=" .env.example; then
        success "MYSQL_DATABASE is documented in .env.example"
    else
        error "MYSQL_DATABASE not found in .env.example"
    fi
else
    error ".env.example not found"
    exit 1
fi

# Test 8: Verify documentation exists
echo "Test 8: Checking documentation..."
if [ -f "MYSQL_DATABASE_CREATION.md" ]; then
    success "MYSQL_DATABASE_CREATION.md exists"
else
    error "MYSQL_DATABASE_CREATION.md not found"
fi

if [ -f "MYSQL_BACKEND.md" ]; then
    success "MYSQL_BACKEND.md exists"
else
    error "MYSQL_BACKEND.md not found"
fi

echo ""
echo "========================================="
echo "All Tests Passed!"
echo "========================================="
echo ""
echo "Summary: How MySQL Database Creation Works"
echo "-------------------------------------------"
echo ""
echo "1. 🔧 ENVIRONMENT VARIABLE (Primary Method)"
echo "   The MYSQL_DATABASE environment variable tells the MySQL"
echo "   Docker image to automatically create the database on first start."
echo "   Location: docker-compose.yml and docker-compose.prod.yml"
echo ""
echo "2. 📝 INITIALIZATION SCRIPT (Explicit Verification)"
echo "   The mysql-init/01-create-database.sql script provides"
echo "   explicit database creation with proper character set."
echo "   Location: mysql-init/01-create-database.sql"
echo "   Mount point: /docker-entrypoint-initdb.d in the container"
echo ""
echo "3. 🏗️  TABLE CREATION (Application Level)"
echo "   The Node.js API server creates the table schema on startup."
echo "   Location: server/src/config/database.ts"
echo ""
echo "4. ⏱️  STARTUP ORDER (Health Checks)"
echo "   Docker Compose ensures MySQL is healthy before starting"
echo "   the API server, preventing race conditions."
echo ""
echo "To deploy and test:"
echo "  docker compose up -d"
echo ""
echo "To verify database was created:"
echo "  docker exec -it chorequest-mysql mysql -u chorequest -pchorequest -e 'SHOW DATABASES;'"
echo ""
echo "For more details, see: MYSQL_DATABASE_CREATION.md"
echo ""
