import { randomBytes, createCipheriv, createDecipheriv, createHash } from 'node:crypto';
import type { PoolConnection, RowDataPacket } from 'mysql2/promise';
import { pool } from '../config/database.js';

export const NTFY_EVENT_TYPES = [
  'choreCompleted', 'choreUncompleted', 'choreApproved', 'choreRejected',
  'rewardRequested', 'rewardFulfilled', 'rewardCancelled',
] as const;
export type NtfyEventType = typeof NTFY_EVENT_TYPES[number];
export type NtfyAuthMode = 'none' | 'token' | 'basic';
export interface NtfySettings {
  enabled: boolean;
  serverUrl: string;
  topic: string;
  authMode: NtfyAuthMode;
  username: string;
  hasCredential: boolean;
  notificationTypes: Record<NtfyEventType, boolean>;
  lastDeliveredAt: string | null;
  lastError: string | null;
}
export interface NtfySettingsRow extends RowDataPacket {
  tenant_id: string;
  enabled: number;
  server_url: string;
  topic: string;
  auth_mode: NtfyAuthMode;
  username: string;
  credential: string | null;
  notification_types: Record<NtfyEventType, boolean> | string;
  last_delivered_at: Date | null;
  last_error: string | null;
}

export class NtfyValidationError extends Error {}

export function generateNtfyTopic(): string {
  return `chorequest-${randomBytes(24).toString('hex')}`;
}

export async function ensureNtfySettings(tenantId: string, connection?: PoolConnection): Promise<void> {
  await (connection ?? pool).query(
    `INSERT IGNORE INTO tenant_ntfy_settings (tenant_id, topic, notification_types)
     VALUES (?, ?, ?)`,
    [tenantId, generateNtfyTopic(), JSON.stringify(Object.fromEntries(NTFY_EVENT_TYPES.map(type => [type, true])))],
  );
}

export async function getNtfySettingsRow(tenantId: string, connection?: PoolConnection): Promise<NtfySettingsRow> {
  await ensureNtfySettings(tenantId, connection);
  const [rows] = await (connection ?? pool).query<NtfySettingsRow[]>(
    'SELECT * FROM tenant_ntfy_settings WHERE tenant_id = ?', [tenantId],
  );
  return rows[0];
}

export function publicNtfySettings(row: NtfySettingsRow): NtfySettings {
  const types = typeof row.notification_types === 'string' ? JSON.parse(row.notification_types) : row.notification_types;
  return {
    enabled: Boolean(row.enabled), serverUrl: row.server_url, topic: row.topic,
    authMode: row.auth_mode, username: row.username, hasCredential: Boolean(row.credential),
    notificationTypes: Object.fromEntries(NTFY_EVENT_TYPES.map(type => [type, types[type] !== false])) as NtfySettings['notificationTypes'],
    lastDeliveredAt: row.last_delivered_at?.toISOString() ?? null, lastError: row.last_error,
  };
}

// Keep credentials out of KV exports and API responses, and encrypt them at rest.
function credentialKey(): Buffer {
  const secret = process.env.NTFY_ENCRYPTION_KEY || process.env.JWT_SECRET;
  if (!secret && process.env.NODE_ENV === 'production') throw new Error('Ntfy credential encryption key is not configured');
  return createHash('sha256').update(secret || 'dev-secret-change-in-production').digest();
}

export function encryptNtfyCredential(value: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', credentialKey(), iv);
  const encrypted = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
  return Buffer.concat([iv, cipher.getAuthTag(), encrypted]).toString('base64');
}

export function decryptNtfyCredential(value: string): string {
  const data = Buffer.from(value, 'base64');
  const decipher = createDecipheriv('aes-256-gcm', credentialKey(), data.subarray(0, 12));
  decipher.setAuthTag(data.subarray(12, 28));
  return Buffer.concat([decipher.update(data.subarray(28)), decipher.final()]).toString('utf8');
}

