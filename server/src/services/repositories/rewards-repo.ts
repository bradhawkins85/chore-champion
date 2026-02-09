import type { Pool, PoolConnection, RowDataPacket } from 'mysql2/promise';
import { pool } from '../../config/database.js';

export interface RewardRecord {
  id: string;
  title: string | null;
  description: string | null;
  cost: number;
  active: boolean;
  stock: number | null;
  sortOrder: number;
}

interface RewardRow extends RowDataPacket {
  id: string;
  title: string | null;
  description: string | null;
  cost_points: number | null;
  is_active: number | boolean | null;
  stock_count: number | null;
  sort_order: number | null;
}

function getExecutor(connection?: PoolConnection): Pool | PoolConnection {
  return connection ?? pool;
}

function mapRow(row: RewardRow): RewardRecord {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    cost: row.cost_points ?? 0,
    active: Boolean(row.is_active ?? true),
    stock: row.stock_count,
    sortOrder: row.sort_order ?? 0,
  };
}

export async function listRewards(tenantId: string, connection?: PoolConnection): Promise<RewardRecord[]> {
  const executor = getExecutor(connection);
  const [rows] = await executor.query<RewardRow[]>(
    `SELECT id, title, description, cost_points, is_active, stock_count, sort_order
     FROM tenant_rewards_v2
     WHERE tenant_id = ?
     ORDER BY sort_order ASC, created_at ASC`,
    [tenantId]
  );

  return rows.map(mapRow);
}


export async function getRewardById(tenantId: string, rewardId: string, connection?: PoolConnection): Promise<RewardRecord | null> {
  const executor = getExecutor(connection);
  const [rows] = await executor.query<RewardRow[]>(
    `SELECT id, title, description, cost_points, is_active, stock_count, sort_order
     FROM tenant_rewards_v2
     WHERE tenant_id = ? AND id = ?`,
    [tenantId, rewardId]
  );

  return rows.length ? mapRow(rows[0]) : null;
}

export async function upsertReward(tenantId: string, reward: RewardRecord, connection?: PoolConnection): Promise<void> {
  const executor = getExecutor(connection);
  const sortOrder = reward.sortOrder ?? 0;
  await executor.query(
    `INSERT INTO tenant_rewards_v2
    (id, tenant_id, title, description, cost_points, is_active, stock_count, sort_order, payload_json)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, JSON_OBJECT(
      'id', ?,
      'title', ?,
      'description', ?,
      'cost', ?,
      'active', ?,
      'stock', ?,
      'sortOrder', ?
    ))
    ON DUPLICATE KEY UPDATE
      title = VALUES(title),
      description = VALUES(description),
      cost_points = VALUES(cost_points),
      is_active = VALUES(is_active),
      stock_count = VALUES(stock_count),
      sort_order = VALUES(sort_order),
      payload_json = VALUES(payload_json)`,
    [
      reward.id,
      tenantId,
      reward.title ?? null,
      reward.description ?? null,
      reward.cost ?? 0,
      reward.active ?? true,
      reward.stock ?? null,
      sortOrder,
      reward.id,
      reward.title ?? null,
      reward.description ?? null,
      reward.cost ?? 0,
      reward.active ?? true,
      reward.stock ?? null,
      sortOrder,
    ]
  );
}

export async function replaceRewards(tenantId: string, rewards: RewardRecord[], connection?: PoolConnection): Promise<void> {
  const executor = getExecutor(connection);
  await executor.query('DELETE FROM tenant_rewards_v2 WHERE tenant_id = ?', [tenantId]);

  for (const [index, reward] of rewards.entries()) {
    const sortOrder = reward.sortOrder ?? index;
    await executor.query(
      `INSERT INTO tenant_rewards_v2
      (id, tenant_id, title, description, cost_points, is_active, stock_count, sort_order, payload_json)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, JSON_OBJECT(
        'id', ?,
        'title', ?,
        'description', ?,
        'cost', ?,
        'active', ?,
        'stock', ?,
        'sortOrder', ?
      ))`,
      [
        reward.id,
        tenantId,
        reward.title ?? null,
        reward.description ?? null,
        reward.cost ?? 0,
        reward.active ?? true,
        reward.stock ?? null,
        sortOrder,
        reward.id,
        reward.title ?? null,
        reward.description ?? null,
        reward.cost ?? 0,
        reward.active ?? true,
        reward.stock ?? null,
        sortOrder,
      ]
    );
  }
}

export async function deleteRewards(tenantId: string, connection?: PoolConnection): Promise<void> {
  const executor = getExecutor(connection);
  await executor.query('DELETE FROM tenant_rewards_v2 WHERE tenant_id = ?', [tenantId]);
}

export async function deleteRewardById(tenantId: string, rewardId: string, connection?: PoolConnection): Promise<void> {
  const executor = getExecutor(connection);
  await executor.query('DELETE FROM tenant_rewards_v2 WHERE tenant_id = ? AND id = ?', [tenantId, rewardId]);
}
