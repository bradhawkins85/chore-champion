# MySQL Startup Issues - Fix Summary

## Issues Fixed

This fix addresses multiple startup errors that occurred when using MySQL database backend:

1. **Array corruption errors:**
   - `(0 || []).forEach is not a function`
   - `c is not iterable`
   - `L.some is not a function`

2. **Missing Spark endpoint:**
   - `POST /_spark/loaded` returning 405 (Method Not Allowed)

## Root Cause

When the Spark framework loads data from MySQL through the KV store API, there were two issues:

1. **Data Type Corruption**: Array data stored in MySQL could be returned as non-array types (strings, numbers, etc.) due to JSON parsing issues or database corruption. This caused runtime errors when the application tried to use array methods like `.forEach()` and `.some()`.

2. **Missing Endpoint**: The Spark framework expects a `/_spark/loaded` endpoint to signal when the app has loaded, but this endpoint was not implemented.

## Changes Made

### 1. Enhanced Array Validation in KV Store (`server/src/routes/kv.ts`)

#### Single Key GET Endpoint
Added validation to ensure known array keys always return arrays:

```javascript
// List of keys that should always be arrays
const arrayKeys = [
  'chores', 'children', 'assignments', 'completions', 'rewards', 'purchases',
  'chore-history', 'dismissed-missed-chores', 'tracked-goals', 'categories',
  'point-swaps', 'bonus-completions'
];

// After parsing JSON from database, validate array keys
if (arrayKeys.includes(key) && !Array.isArray(parsedValue)) {
  console.warn(`Key "${key}" should be an array but got:`, typeof parsedValue, parsedValue);
  parsedValue = []; // Return empty array for safety
}
```

Benefits:
- Prevents "forEach is not a function" errors
- Provides detailed logging when data corruption is detected
- Returns safe default (empty array) instead of crashing
- Preserves data integrity for non-array keys

#### Bulk GET Endpoint
Applied the same array validation to the bulk GET endpoint (`/api/kv`) for consistency.

### 2. Added Spark Loaded Endpoint (`server/src/routes/kv.ts`)

Created a new POST endpoint to handle Spark framework's loaded signal:

```javascript
router.post('/loaded', async (req: Request, res: Response) => {
  try {
    res.json({ success: true });
  } catch (error) {
    console.error('Error handling loaded event:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});
```

### 3. Updated Nginx Configuration (`nginx.conf`)

Added proxy configuration for the loaded endpoint:

```nginx
location /_spark/loaded {
    proxy_pass http://api:3000/api/loaded;
    # ... (standard proxy headers)
}
```

## Testing & Verification

### Manual Testing

1. **Deploy the changes:**
   ```bash
   docker-compose down
   docker-compose build
   docker-compose up -d
   ```

2. **Check the logs:**
   ```bash
   docker-compose logs -f api
   ```
   
   Look for:
   - No warnings about array type mismatches (unless there's existing corrupt data)
   - Successful responses to `/_spark/loaded` requests

3. **Test the application:**
   - Open the app in a browser
   - Verify no error dialogs appear on startup
   - Check browser console for any remaining errors
   - Test creating/editing chores, children, rewards, etc.

### API Testing

Test the loaded endpoint directly:

```bash
curl -X POST http://localhost:8080/_spark/loaded \
  -H "Content-Type: application/json"
```

Expected response:
```json
{"success": true}
```

Test array validation with a corrupted value:

```bash
# Set a non-array value for an array key (simulating corruption)
curl -X POST http://localhost:8080/api/kv/chores \
  -H "Content-Type: application/json" \
  -d '{"value": "not-an-array"}'

# Retrieve it - should return empty array instead of the string
curl http://localhost:8080/api/kv/chores
```

Expected response:
```json
{"value": []}
```

And in the API logs, you should see a warning:
```
Key "chores" should be an array but got: string not-an-array
```

## Impact

### Positive Impacts
- **Eliminates startup crashes** for users with MySQL backend
- **Graceful degradation** when data corruption occurs
- **Better debugging** through enhanced logging
- **Future-proof** against similar issues

### No Breaking Changes
- Existing functionality preserved
- Only adds validation, doesn't change data storage format
- Compatible with all existing data

## Monitoring

After deployment, monitor for these log messages:

1. **Array type warnings** (indicates data corruption that was automatically fixed):
   ```
   Key "X" should be an array but got: Y
   ```

2. **Parse errors** (indicates severe data corruption):
   ```
   Error parsing value for key "X"
   ```

If you see these warnings frequently, investigate:
- How data is being written to the database
- Whether there's a data migration issue
- If client code is sending incorrect data types

## Future Improvements

Consider these enhancements:

1. **Data migration script**: Scan all keys and fix corrupted array values
2. **Write-time validation**: Validate data types when storing, not just when retrieving
3. **Automated tests**: Add integration tests for the KV store API
4. **Type definitions**: Create a schema for all KV store keys with expected types