export function validateNtfySettings(input: unknown, current: NtfySettingsRow) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new NtfyValidationError('Invalid ntfy settings');
  const value = input as Record<string, unknown>;
  if (typeof value.enabled !== 'boolean') throw new NtfyValidationError('Enabled must be a boolean');
  let server: URL;
  try { server = new URL(String(value.serverUrl)); } catch { throw new NtfyValidationError('Enter a valid server URL'); }
  if (!['https:', 'http:'].includes(server.protocol) || server.username || server.password || server.search || server.hash) {
    throw new NtfyValidationError('Use an HTTP or HTTPS server URL without credentials, a query, or a fragment');
  }
  if (server.href.length > 2048) throw new NtfyValidationError('Server URL is too long');
  const serverUrl = server.href.replace(/\/+$/, '');
  const topic = typeof value.topic === 'string' ? value.topic.trim() : '';
  const reserved = ['app', 'account', 'docs', 'file', 'static', 'v1'];
  if (!/^[a-zA-Z0-9_-]{1,64}$/.test(topic) || reserved.includes(topic.toLowerCase())) {
    throw new NtfyValidationError('Topic must contain 1–64 letters, numbers, underscores, or hyphens and cannot be a reserved ntfy path');
  }
  if (!['none', 'token', 'basic'].includes(String(value.authMode))) throw new NtfyValidationError('Choose a valid authentication method');
  const authMode = value.authMode as NtfyAuthMode;
  const username = typeof value.username === 'string' ? value.username.trim() : '';
  if (username.length > 255 || username.includes(':') || /[\r\n]/.test(username)) throw new NtfyValidationError('Invalid username');
  if (authMode === 'basic' && !username) throw new NtfyValidationError('Username is required');
  const provided = value.credential;
  if (provided !== undefined && (typeof provided !== 'string' || provided.length > 4096 || /[\r\n]/.test(provided))) {
    throw new NtfyValidationError('Invalid credential');
  }
  let credential = authMode === 'none' ? null : current.credential;
  if (authMode !== 'none') {
    if (typeof provided === 'string' && provided.length > 0) credential = encryptNtfyCredential(provided);
    // Never silently forward an existing secret to a changed server or account.
    else if (serverUrl !== current.server_url || authMode !== current.auth_mode || (authMode === 'basic' && username !== current.username)) credential = null;
    if (!credential) throw new NtfyValidationError('Enter credentials for this server and authentication method');
  }
  const types = value.notificationTypes as Record<string, unknown> | undefined;
  if (!types || typeof types !== 'object' || Array.isArray(types) || NTFY_EVENT_TYPES.some(type => typeof types[type] !== 'boolean')) {
    throw new NtfyValidationError('Choose enabled or disabled for every notification type');
  }
  return {
    enabled: value.enabled, serverUrl, topic, authMode, username: authMode === 'basic' ? username : '', credential,
    notificationTypes: Object.fromEntries(NTFY_EVENT_TYPES.map(type => [type, types[type]])),
  };
}

export async function updateNtfySettings(tenantId: string, input: unknown): Promise<NtfySettings> {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    await ensureNtfySettings(tenantId, connection);
    const [rows] = await connection.query<NtfySettingsRow[]>('SELECT * FROM tenant_ntfy_settings WHERE tenant_id = ? FOR UPDATE', [tenantId]);
    const next = validateNtfySettings(input, rows[0]);
    await connection.query(
      `UPDATE tenant_ntfy_settings SET enabled = ?, server_url = ?, topic = ?, auth_mode = ?, username = ?,
       credential = ?, notification_types = ?, last_error = NULL WHERE tenant_id = ?`,
      [next.enabled, next.serverUrl, next.topic, next.authMode, next.username, next.credential, JSON.stringify(next.notificationTypes), tenantId],
    );
    const updated = publicNtfySettings(await getNtfySettingsRow(tenantId, connection));
    await connection.commit();
    return updated;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally { connection.release(); }
}
