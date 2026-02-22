import type { Pool, PoolConnection, RowDataPacket } from 'mysql2/promise';
import { pool } from '../../config/database.js';

export interface AssignmentRecord {
  id: string;
  choreId?: string | null;
  childId?: string | null;
  assignedAt?: number | null;
  assignedFor?: number | null;
  startDate?: number | null;
  endDate?: number | null;
  daysOfWeek?: unknown;  // JSON array
  repeatPattern?: unknown;  // JSON object
  timeOfDay?: string | null;
  timeWindow?: unknown;  // JSON object
  pointOverrides?: unknown;  // JSON object
  categoryPointOverrides?: unknown;  // JSON object
  rotationState?: unknown;  // JSON object
  status?: string | null;
  points?: number;
  sortOrder?: number;
}

interface AssignmentRow extends RowDataPacket {
  id: string;
  chore_id: string | null;
  child_id: string | null;
  assigned_at: number | null;
  assigned_for: number | null;
  start_date: number | null;
  end_date: number | null;
  days_of_week: string | null;
  repeat_pattern: string | null;
  time_of_day: string | null;
  time_window: string | null;
  point_overrides: string | null;
  category_point_overrides: string | null;
  rotation_state: string | null;
  status: string | null;
  points: number | null;
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

function mapRow(row: AssignmentRow): AssignmentRecord {
  return {
    id: row.id,
    choreId: row.chore_id,
    childId: row.child_id,
    assignedAt: row.assigned_at,
    assignedFor: row.assigned_for,
    startDate: row.start_date,
    endDate: row.end_date,
    daysOfWeek: parseJson(row.days_of_week, 'daysOfWeek'),
    repeatPattern: parseJson(row.repeat_pattern, 'repeatPattern'),
    timeOfDay: row.time_of_day,
    timeWindow: parseJson(row.time_window, 'timeWindow'),
    pointOverrides: parseJson(row.point_overrides, 'pointOverrides'),
    categoryPointOverrides: parseJson(row.category_point_overrides, 'categoryPointOverrides'),
    rotationState: parseJson(row.rotation_state, 'rotationState'),
    status: row.status,
    points: row.points ?? 0,
    sortOrder: row.sort_order ?? 0,
  };
}

export async function listAssignments(tenantId: string, connection?: PoolConnection): Promise<AssignmentRecord[]> {
  const executor = getExecutor(connection);
  const [rows] = await executor.query<AssignmentRow[]>(
    `SELECT id, chore_id, child_id, assigned_at, assigned_for, start_date, end_date,
            days_of_week, repeat_pattern, time_of_day, time_window, point_overrides,
            category_point_overrides, rotation_state, status, points, sort_order
     FROM tenant_assignments_v2
     WHERE tenant_id = ?
     ORDER BY created_at ASC, id ASC`,
    [tenantId]
  );
  return rows.map(mapRow);
}

export async function getAssignmentById(tenantId: string, assignmentId: string, connection?: PoolConnection): Promise<AssignmentRecord | null> {
  const executor = getExecutor(connection);
  const [rows] = await executor.query<AssignmentRow[]>(
    `SELECT id, chore_id, child_id, assigned_at, assigned_for, start_date, end_date,
            days_of_week, repeat_pattern, time_of_day, time_window, point_overrides,
            category_point_overrides, rotation_state, status, points, sort_order
     FROM tenant_assignments_v2
     WHERE tenant_id = ? AND id = ?`,
    [tenantId, assignmentId]
  );

  return rows.length ? mapRow(rows[0]) : null;
}

export async function upsertAssignment(tenantId: string, assignment: AssignmentRecord, connection?: PoolConnection): Promise<void> {
  const executor = getExecutor(connection);
  
  await executor.query(
    `INSERT INTO tenant_assignments_v2
    (id, tenant_id, chore_id, child_id, assigned_at, assigned_for, start_date, end_date,
     days_of_week, repeat_pattern, time_of_day, time_window, point_overrides,
     category_point_overrides, rotation_state, status, points, sort_order)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON DUPLICATE KEY UPDATE
      chore_id = VALUES(chore_id),
      child_id = VALUES(child_id),
      assigned_at = VALUES(assigned_at),
      assigned_for = VALUES(assigned_for),
      start_date = VALUES(start_date),
      end_date = VALUES(end_date),
      days_of_week = VALUES(days_of_week),
      repeat_pattern = VALUES(repeat_pattern),
      time_of_day = VALUES(time_of_day),
      time_window = VALUES(time_window),
      point_overrides = VALUES(point_overrides),
      category_point_overrides = VALUES(category_point_overrides),
      rotation_state = VALUES(rotation_state),
      status = VALUES(status),
      points = VALUES(points),
      sort_order = VALUES(sort_order)`,
    [
      assignment.id,
      tenantId,
      assignment.choreId ?? null,
      assignment.childId ?? null,
      assignment.assignedAt ?? null,
      assignment.assignedFor ?? null,
      assignment.startDate ?? null,
      assignment.endDate ?? null,
      stringifyJson(assignment.daysOfWeek),
      stringifyJson(assignment.repeatPattern),
      assignment.timeOfDay ?? null,
      stringifyJson(assignment.timeWindow),
      stringifyJson(assignment.pointOverrides),
      stringifyJson(assignment.categoryPointOverrides),
      stringifyJson(assignment.rotationState),
      assignment.status ?? null,
      assignment.points ?? 0,
      assignment.sortOrder ?? 0,
    ]
  );
}

export async function replaceAssignments(tenantId: string, assignments: AssignmentRecord[], connection?: PoolConnection): Promise<void> {
  const executor = getExecutor(connection);
  await executor.query('DELETE FROM tenant_assignments_v2 WHERE tenant_id = ?', [tenantId]);

  for (const [index, assignment] of assignments.entries()) {
    const sortOrder = assignment.sortOrder ?? index;
    await executor.query(
      `INSERT INTO tenant_assignments_v2
      (id, tenant_id, chore_id, child_id, assigned_at, assigned_for, start_date, end_date,
       days_of_week, repeat_pattern, time_of_day, time_window, point_overrides,
       category_point_overrides, rotation_state, status, points, sort_order)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        assignment.id,
        tenantId,
        assignment.choreId ?? null,
        assignment.childId ?? null,
        assignment.assignedAt ?? null,
        assignment.assignedFor ?? null,
        assignment.startDate ?? null,
        assignment.endDate ?? null,
        stringifyJson(assignment.daysOfWeek),
        stringifyJson(assignment.repeatPattern),
        assignment.timeOfDay ?? null,
        stringifyJson(assignment.timeWindow),
        stringifyJson(assignment.pointOverrides),
        stringifyJson(assignment.categoryPointOverrides),
        stringifyJson(assignment.rotationState),
        assignment.status ?? null,
        assignment.points ?? 0,
        sortOrder,
      ]
    );
  }
}

export async function deleteAssignments(tenantId: string, connection?: PoolConnection): Promise<void> {
  const executor = getExecutor(connection);
  await executor.query('DELETE FROM tenant_assignments_v2 WHERE tenant_id = ?', [tenantId]);
}

export async function deleteAssignmentById(tenantId: string, assignmentId: string, connection?: PoolConnection): Promise<void> {
  const executor = getExecutor(connection);
  await executor.query('DELETE FROM tenant_assignments_v2 WHERE tenant_id = ? AND id = ?', [tenantId, assignmentId]);
}
