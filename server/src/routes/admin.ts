import { Router, Request, Response } from 'express';
import { pool } from '../config/database.js';
import type { RowDataPacket, ResultSetHeader } from 'mysql2';
import { requireAdmin } from '../middleware/adminAuth.js';
import { getAllTenantData, getTenantData } from '../services/tenant-data-store.js';
import {
  applyFreePlanDeactivations,
  getTenantSubscription,
  getSubscriptionPlan,
  reactivatePlanItems,
  syncTenantSubscription,
} from '../services/subscription.js';
import {
  clearGlobalPricePerChild,
  clearTenantPricePerChild,
  getPricingOverview,
  upsertGlobalPricePerChild,
  upsertTenantPricePerChild,
} from '../services/subscription-pricing.js';
import { v4 as uuidv4 } from 'uuid';
import jwt from 'jsonwebtoken';
import fs from 'fs/promises';
import path from 'path';

const router = Router();
const WALLPAPER_UPLOADS_DIR = path.join(process.cwd(), 'uploads', 'wallpapers');
const WALLPAPER_MAX_BYTES = 9 * 1024 * 1024;
const wallpaperMimeExtensions: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'image/gif': '.gif',
  'video/mp4': '.mp4',
  'video/webm': '.webm',
  'video/quicktime': '.mov',
};

const ensureWallpaperUploadsDir = async () => {
  await fs.mkdir(WALLPAPER_UPLOADS_DIR, { recursive: true });
};

const extractBase64 = (payload: string) => {
  if (payload.includes('base64,')) {
    return payload.split('base64,')[1];
  }
  return payload;
};

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
      'SELECT COUNT(*) as count FROM users WHERE role = ?',
      ['parent']
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
    const [activeTenants] = await pool.query<RowDataPacket[]>(`
      SELECT COUNT(DISTINCT tenant_id) as count 
      FROM devices 
      WHERE last_seen >= DATE_SUB(NOW(), INTERVAL 7 DAY)
    `);

    res.json({
      totalTenants: tenantCount[0].count,
      totalParents: userCount[0].count,
      totalDevices: deviceCount[0].count,
      recentSignups: recentSignups[0].count,
      activeTenants: activeTenants[0].count
    });
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({ error: 'Failed to fetch statistics' });
  }
});

/**
 * Get subscription details for a specific tenant
 * GET /api/admin/subscriptions/:tenantId
 */
router.get('/subscriptions/:tenantId', requireAdmin, async (req: Request, res: Response) => {
  try {
    const { tenantId } = req.params;

    // Check if tenant exists
    const [tenantRows] = await pool.query<RowDataPacket[]>(
      'SELECT id FROM tenants WHERE id = ?',
      [tenantId]
    );

    if (tenantRows.length === 0) {
      return res.status(404).json({ error: 'Tenant not found' });
    }

    // Get subscription details
    const subscription = await getTenantSubscription(tenantId);

    if (!subscription) {
      return res.status(404).json({ error: 'No subscription found for this tenant' });
    }

    res.json({
      subscription
    });
  } catch (error) {
    console.error('Error fetching tenant subscription:', error);
    res.status(500).json({ error: 'Failed to fetch tenant subscription' });
  }
});

/**
 * Update subscription plan for a tenant (admin only)
 * PUT /api/admin/subscriptions/:tenantId
 * Body: { planId: string }
 */
