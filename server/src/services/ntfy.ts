import type { PoolConnection, RowDataPacket } from 'mysql2/promise';
import { pool } from '../config/database.js';
import { getTenantData, setTenantData } from './tenant-data-store.js';
import { listCompletions, type CompletionRecord } from './repositories/completions-repo.js';
import { listPurchases, type PurchaseRecord } from './repositories/purchases-repo.js';
import { listChildren } from './repositories/children-repo.js';
import { listChores } from './repositories/chores-repo.js';
import { listRewards } from './repositories/rewards-repo.js';
import { getNtfyEvents, type NtfyEvent } from './ntfy-events.js';
import { getNtfySettingsRow, publicNtfySettings, decryptNtfyCredential, type NtfySettingsRow, type NtfyEventType } from './ntfy-settings.js';

export async function publishNtfy(row: NtfySettingsRow, event: Pick<NtfyEvent, 'title' | 'message'>, fetcher = fetch): Promise<void> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (row.auth_mode !== 'none') {
    if (!row.credential) throw new Error('Ntfy credentials are missing');
    let secret: string;
    try { secret = decryptNtfyCredential(row.credential); }
    catch { throw new Error('Unable to decrypt ntfy credentials. Re-enter them in settings.'); }
    headers.Authorization = row.auth_mode === 'token' ? `Bearer ${secret}` : `Basic ${Buffer.from(`${row.username}:${secret}`).toString('base64')}`;
  }
  let response: globalThis.Response;
  try {
    // Keep Unicode messages below ntfy's size limit without splitting a character.
    const message = new TextDecoder().decode(Buffer.from(event.message, 'utf8').subarray(0, 3000), { stream: true });
    response = await fetcher(`${row.server_url}/`, {
      method: 'POST', headers, redirect: 'error', signal: AbortSignal.timeout(5000),
      body: JSON.stringify({ topic: row.topic, title: event.title, message }),
    });
  } catch { throw new Error('Unable to reach the ntfy server within 5 seconds. Check the server URL and connection.'); }
  // Do not include ntfy response bodies, URLs or credentials in logs or API errors.
  await response.body?.cancel();
  if (!response.ok) throw new Error(`Ntfy server returned HTTP ${response.status}`);
}

export async function enqueueNtfyEvents(tenantId: string, events: NtfyEvent[], connection: PoolConnection): Promise<void> {
  if (!events.length) return;
  const settings = publicNtfySettings(await getNtfySettingsRow(tenantId, connection));
  if (!settings.enabled) return;
  for (const event of events) {
    if (!settings.notificationTypes[event.type]) continue;
    await connection.query(
      'INSERT INTO ntfy_outbox (tenant_id, event_type, title, message) VALUES (?, ?, ?, ?)',
      [tenantId, event.type, event.title, event.message],
    );
  }
}

// Save the state change and its delivery job atomically. Lock a family row to
// serialize concurrent snapshots, including retries from a second device.
export async function saveWithNtfyEvents(key: 'completions' | 'purchases', tenantId: string, value: CompletionRecord[] | PurchaseRecord[]): Promise<void> {
  // Complete any existing legacy migration before taking the transactional snapshot.
  await getTenantData(key, tenantId);
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    await connection.query('SELECT id FROM tenants WHERE id = ? FOR UPDATE', [tenantId]);
    const before = key === 'completions' ? await listCompletions(tenantId, connection) : await listPurchases(tenantId, connection);
    await setTenantData(key, tenantId, value, connection);
    const names = {
      children: await listChildren(tenantId, connection),
      chores: await listChores(tenantId, connection),
      rewards: await listRewards(tenantId, connection),
    };
    await enqueueNtfyEvents(tenantId, getNtfyEvents(key, before, value, names), connection);
    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally { connection.release(); }
  void flushNtfyOutbox();
}

let flushing = false;
export async function flushNtfyOutbox(): Promise<void> {
  if (flushing) return;
  flushing = true;
  try {
    for (let i = 0; i < 20; i++) {
      const connection = await pool.getConnection();
      try {
        await connection.beginTransaction();
        // Database locks allow more than one API instance to safely drain the queue.
        const [jobs] = await connection.query<(RowDataPacket & { id: number; tenant_id: string; event_type: NtfyEventType; title: string; message: string; attempts: number })[]>(
          'SELECT * FROM ntfy_outbox WHERE next_attempt_at <= NOW() ORDER BY id LIMIT 1 FOR UPDATE SKIP LOCKED',
        );
        if (!jobs.length) { await connection.commit(); break; }
        const job = jobs[0];
        const row = await getNtfySettingsRow(job.tenant_id, connection);
        const settings = publicNtfySettings(row);
        if (!settings.enabled || !settings.notificationTypes[job.event_type]) {
          await connection.query('DELETE FROM ntfy_outbox WHERE id = ?', [job.id]);
        } else {
          try {
            await publishNtfy(row, job);
            await connection.query('UPDATE tenant_ntfy_settings SET last_delivered_at = NOW(), last_error = NULL WHERE tenant_id = ?', [job.tenant_id]);
            await connection.query('DELETE FROM ntfy_outbox WHERE id = ?', [job.id]);
          } catch (error) {
            const delay = Math.min(3600, 5 * 2 ** Math.min(job.attempts, 10));
            await connection.query('UPDATE ntfy_outbox SET attempts = attempts + 1, next_attempt_at = TIMESTAMPADD(SECOND, ?, NOW()) WHERE id = ?', [delay, job.id]);
            await connection.query('UPDATE tenant_ntfy_settings SET last_error = ? WHERE tenant_id = ?', [error instanceof Error ? error.message : 'Ntfy delivery failed', job.tenant_id]);
          }
        }
        await connection.commit();
      } catch {
        await connection.rollback();
        console.error('Unable to process ntfy delivery queue');
        break;
      } finally { connection.release(); }
    }
  } catch { console.error('Unable to connect to ntfy delivery queue'); }
  finally { flushing = false; }
}

export function startNtfyWorker(): void {
  const timer = setInterval(() => { void flushNtfyOutbox(); }, 5000);
  timer.unref();
  void flushNtfyOutbox();
}
