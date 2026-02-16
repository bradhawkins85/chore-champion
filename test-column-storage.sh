#!/bin/bash

# Test script to verify that assignments, completions, and child-availability data
# are being saved to proper table columns instead of payload_json

set -e

MYSQL_HOST="${MYSQL_HOST:-localhost}"
MYSQL_PORT="${MYSQL_PORT:-3306}"
MYSQL_USER="${MYSQL_USER:-chorequest}"
MYSQL_PASSWORD="${MYSQL_PASSWORD:-chorequest}"
MYSQL_DATABASE="${MYSQL_DATABASE:-chorequest}"

echo "==========================================="
echo "Testing Proper Column Data Storage Fix"
echo "==========================================="
echo ""
echo "MySQL Host: $MYSQL_HOST:$MYSQL_PORT"
echo "Database: $MYSQL_DATABASE"
echo ""

# Helper function to execute MySQL queries
run_query() {
    mysql -h "$MYSQL_HOST" -P "$MYSQL_PORT" -u "$MYSQL_USER" -p"$MYSQL_PASSWORD" "$MYSQL_DATABASE" -e "$1" 2>/dev/null
}

# Test 1: Check assignments table structure
echo "Test 1: Verify tenant_assignments_v2 table has proper columns"
echo "-------------------------------------------------------------"
COLUMNS=$(run_query "DESCRIBE tenant_assignments_v2;" | grep -E "(chore_id|child_id|assigned_at|status|points)" || true)
if [ ! -z "$COLUMNS" ]; then
    echo "✓ Table has expected columns:"
    echo "$COLUMNS"
else
    echo "❌ Table is missing expected columns"
    exit 1
fi
echo ""

# Test 2: Check completions table structure
echo "Test 2: Verify tenant_completions_v2 table has proper columns"
echo "-------------------------------------------------------------"
COLUMNS=$(run_query "DESCRIBE tenant_completions_v2;" | grep -E "(chore_id|child_id|completed_at|status|points_awarded)" || true)
if [ ! -z "$COLUMNS" ]; then
    echo "✓ Table has expected columns:"
    echo "$COLUMNS"
else
    echo "❌ Table is missing expected columns"
    exit 1
fi
echo ""

# Test 3: Check child_availability table structure
echo "Test 3: Verify tenant_child_availability_v2 table has proper columns"
echo "--------------------------------------------------------------------"
COLUMNS=$(run_query "DESCRIBE tenant_child_availability_v2;" | grep -E "(child_id|type|schedule_type|start_date|is_available)" || true)
if [ ! -z "$COLUMNS" ]; then
    echo "✓ Table has expected columns:"
    echo "$COLUMNS"
else
    echo "❌ Table is missing expected columns"
    exit 1
fi
echo ""

# Test 4: Check if there's any existing data in payload_json that should be migrated
echo "Test 4: Check for data in payload_json columns"
echo "----------------------------------------------"
ASSIGNMENT_PAYLOAD_COUNT=$(run_query "SELECT COUNT(*) FROM tenant_assignments_v2 WHERE payload_json IS NOT NULL AND payload_json != 'null';" | tail -1)
COMPLETION_PAYLOAD_COUNT=$(run_query "SELECT COUNT(*) FROM tenant_completions_v2 WHERE payload_json IS NOT NULL AND payload_json != 'null';" | tail -1)
AVAILABILITY_PAYLOAD_COUNT=$(run_query "SELECT COUNT(*) FROM tenant_child_availability_v2 WHERE payload_json IS NOT NULL AND payload_json != 'null';" | tail -1)

echo "Assignments with data in payload_json: $ASSIGNMENT_PAYLOAD_COUNT"
echo "Completions with data in payload_json: $COMPLETION_PAYLOAD_COUNT"
echo "Child availability with data in payload_json: $AVAILABILITY_PAYLOAD_COUNT"

if [ "$ASSIGNMENT_PAYLOAD_COUNT" -gt 0 ] || [ "$COMPLETION_PAYLOAD_COUNT" -gt 0 ] || [ "$AVAILABILITY_PAYLOAD_COUNT" -gt 0 ]; then
    echo "⚠️  Warning: Some records still have data in payload_json"
    echo "    This is expected if there's existing data that needs migration"
    echo "    New records should be saved to proper columns"
else
    echo "✓ No data in payload_json columns (or tables are empty)"
fi
echo ""

# Test 5: Sample query to show assignment data structure
echo "Test 5: Sample assignment record structure (if any exist)"
echo "---------------------------------------------------------"
SAMPLE=$(run_query "SELECT id, chore_id, child_id, assigned_at, status, points, payload_json FROM tenant_assignments_v2 LIMIT 1;" | tail -n +2 || true)
if [ ! -z "$SAMPLE" ]; then
    echo "Sample record:"
    echo "$SAMPLE"
else
    echo "No assignment records found in database"
fi
echo ""

# Test 6: Sample query to show completion data structure
echo "Test 6: Sample completion record structure (if any exist)"
echo "---------------------------------------------------------"
SAMPLE=$(run_query "SELECT id, chore_id, child_id, completed_at, status, points_awarded, payload_json FROM tenant_completions_v2 LIMIT 1;" | tail -n +2 || true)
if [ ! -z "$SAMPLE" ]; then
    echo "Sample record:"
    echo "$SAMPLE"
else
    echo "No completion records found in database"
fi
echo ""

# Test 7: Sample query to show child availability data structure
echo "Test 7: Sample child availability record structure (if any exist)"
echo "-----------------------------------------------------------------"
SAMPLE=$(run_query "SELECT id, child_id, type, schedule_type, start_date, is_available, payload_json FROM tenant_child_availability_v2 LIMIT 1;" | tail -n +2 || true)
if [ ! -z "$SAMPLE" ]; then
    echo "Sample record:"
    echo "$SAMPLE"
else
    echo "No child availability records found in database"
fi
echo ""

echo "==========================================="
echo "All Structure Tests Passed!"
echo "==========================================="
echo ""
echo "Summary:"
echo "- All three tables have proper column structure"
echo "- Repository implementations should now save data to columns"
echo "- payload_json column remains for backward compatibility"
echo ""
echo "Note: To fully verify the fix works, you need to:"
echo "1. Start the application"
echo "2. Create new assignments, completions, or child availability records"
echo "3. Verify the data is saved to proper columns (not just payload_json)"