router.put('/subscriptions/:tenantId', requireAdmin, async (req: Request, res: Response) => {
  const connection = await pool.getConnection();
  
  try {
    const { tenantId } = req.params;
    const { planId } = req.body;

    if (!planId) {
      return res.status(400).json({ error: 'planId is required' });
    }

    // Validate plan exists
    const plan = await getSubscriptionPlan(planId);
    if (!plan) {
      return res.status(400).json({ error: 'Invalid plan ID' });
    }

    await connection.beginTransaction();

    // Check if tenant exists
    const [tenantRows] = await connection.query<RowDataPacket[]>(
      'SELECT id FROM tenants WHERE id = ?',
      [tenantId]
    );

    if (tenantRows.length === 0) {
      await connection.rollback();
      return res.status(404).json({ error: 'Tenant not found' });
    }

    // Get existing subscription
    const [existingSubRows] = await connection.query<RowDataPacket[]>(
      'SELECT id, plan_id FROM subscriptions WHERE tenant_id = ? ORDER BY created_at DESC LIMIT 1',
      [tenantId]
    );
    const previousPlanId = existingSubRows[0]?.plan_id ?? null;

    const now = Date.now();
    const oneYearFromNow = now + (365 * 24 * 60 * 60 * 1000);

    if (existingSubRows.length > 0) {
      // Update existing subscription
      await connection.query<ResultSetHeader>(
        `UPDATE subscriptions 
         SET plan_id = ?, 
             status = 'active',
             current_period_start = ?,
             current_period_end = ?,
             cancel_at_period_end = FALSE,
             canceled_at = NULL,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
        [planId, now, oneYearFromNow, existingSubRows[0].id]
      );
    } else {
      // Create new subscription
      const subscriptionId = uuidv4();
      await connection.query<ResultSetHeader>(
        `INSERT INTO subscriptions 
         (id, tenant_id, plan_id, status, current_period_start, current_period_end, cancel_at_period_end)
         VALUES (?, ?, ?, 'active', ?, ?, FALSE)`,
        [subscriptionId, tenantId, planId, now, oneYearFromNow]
      );
    }

    await connection.commit();

    if (previousPlanId && previousPlanId !== planId) {
      if (planId === 'plan_free') {
        await applyFreePlanDeactivations(tenantId);
      }
      if (planId === 'plan_paid') {
        await reactivatePlanItems(tenantId);
      }
    }

    // Fetch and return updated subscription
    const updatedSubscription = await getTenantSubscription(tenantId);

    res.json({
      success: true,
      message: `Subscription updated to ${plan.name} plan`,
      subscription: updatedSubscription
    });
  } catch (error) {
    await connection.rollback();
    console.error('Error updating tenant subscription:', error);
    res.status(500).json({ error: 'Failed to update tenant subscription' });
  } finally {
    connection.release();
  }
});

/**
 * Refresh subscription status for a specific tenant via Stripe
 * POST /api/admin/subscriptions/:tenantId/refresh
 */
router.post('/subscriptions/:tenantId/refresh', requireAdmin, async (req: Request, res: Response) => {
  try {
    const { tenantId } = req.params;

    const [tenantRows] = await pool.query<RowDataPacket[]>(
      'SELECT id FROM tenants WHERE id = ?',
      [tenantId]
    );

    if (tenantRows.length === 0) {
      return res.status(404).json({ error: 'Tenant not found' });
    }

    const subscription = await syncTenantSubscription(tenantId);

    if (!subscription) {
      return res.status(404).json({ error: 'No subscription found for this tenant' });
    }

    res.json({ subscription });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to refresh tenant subscription';
    console.error('Error refreshing tenant subscription:', message);
    if (message === 'Stripe is not configured') {
      return res.status(503).json({ error: message });
    }
    res.status(500).json({ error: 'Failed to refresh tenant subscription' });
  }
});

/**
 * Get KV store data for a specific tenant (read-only, admin access)
 * GET /api/admin/tenants/:tenantId/kv/:key
 */
router.get('/tenants/:tenantId/kv/:key', requireAdmin, async (req: Request, res: Response) => {
  try {
    const { tenantId, key } = req.params;

    // Verify tenant exists
    const [tenantRows] = await pool.query<RowDataPacket[]>(
      'SELECT id FROM tenants WHERE id = ?',
      [tenantId]
    );

    if (tenantRows.length === 0) {
      return res.status(404).json({ error: 'Tenant not found' });
    }

    const parsedValue = await getTenantData(key, tenantId);
    res.json({ value: parsedValue });
  } catch (error) {
    console.error('Error fetching tenant KV data:', error);
    res.status(500).json({ error: 'Failed to fetch tenant data' });
  }
});

/**
 * Get all KV store data for a specific tenant (read-only, admin access)
 * GET /api/admin/tenants/:tenantId/kv
 */
router.get('/tenants/:tenantId/kv', requireAdmin, async (req: Request, res: Response) => {
  try {
    const { tenantId } = req.params;

    // Verify tenant exists
    const [tenantRows] = await pool.query<RowDataPacket[]>(
      'SELECT id FROM tenants WHERE id = ?',
      [tenantId]
    );

    if (tenantRows.length === 0) {
      return res.status(404).json({ error: 'Tenant not found' });
    }

    const data = await getAllTenantData(tenantId);
    res.json(data);
  } catch (error) {
    console.error('Error fetching all tenant KV data:', error);
    res.status(500).json({ error: 'Failed to fetch tenant data' });
  }
});

/**
 * Generate a view-only token for a specific tenant (admin only)
 * POST /api/admin/tenants/:tenantId/view-token
 * Returns a temporary token that allows viewing tenant data in read-only mode
 */
router.post('/tenants/:tenantId/view-token', requireAdmin, async (req: Request, res: Response) => {
  try {
    const { tenantId } = req.params;

    // Verify tenant exists
    const [tenantRows] = await pool.query<RowDataPacket[]>(
      'SELECT id FROM tenants WHERE id = ?',
      [tenantId]
    );

    if (tenantRows.length === 0) {
      return res.status(404).json({ error: 'Tenant not found' });
    }

    // Get admin user info from request (set by requireAdmin middleware)
    const adminUserId = req.userId;
    const adminEmail = req.userEmail;

    if (!adminUserId || !adminEmail) {
      return res.status(500).json({ error: 'Admin user info not found' });
    }

    // Generate a short-lived view-only token (1 hour expiry)
    const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
    const viewToken = jwt.sign(
      {
        userId: adminUserId,
        tenantId: tenantId,
        email: adminEmail,
        role: 'admin',
        viewOnly: true,
        viewingTenantId: tenantId
      },
      JWT_SECRET,
      { expiresIn: '1h' }
    );

    res.json({ 
      token: viewToken,
      expiresIn: 3600,
      tenantId: tenantId
    });
  } catch (error) {
    console.error('Error generating view token:', error);
    res.status(500).json({ error: 'Failed to generate view token' });
  }
});

/**
 * Get subscription pricing settings
 * GET /api/admin/subscription-pricing
 */
router.get('/subscription-pricing', requireAdmin, async (_req: Request, res: Response) => {
  try {
    const pricing = await getPricingOverview();
    res.json(pricing);
  } catch (error) {
    console.error('Error fetching subscription pricing:', error);
    res.status(500).json({ error: 'Failed to fetch subscription pricing' });
  }
});

/**
 * Update global subscription price per child
 * PUT /api/admin/subscription-pricing/global
 * Body: { pricePerChildAUD: number | null }
 */
router.put('/subscription-pricing/global', requireAdmin, async (req: Request, res: Response) => {
  try {
    const { pricePerChildAUD } = req.body;

    if (pricePerChildAUD === null || pricePerChildAUD === undefined || pricePerChildAUD === '') {
      await clearGlobalPricePerChild();
      return res.json({ success: true, message: 'Global pricing cleared' });
    }

    const parsedPrice = Number(pricePerChildAUD);
    if (Number.isNaN(parsedPrice) || parsedPrice < 0) {
      return res.status(400).json({ error: 'Invalid price per child value' });
    }

    await upsertGlobalPricePerChild(parsedPrice);
    res.json({ success: true, message: 'Global pricing updated' });
  } catch (error) {
    console.error('Error updating global pricing:', error);
    res.status(500).json({ error: 'Failed to update global pricing' });
  }
});

/**
 * Update tenant subscription price per child
 * PUT /api/admin/subscription-pricing/tenant/:tenantId
 * Body: { pricePerChildAUD: number | null }
 */
router.put('/subscription-pricing/tenant/:tenantId', requireAdmin, async (req: Request, res: Response) => {
  try {
    const { tenantId } = req.params;
    const { pricePerChildAUD } = req.body;

    const [tenantRows] = await pool.query<RowDataPacket[]>(
      'SELECT id FROM tenants WHERE id = ?',
      [tenantId]
    );

    if (tenantRows.length === 0) {
      return res.status(404).json({ error: 'Tenant not found' });
    }

    if (pricePerChildAUD === null || pricePerChildAUD === undefined || pricePerChildAUD === '') {
      await clearTenantPricePerChild(tenantId);
      return res.json({ success: true, message: 'Tenant pricing cleared' });
    }

    const parsedPrice = Number(pricePerChildAUD);
    if (Number.isNaN(parsedPrice) || parsedPrice < 0) {
      return res.status(400).json({ error: 'Invalid price per child value' });
    }

    await upsertTenantPricePerChild(tenantId, parsedPrice);
    res.json({ success: true, message: 'Tenant pricing updated' });
  } catch (error) {
    console.error('Error updating tenant pricing:', error);
    res.status(500).json({ error: 'Failed to update tenant pricing' });
  }
});

/**
 * Get admin wallpaper gallery
 * GET /api/admin/wallpapers
 */
router.get('/wallpapers', requireAdmin, async (_req: Request, res: Response) => {
  try {
    const [rows] = await pool.query<RowDataPacket[]>(`
      SELECT id, original_name, file_type, mime_type, file_path, created_at
      FROM wallpaper_assets
      ORDER BY created_at DESC
    `);

    const wallpapers = rows.map((row) => ({
      id: row.id,
      name: row.original_name,
      fileType: row.file_type,
      mimeType: row.mime_type,
      url: `/uploads/${row.file_path}`,
      createdAt: row.created_at,
    }));

    res.json({ wallpapers });
  } catch (error) {
    console.error('Error fetching admin wallpapers:', error);
    res.status(500).json({ error: 'Failed to fetch wallpapers' });
  }
});

/**
 * Upload a wallpaper asset
 * POST /api/admin/wallpapers
 * Body: { fileName: string, mimeType: string, dataUrl: string }
 */
router.post('/wallpapers', requireAdmin, async (req: Request, res: Response) => {
  try {
    const { fileName, mimeType, dataUrl } = req.body as {
      fileName?: string;
      mimeType?: string;
      dataUrl?: string;
    };

    if (!fileName || !mimeType || !dataUrl) {
      return res.status(400).json({ error: 'Missing upload payload' });
    }

    const fileType = mimeType.startsWith('image/')
      ? 'image'
      : mimeType.startsWith('video/')
        ? 'video'
        : null;

    if (!fileType) {
      return res.status(400).json({ error: 'Unsupported file type' });
    }

    const base64 = extractBase64(dataUrl);
    const buffer = Buffer.from(base64, 'base64');

    if (!buffer.length) {
      return res.status(400).json({ error: 'Upload payload is empty' });
    }

    if (buffer.length > WALLPAPER_MAX_BYTES) {
      return res.status(413).json({ error: 'File exceeds upload limit' });
    }

    await ensureWallpaperUploadsDir();

    const extension = wallpaperMimeExtensions[mimeType] || path.extname(fileName) || '';
    const id = uuidv4();
    const storedName = `${id}${extension}`;
    const relativePath = `wallpapers/${storedName}`;
    const absolutePath = path.join(WALLPAPER_UPLOADS_DIR, storedName);

    await fs.writeFile(absolutePath, buffer);

    await pool.query<ResultSetHeader>(
      `INSERT INTO wallpaper_assets (id, original_name, file_type, mime_type, file_path)
       VALUES (?, ?, ?, ?, ?)`,
      [id, fileName, fileType, mimeType, relativePath]
    );

    res.status(201).json({
      wallpaper: {
        id,
        name: fileName,
        fileType,
        mimeType,
        url: `/uploads/${relativePath}`,
        createdAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error('Error uploading wallpaper asset:', error);
    res.status(500).json({ error: 'Failed to upload wallpaper' });
  }
});

/**
 * Delete a wallpaper asset
 * DELETE /api/admin/wallpapers/:wallpaperId
 */
router.delete('/wallpapers/:wallpaperId', requireAdmin, async (req: Request, res: Response) => {
  try {
    const { wallpaperId } = req.params;

    const [rows] = await pool.query<RowDataPacket[]>(
      'SELECT file_path FROM wallpaper_assets WHERE id = ?',
      [wallpaperId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Wallpaper not found' });
    }

    const filePath = path.join(process.cwd(), 'uploads', rows[0].file_path);

    await pool.query<ResultSetHeader>(
      'DELETE FROM wallpaper_assets WHERE id = ?',
      [wallpaperId]
    );

    try {
      await fs.unlink(filePath);
    } catch (error) {
      console.warn('Failed to remove wallpaper file:', error);
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting wallpaper asset:', error);
    res.status(500).json({ error: 'Failed to delete wallpaper' });
  }
});

export default router;
