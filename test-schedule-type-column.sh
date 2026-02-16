#!/bin/bash

# Test script to verify that schedule_type column exists in tenant_child_availability_v2

set -e

MYSQL_HOST="${MYSQL_HOST:-localhost}"
MYSQL_PORT="${MYSQL_PORT:-3306}"
MYSQL_USER="${MYSQL_USER:-chorequest}"
MYSQL_PASSWORD="${MYSQL_PASSWORD:-chorequest}"
MYSQL_DATABASE="${MYSQL_DATABASE:-chorequest}"

echo "==========================================="
echo "Testing schedule_type Column Migration"
echo "==========================================="
echo ""
echo "MySQL Host: $MYSQL_HOST:$MYSQL_PORT"
echo "Database: $MYSQL_DATABASE"
echo ""

# Helper function to execute MySQL queries
run_query() {
    mysql -h "$MYSQL_HOST" -P "$MYSQL_PORT" -u "$MYSQL_USER" -p"$MYSQL_PASSWORD" "$MYSQL_DATABASE" -e "$1" 2>/dev/null
}

# Test: Check if schedule_type column exists
echo "Test: Verify tenant_child_availability_v2 table has schedule_type column"
echo "------------------------------------------------------------------------"
COLUMN=$(run_query "SHOW COLUMNS FROM tenant_child_availability_v2 LIKE 'schedule_type';" | tail -n +2 || true)
if [[ -n "$COLUMN" ]]; then
    echo "✓ schedule_type column exists:"
    echo "$COLUMN"
    echo ""
    echo "Column details:"
    run_query "DESCRIBE tenant_child_availability_v2;" | grep -E "(Field|child_id|type|schedule_type|start_date)"
    echo ""
    echo "==========================================="
    echo "Test PASSED!"
    echo "==========================================="
    exit 0
else
    echo "❌ schedule_type column is missing from tenant_child_availability_v2 table"
    echo ""
    echo "Current table structure:"
    run_query "DESCRIBE tenant_child_availability_v2;"
    echo ""
    echo "==========================================="
    echo "Test FAILED!"
    echo "==========================================="
    exit 1
fi
