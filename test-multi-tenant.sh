#!/bin/bash

# Test script for multi-tenant authentication
# This script tests the authentication endpoints and tenant isolation

set -e

API_URL="${API_URL:-http://localhost:3000/api}"
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "🧪 Testing Multi-Tenant Authentication"
echo "======================================="
echo ""
echo "API URL: $API_URL"
echo ""

# Function to test an endpoint
test_endpoint() {
    local name=$1
    local method=$2
    local endpoint=$3
    local data=$4
    local auth_token=$5
    local expected_status=$6

    echo -n "Testing $name... "
    
    if [ -n "$auth_token" ]; then
        if [ "$method" = "GET" ]; then
            response=$(curl -s -w "\n%{http_code}" -X $method "$API_URL$endpoint" \
                -H "Authorization: Bearer $auth_token" \
                -H "Content-Type: application/json")
        else
            response=$(curl -s -w "\n%{http_code}" -X $method "$API_URL$endpoint" \
                -H "Authorization: Bearer $auth_token" \
                -H "Content-Type: application/json" \
                -d "$data")
        fi
    else
        if [ "$method" = "GET" ]; then
            response=$(curl -s -w "\n%{http_code}" -X $method "$API_URL$endpoint" \
                -H "Content-Type: application/json")
        else
            response=$(curl -s -w "\n%{http_code}" -X $method "$API_URL$endpoint" \
                -H "Content-Type: application/json" \
                -d "$data")
        fi
    fi

    status_code=$(echo "$response" | tail -n 1)
    body=$(echo "$response" | head -n -1)

    if [ "$status_code" -eq "$expected_status" ]; then
        echo -e "${GREEN}✓ PASS${NC} (Status: $status_code)"
        echo "$body"
        return 0
    else
        echo -e "${RED}✗ FAIL${NC} (Expected: $expected_status, Got: $status_code)"
        echo "Response: $body"
        return 1
    fi
}

# Test 1: Health check
echo "1. Health Check"
test_endpoint "Health endpoint" "GET" "/health" "" "" 200
echo ""

# Test 2: Sign up first user
echo "2. Sign Up First User"
TIMESTAMP=$(date +%s)
USER1_EMAIL="parent1_${TIMESTAMP}@test.com"
USER1_PASSWORD="testpass123"

SIGNUP_RESPONSE=$(test_endpoint "Signup" "POST" "/auth/signup" \
    "{\"email\":\"$USER1_EMAIL\",\"password\":\"$USER1_PASSWORD\"}" "" 201)

USER1_TOKEN=$(echo "$SIGNUP_RESPONSE" | jq -r '.token' 2>/dev/null || echo "")
USER1_TENANT=$(echo "$SIGNUP_RESPONSE" | jq -r '.user.tenantId' 2>/dev/null || echo "")

if [ -z "$USER1_TOKEN" ] || [ "$USER1_TOKEN" = "null" ]; then
    echo -e "${RED}✗ Failed to get token from signup${NC}"
    exit 1
fi

echo "User 1 Token: ${USER1_TOKEN:0:20}..."
echo "User 1 Tenant: $USER1_TENANT"
echo ""

# Test 3: Get current user info
echo "3. Get Current User Info"
test_endpoint "Get me" "GET" "/auth/me" "" "$USER1_TOKEN" 200
echo ""

# Test 4: Create some data for user 1
echo "4. Store Data for User 1"
test_endpoint "Store KV data" "POST" "/kv/test-key" \
    "{\"value\":\"user1-data\"}" "$USER1_TOKEN" 200
echo ""

# Test 5: Retrieve data for user 1
echo "5. Retrieve Data for User 1"
test_endpoint "Get KV data" "GET" "/kv/test-key" "" "$USER1_TOKEN" 200
echo ""

# Test 6: Sign up second user (different tenant)
echo "6. Sign Up Second User (Different Tenant)"
USER2_EMAIL="parent2_${TIMESTAMP}@test.com"
USER2_PASSWORD="testpass456"

SIGNUP2_RESPONSE=$(test_endpoint "Signup user 2" "POST" "/auth/signup" \
    "{\"email\":\"$USER2_EMAIL\",\"password\":\"$USER2_PASSWORD\"}" "" 201)

USER2_TOKEN=$(echo "$SIGNUP2_RESPONSE" | jq -r '.token' 2>/dev/null || echo "")
USER2_TENANT=$(echo "$SIGNUP2_RESPONSE" | jq -r '.user.tenantId' 2>/dev/null || echo "")

if [ -z "$USER2_TOKEN" ] || [ "$USER2_TOKEN" = "null" ]; then
    echo -e "${RED}✗ Failed to get token from signup${NC}"
    exit 1
fi

echo "User 2 Token: ${USER2_TOKEN:0:20}..."
echo "User 2 Tenant: $USER2_TENANT"
echo ""

