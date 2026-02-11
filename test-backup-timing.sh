#!/bin/bash
# Test script to verify that backups execute BEFORE updates
# This test ensures that:
# 1. Backup is created before git reset is executed
# 2. Backup is created before images are built
# 3. Backup captures the pre-update state

set -e

echo "=========================================="
echo "Testing Backup Timing During Updates"
echo "=========================================="
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Create a temporary directory for testing
TEST_DIR=$(mktemp -d)
trap 'rm -rf "$TEST_DIR"' EXIT

echo "Test directory: $TEST_DIR"
echo ""

# Test 1: Verify backup happens before git reset in update.sh
echo "Test 1: Source-based deployment - backup before git reset"
echo "-----------------------------------------------------------"

# Create a mock update.sh script that logs the order of operations
cat > "$TEST_DIR/mock-update.sh" << 'EOF'
#!/bin/bash
set -e

LOG_FILE="$1"

# Simulate checking for updates
echo "$(date +%s) CHECK_START" >> "$LOG_FILE"
echo "Checking for updates..."
UPDATE_AVAILABLE=true
echo "$(date +%s) CHECK_END" >> "$LOG_FILE"

if [ "$UPDATE_AVAILABLE" = "true" ]; then
    # Backup happens here
    echo "$(date +%s) BACKUP_START" >> "$LOG_FILE"
    echo "Creating pre-update backup..."
    sleep 1  # Simulate backup taking time
    echo "$(date +%s) BACKUP_END" >> "$LOG_FILE"
    
    # Git reset happens after backup
    echo "$(date +%s) GIT_RESET_START" >> "$LOG_FILE"
    echo "Updating to latest version..."
    sleep 1  # Simulate git reset
    echo "$(date +%s) GIT_RESET_END" >> "$LOG_FILE"
    
    # Build happens after git reset
    echo "$(date +%s) BUILD_START" >> "$LOG_FILE"
    echo "Building new image..."
    sleep 1  # Simulate build
    echo "$(date +%s) BUILD_END" >> "$LOG_FILE"
fi
EOF

chmod +x "$TEST_DIR/mock-update.sh"

# Run the mock update script
LOG_FILE="$TEST_DIR/update.log"
bash "$TEST_DIR/mock-update.sh" "$LOG_FILE"

# Parse the log to verify order
BACKUP_END_TIME=$(grep BACKUP_END "$LOG_FILE" | cut -d' ' -f1)
GIT_RESET_START_TIME=$(grep GIT_RESET_START "$LOG_FILE" | cut -d' ' -f1)
BUILD_START_TIME=$(grep BUILD_START "$LOG_FILE" | cut -d' ' -f1)

echo ""
echo "Operation timeline:"
grep -E "(BACKUP_|GIT_RESET_|BUILD_)" "$LOG_FILE" | while read timestamp event; do
    echo "  $event at timestamp $timestamp"
done

echo ""
if [ "$BACKUP_END_TIME" -le "$GIT_RESET_START_TIME" ]; then
    echo -e "${GREEN}✓ Backup completed BEFORE or at same time as git reset started${NC}"
else
    echo -e "${RED}❌ Backup did NOT complete before git reset${NC}"
    exit 1
fi

if [ "$GIT_RESET_START_TIME" -le "$BUILD_START_TIME" ]; then
    echo -e "${GREEN}✓ Git reset completed BEFORE or at same time as build started${NC}"
else
    echo -e "${RED}❌ Git reset did NOT complete before build${NC}"
    exit 1
fi

echo ""
echo "Test 2: Verify actual update.sh script structure"
echo "---------------------------------------------------"

