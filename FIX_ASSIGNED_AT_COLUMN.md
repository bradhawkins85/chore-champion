# Fix: Missing assigned_at Column Error

## Problem Statement
The application was throwing the following SQL error when attempting to save assignment data:

```
Error: Unknown column 'assigned_at' in 'field list'
code: 'ER_BAD_FIELD_ERROR',
errno: 1054,
sqlMessage: "Unknown column 'assigned_at' in 'field list'"
```

This error occurred in the `replaceAssignments` function when trying to insert records into the `tenant_assignments_v2` table.

## Root Cause

The issue was a mismatch between the schema definition and the actual database table structure:

1. **Schema Definition** (`server/src/services/tenant-data-schema.ts`):
   - Defines `assigned_at BIGINT NULL` as a column in the `tenant_assignments_v2` table
   - Also defines many other columns like `assigned_for`, `chore_id`, `child_id`, etc.

2. **Database Table**:
   - The actual database table was missing these columns
   - Only had `id`, `tenant_id`, and `payload_json` columns
   - This happened because `CREATE TABLE IF NOT EXISTS` doesn't add missing columns to existing tables

3. **Application Code** (`server/src/services/repositories/assignments-repo.ts`):
   - Attempts to insert data using column names from the schema
   - Fails because the columns don't exist in the actual table

## Solution Implemented

Added column migration code in `server/src/config/database.ts` that:

1. **Checks for missing columns** in both `tenant_assignments_v2` and `tenant_completions_v2` tables
2. **Adds any missing columns** using ALTER TABLE statements
3. **Follows existing patterns** used for other table migrations in the codebase

### Assignments Table Migrations
Added migrations for these columns:
- `chore_id` VARCHAR(36)
- `child_id` VARCHAR(36)
- `assigned_at` BIGINT NULL
- `assigned_for` BIGINT NULL
- `start_date` BIGINT NULL
- `end_date` BIGINT NULL
- `days_of_week` JSON
- `repeat_pattern` VARCHAR(50)
- `time_of_day` VARCHAR(10)
- `time_window` JSON
- `point_overrides` JSON
- `category_point_overrides` JSON
- `rotation_state` JSON
- `status` VARCHAR(50)
- `points` INT DEFAULT 0
- `sort_order` INT DEFAULT 0

### Completions Table Migrations
Added migrations for these columns:
- `chore_id` VARCHAR(36)
- `child_id` VARCHAR(36)
- `assignment_id` VARCHAR(36)
- `completed_at` BIGINT NULL
- `undone_at` BIGINT NULL
- `overridden` BOOLEAN DEFAULT FALSE
- `approval_status` VARCHAR(50)
- `approved_at` BIGINT NULL
- `approved_by` VARCHAR(36)
- `rejected_reason` TEXT
- `time_of_day` VARCHAR(10)
- `status` VARCHAR(50)
- `points_awarded` INT DEFAULT 0
- `sort_order` INT DEFAULT 0

## How It Works

The migration code:
1. Runs automatically when the server starts and connects to the database
2. For each column, checks if it exists using `SHOW COLUMNS FROM table_name LIKE 'column_name'`
3. If a column doesn't exist, executes an `ALTER TABLE ADD COLUMN` statement
4. Logs each column addition for monitoring
5. Is idempotent - safe to run multiple times

## Related Files Changed

- `server/src/config/database.ts` - Added migration code (62 lines added)

## Testing

- ✅ TypeScript compilation successful
- ✅ CodeQL security scan: 0 alerts
- ✅ Column definitions verified to match schema exactly
- ✅ SQL data types verified to be correct
- ✅ Migration pattern follows existing conventions

## Backward Compatibility

- The `payload_json` column is preserved for backward compatibility
- Existing data migration is handled by the data store service
- No manual intervention required
- Safe to deploy without downtime

## Related Issues

This fix is related to the work done in FIX_SUMMARY_COLUMN_STORAGE.md, which created repository files for assignments, completions, and child-availability tables. While that PR created the repository code to use proper columns, it didn't add the database migrations to ensure those columns actually exist in the database. This PR completes that work by adding the necessary migrations.

## Deployment Notes

1. No special deployment steps required
2. Migrations run automatically on server startup
3. Monitor server logs for migration messages like:
   - "Checking for missing columns in tenant_assignments_v2..."
   - "Added assigned_at column to tenant_assignments_v2 table"
4. After deployment, the error should be resolved and assignments can be saved successfully

## Verification

To verify the fix worked:

1. Start the application
2. Attempt to create or update assignments
3. Check that no "Unknown column" errors occur
4. Optionally, run the test-column-storage.sh script to verify table structures
