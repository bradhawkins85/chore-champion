import mysql from 'mysql2/promise';

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
        // Create tables for all data entities
        await connection.query(`
          CREATE TABLE IF NOT EXISTS kv_store (
            key_name VARCHAR(255) PRIMARY KEY,
            value_data LONGTEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
          ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `);
        
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
      
      // Calculate delay with exponential backoff: 1s, 2s, 4s, 8s, 16s, etc.
      const delay = initialDelay * Math.pow(2, attempt - 1);
      console.log(`Database connection attempt ${attempt} failed. Retrying in ${delay}ms...`);
      await sleep(delay);
    }
  }
}