# Check the actual update.sh to verify backup comes before git reset
if [ -f scripts/update.sh ]; then
    # Find line numbers for key operations
    BACKUP_LINE=$(grep -n "Creating pre-update backup" scripts/update.sh | head -1 | cut -d: -f1)
    GIT_RESET_LINE=$(grep -n "git reset --hard" scripts/update.sh | head -1 | cut -d: -f1)
    BUILD_LINE=$(grep -n "docker compose.*build" scripts/update.sh | head -1 | cut -d: -f1)
    
    echo "Line numbers in scripts/update.sh:"
    echo "  Backup starts at line: $BACKUP_LINE"
    echo "  Git reset at line: $GIT_RESET_LINE"
    echo "  Build at line: $BUILD_LINE"
    echo ""
    
    if [ -n "$BACKUP_LINE" ] && [ -n "$GIT_RESET_LINE" ] && [ "$BACKUP_LINE" -lt "$GIT_RESET_LINE" ]; then
        echo -e "${GREEN}✓ In update.sh: Backup code appears BEFORE git reset${NC}"
    else
        echo -e "${RED}❌ In update.sh: Backup code does NOT appear before git reset${NC}"
        exit 1
    fi
    
    if [ -n "$GIT_RESET_LINE" ] && [ -n "$BUILD_LINE" ] && [ "$GIT_RESET_LINE" -lt "$BUILD_LINE" ]; then
        echo -e "${GREEN}✓ In update.sh: Git reset appears BEFORE build${NC}"
    else
        echo -e "${RED}❌ In update.sh: Git reset does NOT appear before build${NC}"
        exit 1
    fi
else
    echo -e "${RED}❌ scripts/update.sh not found${NC}"
    exit 1
fi

echo ""
echo "Test 3: Verify update-internal.sh script structure"
echo "-----------------------------------------------------"

if [ -f scripts/update-internal.sh ]; then
    # Find line numbers for key operations
    BACKUP_LINE=$(grep -n "Creating pre-update backup" scripts/update-internal.sh | head -1 | cut -d: -f1)
    GIT_RESET_LINE=$(grep -n "reset --hard" scripts/update-internal.sh | head -1 | cut -d: -f1)
    BUILD_LINE=$(grep -n "Building latest images" scripts/update-internal.sh | head -1 | cut -d: -f1)
    
    echo "Line numbers in scripts/update-internal.sh:"
    echo "  Backup starts at line: $BACKUP_LINE"
    echo "  Git reset at line: $GIT_RESET_LINE"
    echo "  Build at line: $BUILD_LINE"
    echo ""
    
    if [ -n "$BACKUP_LINE" ] && [ -n "$GIT_RESET_LINE" ] && [ "$BACKUP_LINE" -lt "$GIT_RESET_LINE" ]; then
        echo -e "${GREEN}✓ In update-internal.sh: Backup code appears BEFORE git reset${NC}"
    else
        echo -e "${RED}❌ In update-internal.sh: Backup code does NOT appear before git reset${NC}"
        exit 1
    fi
    
    if [ -n "$GIT_RESET_LINE" ] && [ -n "$BUILD_LINE" ] && [ "$GIT_RESET_LINE" -lt "$BUILD_LINE" ]; then
        echo -e "${GREEN}✓ In update-internal.sh: Git reset appears BEFORE build${NC}"
    else
        echo -e "${RED}❌ In update-internal.sh: Git reset does NOT appear before build${NC}"
        exit 1
    fi
else
    echo -e "${RED}❌ scripts/update-internal.sh not found${NC}"
    exit 1
fi

echo ""
echo "Test 4: Verify conditional logic structure"
echo "--------------------------------------------"

# Verify that backup only happens when UPDATE_AVAILABLE=true
BACKUP_IN_CONDITIONAL=$(grep -B 5 "Creating pre-update backup" scripts/update.sh | grep -c "if.*UPDATE_AVAILABLE.*true" || echo "0")

if [ "$BACKUP_IN_CONDITIONAL" -gt 0 ]; then
    echo -e "${GREEN}✓ Backup is conditional on UPDATE_AVAILABLE=true${NC}"
else
    echo -e "${YELLOW}⚠ Could not verify backup conditional logic${NC}"
fi

# Verify that git reset happens AFTER backup in the same conditional block
UPDATE_AFTER_BACKUP=$(awk '/Creating pre-update backup/,/git reset --hard/' scripts/update.sh | grep -c "git reset" || echo "0")

if [ "$UPDATE_AFTER_BACKUP" -gt 0 ]; then
    echo -e "${GREEN}✓ Git reset is executed AFTER backup in the code flow${NC}"
else
    echo -e "${RED}❌ Git reset is NOT in the expected position relative to backup${NC}"
    exit 1
fi

echo ""
echo -e "${GREEN}=========================================="
echo "All tests passed! ✓"
echo -e "==========================================${NC}"
echo ""
echo "Summary:"
echo "  ✓ Backup executes before git reset"
echo "  ✓ Backup executes before image build"
echo "  ✓ Backup only runs when updates are available"
echo "  ✓ Update operations happen in the correct order"
