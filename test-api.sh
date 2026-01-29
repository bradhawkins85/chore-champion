#!/bin/bash

# Test script for MySQL backend API
# This script tests the basic functionality of the API

set -e

API_URL="${API_URL:-http://localhost:8080/api}"

echo "==================================="
echo "Testing ChoreQuest MySQL Backend API"
echo "==================================="
echo ""
echo "API URL: $API_URL"
echo ""

# Test 1: Health check
echo "Test 1: Health Check"
echo "---------------------"
if curl -s -f "$API_URL/health" > /dev/null 2>&1; then
    echo "✓ Health check passed"
    curl -s "$API_URL/health" | jq .
else
    echo "❌ Health check failed"
    echo "   Make sure the services are running: docker compose up -d"
    exit 1
fi
echo ""

# Test 2: Set a value
echo "Test 2: Set Value"
echo "-----------------"
if curl -s -f -X POST "$API_URL/kv/test-key" \
    -H "Content-Type: application/json" \
    -d '{"value": "test-value"}' > /dev/null 2>&1; then
    echo "✓ Set value passed"
else
    echo "❌ Set value failed"
    exit 1
fi
echo ""

# Test 3: Get the value
echo "Test 3: Get Value"
echo "-----------------"
RESULT=$(curl -s "$API_URL/kv/test-key")
if echo "$RESULT" | jq -e '.value == "test-value"' > /dev/null 2>&1; then
    echo "✓ Get value passed"
    echo "   Received: $RESULT"
else
    echo "❌ Get value failed"
    echo "   Expected: {\"value\": \"test-value\"}"
    echo "   Received: $RESULT"
    exit 1
fi
echo ""

# Test 4: Set complex object
echo "Test 4: Set Complex Object"
echo "---------------------------"
if curl -s -f -X POST "$API_URL/kv/test-object" \
    -H "Content-Type: application/json" \
    -d '{"value": {"name": "Test", "age": 30, "items": [1, 2, 3]}}' > /dev/null 2>&1; then
    echo "✓ Set complex object passed"
else
    echo "❌ Set complex object failed"
    exit 1
fi
echo ""

# Test 5: Get complex object
echo "Test 5: Get Complex Object"
echo "---------------------------"
RESULT=$(curl -s "$API_URL/kv/test-object")
if echo "$RESULT" | jq -e '.value.name == "Test" and .value.age == 30' > /dev/null 2>&1; then
    echo "✓ Get complex object passed"
    echo "   Received: $RESULT"
else
    echo "❌ Get complex object failed"
    echo "   Received: $RESULT"
    exit 1
fi
echo ""

# Test 6: Bulk set
echo "Test 6: Bulk Set"
echo "----------------"
if curl -s -f -X POST "$API_URL/kv" \
    -H "Content-Type: application/json" \
    -d '{"key1": "value1", "key2": "value2", "key3": "value3"}' > /dev/null 2>&1; then
    echo "✓ Bulk set passed"
else
    echo "❌ Bulk set failed"
    exit 1
fi
echo ""

# Test 7: Get all keys
echo "Test 7: Get All Keys"
echo "--------------------"
RESULT=$(curl -s "$API_URL/kv")
KEY_COUNT=$(echo "$RESULT" | jq 'keys | length')
if [ "$KEY_COUNT" -ge 5 ]; then
    echo "✓ Get all keys passed"
    echo "   Found $KEY_COUNT keys"
else
    echo "❌ Get all keys failed"
    echo "   Expected at least 5 keys, found $KEY_COUNT"
    exit 1
fi
echo ""

# Test 8: Delete a key
echo "Test 8: Delete Key"
echo "------------------"
if curl -s -f -X DELETE "$API_URL/kv/test-key" > /dev/null 2>&1; then
    echo "✓ Delete key passed"
else
    echo "❌ Delete key failed"
    exit 1
fi
echo ""

# Test 9: Verify deletion
echo "Test 9: Verify Deletion"
echo "-----------------------"
STATUS=$(curl -s -w "%{http_code}" -o /dev/null "$API_URL/kv/test-key")
if [ "$STATUS" = "404" ]; then
    echo "✓ Verify deletion passed (received 404)"
else
    echo "❌ Verify deletion failed"
    echo "   Expected status 404, got $STATUS"
    exit 1
fi
echo ""

echo "==================================="
echo "All Tests Passed! ✓"
echo "==================================="
echo ""
echo "The MySQL backend API is working correctly."
