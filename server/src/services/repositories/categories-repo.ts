import type { Pool, PoolConnection, RowDataPacket } from 'mysql2/promise';
import { pool } from '../../config/database.js';

export interface CategoryRecord {
  id: string;
  name: string;
  description?: string;
  color: string;
  icon?: string;
  createdAt: number;
  order?: number;
  exchangeRates?: any[];
  completionBonus?: any;
  pointsExpiry?: any;
  showInUpNext?: boolean;
  showInCalendar?: boolean;
  prerequisiteCategoryId?: string;
}

interface CategoryRow extends RowDataPacket {
  id: string;
  name: string | null;
  description: string | null;
  color: string | null;
  icon: string | null;
  created_at_timestamp: number | null;
  sort_order: number | null;
  exchange_rates: string | null;
  completion_bonus: string | null;
  points_expiry: string | null;
  show_in_up_next: number | boolean | null;
  show_in_calendar: number | boolean | null;
  prerequisite_category_id: string | null;
  payload_json: string | null;
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

  try {
    return JSON.parse(trimmedValue) as T;
  } catch (error) {
    console.error('Failed to parse JSON value:', value, error);
    return defaultValue;
  }
}

function mapRow(row: CategoryRow): CategoryRecord {
  // Priority: dedicated columns > payload_json > defaults
  let legacyData: any = {};
  if (row.payload_json) {
    legacyData = safeJsonParse(row.payload_json, {});
  }

  return {
    id: row.id,
    name: row.name ?? '',
    description: row.description ?? legacyData.description ?? undefined,
    color: row.color ?? legacyData.color ?? 'oklch(0.6 0.22 290)',
    icon: row.icon ?? legacyData.icon ?? undefined,
    createdAt: row.created_at_timestamp ?? legacyData.createdAt ?? Date.now(),
    order: row.sort_order ?? legacyData.order ?? undefined,
    exchangeRates: safeJsonParse(row.exchange_rates, legacyData.exchangeRates ?? undefined),
    completionBonus: safeJsonParse(row.completion_bonus, legacyData.completionBonus ?? undefined),
    pointsExpiry: safeJsonParse(row.points_expiry, legacyData.pointsExpiry ?? undefined),
    // Handle boolean columns with proper null/undefined semantics
    showInUpNext: row.show_in_up_next !== null 
      ? Boolean(row.show_in_up_next) 
      : (legacyData.showInUpNext !== undefined ? legacyData.showInUpNext : true),
    showInCalendar: row.show_in_calendar !== null 
      ? Boolean(row.show_in_calendar) 
      : (legacyData.showInCalendar !== undefined ? legacyData.showInCalendar : true),
    prerequisiteCategoryId: row.prerequisite_category_id ?? legacyData.prerequisiteCategoryId ?? undefined,
  };
}

export async function listCategories(tenantId: string, connection?: PoolConnection): Promise<any[]> {
  const executor = getExecutor(connection);
  const [rows] = await executor.query<CategoryRow[]>(
    `SELECT id, name, description, color, icon, created_at_timestamp, sort_order,
            exchange_rates, completion_bonus, points_expiry,
            show_in_up_next, show_in_calendar, prerequisite_category_id, payload_json
     FROM tenant_categories_v2
     WHERE tenant_id = ?
     ORDER BY sort_order ASC, created_at ASC`,
    [tenantId]
  );

  return rows.map(mapRow);
}

export async function getCategoryById(tenantId: string, categoryId: string, connection?: PoolConnection): Promise<CategoryRecord | null> {
  const executor = getExecutor(connection);
  const [rows] = await executor.query<CategoryRow[]>(
    `SELECT id, name, description, color, icon, created_at_timestamp, sort_order,
            exchange_rates, completion_bonus, points_expiry,
            show_in_up_next, show_in_calendar, prerequisite_category_id, payload_json
     FROM tenant_categories_v2
     WHERE tenant_id = ? AND id = ?`,
    [tenantId, categoryId]
  );

  return rows.length ? mapRow(rows[0]) : null;
}

export async function upsertCategory(tenantId: string, category: any, connection?: PoolConnection): Promise<void> {
  const executor = getExecutor(connection);
  
  const sortOrder = category.order ?? 0;
  const createdAt = category.createdAt ?? null;
  
  await executor.query(
    `INSERT INTO tenant_categories_v2
    (id, tenant_id, name, description, color, icon, created_at_timestamp, sort_order,
     exchange_rates, completion_bonus, points_expiry,
     show_in_up_next, show_in_calendar, prerequisite_category_id)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON DUPLICATE KEY UPDATE
      name = VALUES(name),
      description = VALUES(description),
      color = VALUES(color),
      icon = VALUES(icon),
      created_at_timestamp = VALUES(created_at_timestamp),
      sort_order = VALUES(sort_order),
      exchange_rates = VALUES(exchange_rates),
      completion_bonus = VALUES(completion_bonus),
      points_expiry = VALUES(points_expiry),
      show_in_up_next = VALUES(show_in_up_next),
      show_in_calendar = VALUES(show_in_calendar),
      prerequisite_category_id = VALUES(prerequisite_category_id)`,
    [
      category.id,
      tenantId,
      category.name ?? '',
      category.description ?? null,
      category.color ?? 'oklch(0.6 0.22 290)',
      category.icon ?? null,
      createdAt,
      sortOrder,
      category.exchangeRates ? JSON.stringify(category.exchangeRates) : null,
      category.completionBonus ? JSON.stringify(category.completionBonus) : null,
      category.pointsExpiry ? JSON.stringify(category.pointsExpiry) : null,
      category.showInUpNext !== undefined ? category.showInUpNext : true,
      category.showInCalendar !== undefined ? category.showInCalendar : true,
      category.prerequisiteCategoryId ?? null,
    ]
  );
}

export async function replaceCategories(tenantId: string, categories: any[], connection?: PoolConnection): Promise<void> {
  const executor = getExecutor(connection);
  await executor.query('DELETE FROM tenant_categories_v2 WHERE tenant_id = ?', [tenantId]);

  for (const [index, category] of categories.entries()) {
    const sortOrder = category.order ?? index;
    const createdAt = category.createdAt ?? null;
    
    await executor.query(
      `INSERT INTO tenant_categories_v2
      (id, tenant_id, name, description, color, icon, created_at_timestamp, sort_order,
       exchange_rates, completion_bonus, points_expiry,
       show_in_up_next, show_in_calendar, prerequisite_category_id)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        category.id,
        tenantId,
        category.name ?? '',
        category.description ?? null,
        category.color ?? 'oklch(0.6 0.22 290)',
        category.icon ?? null,
        createdAt,
        sortOrder,
        category.exchangeRates ? JSON.stringify(category.exchangeRates) : null,
        category.completionBonus ? JSON.stringify(category.completionBonus) : null,
        category.pointsExpiry ? JSON.stringify(category.pointsExpiry) : null,
        category.showInUpNext !== undefined ? category.showInUpNext : true,
        category.showInCalendar !== undefined ? category.showInCalendar : true,
        category.prerequisiteCategoryId ?? null,
      ]
    );
  }
}

export async function deleteCategories(tenantId: string, connection?: PoolConnection): Promise<void> {
  const executor = getExecutor(connection);
  await executor.query('DELETE FROM tenant_categories_v2 WHERE tenant_id = ?', [tenantId]);
}

export async function deleteCategoryById(tenantId: string, categoryId: string, connection?: PoolConnection): Promise<void> {
  const executor = getExecutor(connection);
  await executor.query('DELETE FROM tenant_categories_v2 WHERE tenant_id = ? AND id = ?', [tenantId, categoryId]);
}
