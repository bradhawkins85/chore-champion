# Manual Test Plan for Auto-Refresh Fix

This document outlines manual testing procedures to verify the auto-refresh fix works correctly.

## Test Environment Setup

1. Start the backend server
2. Start the frontend application
3. Open browser DevTools Console to see log messages
4. Navigate to the parent dashboard

## Test Scenarios

### Scenario 1: Normal Operation (No False Positives)
**Objective**: Verify that the page does NOT auto-refresh during normal operation

**Steps**:
1. Open the parent dashboard
2. Let the application run for 5 minutes
3. Monitor the browser console for "Server is back online. Triggering auto-refresh..." messages
4. Observe the page behavior

**Expected Result**: 
- ✅ NO auto-refresh occurs
- ✅ NO console messages about server reconnection
- ✅ Page continues to work normally

**Status**: PASS / FAIL

---

### Scenario 2: Single Transient Failure
**Objective**: Verify that a single failed health check does NOT trigger auto-refresh

**Steps**:
1. Open the parent dashboard
2. Open browser DevTools > Network tab
3. Wait for a health check request to `/api/health`
4. Right before the next health check, briefly disable network (DevTools > Network > Offline)
5. Wait ~2 seconds, then re-enable network
6. Wait 30 seconds and observe

**Expected Result**: 
- ✅ One health check fails
- ✅ `consecutiveFailures = 1` (not enough to trigger offline state)
- ✅ Next check succeeds, resets to 0
- ✅ NO auto-refresh occurs
- ✅ NO offline banner appears

**Status**: PASS / FAIL

---

### Scenario 3: Two Consecutive Failures (Still No Refresh if Never Offline)
**Objective**: Verify that even 2 failures don't trigger refresh if we recover before being marked offline

**Note**: This scenario is tricky to reproduce manually. The key is:
- Health checks happen every 10 seconds
- Timeout is 5 seconds
- If the second check succeeds before OFFLINE_THRESHOLD is reached, no refresh should occur

**Steps**:
1. This is better tested by looking at the code logic
2. See AUTO_REFRESH_FIX_SUMMARY.md for the logical trace

**Expected Result**: 
- ✅ Logic prevents false positive refresh

**Status**: PASS / FAIL (Code Review)

---

### Scenario 4: Actual Server Offline → Online (Should Refresh)
**Objective**: Verify that auto-refresh DOES work when server actually goes offline

**Steps**:
1. Open the parent dashboard
2. Stop the backend server:
   - Docker: `docker compose stop server` (or `api` container name)
   - Dev mode: Stop the `npm run dev` process in server directory
3. Wait for 25-30 seconds (more than 2 health check cycles)
4. Observe the yellow "Server Temporarily Unavailable" banner appears
5. Restart the backend server:
   - Docker: `docker compose start server`
   - Dev mode: Restart `npm run dev` in server directory
6. Within 10 seconds, observe:
   - Green "Server Back Online" banner appears
   - Console log: "Server is back online. Triggering auto-refresh..."
7. After 1 second, page should auto-refresh

**Expected Result**: 
- ✅ Offline banner appears after ~20 seconds
- ✅ Shows offline duration counter
- ✅ When server restarts, reconnection detected
- ✅ Green banner appears
- ✅ Console log confirms refresh trigger
- ✅ Page auto-refreshes after 1 second

**Status**: PASS / FAIL

---

### Scenario 5: Manual Refresh Button
**Objective**: Verify the manual refresh button still works

**Steps**:
1. Follow Scenario 4 to get the server offline
2. Wait for offline banner to appear
3. Click the "Refresh Now" button
4. Observe page refreshes immediately

**Expected Result**: 
- ✅ Button is clickable
- ✅ Clicking it refreshes the page
- ✅ Caches are cleared before refresh

**Status**: PASS / FAIL

---

### Scenario 6: Slow Network Response (Not a Full Failure)
**Objective**: Verify that slow responses (within 5-second timeout) don't cause issues

**Steps**:
1. Open the parent dashboard
2. Use browser DevTools > Network tab
3. Throttle connection to "Slow 3G"
4. Wait for several health check cycles (60+ seconds)
5. Observe behavior

**Expected Result**: 
- ✅ Health checks may be slow but still succeed
- ✅ NO auto-refresh occurs
- ✅ NO offline banner appears (unless checks actually timeout/fail)

**Status**: PASS / FAIL

---

## Edge Cases to Consider

### Edge Case 1: Page Load During Server Downtime
**Setup**: Server is already offline when page loads

**Expected**: 
- Initial health checks fail
- After 20 seconds, offline banner appears
- No auto-refresh triggered (because we weren't online before)
- When server comes back, auto-refresh works

### Edge Case 2: Multiple Tabs Open
**Setup**: Multiple browser tabs with the parent dashboard

**Expected**: 
- Each tab independently monitors server status
- Each tab will auto-refresh independently when server reconnects
- This is expected behavior

### Edge Case 3: Browser Sleep/Resume
**Setup**: Put computer to sleep for 5+ minutes, then wake up

**Expected**: 
- Health checks resume
- May detect server as offline temporarily
- Should recover without false refresh if server is actually online

---

## Success Criteria

The fix is successful if:
1. ✅ NO random auto-refreshes during normal operation
2. ✅ Auto-refresh DOES work when server actually goes offline and comes back
3. ✅ Offline banner shows correctly when server is down
4. ✅ Manual refresh button works
5. ✅ Application builds without errors
6. ✅ No console errors during normal operation

---

## Failure Indicators

The fix has issues if:
1. ❌ Page auto-refreshes during normal operation (false positive)
2. ❌ Auto-refresh doesn't work when server actually reconnects (false negative)
3. ❌ Console errors appear
4. ❌ Offline banner shows when server is actually online

---

## Notes

- The key improvement is using `wasOfflineRef.current` to track **actual state** rather than **threshold calculations**
- This prevents the scenario where 2 consecutive failures followed by success triggers a false refresh
- The fix is minimal (2 lines changed) to reduce risk of breaking existing functionality

---

## Developer Testing Checklist

Before marking complete:
- [ ] Run `npm run build` - confirms no compilation errors
- [ ] Review code changes - confirms logic is correct
- [ ] Test Scenario 1 - no false positives during normal operation
- [ ] Test Scenario 4 - auto-refresh works when server goes offline/online
- [ ] Code review by another developer
- [ ] Security scan passes

---

## Automated Test Ideas (Future Enhancement)

Could add:
1. Unit tests for `useServerStatus` hook with mocked fetch
2. Integration tests that simulate server offline/online transitions
3. E2E tests using Playwright or Cypress

Currently relying on manual testing and code review.
