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
  inactiveOnSchoolHolidays?: boolean;
  onlyOnSchoolHolidays?: boolean;
  holidayCostOverride?: number | null;
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
  inactive_on_school_holidays: number | boolean | null;
  only_on_school_holidays: number | boolean | null;
  holiday_cost_override: number | null;
}

function getExecutor(connection?: PoolConnection): Pool | PoolConnection {
  return connection ?? pool;
}

function safeJsonParse<T>(value: unknown, defaultValue: T): T {
  if (value === null || value === undefined) return defaultValue;

  // mysql2 can return JSON columns as already-parsed values depending on configuration.
  // In that case, return the value directly instead of treating it like a string.
  if (typeof value !== 'string') {
    return value as T;
  }

  if (!value) return defaultValue;
  const trimmedValue = value.trim();

  // Handle legacy category values stored as plain string identifiers.
  if (Array.isArray(defaultValue) && /^category_[\w-]+$/.test(trimmedValue)) {
    return [trimmedValue] as T;
  }

  // Handle legacy category arrays stored as `[category_default_0]` (missing quotes).
  if (
    Array.isArray(defaultValue) &&
    trimmedValue.startsWith('[') &&
    trimmedValue.endsWith(']') &&
    !trimmedValue.includes('"') &&
    !trimmedValue.includes("'")
  ) {
    const items = trimmedValue
      .slice(1, -1)
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);

    if (items.length > 0 && items.every((item) => /^category_[\w-]+$/.test(item))) {
      return items as T;
    }
  }

  try {
    return JSON.parse(trimmedValue) as T;
  } catch (error) {
    console.error('Failed to parse JSON value:', value, error);
    
    // Try to fix malformed JSON with single quotes instead of double quotes
    // This handles cases where data was stored with JavaScript array notation instead of JSON
    // Only apply this fix if the value looks like it's an array or object to avoid breaking strings with apostrophes
    // Note: This simple replacement works for category IDs (e.g., 'category_default_0') which never contain apostrophes.
    // If this function needs to handle user-entered text with apostrophes in the future, a more sophisticated
    // approach would be needed to distinguish delimiter quotes from apostrophes within values.
    if (typeof value === 'string' && value.includes("'") && 
        (value.trim().startsWith('[') || value.trim().startsWith('{'))) {
      const fixedValue = value.replace(/'/g, '"');
      try {
        const parsed = JSON.parse(fixedValue);
        console.warn('Successfully parsed JSON after replacing single quotes with double quotes:', value, '->', fixedValue);
        return parsed as T;
      } catch (secondError) {
        console.error('Failed to parse even after fixing quotes:', fixedValue, secondError);
      }
    }
    
    // Special case: If it's a plain string that looks like a category ID and defaultValue is an array,
    // wrap the string in an array. This handles corrupted data where category_ids was stored as a string.
    if (typeof value === 'string' && value.startsWith('category_') && Array.isArray(defaultValue)) {
      console.warn('Converting plain category string to array:', value);
      return [value] as T;
    }
    return defaultValue;
  }
}

function ensureCategoryIdsArray(categoryIds: string | string[] | null | undefined): string[] {
  // If already an array, return as is
  if (Array.isArray(categoryIds)) {
    return categoryIds;
  }
  // If it's a string, wrap it in an array
  if (typeof categoryIds === 'string') {
    console.warn('Converting string categoryIds to array:', categoryIds);
    return [categoryIds];
  }
  // If null/undefined, return empty array
  if (categoryIds === null || categoryIds === undefined) {
    return [];
  }
  // For any other type, return empty array
  console.warn('Unexpected categoryIds type:', typeof categoryIds, categoryIds);
  return [];
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
    categoryIds: ensureCategoryIdsArray(safeJsonParse(row.category_ids, [])),
    costOverrides: safeJsonParse(row.cost_overrides, undefined),
    requirements: safeJsonParse(row.requirements, undefined),
    purchaseLimit: safeJsonParse(row.purchase_limit, undefined),
    startDate: row.start_date,
    expiryDate: row.expiry_date,
    isPointSwap: Boolean(row.is_point_swap ?? false),
    swapConfig: safeJsonParse(row.swap_config, undefined),
    inactiveOnSchoolHolidays: Boolean(row.inactive_on_school_holidays ?? false) || undefined,
    onlyOnSchoolHolidays: Boolean(row.only_on_school_holidays ?? false) || undefined,
    holidayCostOverride: row.holiday_cost_override ?? undefined,
  };
}

