import type { Pool, PoolConnection, RowDataPacket } from 'mysql2/promise';
import { pool } from '../../config/database.js';

export interface CompletionRecord {
  id: string;
  choreId?: string | null;
  childId?: string | null;
  assignmentId?: string | null;
  completedAt?: number | null;
  undoneAt?: number | null;
  overridden?: boolean | null;
  approvalStatus?: string | null;
  approvedAt?: number | null;
  approvedBy?: string | null;
  rejectedReason?: string | null;
  timeOfDay?: string | null;
  status?: string | null;
  pointsAwarded?: number;
  sortOrder?: number;
}

interface CompletionRow extends RowDataPacket {
  id: string;
  chore_id: string | null;
  child_id: string | null;
  assignment_id: string | null;
  completed_at: number | null;
  undone_at: number | null;
  overridden: number | boolean | null;
  approval_status: string | null;
  approved_at: number | null;
  approved_by: string | null;
  rejected_reason: string | null;
  time_of_day: string | null;
  status: string | null;
  points_awarded: number | null;
  sort_order: number | null;
}

function getExecutor(connection?: PoolConnection): Pool | PoolConnection {
  return connection ?? pool;
}

function mapRow(row: CompletionRow): CompletionRecord {
  return {
    id: row.id,
    choreId: row.chore_id,
    childId: row.child_id,
    assignmentId: row.assignment_id,
    completedAt: row.completed_at,
    undoneAt: row.undone_at,
    overridden: row.overridden !== null ? Boolean(row.overridden) : null,
    approvalStatus: row.approval_status,
    approvedAt: row.approved_at,
    approvedBy: row.approved_by,
    rejectedReason: row.rejected_reason,
    timeOfDay: row.time_of_day,
    status: row.status,
    pointsAwarded: row.points_awarded ?? 0,
    sortOrder: row.sort_order ?? 0,
  };
}

export async function listCompletions(tenantId: string, connection?: PoolConnection): Promise<CompletionRecord[]> {
  const executor = getExecutor(connection);
  const [rows] = await executor.query<CompletionRow[]>(
    `SELECT id, chore_id, child_id, assignment_id, completed_at, undone_at, overridden,
            approval_status, approved_at, approved_by, rejected_reason, time_of_day,
            status, points_awarded, sort_order
     FROM tenant_completions_v2
     WHERE tenant_id = ?
     ORDER BY created_at ASC, id ASC`,
    [tenantId]
  );
  return rows.map(mapRow);
}

export async function getCompletionById(tenantId: string, completionId: string, connection?: PoolConnection): Promise<CompletionRecord | null> {
  const executor = getExecutor(connection);
  const [rows] = await executor.query<CompletionRow[]>(
    `SELECT id, chore_id, child_id, assignment_id, completed_at, undone_at, overridden,
            approval_status, approved_at, approved_by, rejected_reason, time_of_day,
            status, points_awarded, sort_order
     FROM tenant_completions_v2
     WHERE tenant_id = ? AND id = ?`,
    [tenantId, completionId]
  );

  return rows.length ? mapRow(rows[0]) : null;
}

export async function upsertCompletion(tenantId: string, completion: CompletionRecord, connection?: PoolConnection): Promise<void> {
  const executor = getExecutor(connection);
  
  await executor.query(
    `INSERT INTO tenant_completions_v2
    (id, tenant_id, chore_id, child_id, assignment_id, completed_at, undone_at, overridden,
     approval_status, approved_at, approved_by, rejected_reason, time_of_day,
     status, points_awarded, sort_order)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON DUPLICATE KEY UPDATE
      chore_id = VALUES(chore_id),
      child_id = VALUES(child_id),
      assignment_id = VALUES(assignment_id),
      completed_at = VALUES(completed_at),
      undone_at = VALUES(undone_at),
      overridden = VALUES(overridden),
      approval_status = VALUES(approval_status),
      approved_at = VALUES(approved_at),
      approved_by = VALUES(approved_by),
      rejected_reason = VALUES(rejected_reason),
      time_of_day = VALUES(time_of_day),
      status = VALUES(status),
      points_awarded = VALUES(points_awarded),
      sort_order = VALUES(sort_order)`,
    [
      completion.id,
      tenantId,
      completion.choreId ?? null,
      completion.childId ?? null,
      completion.assignmentId ?? null,
      completion.completedAt ?? null,
      completion.undoneAt ?? null,
      completion.overridden ?? null,
      completion.approvalStatus ?? null,
      completion.approvedAt ?? null,
      completion.approvedBy ?? null,
      completion.rejectedReason ?? null,
      completion.timeOfDay ?? null,
      completion.status ?? null,
      completion.pointsAwarded ?? 0,
      completion.sortOrder ?? 0,
    ]
  );
}

export async function replaceCompletions(tenantId: string, completions: CompletionRecord[], connection?: PoolConnection): Promise<void> {
  const executor = getExecutor(connection);
  await executor.query('DELETE FROM tenant_completions_v2 WHERE tenant_id = ?', [tenantId]);

  for (const [index, completion] of completions.entries()) {
    const sortOrder = completion.sortOrder ?? index;
    await executor.query(
      `INSERT INTO tenant_completions_v2
      (id, tenant_id, chore_id, child_id, assignment_id, completed_at, undone_at, overridden,
       approval_status, approved_at, approved_by, rejected_reason, time_of_day,
       status, points_awarded, sort_order)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        completion.id,
        tenantId,
        completion.choreId ?? null,
        completion.childId ?? null,
        completion.assignmentId ?? null,
        completion.completedAt ?? null,
        completion.undoneAt ?? null,
        completion.overridden ?? null,
        completion.approvalStatus ?? null,
        completion.approvedAt ?? null,
        completion.approvedBy ?? null,
        completion.rejectedReason ?? null,
        completion.timeOfDay ?? null,
        completion.status ?? null,
        completion.pointsAwarded ?? 0,
        sortOrder,
      ]
    );
  }
}

export async function deleteCompletions(tenantId: string, connection?: PoolConnection): Promise<void> {
  const executor = getExecutor(connection);
  await executor.query('DELETE FROM tenant_completions_v2 WHERE tenant_id = ?', [tenantId]);
}

export async function deleteCompletionById(tenantId: string, completionId: string, connection?: PoolConnection): Promise<void> {
  const executor = getExecutor(connection);
  await executor.query('DELETE FROM tenant_completions_v2 WHERE tenant_id = ? AND id = ?', [tenantId, completionId]);
}
