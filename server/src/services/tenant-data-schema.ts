import type { PoolConnection, RowDataPacket } from 'mysql2/promise';

export type TenantTableMode = 'collection' | 'singleton';

interface TenantTableConfig {
  tableName: string;
  legacyTableName: string;
  mode: TenantTableMode;
  createSql: string;
}

export const KEY_TABLE_MAP: Record<string, string> = {
  children: 'tenant_children_v2',
  chores: 'tenant_chores_v2',
  assignments: 'tenant_assignments_v2',
  completions: 'tenant_completions_v2',
  rewards: 'tenant_rewards_v2',
  purchases: 'tenant_purchases_v2',
  'chore-history': 'tenant_chore_history_v2',
  'dismissed-missed-chores': 'tenant_dismissed_missed_chores_v2',
  'tracked-goals': 'tenant_tracked_goals_v2',
  categories: 'tenant_categories_v2',
  'point-swaps': 'tenant_point_swaps_v2',
  'bonus-completions': 'tenant_bonus_completions_v2',
  'child-availability': 'tenant_child_availability_v2',
  'parent-pin': 'tenant_parent_pin_v2',
  'ip-restrictions': 'tenant_ip_restrictions_v2',
  'ip-access-requests': 'tenant_ip_access_requests_v2',
};

