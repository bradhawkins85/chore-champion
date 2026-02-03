import { Router, Request, Response } from 'express';
import { pool } from '../config/database.js';
import type { RowDataPacket } from 'mysql2';
import { requireAdmin } from '../middleware/adminAuth.js';

const router = Router();

/**
 * Get all tenants with summary information
 * GET /api/admin/tenants
 */
router.get('/tenants', requireAdmin, async (req: Request, res: Response) => {
  try {
    const [tenants] = await pool.query<RowDataPacket[]>(`
      SELECT 
        t.id,
        t.created_at,
        t.updated_at,
        COUNT(DISTINCT u.id) as user_count,
        COUNT(DISTINCT d.id) as device_count,
        GROUP_CONCAT(DISTINCT u.email SEPARATOR ', ') as parent_emails
      FROM tenants t
      LEFT JOIN users u ON t.id = u.tenant_id
      LEFT JOIN devices d ON t.id = d.tenant_id AND d.linked_at IS NOT NULL
      GROUP BY t.id, t.created_at, t.updated_at
      ORDER BY t.created_at DESC
    `);

    res.json({ tenants });
  } catch (error) {
    console.error('Error fetching tenants:', error);
    res.status(500).json({ error: 'Failed to fetch tenants' });
  }
});

/**
 * Get detailed information about a specific tenant
 * GET /api/admin/tenants/:tenantId
 */
router.get('/tenants/:tenantId', requireAdmin, async (req: Request, res: Response) => {
  try {
    const { tenantId } = req.params;

    // Get tenant info
    const [tenantRows] = await pool.query<RowDataPacket[]>(
      'SELECT * FROM tenants WHERE id = ?',
      [tenantId]
    );

    if (tenantRows.length === 0) {
      return res.status(404).json({ error: 'Tenant not found' });
    }

    // Get users for this tenant
    const [users] = await pool.query<RowDataPacket[]>(
      'SELECT id, email, role, created_at, updated_at FROM users WHERE tenant_id = ?',
      [tenantId]
    );

    // Get devices for this tenant
    const [devices] = await pool.query<RowDataPacket[]>(
      'SELECT id, device_guid, device_name, linked_at, last_seen, created_at FROM devices WHERE tenant_id = ?',
      [tenantId]
    );

    // Get KV store stats for this tenant
    const [kvStats] = await pool.query<RowDataPacket[]>(
      'SELECT COUNT(*) as kv_count FROM kv_store WHERE tenant_id = ?',
      [tenantId]
    );

    res.json({
      tenant: tenantRows[0],
      users,
      devices,
      storage: {
        kv_entries: kvStats[0].kv_count
      }
    });
  } catch (error) {
    console.error('Error fetching tenant details:', error);
    res.status(500).json({ error: 'Failed to fetch tenant details' });
  }
});

/**
 * Get all parent users across all tenants
 * GET /api/admin/parents
 */
router.get('/parents', requireAdmin, async (req: Request, res: Response) => {
  try {
    const [parents] = await pool.query<RowDataPacket[]>(`
      SELECT 
        u.id,
        u.email,
        u.role,
        u.tenant_id,
        u.created_at,
        u.updated_at,
        t.created_at as tenant_created_at
      FROM users u
      JOIN tenants t ON u.tenant_id = t.id
      WHERE u.role = 'parent'
      ORDER BY u.created_at DESC
    `);

    res.json({ parents });
  } catch (error) {
    console.error('Error fetching parents:', error);
    res.status(500).json({ error: 'Failed to fetch parents' });
  }
});

/**
 * Remove a parent user (and their tenant if they're the last user)
 * DELETE /api/admin/parents/:userId
 */
