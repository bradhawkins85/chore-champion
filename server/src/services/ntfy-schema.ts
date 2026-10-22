import type { PoolConnection, RowDataPacket } from 'mysql2/promise';
import { ensureNtfySettings } from './ntfy-settings.js';

export async function createNtfyTables(connection: PoolConnection): Promise<void> {
  await connection.query(`CREATE TABLE IF NOT EXISTS tenant_ntfy_settings (
    tenant_id VARCHAR(36) PRIMARY KEY,
    enabled BOOLEAN NOT NULL DEFAULT TRUE,
    server_url VARCHAR(2048) NOT NULL DEFAULT 'https://ntfy.sh',
    topic VARCHAR(64) NOT NULL,
    auth_mode VARCHAR(10) NOT NULL DEFAULT 'none',
    username VARCHAR(255) NOT NULL DEFAULT '',
    credential TEXT NULL,
    notification_types JSON NOT NULL,
    last_delivered_at DATETIME NULL,
    last_error VARCHAR(255) NULL,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
  await connection.query(`CREATE TABLE IF NOT EXISTS ntfy_outbox (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    tenant_id VARCHAR(36) NOT NULL,
    event_type VARCHAR(40) NOT NULL,
    chore_id VARCHAR(36) NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    attempts INT NOT NULL DEFAULT 0,
    next_attempt_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_pending (next_attempt_at),
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
  const [columns] = await connection.query<RowDataPacket[]>("SHOW COLUMNS FROM ntfy_outbox LIKE 'chore_id'");
  if (!columns.length) await connection.query('ALTER TABLE ntfy_outbox ADD COLUMN chore_id VARCHAR(36) NULL');
  const [tenants] = await connection.query<RowDataPacket[]>(
    `SELECT id FROM tenants WHERE id NOT IN (SELECT tenant_id FROM tenant_ntfy_settings)`,
  );
  for (const tenant of tenants) await ensureNtfySettings(tenant.id, connection);
  // Retire the old browser subscription records after upgrading.
  await connection.query("DELETE FROM kv_store WHERE key_name = 'push-notification-settings'");
}
