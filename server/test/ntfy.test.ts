import { test } from 'node:test';
import assert from 'node:assert/strict';
import { generateNtfyTopic, publicNtfySettings, validateNtfySettings, encryptNtfyCredential, decryptNtfyCredential, NTFY_EVENT_TYPES, type NtfySettingsRow } from '../src/services/ntfy-settings.js';
import { getNtfyEvents } from '../src/services/ntfy-events.js';
import { publishNtfy } from '../src/services/ntfy.js';

const types = Object.fromEntries(NTFY_EVENT_TYPES.map(type => [type, true]));
const row = {
  tenant_id: 'family-a', enabled: 1, server_url: 'https://ntfy.sh', topic: 'private-topic',
  auth_mode: 'none', username: '', credential: null, notification_types: types,
  last_delivered_at: null, last_error: null,
} as NtfySettingsRow;
const input = { enabled: true, serverUrl: row.server_url, topic: row.topic, authMode: 'none', username: '', notificationTypes: types };
const names = { children: [{ id: 'child-a', name: 'Alex' }], chores: [{ id: 'chore-a', title: 'Make bed' }], rewards: [{ id: 'reward-a', name: 'Movie night' }] };
const completion = { id: 'c1', childId: 'child-a', choreId: 'chore-a', approvalStatus: 'pending', timeOfDay: 'am' };
const purchase = { id: 'p1', childId: 'child-a', rewardId: 'reward-a', cost: 12, fulfilled: false };

test('random topics have independent cryptographic identifiers and fit ntfy limits', () => {
  const topics = Array.from({ length: 100 }, generateNtfyTopic);
  assert.equal(new Set(topics).size, 100);
  for (const topic of topics) assert.match(topic, /^chorequest-[a-f0-9]{48}$/);
});

test('API settings contain credential presence but never encrypted or plaintext secrets', () => {
  const credential = encryptNtfyCredential('a-secret');
  const settings = publicNtfySettings({ ...row, credential, notification_types: JSON.stringify({ ...types, choreCompleted: false }) });
  assert.equal(settings.hasCredential, true);
  assert.equal(settings.notificationTypes.choreCompleted, false);
  assert.equal(JSON.stringify(settings).includes(credential), false);
  assert.equal(JSON.stringify(settings).includes('a-secret'), false);
});

test('credentials are authenticated encrypted with a fresh nonce', () => {
  const one = encryptNtfyCredential('ntfy-secret');
  const two = encryptNtfyCredential('ntfy-secret');
  assert.notEqual(one, two);
  assert.equal(decryptNtfyCredential(one), 'ntfy-secret');
  const tampered = Buffer.from(one, 'base64');
  tampered[29] ^= 1;
  assert.throws(() => decryptNtfyCredential(tampered.toString('base64')));
});

test('validates server URLs, topics and per-type booleans', () => {
  assert.equal(validateNtfySettings({ ...input, serverUrl: 'http://ntfy.internal:8080/prefix///' }, row).serverUrl, 'http://ntfy.internal:8080/prefix');
  for (const serverUrl of ['ftp://example.com', 'https://user:pass@example.com', 'https://example.com/?token=secret', 'https://example.com/#hash', 'invalid']) {
    assert.throws(() => validateNtfySettings({ ...input, serverUrl }, row));
  }
  for (const topic of ['', 'spaces here', '../topic', 'a/b', 'x'.repeat(65), 'v1', 'docs']) {
    assert.throws(() => validateNtfySettings({ ...input, topic }, row));
  }
  assert.throws(() => validateNtfySettings({ ...input, enabled: 'true' }, row));
  assert.throws(() => validateNtfySettings({ ...input, notificationTypes: {} }, row));
  assert.throws(() => validateNtfySettings({ ...input, notificationTypes: { ...types, choreCompleted: 'false' } }, row));
});

test('saved secret is preserved only for the same server and authentication account', () => {
  const current = { ...row, auth_mode: 'basic' as const, username: 'parent', credential: encryptNtfyCredential('password') };
  const next = { ...input, authMode: 'basic', username: 'parent', credential: '' };
  assert.equal(validateNtfySettings(next, current).credential, current.credential);
  assert.throws(() => validateNtfySettings({ ...next, serverUrl: 'https://other.example' }, current));
  assert.throws(() => validateNtfySettings({ ...next, username: 'other' }, current));
  assert.throws(() => validateNtfySettings({ ...next, authMode: 'token' }, current));
  assert.equal(validateNtfySettings({ ...next, authMode: 'none' }, current).credential, null);
  assert.equal(decryptNtfyCredential(validateNtfySettings({ ...next, serverUrl: 'https://other.example', credential: 'new-password' }, current).credential!), 'new-password');
  assert.throws(() => validateNtfySettings({ ...next, credential: 'injected\nheader' }, current));
});

test('publishes unicode JSON to a custom server with no browser or SMTP dependency', async () => {
  const fetcher = (async (url, options) => {
    assert.equal(url, 'http://ntfy.internal:8080/prefix/');
    assert.equal(options?.method, 'POST');
    assert.equal(options?.redirect, 'error');
    assert.ok(options?.signal instanceof AbortSignal);
    assert.deepEqual(JSON.parse(String(options?.body)), { topic: row.topic, title: 'Chore completed', message: 'Zoë completed café duty 🎉' });
    assert.equal((options?.headers as Record<string, string>).Authorization, undefined);
    return new Response('{}');
  }) as typeof fetch;
  await publishNtfy({ ...row, server_url: 'http://ntfy.internal:8080/prefix' }, { title: 'Chore completed', message: 'Zoë completed café duty 🎉' }, fetcher);
});

