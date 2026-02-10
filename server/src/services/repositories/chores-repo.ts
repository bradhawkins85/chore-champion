import type { Pool, PoolConnection, RowDataPacket } from 'mysql2/promise';
import { pool } from '../../config/database.js';

export interface ChoreRecord {
  id: string;
  title: string | null;
  description: string | null;
  emoji: string | null;
  frequency: string | null;
  scheduleType: string | null;
  dayOfWeek: number | null;
  dayOfMonth: number | null;
  dueTime: string | null;
  points: number;
  active: boolean;
  sortOrder: number;
}

interface ChoreRow extends RowDataPacket {
  id: string;
  title: string | null;
  description: string | null;
  emoji: string | null;
  frequency: string | null;
  schedule_type: string | null;
  day_of_week: number | null;
  day_of_month: number | null;
  due_time: string | null;
  points: number | null;
  is_active: number | boolean | null;
  sort_order: number | null;
  payload_json?: string | any;
}

function getExecutor(connection?: PoolConnection): Pool | PoolConnection {
  return connection ?? pool;
}

function mapRow(row: ChoreRow): ChoreRecord {
  // Return the full payload_json object if it exists, otherwise fall back to normalized columns
  // This preserves all properties including rotationConfig and other complex objects
  if (row.payload_json) {
    try {
      const payload = typeof row.payload_json === 'string' 
        ? JSON.parse(row.payload_json) 
        : row.payload_json;
      
      // Basic validation: ensure the payload has an id property
      if (payload && typeof payload === 'object' && payload.id) {
        return payload as ChoreRecord;
      } else {
        console.error('Invalid payload_json structure for chore:', row.id, payload);
        // Fall through to normalized columns
      }
    } catch (error) {
      console.error('Error parsing payload_json for chore:', row.id, error);
      // Fall through to normalized columns
    }
  }
  
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    emoji: row.emoji,
    frequency: row.frequency,
    scheduleType: row.schedule_type,
    dayOfWeek: row.day_of_week,
    dayOfMonth: row.day_of_month,
    dueTime: row.due_time,
    points: row.points ?? 0,
    active: Boolean(row.is_active ?? true),
    sortOrder: row.sort_order ?? 0,
  };
}

export async function listChores(tenantId: string, connection?: PoolConnection): Promise<ChoreRecord[]> {
  const executor = getExecutor(connection);
  const [rows] = await executor.query<ChoreRow[]>(
    `SELECT id, title, description, emoji, frequency, schedule_type, day_of_week, day_of_month, due_time, points, is_active, sort_order, payload_json
     FROM tenant_chores_v2
     WHERE tenant_id = ?
     ORDER BY sort_order ASC, created_at ASC`,
    [tenantId]
  );

  return rows.map(mapRow);
}


export async function getChoreById(tenantId: string, choreId: string, connection?: PoolConnection): Promise<ChoreRecord | null> {
  const executor = getExecutor(connection);
  const [rows] = await executor.query<ChoreRow[]>(
    `SELECT id, title, description, emoji, frequency, schedule_type, day_of_week, day_of_month, due_time, points, is_active, sort_order, payload_json
     FROM tenant_chores_v2
     WHERE tenant_id = ? AND id = ?`,
    [tenantId, choreId]
  );

  return rows.length ? mapRow(rows[0]) : null;
}

export async function upsertChore(tenantId: string, chore: ChoreRecord, connection?: PoolConnection): Promise<void> {
  const executor = getExecutor(connection);
  const sortOrder = chore.sortOrder ?? 0;
  // Store the entire chore object as JSON to preserve all properties including rotationConfig
  const payloadJson = JSON.stringify(chore);
  await executor.query(
    `INSERT INTO tenant_chores_v2
    (id, tenant_id, title, description, emoji, frequency, schedule_type, day_of_week, day_of_month, due_time, points, is_active, sort_order, payload_json)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON DUPLICATE KEY UPDATE
      title = VALUES(title),
      description = VALUES(description),
      emoji = VALUES(emoji),
      frequency = VALUES(frequency),
      schedule_type = VALUES(schedule_type),
      day_of_week = VALUES(day_of_week),
      day_of_month = VALUES(day_of_month),
      due_time = VALUES(due_time),
      points = VALUES(points),
      is_active = VALUES(is_active),
      sort_order = VALUES(sort_order),
      payload_json = VALUES(payload_json)`,
    [
      chore.id,
      tenantId,
      chore.title ?? null,
      chore.description ?? null,
      chore.emoji ?? null,
      chore.frequency ?? null,
      chore.scheduleType ?? null,
      chore.dayOfWeek ?? null,
      chore.dayOfMonth ?? null,
      chore.dueTime ?? null,
      chore.points ?? 0,
      chore.active ?? true,
      sortOrder,
      payloadJson,
    ]
  );
}

export async function replaceChores(tenantId: string, chores: ChoreRecord[], connection?: PoolConnection): Promise<void> {
  const executor = getExecutor(connection);
  await executor.query('DELETE FROM tenant_chores_v2 WHERE tenant_id = ?', [tenantId]);

  for (const [index, chore] of chores.entries()) {
    const sortOrder = chore.sortOrder ?? index;
    // Store the entire chore object as JSON to preserve all properties including rotationConfig
    const payloadJson = JSON.stringify(chore);
    await executor.query(
      `INSERT INTO tenant_chores_v2
      (id, tenant_id, title, description, emoji, frequency, schedule_type, day_of_week, day_of_month, due_time, points, is_active, sort_order, payload_json)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        chore.id,
        tenantId,
        chore.title ?? null,
        chore.description ?? null,
        chore.emoji ?? null,
        chore.frequency ?? null,
        chore.scheduleType ?? null,
        chore.dayOfWeek ?? null,
        chore.dayOfMonth ?? null,
        chore.dueTime ?? null,
        chore.points ?? 0,
        chore.active ?? true,
        sortOrder,
        payloadJson,
      ]
    );
  }
}

export async function deleteChores(tenantId: string, connection?: PoolConnection): Promise<void> {
  const executor = getExecutor(connection);
  await executor.query('DELETE FROM tenant_chores_v2 WHERE tenant_id = ?', [tenantId]);
}

export async function deleteChoreById(tenantId: string, choreId: string, connection?: PoolConnection): Promise<void> {
  const executor = getExecutor(connection);
  await executor.query('DELETE FROM tenant_chores_v2 WHERE tenant_id = ? AND id = ?', [tenantId, choreId]);
}
