#!/bin/bash

# Test script to verify that start_date and end_date columns exist in tenant_child_availability_v2

set -e

MYSQL_HOST="${MYSQL_HOST:-localhost}"
MYSQL_PORT="${MYSQL_PORT:-3306}"
MYSQL_USER="${MYSQL_USER:-chorequest}"
MYSQL_PASSWORD="${MYSQL_PASSWORD:-chorequest}"
MYSQL_DATABASE="${MYSQL_DATABASE:-chorequest}"

echo "==========================================="
echo "Testing start_date and end_date Column Migration"
echo "==========================================="
echo ""
echo "MySQL Host: $MYSQL_HOST:$MYSQL_PORT"
echo "Database: $MYSQL_DATABASE"
echo ""

# Helper function to execute MySQL queries
run_query() {
    mysql -h "$MYSQL_HOST" -P "$MYSQL_PORT" -u "$MYSQL_USER" -p"$MYSQL_PASSWORD" "$MYSQL_DATABASE" -e "$1" 2>/dev/null
}

# Test: Check if start_date column exists
echo "Test 1: Verify tenant_child_availability_v2 table has start_date column"
echo "------------------------------------------------------------------------"
START_DATE_COLUMN=$(run_query "SHOW COLUMNS FROM tenant_child_availability_v2 LIKE 'start_date';" | tail -n +2 || true)
if [[ -n "$START_DATE_COLUMN" ]]; then
    echo "✓ start_date column exists:"
    echo "$START_DATE_COLUMN"
    echo ""
else
    echo "❌ start_date column is missing from tenant_child_availability_v2 table"
    echo ""
    echo "Current table structure:"
    run_query "DESCRIBE tenant_child_availability_v2;"
    echo ""
    echo "==========================================="
    echo "Test FAILED!"
    echo "==========================================="
    exit 1
fi

# Test: Check if end_date column exists
echo "Test 2: Verify tenant_child_availability_v2 table has end_date column"
echo "----------------------------------------------------------------------"
END_DATE_COLUMN=$(run_query "SHOW COLUMNS FROM tenant_child_availability_v2 LIKE 'end_date';" | tail -n +2 || true)
if [[ -n "$END_DATE_COLUMN" ]]; then
    echo "✓ end_date column exists:"
    echo "$END_DATE_COLUMN"
    echo ""
else
    echo "❌ end_date column is missing from tenant_child_availability_v2 table"
    echo ""
    echo "Current table structure:"
    run_query "DESCRIBE tenant_child_availability_v2;"
    echo ""
    echo "==========================================="
    echo "Test FAILED!"
    echo "==========================================="
    exit 1
fi

# Show complete table structure
echo "Complete table structure:"
echo "-------------------------"
run_query "DESCRIBE tenant_child_availability_v2;" | grep -E "(Field|child_id|type|schedule_type|start_date|end_date|day_of_week)"
echo ""

echo "==========================================="
echo "All Tests PASSED!"
echo "==========================================="
exit 0
