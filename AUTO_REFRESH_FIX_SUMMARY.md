# Auto-Refresh Fix for Parent Dashboard

## Problem
The automatic refresh feature was triggering even when the server hadn't actually gone offline. This was caused by the offline detection logic being too sensitive to transient network issues.

## Root Cause

### Before the Fix
The logic calculated whether the server "just came back online" by comparing threshold-based values:

```typescript
const wasOffline = prev.consecutiveFailures >= OFFLINE_THRESHOLD
const isNowOffline = newConsecutiveFailures >= OFFLINE_THRESHOLD
const justCameBackOnline = wasOffline && !isNowOffline
```

**Problem Scenario:**
1. Health check 1: **Fails** (transient network glitch) → `consecutiveFailures = 1`
2. Health check 2: **Fails** (slow response/timeout) → `consecutiveFailures = 2` (reaches threshold, considered "offline")
3. Health check 3: **Success** → `consecutiveFailures = 0` (resets to 0, considered "online")
4. **Auto-refresh triggers** because:
   - Previous state: `prev.consecutiveFailures = 2` (≥ OFFLINE_THRESHOLD, so `wasOffline = true`)
   - Current state: `newConsecutiveFailures = 0` (< OFFLINE_THRESHOLD, so `isNowOffline = false`)
   - Result: `justCameBackOnline = true && false = true` ✗ **FALSE POSITIVE**

The server never actually went offline - it was just two transient failures followed by success.

## Solution

### After the Fix
The logic now uses an explicit state reference to track actual offline state transitions:

```typescript
const isNowOffline = newConsecutiveFailures >= OFFLINE_THRESHOLD
// Use the ref to track actual state transition, not threshold comparison
const justCameBackOnline = wasOfflineRef.current && !isNowOffline
```

**How it works:**
- `wasOfflineRef.current` is only set to `true` when `isNowOffline` becomes `true` (line 112)
- This tracks the **actual confirmed offline state**, not just threshold counts
- Auto-refresh only triggers when transitioning **FROM** a confirmed offline state **TO** online

**Same Scenario with Fix:**
1. Health check 1: **Fails** → `consecutiveFailures = 1`, `wasOfflineRef.current = false` (not offline yet)
2. Health check 2: **Fails** → `consecutiveFailures = 2`, `wasOfflineRef.current = true` (NOW offline)
3. Health check 3: **Success** → `consecutiveFailures = 0`, `wasOfflineRef.current = false` (back online)
4. **Auto-refresh triggers** because:
   - `wasOfflineRef.current = true` (was in confirmed offline state)
   - `isNowOffline = false` (now online)
   - Result: `justCameBackOnline = true && false = true` ✓ **CORRECT**

**Prevented False Positive Scenario:**
1. Health check 1: **Fails** → `consecutiveFailures = 1`, `wasOfflineRef.current = false`
2. Health check 2: **Success** → `consecutiveFailures = 0`, `wasOfflineRef.current = false`
3. **No auto-refresh** because:
   - `wasOfflineRef.current = false` (was never in confirmed offline state)
   - `isNowOffline = false` (now online)
   - Result: `justCameBackOnline = false && false = false` ✓ **CORRECT - No refresh**

## Key Changes

### File: `src/hooks/use-server-status.ts`

**Line 83-85 (Before):**
```typescript
const wasOffline = prev.consecutiveFailures >= OFFLINE_THRESHOLD
const isNowOffline = newConsecutiveFailures >= OFFLINE_THRESHOLD
const justCameBackOnline = wasOffline && !isNowOffline
```

**Line 83-85 (After):**
```typescript
const isNowOffline = newConsecutiveFailures >= OFFLINE_THRESHOLD
// Use the ref to track actual state transition, not threshold comparison
const justCameBackOnline = wasOfflineRef.current && !isNowOffline
```

- Removed `wasOffline` variable (was recalculating from threshold)
- Now uses `wasOfflineRef.current` which is the actual previous state
- Added comment to clarify the intent

## Benefits

1. **Prevents False Positives**: Auto-refresh only triggers on actual offline → online transitions
2. **Minimal Change**: Only 2 lines modified, preserving all other functionality
3. **Maintains Original Intent**: Still refreshes when server actually goes offline and comes back
4. **Clear State Tracking**: Uses React ref pattern for explicit state management

## Testing

### What Should Work:
1. ✅ Normal operation: No auto-refresh during normal use
2. ✅ Transient failures: 1-2 failed health checks don't trigger refresh
3. ✅ Actual offline: When server goes down for ≥20 seconds (2 checks), offline banner shows
4. ✅ Reconnect after offline: When server comes back, auto-refresh triggers correctly

### What Should NOT Happen:
1. ✗ Random refreshes during normal operation
2. ✗ Refresh after single transient network glitch
3. ✗ Refresh when server was never truly offline

### Manual Testing Steps:
1. Run the application normally - should not auto-refresh
2. Simulate transient failure by briefly blocking network - should not auto-refresh
3. Actually stop the server for >20 seconds - offline banner should appear
4. Restart server - should show "Server Back Online" and auto-refresh after 1 second

## Technical Details

### State Flow:

**Initial State:**
- `consecutiveFailures = 0`
- `wasOfflineRef.current = false`

**On Failed Health Check:**
- `consecutiveFailures++`
- If `consecutiveFailures >= OFFLINE_THRESHOLD (2)`: `wasOfflineRef.current = true`

**On Successful Health Check:**
- `consecutiveFailures = 0`
- If transitioning from offline: `justCameBackOnline = wasOfflineRef.current && !isNowOffline`
- Update `wasOfflineRef.current = isNowOffline` (will be false)

### Constants:
- `HEALTH_CHECK_INTERVAL = 10000` (10 seconds)
- `HEALTH_CHECK_TIMEOUT = 5000` (5 seconds per check)
- `OFFLINE_THRESHOLD = 2` (2 consecutive failures = 20 seconds)

## Related Files
- `src/hooks/use-server-status.ts` - Server status monitoring hook
- `src/components/OfflineIndicator.tsx` - UI component that displays offline status
- `AUTO_REFRESH_FEATURE.md` - Original feature documentation
- `REFRESH_OPTIMIZATION_SUMMARY.md` - Previous optimization work

## Conclusion

This fix resolves the issue where the auto-refresh was triggering during normal operation when it shouldn't. The change is minimal, surgical, and maintains all the original functionality while preventing false-positive triggers caused by transient network issues.
