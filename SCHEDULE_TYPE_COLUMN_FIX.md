# Fix for SQL Error: Missing schedule_type Column

## Problem Description

The application was throwing a SQL error when trying to save child availability data:

```
Error: Unknown column 'schedule_type' in 'field list'
```

This occurred in the `replaceChildAvailability` function when trying to insert records into the `tenant_child_availability_v2` table.

## Root Cause

The table schema definition in `server/src/services/tenant-data-schema.ts` includes a `schedule_type` column (line 384), and the repository code in `server/src/services/repositories/child-availability-repo.ts` attempts to insert data into this column.

However, databases created before this column was added to the schema did not have this column, and there was no migration to add it to existing databases.

## Solution

Added a database migration in `server/src/config/database.ts` (lines 398-408) that:

1. Checks if the `schedule_type` column exists using `SHOW COLUMNS`
2. If the column doesn't exist, adds it with `ALTER TABLE` using the same type and position as defined in the schema:
   - Type: `VARCHAR(20)`
   - Position: After the `type` column

This migration follows the same pattern as the existing migration for the `type` column (lines 386-396).

## Migration Code

```typescript
const [scheduleTypeColumnRows] = await connection.query<RowDataPacket[]>(
  "SHOW COLUMNS FROM tenant_child_availability_v2 LIKE 'schedule_type'"
);

if (scheduleTypeColumnRows.length === 0) {
  // schedule_type column doesn't exist, add it after type
  await connection.query(
    'ALTER TABLE tenant_child_availability_v2 ADD COLUMN schedule_type VARCHAR(20) AFTER type'
  );
  console.log('Added schedule_type column to tenant_child_availability_v2 table');
}
```

## Testing

### Test Script
Created `test-schedule-type-column.sh` to verify the column exists after migration runs.

### Existing Tests
The existing `test-column-storage.sh` script (line 56) already checks for the `schedule_type` column, so it will validate the fix.

### Verification Steps

1. Start the application with an existing database
2. The migration will run automatically on startup
3. The console will log: "Added schedule_type column to tenant_child_availability_v2 table"
4. Child availability records can now be saved successfully

## Impact

- **Breaking Changes**: None - this is a backward-compatible migration
- **Data Loss**: None - existing data is preserved
- **Downtime**: None - migration runs automatically on startup
- **Rollback**: Safe - the column can be dropped if needed (though there's no reason to)

## Files Changed

- `server/src/config/database.ts` - Added migration logic
- `test-schedule-type-column.sh` - New test script to verify the fix

## Security

CodeQL security scan passed with no alerts.
