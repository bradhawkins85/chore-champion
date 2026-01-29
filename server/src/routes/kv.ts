import { Router, Request, Response } from 'express';
import { pool } from '../config/database.js';
import type { RowDataPacket } from 'mysql2';

const router = Router();

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
    
    res.json({ value: JSON.parse(rows[0].value_data) });
  } catch (error) {
    console.error('Error getting value:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Set a value by key
router.post('/kv/:key', async (req: Request, res: Response) => {
  try {
    const { key } = req.params;
    const { value } = req.body;
    
    if (value === undefined) {
      return res.status(400).json({ error: 'Value is required' });
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
      data[row.key_name] = JSON.parse(row.value_data);
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
      res.json({ success: true, count: Object.keys(data).length });
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

export default router;
