import type { Pool, PoolConnection, RowDataPacket } from 'mysql2/promise';
import { pool } from '../../config/database.js';

export interface ChildAvailabilityRecord {
  id: string;
  childId?: string | null;
  type?: string | null;
  scheduleType?: string | null;
  startDate?: number | null;
  endDate?: number | null;
  dayOfWeek?: number | null;
  startTime?: string | null;
  endTime?: string | null;
  repeatPattern?: unknown;  // JSON object
  note?: string | null;
  isAvailable?: boolean | null;
  sortOrder?: number;
}

interface ChildAvailabilityRow extends RowDataPacket {
  id: string;
  child_id: string | null;
  type: string | null;
  schedule_type: string | null;
  start_date: number | null;
  end_date: number | null;
  day_of_week: number | null;
  start_time: string | null;
  end_time: string | null;
  repeat_pattern: string | null;
  note: string | null;
  is_available: number | boolean | null;
  sort_order: number | null;
}

function getExecutor(connection?: PoolConnection): Pool | PoolConnection {
  return connection ?? pool;
}

// Helper function to safely parse JSON fields
function parseJson(value: string | null | undefined, fieldName: string = 'unknown') {
  if (!value) return null;
  try {
    return typeof value === 'string' ? JSON.parse(value) : value;
  } catch (error) {
    console.error(`Failed to parse JSON value for field "${fieldName}":`, value, error);
    return null;
  }
}

// Helper function to safely stringify JSON fields
function stringifyJson(value: any) {
  if (value === null || value === undefined) return null;
  return typeof value === 'string' ? value : JSON.stringify(value);
}

function mapRow(row: ChildAvailabilityRow): ChildAvailabilityRecord {
  return {
    id: row.id,
    childId: row.child_id,
    type: row.type,
    scheduleType: row.schedule_type,
    startDate: row.start_date,
    endDate: row.end_date,
    dayOfWeek: row.day_of_week,
    startTime: row.start_time,
    endTime: row.end_time,
    repeatPattern: parseJson(row.repeat_pattern, 'repeatPattern'),
    note: row.note,
    isAvailable: row.is_available !== null ? Boolean(row.is_available) : null,
    sortOrder: row.sort_order ?? 0,
  };
}

export async function listChildAvailability(tenantId: string, connection?: PoolConnection): Promise<ChildAvailabilityRecord[]> {
  const executor = getExecutor(connection);
  const [rows] = await executor.query<ChildAvailabilityRow[]>(
    `SELECT id, child_id, type, schedule_type, start_date, end_date, day_of_week,
            start_time, end_time, repeat_pattern, note, is_available, sort_order
     FROM tenant_child_availability_v2
     WHERE tenant_id = ?
     ORDER BY sort_order ASC, created_at ASC, id ASC`,
    [tenantId]
  );
  return rows.map(mapRow);
}

export async function getChildAvailabilityById(tenantId: string, availabilityId: string, connection?: PoolConnection): Promise<ChildAvailabilityRecord | null> {
  const executor = getExecutor(connection);
  const [rows] = await executor.query<ChildAvailabilityRow[]>(
    `SELECT id, child_id, type, schedule_type, start_date, end_date, day_of_week,
            start_time, end_time, repeat_pattern, note, is_available, sort_order
     FROM tenant_child_availability_v2
     WHERE tenant_id = ? AND id = ?`,
    [tenantId, availabilityId]
  );

  return rows.length ? mapRow(rows[0]) : null;
}

export async function upsertChildAvailability(tenantId: string, availability: ChildAvailabilityRecord, connection?: PoolConnection): Promise<void> {
  const executor = getExecutor(connection);
  
  await executor.query(
    `INSERT INTO tenant_child_availability_v2
    (id, tenant_id, child_id, type, schedule_type, start_date, end_date, day_of_week,
     start_time, end_time, repeat_pattern, note, is_available, sort_order)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON DUPLICATE KEY UPDATE
      child_id = VALUES(child_id),
      type = VALUES(type),
      schedule_type = VALUES(schedule_type),
      start_date = VALUES(start_date),
      end_date = VALUES(end_date),
      day_of_week = VALUES(day_of_week),
      start_time = VALUES(start_time),
      end_time = VALUES(end_time),
      repeat_pattern = VALUES(repeat_pattern),
      note = VALUES(note),
      is_available = VALUES(is_available),
      sort_order = VALUES(sort_order)`,
    [
      availability.id,
      tenantId,
      availability.childId ?? null,
      availability.type ?? null,
      availability.scheduleType ?? null,
      availability.startDate ?? null,
      availability.endDate ?? null,
      availability.dayOfWeek ?? null,
      availability.startTime ?? null,
      availability.endTime ?? null,
      stringifyJson(availability.repeatPattern),
      availability.note ?? null,
      availability.isAvailable ?? null,
      availability.sortOrder ?? 0,
    ]
  );
}

export async function replaceChildAvailability(tenantId: string, availabilities: ChildAvailabilityRecord[], connection?: PoolConnection): Promise<void> {
  const executor = getExecutor(connection);
  await executor.query('DELETE FROM tenant_child_availability_v2 WHERE tenant_id = ?', [tenantId]);

  for (const [index, availability] of availabilities.entries()) {
    const sortOrder = availability.sortOrder ?? index;
    await executor.query(
      `INSERT INTO tenant_child_availability_v2
      (id, tenant_id, child_id, type, schedule_type, start_date, end_date, day_of_week,
       start_time, end_time, repeat_pattern, note, is_available, sort_order)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        availability.id,
        tenantId,
        availability.childId ?? null,
        availability.type ?? null,
        availability.scheduleType ?? null,
        availability.startDate ?? null,
        availability.endDate ?? null,
        availability.dayOfWeek ?? null,
        availability.startTime ?? null,
        availability.endTime ?? null,
        stringifyJson(availability.repeatPattern),
        availability.note ?? null,
        availability.isAvailable ?? null,
        sortOrder,
      ]
    );
  }
}

export async function deleteChildAvailability(tenantId: string, connection?: PoolConnection): Promise<void> {
  const executor = getExecutor(connection);
  await executor.query('DELETE FROM tenant_child_availability_v2 WHERE tenant_id = ?', [tenantId]);
}

export async function deleteChildAvailabilityById(tenantId: string, availabilityId: string, connection?: PoolConnection): Promise<void> {
  const executor = getExecutor(connection);
  await executor.query('DELETE FROM tenant_child_availability_v2 WHERE tenant_id = ? AND id = ?', [tenantId, availabilityId]);
}
