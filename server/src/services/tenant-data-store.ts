import type { PoolConnection, RowDataPacket } from 'mysql2/promise';
import { pool } from '../config/database.js';
import { deleteChildren, listChildren, replaceChildren } from './repositories/children-repo.js';
import { deleteChores, listChores, replaceChores } from './repositories/chores-repo.js';
import { deleteIpAccessRequests, listIpAccessRequests, replaceIpAccessRequests } from './repositories/ip-access-repo.js';
import { deleteRewards, listRewards, replaceRewards } from './repositories/rewards-repo.js';
import { deleteCategories, listCategories, replaceCategories } from './repositories/categories-repo.js';

// Supported keys that map to normalized v2 tables
const NORMALIZED_KEYS = ['children', 'chores', 'rewards', 'categories', 'ip-access-requests'] as const;
type NormalizedKey = (typeof NORMALIZED_KEYS)[number];

function isNormalizedKey(key: string): key is NormalizedKey {
  return (NORMALIZED_KEYS as readonly string[]).includes(key);
}

async function getNormalizedTenantData(key: NormalizedKey, tenantId: string): Promise<unknown | null> {
  try {
    switch (key) {
      case 'children':
        return listChildren(tenantId);
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
      case 'ip-access-requests':
        return listIpAccessRequests(tenantId);
    }
  } catch (error) {
    console.error(`Error getting normalized tenant data for key "${key}" (tenantId: ${tenantId}):`, error);
    console.error('Stack trace:', error instanceof Error ? error.stack : 'No stack trace available');
    throw error;
  }
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
      case 'ip-access-requests':
        await replaceIpAccessRequests(tenantId, Array.isArray(value) ? (value as any[]) : [], connection);
        return;
    }
  } catch (error) {
    console.error(`Error setting normalized tenant data for key "${key}" (tenantId: ${tenantId}):`, error);
    console.error('Stack trace:', error instanceof Error ? error.stack : 'No stack trace available');
    console.error('Value type:', typeof value, 'Is array:', Array.isArray(value));
    throw error;
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
    case 'categories':
      await deleteCategories(tenantId);
      break;
    case 'ip-access-requests':
      await deleteIpAccessRequests(tenantId);
      break;
  }
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
