# Before and After: Data Storage Comparison

## BEFORE THE FIX

### How Assignments Were Stored
```sql
-- tenant_assignments_v2 table
id                   | tenant_id | chore_id | child_id | assigned_at | ... | payload_json
---------------------|-----------|----------|----------|-------------|-----|------------------
"assignment-123"     | "tenant1" | NULL     | NULL     | NULL        | ... | '{"id":"assignment-123","choreId":"chore-1","childId":"child-1","assignedAt":1707780000,"status":"active","points":10}'
```

**Problem**: All data was in `payload_json` column, leaving actual columns NULL!

### How Completions Were Stored
```sql
-- tenant_completions_v2 table
id                | tenant_id | chore_id | child_id | completed_at | ... | payload_json
------------------|-----------|----------|----------|--------------|-----|------------------
"completion-456"  | "tenant1" | NULL     | NULL     | NULL         | ... | '{"id":"completion-456","choreId":"chore-1","childId":"child-1","completedAt":1707780000,"pointsAwarded":10}'
```

### How Child Availability Was Stored
```sql
-- tenant_child_availability_v2 table
id               | tenant_id | child_id | type    | start_date | ... | payload_json
-----------------|-----------|----------|---------|------------|-----|------------------
"availability-1" | "tenant1" | NULL     | NULL    | NULL       | ... | '{"id":"availability-1","childId":"child-1","type":"unavailable","startDate":1707780000}'
```

---

## AFTER THE FIX

### How Assignments Are Now Stored
```sql
-- tenant_assignments_v2 table
id                   | tenant_id | chore_id  | child_id  | assigned_at  | status   | points | payload_json
---------------------|-----------|-----------|-----------|--------------|----------|--------|-------------
"assignment-123"     | "tenant1" | "chore-1" | "child-1" | 1707780000   | "active" | 10     | NULL
```

**Fixed**: Data is now in proper columns! Queries can use indexes, constraints work, and SQL queries are straightforward.

### How Completions Are Now Stored
```sql
-- tenant_completions_v2 table
id                | tenant_id | chore_id  | child_id  | completed_at | points_awarded | status      | payload_json
------------------|-----------|-----------|-----------|--------------|----------------|-------------|-------------
"completion-456"  | "tenant1" | "chore-1" | "child-1" | 1707780000   | 10             | "completed" | NULL
```

### How Child Availability Is Now Stored
```sql
-- tenant_child_availability_v2 table
id               | tenant_id | child_id  | type           | start_date  | is_available | payload_json
-----------------|-----------|-----------|----------------|-------------|--------------|-------------
"availability-1" | "tenant1" | "child-1" | "unavailable"  | 1707780000  | 0            | NULL
```

---

## Benefits of the Fix

### 1. Database Queries
**Before:**
```sql
-- Had to parse JSON to filter
SELECT * FROM tenant_assignments_v2 
WHERE tenant_id = 'tenant1'
AND JSON_EXTRACT(payload_json, '$.choreId') = 'chore-1';
```

**After:**
```sql
-- Direct column access
SELECT * FROM tenant_assignments_v2 
WHERE tenant_id = 'tenant1'
AND chore_id = 'chore-1';
```

### 2. Indexes Work
**Before:** Indexes on `chore_id`, `child_id`, etc. were useless (always NULL)

**After:** All indexes are effective, improving query performance

### 3. Foreign Keys and Constraints
**Before:** Cannot enforce referential integrity when data is in JSON

**After:** Can add foreign keys like:
```sql
ALTER TABLE tenant_assignments_v2 
ADD FOREIGN KEY (chore_id) REFERENCES tenant_chores_v2(id);
```

### 4. Data Type Safety
**Before:** Everything is a string in JSON, easy to make mistakes

**After:** Database enforces types (INT for timestamps, BOOLEAN for flags, etc.)

### 5. Aggregate Queries
**Before:**
```sql
-- Complex JSON parsing needed
SELECT JSON_EXTRACT(payload_json, '$.childId') as child_id,
       SUM(CAST(JSON_EXTRACT(payload_json, '$.points') AS UNSIGNED)) as total_points
FROM tenant_assignments_v2
GROUP BY JSON_EXTRACT(payload_json, '$.childId');
```

**After:**
```sql
-- Simple and fast
SELECT child_id, SUM(points) as total_points
FROM tenant_assignments_v2
GROUP BY child_id;
```

---

## Migration Process

The fix includes automatic migration that:

1. **Detects old data**: Finds records with non-null `payload_json`
2. **Parses JSON**: Extracts the data from `payload_json`
3. **Re-saves properly**: Uses repository functions to populate columns
4. **Logs activity**: Records migration for monitoring
5. **Runs once**: Per tenant, per session (tracked in-memory)

Example log output during migration:
```
Migrating 15 assignments records from payload_json to proper columns for tenant abc123
Successfully migrated 15 assignments records for tenant abc123
```

## Testing

To verify the fix is working:

```bash
# Run the test script
./test-column-storage.sh

# Or manually check the database
mysql -u chorequest -p chorequest -e "
SELECT 
  COUNT(*) as total_records,
  SUM(CASE WHEN chore_id IS NOT NULL THEN 1 ELSE 0 END) as records_with_columns,
  SUM(CASE WHEN payload_json IS NOT NULL AND payload_json != 'null' THEN 1 ELSE 0 END) as records_with_json
FROM tenant_assignments_v2;
"
```

Expected result after migration:
- `records_with_columns` should equal `total_records`
- `records_with_json` should be 0 (or small for recently created records before fix)
