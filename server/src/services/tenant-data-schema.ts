import type { PoolConnection, RowDataPacket } from 'mysql2/promise';

export const KEY_TABLE_MAP: Record<string, string> = {
  children: 'tenant_children',
  chores: 'tenant_chores',
  assignments: 'tenant_assignments',
  completions: 'tenant_completions',
  rewards: 'tenant_rewards',
  purchases: 'tenant_purchases',
  'chore-history': 'tenant_chore_history',
  'dismissed-missed-chores': 'tenant_dismissed_missed_chores',
  'tracked-goals': 'tenant_tracked_goals',
  categories: 'tenant_categories',
  'point-swaps': 'tenant_point_swaps',
  'bonus-completions': 'tenant_bonus_completions',
  'child-availability': 'tenant_child_availability',
  'parent-pin': 'tenant_parent_pin',
  'ip-restrictions': 'tenant_ip_restrictions',
  'ip-access-requests': 'tenant_ip_access_requests',
};

export function getTableForKey(key: string): string | null {
  return KEY_TABLE_MAP[key] ?? null;
}

export async function createTenantDataTables(connection: PoolConnection): Promise<void> {
  const tableStatements = Object.values(KEY_TABLE_MAP).map((tableName) => `
    CREATE TABLE IF NOT EXISTS ${tableName} (
      tenant_id VARCHAR(36) PRIMARY KEY,
      value_data LONGTEXT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
      INDEX idx_updated_at (updated_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  for (const statement of tableStatements) {
    await connection.query(statement);
  }
}

export async function migrateKvStoreToTenantTables(connection: PoolConnection): Promise<void> {
  const [rows] = await connection.query<(RowDataPacket & { key_name: string; tenant_id: string; value_data: string })[]>(
    'SELECT key_name, tenant_id, value_data FROM kv_store'
  );

  for (const row of rows) {
    const table = getTableForKey(row.key_name);
    if (!table) continue;

    await connection.query(
      `INSERT INTO ${table} (tenant_id, value_data) VALUES (?, ?) ON DUPLICATE KEY UPDATE value_data = VALUES(value_data)`,
      [row.tenant_id, row.value_data]
    );
  }

  for (const key of Object.keys(KEY_TABLE_MAP)) {
    await connection.query('DELETE FROM kv_store WHERE key_name = ?', [key]);
  }
}
