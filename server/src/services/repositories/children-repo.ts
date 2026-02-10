import type { Pool, PoolConnection, RowDataPacket } from 'mysql2/promise';
import { pool } from '../../config/database.js';

export interface ChildRecord {
  id: string;
  firstName: string | null;
  lastName: string | null;
  name: string | null;
  status: string | null;
  points: number;
  isActive: boolean;
  sortOrder: number;
}

interface ChildRow extends RowDataPacket {
  id: string;
  first_name: string | null;
  last_name: string | null;
  display_name: string | null;
  status: string | null;
  points_balance: number | null;
  is_active: number | boolean | null;
  sort_order: number | null;
  payload_json?: string | any;
}

function getExecutor(connection?: PoolConnection): Pool | PoolConnection {
  return connection ?? pool;
}

function mapRow(row: ChildRow): ChildRecord {
  // Return the full payload_json object if it exists, otherwise fall back to normalized columns
  // This preserves all properties including avatarColor which is not in normalized columns
  if (row.payload_json) {
    try {
      const payload = typeof row.payload_json === 'string' 
        ? JSON.parse(row.payload_json) 
        : row.payload_json;
      return payload as ChildRecord;
    } catch (error) {
      console.error('Error parsing payload_json for child:', error);
      // Fall through to normalized columns
    }
  }
  
  return {
    id: row.id,
    firstName: row.first_name,
    lastName: row.last_name,
    name: row.display_name,
    status: row.status,
    points: row.points_balance ?? 0,
    isActive: Boolean(row.is_active ?? true),
    sortOrder: row.sort_order ?? 0,
  };
}

export async function listChildren(tenantId: string, connection?: PoolConnection): Promise<ChildRecord[]> {
  const executor = getExecutor(connection);
  const [rows] = await executor.query<ChildRow[]>(
    `SELECT id, first_name, last_name, display_name, status, points_balance, is_active, sort_order, payload_json
     FROM tenant_children_v2
     WHERE tenant_id = ?
     ORDER BY sort_order ASC, created_at ASC`,
    [tenantId]
  );
  return rows.map(mapRow);
}

export async function getChildById(tenantId: string, childId: string, connection?: PoolConnection): Promise<ChildRecord | null> {
  const executor = getExecutor(connection);
  const [rows] = await executor.query<ChildRow[]>(
    `SELECT id, first_name, last_name, display_name, status, points_balance, is_active, sort_order, payload_json
     FROM tenant_children_v2
     WHERE tenant_id = ? AND id = ?`,
    [tenantId, childId]
  );

  return rows.length ? mapRow(rows[0]) : null;
}

export async function upsertChild(tenantId: string, child: ChildRecord, connection?: PoolConnection): Promise<void> {
  const executor = getExecutor(connection);
  // Store the entire child object as JSON to preserve all properties including avatarColor
  const payloadJson = JSON.stringify(child);
  await executor.query(
    `INSERT INTO tenant_children_v2
     (id, tenant_id, first_name, last_name, display_name, status, points_balance, is_active, sort_order, payload_json)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
      first_name = VALUES(first_name),
      last_name = VALUES(last_name),
      display_name = VALUES(display_name),
      status = VALUES(status),
      points_balance = VALUES(points_balance),
      is_active = VALUES(is_active),
      sort_order = VALUES(sort_order),
      payload_json = VALUES(payload_json)`,
    [
      child.id,
      tenantId,
      child.firstName ?? null,
      child.lastName ?? null,
      child.name ?? null,
      child.status ?? null,
      child.points ?? 0,
      child.isActive ?? true,
      child.sortOrder ?? 0,
      payloadJson,
    ]
  );
}

export async function replaceChildren(tenantId: string, children: ChildRecord[], connection?: PoolConnection): Promise<void> {
  const executor = getExecutor(connection);
  await executor.query('DELETE FROM tenant_children_v2 WHERE tenant_id = ?', [tenantId]);

  for (const [index, child] of children.entries()) {
    const sortOrder = child.sortOrder ?? index;
    // Store the entire child object as JSON to preserve all properties including avatarColor
    const payloadJson = JSON.stringify(child);
    await executor.query(
      `INSERT INTO tenant_children_v2
       (id, tenant_id, first_name, last_name, display_name, status, points_balance, is_active, sort_order, payload_json)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        child.id,
        tenantId,
        child.firstName ?? null,
        child.lastName ?? null,
        child.name ?? null,
        child.status ?? null,
        child.points ?? 0,
        child.isActive ?? true,
        sortOrder,
        payloadJson,
      ]
    );
  }
}

export async function deleteChildren(tenantId: string, connection?: PoolConnection): Promise<void> {
  const executor = getExecutor(connection);
  await executor.query('DELETE FROM tenant_children_v2 WHERE tenant_id = ?', [tenantId]);
}

export async function deleteChildById(tenantId: string, childId: string, connection?: PoolConnection): Promise<void> {
  const executor = getExecutor(connection);
  await executor.query('DELETE FROM tenant_children_v2 WHERE tenant_id = ? AND id = ?', [tenantId, childId]);
}
