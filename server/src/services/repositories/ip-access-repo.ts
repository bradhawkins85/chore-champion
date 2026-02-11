import type { Pool, PoolConnection, RowDataPacket } from 'mysql2/promise';
import { pool } from '../../config/database.js';

export interface ParentPinRecord {
  pinHash: string | null;
  pinHint: string | null;
}

export interface IpRestrictionsRecord {
  enabled: boolean;
  mode: string | null;
}

export interface IpAccessRequestRecord {
  id: string;
  ip: string | null;
  token: string | null;
  approved: boolean;
  requestedAt: number | null;
  approvedAt: number | null;
  expiresAt: number | null;
}

interface ParentPinRow extends RowDataPacket {
  pin_hash: string | null;
  pin_hint: string | null;
}

interface IpRestrictionsRow extends RowDataPacket {
  enabled: number | boolean | null;
  mode: string | null;
}

interface IpAccessRequestRow extends RowDataPacket {
  id: string;
  ip: string | null;
  token: string | null;
  approved: number | boolean | null;
  requested_at: number | null;
  approved_at: number | null;
  expires_at: number | null;
}

interface TokenLookupRow extends IpAccessRequestRow {
  tenant_id: string;
}

function getExecutor(connection?: PoolConnection): Pool | PoolConnection {
  return connection ?? pool;
}

export async function getParentPin(tenantId: string, connection?: PoolConnection): Promise<ParentPinRecord | null> {
  const executor = getExecutor(connection);
  const [rows] = await executor.query<ParentPinRow[]>(
    'SELECT pin_hash, pin_hint FROM tenant_parent_pin_v2 WHERE tenant_id = ?',
    [tenantId]
  );
  if (!rows.length) return null;

  return {
    pinHash: rows[0].pin_hash,
    pinHint: rows[0].pin_hint,
  };
}

export async function setParentPin(tenantId: string, pin: ParentPinRecord, connection?: PoolConnection): Promise<void> {
  const executor = getExecutor(connection);
  await executor.query(
    `INSERT INTO tenant_parent_pin_v2 (tenant_id, pin_hash, pin_hint)
     VALUES (?, ?, ?)
     ON DUPLICATE KEY UPDATE pin_hash = VALUES(pin_hash), pin_hint = VALUES(pin_hint)`,
    [tenantId, pin.pinHash ?? null, pin.pinHint ?? null]
  );
}

export async function getIpRestrictions(tenantId: string, connection?: PoolConnection): Promise<IpRestrictionsRecord | null> {
  const executor = getExecutor(connection);
  const [rows] = await executor.query<IpRestrictionsRow[]>(
    'SELECT enabled, mode FROM tenant_ip_restrictions_v2 WHERE tenant_id = ?',
    [tenantId]
  );
  if (!rows.length) return null;

  return {
    enabled: Boolean(rows[0].enabled),
    mode: rows[0].mode,
  };
}

export async function setIpRestrictions(tenantId: string, value: IpRestrictionsRecord, connection?: PoolConnection): Promise<void> {
  const executor = getExecutor(connection);
  await executor.query(
    `INSERT INTO tenant_ip_restrictions_v2 (tenant_id, enabled, mode)
     VALUES (?, ?, ?)
     ON DUPLICATE KEY UPDATE enabled = VALUES(enabled), mode = VALUES(mode)`,
    [tenantId, value.enabled, value.mode ?? null]
  );
}

export async function getIpAccessRequestById(tenantId: string, requestId: string, connection?: PoolConnection): Promise<IpAccessRequestRecord | null> {
  const executor = getExecutor(connection);
  const [rows] = await executor.query<IpAccessRequestRow[]>(
    `SELECT id, ip, token, approved, requested_at, approved_at, expires_at
     FROM tenant_ip_access_requests_v2
     WHERE tenant_id = ? AND id = ?
     LIMIT 1`,
    [tenantId, requestId]
  );

  if (!rows.length) return null;

  const row = rows[0];
  return {
    id: row.id,
    ip: row.ip,
    token: row.token,
    approved: Boolean(row.approved),
    requestedAt: row.requested_at,
    approvedAt: row.approved_at,
    expiresAt: row.expires_at,
  };
}

export async function upsertIpAccessRequest(
  tenantId: string,
  request: IpAccessRequestRecord,
  connection?: PoolConnection
): Promise<void> {
  const executor = getExecutor(connection);
  await executor.query(
    `INSERT INTO tenant_ip_access_requests_v2
    (id, tenant_id, ip, token, approved, requested_at, approved_at, expires_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    ON DUPLICATE KEY UPDATE
      ip = VALUES(ip),
      token = VALUES(token),
      approved = VALUES(approved),
      requested_at = VALUES(requested_at),
      approved_at = VALUES(approved_at),
      expires_at = VALUES(expires_at)`,
    [
      request.id,
      tenantId,
      request.ip ?? null,
      request.token ?? null,
      request.approved,
      request.requestedAt ?? null,
      request.approvedAt ?? null,
      request.expiresAt ?? null,
    ]
  );
}

