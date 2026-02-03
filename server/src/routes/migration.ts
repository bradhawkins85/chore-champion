import { Router, Response } from 'express';
import { pool } from '../config/database.js';
import type { RowDataPacket, ResultSetHeader } from 'mysql2';
import { requireAuth, AuthRequest } from '../middleware/auth.js';

const router = Router();

// Migrate legacy data to authenticated user's tenant
router.post('/migrate-legacy', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.tenantId;
    
    if (!tenantId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    // Prevent migration if tenant is already "legacy"
    if (tenantId === 'legacy') {
      return res.status(400).json({ error: 'Cannot migrate to legacy tenant' });
    }

    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      // Check if legacy data exists
      const [legacyRows] = await connection.query<RowDataPacket[]>(
        'SELECT COUNT(*) as count FROM kv_store WHERE tenant_id = ?',
        ['legacy']
      );

      const legacyCount = legacyRows[0].count;
      
      if (legacyCount === 0) {
        await connection.rollback();
        return res.status(404).json({ error: 'No legacy data found to migrate' });
      }

      // Check if target tenant already has data
      const [targetRows] = await connection.query<RowDataPacket[]>(
        'SELECT COUNT(*) as count FROM kv_store WHERE tenant_id = ?',
        [tenantId]
      );

      const targetHasData = targetRows[0].count > 0;

      // Get all legacy data
      const [legacyData] = await connection.query<RowDataPacket[]>(
        'SELECT key_name, value_data FROM kv_store WHERE tenant_id = ?',
        ['legacy']
      );

      // If target has data, we'll only migrate keys that don't exist in target
      // This prevents overwriting existing user data
      let migratedCount = 0;
      let skippedCount = 0;

      for (const row of legacyData) {
        if (targetHasData) {
          // Check if key exists in target
          const [existingKey] = await connection.query<RowDataPacket[]>(
            'SELECT key_name FROM kv_store WHERE tenant_id = ? AND key_name = ?',
            [tenantId, row.key_name]
          );

          if (existingKey.length > 0) {
            skippedCount++;
            continue; // Skip this key to preserve target data
          }
        }

        // Insert into target tenant
        await connection.query(
          'INSERT INTO kv_store (key_name, tenant_id, value_data) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE value_data = ?',
          [row.key_name, tenantId, row.value_data, row.value_data]
        );
        migratedCount++;
      }

      // Delete all legacy data after successful migration
      await connection.query(
        'DELETE FROM kv_store WHERE tenant_id = ?',
        ['legacy']
      );

      await connection.commit();

      res.json({
        success: true,
        message: 'Legacy data migrated successfully',
        migratedCount,
        skippedCount,
        deletedCount: legacyCount
      });
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('Error migrating legacy data:', error);
    res.status(500).json({ error: 'Internal server error during migration' });
  }
});

// Check if legacy data exists (for UI to show/hide migration button)
router.get('/legacy-status', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const [rows] = await pool.query<RowDataPacket[]>(
      'SELECT COUNT(*) as count FROM kv_store WHERE tenant_id = ?',
      ['legacy']
    );

    res.json({
      success: true,
      hasLegacyData: rows[0].count > 0,
      legacyRecordCount: rows[0].count
    });
  } catch (error) {
    console.error('Error checking legacy status:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