const TABLE_CONFIGS: Record<string, TenantTableConfig> = {
  children: {
    tableName: 'tenant_children_v2',
    legacyTableName: 'tenant_children',
    mode: 'collection',
    createSql: `CREATE TABLE IF NOT EXISTS tenant_children_v2 (
      id VARCHAR(36) NOT NULL,
      tenant_id VARCHAR(36) NOT NULL,
      first_name VARCHAR(100),
      last_name VARCHAR(100),
      display_name VARCHAR(150),
      status VARCHAR(50),
      points_balance INT DEFAULT 0,
      is_active BOOLEAN DEFAULT TRUE,
      sort_order INT DEFAULT 0,
      payload_json JSON NOT NULL,
      source_updated_at BIGINT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (tenant_id, id),
      FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
      INDEX idx_children_tenant_status (tenant_id, is_active, status),
      INDEX idx_children_tenant_points (tenant_id, points_balance DESC),
      INDEX idx_children_tenant_sort (tenant_id, sort_order)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
  },
  chores: {
    tableName: 'tenant_chores_v2',
    legacyTableName: 'tenant_chores',
    mode: 'collection',
    createSql: `CREATE TABLE IF NOT EXISTS tenant_chores_v2 (
      id VARCHAR(36) NOT NULL,
      tenant_id VARCHAR(36) NOT NULL,
      title VARCHAR(255),
      description TEXT,
      frequency VARCHAR(50),
      schedule_type VARCHAR(50),
      day_of_week TINYINT NULL,
      day_of_month TINYINT NULL,
      due_time VARCHAR(20),
      points INT DEFAULT 0,
      is_active BOOLEAN DEFAULT TRUE,
      sort_order INT DEFAULT 0,
      payload_json JSON NOT NULL,
      source_updated_at BIGINT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (tenant_id, id),
      FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
      INDEX idx_chores_tenant_active (tenant_id, is_active),
      INDEX idx_chores_tenant_frequency (tenant_id, frequency, schedule_type),
      INDEX idx_chores_tenant_sort (tenant_id, sort_order)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
  },
  assignments: {
    tableName: 'tenant_assignments_v2',
    legacyTableName: 'tenant_assignments',
    mode: 'collection',
    createSql: `CREATE TABLE IF NOT EXISTS tenant_assignments_v2 (
      id VARCHAR(36) NOT NULL,
      tenant_id VARCHAR(36) NOT NULL,
      chore_id VARCHAR(36),
      child_id VARCHAR(36),
      assigned_for BIGINT NULL,
      status VARCHAR(50),
      points INT DEFAULT 0,
      sort_order INT DEFAULT 0,
      payload_json JSON NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (tenant_id, id),
      FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
      INDEX idx_assignments_tenant_child_date (tenant_id, child_id, assigned_for),
      INDEX idx_assignments_tenant_chore (tenant_id, chore_id),
      INDEX idx_assignments_tenant_status (tenant_id, status)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
  },
  completions: {
    tableName: 'tenant_completions_v2',
    legacyTableName: 'tenant_completions',
    mode: 'collection',
    createSql: `CREATE TABLE IF NOT EXISTS tenant_completions_v2 (
      id VARCHAR(36) NOT NULL,
      tenant_id VARCHAR(36) NOT NULL,
      chore_id VARCHAR(36),
      child_id VARCHAR(36),
      assignment_id VARCHAR(36),
      completed_at BIGINT NULL,
      approved_at BIGINT NULL,
      status VARCHAR(50),
      points_awarded INT DEFAULT 0,
      sort_order INT DEFAULT 0,
      payload_json JSON NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (tenant_id, id),
      FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
      INDEX idx_completions_tenant_child_completed (tenant_id, child_id, completed_at),
      INDEX idx_completions_tenant_chore_completed (tenant_id, chore_id, completed_at),
      INDEX idx_completions_tenant_status (tenant_id, status)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
  },
  rewards: {
    tableName: 'tenant_rewards_v2',
    legacyTableName: 'tenant_rewards',
    mode: 'collection',
    createSql: `CREATE TABLE IF NOT EXISTS tenant_rewards_v2 (
      id VARCHAR(36) NOT NULL,
      tenant_id VARCHAR(36) NOT NULL,
      title VARCHAR(255),
      description TEXT,
      cost_points INT DEFAULT 0,
      is_active BOOLEAN DEFAULT TRUE,
      stock_count INT NULL,
      sort_order INT DEFAULT 0,
      payload_json JSON NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (tenant_id, id),
      FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
      INDEX idx_rewards_tenant_active_cost (tenant_id, is_active, cost_points),
      INDEX idx_rewards_tenant_sort (tenant_id, sort_order)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
  },
  purchases: {
    tableName: 'tenant_purchases_v2',
    legacyTableName: 'tenant_purchases',
    mode: 'collection',
    createSql: `CREATE TABLE IF NOT EXISTS tenant_purchases_v2 (
      id VARCHAR(36) NOT NULL,
      tenant_id VARCHAR(36) NOT NULL,
      reward_id VARCHAR(36),
      child_id VARCHAR(36),
      purchased_at BIGINT NULL,
      status VARCHAR(50),
      points_spent INT DEFAULT 0,
      sort_order INT DEFAULT 0,
      payload_json JSON NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (tenant_id, id),
      FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
      INDEX idx_purchases_tenant_child_time (tenant_id, child_id, purchased_at),
      INDEX idx_purchases_tenant_reward_time (tenant_id, reward_id, purchased_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
  },
  'chore-history': {
    tableName: 'tenant_chore_history_v2',
    legacyTableName: 'tenant_chore_history',
    mode: 'collection',
    createSql: `CREATE TABLE IF NOT EXISTS tenant_chore_history_v2 (
      id VARCHAR(64) NOT NULL,
      tenant_id VARCHAR(36) NOT NULL,
      chore_id VARCHAR(36),
      child_id VARCHAR(36),
      event_type VARCHAR(50),
      occurred_at BIGINT NULL,
      payload_json JSON NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (tenant_id, id),
      FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
      INDEX idx_chore_history_tenant_time (tenant_id, occurred_at),
      INDEX idx_chore_history_tenant_child (tenant_id, child_id, occurred_at),
      INDEX idx_chore_history_tenant_chore (tenant_id, chore_id, occurred_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
  },
  'dismissed-missed-chores': {
    tableName: 'tenant_dismissed_missed_chores_v2',
    legacyTableName: 'tenant_dismissed_missed_chores',
    mode: 'collection',
    createSql: `CREATE TABLE IF NOT EXISTS tenant_dismissed_missed_chores_v2 (
      id VARCHAR(64) NOT NULL,
      tenant_id VARCHAR(36) NOT NULL,
      chore_id VARCHAR(36),
      child_id VARCHAR(36),
      dismissed_at BIGINT NULL,
      payload_json JSON NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (tenant_id, id),
      FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
      INDEX idx_dismissed_tenant_child (tenant_id, child_id, dismissed_at),
      INDEX idx_dismissed_tenant_chore (tenant_id, chore_id, dismissed_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
  },
  'tracked-goals': {
    tableName: 'tenant_tracked_goals_v2',
    legacyTableName: 'tenant_tracked_goals',
    mode: 'collection',
    createSql: `CREATE TABLE IF NOT EXISTS tenant_tracked_goals_v2 (
      id VARCHAR(36) NOT NULL,
      tenant_id VARCHAR(36) NOT NULL,
      child_id VARCHAR(36),
      title VARCHAR(255),
      target_points INT NULL,
      current_points INT NULL,
      is_completed BOOLEAN DEFAULT FALSE,
      due_at BIGINT NULL,
      sort_order INT DEFAULT 0,
      payload_json JSON NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (tenant_id, id),
      FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
      INDEX idx_goals_tenant_child_completed (tenant_id, child_id, is_completed),
      INDEX idx_goals_tenant_due (tenant_id, due_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
  },
  categories: {
    tableName: 'tenant_categories_v2',
    legacyTableName: 'tenant_categories',
    mode: 'collection',
    createSql: `CREATE TABLE IF NOT EXISTS tenant_categories_v2 (
      id VARCHAR(36) NOT NULL,
      tenant_id VARCHAR(36) NOT NULL,
      name VARCHAR(150),
      color VARCHAR(20),
      icon VARCHAR(100),
      sort_order INT DEFAULT 0,
      payload_json JSON NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (tenant_id, id),
      FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
      INDEX idx_categories_tenant_sort (tenant_id, sort_order),
      INDEX idx_categories_tenant_name (tenant_id, name)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
  },
  'point-swaps': {
    tableName: 'tenant_point_swaps_v2',
    legacyTableName: 'tenant_point_swaps',
    mode: 'collection',
    createSql: `CREATE TABLE IF NOT EXISTS tenant_point_swaps_v2 (
      id VARCHAR(64) NOT NULL,
      tenant_id VARCHAR(36) NOT NULL,
      from_child_id VARCHAR(36),
      to_child_id VARCHAR(36),
      points INT DEFAULT 0,
      swapped_at BIGINT NULL,
      payload_json JSON NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (tenant_id, id),
      FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
      INDEX idx_point_swaps_tenant_time (tenant_id, swapped_at),
      INDEX idx_point_swaps_tenant_from (tenant_id, from_child_id, swapped_at),
      INDEX idx_point_swaps_tenant_to (tenant_id, to_child_id, swapped_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
  },
  'bonus-completions': {
    tableName: 'tenant_bonus_completions_v2',
    legacyTableName: 'tenant_bonus_completions',
    mode: 'collection',
    createSql: `CREATE TABLE IF NOT EXISTS tenant_bonus_completions_v2 (
      id VARCHAR(64) NOT NULL,
      tenant_id VARCHAR(36) NOT NULL,
      child_id VARCHAR(36),
      chore_id VARCHAR(36),
      points_awarded INT DEFAULT 0,
      completed_at BIGINT NULL,
      payload_json JSON NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (tenant_id, id),
      FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
      INDEX idx_bonus_tenant_child_time (tenant_id, child_id, completed_at),
      INDEX idx_bonus_tenant_chore_time (tenant_id, chore_id, completed_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
  },
  'child-availability': {
    tableName: 'tenant_child_availability_v2',
    legacyTableName: 'tenant_child_availability',
    mode: 'collection',
    createSql: `CREATE TABLE IF NOT EXISTS tenant_child_availability_v2 (
      id VARCHAR(64) NOT NULL,
      tenant_id VARCHAR(36) NOT NULL,
      child_id VARCHAR(36),
      day_of_week TINYINT NULL,
      start_time VARCHAR(20),
      end_time VARCHAR(20),
      is_available BOOLEAN DEFAULT TRUE,
      sort_order INT DEFAULT 0,
      payload_json JSON NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (tenant_id, id),
      FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
      INDEX idx_child_availability_tenant_child_day (tenant_id, child_id, day_of_week),
      INDEX idx_child_availability_tenant_sort (tenant_id, sort_order)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
  },
  'parent-pin': {
    tableName: 'tenant_parent_pin_v2',
    legacyTableName: 'tenant_parent_pin',
    mode: 'singleton',
    createSql: `CREATE TABLE IF NOT EXISTS tenant_parent_pin_v2 (
      tenant_id VARCHAR(36) PRIMARY KEY,
      pin_hash VARCHAR(255),
      pin_hint VARCHAR(255),
      payload_json JSON NOT NULL,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
      INDEX idx_parent_pin_updated (updated_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
  },
  'ip-restrictions': {
    tableName: 'tenant_ip_restrictions_v2',
    legacyTableName: 'tenant_ip_restrictions',
    mode: 'singleton',
    createSql: `CREATE TABLE IF NOT EXISTS tenant_ip_restrictions_v2 (
      tenant_id VARCHAR(36) PRIMARY KEY,
      enabled BOOLEAN DEFAULT FALSE,
      mode VARCHAR(30),
      payload_json JSON NOT NULL,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
      INDEX idx_ip_restrictions_enabled (enabled, updated_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
  },
  'ip-access-requests': {
    tableName: 'tenant_ip_access_requests_v2',
    legacyTableName: 'tenant_ip_access_requests',
    mode: 'collection',
    createSql: `CREATE TABLE IF NOT EXISTS tenant_ip_access_requests_v2 (
      id VARCHAR(64) NOT NULL,
      tenant_id VARCHAR(36) NOT NULL,
      ip VARCHAR(64),
      token VARCHAR(128),
      approved BOOLEAN DEFAULT FALSE,
      requested_at BIGINT NULL,
      approved_at BIGINT NULL,
      expires_at BIGINT NULL,
      payload_json JSON NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (tenant_id, id),
      FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
      INDEX idx_ip_requests_tenant_status (tenant_id, approved, expires_at),
      INDEX idx_ip_requests_token (token),
      INDEX idx_ip_requests_ip (tenant_id, ip, requested_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
  },
};

export function getTableForKey(key: string): string | null {
  return KEY_TABLE_MAP[key] ?? null;
}

export function getTableModeForKey(key: string): TenantTableMode | null {
  return TABLE_CONFIGS[key]?.mode ?? null;
}

export function getLegacyTableForKey(key: string): string | null {
  return TABLE_CONFIGS[key]?.legacyTableName ?? null;
}

export async function createTenantDataTables(connection: PoolConnection): Promise<void> {
  for (const config of Object.values(TABLE_CONFIGS)) {
    await connection.query(config.createSql);
  }

  await connection.query(`CREATE TABLE IF NOT EXISTS tenant_data_migration_state (
    tenant_id VARCHAR(36) NOT NULL,
    key_name VARCHAR(255) NOT NULL,
    table_name VARCHAR(255) NOT NULL,
    source_row_count INT NOT NULL DEFAULT 0,
    backfilled_row_count INT NOT NULL DEFAULT 0,
    migrated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    migration_status ENUM('pending', 'success', 'failed') DEFAULT 'pending',
    last_error TEXT NULL,
    PRIMARY KEY (tenant_id, key_name),
    INDEX idx_tenant_data_migration_status (migration_status, migrated_at),
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
}

function tryParse(value: string): unknown {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function normalizeItems(value: unknown): unknown[] {
  if (Array.isArray(value)) return value;
  if (value === null || value === undefined) return [];
  return [value];
}

export async function isTenantKeyMigrated(connection: PoolConnection, tenantId: string, key: string): Promise<boolean> {
  const [rows] = await connection.query<(RowDataPacket & { migration_status: string })[]>(
    `SELECT migration_status FROM tenant_data_migration_state WHERE tenant_id = ? AND key_name = ? LIMIT 1`,
    [tenantId, key]
  );

  return rows[0]?.migration_status === 'success';
}

export async function migrateKvStoreToTenantTables(connection: PoolConnection): Promise<void> {
  const [rows] = await connection.query<(RowDataPacket & { key_name: string; tenant_id: string; value_data: string })[]>(
    'SELECT key_name, tenant_id, value_data FROM kv_store WHERE key_name IN (?)',
    [Object.keys(KEY_TABLE_MAP)]
  );

  for (const row of rows) {
    const config = TABLE_CONFIGS[row.key_name];
    if (!config) continue;

    const parsed = tryParse(row.value_data);
    const sourceItems = config.mode === 'collection' ? normalizeItems(parsed) : (parsed === null ? [] : [parsed]);
    let backfilledCount = 0;

    try {
      if (config.mode === 'singleton') {
        if (sourceItems.length > 0) {
          await connection.query(
            `INSERT INTO ${config.tableName} (tenant_id, payload_json) VALUES (?, CAST(? AS JSON))
             ON DUPLICATE KEY UPDATE payload_json = VALUES(payload_json)`,
            [row.tenant_id, JSON.stringify(sourceItems[0])]
          );
          backfilledCount = 1;
        }
      } else {
        await connection.query(`DELETE FROM ${config.tableName} WHERE tenant_id = ?`, [row.tenant_id]);

        for (let index = 0; index < sourceItems.length; index += 1) {
          const item = sourceItems[index] as Record<string, unknown>;
          const itemId = String(item?.id ?? item?.requestId ?? `${row.key_name}-${index}`);
          await connection.query(
            `INSERT INTO ${config.tableName} (tenant_id, id, payload_json)
             VALUES (?, ?, CAST(? AS JSON))
             ON DUPLICATE KEY UPDATE payload_json = VALUES(payload_json)`,
            [row.tenant_id, itemId, JSON.stringify(item)]
          );
          backfilledCount += 1;
        }
      }

      const expected = config.mode === 'collection' ? sourceItems.length : (sourceItems.length > 0 ? 1 : 0);
      const status = expected === backfilledCount ? 'success' : 'failed';
      await connection.query(
        `INSERT INTO tenant_data_migration_state
         (tenant_id, key_name, table_name, source_row_count, backfilled_row_count, migration_status, last_error)
         VALUES (?, ?, ?, ?, ?, ?, NULL)
         ON DUPLICATE KEY UPDATE
          table_name = VALUES(table_name),
          source_row_count = VALUES(source_row_count),
          backfilled_row_count = VALUES(backfilled_row_count),
          migration_status = VALUES(migration_status),
          last_error = VALUES(last_error),
          migrated_at = CURRENT_TIMESTAMP`,
        [row.tenant_id, row.key_name, config.tableName, expected, backfilledCount, status]
      );
    } catch (error) {
      await connection.query(
        `INSERT INTO tenant_data_migration_state
         (tenant_id, key_name, table_name, source_row_count, backfilled_row_count, migration_status, last_error)
         VALUES (?, ?, ?, ?, ?, 'failed', ?)
         ON DUPLICATE KEY UPDATE
          table_name = VALUES(table_name),
          source_row_count = VALUES(source_row_count),
          backfilled_row_count = VALUES(backfilled_row_count),
          migration_status = 'failed',
          last_error = VALUES(last_error),
          migrated_at = CURRENT_TIMESTAMP`,
        [row.tenant_id, row.key_name, config.tableName, sourceItems.length, backfilledCount, String(error)]
      );
    }
  }

  for (const key of Object.keys(KEY_TABLE_MAP)) {
    await connection.query('DELETE FROM kv_store WHERE key_name = ?', [key]);
  }
}