export async function getIpAccessRequestByToken(
  token: string,
  connection?: PoolConnection
): Promise<(IpAccessRequestRecord & { tenantId: string }) | null> {
  const executor = getExecutor(connection);
  const [rows] = await executor.query<TokenLookupRow[]>(
    `SELECT tenant_id, id, ip, token, approved, requested_at, approved_at, expires_at
     FROM tenant_ip_access_requests_v2
     WHERE token = ?
     LIMIT 1`,
    [token]
  );

  if (!rows.length) return null;

  const row = rows[0];
  return {
    tenantId: row.tenant_id,
    id: row.id,
    ip: row.ip,
    token: row.token,
    approved: Boolean(row.approved),
    requestedAt: row.requested_at,
    approvedAt: row.approved_at,
    expiresAt: row.expires_at,
  };
}

export async function findPendingIpAccessRequestForIp(
  tenantId: string,
  ip: string,
  now: number,
  connection?: PoolConnection
): Promise<IpAccessRequestRecord | null> {
  const executor = getExecutor(connection);
  const [rows] = await executor.query<IpAccessRequestRow[]>(
    `SELECT id, ip, token, approved, requested_at, approved_at, expires_at
     FROM tenant_ip_access_requests_v2
     WHERE tenant_id = ?
       AND ip = ?
       AND approved = FALSE
       AND expires_at > ?
     ORDER BY requested_at DESC
     LIMIT 1`,
    [tenantId, ip, now]
  );

  if (!rows.length) return null;

  const row = rows[0];
  return {
    id: row.id,
    ip: row.ip,
    token: row.token,
    approved: Boolean(row.approved),
    requestedAt: row.requested_at,
    approvedAt: row.approved_at,
    expiresAt: row.expires_at,
  };
}

export async function approveIpAccessRequestById(
  tenantId: string,
  requestId: string,
  approvedAt: number,
  connection?: PoolConnection
): Promise<void> {
  const executor = getExecutor(connection);
  await executor.query(
    `UPDATE tenant_ip_access_requests_v2
     SET approved = TRUE,
         approved_at = ?
     WHERE tenant_id = ? AND id = ?`,
    [approvedAt, tenantId, requestId]
  );
}

export async function listPendingIpAccessRequests(
  tenantId: string,
  now: number,
  connection?: PoolConnection
): Promise<IpAccessRequestRecord[]> {
  const executor = getExecutor(connection);
  const [rows] = await executor.query<IpAccessRequestRow[]>(
    `SELECT id, ip, token, approved, requested_at, approved_at, expires_at
     FROM tenant_ip_access_requests_v2
     WHERE tenant_id = ?
       AND approved = FALSE
       AND expires_at > ?
     ORDER BY requested_at DESC`,
    [tenantId, now]
  );

  return rows.map((row) => ({
    id: row.id,
    ip: row.ip,
    token: row.token,
    approved: Boolean(row.approved),
    requestedAt: row.requested_at,
    approvedAt: row.approved_at,
    expiresAt: row.expires_at,
  }));
}

export async function listIpAccessRequests(tenantId: string, connection?: PoolConnection): Promise<IpAccessRequestRecord[]> {
  const executor = getExecutor(connection);
  const [rows] = await executor.query<IpAccessRequestRow[]>(
    `SELECT id, ip, token, approved, requested_at, approved_at, expires_at
     FROM tenant_ip_access_requests_v2 WHERE tenant_id = ?
     ORDER BY requested_at ASC`,
    [tenantId]
  );

  return rows.map((row) => ({
    id: row.id,
    ip: row.ip,
    token: row.token,
    approved: Boolean(row.approved),
    requestedAt: row.requested_at,
    approvedAt: row.approved_at,
    expiresAt: row.expires_at,
  }));
}

export async function replaceIpAccessRequests(
  tenantId: string,
  requests: IpAccessRequestRecord[],
  connection?: PoolConnection
): Promise<void> {
  const executor = getExecutor(connection);
  await executor.query('DELETE FROM tenant_ip_access_requests_v2 WHERE tenant_id = ?', [tenantId]);

  for (const request of requests) {
    await executor.query(
      `INSERT INTO tenant_ip_access_requests_v2
      (id, tenant_id, ip, token, approved, requested_at, approved_at, expires_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        request.id,
        tenantId,
        request.ip ?? null,
        request.token ?? null,
        request.approved,
        request.requestedAt ?? null,
        request.approvedAt ?? null,
        request.expiresAt ?? null,
      ]
    );
  }
}

export async function deleteIpAccessRequests(tenantId: string, connection?: PoolConnection): Promise<void> {
  const executor = getExecutor(connection);
  await executor.query('DELETE FROM tenant_ip_access_requests_v2 WHERE tenant_id = ?', [tenantId]);
}

export async function deleteIpAccessRequestById(tenantId: string, requestId: string, connection?: PoolConnection): Promise<void> {
  const executor = getExecutor(connection);
  await executor.query('DELETE FROM tenant_ip_access_requests_v2 WHERE tenant_id = ? AND id = ?', [tenantId, requestId]);
}
