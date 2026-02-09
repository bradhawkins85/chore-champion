# Automated Screen Refresh Feature

## Overview

ChoreQuest includes an automated screen refresh feature that detects when the backend server becomes unavailable (such as during software upgrades) and automatically refreshes the page when the server comes back online. This prevents users from losing data by attempting to interact with the app while the server is down.

## The Problem

During software upgrades or server maintenance:
1. The backend API becomes temporarily unavailable
2. The frontend continues to work due to Progressive Web App (PWA) capabilities and service workers
3. Users can still interact with the UI - marking chores, changing settings, etc.
4. These changes are not persisted to the server and are lost when the app is refreshed
5. Users are unaware that their actions aren't being saved

## The Solution

The automated refresh feature:
1. **Monitors server availability** - Continuously checks the backend API health
2. **Alerts users** - Displays a prominent warning when the server is unavailable
3. **Auto-refreshes** - Automatically reloads the page when the server comes back online
4. **Prevents data loss** - Users are clearly informed that changes won't be saved

## How It Works

### Server Status Monitoring

The `useServerStatus` hook polls the `/api/health` endpoint every 10 seconds:

```typescript
// Health check runs every 10 seconds
const HEALTH_CHECK_INTERVAL = 10000

// Server is considered offline after 2 consecutive failures (20 seconds total)
const OFFLINE_THRESHOLD = 2
```

### User Interface

When the server becomes unavailable, users see a yellow warning banner at the top of the screen:

- **Title**: "Server Temporarily Unavailable"
- **Duration**: How long the server has been offline (updates every second)
- **Warning**: "Changes will not be saved until reconnected"
- **Notice**: "Page will auto-refresh when server is back online"
- **Action**: Manual "Refresh Now" button (for immediate refresh)

### Automatic Refresh on Reconnect

When the server comes back online:
1. The system detects the server is available again
2. A green notification banner appears: "Server Back Online"
3. After 1 second, the page automatically refreshes to load the latest updates
4. Users can also click "Refresh Now" to refresh immediately
5. The notification stays visible until the auto-refresh occurs

### Supported Pages

The offline indicator works on all pages, including:
- Login/authentication page
- Child view
- Parent panel
- Settings screens
- All other app pages

## Technical Implementation

### Components

1. **`useServerStatus` Hook** (`src/hooks/use-server-status.ts`)
   - Manages health check polling
   - Tracks server online/offline state
   - Handles auto-refresh logic
   - Manages cache clearing

2. **`OfflineIndicator` Component** (`src/components/OfflineIndicator.tsx`)
   - Displays network and server status
   - Shows offline duration counter
   - Provides manual refresh button
   - Differentiates between network offline and server offline

### Health Check Endpoint

The feature uses the existing `/api/health` endpoint:

```javascript
// Backend endpoint (server/src/index.ts)
app.get('/api/health', (req, res) => {
  res.json({ 
    status: dbReady ? 'ok' : 'starting',
    database: dbReady ? 'connected' : 'connecting',
    timestamp: new Date().toISOString() 
  });
});
```

### Configuration

Key configuration values in `useServerStatus`:

```typescript
const API_URL = import.meta.env.VITE_API_URL || '/api'
const HEALTH_CHECK_INTERVAL = 10000 // Check every 10 seconds
const HEALTH_CHECK_TIMEOUT = 5000   // 5 second timeout per check
const OFFLINE_THRESHOLD = 2         // Consider offline after 2 failures
```

## User Experience

### During Normal Operation
- No indicator is shown
- Health checks run silently in the background
- Zero impact on user experience

### When Server Goes Offline
1. User continues using the app normally
2. After 20 seconds (2 failed health checks), warning banner appears
3. Banner shows current offline duration
4. User is warned that changes won't be saved
5. User can continue viewing data but knows not to make changes

### When Server Comes Back Online
1. Health check succeeds
2. Green notification banner appears: "Server Back Online"
3. After 1 second, page automatically refreshes
4. User sees the updated application
5. Normal operation resumes

### Manual Refresh Option
- Users can click "Refresh Now" to immediately reload
- Available both during offline state and after server reconnects
- Useful if they don't want to wait for auto-refresh
- Clears browser caches before refreshing

## Differences from Network Offline

The feature distinguishes between two types of offline states:

