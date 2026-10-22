import { test } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { createServer, type Server } from 'node:http';
import express from 'express';
import jwt from 'jsonwebtoken';
import type { RowDataPacket } from 'mysql2/promise';
import { initDatabase, pool } from '../src/config/database.js';
import kvRoutes from '../src/routes/kv.js';
import ntfyRoutes from '../src/routes/ntfy.js';
import authRoutes from '../src/routes/auth.js';
import { setTenantData, getTenantData } from '../src/services/tenant-data-store.js';
import { createNtfyTables } from '../src/services/ntfy-schema.js';
import { NTFY_EVENT_TYPES } from '../src/services/ntfy-settings.js';
import { flushNtfyOutbox } from '../src/services/ntfy.js';

async function listen(server: Server): Promise<string> {
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  assert.ok(address && typeof address !== 'string');
  return `http://127.0.0.1:${address.port}`;
}
async function eventually(check: () => Promise<boolean>, timeout = 5000): Promise<void> {
  const until = Date.now() + timeout;
  while (!await check()) {
    assert.ok(Date.now() < until, 'Timed out waiting for ntfy delivery');
    await new Promise(resolve => setTimeout(resolve, 20));
  }
}

test('ntfy API and durable delivery with MySQL and a local ntfy server', { skip: process.env.NTFY_TEST_DATABASE !== '1' }, async t => {
  assert.match(process.env.MYSQL_DATABASE || '', /_ntfy_test$/, 'Use an isolated database ending in _ntfy_test');
  const familyA = randomUUID(), familyB = randomUUID();
  const families = [familyA, familyB];
  const token = (tenantId: string, viewOnly = false) => jwt.sign({ userId: randomUUID(), tenantId, email: 'test@example.com', viewOnly }, process.env.JWT_SECRET || 'dev-secret-change-in-production');
  const authA = token(familyA), authB = token(familyB);
  const deliveries: { path: string; auth: string | undefined; body: { topic: string; title: string; message: string }; status: number }[] = [];
  let remoteStatus = 200;
  const remote = createServer(async (req, res) => {
    let body = '';
    for await (const chunk of req) body += chunk;
    deliveries.push({ path: req.url!, auth: req.headers.authorization, body: JSON.parse(body), status: remoteStatus });
    res.writeHead(remoteStatus, { 'Content-Type': 'application/json' });
    res.end('{}');
  });
  const app = express();
  app.use(express.json());
  app.use('/api/kv', kvRoutes);
  app.use('/api/ntfy', ntfyRoutes);
  app.use('/api/auth', authRoutes);
  const server = createServer(app);
  const remoteUrl = await listen(remote);
  const api = await listen(server);
  const request = async (path: string, auth = authA, method = 'GET', body?: unknown) => {
    const response = await fetch(`${api}/api/${path}`, { method,
      headers: { 'Content-Type': 'application/json', ...(auth ? { Authorization: `Bearer ${auth}` } : {}) },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
    return { status: response.status, body: await response.json() };
  };
  const write = (key: string, value: unknown, auth = authA) => request(`kv/${key}`, auth, 'POST', { value });
  const pending = async (family = familyA) => {
    const [rows] = await pool.query<RowDataPacket[]>('SELECT COUNT(*) AS total FROM ntfy_outbox WHERE tenant_id = ?', [family]);
    return Number(rows[0].total);
  };
  const drain = async () => { await flushNtfyOutbox(); await eventually(async () => (await pending(familyA)) + (await pending(familyB)) === 0); };
  const configure = async (auth: string, changes: Record<string, unknown>) => {
    const current = await request('ntfy/settings', auth);
    return request('ntfy/settings', auth, 'PUT', { ...current.body, ...changes });
  };
  try {
    await initDatabase();
    for (const family of families) await pool.query('INSERT INTO tenants (id) VALUES (?)', [family]);
    await setTenantData('push-notification-settings', familyA, { enabled: true, devices: [{ subscription: 'retired' }] });
    const connection = await pool.getConnection();
    try { await createNtfyTables(connection); } finally { connection.release(); }

    await t.test('upgrades existing families with stable separate defaults and removes browser subscriptions', async () => {
      const a = await request('ntfy/settings'), b = await request('ntfy/settings', authB);
      assert.equal(a.status, 200);
      assert.equal(a.body.serverUrl, 'https://ntfy.sh');
      assert.equal(a.body.enabled, true);
      assert.match(a.body.topic, /^chorequest-[a-f0-9]{48}$/);
      assert.notEqual(a.body.topic, b.body.topic);
      assert.equal((await request('ntfy/settings')).body.topic, a.body.topic);
      assert.equal(a.body.hasCredential, false);
      assert.deepEqual(Object.keys(a.body.notificationTypes), [...NTFY_EVENT_TYPES]);
      assert.ok(Object.values(a.body.notificationTypes).every(Boolean));
      assert.equal(await getTenantData('push-notification-settings', familyA), null);
    });

    await t.test('new signup provisions a family default in the signup transaction', async () => {
      const result = await request('auth/signup', '', 'POST', { email: `${randomUUID()}@example.com`, password: 'test-password-123' });
      assert.equal(result.status, 201);
      families.push(result.body.user.tenantId);
      const settings = await request('ntfy/settings', result.body.token);
      assert.equal(settings.body.serverUrl, 'https://ntfy.sh');
      assert.match(settings.body.topic, /^chorequest-[a-f0-9]{48}$/);
    });

    await t.test('requires authentication and blocks view-only reads, saves and tests', async () => {
      assert.equal((await request('ntfy/settings', '')).status, 401);
      assert.equal((await request('ntfy/settings', 'invalid')).status, 401);
      for (const [path, method] of [['settings', 'GET'], ['settings', 'PUT'], ['test', 'POST']]) {
        assert.equal((await request(`ntfy/${path}`, token(familyA, true), method, method === 'GET' ? undefined : {})).status, 403);
      }
    });

    await t.test('saves custom token/basic authentication without exposing secrets through APIs or KV exports', async () => {
      assert.equal((await configure(authA, { serverUrl: `${remoteUrl}/prefix`, topic: 'family-a-test', authMode: 'token', credential: 'token-a' })).status, 200);
      assert.equal((await configure(authB, { serverUrl: remoteUrl, topic: 'family-b-test', authMode: 'basic', username: 'parent-b', credential: 'password-b' })).status, 200);
      const settings = await request('ntfy/settings');
      assert.equal(settings.body.hasCredential, true);
      assert.equal(JSON.stringify(settings.body).includes('token-a'), false);
      assert.equal((await request('kv')).body.ntfy, undefined);
      assert.equal(JSON.stringify((await request('kv')).body).includes('token-a'), false);
      assert.equal((await configure(authA, { serverUrl: 'https://other.example' })).status, 400);
      assert.equal((await request('ntfy/settings')).body.serverUrl, `${remoteUrl}/prefix`);
      assert.equal((await configure(authA, { topic: 'family-a-test', credential: '' })).status, 200);
    });

    for (const family of [familyA, familyB]) {
      await setTenantData('children', family, [{ id: 'child', name: family === familyA ? 'Alex' : 'Sam' }]);
      await setTenantData('chores', family, [{ id: 'chore', name: 'Make bed' }]);
      await setTenantData('rewards', family, [{ id: 'reward', name: 'Movie night', cost: 10 }]);
    }
    const completion = { id: 'complete', childId: 'child', choreId: 'chore', completedAt: Date.now(), approvalStatus: 'pending', timeOfDay: 'pm' };
    const purchase = { id: 'purchase', childId: 'child', rewardId: 'reward', purchasedAt: Date.now(), cost: 10, fulfilled: false };

    await t.test('forwards completion, approval, rejection, and undo after successful persistence', async () => {
      const start = deliveries.length;
      assert.equal((await write('completions', [completion])).status, 200);
      await drain();
      assert.equal(deliveries.length, start + 1);
      assert.equal(deliveries.at(-1)!.path, '/prefix/');
      assert.equal(deliveries.at(-1)!.auth, 'Bearer token-a');
      assert.match(deliveries.at(-1)!.body.message, /Alex.*Make bed \(PM\).*approval/);
      assert.equal((await write('completions', [completion])).status, 200);
      await drain();
      assert.equal(deliveries.length, start + 1, 'Repeated snapshots must not notify twice');
      await write('completions', [{ ...completion, approvalStatus: 'approved' }]); await drain();
      assert.equal(deliveries.at(-1)!.body.title, 'Chore approved');
      await write('completions', [{ ...completion, approvalStatus: 'rejected', rejectedReason: 'Please try again' }]); await drain();
      assert.match(deliveries.at(-1)!.body.message, /Please try again/);
      await write('completions', []); await drain();
      assert.equal(deliveries.at(-1)!.body.title, 'Chore completion undone');
    });

    await t.test('hidden category chores persist changes without queuing or delivering alerts', async () => {
      const start = deliveries.length;
      await setTenantData('categories', familyA, [{ id: 'hidden', name: 'Hidden', showInUpNext: false }]);
      await setTenantData('chores', familyA, [{ id: 'chore', name: 'Make bed', categoryIds: ['hidden'] }]);
      for (const value of [[completion], [{ ...completion, approvalStatus: 'approved' }], [{ ...completion, approvalStatus: 'rejected' }], [{ ...completion, undoneAt: Date.now() }], [completion], []]) {
        assert.equal((await write('completions', value)).status, 200);
        await drain();
        assert.equal(deliveries.length, start);
      }
      await setTenantData('chores', familyA, [{ id: 'chore', name: 'Make bed' }]);
    });

    await t.test('queued chore alerts are discarded when their category is hidden before retry', async () => {
      remoteStatus = 503;
      await write('completions', [completion]);
      await eventually(async () => {
        const [rows] = await pool.query<RowDataPacket[]>('SELECT attempts FROM ntfy_outbox WHERE tenant_id = ?', [familyA]);
        return rows.length === 1 && rows[0].attempts === 1;
      });
      const start = deliveries.length;
      await setTenantData('categories', familyA, [{ id: 'hidden', name: 'Hidden', showInCalendar: false }]);
      await setTenantData('chores', familyA, [{ id: 'chore', name: 'Make bed', categoryIds: ['hidden'] }]);
      remoteStatus = 200;
      await pool.query('UPDATE ntfy_outbox SET next_attempt_at = NOW() WHERE tenant_id = ?', [familyA]);
      await drain();
      assert.equal(deliveries.length, start);
      await write('completions', []); await drain();
      await setTenantData('chores', familyA, [{ id: 'chore', name: 'Make bed' }]);
    });

    await t.test('forwards reward request, fulfillment and cancellation to the correct family only', async () => {
      await write('purchases', [purchase]); await drain();
      assert.equal(deliveries.at(-1)!.body.title, 'Reward requested');
      assert.equal(deliveries.at(-1)!.body.topic, 'family-a-test');
      await write('purchases', [purchase], authB); await drain();
      assert.equal(deliveries.at(-1)!.body.topic, 'family-b-test');
      assert.equal(deliveries.at(-1)!.auth, `Basic ${Buffer.from('parent-b:password-b').toString('base64')}`);
      assert.match(deliveries.at(-1)!.body.message, /Sam/);
      await write('purchases', [{ ...purchase, fulfilled: true }]); await drain();
      assert.equal(deliveries.at(-1)!.body.title, 'Reward fulfilled');
      await write('purchases', [], authB); await drain();
      assert.equal(deliveries.at(-1)!.body.title, 'Reward request cancelled');
    });

    await t.test('respects independent per-type and family-wide notification switches', async () => {
      const current = (await request('ntfy/settings')).body;
      await configure(authA, { notificationTypes: { ...current.notificationTypes, choreCompleted: false } });
      const start = deliveries.length;
      await write('completions', [completion]); await drain();
      assert.equal(deliveries.length, start);
      await write('completions', []); await drain();
      assert.equal(deliveries.length, start + 1, 'Undo is independently enabled');
      await configure(authA, { enabled: false });
      await write('purchases', [{ ...purchase, id: 'disabled' }]); await drain();
      assert.equal(deliveries.length, start + 1);
      assert.equal((await request('ntfy/test', authA, 'POST')).status, 400);
      await configure(authA, { enabled: true, notificationTypes: current.notificationTypes });
    });

    await t.test('concurrent repeated writes create a single persisted event', async () => {
      const start = deliveries.length;
      const responses = await Promise.all([write('completions', [completion]), write('completions', [completion])]);
      assert.ok(responses.every(response => response.status === 200));
      await drain();
      assert.equal(deliveries.length, start + 1);
    });

    await t.test('a failed database write rolls back chore state without queuing a notification', async () => {
      const start = deliveries.length;
      const errors = t.mock.method(console, 'error', () => {});
      try {
        const invalid = { ...completion, id: 'duplicate' };
        assert.equal((await write('completions', [invalid, invalid])).status, 500);
      } finally { errors.mock.restore(); }
      const stored = (await request('kv/completions')).body.value;
      assert.deepEqual(stored.map((record: { id: string }) => record.id), [completion.id]);
      await drain();
      assert.equal(deliveries.length, start);
    });

    await t.test('ntfy failures preserve saved chore state and retry the durable outbox', async () => {
      remoteStatus = 503;
      const next = { ...completion, id: 'retry' };
      assert.equal((await write('completions', [completion, next])).status, 200);
      await eventually(async () => {
        const [rows] = await pool.query<RowDataPacket[]>('SELECT attempts FROM ntfy_outbox WHERE tenant_id = ?', [familyA]);
        return rows.length === 1 && rows[0].attempts === 1;
      });
      assert.equal((await request('kv/completions')).body.value.length, 2);
      assert.match((await request('ntfy/settings')).body.lastError, /HTTP 503/);
      remoteStatus = 200;
      await pool.query('UPDATE ntfy_outbox SET next_attempt_at = NOW() WHERE tenant_id = ?', [familyA]);
      await drain();
      assert.equal((await request('ntfy/settings')).body.lastError, null);
      assert.ok((await request('ntfy/settings')).body.lastDeliveredAt);
    });

    await t.test('disabling a type also discards already queued retries for that family', async () => {
      remoteStatus = 503;
      const previous = (await request('kv/purchases')).body.value;
      await write('purchases', [...previous, { ...purchase, id: 'queued-reward' }]);
      await eventually(async () => (await pending()) > 0 && (await request('ntfy/settings')).body.lastError !== null);
      const start = deliveries.length;
      const current = (await request('ntfy/settings')).body;
      await configure(authA, { notificationTypes: { ...current.notificationTypes, rewardRequested: false } });
      await pool.query('UPDATE ntfy_outbox SET next_attempt_at = NOW() WHERE tenant_id = ?', [familyA]);
      await drain();
      assert.equal(deliveries.length, start);
      remoteStatus = 200;
      await configure(authA, { notificationTypes: current.notificationTypes });
    });

    await t.test('saved configuration can send a test notification', async () => {
      const result = await request('ntfy/test', authA, 'POST');
      assert.equal(result.status, 200);
      assert.equal(deliveries.at(-1)!.body.title, 'ChoreQuest test notification');
      assert.equal(deliveries.at(-1)!.body.topic, 'family-a-test');
    });
  } finally {
    remoteStatus = 200;
    await pool.query('UPDATE ntfy_outbox SET next_attempt_at = NOW() WHERE tenant_id IN (?, ?)', [familyA, familyB]);
    await drain();
    server.closeAllConnections(); remote.closeAllConnections();
    await Promise.all([new Promise<void>(resolve => server.close(() => resolve())), new Promise<void>(resolve => remote.close(() => resolve()))]);
    for (const family of families) {
      await pool.query('DELETE FROM kv_store WHERE tenant_id = ?', [family]);
      await pool.query('DELETE FROM tenants WHERE id = ?', [family]);
    }
    await pool.end();
  }
});
