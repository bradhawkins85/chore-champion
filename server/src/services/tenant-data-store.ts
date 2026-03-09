import type { PoolConnection, RowDataPacket } from 'mysql2/promise';
import { pool } from '../config/database.js';
import { deleteChildren, listChildren, replaceChildren, ChildRecord } from './repositories/children-repo.js';
import { deleteChores, listChores, replaceChores } from './repositories/chores-repo.js';
import { deleteIpAccessRequests, listIpAccessRequests, replaceIpAccessRequests } from './repositories/ip-access-repo.js';
import { deleteRewards, listRewards, replaceRewards } from './repositories/rewards-repo.js';
import { deleteCategories, listCategories, replaceCategories } from './repositories/categories-repo.js';
import { deletePurchases, listPurchases, replacePurchases } from './repositories/purchases-repo.js';
import { deleteAssignments, listAssignments, replaceAssignments } from './repositories/assignments-repo.js';
import { deleteCompletions, listCompletions, replaceCompletions } from './repositories/completions-repo.js';
import { deleteChildAvailability, listChildAvailability, replaceChildAvailability } from './repositories/child-availability-repo.js';
import { getTableForKey, getTableModeForKey } from './tenant-data-schema.js';

// Supported keys that map to normalized v2 tables
const NORMALIZED_KEYS = [
  'children',
  'chores',
  'assignments',
  'completions',
  'rewards',
  'purchases',
  'chore-history',
  'dismissed-missed-chores',
  'tracked-goals',
  'categories',
  'point-swaps',
  'bonus-completions',
  'child-availability',
  'parent-pin',
  'ip-restrictions',
  'ip-access-requests',
] as const;
type NormalizedKey = (typeof NORMALIZED_KEYS)[number];

function isNormalizedKey(key: string): key is NormalizedKey {
  return (NORMALIZED_KEYS as readonly string[]).includes(key);
}

// Migration flag to track which tenants have had their categories migrated
// Note: This is an in-memory Set that resets on server restart. This is acceptable because:
// 1. The migration is idempotent (checks if v2 table is empty before migrating)
// 2. The migration is fast and causes no issues if run multiple times
// 3. Most tenants will only trigger this once during the upgrade window
const migratedTenants = new Set<string>();

const migratedGenericKeys = new Set<string>();

// Track which tenants have had their payload_json data migrated to proper columns
const migratedPayloadJsonKeys = new Set<string>();

function getMigrationMarker(tenantId: string, key: string): string {
  return `${tenantId}:${key}`;
}

/**
 * Migrate data from payload_json column to proper table columns for assignments, completions, and child-availability.
 * This handles the case where data was incorrectly saved to payload_json before the fix.
 */
async function migratePayloadJsonToColumns(key: string, tenantId: string): Promise<void> {
  const marker = getMigrationMarker(tenantId, key);
  if (migratedPayloadJsonKeys.has(marker)) {
    return;
  }

  try {
    const tableName = getTableForKey(key);
    if (!tableName) {
      migratedPayloadJsonKeys.add(marker);
      return;
    }

    // Only migrate for the three affected tables
    if (!['assignments', 'completions', 'child-availability'].includes(key)) {
      migratedPayloadJsonKeys.add(marker);
      return;
    }

    // Check if there are records with non-null payload_json
    const [rows] = await pool.query<(RowDataPacket & { id: string; payload_json?: string })[]>(
      `SELECT id, payload_json FROM ${tableName} WHERE tenant_id = ? AND payload_json IS NOT NULL AND payload_json != 'null'`,
      [tenantId]
    );

    if (rows.length === 0) {
      migratedPayloadJsonKeys.add(marker);
      return;
    }

    console.log(`Migrating ${rows.length} ${key} records from payload_json to proper columns for tenant ${tenantId}`);

    // Parse payload_json and re-save using the repository functions
    const records = rows.map(row => {
      try {
        return JSON.parse(row.payload_json || '{}');
      } catch (error) {
        console.error(`Failed to parse payload_json for ${key} record ${row.id}:`, error);
        return null;
      }
    }).filter(r => r !== null);

    if (records.length > 0) {
      // Re-save the data which will populate the proper columns
      await setNormalizedTenantData(key as NormalizedKey, tenantId, records);
      console.log(`Successfully migrated ${records.length} ${key} records for tenant ${tenantId}`);
    }

    migratedPayloadJsonKeys.add(marker);
  } catch (error) {
    console.error(`Error during payload_json migration for key "${key}" and tenant ${tenantId}:`, error);
    // Don't throw - continue with normal operation even if migration fails
  }
}

