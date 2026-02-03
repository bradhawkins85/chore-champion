# Manual Test Plan: First Login Content Loading Fix

## Issue
Upon first login to the app on a new device, existing content is not loaded and the page needs to be refreshed before anything appears.

## Fix
Modified `src/hooks/use-api-kv.ts` to automatically re-fetch data when authentication token becomes available.

## Test Scenarios

### Test 1: First Login on New Device (Primary Test Case)

**Setup:**
1. Start the application with Docker Compose:
   ```bash
   docker-compose up -d
   ```
2. Ensure you have an existing account with data (children, chores, etc.)
3. Open the application in an **incognito/private browser window** (to simulate a new device)

**Steps:**
1. Navigate to the application URL (e.g., http://localhost:8080)
2. You should see the login page
3. Enter your email and password
4. Click "Sign In"
5. **VERIFY:** You should immediately see your children, chores, and other content without needing to refresh the page
6. Check that all data is loaded:
   - Children list should be visible
   - Chores should be displayed if you select a child
   - Parent mode should show all configured data

**Expected Result:**
- ✅ Content loads immediately after login
- ✅ No page refresh required
- ✅ All data is visible right away

**Previous Behavior (Bug):**
- ❌ Blank page or default/empty state after login
- ❌ Required manual page refresh to see content
- ❌ Data only appeared after F5/refresh

---

### Test 2: Device Linking Login

**Steps:**
1. In an incognito window, navigate to the login page
2. Click "Link This Device"
3. Generate a QR code from an authenticated session
4. Scan the QR code or use the device GUID
5. Complete the device linking process
6. **VERIFY:** Content should load immediately after successful linking

**Expected Result:**
- ✅ Content loads without page refresh after device linking

---

### Test 3: Logout and Re-login

**Steps:**
1. While logged in, go to Parent Mode
2. Logout from the application
3. Log back in with your credentials
4. **VERIFY:** Content loads immediately

**Expected Result:**
- ✅ Content re-loads after re-login
- ✅ No stale data from previous session

---

### Test 4: Multiple Browser Tabs

**Setup:**
1. Have one tab logged in with data
2. Open a new tab in incognito mode

**Steps:**
1. In the incognito tab, log in
2. **VERIFY:** Content loads in the new tab
3. Switch back to the original tab
4. **VERIFY:** Both tabs have correct data

**Expected Result:**
- ✅ Each tab loads independently
- ✅ No interference between tabs

---

### Test 5: Network Error During Login

**Steps:**
1. Start login process
2. Simulate a temporary network issue (e.g., disconnect WiFi briefly after clicking login but before it completes)
3. When network returns, complete the login
4. **VERIFY:** Data loads correctly after login completes

**Expected Result:**
- ✅ Graceful handling of network issues
- ✅ Data loads when connection is restored

---

## Technical Verification

### Check Browser Console
1. Open browser DevTools (F12)
2. Go to Console tab
3. During login, you should see:
   - API calls to `/api/kv/*` endpoints after authentication succeeds
   - No errors about missing auth tokens
   - Data being loaded from the API

### Check Network Tab
1. Open browser DevTools (F12)
2. Go to Network tab
3. Filter for "kv" requests
4. After login, you should see multiple `/api/kv/*` requests with:
   - Status 200 (success)
   - Authorization header with Bearer token
   - Response containing the stored data

### Check Application State
1. After login, use React DevTools to inspect the App component
2. Verify that all `useApiKV` hooks have loaded data:
   - `chores` should not be empty array if you have chores
   - `childrenList` should have your children
   - Other state should reflect your stored data

---

## Regression Tests

### Existing Functionality Should Still Work

1. **Local Storage Fallback:**
   - If API is unavailable, data should still load from localStorage
   - No errors should occur

2. **Data Persistence:**
   - Create a new child
   - Refresh the page
   - **VERIFY:** The child is still there

3. **Cross-Device Sync:**
   - Make a change on one device
   - Login on another device
   - **VERIFY:** Changes are synced

4. **Logout:**
   - Logout should clear the token
   - Data should be reset to defaults after logout
   - Re-login should load data again

---

## Performance Verification

1. **No Multiple Fetches:**
   - Each key should only be fetched once after login
   - No duplicate API calls for the same key

2. **Quick Loading:**
   - Data should start appearing within 1-2 seconds of login
   - No long delays or hanging

3. **Memory Usage:**
   - No memory leaks from event listeners
   - Event listeners should be properly cleaned up on component unmount

---

## Success Criteria

✅ All test scenarios pass
✅ No console errors
✅ Data loads immediately after first login
✅ No page refresh required
✅ No regressions in existing functionality
✅ Good performance (data loads quickly)

---

## Notes for Tester

- The fix intercepts `localStorage.setItem` and `localStorage.removeItem` for the `auth_token` key
- When the token changes, all `useApiKV` hooks are notified and re-fetch their data
- This is a minimal, surgical change that should not affect any other functionality
- The change is event-based (not polling), so it's efficient and has minimal overhead
