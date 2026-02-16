# Fix Summary: Proper Column Data Storage

## Problem
Data written to the following tables was being saved to the `payload_json` column instead of the actual table columns:
- `tenant_assignments_v2`
- `tenant_completions_v2`
- `tenant_child_availability_v2`

This happened because these tables were being handled by the generic `setGenericTableTenantData` function which was designed to work with simple key-value storage and didn't know how to map fields to specific columns.

## Root Cause
The `setGenericTableTenantData` function in `server/src/services/tenant-data-store.ts` was inserting records with only `tenant_id`, `id`, and `payload_json`, leaving all other columns empty:

```typescript
await executor.query(
  `INSERT INTO ${tableName} (tenant_id, id, payload_json)
   VALUES (?, ?, ?)
   ON DUPLICATE KEY UPDATE payload_json = VALUES(payload_json), updated_at = CURRENT_TIMESTAMP`,
  [tenantId, getRecordId(record, index), JSON.stringify(record)]
);
```

## Solution Implemented

### 1. Created Dedicated Repository Files
Following the pattern used for `children`, `chores`, `rewards`, and `categories`, I created three new repository files:

#### `server/src/services/repositories/assignments-repo.ts`
- Maps assignment data to proper columns: `chore_id`, `child_id`, `assigned_at`, `assigned_for`, `start_date`, `end_date`, `days_of_week`, `repeat_pattern`, `time_of_day`, `time_window`, `point_overrides`, `category_point_overrides`, `rotation_state`, `status`, `points`, `sort_order`
- Provides CRUD operations: `listAssignments`, `getAssignmentById`, `upsertAssignment`, `replaceAssignments`, `deleteAssignments`, `deleteAssignmentById`

#### `server/src/services/repositories/completions-repo.ts`
- Maps completion data to proper columns: `chore_id`, `child_id`, `assignment_id`, `completed_at`, `undone_at`, `overridden`, `approval_status`, `approved_at`, `approved_by`, `rejected_reason`, `time_of_day`, `status`, `points_awarded`, `sort_order`
- Provides CRUD operations: `listCompletions`, `getCompletionById`, `upsertCompletion`, `replaceCompletions`, `deleteCompletions`, `deleteCompletionById`

#### `server/src/services/repositories/child-availability-repo.ts`
- Maps availability data to proper columns: `child_id`, `type`, `schedule_type`, `start_date`, `end_date`, `day_of_week`, `start_time`, `end_time`, `repeat_pattern`, `note`, `is_available`, `sort_order`
- Provides CRUD operations: `listChildAvailability`, `getChildAvailabilityById`, `upsertChildAvailability`, `replaceChildAvailability`, `deleteChildAvailability`, `deleteChildAvailabilityById`

### 2. Updated tenant-data-store.ts
Modified `server/src/services/tenant-data-store.ts` to use the new repositories:

- **Import statements**: Added imports for the three new repositories
- **getNormalizedTenantData**: Added cases for `assignments`, `completions`, and `child-availability` to call the respective list functions
- **setNormalizedTenantData**: Added cases for the three keys to call the respective replace functions
- **deleteNormalizedTenantData**: Added cases for the three keys to call the respective delete functions

### 3. Added Migration Logic
Implemented `migratePayloadJsonToColumns` function that:
- Detects existing records with non-null `payload_json`
- Parses the JSON data
- Re-saves using the proper repository functions (which populates all columns)
- Runs automatically on first access per tenant per session
- Logs migration activity for monitoring

### 4. Code Quality Improvements
- Changed JSON field types from `any` to `unknown` for better type safety
- Added field names to error messages for easier debugging
- Followed existing patterns for consistency

## Files Changed
1. **server/src/services/repositories/assignments-repo.ts** (new file, 212 lines)
2. **server/src/services/repositories/completions-repo.ts** (new file, 181 lines)
3. **server/src/services/repositories/child-availability-repo.ts** (new file, 165 lines)
4. **server/src/services/tenant-data-store.ts** (modified, +75 lines)
5. **test-column-storage.sh** (new file, test script)

## Testing
Created `test-column-storage.sh` script that:
- Verifies table structures have the expected columns
- Checks for data in `payload_json` columns
- Displays sample records to show data structure
- Can be run with: `./test-column-storage.sh`

## Backward Compatibility
- The `payload_json` column remains in the schema for backward compatibility
- Migration is automatic and transparent to users
- Existing data will be migrated on first access
- No manual intervention required

## Security
- Ran CodeQL security scan: 0 alerts
- All SQL queries use parameterized statements
- No SQL injection vulnerabilities introduced
- Proper error handling for JSON parsing failures

## Deployment Notes
1. No database schema changes required (columns already exist)
2. No downtime needed for deployment
3. Migration happens automatically on application start
4. Monitor logs for migration messages during first runs after deployment
5. Old records with data in `payload_json` will be automatically migrated

## Benefits
1. **Data Integrity**: Data is now stored in proper typed columns instead of JSON blobs
2. **Query Performance**: Can now use indexes on individual columns
3. **Database Constraints**: Foreign keys and constraints can be properly enforced
4. **Easier Querying**: Can query specific fields without JSON parsing
5. **Better Monitoring**: Can analyze data patterns using standard SQL queries

## Next Steps
After deployment, you can:
1. Monitor migration logs to ensure all data is migrated successfully
2. Verify queries work correctly on the new column structure
3. Consider removing the `payload_json` column in a future version (after migration is complete)
4. Update any direct database queries to use column names instead of parsing JSON