router.delete('/parents/:userId', requireAdmin, async (req: Request, res: Response) => {
  const connection = await pool.getConnection();
  
  try {
    const { userId } = req.params;

    await connection.beginTransaction();

    // Get user and tenant info
    const [userRows] = await connection.query<RowDataPacket[]>(
      'SELECT tenant_id, role FROM users WHERE id = ?',
      [userId]
    );

    if (userRows.length === 0) {
      await connection.rollback();
      return res.status(404).json({ error: 'User not found' });
    }

    const user = userRows[0];

    // Prevent deleting admin users
    if (user.role === 'admin') {
      await connection.rollback();
      return res.status(403).json({ error: 'Cannot delete admin users' });
    }

    // Check if this is the last user in the tenant
    const [tenantUsers] = await connection.query<RowDataPacket[]>(
      'SELECT COUNT(*) as count FROM users WHERE tenant_id = ?',
      [user.tenant_id]
    );

    const isLastUser = tenantUsers[0].count === 1;

    // Delete the user
    await connection.query('DELETE FROM users WHERE id = ?', [userId]);

    // If this was the last user, the tenant will be automatically deleted due to CASCADE
    // but we can explicitly check
    if (isLastUser) {
      await connection.query('DELETE FROM tenants WHERE id = ?', [user.tenant_id]);
    }

    await connection.commit();

    res.json({ 
      success: true, 
      message: 'Parent user deleted successfully',
      tenantDeleted: isLastUser
    });
  } catch (error) {
    await connection.rollback();
    console.error('Error deleting parent:', error);
    res.status(500).json({ error: 'Failed to delete parent' });
  } finally {
    connection.release();
  }
});

/**
 * Get payment status summary (placeholder for future payment integration)
 * GET /api/admin/payments
 */
router.get('/payments', requireAdmin, async (req: Request, res: Response) => {
  try {
    // This is a placeholder endpoint for future payment integration
    // For now, return basic tenant info that could be used for billing
    const [tenants] = await pool.query<RowDataPacket[]>(`
      SELECT 
        t.id,
        t.created_at,
        COUNT(DISTINCT u.id) as user_count,
        COUNT(DISTINCT d.id) as device_count
      FROM tenants t
      LEFT JOIN users u ON t.id = u.tenant_id
      LEFT JOIN devices d ON t.id = d.tenant_id AND d.linked_at IS NOT NULL
      GROUP BY t.id, t.created_at
      ORDER BY t.created_at DESC
    `);

    // Placeholder payment status
    const paymentSummary = tenants.map((tenant: any) => ({
      tenantId: tenant.id,
      status: 'active', // Placeholder - would come from payment provider
      billingDate: tenant.created_at,
      users: tenant.user_count,
      devices: tenant.device_count,
      plan: 'free', // Placeholder
      nextBillingDate: null, // Placeholder
      amount: 0 // Placeholder
    }));

    res.json({ 
      payments: paymentSummary,
      note: 'This is a placeholder endpoint. Payment integration not yet implemented.'
    });
  } catch (error) {
    console.error('Error fetching payment status:', error);
    res.status(500).json({ error: 'Failed to fetch payment status' });
  }
});

/**
 * Get platform statistics
 * GET /api/admin/stats
 */
router.get('/stats', requireAdmin, async (req: Request, res: Response) => {
  try {
    // Get total counts
    const [tenantCount] = await pool.query<RowDataPacket[]>(
      'SELECT COUNT(*) as count FROM tenants'
    );
    
    const [userCount] = await pool.query<RowDataPacket[]>(
      'SELECT COUNT(*) as count FROM users WHERE role = "parent"'
    );
    
    const [deviceCount] = await pool.query<RowDataPacket[]>(
      'SELECT COUNT(*) as count FROM devices WHERE linked_at IS NOT NULL'
    );

    // Get recent signups (last 30 days)
    const [recentSignups] = await pool.query<RowDataPacket[]>(`
      SELECT COUNT(*) as count 
      FROM tenants 
      WHERE created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
    `);

    // Get active tenants (with recent activity - linked devices)
    const [activetenants] = await pool.query<RowDataPacket[]>(`
      SELECT COUNT(DISTINCT tenant_id) as count 
      FROM devices 
      WHERE last_seen >= DATE_SUB(NOW(), INTERVAL 7 DAY)
    `);

    res.json({
      totalTenants: tenantCount[0].count,
      totalParents: userCount[0].count,
      totalDevices: deviceCount[0].count,
      recentSignups: recentSignups[0].count,
      activeTenants: activetenants[0].count
    });
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({ error: 'Failed to fetch statistics' });
  }
});

export default router;
