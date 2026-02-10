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

export async function listRewards(tenantId: string, connection?: PoolConnection): Promise<any[]> {
  const executor = getExecutor(connection);
  const [rows] = await executor.query<(RewardRow & { payload_json?: string })[]>(
    `SELECT id, title, description, cost_points, is_active, stock_count, sort_order, payload_json
     FROM tenant_rewards_v2
     WHERE tenant_id = ?
     ORDER BY sort_order ASC, created_at ASC`,
    [tenantId]
  );

  // Return the full reward object from payload_json if available
  // This preserves all frontend fields (name, imageEmoji, categoryIds, etc.)
  return rows.map(row => {
    if (row.payload_json) {
      try {
        return JSON.parse(row.payload_json);
      } catch (e) {
        // Fall back to mapping from columns if JSON parsing fails
        console.error('Failed to parse reward payload_json:', e);
      }
    }
    
    // Fallback to basic mapping from columns
    return mapRow(row);
  });
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

export async function upsertReward(tenantId: string, reward: any, connection?: PoolConnection): Promise<void> {
  const executor = getExecutor(connection);
  
  // Map frontend Reward object to backend structure
  const title = reward.title ?? reward.name ?? null;
  const active = reward.active ?? (reward.disabled === false || reward.disabled === undefined) ?? true;
  const sortOrder = reward.sortOrder ?? 0;
  
  await executor.query(
    `INSERT INTO tenant_rewards_v2
    (id, tenant_id, title, description, cost_points, is_active, stock_count, sort_order, payload_json)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
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
      title,
      reward.description ?? null,
      reward.cost ?? 0,
      active,
      reward.stock ?? null,
      sortOrder,
      JSON.stringify(reward),
    ]
  );
}

export async function replaceRewards(tenantId: string, rewards: any[], connection?: PoolConnection): Promise<void> {
  const executor = getExecutor(connection);
  await executor.query('DELETE FROM tenant_rewards_v2 WHERE tenant_id = ?', [tenantId]);

  for (const [index, reward] of rewards.entries()) {
    // Map frontend Reward object to backend RewardRecord structure
    // Frontend uses 'name' but backend expects 'title'
    // Frontend uses 'isActive'/'disabled' but backend expects 'active'
    const title = reward.title ?? reward.name ?? null;
    const active = reward.active ?? (reward.disabled === false || reward.disabled === undefined) ?? true;
    const sortOrder = reward.sortOrder ?? index;
    
    await executor.query(
      `INSERT INTO tenant_rewards_v2
      (id, tenant_id, title, description, cost_points, is_active, stock_count, sort_order, payload_json)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        reward.id,
        tenantId,
        title,
        reward.description ?? null,
        reward.cost ?? 0,
        active,
        reward.stock ?? null,
        sortOrder,
        JSON.stringify(reward),
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