async function migrateGenericKeyFromKVStore(key: string, tenantId: string): Promise<void> {
  const marker = getMigrationMarker(tenantId, key);
  if (migratedGenericKeys.has(marker)) {
    return;
  }

  try {
    const tableName = getTableForKey(key);
    const tableMode = getTableModeForKey(key);
    if (!tableName || !tableMode) {
      migratedGenericKeys.add(marker);
      return;
    }

    if (tableMode === 'collection') {
      const [existingRows] = await pool.query<RowDataPacket[]>(
        `SELECT id FROM ${tableName} WHERE tenant_id = ? LIMIT 1`,
        [tenantId]
      );
      if (existingRows.length > 0) {
        migratedGenericKeys.add(marker);
        return;
      }
    } else {
      const [existingRows] = await pool.query<RowDataPacket[]>(
        `SELECT tenant_id FROM ${tableName} WHERE tenant_id = ? LIMIT 1`,
        [tenantId]
      );
      if (existingRows.length > 0) {
        migratedGenericKeys.add(marker);
        return;
      }
    }

    const [kvRows] = await pool.query<(RowDataPacket & { value_data?: string })[]>(
      'SELECT value_data FROM kv_store WHERE key_name = ? AND tenant_id = ?',
      [key, tenantId]
    );

    if (!kvRows.length || !kvRows[0].value_data) {
      migratedGenericKeys.add(marker);
      return;
    }

    try {
      const parsedValue = JSON.parse(kvRows[0].value_data);
      await setGenericTableTenantData(key, tenantId, parsedValue);
      console.log(`Migrated key "${key}" from kv_store to ${tableName} for tenant ${tenantId}`);
    } catch (parseError) {
      console.error(`Failed to parse legacy key "${key}" for tenant ${tenantId}:`, parseError);
    }

    migratedGenericKeys.add(marker);
  } catch (error) {
    console.error(`Error during migration for key "${key}" and tenant ${tenantId}:`, error);
  }
}

/**
 * Migrates legacy category data from kv_store to tenant_categories_v2 table.
 * This is a one-time migration per tenant that runs when categories are first accessed.
 */
async function migrateCategoriesFromKVStore(tenantId: string): Promise<void> {
  // Skip if already migrated for this tenant in this session
  if (migratedTenants.has(tenantId)) {
    return;
  }

  try {
    // Check if there's any data in kv_store for categories
    const [kvRows] = await pool.query<(RowDataPacket & { value_data?: string })[]>(
      'SELECT value_data FROM kv_store WHERE key_name = ? AND tenant_id = ?',
      ['categories', tenantId]
    );

    if (kvRows.length > 0 && kvRows[0].value_data) {
      // Check if tenant_categories_v2 is empty for this tenant
      const [existingCategories] = await pool.query<RowDataPacket[]>(
        'SELECT COUNT(*) as count FROM tenant_categories_v2 WHERE tenant_id = ?',
        [tenantId]
      );

      const categoryCount = existingCategories[0]?.count ?? 0;

      // Only migrate if the v2 table is empty (to avoid overwriting manual changes)
      if (categoryCount === 0) {
        console.log(`Migrating categories from kv_store to tenant_categories_v2 for tenant ${tenantId}`);
        
        try {
          const legacyCategories = JSON.parse(kvRows[0].value_data);
          
          if (Array.isArray(legacyCategories) && legacyCategories.length > 0) {
            // Use replaceCategories to insert the migrated data
            await replaceCategories(tenantId, legacyCategories);
            console.log(`Successfully migrated ${legacyCategories.length} categories for tenant ${tenantId}`);
            
            // Optionally, we could delete the kv_store entry after successful migration
            // await pool.query('DELETE FROM kv_store WHERE key_name = ? AND tenant_id = ?', ['categories', tenantId]);
          }
        } catch (parseError) {
          console.error(`Failed to parse legacy categories for tenant ${tenantId}:`, parseError);
        }
      }
    }

    // Mark as migrated for this session
    migratedTenants.add(tenantId);
  } catch (error) {
    console.error(`Error during category migration for tenant ${tenantId}:`, error);
    // Don't throw - continue with normal operation even if migration fails
  }
}