# Test 7: Verify tenant isolation - user 2 should not see user 1's data
echo "7. Verify Tenant Isolation"
echo "User 2 trying to access User 1's data..."
ISOLATION_RESPONSE=$(curl -s "$API_URL/kv/test-key" \
    -H "Authorization: Bearer $USER2_TOKEN" \
    -H "Content-Type: application/json")

if echo "$ISOLATION_RESPONSE" | grep -q '"value":null\|null'; then
    echo -e "${GREEN}✓ PASS${NC} - User 2 cannot see User 1's data"
    echo "Response: $ISOLATION_RESPONSE"
else
    echo -e "${RED}✗ FAIL${NC} - User 2 can see User 1's data (SECURITY ISSUE!)"
    echo "Response: $ISOLATION_RESPONSE"
    exit 1
fi
echo ""

# Test 8: Add second parent to user 1's tenant
echo "8. Add Second Parent to User 1's Tenant"
PARENT2_EMAIL="parent3_${TIMESTAMP}@test.com"
PARENT2_PASSWORD="testpass789"

test_endpoint "Add parent" "POST" "/auth/add-parent" \
    "{\"email\":\"$PARENT2_EMAIL\",\"password\":\"$PARENT2_PASSWORD\"}" "$USER1_TOKEN" 201
echo ""

# Test 9: Login with second parent
echo "9. Login with Second Parent"
LOGIN_RESPONSE=$(test_endpoint "Login" "POST" "/auth/login" \
    "{\"email\":\"$PARENT2_EMAIL\",\"password\":\"$PARENT2_PASSWORD\"}" "" 200)

PARENT2_TOKEN=$(echo "$LOGIN_RESPONSE" | jq -r '.token' 2>/dev/null || echo "")
PARENT2_TENANT=$(echo "$LOGIN_RESPONSE" | jq -r '.user.tenantId' 2>/dev/null || echo "")

echo "Parent 2 Token: ${PARENT2_TOKEN:0:20}..."
echo "Parent 2 Tenant: $PARENT2_TENANT"
echo ""

# Test 10: Verify second parent can access same tenant data
echo "10. Verify Second Parent Can Access Same Tenant Data"
echo "Second parent trying to access User 1's data..."
SHARED_RESPONSE=$(curl -s "$API_URL/kv/test-key" \
    -H "Authorization: Bearer $PARENT2_TOKEN" \
    -H "Content-Type: application/json")

if echo "$SHARED_RESPONSE" | grep -q '"value":"user1-data"'; then
    echo -e "${GREEN}✓ PASS${NC} - Second parent can access shared tenant data"
    echo "Response: $SHARED_RESPONSE"
else
    echo -e "${RED}✗ FAIL${NC} - Second parent cannot access shared tenant data"
    echo "Response: $SHARED_RESPONSE"
    exit 1
fi
echo ""

# Test 11: Verify tenants are different
echo "11. Verify Tenants Are Different"
if [ "$USER1_TENANT" != "$USER2_TENANT" ]; then
    echo -e "${GREEN}✓ PASS${NC} - User 1 and User 2 have different tenants"
    echo "User 1 Tenant: $USER1_TENANT"
    echo "User 2 Tenant: $USER2_TENANT"
else
    echo -e "${RED}✗ FAIL${NC} - User 1 and User 2 have the same tenant"
    exit 1
fi
echo ""

# Test 12: Verify second parent shares tenant with user 1
echo "12. Verify Second Parent Shares Tenant with User 1"
if [ "$USER1_TENANT" = "$PARENT2_TENANT" ]; then
    echo -e "${GREEN}✓ PASS${NC} - Second parent shares tenant with User 1"
    echo "User 1 Tenant: $USER1_TENANT"
    echo "Parent 2 Tenant: $PARENT2_TENANT"
else
    echo -e "${RED}✗ FAIL${NC} - Second parent does not share tenant with User 1"
    exit 1
fi
echo ""

# Test 13: Get tenant users
echo "13. Get Tenant Users"
test_endpoint "Get tenant users" "GET" "/auth/tenant-users" "" "$USER1_TOKEN" 200
echo ""

# Summary
echo ""
echo "======================================="
echo -e "${GREEN}✅ All tests passed!${NC}"
echo "======================================="
echo ""
echo "Summary:"
echo "  - User 1 Email: $USER1_EMAIL"
echo "  - User 1 Tenant: $USER1_TENANT"
echo "  - User 2 Email: $USER2_EMAIL"
echo "  - User 2 Tenant: $USER2_TENANT"
echo "  - Second Parent Email: $PARENT2_EMAIL"
echo "  - Second Parent Tenant: $PARENT2_TENANT"
echo ""
echo "✅ Multi-tenant isolation verified"
echo "✅ Second parent sharing verified"
