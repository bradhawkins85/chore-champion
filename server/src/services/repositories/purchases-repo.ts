import type { Pool, PoolConnection, RowDataPacket } from 'mysql2/promise';
import { pool } from '../../config/database.js';

export interface PurchaseRecord {
  id: string;
  rewardId?: string | null;
  childId?: string | null;
  purchasedAt?: number | null;
  fulfilled?: boolean;
  cost?: number;
  status?: string | null;
  pointsSpent?: number;
  sortOrder?: number;
}

interface PurchaseRow extends RowDataPacket {
  id: string;
  reward_id: string | null;
  child_id: string | null;
  purchased_at: number | null;
  fulfilled: number | null;
  cost: number | null;
  status: string | null;
  points_spent: number | null;
  sort_order: number | null;
  payload_json: unknown;
}

function getExecutor(connection?: PoolConnection): Pool | PoolConnection {
  return connection ?? pool;
}

function parsePayload(payloadJson: unknown): Partial<PurchaseRecord> | null {
  if (!payloadJson) {
    return null;
  }

  // mysql2 auto-parses JSON columns, so the value may already be an object
  if (typeof payloadJson === 'object') {
    return payloadJson as Partial<PurchaseRecord>;
  }

  try {
    const parsed = JSON.parse(payloadJson as string);
    return parsed && typeof parsed === 'object' ? parsed : null;
  } catch (error) {
    console.error('Failed to parse purchase payload_json:', error);
    return null;
  }
}

function mapRow(row: PurchaseRow): PurchaseRecord {
  const payload = parsePayload(row.payload_json);

  return {
    id: row.id,
    rewardId: row.reward_id ?? payload?.rewardId ?? null,
    childId: row.child_id ?? payload?.childId ?? null,
    purchasedAt: row.purchased_at ?? payload?.purchasedAt ?? null,
    fulfilled: row.fulfilled !== null ? Boolean(row.fulfilled) : Boolean(payload?.fulfilled),
    cost: row.cost ?? payload?.cost ?? 0,
    status: row.status ?? payload?.status ?? null,
    pointsSpent: row.points_spent ?? payload?.pointsSpent ?? payload?.cost ?? 0,
    sortOrder: row.sort_order ?? payload?.sortOrder ?? 0,
  };
}

export async function listPurchases(tenantId: string, connection?: PoolConnection): Promise<PurchaseRecord[]> {
  const executor = getExecutor(connection);
  const [rows] = await executor.query<PurchaseRow[]>(
    `SELECT id, reward_id, child_id, purchased_at, fulfilled, cost, status, points_spent, sort_order, payload_json
     FROM tenant_purchases_v2
     WHERE tenant_id = ?
     ORDER BY created_at ASC, id ASC`,
    [tenantId]
  );

  return rows.map(mapRow);
}

export async function replacePurchases(tenantId: string, purchases: PurchaseRecord[], connection?: PoolConnection): Promise<void> {
  const executor = getExecutor(connection);
  await executor.query('DELETE FROM tenant_purchases_v2 WHERE tenant_id = ?', [tenantId]);

  for (const [index, purchase] of purchases.entries()) {
    const sortOrder = purchase.sortOrder ?? index;
    const cost = purchase.cost ?? 0;

    await executor.query(
      `INSERT INTO tenant_purchases_v2
      (id, tenant_id, reward_id, child_id, purchased_at, fulfilled, cost, status, points_spent, sort_order, payload_json)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        reward_id = VALUES(reward_id),
        child_id = VALUES(child_id),
        purchased_at = VALUES(purchased_at),
        fulfilled = VALUES(fulfilled),
        cost = VALUES(cost),
        status = VALUES(status),
        points_spent = VALUES(points_spent),
        sort_order = VALUES(sort_order),
        payload_json = VALUES(payload_json),
        updated_at = CURRENT_TIMESTAMP`,
      [
        purchase.id,
        tenantId,
        purchase.rewardId ?? null,
        purchase.childId ?? null,
        purchase.purchasedAt ?? null,
        purchase.fulfilled ? 1 : 0,
        cost,
        purchase.status ?? null,
        purchase.pointsSpent ?? cost,
        sortOrder,
        JSON.stringify(purchase),
      ]
    );
  }
}

export async function deletePurchases(tenantId: string, connection?: PoolConnection): Promise<void> {
  const executor = getExecutor(connection);
  await executor.query('DELETE FROM tenant_purchases_v2 WHERE tenant_id = ?', [tenantId]);
}