async function getNormalizedTenantData(key: NormalizedKey, tenantId: string): Promise<unknown | null> {
  try {
    // Run migration for categories before reading
    if (key === 'categories') {
      await migrateCategoriesFromKVStore(tenantId);
    }

    // Run migration for assignments, completions, and child-availability from payload_json to columns
    if (['assignments', 'completions', 'child-availability'].includes(key)) {
      await migratePayloadJsonToColumns(key, tenantId);
    }

    switch (key) {
      case 'children':
        const children = await listChildren(tenantId);
        // Transform 'points' to 'totalPoints' for backward compatibility with frontend
        // Frontend Child interface expects 'totalPoints', backend ChildRecord has both 'points' and 'totalPoints'
        return children.map((child: ChildRecord) => {
          // Use nullish coalescing to prefer totalPoints, fall back to points, then 0
          // This handles null, undefined cases properly without treating 0 as falsy
          return {
            ...child,
            totalPoints: child.totalPoints ?? child.points ?? 0
          };
        });
      case 'chores':
        const chores = await listChores(tenantId);
        // Transform 'title' to 'name' for backward compatibility with frontend
        return chores.map((chore: any) => {
          if (chore.title && !chore.name) {
            return { ...chore, name: chore.title };
          }
          return chore;
        });
      case 'rewards':
        return listRewards(tenantId);
      case 'categories':
        return listCategories(tenantId);
      case 'purchases':
        return listPurchases(tenantId);
      case 'ip-access-requests':
        return listIpAccessRequests(tenantId);
      case 'assignments':
        return listAssignments(tenantId);
      case 'completions':
        return listCompletions(tenantId);
      case 'child-availability':
        return listChildAvailability(tenantId);
      default:
        return getGenericTableTenantData(key, tenantId);
    }
  } catch (error) {
    console.error(`Error getting normalized tenant data for key "${key}" (tenantId: ${tenantId}):`, error);
    console.error('Stack trace:', error instanceof Error ? error.stack : 'No stack trace available');
    throw error;
  }
}

type GenericCollectionRow = RowDataPacket & { id: string; payload_json?: string | null };
type GenericSingletonRow = RowDataPacket & {
  pin_hash?: string | null;
  pin_hint?: string | null;
  enabled?: number | null;
  mode?: string | null;
};

async function getGenericTableTenantData(key: string, tenantId: string): Promise<unknown | null> {
  const tableName = getTableForKey(key);
  const tableMode = getTableModeForKey(key);
  if (!tableName || !tableMode) {
    return null;
  }
  await migrateGenericKeyFromKVStore(key, tenantId);


  if (tableMode === 'collection') {
    const [rows] = await pool.query<GenericCollectionRow[]>(
      `SELECT id, payload_json FROM ${tableName} WHERE tenant_id = ? ORDER BY created_at ASC, id ASC`,
      [tenantId]
    );

    return rows.map((row) => {
      if (row.payload_json) {
        try {
          return JSON.parse(row.payload_json);
        } catch {
          return { id: row.id };
        }
      }
      return { id: row.id };
    });
  }

  if (key === 'parent-pin') {
    const [rows] = await pool.query<GenericSingletonRow[]>(
      `SELECT pin_hash, pin_hint FROM ${tableName} WHERE tenant_id = ? LIMIT 1`,
      [tenantId]
    );
    const row = rows[0];
    if (!row) {
      return null;
    }
    return {
      pinHash: row.pin_hash,
      pinHint: row.pin_hint,
    };
  }

  if (key === 'ip-restrictions') {
    const [rows] = await pool.query<GenericSingletonRow[]>(
      `SELECT enabled, mode FROM ${tableName} WHERE tenant_id = ? LIMIT 1`,
      [tenantId]
    );
    const row = rows[0];
    if (!row) {
      return null;
    }
    return {
      enabled: Boolean(row.enabled),
      mode: row.mode ?? 'allow-list',
    };
  }

  return null;
}

