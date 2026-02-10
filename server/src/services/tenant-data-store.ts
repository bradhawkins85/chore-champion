import type { PoolConnection, RowDataPacket } from 'mysql2/promise';
import { pool } from '../config/database.js';
import { getLegacyTableForKey } from './tenant-data-schema.js';
import { deleteChildren, listChildren, replaceChildren } from './repositories/children-repo.js';
import { deleteChores, listChores, replaceChores } from './repositories/chores-repo.js';
import { deleteIpAccessRequests, listIpAccessRequests, replaceIpAccessRequests } from './repositories/ip-access-repo.js';
import { deleteRewards, listRewards, replaceRewards } from './repositories/rewards-repo.js';

const NORMALIZED_KEYS = ['children', 'chores', 'rewards', 'ip-access-requests'] as const;
type NormalizedKey = (typeof NORMALIZED_KEYS)[number];

function isNormalizedKey(key: string): key is NormalizedKey {
  return (NORMALIZED_KEYS as readonly string[]).includes(key);
}

function parseLegacyJson(value: string | null | undefined): unknown | null {
  if (!value) return null;
  return JSON.parse(value);
}

async function getLegacyTenantData(key: string, tenantId: string): Promise<unknown | null> {
  const legacyTable = getLegacyTableForKey(key);
  if (!legacyTable) {
    const [rows] = await pool.query<(RowDataPacket & { value_data?: string })[]>(
      'SELECT value_data FROM kv_store WHERE key_name = ? AND tenant_id = ?',
      [key, tenantId]
    );
    if (!rows.length) return null;
    return parseLegacyJson(rows[0].value_data);
  }

  const [rows] = await pool.query<(RowDataPacket & { value_data?: string })[]>(`SELECT value_data FROM ${legacyTable} WHERE tenant_id = ?`, [tenantId]);
  if (!rows.length) return null;
  return parseLegacyJson(rows[0].value_data);
}

async function setMigrationState(connection: PoolConnection | undefined, tenantId: string, key: string, table: string, rowCount: number): Promise<void> {
  const executor = connection ?? pool;
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
    [tenantId, key, table, rowCount, rowCount]
  );
}

async function getNormalizedTenantData(key: NormalizedKey, tenantId: string): Promise<unknown | null> {
  switch (key) {
    case 'children':
      return listChildren(tenantId);
    case 'chores':
      return listChores(tenantId);
    case 'rewards':
      return listRewards(tenantId);
    case 'ip-access-requests':
      return listIpAccessRequests(tenantId);
  }
}

async function setNormalizedTenantData(
  key: NormalizedKey,
  tenantId: string,
  value: unknown,
  connection?: PoolConnection
): Promise<void> {
  switch (key) {
    case 'children':
      await replaceChildren(tenantId, Array.isArray(value) ? (value as any[]) : [], connection);
      await setMigrationState(connection, tenantId, key, 'tenant_children_v2', Array.isArray(value) ? value.length : 0);
      return;
    case 'chores':
      await replaceChores(tenantId, Array.isArray(value) ? (value as any[]) : [], connection);
      await setMigrationState(connection, tenantId, key, 'tenant_chores_v2', Array.isArray(value) ? value.length : 0);
      return;
    case 'rewards':
      await replaceRewards(tenantId, Array.isArray(value) ? (value as any[]) : [], connection);
      await setMigrationState(connection, tenantId, key, 'tenant_rewards_v2', Array.isArray(value) ? value.length : 0);
      return;
    case 'ip-access-requests':
      await replaceIpAccessRequests(tenantId, Array.isArray(value) ? (value as any[]) : [], connection);
      await setMigrationState(connection, tenantId, key, 'tenant_ip_access_requests', Array.isArray(value) ? value.length : 0);
      return;
  }
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
    case 'ip-access-requests':
      await deleteIpAccessRequests(tenantId);
      break;
  }

  await pool.query('DELETE FROM tenant_data_migration_state WHERE tenant_id = ? AND key_name = ?', [tenantId, key]);
}

// Temporary compatibility adapter for legacy key-value API endpoints.
export async function getTenantData(key: string, tenantId: string): Promise<unknown | null> {
  if (isNormalizedKey(key)) {
    const normalized = await getNormalizedTenantData(key, tenantId);
    if (normalized !== null && normalized !== undefined) {
      return normalized;
    }
  }

  return getLegacyTenantData(key, tenantId);
}

// Temporary compatibility adapter for legacy key-value API endpoints.
export async function setTenantData(
  key: string,
  tenantId: string,
  value: unknown,
  connection?: PoolConnection
): Promise<void> {
  if (isNormalizedKey(key)) {
    await setNormalizedTenantData(key, tenantId, value, connection);
    return;
  }

  const executor = connection ?? pool;
  await executor.query(
    'INSERT INTO kv_store (key_name, value_data, tenant_id) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE value_data = VALUES(value_data)',
    [key, JSON.stringify(value), tenantId]
  );
}

export async function deleteTenantData(key: string, tenantId: string): Promise<void> {
  if (isNormalizedKey(key)) {
    await deleteNormalizedTenantData(key, tenantId);
    return;
  }

  await pool.query('DELETE FROM kv_store WHERE key_name = ? AND tenant_id = ?', [key, tenantId]);
}

export async function getAllTenantData(tenantId: string): Promise<Record<string, unknown>> {
  const data: Record<string, unknown> = {};

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

  const [kvRows] = await pool.query<(RowDataPacket & { key_name: string; value_data: string })[]>(
    'SELECT key_name, value_data FROM kv_store WHERE tenant_id = ?',
    [tenantId]
  );

  for (const row of kvRows) {
    if (isNormalizedKey(row.key_name)) continue;
    if (row.value_data === null || row.value_data === undefined) continue;

    try {
      data[row.key_name] = JSON.parse(row.value_data);
    } catch (error) {
      console.error(`Error parsing kv_store value for key "${row.key_name}":`, error);
    }
  }

  return data;
}
