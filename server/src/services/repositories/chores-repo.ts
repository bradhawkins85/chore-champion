import type { Pool, PoolConnection, RowDataPacket } from 'mysql2/promise';
import { pool } from '../../config/database.js';

export interface ChoreRecord {
  id: string;
  title: string | null;
  description: string | null;
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
  frequency: string | null;
  schedule_type: string | null;
  day_of_week: number | null;
  day_of_month: number | null;
  due_time: string | null;
  points: number | null;
  is_active: number | boolean | null;
  sort_order: number | null;
}

function getExecutor(connection?: PoolConnection): Pool | PoolConnection {
  return connection ?? pool;
}

function mapRow(row: ChoreRow): ChoreRecord {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
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
    `SELECT id, title, description, frequency, schedule_type, day_of_week, day_of_month, due_time, points, is_active, sort_order
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
    `SELECT id, title, description, frequency, schedule_type, day_of_week, day_of_month, due_time, points, is_active, sort_order
     FROM tenant_chores_v2
     WHERE tenant_id = ? AND id = ?`,
    [tenantId, choreId]
  );

  return rows.length ? mapRow(rows[0]) : null;
}

export async function upsertChore(tenantId: string, chore: ChoreRecord, connection?: PoolConnection): Promise<void> {
  const executor = getExecutor(connection);
  const sortOrder = chore.sortOrder ?? 0;
  await executor.query(
    `INSERT INTO tenant_chores_v2
    (id, tenant_id, title, description, frequency, schedule_type, day_of_week, day_of_month, due_time, points, is_active, sort_order, payload_json)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, JSON_OBJECT(
      'id', ?,
      'title', ?,
      'description', ?,
      'frequency', ?,
      'scheduleType', ?,
      'dayOfWeek', ?,
      'dayOfMonth', ?,
      'dueTime', ?,
      'points', ?,
      'active', ?,
      'sortOrder', ?
    ))
    ON DUPLICATE KEY UPDATE
      title = VALUES(title),
      description = VALUES(description),
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
      chore.frequency ?? null,
      chore.scheduleType ?? null,
      chore.dayOfWeek ?? null,
      chore.dayOfMonth ?? null,
      chore.dueTime ?? null,
      chore.points ?? 0,
      chore.active ?? true,
      sortOrder,
      chore.id,
      chore.title ?? null,
      chore.description ?? null,
      chore.frequency ?? null,
      chore.scheduleType ?? null,
      chore.dayOfWeek ?? null,
      chore.dayOfMonth ?? null,
      chore.dueTime ?? null,
      chore.points ?? 0,
      chore.active ?? true,
      sortOrder,
    ]
  );
}

export async function replaceChores(tenantId: string, chores: ChoreRecord[], connection?: PoolConnection): Promise<void> {
  const executor = getExecutor(connection);
  await executor.query('DELETE FROM tenant_chores_v2 WHERE tenant_id = ?', [tenantId]);

  for (const [index, chore] of chores.entries()) {
    const sortOrder = chore.sortOrder ?? index;
    await executor.query(
      `INSERT INTO tenant_chores_v2
      (id, tenant_id, title, description, frequency, schedule_type, day_of_week, day_of_month, due_time, points, is_active, sort_order, payload_json)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, JSON_OBJECT(
        'id', ?,
        'title', ?,
        'description', ?,
        'frequency', ?,
        'scheduleType', ?,
        'dayOfWeek', ?,
        'dayOfMonth', ?,
        'dueTime', ?,
        'points', ?,
        'active', ?,
        'sortOrder', ?
      ))`,
      [
        chore.id,
        tenantId,
        chore.title ?? null,
        chore.description ?? null,
        chore.frequency ?? null,
        chore.scheduleType ?? null,
        chore.dayOfWeek ?? null,
        chore.dayOfMonth ?? null,
        chore.dueTime ?? null,
        chore.points ?? 0,
        chore.active ?? true,
        sortOrder,
        chore.id,
        chore.title ?? null,
        chore.description ?? null,
        chore.frequency ?? null,
        chore.scheduleType ?? null,
        chore.dayOfWeek ?? null,
        chore.dayOfMonth ?? null,
        chore.dueTime ?? null,
        chore.points ?? 0,
        chore.active ?? true,
        sortOrder,
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
