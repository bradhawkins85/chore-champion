import mysql from 'mysql2/promise';
import type { RowDataPacket } from 'mysql2';

// Validate required environment variables in production
if (process.env.NODE_ENV === 'production') {
  const requiredVars = ['MYSQL_HOST', 'MYSQL_USER', 'MYSQL_PASSWORD', 'MYSQL_DATABASE'];
  const missing = requiredVars.filter(v => !process.env[v]);
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
}

const dbConfig = {
  host: process.env.MYSQL_HOST || 'mysql',
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
      const connection = await pool.getConnection();
      try {
        // Create tenants table
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

        // Create kv_store table or modify it if it exists
        // First check if the table exists
        const [tables] = await connection.query<RowDataPacket[]>(
          "SHOW TABLES LIKE 'kv_store'"
        );

        if (tables.length === 0) {
          // Table doesn't exist, create it with tenant_id
          await connection.query(`
            CREATE TABLE kv_store (
              key_name VARCHAR(255) NOT NULL,
              tenant_id VARCHAR(36) DEFAULT NULL,
              value_data LONGTEXT NOT NULL,
              created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
              updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
              PRIMARY KEY (key_name, tenant_id),
              INDEX idx_tenant_id (tenant_id)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
          `);
        } else {
          // Table exists, check if tenant_id column exists
          const [columns] = await connection.query<RowDataPacket[]>(
            "SHOW COLUMNS FROM kv_store LIKE 'tenant_id'"
          );

          if (columns.length === 0) {
            // tenant_id column doesn't exist, add it
            // First drop the primary key
            await connection.query('ALTER TABLE kv_store DROP PRIMARY KEY');
            
            // Add tenant_id column
            await connection.query(
              'ALTER TABLE kv_store ADD COLUMN tenant_id VARCHAR(36) DEFAULT NULL'
            );
            
            // Add index on tenant_id
            await connection.query(
              'ALTER TABLE kv_store ADD INDEX idx_tenant_id (tenant_id)'
            );
            
            // Add composite primary key
            await connection.query(
              'ALTER TABLE kv_store ADD PRIMARY KEY (key_name, tenant_id)'
            );
          }
        }
        
        console.log('Database initialized successfully');
        return; // Success, exit the function
      } finally {
        connection.release();
      }
    } catch (error: any) {
      const isLastAttempt = attempt === maxRetries;
      
      if (isLastAttempt) {
        console.error(`Failed to initialize database after ${maxRetries} attempts:`, error);
        throw error;
      }
      
      // Calculate delay with exponential backoff: 1s, 2s, 4s, 8s, 16s, etc. (capped at 30s)
      const delay = Math.min(initialDelay * Math.pow(2, attempt - 1), 30000);
      console.log(`Database connection attempt ${attempt} failed: ${error.message}. Retrying in ${delay}ms...`);
      await sleep(delay);
    }
  }
}
