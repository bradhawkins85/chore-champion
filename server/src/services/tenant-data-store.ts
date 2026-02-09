import type { Pool, PoolConnection, RowDataPacket } from 'mysql2/promise';
import { pool } from '../config/database.js';
import { KEY_TABLE_MAP, getTableForKey } from './tenant-data-schema.js';

interface ValueRow extends RowDataPacket {
  value_data: string;
}

function getExecutor(connection?: PoolConnection): Pool | PoolConnection {
  return connection ?? pool;
}

export async function getTenantData(key: string, tenantId: string): Promise<unknown | null> {
  const table = getTableForKey(key);
  const query = table
    ? `SELECT value_data FROM ${table} WHERE tenant_id = ?`
    : 'SELECT value_data FROM kv_store WHERE key_name = ? AND tenant_id = ?';
  const params = table ? [tenantId] : [key, tenantId];

  const [rows] = await pool.query<ValueRow[]>(query, params);
  if (rows.length === 0) return null;

  const valueData = rows[0]?.value_data;
  if (valueData === null || valueData === undefined) return null;

  return JSON.parse(valueData);
}

export async function setTenantData(
  key: string,
  tenantId: string,
  value: unknown,
  connection?: PoolConnection
): Promise<void> {
  const table = getTableForKey(key);
  const executor = getExecutor(connection);

  if (table) {
    await executor.query(
      `INSERT INTO ${table} (tenant_id, value_data) VALUES (?, ?) ON DUPLICATE KEY UPDATE value_data = VALUES(value_data)`,
      [tenantId, JSON.stringify(value)]
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
    return;
  }

  await pool.query('DELETE FROM kv_store WHERE key_name = ? AND tenant_id = ?', [key, tenantId]);
}

export async function getAllTenantData(tenantId: string): Promise<Record<string, unknown>> {
  const data: Record<string, unknown> = {};

  for (const [key, table] of Object.entries(KEY_TABLE_MAP)) {
    const [rows] = await pool.query<ValueRow[]>(`SELECT value_data FROM ${table} WHERE tenant_id = ?`, [tenantId]);
    if (rows.length === 0 || rows[0].value_data === null || rows[0].value_data === undefined) {
      continue;
    }

    try {
      data[key] = JSON.parse(rows[0].value_data);
    } catch (error) {
      console.error(`Error parsing data for key "${key}" from ${table}:`, error);
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
