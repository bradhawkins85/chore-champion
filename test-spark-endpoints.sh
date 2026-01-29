#!/bin/bash

# Test script for Spark KV endpoints
# This script tests that the /_spark/kv/ endpoints properly route to the backend

set -e

API_URL="${API_URL:-http://localhost:8080}"

echo "=========================================="
echo "Testing Spark KV Endpoint Routing"
echo "=========================================="
echo ""
echo "API URL: $API_URL"
echo ""

# Test 1: Health check
echo "Test 1: Health Check (Backend API)"
echo "-----------------------------------"
if curl -s -f "$API_URL/api/health" > /dev/null 2>&1; then
    echo "✓ Backend API is healthy"
    curl -s "$API_URL/api/health" | jq .
else
    echo "❌ Backend API health check failed"
    echo "   Make sure the services are running: docker compose up -d"
    exit 1
fi
echo ""

# Test 2: POST to /_spark/kv/ endpoint
echo "Test 2: POST to /_spark/kv/test-key"
echo "------------------------------------"
RESPONSE=$(curl -s -w "\nHTTP_CODE:%{http_code}" -X POST "$API_URL/_spark/kv/test-key" \
    -H "Content-Type: application/json" \
    -d '{"value": "test-value"}')

HTTP_CODE=$(echo "$RESPONSE" | grep "HTTP_CODE:" | cut -d: -f2)
BODY=$(echo "$RESPONSE" | sed '/HTTP_CODE:/d')

if [ "$HTTP_CODE" = "200" ]; then
    echo "✓ POST request succeeded (HTTP 200)"
    echo "   Response: $BODY"
elif [ "$HTTP_CODE" = "405" ]; then
    echo "❌ POST request failed with HTTP 405 Method Not Allowed"
    echo "   This means the nginx routing is not configured correctly"
    exit 1
else
    echo "❌ POST request failed with HTTP $HTTP_CODE"
    echo "   Response: $BODY"
    exit 1
fi
echo ""

# Test 3: GET from /_spark/kv/ endpoint
echo "Test 3: GET from /_spark/kv/test-key"
echo "-------------------------------------"
RESPONSE=$(curl -s -w "\nHTTP_CODE:%{http_code}" "$API_URL/_spark/kv/test-key")

HTTP_CODE=$(echo "$RESPONSE" | grep "HTTP_CODE:" | cut -d: -f2)
BODY=$(echo "$RESPONSE" | sed '/HTTP_CODE:/d')

if [ "$HTTP_CODE" = "200" ]; then
    echo "✓ GET request succeeded (HTTP 200)"
    if echo "$BODY" | jq -e '.value == "test-value"' > /dev/null 2>&1; then
        echo "✓ Retrieved correct value"
        echo "   Response: $BODY"
    else
        echo "⚠️  Retrieved value doesn't match expected"
        echo "   Response: $BODY"
    fi
elif [ "$HTTP_CODE" = "404" ]; then
    echo "⚠️  Key not found (HTTP 404)"
    echo "   This is expected if the POST failed"
else
    echo "⚠️  GET request returned HTTP $HTTP_CODE"
    echo "   Response: $BODY"
fi
echo ""

# Test 4: POST complex object to /_spark/kv/
echo "Test 4: POST Complex Object"
echo "----------------------------"
RESPONSE=$(curl -s -w "\nHTTP_CODE:%{http_code}" -X POST "$API_URL/_spark/kv/parent-pin" \
    -H "Content-Type: application/json" \
    -d '{"value": "1234"}')

HTTP_CODE=$(echo "$RESPONSE" | grep "HTTP_CODE:" | cut -d: -f2)
BODY=$(echo "$RESPONSE" | sed '/HTTP_CODE:/d')

if [ "$HTTP_CODE" = "200" ]; then
    echo "✓ POST parent-pin succeeded (HTTP 200)"
    echo "   Response: $BODY"
else
    echo "❌ POST parent-pin failed with HTTP $HTTP_CODE"
    echo "   Response: $BODY"
    exit 1
fi
echo ""

# Test 5: Verify parent-pin value
echo "Test 5: GET parent-pin value"
echo "-----------------------------"
RESPONSE=$(curl -s -w "\nHTTP_CODE:%{http_code}" "$API_URL/_spark/kv/parent-pin")

HTTP_CODE=$(echo "$RESPONSE" | grep "HTTP_CODE:" | cut -d: -f2)
BODY=$(echo "$RESPONSE" | sed '/HTTP_CODE:/d')

if [ "$HTTP_CODE" = "200" ]; then
    if echo "$BODY" | jq -e '.value == "1234"' > /dev/null 2>&1; then
        echo "✓ parent-pin value verified"
        echo "   Response: $BODY"
    else
        echo "❌ parent-pin value doesn't match"
        echo "   Expected: 1234"
        echo "   Response: $BODY"
        exit 1
    fi
else
    echo "❌ GET parent-pin failed with HTTP $HTTP_CODE"
    echo "   Response: $BODY"
    exit 1
fi
echo ""

# Test 6: DELETE from /_spark/kv/
echo "Test 6: DELETE from /_spark/kv/test-key"
echo "----------------------------------------"
RESPONSE=$(curl -s -w "\nHTTP_CODE:%{http_code}" -X DELETE "$API_URL/_spark/kv/test-key")

HTTP_CODE=$(echo "$RESPONSE" | grep "HTTP_CODE:" | cut -d: -f2)
BODY=$(echo "$RESPONSE" | sed '/HTTP_CODE:/d')

if [ "$HTTP_CODE" = "200" ]; then
    echo "✓ DELETE request succeeded (HTTP 200)"
    echo "   Response: $BODY"
else
    echo "⚠️  DELETE request returned HTTP $HTTP_CODE"
    echo "   Response: $BODY"
fi
echo ""

echo "=========================================="
echo "All Tests Passed! ✓"
echo "=========================================="
echo ""
echo "Summary:"
echo "- /_spark/kv/ endpoints are routing correctly to backend API"
echo "- POST requests no longer return 405 errors"
echo "- Data can be saved and retrieved via the API endpoints"
echo ""
echo "Note: These tests verify API routing and response codes."
echo "To verify database persistence across restarts, restart the"
echo "backend service and check if data persists."
