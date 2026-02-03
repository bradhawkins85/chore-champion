# Admin Panel Testing Guide

This document describes how to test the admin panel functionality.

## Prerequisites

Before testing, ensure:
1. Docker and Docker Compose are installed
2. The application is built and running
3. MySQL database is initialized

## Starting the Application

```bash
# Start all services
docker compose up -d

# Wait for services to be healthy
docker compose ps

# Check logs if needed
docker compose logs -f api
```

## Test 1: Create Admin User

### Using the promote-admin script (in Docker):

```bash
# Create a new admin user
docker compose exec api node dist/utils/promote-admin.js admin@test.com AdminPassword123!

# Expected output:
# ✅ Successfully created admin user!
# User details:
#   ID: <uuid>
#   Email: admin@test.com
#   Tenant ID: <uuid>
#   Role: admin
```

### Verify in database:

```bash
docker compose exec mysql mysql -uchorequest -pchorequest chorequest \
  -e "SELECT id, email, role FROM users WHERE email='admin@test.com';"

# Expected output:
# Should show the admin user with role='admin'
```

## Test 2: Admin Authentication

### Test admin login via API:

```bash
# Login as admin
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@test.com",
    "password": "AdminPassword123!"
  }'

# Expected response:
# {
#   "token": "<jwt-token>",
#   "user": {
#     "id": "<uuid>",
#     "email": "admin@test.com",
#     "tenantId": "<uuid>",
#     "role": "admin"
#   }
# }

# Save the token for subsequent requests
TOKEN="<paste-token-here>"
```

## Test 3: Access Admin Endpoints

### Test platform statistics:

```bash
curl http://localhost:3000/api/admin/stats \
  -H "Authorization: Bearer $TOKEN"

# Expected response:
# {
#   "totalTenants": 1,
#   "totalParents": 0,
#   "totalDevices": 0,
#   "recentSignups": 1,
#   "activeTenants": 0
# }
```

### Test tenant listing:

```bash
curl http://localhost:3000/api/admin/tenants \
  -H "Authorization: Bearer $TOKEN"

# Expected response:
# {
#   "tenants": [
#     {
#       "id": "<uuid>",
#       "created_at": "2024-...",
#       "updated_at": "2024-...",
#       "user_count": 1,
#       "device_count": 0,
#       "parent_emails": null
#     }
#   ]
# }
```

### Test parent user listing:

```bash
curl http://localhost:3000/api/admin/parents \
  -H "Authorization: Bearer $TOKEN"

# Expected response:
# {
#   "parents": []
# }
# (Empty because admin users are not counted as parents)
```

## Test 4: Create Regular Parent User

```bash
# Create a regular parent account via signup
curl -X POST http://localhost:3000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "email": "parent@test.com",
    "password": "ParentPassword123!"
  }'

# Now check admin endpoints again
curl http://localhost:3000/api/admin/stats \
  -H "Authorization: Bearer $TOKEN"

# Should show:
# {
#   "totalTenants": 2,
#   "totalParents": 1,
#   ...
# }
```

## Test 5: Delete Parent User

```bash
# First, get the parent user ID
curl http://localhost:3000/api/admin/parents \
  -H "Authorization: Bearer $TOKEN"

# Save the user ID from response
PARENT_ID="<parent-user-id>"

# Delete the parent user
curl -X DELETE http://localhost:3000/api/admin/parents/$PARENT_ID \
  -H "Authorization: Bearer $TOKEN"

# Expected response:
# {
#   "success": true,
#   "message": "Parent user deleted successfully",
#   "tenantDeleted": true
# }

# Verify deletion
curl http://localhost:3000/api/admin/parents \
  -H "Authorization: Bearer $TOKEN"

# Should return empty array
```

## Test 6: Non-Admin Access Denial

```bash
# Create a regular parent user
curl -X POST http://localhost:3000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "email": "parent2@test.com",
    "password": "ParentPassword123!"
  }'

# Login as parent
PARENT_TOKEN=$(curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "parent2@test.com",
    "password": "ParentPassword123!"
  }' | jq -r '.token')

# Try to access admin endpoint
curl http://localhost:3000/api/admin/stats \
  -H "Authorization: Bearer $PARENT_TOKEN"

# Expected response:
# {
#   "error": "Access denied. Admin role required."
# }
# HTTP Status: 403
```

## Test 7: Frontend Admin Panel Access

### With admin user:

1. Open browser to http://localhost:8080
2. Login with admin@test.com / AdminPassword123!
3. Navigate to http://localhost:8080/admin
4. Should see:
   - Stats dashboard with metrics
   - Tenants tab showing all tenants
   - Parent Users tab
   - Payments tab (placeholder)

### With regular parent:

1. Open browser in incognito/private mode
2. Login with parent2@test.com / ParentPassword123!
3. Try to navigate to http://localhost:8080/admin
4. Should be redirected to home page with "Access denied" message

## Test 8: Promote Existing User to Admin

```bash
# Promote parent2@test.com to admin
docker compose exec api node dist/utils/promote-admin.js parent2@test.com

# Expected output:
# ✅ Successfully promoted parent2@test.com to admin role!
# User details:
#   ID: <uuid>
#   Email: parent2@test.com
#   Tenant ID: <uuid>
#   New Role: admin

# Verify they can now access admin endpoints
PARENT2_TOKEN=$(curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "parent2@test.com",
    "password": "ParentPassword123!"
  }' | jq -r '.token')

curl http://localhost:3000/api/admin/stats \
  -H "Authorization: Bearer $PARENT2_TOKEN"

# Should return stats successfully
```

## Test 9: Payment Status (Placeholder)

```bash
curl http://localhost:3000/api/admin/payments \
  -H "Authorization: Bearer $TOKEN"

# Expected response:
# {
#   "payments": [
#     {
#       "tenantId": "<uuid>",
#       "status": "active",
#       "billingDate": "2024-...",
#       "users": 1,
#       "devices": 0,
#       "plan": "free",
#       "nextBillingDate": null,
#       "amount": 0
#     }
#   ],
#   "note": "This is a placeholder endpoint. Payment integration not yet implemented."
# }
```

## Common Issues and Solutions

### "Database is still initializing" error

Wait 30-60 seconds after starting services for MySQL to initialize and API to connect.

```bash
# Check API logs
docker compose logs api

# Should eventually see: "Database ready - API endpoints now available"
```

### "Cannot find module" when running promote-admin

Make sure the server is built:

```bash
cd server
npm run build
```

### Port already in use

```bash
# Stop existing containers
docker compose down

# Start fresh
docker compose up -d
```

### Admin panel shows "Access denied" even for admin user

1. Verify user role in database
2. Clear browser cookies/localStorage
3. Login again to get fresh JWT token with correct role

## Cleanup

```bash
# Stop all services
docker compose down

# Remove volumes (WARNING: deletes all data)
docker compose down -v

# Remove images
docker compose down --rmi all
```

## Success Criteria

- ✅ Admin user can be created via script
- ✅ Admin user can login and receive JWT token with admin role
- ✅ Admin user can access all `/api/admin/*` endpoints
- ✅ Regular parent users receive 403 error on admin endpoints
- ✅ Admin panel UI loads and displays data correctly
- ✅ Regular users cannot access `/admin` route
- ✅ Existing parent users can be promoted to admin
- ✅ Admin can view tenant and user statistics
- ✅ Admin can delete parent users
- ✅ Tenant is automatically deleted when last user is removed

## Performance Notes

The admin endpoints are designed to handle:
- Up to 10,000 tenants efficiently
- Pagination would be added for larger datasets
- Stats are calculated on-demand (could be cached in production)