async function setNormalizedTenantData(
  key: NormalizedKey,
  tenantId: string,
  value: unknown,
  connection?: PoolConnection
): Promise<void> {
  try {
    switch (key) {
      case 'children':
        await replaceChildren(tenantId, Array.isArray(value) ? (value as any[]) : [], connection);
        return;
      case 'chores':
        // Transform 'name' to 'title' for backward compatibility with frontend
        const chores = Array.isArray(value) ? (value as any[]).map((chore: any) => {
          if (chore.name && !chore.title) {
            return { ...chore, title: chore.name };
          }
          return chore;
        }) : [];
        await replaceChores(tenantId, chores, connection);
        return;
      case 'rewards':
        await replaceRewards(tenantId, Array.isArray(value) ? (value as any[]) : [], connection);
        return;
      case 'categories':
        await replaceCategories(tenantId, Array.isArray(value) ? (value as any[]) : [], connection);
        return;
      case 'purchases':
        await replacePurchases(tenantId, Array.isArray(value) ? (value as any[]) : [], connection);
        return;
      case 'ip-access-requests':
        await replaceIpAccessRequests(tenantId, Array.isArray(value) ? (value as any[]) : [], connection);
        return;
      case 'assignments':
        await replaceAssignments(tenantId, Array.isArray(value) ? (value as any[]) : [], connection);
        return;
      case 'completions':
        await replaceCompletions(tenantId, Array.isArray(value) ? (value as any[]) : [], connection);
        return;
      case 'child-availability':
        await replaceChildAvailability(tenantId, Array.isArray(value) ? (value as any[]) : [], connection);
        return;
      default:
        await setGenericTableTenantData(key, tenantId, value, connection);
        return;
    }
  } catch (error) {
    console.error(`Error setting normalized tenant data for key "${key}" (tenantId: ${tenantId}):`, error);
    console.error('Stack trace:', error instanceof Error ? error.stack : 'No stack trace available');
    console.error('Value type:', typeof value, 'Is array:', Array.isArray(value));
    throw error;
  }
}

function getRecordId(record: unknown, index: number): string {
  if (record && typeof record === 'object' && 'id' in (record as Record<string, unknown>)) {
    const id = (record as Record<string, unknown>).id;
    if (typeof id === 'string' && id.length > 0) {
      return id;
    }
  }
  return `generated-${index}`;
}

async function setGenericTableTenantData(
  key: string,
  tenantId: string,
  value: unknown,
  connection?: PoolConnection
): Promise<void> {
  const tableName = getTableForKey(key);
  const tableMode = getTableModeForKey(key);
  if (!tableName || !tableMode) {
    throw new Error(`No table configuration found for key "${key}"`);
  }

  const executor = connection ?? pool;

  if (tableMode === 'collection') {
    const records = Array.isArray(value) ? value : [];

    await executor.query(`DELETE FROM ${tableName} WHERE tenant_id = ?`, [tenantId]);

    for (let index = 0; index < records.length; index++) {
      const record = records[index];
      await executor.query(
        `INSERT INTO ${tableName} (tenant_id, id, payload_json)
         VALUES (?, ?, ?)
         ON DUPLICATE KEY UPDATE payload_json = VALUES(payload_json), updated_at = CURRENT_TIMESTAMP`,
        [tenantId, getRecordId(record, index), JSON.stringify(record)]
      );
    }
    return;
  }

  if (key === 'parent-pin') {
    const parentPin = value as Record<string, unknown>;
    await executor.query(
      `INSERT INTO ${tableName} (tenant_id, pin_hash, pin_hint)
       VALUES (?, ?, ?)
       ON DUPLICATE KEY UPDATE pin_hash = VALUES(pin_hash), pin_hint = VALUES(pin_hint), updated_at = CURRENT_TIMESTAMP`,
      [tenantId, parentPin?.pinHash ?? null, parentPin?.pinHint ?? null]
    );
    return;
  }

  if (key === 'ip-restrictions') {
    const restrictions = value as Record<string, unknown>;
    await executor.query(
      `INSERT INTO ${tableName} (tenant_id, enabled, mode)
       VALUES (?, ?, ?)
       ON DUPLICATE KEY UPDATE enabled = VALUES(enabled), mode = VALUES(mode), updated_at = CURRENT_TIMESTAMP`,
      [tenantId, restrictions?.enabled ? 1 : 0, (restrictions?.mode as string | undefined) ?? 'allow-list']
    );
    return;
  }

  throw new Error(`Unsupported singleton key "${key}"`);
}

