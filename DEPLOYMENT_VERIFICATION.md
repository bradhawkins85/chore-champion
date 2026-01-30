# MySQL Startup Issues - Deployment Verification Checklist

## Overview
This document provides a checklist for verifying the MySQL startup issue fixes.

## Pre-Deployment Verification

### Code Changes Summary
- ✅ Added centralized `ARRAY_KEYS` constant for known array keys
- ✅ Added array validation on GET endpoints (single and bulk)
- ✅ Added array validation on POST endpoints (single and bulk) to prevent corruption at write time
- ✅ Added `/_spark/loaded` endpoint
- ✅ Updated nginx configuration for the loaded endpoint
- ✅ Enhanced error logging for better debugging
- ✅ Code review completed and feedback addressed
- ✅ CodeQL security scan passed with 0 alerts

## Deployment Steps

### 1. Build and Deploy
```bash
# Stop existing containers
docker-compose down

# Rebuild with new changes
docker-compose build

# Start services
docker-compose up -d

# Verify all services are running
docker-compose ps
```

### 2. Initial Health Check
```bash
# Check API health
curl http://localhost:8080/api/health

# Should return: {"status":"ok","timestamp":"..."}
```

### 3. Test Loaded Endpoint
```bash
# Test the new /_spark/loaded endpoint
curl -X POST http://localhost:8080/_spark/loaded \
  -H "Content-Type: application/json" \
  -d '{}'

# Should return: {"success":true}
# Should NOT return 405 error
```

### 4. Monitor Logs
```bash
# Watch API logs for any warnings or errors
docker-compose logs -f api

# Look for:
# - Successful startup messages
# - No warnings about array type mismatches (unless fixing existing corruption)
# - No 405 errors for /_spark/loaded
```

## Application Testing

### 5. Browser Testing

1. **Open the application**
   - Navigate to http://localhost:8080 (or your domain)
   - Clear browser cache if needed (Ctrl+Shift+Delete)

2. **Check for errors**
   - Open browser developer console (F12)
   - Look for:
     - ✅ No "forEach is not a function" errors
     - ✅ No "c is not iterable" errors
     - ✅ No "L.some is not a function" errors
     - ✅ No 405 errors for `/_spark/loaded`

3. **Test basic functionality**
   - Create a new child
   - Create a new chore
   - Assign a chore to a child
   - Complete a chore
   - Create a reward
   - Purchase a reward
   - Check that all operations work without errors

### 6. Data Integrity Testing

```bash
# Test that array validation works
# Try to set a non-array value for an array key
curl -X POST http://localhost:8080/api/kv/chores \
  -H "Content-Type: application/json" \
  -d '{"value": "not-an-array"}'

# Should return 400 error:
# {"error":"Key \"chores\" must be an array","received":"string"}
```

```bash
# Verify that valid arrays are accepted
curl -X POST http://localhost:8080/api/kv/test-chores \
  -H "Content-Type: application/json" \
  -d '{"value": []}'

# Should return: {"success":true}
```

## Troubleshooting

### If you see array type warnings in logs

Example log:
```
Key "chores" should be an array but got: string not-an-array
```

This means there's existing corrupted data in the database. The fix:

```bash
# Option 1: Delete the corrupted key (data loss)
curl -X DELETE http://localhost:8080/api/kv/chores

# Option 2: Set it to empty array
curl -X POST http://localhost:8080/api/kv/chores \
  -H "Content-Type: application/json" \
  -d '{"value": []}'

# Option 3: If you have a backup, restore the correct data
```

### If you still see errors in browser

1. **Clear browser cache completely**
   ```
   - Chrome/Edge: Ctrl+Shift+Delete → Check "Cached images and files"
   - Firefox: Ctrl+Shift+Delete → Check "Cache"
   - Safari: Cmd+Option+E
   ```

2. **Check for service worker issues**
   - Open DevTools (F12)
   - Go to Application → Service Workers
   - Click "Unregister" if there's an old service worker
   - Refresh the page

3. **Verify the correct version is deployed**
   ```bash
   # Check the Git commit hash in the container
   docker exec chorequest-api git log -1 --oneline
   
   # Should show the commit with the fixes
   ```

### If 405 errors persist for /_spark/loaded

1. **Check nginx configuration**
   ```bash
   # Verify nginx config is correct
   docker exec chorequest-app cat /etc/nginx/conf.d/default.conf | grep -A10 "/_spark/loaded"
   ```

2. **Restart nginx**
   ```bash
   docker-compose restart app
   ```

3. **Check nginx logs**
   ```bash
   docker-compose logs app
   ```

## Success Criteria

The deployment is successful when:

- ✅ All three services (mysql, api, app) are running and healthy
- ✅ API health endpoint returns 200 OK
- ✅ `/_spark/loaded` endpoint returns 200 OK (not 405)
- ✅ No errors in browser console on page load
- ✅ No "forEach is not a function" errors
- ✅ No "c is not iterable" errors
- ✅ All CRUD operations work (create/read/update/delete chores, children, rewards)
- ✅ API logs show no array type mismatches (or if they do, corrupted data is being fixed automatically)

## Rollback Plan

If issues persist after deployment:

```bash
# Stop services
docker-compose down

# Checkout previous version
git checkout <previous-commit-hash>

# Rebuild and restart
docker-compose build
docker-compose up -d
```

## Post-Deployment Monitoring

For the first 24 hours after deployment, monitor:

1. **API logs for warnings**
   ```bash
   docker-compose logs -f api | grep -i "warn\|error"
   ```

2. **User reports of errors** - ask users to report any issues

3. **Database integrity** - periodically check for corrupted data:
   ```bash
   curl http://localhost:8080/api/kv | jq .
   ```

## Additional Notes

- The fix is backward compatible - existing data is preserved
- Array validation only applies to known array keys; other keys are unaffected
- Write-time validation prevents new corruption from being introduced
- Read-time validation ensures the app doesn't crash on existing corruption
- Enhanced logging helps identify and debug any remaining issues

## Support

If issues persist:
1. Check the logs: `docker-compose logs api`
2. Review MYSQL_FIX_SUMMARY.md for technical details
3. Check GitHub issues for similar problems
4. Provide logs and error messages when reporting issues
