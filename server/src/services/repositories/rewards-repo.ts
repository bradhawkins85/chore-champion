import type { Pool, PoolConnection, RowDataPacket } from 'mysql2/promise';
import { pool } from '../../config/database.js';

export interface RewardRecord {
  id: string;
  name: string | null;
  title: string | null;
  description: string | null;
  cost: number;
  imageEmoji: string | null;
  active: boolean;
  stock: number | null;
  sortOrder: number;
  createdAt: number | null;
  categoryIds: string[];
  costOverrides?: any[];
  requirements?: any[];
  purchaseLimit?: any;
  startDate?: number | null;
  expiryDate?: number | null;
  isPointSwap: boolean;
  swapConfig?: any;
  disabled?: boolean;
  isActive?: boolean;
}

interface RewardRow extends RowDataPacket {
  id: string;
  name: string | null;
  title: string | null;
  description: string | null;
  cost_points: number | null;
  image_emoji: string | null;
  is_active: number | boolean | null;
  stock_count: number | null;
  sort_order: number | null;
  created_at_timestamp: number | null;
  category_ids: string | null;
  cost_overrides: string | null;
  requirements: string | null;
  purchase_limit: string | null;
  start_date: number | null;
  expiry_date: number | null;
  is_point_swap: number | boolean | null;
  swap_config: string | null;
}

function getExecutor(connection?: PoolConnection): Pool | PoolConnection {
  return connection ?? pool;
}

function mapRow(row: RewardRow): RewardRecord {
  const isActive = Boolean(row.is_active ?? true);
  
  return {
    id: row.id,
    name: row.name ?? row.title ?? '',
    title: row.title ?? row.name ?? '',
    description: row.description,
    cost: row.cost_points ?? 0,
    imageEmoji: row.image_emoji ?? '',
    active: isActive,
    isActive: isActive,
    disabled: !isActive,
    stock: row.stock_count,
    sortOrder: row.sort_order ?? 0,
    createdAt: row.created_at_timestamp ?? 0,
    categoryIds: row.category_ids ? JSON.parse(row.category_ids) : [],
    costOverrides: row.cost_overrides ? JSON.parse(row.cost_overrides) : undefined,
    requirements: row.requirements ? JSON.parse(row.requirements) : undefined,
    purchaseLimit: row.purchase_limit ? JSON.parse(row.purchase_limit) : undefined,
    startDate: row.start_date,
    expiryDate: row.expiry_date,
    isPointSwap: Boolean(row.is_point_swap ?? false),
    swapConfig: row.swap_config ? JSON.parse(row.swap_config) : undefined,
  };
}

