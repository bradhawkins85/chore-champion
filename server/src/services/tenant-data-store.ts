import type { Pool, PoolConnection, RowDataPacket } from 'mysql2/promise';
import { pool } from '../config/database.js';
import { getLegacyTableForKey, getTableForKey, getTableModeForKey, isTenantKeyMigrated, KEY_TABLE_MAP } from './tenant-data-schema.js';

interface JsonRow extends RowDataPacket {
  payload_json?: string;
  value_data?: string;
}

function getExecutor(connection?: PoolConnection): Pool | PoolConnection {
  return connection ?? pool;
}

async function getNormalizedTenantData(key: string, tenantId: string): Promise<unknown | null> {
  const table = getTableForKey(key);
  const mode = getTableModeForKey(key);
  if (!table || !mode) return null;

  if (mode === 'singleton') {
    const [rows] = await pool.query<JsonRow[]>(`SELECT CAST(payload_json AS CHAR) AS payload_json FROM ${table} WHERE tenant_id = ?`, [tenantId]);
    if (!rows.length || !rows[0].payload_json) return null;
    return JSON.parse(rows[0].payload_json);
  }

  const [rows] = await pool.query<JsonRow[]>(
    `SELECT CAST(payload_json AS CHAR) AS payload_json FROM ${table} WHERE tenant_id = ? ORDER BY created_at ASC`,
    [tenantId]
  );
  return rows.map((row) => (row.payload_json ? JSON.parse(row.payload_json) : null)).filter((row) => row !== null);
}

async function getLegacyTenantData(key: string, tenantId: string): Promise<unknown | null> {
  const legacyTable = getLegacyTableForKey(key);
  if (!legacyTable) {
    const [rows] = await pool.query<JsonRow[]>(
      'SELECT value_data FROM kv_store WHERE key_name = ? AND tenant_id = ?',
      [key, tenantId]
    );
    if (!rows.length || !rows[0].value_data) return null;
    return JSON.parse(rows[0].value_data);
  }

  const [rows] = await pool.query<JsonRow[]>(`SELECT value_data FROM ${legacyTable} WHERE tenant_id = ?`, [tenantId]);
  if (!rows.length || !rows[0].value_data) return null;
  return JSON.parse(rows[0].value_data);
}

export async function getTenantData(key: string, tenantId: string): Promise<unknown | null> {
  const table = getTableForKey(key);
  if (!table) {
    return getLegacyTenantData(key, tenantId);
  }

  const connection = await pool.getConnection();
  try {
    const migrated = await isTenantKeyMigrated(connection, tenantId, key);
    if (migrated) {
      const normalized = await getNormalizedTenantData(key, tenantId);
      if (normalized !== null) return normalized;
    }
  } finally {
    connection.release();
  }

  return getLegacyTenantData(key, tenantId);
}

export async function setTenantData(
  key: string,
  tenantId: string,
  value: unknown,
  connection?: PoolConnection
): Promise<void> {
  const table = getTableForKey(key);
  const mode = getTableModeForKey(key);
  const executor = getExecutor(connection);

  if (table && mode) {
    if (mode === 'singleton') {
      await executor.query(
        `INSERT INTO ${table} (tenant_id, payload_json) VALUES (?, CAST(? AS JSON)) ON DUPLICATE KEY UPDATE payload_json = VALUES(payload_json)`,
        [tenantId, JSON.stringify(value)]
      );
    } else {
      const list = Array.isArray(value) ? value : [];
      await executor.query(`DELETE FROM ${table} WHERE tenant_id = ?`, [tenantId]);
      for (let index = 0; index < list.length; index += 1) {
        const item = list[index] as Record<string, unknown>;
        const itemId = String(item?.id ?? item?.requestId ?? `${key}-${index}`);
        await executor.query(
          `INSERT INTO ${table} (tenant_id, id, payload_json) VALUES (?, ?, CAST(? AS JSON))
           ON DUPLICATE KEY UPDATE payload_json = VALUES(payload_json)`,
          [tenantId, itemId, JSON.stringify(item)]
        );
      }
    }

    await executor.query(
      `INSERT INTO tenant_data_migration_state
       (tenant_id, key_name, table_name, source_row_count, backfilled_row_count, migration_status, last_error)
       VALUES (?, ?, ?, ?, ?, 'success', NULL)
       ON DUPLICATE KEY UPDATE
        table_name = VALUES(table_name),
        source_row_count = VALUES(source_row_count),
        backfilled_row_count = VALUES(backfilled_row_count),
        migration_status = 'success',
        last_error = NULL,
        migrated_at = CURRENT_TIMESTAMP`,
      [tenantId, key, table, Array.isArray(value) ? value.length : 1, Array.isArray(value) ? value.length : 1]
    );
    return;
  }

  await executor.query(
    'INSERT INTO kv_store (key_name, value_data, tenant_id) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE value_data = VALUES(value_data)',
    [key, JSON.stringify(value), tenantId]
  );
}

export async function deleteTenantData(key: string, tenantId: string): Promise<void> {
  const table = getTableForKey(key);

  if (table) {
    await pool.query(`DELETE FROM ${table} WHERE tenant_id = ?`, [tenantId]);
    await pool.query('DELETE FROM tenant_data_migration_state WHERE tenant_id = ? AND key_name = ?', [tenantId, key]);
    return;
  }

  await pool.query('DELETE FROM kv_store WHERE key_name = ? AND tenant_id = ?', [key, tenantId]);
}

export async function getAllTenantData(tenantId: string): Promise<Record<string, unknown>> {
  const data: Record<string, unknown> = {};

  for (const key of Object.keys(KEY_TABLE_MAP)) {
    try {
      const value = await getTenantData(key, tenantId);
      if (value !== null && value !== undefined) {
        data[key] = value;
      }
    } catch (error) {
      console.error(`Error loading tenant data for key "${key}":`, error);
    }
  }

  const [kvRows] = await pool.query<(RowDataPacket & { key_name: string; value_data: string })[]>(
    'SELECT key_name, value_data FROM kv_store WHERE tenant_id = ?',
    [tenantId]
  );

  for (const row of kvRows) {
    if (KEY_TABLE_MAP[row.key_name]) continue;
    if (row.value_data === null || row.value_data === undefined) continue;

    try {
      data[row.key_name] = JSON.parse(row.value_data);
    } catch (error) {
      console.error(`Error parsing kv_store value for key "${row.key_name}":`, error);
    }
  }

  return data;
}