### Network Offline (Device has no internet)
- Red banner
- "No Internet Connection"
- "Working in offline mode"
- No auto-refresh (can't connect anyway)

### Server Offline (Network OK, but server unavailable)
- Yellow/orange banner
- "Server Temporarily Unavailable"
- Shows offline duration
- Auto-refreshes when server returns

## Software Upgrade Workflow

### Before This Feature
1. Admin triggers software upgrade
2. Server goes down for 1-3 minutes
3. Users continue using cached app
4. Users mark chores, change settings
5. Changes are lost (not saved to server)
6. Users confused about missing data

### With This Feature
1. Admin triggers software upgrade
2. Server goes down for 1-3 minutes
3. After 20 seconds, yellow warning appears
4. Users see clear message: "Changes will not be saved"
5. Users wait or view data only
6. Server comes back online
7. Green "Server Back Online" notification appears
8. Page auto-refreshes after 1 second
9. Users resume normal operation with new version
10. No data loss, no confusion

## Benefits

1. **Prevents Data Loss** - Users know when their actions won't be saved
2. **Automatic Recovery** - Page refreshes automatically when server returns
3. **Clear Communication** - Visual indicator with helpful messages
4. **Smooth Upgrades** - Software updates handled gracefully
5. **Works Everywhere** - Active on all pages, even before login
6. **Optimized Performance** - Health checks don't cause unnecessary re-renders

## Maintenance

### Adjusting Check Intervals

To change how often the app checks server status:

```typescript
// In src/hooks/use-server-status.ts
const HEALTH_CHECK_INTERVAL = 10000 // Adjust this value (milliseconds)
```

Considerations:
- Lower values = faster detection but more server load
- Higher values = less server load but slower detection
- Current 10 seconds is a good balance

### Changing Offline Threshold

To adjust how many failures before showing warning:

```typescript
// In src/hooks/use-server-status.ts
const OFFLINE_THRESHOLD = 2 // Adjust this value (number of failures)
```

Considerations:
- Lower threshold = faster warning but more false positives
- Higher threshold = fewer false positives but slower warning
- Current 2 failures (20 seconds) is reasonable

## Testing

### Manual Testing

1. **Start the application**
   ```bash
   npm run dev
   ```

2. **Open the app in a browser**
   - Navigate to `http://localhost:5000`

3. **Stop the backend server**
   - This simulates a software upgrade
   - In Docker: `docker compose stop api`
   - In development: Stop the `npm run dev` command in the `server` directory

4. **Observe the behavior**
   - After ~20 seconds, yellow warning banner appears
   - Offline duration counter increases every second
   - "Refresh" button is available

5. **Restart the backend server**
   - In Docker: `docker compose start api`
   - In development: Restart `npm run dev` in `server` directory

6. **Observe auto-refresh**
   - Green "Server Back Online" banner appears
   - Page automatically reloads after 1 second
   - Fresh content is loaded
   - Banner disappears after refresh

### Automated Testing

Currently, this feature is tested manually. Future improvements could include:
- Unit tests for `useServerStatus` hook
- Integration tests for offline detection
- E2E tests for auto-refresh behavior

## Troubleshooting

### Warning Banner Appears During Normal Operation
- Check if backend server is actually running
- Verify `/api/health` endpoint is accessible
- Check browser console for health check errors
- Ensure network connectivity

### Auto-Refresh Not Working
- Check browser console for errors
- Verify JavaScript execution is allowed
- Ensure browser supports necessary APIs
- Try manual "Refresh Now" button

### Offline Duration Not Updating
- Check if component is rendering
- Verify useEffect dependencies
- Look for React strict mode issues in development

### Constant Re-renders Every 10 Seconds (Fixed in v1.1)
- This was caused by inefficient state management
- Health check always triggered state updates even when nothing changed
- Fixed by only updating state when values actually change
- See REFRESH_OPTIMIZATION_SUMMARY.md for details

## Future Enhancements

Potential improvements:
1. User preference to disable auto-refresh
2. Configurable check intervals via settings
3. Different strategies for mobile vs desktop
4. Progressive backoff for health checks
5. Websocket-based real-time status updates
6. Show estimated time until server returns
7. Allow users to queue actions for later sync

## Related Documentation

- [UPDATE_FEATURE.md](./UPDATE_FEATURE.md) - Software update system
- [PWA_GUIDE.md](./PWA_GUIDE.md) - Progressive Web App features
- [DEPLOYMENT.md](./DEPLOYMENT.md) - Deployment procedures

## Security Considerations

- Health endpoint is public (no authentication required)
- Only returns basic status information
- No sensitive data exposed
- Rate limiting applied at API level
- Cache clearing is safe (only user's own cache)

## Conclusion

The automated screen refresh feature significantly improves the user experience during server maintenance and software upgrades. Users are always aware of the server status and their changes are protected from being lost. The implementation is robust, non-intrusive, and works seamlessly across the entire application.