export async function listRewards(tenantId: string, connection?: PoolConnection): Promise<any[]> {
  const executor = getExecutor(connection);
  const [rows] = await executor.query<RewardRow[]>(
    `SELECT id, name, title, description, cost_points, image_emoji, is_active, stock_count, sort_order,
            created_at_timestamp, category_ids, cost_overrides, requirements, purchase_limit,
            start_date, expiry_date, is_point_swap, swap_config
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
    `SELECT id, name, title, description, cost_points, image_emoji, is_active, stock_count, sort_order,
            created_at_timestamp, category_ids, cost_overrides, requirements, purchase_limit,
            start_date, expiry_date, is_point_swap, swap_config
     FROM tenant_rewards_v2
     WHERE tenant_id = ? AND id = ?`,
    [tenantId, rewardId]
  );

  return rows.length ? mapRow(rows[0]) : null;
}

export async function upsertReward(tenantId: string, reward: any, connection?: PoolConnection): Promise<void> {
  const executor = getExecutor(connection);
  
  // Map frontend Reward object to backend structure
  // Frontend typically uses 'name', but support 'title' as fallback
  const name = reward.name ?? reward.title ?? null;
  const title = reward.title ?? reward.name ?? null;
  const active = reward.active ?? reward.isActive ?? (reward.disabled !== true);
  const sortOrder = reward.sortOrder ?? 0;
  // Preserve existing createdAt, or set to null to let database handle timestamp
  const createdAt = reward.createdAt ?? null;
  
  await executor.query(
    `INSERT INTO tenant_rewards_v2
    (id, tenant_id, name, title, description, cost_points, image_emoji, is_active, stock_count, sort_order,
     created_at_timestamp, category_ids, cost_overrides, requirements, purchase_limit,
     start_date, expiry_date, is_point_swap, swap_config)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON DUPLICATE KEY UPDATE
      name = VALUES(name),
      title = VALUES(title),
      description = VALUES(description),
      cost_points = VALUES(cost_points),
      image_emoji = VALUES(image_emoji),
      is_active = VALUES(is_active),
      stock_count = VALUES(stock_count),
      sort_order = VALUES(sort_order),
      created_at_timestamp = VALUES(created_at_timestamp),
      category_ids = VALUES(category_ids),
      cost_overrides = VALUES(cost_overrides),
      requirements = VALUES(requirements),
      purchase_limit = VALUES(purchase_limit),
      start_date = VALUES(start_date),
      expiry_date = VALUES(expiry_date),
      is_point_swap = VALUES(is_point_swap),
      swap_config = VALUES(swap_config)`,
    [
      reward.id,
      tenantId,
      name,
      title,
      reward.description ?? null,
      reward.cost ?? 0,
      reward.imageEmoji ?? null,
      active,
      reward.stock ?? null,
      sortOrder,
      createdAt,
      reward.categoryIds ? JSON.stringify(reward.categoryIds) : null,
      reward.costOverrides ? JSON.stringify(reward.costOverrides) : null,
      reward.requirements ? JSON.stringify(reward.requirements) : null,
      reward.purchaseLimit ? JSON.stringify(reward.purchaseLimit) : null,
      reward.startDate ?? null,
      reward.expiryDate ?? null,
      reward.isPointSwap ?? false,
      reward.swapConfig ? JSON.stringify(reward.swapConfig) : null,
    ]
  );
}

export async function replaceRewards(tenantId: string, rewards: any[], connection?: PoolConnection): Promise<void> {
  const executor = getExecutor(connection);
  await executor.query('DELETE FROM tenant_rewards_v2 WHERE tenant_id = ?', [tenantId]);

  for (const [index, reward] of rewards.entries()) {
    // Frontend typically uses 'name', but support 'title' as fallback
    const name = reward.name ?? reward.title ?? null;
    const title = reward.title ?? reward.name ?? null;
    const active = reward.active ?? reward.isActive ?? (reward.disabled !== true);
    const sortOrder = reward.sortOrder ?? index;
    // Preserve existing createdAt, or set to null to let database handle timestamp
    const createdAt = reward.createdAt ?? null;
    
    await executor.query(
      `INSERT INTO tenant_rewards_v2
      (id, tenant_id, name, title, description, cost_points, image_emoji, is_active, stock_count, sort_order,
       created_at_timestamp, category_ids, cost_overrides, requirements, purchase_limit,
       start_date, expiry_date, is_point_swap, swap_config)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        reward.id,
        tenantId,
        name,
        title,
        reward.description ?? null,
        reward.cost ?? 0,
        reward.imageEmoji ?? null,
        active,
        reward.stock ?? null,
        sortOrder,
        createdAt,
        reward.categoryIds ? JSON.stringify(reward.categoryIds) : null,
        reward.costOverrides ? JSON.stringify(reward.costOverrides) : null,
        reward.requirements ? JSON.stringify(reward.requirements) : null,
        reward.purchaseLimit ? JSON.stringify(reward.purchaseLimit) : null,
        reward.startDate ?? null,
        reward.expiryDate ?? null,
        reward.isPointSwap ?? false,
        reward.swapConfig ? JSON.stringify(reward.swapConfig) : null,
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