export async function listRewards(tenantId: string, connection?: PoolConnection): Promise<any[]> {
  const executor = getExecutor(connection);
  const [rows] = await executor.query<RewardRow[]>(
    `SELECT id, name, title, description, cost_points, image_emoji, is_active, stock_count, sort_order,
            created_at_timestamp, category_ids, cost_overrides, requirements, purchase_limit,
            start_date, expiry_date, is_point_swap, swap_config,
            inactive_on_school_holidays, only_on_school_holidays, holiday_cost_override
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
            start_date, expiry_date, is_point_swap, swap_config,
            inactive_on_school_holidays, only_on_school_holidays, holiday_cost_override
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
  
  // Ensure categoryIds is always an array before stringifying
  const categoryIdsArray = ensureCategoryIdsArray(reward.categoryIds);
  
  await executor.query(
    `INSERT INTO tenant_rewards_v2
    (id, tenant_id, name, title, description, cost_points, image_emoji, is_active, stock_count, sort_order,
     created_at_timestamp, category_ids, cost_overrides, requirements, purchase_limit,
     start_date, expiry_date, is_point_swap, swap_config,
     inactive_on_school_holidays, only_on_school_holidays, holiday_cost_override)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
      swap_config = VALUES(swap_config),
      inactive_on_school_holidays = VALUES(inactive_on_school_holidays),
      only_on_school_holidays = VALUES(only_on_school_holidays),
      holiday_cost_override = VALUES(holiday_cost_override)`,
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
      categoryIdsArray.length > 0 ? JSON.stringify(categoryIdsArray) : null,
      reward.costOverrides ? JSON.stringify(reward.costOverrides) : null,
      reward.requirements ? JSON.stringify(reward.requirements) : null,
      reward.purchaseLimit ? JSON.stringify(reward.purchaseLimit) : null,
      reward.startDate ?? null,
      reward.expiryDate ?? null,
      reward.isPointSwap ?? false,
      reward.swapConfig ? JSON.stringify(reward.swapConfig) : null,
      reward.inactiveOnSchoolHolidays ?? false,
      reward.onlyOnSchoolHolidays ?? false,
      reward.holidayCostOverride ?? null,
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
    
    // Ensure categoryIds is always an array before stringifying
    const categoryIdsArray = ensureCategoryIdsArray(reward.categoryIds);
    
    await executor.query(
      `INSERT INTO tenant_rewards_v2
      (id, tenant_id, name, title, description, cost_points, image_emoji, is_active, stock_count, sort_order,
       created_at_timestamp, category_ids, cost_overrides, requirements, purchase_limit,
       start_date, expiry_date, is_point_swap, swap_config,
       inactive_on_school_holidays, only_on_school_holidays, holiday_cost_override)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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
        categoryIdsArray.length > 0 ? JSON.stringify(categoryIdsArray) : null,
        reward.costOverrides ? JSON.stringify(reward.costOverrides) : null,
        reward.requirements ? JSON.stringify(reward.requirements) : null,
        reward.purchaseLimit ? JSON.stringify(reward.purchaseLimit) : null,
        reward.startDate ?? null,
        reward.expiryDate ?? null,
        reward.isPointSwap ?? false,
        reward.swapConfig ? JSON.stringify(reward.swapConfig) : null,
        reward.inactiveOnSchoolHolidays ?? false,
        reward.onlyOnSchoolHolidays ?? false,
        reward.holidayCostOverride ?? null,
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
