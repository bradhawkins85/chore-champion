import { Router, Request, Response } from 'express';
import { pool } from '../config/database.js';
import type { RowDataPacket } from 'mysql2';

const router = Router();

// Keys that should always be arrays
// Centralized list to prevent "forEach is not a function" errors
const ARRAY_KEYS = [
  'chores', 'children', 'assignments', 'completions', 'rewards', 'purchases',
  'chore-history', 'dismissed-missed-chores', 'tracked-goals', 'categories',
  'point-swaps', 'bonus-completions'
];

// Get a value by key
router.get('/kv/:key', async (req: Request, res: Response) => {
  try {
    const { key } = req.params;
    const [rows] = await pool.query<RowDataPacket[]>(
      'SELECT value_data FROM kv_store WHERE key_name = ?',
      [key]
    );
    
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Key not found' });
    }
    
    // Handle null values from database
    const valueData = rows[0].value_data;
    if (valueData === null || valueData === undefined) {
      return res.status(404).json({ error: 'Key not found' });
    }
    
    let parsedValue;
    try {
      parsedValue = JSON.parse(valueData);
    } catch (parseError) {
      console.error(`Error parsing value for key "${key}":`, parseError);
      console.error('Raw value_data:', valueData);
      return res.status(500).json({ error: 'Invalid data format' });
    }
    
    // Ensure array-like keys return arrays, not other types
    // This prevents "forEach is not a function" errors when MySQL returns unexpected data types
    if (ARRAY_KEYS.includes(key) && !Array.isArray(parsedValue)) {
      console.warn(`Key "${key}" should be an array but got:`, typeof parsedValue, parsedValue);
      // Return empty array for safety
      parsedValue = [];
    }
    
    // Check if the request is from Spark runtime (sends Content-Type: text/plain on GET requests)
    // or from our custom API client (expects JSON with {value: ...} wrapper)
    // Note: Spark client sends Content-Type: text/plain as a request header even on GET requests
    // to identify itself, which is non-standard but is how we detect Spark requests
    const contentTypeHeader = req.get('content-type') || '';
    
    if (contentTypeHeader.includes('text/plain')) {
      // Spark runtime format: return raw JSON value as text/plain
      res.type('text/plain').send(JSON.stringify(parsedValue));
    } else {
      // Standard API format: return JSON with value wrapper
      res.json({ value: parsedValue });
    }
  } catch (error) {
    console.error('Error getting value:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Set a value by key
router.post('/kv/:key', async (req: Request, res: Response) => {
  try {
    const { key } = req.params;
    let value;
    
    // Handle both Spark runtime format (text/plain with raw JSON) and standard format (application/json with {value: ...})
    const contentType = req.get('content-type') || '';
    
    if (contentType.includes('text/plain')) {
      // Spark runtime sends raw JSON as text/plain
      if (typeof req.body === 'string') {
        try {
          value = JSON.parse(req.body);
        } catch {
          // If it's not valid JSON, treat it as a string value
          value = req.body;
        }
      } else {
        value = req.body;
      }
    } else {
      // Standard format: {value: ...}
      value = req.body.value;
    }
    
    if (value === undefined) {
      return res.status(400).json({ error: 'Value is required' });
    }
    
    // Validate that array keys receive array values
    // This prevents data corruption at write time
    if (ARRAY_KEYS.includes(key) && !Array.isArray(value)) {
      console.error(`POST /kv/${key}: Attempted to set non-array value for array key:`, typeof value, value);
      return res.status(400).json({ 
        error: `Key "${key}" must be an array`,
        received: typeof value 
      });
    }
    
    await pool.query(
      `INSERT INTO kv_store (key_name, value_data) 
       VALUES (?, ?) 
       ON DUPLICATE KEY UPDATE value_data = ?`,
      [key, JSON.stringify(value), JSON.stringify(value)]
    );
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error setting value:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete a value by key
router.delete('/kv/:key', async (req: Request, res: Response) => {
  try {
    const { key } = req.params;
    await pool.query('DELETE FROM kv_store WHERE key_name = ?', [key]);
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting value:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get all keys (for debugging/migration)
router.get('/kv', async (req: Request, res: Response) => {
  try {
    const [rows] = await pool.query<RowDataPacket[]>(
      'SELECT key_name, value_data FROM kv_store'
    );
    
    const data: Record<string, any> = {};
    rows.forEach(row => {
      // Skip null or undefined values
      if (row.value_data !== null && row.value_data !== undefined) {
        try {
          const parsedValue = JSON.parse(row.value_data);
          
          // Ensure array keys return arrays
          if (ARRAY_KEYS.includes(row.key_name) && !Array.isArray(parsedValue)) {
            console.warn(`Bulk GET: Key "${row.key_name}" should be an array but got:`, typeof parsedValue, parsedValue);
            data[row.key_name] = [];
          } else {
            data[row.key_name] = parsedValue;
          }
        } catch (parseError) {
          console.error(`Bulk GET: Error parsing value for key "${row.key_name}":`, parseError);
          // Skip corrupted entries
        }
      }
    });
    
    res.json(data);
  } catch (error) {
    console.error('Error getting all values:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Bulk set (for migration)
router.post('/kv', async (req: Request, res: Response) => {
  try {
    const data = req.body;
    
    if (!data || typeof data !== 'object') {
      return res.status(400).json({ error: 'Invalid data format' });
    }
    
    const keys = Object.keys(data);
    if (keys.length === 0) {
      return res.status(400).json({ error: 'No data provided' });
    }
    
    // Validate array keys before bulk insert
    const invalidKeys: string[] = [];
    for (const [key, value] of Object.entries(data)) {
      if (ARRAY_KEYS.includes(key) && !Array.isArray(value)) {
        invalidKeys.push(key);
        console.error(`Bulk POST: Key "${key}" must be an array, got:`, typeof value);
      }
    }
    
    if (invalidKeys.length > 0) {
      return res.status(400).json({ 
        error: 'Invalid data types for array keys',
        invalidKeys: invalidKeys
      });
    }
    
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();
      
      for (const [key, value] of Object.entries(data)) {
        await connection.query(
          `INSERT INTO kv_store (key_name, value_data) 
           VALUES (?, ?) 
           ON DUPLICATE KEY UPDATE value_data = ?`,
          [key, JSON.stringify(value), JSON.stringify(value)]
        );
      }
      
      await connection.commit();
      res.json({ success: true, count: keys.length });
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('Error bulk setting values:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Spark framework loaded endpoint
// This endpoint is called by Spark runtime when the app is loaded
// It's used for tracking and analytics purposes
// Accepts any payload format from Spark without validation
router.post('/loaded', (req: Request, res: Response) => {
  try {
    // Accept the request but don't need to do anything with it
    // Spark runtime expects a successful response
    res.json({ success: true });
  } catch (error) {
    console.error('Error handling loaded event:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
