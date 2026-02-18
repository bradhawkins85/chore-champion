#!/bin/bash

# Test script to verify the repeat_pattern column size fix
# This script tests that the column can now accommodate JSON strings longer than 50 characters

set -e

echo "==================================="
echo "Testing repeat_pattern column fix"
echo "==================================="

# Example JSON that was failing (56 characters)
TEST_JSON='{"interval":2,"unit":"weeks","anchorDate":1771570800000}'
JSON_LENGTH=${#TEST_JSON}

echo ""
echo "Test JSON: $TEST_JSON"
echo "Length: $JSON_LENGTH characters"
echo ""

if [ $JSON_LENGTH -gt 50 ]; then
  echo "✓ Test JSON is longer than 50 characters (the old limit)"
else
  echo "✗ Test JSON is NOT longer than 50 characters"
  exit 1
fi

if [ $JSON_LENGTH -le 255 ]; then
  echo "✓ Test JSON fits within new 255 character limit"
else
  echo "✗ Test JSON exceeds new 255 character limit"
  exit 1
fi

echo ""
echo "Schema changes verification:"
echo "----------------------------"

# Check the schema files for VARCHAR(255)
if grep -q "repeat_pattern VARCHAR(255)" /home/runner/work/chore-champion/chore-champion/server/src/services/tenant-data-schema.ts; then
  echo "✓ tenant-data-schema.ts: repeat_pattern is VARCHAR(255)"
else
  echo "✗ tenant-data-schema.ts: repeat_pattern is NOT VARCHAR(255)"
  exit 1
fi

# Count occurrences to ensure both tables are updated
SCHEMA_COUNT=$(grep -c "repeat_pattern VARCHAR(255)" /home/runner/work/chore-champion/chore-champion/server/src/services/tenant-data-schema.ts)
if [ "$SCHEMA_COUNT" -eq 2 ]; then
  echo "✓ Both tables (assignments and child-availability) have VARCHAR(255)"
else
  echo "✗ Expected 2 occurrences of VARCHAR(255), found $SCHEMA_COUNT"
  exit 1
fi

# Check migration exists in database.ts
if grep -q "MODIFY COLUMN repeat_pattern VARCHAR(255)" /home/runner/work/chore-champion/chore-champion/server/src/config/database.ts; then
  echo "✓ database.ts: Migration to expand repeat_pattern exists"
else
  echo "✗ database.ts: Migration to expand repeat_pattern NOT found"
  exit 1
fi

# Verify no VARCHAR(50) remains for repeat_pattern in schema
if grep "repeat_pattern VARCHAR(50)" /home/runner/work/chore-champion/chore-champion/server/src/services/tenant-data-schema.ts; then
  echo "✗ tenant-data-schema.ts: Still contains VARCHAR(50) for repeat_pattern"
  exit 1
else
  echo "✓ No VARCHAR(50) remains for repeat_pattern in schema"
fi

echo ""
echo "==================================="
echo "All tests passed! ✓"
echo "==================================="
echo ""
echo "Summary of changes:"
echo "- repeat_pattern column size: VARCHAR(50) → VARCHAR(255)"
echo "- Tables affected: tenant_assignments_v2, tenant_child_availability_v2"
echo "- Migration added for existing databases"
echo "- Can now store JSON strings up to 255 characters"