test('publishes bearer and basic authentication without putting secrets in URLs', async () => {
  for (const authMode of ['token', 'basic'] as const) {
    const fetcher = (async (url, options) => {
      assert.equal(url, 'https://ntfy.sh/');
      const expected = authMode === 'token' ? 'Bearer secret' : `Basic ${Buffer.from('parent:secret').toString('base64')}`;
      assert.equal((options?.headers as Record<string, string>).Authorization, expected);
      return new Response('{}');
    }) as typeof fetch;
    await publishNtfy({ ...row, auth_mode: authMode, username: 'parent', credential: encryptNtfyCredential('secret') }, { title: 'Test', message: 'Test' }, fetcher);
  }
});

test('long Unicode messages stay within the ntfy byte limit without broken characters', async () => {
  const fetcher = (async (_url, options) => {
    const body = JSON.parse(String(options?.body));
    assert.ok(Buffer.byteLength(body.message, 'utf8') <= 3000);
    assert.equal(body.message.includes('\uFFFD'), false);
    assert.equal(body.message, '🎉'.repeat(750));
    return new Response('{}');
  }) as typeof fetch;
  await publishNtfy(row, { title: 'Test', message: '🎉'.repeat(1000) }, fetcher);
});

test('remote errors cannot reflect credentials or arbitrary response bodies', async () => {
  await assert.rejects(publishNtfy(row, { title: 'Test', message: 'Test' }, (async () => new Response('private response body', { status: 401 })) as typeof fetch), /^Error: Ntfy server returned HTTP 401$/);
  await assert.rejects(publishNtfy(row, { title: 'Test', message: 'Test' }, (async () => { throw new Error('private URL and password'); }) as typeof fetch), error => {
    assert.ok(error instanceof Error);
    assert.equal(error.message.includes('private'), false);
    return true;
  });
});

test('completion, undo, approval and rejection create separate event types', () => {
  const complete = getNtfyEvents('completions', [], [completion], names);
  assert.equal(complete.length, 1);
  assert.equal(complete[0].type, 'choreCompleted');
  assert.match(complete[0].message, /Alex.*Make bed \(AM\).*Parent approval/);
  assert.equal(getNtfyEvents('completions', [completion], [], names)[0].type, 'choreUncompleted');
  assert.equal(getNtfyEvents('completions', [completion], [{ ...completion, approvalStatus: 'approved' }], names)[0].type, 'choreApproved');
  const rejected = getNtfyEvents('completions', [completion], [{ ...completion, approvalStatus: 'rejected', rejectedReason: 'Try again' }], names);
  assert.equal(rejected[0].type, 'choreRejected');
  assert.match(rejected[0].message, /Try again/);
});

test('replaying writes, reordering, metadata edits and auto-approved initial completion do not duplicate events', () => {
  assert.deepEqual(getNtfyEvents('completions', [completion], [completion], names), []);
  const autoApproved = { ...completion, approvalStatus: 'approved' };
  assert.deepEqual(getNtfyEvents('completions', [], [autoApproved], names).map(event => event.type), ['choreCompleted']);
  assert.deepEqual(getNtfyEvents('completions', [autoApproved], [{ ...autoApproved, approvedAt: 123 }], names), []);
  assert.deepEqual(getNtfyEvents('purchases', [purchase], [{ ...purchase, sortOrder: 9 }], names), []);
});

test('supports undo timestamps and restoration without double undo alerts', () => {
  const undone = { ...completion, undoneAt: 123 };
  assert.equal(getNtfyEvents('completions', [completion], [undone], names)[0].type, 'choreUncompleted');
  assert.deepEqual(getNtfyEvents('completions', [undone], [], names), []);
  assert.deepEqual(getNtfyEvents('completions', [], [undone], names), []);
  assert.equal(getNtfyEvents('completions', [undone], [completion], names)[0].type, 'choreCompleted');
});

test('reward requests, fulfillment and cancellation are detected independently', () => {
  const requested = getNtfyEvents('purchases', [], [purchase], names);
  assert.equal(requested[0].type, 'rewardRequested');
  assert.match(requested[0].message, /Alex.*Movie night.*12 points/);
  const fulfilled = { ...purchase, fulfilled: true };
  assert.equal(getNtfyEvents('purchases', [purchase], [fulfilled], names)[0].type, 'rewardFulfilled');
  assert.equal(getNtfyEvents('purchases', [purchase], [], names)[0].type, 'rewardCancelled');
  assert.deepEqual(getNtfyEvents('purchases', [fulfilled], [], names), []);
  assert.deepEqual(getNtfyEvents('purchases', [purchase], [purchase], names), []);
});

test('removed children or chores do not produce misleading completion undo notifications', () => {
  assert.deepEqual(getNtfyEvents('completions', [completion], [], { ...names, children: [] }), []);
  assert.deepEqual(getNtfyEvents('completions', [completion], [], { ...names, chores: [] }), []);
});
