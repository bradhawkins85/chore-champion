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

        // Drop payload_json column from tenant_children_v2 if it exists
        console.log('Checking for payload_json column in tenant_children_v2...');
        const [childrenPayloadColumns] = await connection.query<RowDataPacket[]>(
          "SHOW COLUMNS FROM tenant_children_v2 LIKE 'payload_json'"
        );
        
        if (childrenPayloadColumns.length > 0) {
          await connection.query('ALTER TABLE tenant_children_v2 DROP COLUMN payload_json');
          console.log('Dropped payload_json column from tenant_children_v2 table');
        }

        // Drop payload_json column from tenant_chores_v2 if it exists
        console.log('Checking for payload_json column in tenant_chores_v2...');
        const [choresPayloadColumns] = await connection.query<RowDataPacket[]>(
          "SHOW COLUMNS FROM tenant_chores_v2 LIKE 'payload_json'"
        );
        
        if (choresPayloadColumns.length > 0) {
          await connection.query('ALTER TABLE tenant_chores_v2 DROP COLUMN payload_json');
          console.log('Dropped payload_json column from tenant_chores_v2 table');
        }

        // Drop payload_json column from tenant_rewards_v2 if it exists
        console.log('Checking for payload_json column in tenant_rewards_v2...');
        const [rewardsPayloadColumns] = await connection.query<RowDataPacket[]>(
          "SHOW COLUMNS FROM tenant_rewards_v2 LIKE 'payload_json'"
        );
        
        if (rewardsPayloadColumns.length > 0) {
          await connection.query('ALTER TABLE tenant_rewards_v2 DROP COLUMN payload_json');
          console.log('Dropped payload_json column from tenant_rewards_v2 table');
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
