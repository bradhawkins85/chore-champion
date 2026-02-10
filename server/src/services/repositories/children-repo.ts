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
  avatarColor?: string | null;
  icsUrl?: string | null;
  calendarLastRefresh?: number | null;
  calendarAutoRefresh?: boolean | null;
  calendarRefreshInterval?: string | null;
  calendarShowTimes?: boolean | null;
  totalPoints?: number | null;
  createdAt?: number | null;
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
  avatar_color?: string | null;
  ics_url?: string | null;
  calendar_last_refresh?: number | null;
  calendar_auto_refresh?: number | boolean | null;
  calendar_refresh_interval?: string | null;
  calendar_show_times?: number | boolean | null;
  total_points?: number | null;
  created_at_timestamp?: number | null;
}

function getExecutor(connection?: PoolConnection): Pool | PoolConnection {
  return connection ?? pool;
}

function mapRow(row: ChildRow): ChildRecord {
  return {
    id: row.id,
    firstName: row.first_name,
    lastName: row.last_name,
    name: row.display_name,
    status: row.status,
    points: row.points_balance ?? 0,
    isActive: Boolean(row.is_active ?? true),
    sortOrder: row.sort_order ?? 0,
    avatarColor: row.avatar_color,
    icsUrl: row.ics_url,
    calendarLastRefresh: row.calendar_last_refresh,
    calendarAutoRefresh: row.calendar_auto_refresh !== null ? Boolean(row.calendar_auto_refresh) : null,
    calendarRefreshInterval: row.calendar_refresh_interval,
    calendarShowTimes: row.calendar_show_times !== null ? Boolean(row.calendar_show_times) : null,
    totalPoints: row.total_points,
    createdAt: row.created_at_timestamp,
  };
}

export async function listChildren(tenantId: string, connection?: PoolConnection): Promise<ChildRecord[]> {
  const executor = getExecutor(connection);
  const [rows] = await executor.query<ChildRow[]>(
    `SELECT id, first_name, last_name, display_name, status, points_balance, is_active, sort_order,
            avatar_color, ics_url, calendar_last_refresh, calendar_auto_refresh, 
            calendar_refresh_interval, calendar_show_times, total_points, created_at_timestamp
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
    `SELECT id, first_name, last_name, display_name, status, points_balance, is_active, sort_order,
            avatar_color, ics_url, calendar_last_refresh, calendar_auto_refresh,
            calendar_refresh_interval, calendar_show_times, total_points, created_at_timestamp
     FROM tenant_children_v2
     WHERE tenant_id = ? AND id = ?`,
    [tenantId, childId]
  );

  return rows.length ? mapRow(rows[0]) : null;
}

export async function upsertChild(tenantId: string, child: ChildRecord, connection?: PoolConnection): Promise<void> {
  const executor = getExecutor(connection);
  await executor.query(
    `INSERT INTO tenant_children_v2
     (id, tenant_id, first_name, last_name, display_name, status, points_balance, is_active, sort_order,
      avatar_color, ics_url, calendar_last_refresh, calendar_auto_refresh, calendar_refresh_interval,
      calendar_show_times, total_points, created_at_timestamp)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
      first_name = VALUES(first_name),
      last_name = VALUES(last_name),
      display_name = VALUES(display_name),
      status = VALUES(status),
      points_balance = VALUES(points_balance),
      is_active = VALUES(is_active),
      sort_order = VALUES(sort_order),
      avatar_color = VALUES(avatar_color),
      ics_url = VALUES(ics_url),
      calendar_last_refresh = VALUES(calendar_last_refresh),
      calendar_auto_refresh = VALUES(calendar_auto_refresh),
      calendar_refresh_interval = VALUES(calendar_refresh_interval),
      calendar_show_times = VALUES(calendar_show_times),
      total_points = VALUES(total_points),
      created_at_timestamp = VALUES(created_at_timestamp)`,
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
      child.avatarColor ?? null,
      child.icsUrl ?? null,
      child.calendarLastRefresh ?? null,
      child.calendarAutoRefresh ?? null,
      child.calendarRefreshInterval ?? null,
      child.calendarShowTimes ?? null,
      child.totalPoints ?? null,
      child.createdAt ?? null,
    ]
  );
}

export async function replaceChildren(tenantId: string, children: ChildRecord[], connection?: PoolConnection): Promise<void> {
  const executor = getExecutor(connection);
  await executor.query('DELETE FROM tenant_children_v2 WHERE tenant_id = ?', [tenantId]);

  for (const [index, child] of children.entries()) {
    const sortOrder = child.sortOrder ?? index;
    await executor.query(
      `INSERT INTO tenant_children_v2
       (id, tenant_id, first_name, last_name, display_name, status, points_balance, is_active, sort_order,
        avatar_color, ics_url, calendar_last_refresh, calendar_auto_refresh, calendar_refresh_interval,
        calendar_show_times, total_points, created_at_timestamp)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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
        child.avatarColor ?? null,
        child.icsUrl ?? null,
        child.calendarLastRefresh ?? null,
        child.calendarAutoRefresh ?? null,
        child.calendarRefreshInterval ?? null,
        child.calendarShowTimes ?? null,
        child.totalPoints ?? null,
        child.createdAt ?? null,
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
