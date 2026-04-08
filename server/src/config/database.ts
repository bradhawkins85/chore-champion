import mysql from 'mysql2/promise';
import type { RowDataPacket } from 'mysql2';
import { createTenantDataTables } from '../services/tenant-data-schema.js';

// Validate required environment variables in production
if (process.env.NODE_ENV === 'production') {
  const requiredVars = ['MYSQL_HOST', 'MYSQL_USER', 'MYSQL_PASSWORD', 'MYSQL_DATABASE'];
  const missing = requiredVars.filter(v => !process.env[v]);
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
}

const dbConfig = {
  host: process.env.MYSQL_HOST || 'localhost',
  port: parseInt(process.env.MYSQL_PORT || '3306'),
  user: process.env.MYSQL_USER || 'chorequest',
  password: process.env.MYSQL_PASSWORD || 'chorequest',
  database: process.env.MYSQL_DATABASE || 'chorequest',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
};

export const pool = mysql.createPool(dbConfig);

async function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export async function initDatabase() {
  const maxRetries = 10;
  const initialDelay = 1000; // 1 second
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`Database initialization attempt ${attempt}/${maxRetries}...`);
      const connection = await pool.getConnection();
      try {
        // Create tenants table
        console.log('Creating tenants table...');
        await connection.query(`
          CREATE TABLE IF NOT EXISTS tenants (
            id VARCHAR(36) PRIMARY KEY,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            INDEX idx_created_at (created_at)
          ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `);

        // Create users table
        await connection.query(`
          CREATE TABLE IF NOT EXISTS users (
            id VARCHAR(36) PRIMARY KEY,
            email VARCHAR(255) NOT NULL UNIQUE,
            password_hash VARCHAR(255) NOT NULL,
            tenant_id VARCHAR(36) NOT NULL,
            role ENUM('parent', 'admin') DEFAULT 'parent',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
            INDEX idx_email (email),
            INDEX idx_tenant_id (tenant_id)
          ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `);

        // Create devices table
        await connection.query(`
          CREATE TABLE IF NOT EXISTS devices (
            id VARCHAR(36) PRIMARY KEY,
            device_guid VARCHAR(36) NOT NULL UNIQUE,
            device_name VARCHAR(255),
            device_info JSON,
            tenant_id VARCHAR(36),
            linked_at TIMESTAMP NULL,
            last_seen TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE SET NULL,
            INDEX idx_device_guid (device_guid),
            INDEX idx_tenant_id (tenant_id),
            INDEX idx_last_seen (last_seen)
          ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `);

        // Create linking_codes table for ephemeral device linking codes
        await connection.query(`
          CREATE TABLE IF NOT EXISTS linking_codes (
            code VARCHAR(6) PRIMARY KEY,
            tenant_id VARCHAR(36) NOT NULL,
            device_id VARCHAR(36),
            expires_at TIMESTAMP NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            used_at TIMESTAMP NULL,
            FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
            INDEX idx_tenant_id (tenant_id),
            INDEX idx_expires_at (expires_at),
            INDEX idx_device_id (device_id)
          ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `);

        // Create parent_invitations table for inviting additional parents
        await connection.query(`
          CREATE TABLE IF NOT EXISTS parent_invitations (
            id VARCHAR(36) PRIMARY KEY,
            token VARCHAR(64) NOT NULL UNIQUE,
            email VARCHAR(255) NOT NULL,
            tenant_id VARCHAR(36) NOT NULL,
            inviter_id VARCHAR(36) NOT NULL,
            status ENUM('pending', 'accepted', 'expired') DEFAULT 'pending',
            expires_at TIMESTAMP NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            accepted_at TIMESTAMP NULL,
            FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
            FOREIGN KEY (inviter_id) REFERENCES users(id) ON DELETE CASCADE,
            INDEX idx_token (token),
            INDEX idx_email (email),
            INDEX idx_tenant_id (tenant_id),
            INDEX idx_status (status),
            INDEX idx_expires_at (expires_at)
          ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `);

        // Check if device_name column exists in devices table
        const [deviceColumns] = await connection.query<RowDataPacket[]>(
          "SHOW COLUMNS FROM devices LIKE 'device_name'"
        );
        
        if (deviceColumns.length === 0) {
          // device_name column doesn't exist, add it
          await connection.query(
            'ALTER TABLE devices ADD COLUMN device_name VARCHAR(255) AFTER device_guid'
          );
          console.log('Added device_name column to devices table');
        }

        // Check if allowed_children_ids column exists in devices table
        const [allowedChildrenColumns] = await connection.query<RowDataPacket[]>(
          "SHOW COLUMNS FROM devices LIKE 'allowed_children_ids'"
        );
        
        if (allowedChildrenColumns.length === 0) {
          // allowed_children_ids column doesn't exist, add it
          await connection.query(
            'ALTER TABLE devices ADD COLUMN allowed_children_ids JSON AFTER device_info'
          );
          console.log('Added allowed_children_ids column to devices table');
        }

        // Create kv_store table for non-normalized keys (generic key-value storage)
        await connection.query(`
          CREATE TABLE IF NOT EXISTS kv_store (
            key_name VARCHAR(255) NOT NULL,
            tenant_id VARCHAR(36) NOT NULL,
            value_data LONGTEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            PRIMARY KEY (key_name, tenant_id),
            INDEX idx_tenant_id (tenant_id)
          ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `);
        console.log('Created kv_store table successfully');

        await createTenantDataTables(connection);
        console.log('Created tenant data tables successfully');

        const tenantPayloadTables = [
          'tenant_assignments_v2',
          'tenant_completions_v2',
          'tenant_purchases_v2',
          'tenant_chore_history_v2',
          'tenant_dismissed_missed_chores_v2',
          'tenant_tracked_goals_v2',
          'tenant_point_swaps_v2',
          'tenant_bonus_completions_v2',
          'tenant_child_availability_v2',
        ];

        for (const tableName of tenantPayloadTables) {
          const [createdAtColumns] = await connection.query<RowDataPacket[]>(
            `SHOW COLUMNS FROM ${tableName} LIKE 'created_at'`
          );
          if (createdAtColumns.length === 0) {
            await connection.query(`ALTER TABLE ${tableName} ADD COLUMN created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP`);
            console.log(`Added created_at column to ${tableName}`);
          }

          const [updatedAtColumns] = await connection.query<RowDataPacket[]>(
            `SHOW COLUMNS FROM ${tableName} LIKE 'updated_at'`
          );
          if (updatedAtColumns.length === 0) {
            await connection.query(`ALTER TABLE ${tableName} ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP`);
            console.log(`Added updated_at column to ${tableName}`);
          }

          const [payloadColumns] = await connection.query<RowDataPacket[]>(
            `SHOW COLUMNS FROM ${tableName} LIKE 'payload_json'`
          );
          if (payloadColumns.length > 0 && payloadColumns[0].Null === 'NO') {
            await connection.query(`ALTER TABLE ${tableName} MODIFY COLUMN payload_json JSON NULL`);
            console.log(`Updated payload_json to allow NULL on ${tableName}`);
          }
        }

        // Add missing columns to tenant_purchases_v2 (added in purchases repository migration)
        const purchaseColumnMigrations = [
          { name: 'sort_order', sql: 'ALTER TABLE tenant_purchases_v2 ADD COLUMN sort_order INT DEFAULT 0' },
          { name: 'points_spent', sql: 'ALTER TABLE tenant_purchases_v2 ADD COLUMN points_spent INT DEFAULT 0' },
          { name: 'status', sql: 'ALTER TABLE tenant_purchases_v2 ADD COLUMN status VARCHAR(50) DEFAULT NULL' },
          { name: 'fulfilled', sql: 'ALTER TABLE tenant_purchases_v2 ADD COLUMN fulfilled BOOLEAN DEFAULT FALSE' },
          { name: 'cost', sql: 'ALTER TABLE tenant_purchases_v2 ADD COLUMN cost INT DEFAULT 0' },
        ];
        for (const migration of purchaseColumnMigrations) {
          const [cols] = await connection.query<RowDataPacket[]>(
            'SHOW COLUMNS FROM tenant_purchases_v2 LIKE ?',
            [migration.name]
          );
          if (cols.length === 0) {
            await connection.query(migration.sql);
            console.log(`Added ${migration.name} column to tenant_purchases_v2 table`);
          }
        }

        for (const tableName of ['tenant_parent_pin_v2', 'tenant_ip_restrictions_v2', 'tenant_ip_access_requests_v2']) {
          const [createdAtColumns] = await connection.query<RowDataPacket[]>(
            `SHOW COLUMNS FROM ${tableName} LIKE 'created_at'`
          );
          if (createdAtColumns.length === 0) {
            await connection.query(`ALTER TABLE ${tableName} ADD COLUMN created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP`);
            console.log(`Added created_at column to ${tableName}`);
          }

          const [updatedAtColumns] = await connection.query<RowDataPacket[]>(
            `SHOW COLUMNS FROM ${tableName} LIKE 'updated_at'`
          );
          if (updatedAtColumns.length === 0) {
            await connection.query(`ALTER TABLE ${tableName} ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP`);
            console.log(`Added updated_at column to ${tableName}`);
          }
        }


        // Add emoji column to tenant_chores_v2 table if it doesn't exist
        const [choreColumns] = await connection.query<RowDataPacket[]>(
          "SHOW COLUMNS FROM tenant_chores_v2 LIKE 'emoji'"
        );
        
        if (choreColumns.length === 0) {
          // emoji column doesn't exist, add it
          await connection.query(
            'ALTER TABLE tenant_chores_v2 ADD COLUMN emoji VARCHAR(10) AFTER description'
          );
          console.log('Added emoji column to tenant_chores_v2 table');
        }

        // Add new columns to tenant_children_v2 table for payload-to-columns migration
        console.log('Checking for missing columns in tenant_children_v2...');
        const childColumnMigrations = [
          { name: 'avatar_color', sql: 'ALTER TABLE tenant_children_v2 ADD COLUMN avatar_color VARCHAR(20) AFTER sort_order' },
          { name: 'ics_url', sql: 'ALTER TABLE tenant_children_v2 ADD COLUMN ics_url TEXT AFTER avatar_color' },
          { name: 'calendar_last_refresh', sql: 'ALTER TABLE tenant_children_v2 ADD COLUMN calendar_last_refresh BIGINT NULL AFTER ics_url' },
          { name: 'calendar_auto_refresh', sql: 'ALTER TABLE tenant_children_v2 ADD COLUMN calendar_auto_refresh BOOLEAN DEFAULT FALSE AFTER calendar_last_refresh' },
          { name: 'calendar_refresh_interval', sql: 'ALTER TABLE tenant_children_v2 ADD COLUMN calendar_refresh_interval VARCHAR(20) AFTER calendar_auto_refresh' },
          { name: 'calendar_show_times', sql: 'ALTER TABLE tenant_children_v2 ADD COLUMN calendar_show_times BOOLEAN DEFAULT TRUE AFTER calendar_refresh_interval' },
          { name: 'total_points', sql: 'ALTER TABLE tenant_children_v2 ADD COLUMN total_points INT DEFAULT 0 AFTER calendar_show_times' },
          { name: 'created_at_timestamp', sql: 'ALTER TABLE tenant_children_v2 ADD COLUMN created_at_timestamp BIGINT NULL AFTER total_points' },
        ];

        for (const migration of childColumnMigrations) {
          const [cols] = await connection.query<RowDataPacket[]>(
            'SHOW COLUMNS FROM tenant_children_v2 LIKE ?',
            [migration.name]
          );
          if (cols.length === 0) {
            await connection.query(migration.sql);
            console.log(`Added ${migration.name} column to tenant_children_v2 table`);
          }
        }

        // Add new columns to tenant_chores_v2 table for payload-to-columns migration
        console.log('Checking for missing columns in tenant_chores_v2...');
        const choreColumnMigrations = [
          { name: 'name', sql: 'ALTER TABLE tenant_chores_v2 ADD COLUMN name VARCHAR(255) AFTER tenant_id' },
          { name: 'completion_type', sql: 'ALTER TABLE tenant_chores_v2 ADD COLUMN completion_type VARCHAR(50) AFTER frequency' },
          { name: 'category_ids', sql: 'ALTER TABLE tenant_chores_v2 ADD COLUMN category_ids JSON AFTER sort_order' },
          { name: 'category_points', sql: 'ALTER TABLE tenant_chores_v2 ADD COLUMN category_points JSON AFTER category_ids' },
          { name: 'desired_time', sql: 'ALTER TABLE tenant_chores_v2 ADD COLUMN desired_time VARCHAR(20) AFTER category_points' },
          { name: 'time_of_day', sql: 'ALTER TABLE tenant_chores_v2 ADD COLUMN time_of_day VARCHAR(20) AFTER desired_time' },
          { name: 'time_window', sql: 'ALTER TABLE tenant_chores_v2 ADD COLUMN time_window JSON AFTER time_of_day' },
          { name: 'estimated_duration', sql: 'ALTER TABLE tenant_chores_v2 ADD COLUMN estimated_duration INT NULL AFTER time_window' },
          { name: 'approval_configs', sql: 'ALTER TABLE tenant_chores_v2 ADD COLUMN approval_configs JSON AFTER estimated_duration' },
          { name: 'max_completions', sql: 'ALTER TABLE tenant_chores_v2 ADD COLUMN max_completions INT NULL AFTER approval_configs' },
          { name: 'reset_period', sql: 'ALTER TABLE tenant_chores_v2 ADD COLUMN reset_period VARCHAR(50) AFTER max_completions' },
          { name: 'weather_conditions', sql: 'ALTER TABLE tenant_chores_v2 ADD COLUMN weather_conditions JSON AFTER reset_period' },
          { name: 'speak_description', sql: 'ALTER TABLE tenant_chores_v2 ADD COLUMN speak_description BOOLEAN DEFAULT TRUE AFTER weather_conditions' },
          { name: 'inactive_on_school_holidays', sql: 'ALTER TABLE tenant_chores_v2 ADD COLUMN inactive_on_school_holidays BOOLEAN DEFAULT FALSE AFTER speak_description' },
          { name: 'only_on_school_holidays', sql: 'ALTER TABLE tenant_chores_v2 ADD COLUMN only_on_school_holidays BOOLEAN DEFAULT FALSE AFTER inactive_on_school_holidays' },
          { name: 'rotation_config', sql: 'ALTER TABLE tenant_chores_v2 ADD COLUMN rotation_config JSON AFTER only_on_school_holidays' },
          { name: 'created_at_timestamp', sql: 'ALTER TABLE tenant_chores_v2 ADD COLUMN created_at_timestamp BIGINT NULL AFTER rotation_config' },
        ];

        for (const migration of choreColumnMigrations) {
          const [cols] = await connection.query<RowDataPacket[]>(
            'SHOW COLUMNS FROM tenant_chores_v2 LIKE ?',
            [migration.name]
          );
          if (cols.length === 0) {
            await connection.query(migration.sql);
            console.log(`Added ${migration.name} column to tenant_chores_v2 table`);
          }
        }

        console.log('Column migration completed');

        // Add new columns to tenant_categories_v2 table for payload-to-columns migration
        console.log('Checking for missing columns in tenant_categories_v2...');
        const categoryColumnMigrations = [
          { name: 'description', sql: 'ALTER TABLE tenant_categories_v2 ADD COLUMN description TEXT AFTER name' },
          { name: 'created_at_timestamp', sql: 'ALTER TABLE tenant_categories_v2 ADD COLUMN created_at_timestamp BIGINT NULL AFTER icon' },
          { name: 'exchange_rates', sql: 'ALTER TABLE tenant_categories_v2 ADD COLUMN exchange_rates JSON AFTER sort_order' },
          { name: 'completion_bonus', sql: 'ALTER TABLE tenant_categories_v2 ADD COLUMN completion_bonus JSON AFTER exchange_rates' },
          { name: 'points_expiry', sql: 'ALTER TABLE tenant_categories_v2 ADD COLUMN points_expiry JSON AFTER completion_bonus' },
          { name: 'show_in_up_next', sql: 'ALTER TABLE tenant_categories_v2 ADD COLUMN show_in_up_next BOOLEAN DEFAULT TRUE AFTER points_expiry' },
          { name: 'show_in_calendar', sql: 'ALTER TABLE tenant_categories_v2 ADD COLUMN show_in_calendar BOOLEAN DEFAULT TRUE AFTER show_in_up_next' },
          { name: 'prerequisite_category_id', sql: 'ALTER TABLE tenant_categories_v2 ADD COLUMN prerequisite_category_id VARCHAR(36) AFTER show_in_calendar' },
        ];

        for (const migration of categoryColumnMigrations) {
          const [cols] = await connection.query<RowDataPacket[]>(
            'SHOW COLUMNS FROM tenant_categories_v2 LIKE ?',
            [migration.name]
          );
          if (cols.length === 0) {
            await connection.query(migration.sql);
            console.log(`Added ${migration.name} column to tenant_categories_v2 table`);
          }
        }

        // Add undone_at column to tenant_completions_v2 table if missing
        console.log('Checking for missing columns in tenant_completions_v2...');
        const [undoneAtColumns] = await connection.query<RowDataPacket[]>(
          "SHOW COLUMNS FROM tenant_completions_v2 LIKE 'undone_at'"
        );
        if (undoneAtColumns.length === 0) {
          await connection.query('ALTER TABLE tenant_completions_v2 ADD COLUMN undone_at BIGINT NULL AFTER completed_at');
          console.log('Added undone_at column to tenant_completions_v2 table');
        }

        // Add new columns to tenant_rewards_v2 table for payload-to-columns migration
        console.log('Checking for missing columns in tenant_rewards_v2...');
        
        // Check and add name column first
        const [nameColumns] = await connection.query<RowDataPacket[]>(
          "SHOW COLUMNS FROM tenant_rewards_v2 LIKE 'name'"
        );
        if (nameColumns.length === 0) {
          await connection.query('ALTER TABLE tenant_rewards_v2 ADD COLUMN name VARCHAR(255) DEFAULT NULL AFTER tenant_id');
          console.log('Added name column to tenant_rewards_v2 table');
        }
        
        // Check and add title column after name
        // Note: name column is guaranteed to exist at this point (either it existed before or was just added above)
        const [titleColumns] = await connection.query<RowDataPacket[]>(
          "SHOW COLUMNS FROM tenant_rewards_v2 LIKE 'title'"
        );
        if (titleColumns.length === 0) {
          await connection.query('ALTER TABLE tenant_rewards_v2 ADD COLUMN title VARCHAR(255) DEFAULT NULL AFTER name');
          console.log('Added title column to tenant_rewards_v2 table');
        }

        // Check and add image_emoji column
        const [imageEmojiColumns] = await connection.query<RowDataPacket[]>(
          "SHOW COLUMNS FROM tenant_rewards_v2 LIKE 'image_emoji'"
        );
        if (imageEmojiColumns.length === 0) {
          await connection.query('ALTER TABLE tenant_rewards_v2 ADD COLUMN image_emoji VARCHAR(20) DEFAULT NULL AFTER cost_points');
          console.log('Added image_emoji column to tenant_rewards_v2 table');
        }

        // Check and add created_at_timestamp column
        const [rewardCreatedAtTimestampColumns] = await connection.query<RowDataPacket[]>(
          "SHOW COLUMNS FROM tenant_rewards_v2 LIKE 'created_at_timestamp'"
        );
        if (rewardCreatedAtTimestampColumns.length === 0) {
          await connection.query('ALTER TABLE tenant_rewards_v2 ADD COLUMN created_at_timestamp BIGINT NULL AFTER sort_order');
          console.log('Added created_at_timestamp column to tenant_rewards_v2 table');
        }

        // Add new JSON and other columns to tenant_rewards_v2 table
        console.log('Checking for missing JSON columns in tenant_rewards_v2...');
        const rewardColumnMigrations = [
          { name: 'category_ids', sql: 'ALTER TABLE tenant_rewards_v2 ADD COLUMN category_ids JSON AFTER created_at_timestamp' },
          { name: 'cost_overrides', sql: 'ALTER TABLE tenant_rewards_v2 ADD COLUMN cost_overrides JSON AFTER category_ids' },
          { name: 'requirements', sql: 'ALTER TABLE tenant_rewards_v2 ADD COLUMN requirements JSON AFTER cost_overrides' },
          { name: 'purchase_limit', sql: 'ALTER TABLE tenant_rewards_v2 ADD COLUMN purchase_limit JSON AFTER requirements' },
          { name: 'start_date', sql: 'ALTER TABLE tenant_rewards_v2 ADD COLUMN start_date BIGINT NULL AFTER purchase_limit' },
          { name: 'expiry_date', sql: 'ALTER TABLE tenant_rewards_v2 ADD COLUMN expiry_date BIGINT NULL AFTER start_date' },
          { name: 'is_point_swap', sql: 'ALTER TABLE tenant_rewards_v2 ADD COLUMN is_point_swap BOOLEAN DEFAULT FALSE AFTER expiry_date' },
          { name: 'swap_config', sql: 'ALTER TABLE tenant_rewards_v2 ADD COLUMN swap_config JSON AFTER is_point_swap' },
        ];

        for (const migration of rewardColumnMigrations) {
          const [columns] = await connection.query<RowDataPacket[]>(
            'SHOW COLUMNS FROM tenant_rewards_v2 LIKE ?',
            [migration.name]
          );
          if (columns.length === 0) {
            await connection.query(migration.sql);
            console.log(`Added ${migration.name} column to tenant_rewards_v2 table`);
          }
        }

        // Add missing column to tenant_child_availability_v2 table
        console.log('Checking for missing columns in tenant_child_availability_v2...');
        const [typeColumnRows] = await connection.query<RowDataPacket[]>(
          "SHOW COLUMNS FROM tenant_child_availability_v2 LIKE 'type'"
        );
        
        if (typeColumnRows.length === 0) {
          // type column doesn't exist, add it after child_id
          await connection.query(
            'ALTER TABLE tenant_child_availability_v2 ADD COLUMN type VARCHAR(20) AFTER child_id'
          );
          console.log('Added type column to tenant_child_availability_v2 table');
        }

        const [scheduleTypeColumnRows] = await connection.query<RowDataPacket[]>(
          "SHOW COLUMNS FROM tenant_child_availability_v2 LIKE 'schedule_type'"
        );
        
        if (scheduleTypeColumnRows.length === 0) {
          // schedule_type column doesn't exist, add it after type
          await connection.query(
            'ALTER TABLE tenant_child_availability_v2 ADD COLUMN schedule_type VARCHAR(20) AFTER type'
          );
          console.log('Added schedule_type column to tenant_child_availability_v2 table');
        }

        const [startDateColumnRows] = await connection.query<RowDataPacket[]>(
          "SHOW COLUMNS FROM tenant_child_availability_v2 LIKE 'start_date'"
        );
        
        if (startDateColumnRows.length === 0) {
          // start_date column doesn't exist, add it after schedule_type
          await connection.query(
            'ALTER TABLE tenant_child_availability_v2 ADD COLUMN start_date BIGINT NULL AFTER schedule_type'
          );
          console.log('Added start_date column to tenant_child_availability_v2 table');
        }

        const [endDateColumnRows] = await connection.query<RowDataPacket[]>(
          "SHOW COLUMNS FROM tenant_child_availability_v2 LIKE 'end_date'"
        );
        
        if (endDateColumnRows.length === 0) {
          // end_date column doesn't exist, add it after start_date
          await connection.query(
            'ALTER TABLE tenant_child_availability_v2 ADD COLUMN end_date BIGINT NULL AFTER start_date'
          );
          console.log('Added end_date column to tenant_child_availability_v2 table');
        }

        const [dayOfWeekColumnRows] = await connection.query<RowDataPacket[]>(
          "SHOW COLUMNS FROM tenant_child_availability_v2 LIKE 'day_of_week'"
        );
        
        if (dayOfWeekColumnRows.length === 0) {
          // day_of_week column doesn't exist, add it after end_date
          await connection.query(
            'ALTER TABLE tenant_child_availability_v2 ADD COLUMN day_of_week TINYINT NULL AFTER end_date'
          );
          console.log('Added day_of_week column to tenant_child_availability_v2 table');
        }

        const [startTimeColumnRows] = await connection.query<RowDataPacket[]>(
          "SHOW COLUMNS FROM tenant_child_availability_v2 LIKE 'start_time'"
        );
        
        if (startTimeColumnRows.length === 0) {
          // start_time column doesn't exist, add it after day_of_week
          await connection.query(
            'ALTER TABLE tenant_child_availability_v2 ADD COLUMN start_time VARCHAR(20) AFTER day_of_week'
          );
          console.log('Added start_time column to tenant_child_availability_v2 table');
        }

        const [endTimeColumnRows] = await connection.query<RowDataPacket[]>(
          "SHOW COLUMNS FROM tenant_child_availability_v2 LIKE 'end_time'"
        );
        
        if (endTimeColumnRows.length === 0) {
          // end_time column doesn't exist, add it after start_time
          await connection.query(
            'ALTER TABLE tenant_child_availability_v2 ADD COLUMN end_time VARCHAR(20) AFTER start_time'
          );
          console.log('Added end_time column to tenant_child_availability_v2 table');
        }

        const [repeatPatternColumnRows] = await connection.query<RowDataPacket[]>(
          "SHOW COLUMNS FROM tenant_child_availability_v2 LIKE 'repeat_pattern'"
        );
        
        if (repeatPatternColumnRows.length === 0) {
          // repeat_pattern column doesn't exist, add it after end_time
          await connection.query(
            'ALTER TABLE tenant_child_availability_v2 ADD COLUMN repeat_pattern VARCHAR(255) AFTER end_time'
          );
          console.log('Added repeat_pattern column to tenant_child_availability_v2 table');
        }

        const [noteColumnRows] = await connection.query<RowDataPacket[]>(
          "SHOW COLUMNS FROM tenant_child_availability_v2 LIKE 'note'"
        );
        
        if (noteColumnRows.length === 0) {
          // note column doesn't exist, add it after repeat_pattern
          await connection.query(
            'ALTER TABLE tenant_child_availability_v2 ADD COLUMN note TEXT AFTER repeat_pattern'
          );
          console.log('Added note column to tenant_child_availability_v2 table');
        }

        const [isAvailableColumnRows] = await connection.query<RowDataPacket[]>(
          "SHOW COLUMNS FROM tenant_child_availability_v2 LIKE 'is_available'"
        );
        
        if (isAvailableColumnRows.length === 0) {
          // is_available column doesn't exist, add it after note
          await connection.query(
            'ALTER TABLE tenant_child_availability_v2 ADD COLUMN is_available BOOLEAN DEFAULT TRUE AFTER note'
          );
          console.log('Added is_available column to tenant_child_availability_v2 table');
        }

        const [sortOrderColumnRows] = await connection.query<RowDataPacket[]>(
          "SHOW COLUMNS FROM tenant_child_availability_v2 LIKE 'sort_order'"
        );
        
        if (sortOrderColumnRows.length === 0) {
          // sort_order column doesn't exist, add it after is_available
          await connection.query(
            'ALTER TABLE tenant_child_availability_v2 ADD COLUMN sort_order INT DEFAULT 0 AFTER is_available'
          );
          console.log('Added sort_order column to tenant_child_availability_v2 table');
        }

        // Add missing columns to tenant_assignments_v2 table
        console.log('Checking for missing columns in tenant_assignments_v2...');
        const assignmentColumnMigrations = [
          { name: 'chore_id', sql: 'ALTER TABLE tenant_assignments_v2 ADD COLUMN chore_id VARCHAR(36) AFTER tenant_id' },
          { name: 'child_id', sql: 'ALTER TABLE tenant_assignments_v2 ADD COLUMN child_id VARCHAR(36) AFTER chore_id' },
          { name: 'assigned_at', sql: 'ALTER TABLE tenant_assignments_v2 ADD COLUMN assigned_at BIGINT NULL AFTER child_id' },
          { name: 'assigned_for', sql: 'ALTER TABLE tenant_assignments_v2 ADD COLUMN assigned_for BIGINT NULL AFTER assigned_at' },
          { name: 'start_date', sql: 'ALTER TABLE tenant_assignments_v2 ADD COLUMN start_date BIGINT NULL AFTER assigned_for' },
          { name: 'end_date', sql: 'ALTER TABLE tenant_assignments_v2 ADD COLUMN end_date BIGINT NULL AFTER start_date' },
          { name: 'days_of_week', sql: 'ALTER TABLE tenant_assignments_v2 ADD COLUMN days_of_week JSON AFTER end_date' },
          { name: 'repeat_pattern', sql: 'ALTER TABLE tenant_assignments_v2 ADD COLUMN repeat_pattern VARCHAR(255) AFTER days_of_week' },
          { name: 'time_of_day', sql: 'ALTER TABLE tenant_assignments_v2 ADD COLUMN time_of_day VARCHAR(10) AFTER repeat_pattern' },
          { name: 'time_window', sql: 'ALTER TABLE tenant_assignments_v2 ADD COLUMN time_window JSON AFTER time_of_day' },
          { name: 'point_overrides', sql: 'ALTER TABLE tenant_assignments_v2 ADD COLUMN point_overrides JSON AFTER time_window' },
          { name: 'category_point_overrides', sql: 'ALTER TABLE tenant_assignments_v2 ADD COLUMN category_point_overrides JSON AFTER point_overrides' },
          { name: 'rotation_state', sql: 'ALTER TABLE tenant_assignments_v2 ADD COLUMN rotation_state JSON AFTER category_point_overrides' },
          { name: 'status', sql: 'ALTER TABLE tenant_assignments_v2 ADD COLUMN status VARCHAR(50) AFTER rotation_state' },
          { name: 'points', sql: 'ALTER TABLE tenant_assignments_v2 ADD COLUMN points INT DEFAULT 0 AFTER status' },
          { name: 'sort_order', sql: 'ALTER TABLE tenant_assignments_v2 ADD COLUMN sort_order INT DEFAULT 0 AFTER points' },
        ];

        for (const migration of assignmentColumnMigrations) {
          const [cols] = await connection.query<RowDataPacket[]>(
            'SHOW COLUMNS FROM tenant_assignments_v2 LIKE ?',
            [migration.name]
          );
          if (cols.length === 0) {
            await connection.query(migration.sql);
            console.log(`Added ${migration.name} column to tenant_assignments_v2 table`);
          }
        }

        // Expand repeat_pattern column size to accommodate longer JSON strings
        console.log('Checking repeat_pattern column size in tenant_assignments_v2 and tenant_child_availability_v2...');
        
        // Check tenant_assignments_v2
        const [assignmentRepeatPatternCols] = await connection.query<RowDataPacket[]>(
          "SHOW COLUMNS FROM tenant_assignments_v2 LIKE 'repeat_pattern'"
        );
        if (assignmentRepeatPatternCols.length > 0) {
          const colType = assignmentRepeatPatternCols[0].Type;
          if (colType === 'varchar(50)') {
            await connection.query(
              'ALTER TABLE tenant_assignments_v2 MODIFY COLUMN repeat_pattern VARCHAR(255)'
            );
            console.log('Expanded repeat_pattern column to VARCHAR(255) in tenant_assignments_v2 table');
          }
        }

        // Check tenant_child_availability_v2
        const [availabilityRepeatPatternCols] = await connection.query<RowDataPacket[]>(
          "SHOW COLUMNS FROM tenant_child_availability_v2 LIKE 'repeat_pattern'"
        );
        if (availabilityRepeatPatternCols.length > 0) {
          const colType = availabilityRepeatPatternCols[0].Type;
          if (colType === 'varchar(50)') {
            await connection.query(
              'ALTER TABLE tenant_child_availability_v2 MODIFY COLUMN repeat_pattern VARCHAR(255)'
            );
            console.log('Expanded repeat_pattern column to VARCHAR(255) in tenant_child_availability_v2 table');
          }
        }

        // Add missing columns to tenant_completions_v2 table
        console.log('Checking for missing columns in tenant_completions_v2...');
        const completionColumnMigrations = [
          { name: 'chore_id', sql: 'ALTER TABLE tenant_completions_v2 ADD COLUMN chore_id VARCHAR(36) AFTER tenant_id' },
          { name: 'child_id', sql: 'ALTER TABLE tenant_completions_v2 ADD COLUMN child_id VARCHAR(36) AFTER chore_id' },
          { name: 'assignment_id', sql: 'ALTER TABLE tenant_completions_v2 ADD COLUMN assignment_id VARCHAR(36) AFTER child_id' },
          { name: 'completed_at', sql: 'ALTER TABLE tenant_completions_v2 ADD COLUMN completed_at BIGINT NULL AFTER assignment_id' },
          { name: 'undone_at', sql: 'ALTER TABLE tenant_completions_v2 ADD COLUMN undone_at BIGINT NULL AFTER completed_at' },
          { name: 'overridden', sql: 'ALTER TABLE tenant_completions_v2 ADD COLUMN overridden BOOLEAN DEFAULT FALSE AFTER undone_at' },
          { name: 'approval_status', sql: 'ALTER TABLE tenant_completions_v2 ADD COLUMN approval_status VARCHAR(50) AFTER overridden' },
          { name: 'approved_at', sql: 'ALTER TABLE tenant_completions_v2 ADD COLUMN approved_at BIGINT NULL AFTER approval_status' },
          { name: 'approved_by', sql: 'ALTER TABLE tenant_completions_v2 ADD COLUMN approved_by VARCHAR(36) AFTER approved_at' },
          { name: 'rejected_reason', sql: 'ALTER TABLE tenant_completions_v2 ADD COLUMN rejected_reason TEXT AFTER approved_by' },
          { name: 'time_of_day', sql: 'ALTER TABLE tenant_completions_v2 ADD COLUMN time_of_day VARCHAR(10) AFTER rejected_reason' },
          { name: 'status', sql: 'ALTER TABLE tenant_completions_v2 ADD COLUMN status VARCHAR(50) AFTER time_of_day' },
          { name: 'points_awarded', sql: 'ALTER TABLE tenant_completions_v2 ADD COLUMN points_awarded INT DEFAULT 0 AFTER status' },
          { name: 'sort_order', sql: 'ALTER TABLE tenant_completions_v2 ADD COLUMN sort_order INT DEFAULT 0 AFTER points_awarded' },
        ];

        for (const migration of completionColumnMigrations) {
          const [cols] = await connection.query<RowDataPacket[]>(
            'SHOW COLUMNS FROM tenant_completions_v2 LIKE ?',
            [migration.name]
          );
          if (cols.length === 0) {
            await connection.query(migration.sql);
            console.log(`Added ${migration.name} column to tenant_completions_v2 table`);
          }
        }

        // Keep legacy payload_json columns in place to avoid destructive migrations.
        // These columns are intentionally preserved during updates so existing data can
        // always be recovered if a future schema rollout misses a field migration.
        for (const tableName of ['tenant_children_v2', 'tenant_chores_v2', 'tenant_rewards_v2', 'tenant_categories_v2']) {
          const [payloadColumns] = await connection.query<RowDataPacket[]>(
            `SHOW COLUMNS FROM ${tableName} LIKE 'payload_json'`
          );

          if (payloadColumns.length > 0) {
            console.log(`Preserving legacy payload_json column on ${tableName} to prevent data loss during updates`);
          }
        }

        // Create subscription_plans table
        await connection.query(`
          CREATE TABLE IF NOT EXISTS subscription_plans (
            id VARCHAR(36) PRIMARY KEY,
            name VARCHAR(100) NOT NULL,
            tier ENUM('free', 'paid', 'unlimited') NOT NULL,
            description TEXT,
            max_children INT NULL,
            max_devices INT NULL,
            max_chores INT NULL,
            max_rewards INT NULL,
            price_per_child_aud DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
            base_price DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
            billing_interval ENUM('monthly', 'annual') DEFAULT 'monthly',
            features JSON,
            is_active BOOLEAN DEFAULT TRUE,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            INDEX idx_tier (tier),
            INDEX idx_is_active (is_active)
          ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `);

        // Create subscription_pricing_settings table
        await connection.query(`
          CREATE TABLE IF NOT EXISTS subscription_pricing_settings (
            id VARCHAR(36) PRIMARY KEY,
            scope ENUM('global', 'tenant') NOT NULL,
            tenant_id VARCHAR(36) NOT NULL,
            price_per_child_aud DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            UNIQUE KEY idx_scope_tenant (scope, tenant_id),
            INDEX idx_scope (scope)
          ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `);

        // Create wallpaper_assets table for admin-managed gallery
        await connection.query(`
          CREATE TABLE IF NOT EXISTS wallpaper_assets (
            id VARCHAR(36) PRIMARY KEY,
            original_name VARCHAR(255) NOT NULL,
            file_type ENUM('image', 'video') NOT NULL,
            mime_type VARCHAR(100) NOT NULL,
            file_path VARCHAR(512) NOT NULL,
            is_active BOOLEAN DEFAULT TRUE,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            INDEX idx_file_type (file_type),
            INDEX idx_is_active (is_active),
            INDEX idx_created_at (created_at)
          ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `);

        // Create subscriptions table
        await connection.query(`
          CREATE TABLE IF NOT EXISTS subscriptions (
            id VARCHAR(36) PRIMARY KEY,
            tenant_id VARCHAR(36) NOT NULL,
            plan_id VARCHAR(36) NOT NULL,
            status ENUM('active', 'past_due', 'canceled', 'incomplete', 'incomplete_expired', 'trialing', 'unpaid') DEFAULT 'active',
            current_period_start BIGINT NOT NULL,
            current_period_end BIGINT NOT NULL,
            cancel_at_period_end BOOLEAN DEFAULT FALSE,
            canceled_at BIGINT NULL,
            stripe_customer_id VARCHAR(255) NULL,
            stripe_subscription_id VARCHAR(255) NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
            FOREIGN KEY (plan_id) REFERENCES subscription_plans(id) ON DELETE RESTRICT,
            INDEX idx_tenant_id (tenant_id),
            INDEX idx_plan_id (plan_id),
            INDEX idx_status (status),
            INDEX idx_stripe_customer_id (stripe_customer_id),
            INDEX idx_stripe_subscription_id (stripe_subscription_id)
          ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `);

        // Create invoices table
        await connection.query(`
          CREATE TABLE IF NOT EXISTS invoices (
            id VARCHAR(36) PRIMARY KEY,
            tenant_id VARCHAR(36) NOT NULL,
            subscription_id VARCHAR(36) NOT NULL,
            amount_due INT NOT NULL,
            amount_paid INT NOT NULL DEFAULT 0,
            status ENUM('draft', 'open', 'paid', 'void', 'uncollectible') DEFAULT 'draft',
            due_date BIGINT NOT NULL,
            paid_at BIGINT NULL,
            hosted_invoice_url TEXT NULL,
            invoice_pdf TEXT NULL,
            stripe_invoice_id VARCHAR(255) NULL,
            description TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
            FOREIGN KEY (subscription_id) REFERENCES subscriptions(id) ON DELETE CASCADE,
            INDEX idx_tenant_id (tenant_id),
            INDEX idx_subscription_id (subscription_id),
            INDEX idx_status (status),
            INDEX idx_due_date (due_date),
            INDEX idx_stripe_invoice_id (stripe_invoice_id)
          ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `);

        // Create payment_methods table
        await connection.query(`
          CREATE TABLE IF NOT EXISTS payment_methods (
            id VARCHAR(36) PRIMARY KEY,
            tenant_id VARCHAR(36) NOT NULL,
            stripe_payment_method_id VARCHAR(255) NOT NULL,
            type ENUM('card', 'bank_account') DEFAULT 'card',
            last4 VARCHAR(4) NOT NULL,
            brand VARCHAR(50) NOT NULL,
            expiry_month INT NOT NULL,
            expiry_year INT NOT NULL,
            is_default BOOLEAN DEFAULT FALSE,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
            INDEX idx_tenant_id (tenant_id),
            INDEX idx_stripe_payment_method_id (stripe_payment_method_id),
            INDEX idx_is_default (is_default)
          ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `);

        // Add missing columns to tenant_rewards_v2 for school holiday availability
        const rewardHolidayColumnMigrations = [
          { name: 'inactive_on_school_holidays', sql: 'ALTER TABLE tenant_rewards_v2 ADD COLUMN inactive_on_school_holidays TINYINT(1) DEFAULT 0' },
          { name: 'only_on_school_holidays', sql: 'ALTER TABLE tenant_rewards_v2 ADD COLUMN only_on_school_holidays TINYINT(1) DEFAULT 0' },
          { name: 'holiday_cost_override', sql: 'ALTER TABLE tenant_rewards_v2 ADD COLUMN holiday_cost_override INT NULL' },
        ];
        for (const migration of rewardHolidayColumnMigrations) {
          const [cols] = await connection.query<RowDataPacket[]>(
            'SHOW COLUMNS FROM tenant_rewards_v2 LIKE ?',
            [migration.name]
          );
          if (cols.length === 0) {
            await connection.query(migration.sql);
            console.log(`Added ${migration.name} column to tenant_rewards_v2 table`);
          }
        }

        // Insert default subscription plans if they don't exist
        await connection.query(`
          INSERT IGNORE INTO subscription_plans (id, name, tier, description, max_children, max_devices, max_chores, max_rewards, price_per_child_aud, base_price, billing_interval, features, is_active)
          VALUES 
            ('plan_free', 'Free', 'free', 'Perfect for trying out ChoreQuest with basic features', 1, 1, 3, 3, 0.00, 0.00, 'monthly', JSON_ARRAY('1 Child', '1 Linked Device', 'Up to 3 Chores', 'Up to 3 Rewards', 'Basic Notifications'), TRUE),
            ('plan_paid', 'Paid', 'paid', 'Full access to ChoreQuest for growing families', NULL, NULL, NULL, NULL, 1.00, 0.00, 'monthly', JSON_ARRAY('Unlimited Children', 'Unlimited Devices', 'Unlimited Chores', 'Unlimited Rewards', 'Priority Support', 'Advanced Analytics'), TRUE),
            ('plan_unlimited', 'Unlimited', 'unlimited', 'Unlimited plan for special accounts (admin configurable only)', NULL, NULL, NULL, NULL, 0.00, 0.00, 'monthly', JSON_ARRAY('Unlimited Children', 'Unlimited Devices', 'Unlimited Chores', 'Unlimited Rewards', 'VIP Support', 'Advanced Analytics'), TRUE)
        `);

        await connection.query(`
          INSERT IGNORE INTO subscription_pricing_settings (id, scope, tenant_id, price_per_child_aud)
          VALUES ('pricing_global', 'global', 'global', 1.00)
        `);
        
        console.log('Database initialized successfully');
        return; // Success, exit the function
      } catch (initError) {
        console.error('Error during database table initialization:', initError);
        console.error('Stack trace:', initError instanceof Error ? initError.stack : 'No stack trace available');
        throw initError;
      } finally {
        connection.release();
      }
    } catch (error: any) {
      const isLastAttempt = attempt === maxRetries;
      
      if (isLastAttempt) {
        console.error(`Failed to initialize database after ${maxRetries} attempts:`, error);
        console.error('Stack trace:', error instanceof Error ? error.stack : 'No stack trace available');
        console.error('Database config:', {
          host: dbConfig.host,
          port: dbConfig.port,
          user: dbConfig.user,
          database: dbConfig.database,
          // Don't log password
        });
        throw error;
      }
      
      // Calculate delay with exponential backoff: 1s, 2s, 4s, 8s, 16s, etc. (capped at 30s)
      const delay = Math.min(initialDelay * Math.pow(2, attempt - 1), 30000);
      console.log(`Database connection attempt ${attempt} failed: ${error.message}. Retrying in ${delay}ms...`);
      await sleep(delay);
    }
  }
}
