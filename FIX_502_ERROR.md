# Fix for 502 Bad Gateway Error on Login

## Problem Description

Users were experiencing a 502 Bad Gateway error when trying to log in to the application at `https://chores.hawkinsfamily.com.au`. The browser console showed:

```
GET https://chores.hawkinsfamily.com.au/api/health 502 (Bad Gateway)
Unexpected token '<', "<!DOCTYPE ..." is not valid JSON
```

## Root Cause Analysis

The issue was caused by the API server's startup sequence:

1. **Original Behavior**: The API server (`server/src/index.ts`) would attempt to initialize the database connection before starting the HTTP server
2. **Failure Mode**: If the MySQL database wasn't immediately available (common in Docker environments where services start in parallel), the database initialization would fail
3. **Catastrophic Result**: When database initialization failed, the entire server would exit with `process.exit(1)`, leaving NO HTTP server running
4. **502 Error**: With no backend server running, nginx would return a 502 Bad Gateway error when trying to proxy `/api/*` requests
5. **JSON Parse Error**: The browser would receive nginx's HTML error page instead of JSON, causing the "Unexpected token '<'" error

## Solution Implemented

The fix implements a more resilient startup sequence with graceful degradation:

### 1. Start HTTP Server Immediately (`server/src/index.ts`)

```typescript
async function start() {
  // Start HTTP server immediately, even if database is not ready
  const server = app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Health check: http://localhost:${PORT}/api/health`);
  });
  
  // Initialize database in background with retries...
}
```

**Key Change**: The HTTP server now starts immediately, regardless of database status.

### 2. Database Connection Status Tracking

```typescript
let dbReady = false;

// Health check - always responds, but indicates if DB is ready
app.get('/api/health', (req, res) => {
  res.json({ 
    status: dbReady ? 'ok' : 'starting',
    database: dbReady ? 'connected' : 'connecting',
    timestamp: new Date().toISOString() 
  });
});
```

**Key Change**: The health endpoint now always responds (200 OK), but indicates whether the database is ready.

### 3. Database Initialization with Retry Logic

```typescript
async function initDbWithRetry() {
  try {
    await initDatabase();
    dbReady = true;
    console.log('Database ready - API endpoints now available');
  } catch (error) {
    retryCount++;
    if (retryCount >= maxRetries) {
      console.error('Failed to initialize database. Server continues but API returns 503.');
      return;
    }
    // Exponential backoff: 2s, 4s, 8s, 16s, 32s (capped)
    const delay = Math.min(2000 * Math.pow(2, retryCount - 1), 32000);
    console.log(`Retrying database initialization in ${delay}ms...`);
    setTimeout(initDbWithRetry, delay);
  }
}
```

**Key Changes**: 
- Database initialization runs in the background
- Uses exponential backoff for retries (up to 30 attempts over ~5 minutes)
- Server stays running even if database never connects

### 4. Database Readiness Middleware

```typescript
const requireDb = (req, res, next) => {
  if (!dbReady) {
    return res.status(503).json({ 
      error: 'Service temporarily unavailable',
      message: 'Database is still initializing. Please try again in a moment.',
      status: 503
    });
  }
  next();
};

// Protect API routes that need database
app.use('/api/kv', requireDb, kvRoutes);
app.use('/api/auth', requireDb, authRoutes);
// ... etc
```

**Key Change**: API endpoints return proper 503 (Service Unavailable) responses with helpful error messages instead of 502 errors.

### 5. Enhanced Frontend Error Handling (`src/contexts/AuthContext.tsx`)

```typescript
if (!response.ok) {
  // Handle service unavailable error
  if (response.status === 503) {
    throw new Error('Service is starting up. Please wait a moment and try again.');
  }
  
  try {
    const error = await response.json();
    throw new Error(error.error || error.message || 'Login failed');
  } catch (parseError) {
    // If response is not JSON (e.g., HTML error page from nginx)
    throw new Error(`Server error (${response.status}). Please check if the service is running.`);
  }
}
```

**Key Changes**:
- Specifically handles 503 errors with user-friendly messages
- Gracefully handles non-JSON responses (like HTML error pages)
- Provides clear error messages instead of cryptic JSON parse errors

### 6. Updated Docker Healthchecks

Updated healthcheck in `docker-compose.yml` and `docker-compose.prod.yml`:

```yaml
healthcheck:
  test: ["CMD", "sh", "-c", "wget --no-verbose --tries=1 -O- http://127.0.0.1:3000/api/health | grep -E '(\"status\":\"ok\"|\"status\":\"starting\")'"]
  interval: 30s
  timeout: 3s
  retries: 3
  start_period: 40s  # Increased to allow for database initialization
```

**Key Changes**:
- Accepts both "ok" and "starting" statuses as healthy
- Increased start_period from 10s to 40s to allow database initialization
- Container is marked healthy even during database connection phase

## Benefits of This Solution

1. **No More 502 Errors**: The HTTP server always runs, eliminating 502 Bad Gateway errors
2. **Graceful Degradation**: Service responds with proper HTTP 503 status during startup
3. **User-Friendly Messages**: Clear error messages guide users ("Service is starting up...")
4. **Automatic Recovery**: Database connection retries automatically without manual intervention
5. **Production Ready**: Handles Docker/Kubernetes scenarios where services start at different times
6. **Monitoring Friendly**: Health endpoint provides detailed status for monitoring tools
7. **Zero Downtime Updates**: Server can restart and handle requests while waiting for database

## Testing Recommendations

1. **Test with Database Down**: 
   ```bash
   docker-compose stop mysql
   docker-compose restart api
   # API should start and respond to health checks
   ```

2. **Test Database Recovery**:
   ```bash
   docker-compose start mysql
   # API should automatically connect within ~30 seconds
   ```

3. **Test Login During Startup**:
   - Restart services
   - Immediately try to login
   - Should see clear "Service is starting up" message

4. **Monitor Logs**:
   ```bash
   docker-compose logs -f api
   # Should see: "Server running on port 3000"
   # Then: "Initializing database..."
   # Finally: "Database ready - API endpoints now available"
   ```

## Deployment Notes

- This fix is backward compatible with existing deployments
- No database migrations required
- No configuration changes needed
- Works with all docker-compose variants (dev, prod, traefik)

## Related Files Changed

1. `server/src/index.ts` - Main server startup logic
2. `src/contexts/AuthContext.tsx` - Frontend error handling
3. `docker-compose.yml` - Healthcheck configuration
4. `docker-compose.prod.yml` - Production healthcheck configuration