async function deleteNormalizedTenantData(key: NormalizedKey, tenantId: string): Promise<void> {
  switch (key) {
    case 'children':
      await deleteChildren(tenantId);
      break;
    case 'chores':
      await deleteChores(tenantId);
      break;
    case 'rewards':
      await deleteRewards(tenantId);
      break;
    case 'categories':
      await deleteCategories(tenantId);
      break;
    case 'purchases':
      await deletePurchases(tenantId);
      break;
    case 'ip-access-requests':
      await deleteIpAccessRequests(tenantId);
      break;
    case 'assignments':
      await deleteAssignments(tenantId);
      break;
    case 'completions':
      await deleteCompletions(tenantId);
      break;
    case 'child-availability':
      await deleteChildAvailability(tenantId);
      break;
    default:
      await deleteGenericTableTenantData(key, tenantId);
      break;
  }
}

async function deleteGenericTableTenantData(key: string, tenantId: string): Promise<void> {
  const tableName = getTableForKey(key);
  if (!tableName) {
    return;
  }
  await pool.query(`DELETE FROM ${tableName} WHERE tenant_id = ?`, [tenantId]);
}

// Get tenant data - only supports normalized keys in v2 tables
export async function getTenantData(key: string, tenantId: string): Promise<unknown | null> {
  try {
    if (!isNormalizedKey(key)) {
      // For non-normalized keys, store in generic kv_store table
      const [rows] = await pool.query<(RowDataPacket & { value_data?: string })[]>(
        'SELECT value_data FROM kv_store WHERE key_name = ? AND tenant_id = ?',
        [key, tenantId]
      );
      if (!rows.length) return null;
      const value = rows[0].value_data;
      if (!value) return null;
      
      try {
        return JSON.parse(value);
      } catch (parseError) {
        console.error(`JSON parsing error for key "${key}" (tenantId: ${tenantId}):`, parseError);
        console.error('Invalid JSON value:', value);
        throw new Error(`Failed to parse JSON for key "${key}"`);
      }
    }

    return await getNormalizedTenantData(key, tenantId);
  } catch (error) {
    console.error(`Error in getTenantData for key "${key}" (tenantId: ${tenantId}):`, error);
    console.error('Stack trace:', error instanceof Error ? error.stack : 'No stack trace available');
    throw error;
  }
}

// Set tenant data - supports both normalized and generic keys
export async function setTenantData(
  key: string,
  tenantId: string,
  value: unknown,
  connection?: PoolConnection
): Promise<void> {
  try {
    if (!isNormalizedKey(key)) {
      // For non-normalized keys, store in generic kv_store table
      const executor = connection ?? pool;
      await executor.query(
        'INSERT INTO kv_store (key_name, value_data, tenant_id) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE value_data = VALUES(value_data)',
        [key, JSON.stringify(value), tenantId]
      );
      return;
    }

    await setNormalizedTenantData(key, tenantId, value, connection);
  } catch (error) {
    console.error(`Error in setTenantData for key "${key}" (tenantId: ${tenantId}):`, error);
    console.error('Stack trace:', error instanceof Error ? error.stack : 'No stack trace available');
    console.error('Value type:', typeof value, 'Is array:', Array.isArray(value));
    throw error;
  }
}

export async function deleteTenantData(key: string, tenantId: string): Promise<void> {
  if (!isNormalizedKey(key)) {
    await pool.query('DELETE FROM kv_store WHERE key_name = ? AND tenant_id = ?', [key, tenantId]);
    return;
  }

  await deleteNormalizedTenantData(key, tenantId);
}

export async function getAllTenantData(tenantId: string): Promise<Record<string, unknown>> {
  const data: Record<string, unknown> = {};

  // Get normalized data from v2 tables
  for (const key of NORMALIZED_KEYS) {
    try {
      const value = await getNormalizedTenantData(key, tenantId);
      if (value !== null && value !== undefined) {
        data[key] = value;
      }
    } catch (error) {
      console.error(`Error loading normalized tenant data for key "${key}":`, error);
    }
  }

  // Get generic key-value data from kv_store
  try {
    const [kvRows] = await pool.query<(RowDataPacket & { key_name: string; value_data: string })[]>(
      'SELECT key_name, value_data FROM kv_store WHERE tenant_id = ?',
      [tenantId]
    );

    for (const row of kvRows) {
      if (isNormalizedKey(row.key_name)) continue; // Skip normalized keys
      if (row.value_data === null || row.value_data === undefined) continue;

      try {
        data[row.key_name] = JSON.parse(row.value_data);
      } catch (error) {
        console.error(`Error parsing kv_store value for key "${row.key_name}" (tenantId: ${tenantId}):`, error);
      }
    }
  } catch (error) {
    console.error('Error loading kv_store data:', error);
    // Continue anyway - normalized data is more important
  }

  return data;
}
