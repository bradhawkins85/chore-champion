import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import jwt from 'jsonwebtoken';
import { pool } from '../config/database.js';
import type { RowDataPacket, ResultSetHeader } from 'mysql2';

const router = Router();

// Type definitions
interface Device {
  id: string;
  device_guid: string;
  device_name: string | null;
  device_info: DeviceInfo;
  allowed_children_ids: string[] | null;
  tenant_id: string | null;
  linked_at: Date | null;
  last_seen: Date;
  created_at: Date;
  updated_at: Date;
}

interface LinkingCode {
  code: string;
  tenant_id: string;
  device_id: string | null;
  expires_at: Date;
  created_at: Date;
  used_at: Date | null;
}

interface DeviceInfo {
  userAgent: string;
  platform: string;
  mobile: boolean;
  ip?: string;
  timestamp: string;
}

interface JWTPayload {
  userId: string;
  tenantId: string;
  email: string;
}

// Helper function to generate a random 6-character alphanumeric code
function generateLinkingCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

// Helper function to get device info from user agent and other headers
function getDeviceInfo(req: Request): DeviceInfo {
  const platform = req.headers['sec-ch-ua-platform'];
  
  // Get real client IP from X-Forwarded-For header
  // nginx sets X-Forwarded-For: $proxy_add_x_forwarded_for (nginx.conf line 36)
  // When behind nginx, this header contains: "real-client-ip, proxy-ips..."
  // We want the leftmost IP which is the original client
  let clientIp = req.ip || req.socket.remoteAddress || 'unknown';
  
  const forwardedFor = req.headers['x-forwarded-for'];
  if (forwardedFor) {
    // Extract the first IP from X-Forwarded-For header (the real client)
    const firstIp = (typeof forwardedFor === 'string' ? forwardedFor : forwardedFor[0])
      ?.split(',')[0]
      ?.trim();
    
    if (firstIp) {
      clientIp = firstIp;
    }
  }
  
  return {
    userAgent: req.headers['user-agent'] || 'Unknown',
    platform: typeof platform === 'string' ? platform : 'Unknown',
    mobile: req.headers['sec-ch-ua-mobile'] === '?1',
    ip: clientIp,
    timestamp: new Date().toISOString(),
  };
}

// Register or get existing device
// POST /api/devices/register
// Body: { deviceGuid: string }
// Returns: { deviceId, deviceGuid, isLinked, tenantId? }
router.post('/register', async (req: Request, res: Response) => {
  try {
    const { deviceGuid } = req.body;

    if (!deviceGuid) {
      return res.status(400).json({ error: 'deviceGuid is required' });
    }

    const deviceInfo = getDeviceInfo(req);
    const connection = await pool.getConnection();

    try {
      // Check if device exists
      const [devices] = await connection.query<RowDataPacket[]>(
        'SELECT * FROM devices WHERE device_guid = ?',
        [deviceGuid]
      );

      if (devices.length > 0) {
        const device = devices[0] as Device;
        
        // Update last_seen and device_info
        await connection.query(
          'UPDATE devices SET device_info = ?, last_seen = NOW() WHERE device_guid = ?',
          [JSON.stringify(deviceInfo), deviceGuid]
        );

        return res.json({
          deviceId: device.id,
          deviceGuid: device.device_guid,
          isLinked: !!device.tenant_id,
          tenantId: device.tenant_id,
        });
      }

      // Create new device
      const deviceId = uuidv4();
      await connection.query(
        'INSERT INTO devices (id, device_guid, device_info) VALUES (?, ?, ?)',
        [deviceId, deviceGuid, JSON.stringify(deviceInfo)]
      );

      res.status(201).json({
        deviceId,
        deviceGuid,
        isLinked: false,
        tenantId: null,
      });
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('Error registering device:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Generate a linking code for a tenant (requires authentication)
// POST /api/devices/generate-link-code
// Headers: Authorization: Bearer <token>
// Returns: { code, expiresAt }
router.post('/generate-link-code', async (req: Request, res: Response) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' });
    }

    // Get tenant ID from request (set by auth middleware if we add it, or extract from token)
    // For now, we'll extract it from the token
    const token = authHeader.substring(7);
    const SECRET = process.env.JWT_SECRET || 'dev-secret-change-in-production';
    
    let decoded: JWTPayload;
    try {
      decoded = jwt.verify(token, SECRET) as JWTPayload;
    } catch (error) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    const tenantId = decoded.tenantId;
    const connection = await pool.getConnection();

    try {
      await connection.beginTransaction();

      // Delete expired codes for this tenant
      await connection.query(
        'DELETE FROM linking_codes WHERE tenant_id = ? AND expires_at < NOW()',
        [tenantId]
      );

      // Check if there's an active unused code for this tenant
      const [existingCodes] = await connection.query<RowDataPacket[]>(
        'SELECT code, expires_at FROM linking_codes WHERE tenant_id = ? AND used_at IS NULL AND expires_at > NOW() ORDER BY created_at DESC LIMIT 1',
        [tenantId]
      );

      if (existingCodes.length > 0) {
        await connection.commit();
        const existingCode = existingCodes[0];
        return res.json({
          code: existingCode.code,
          expiresAt: existingCode.expires_at,
        });
      }

      // Generate a unique code
      let code = '';
      let isUnique = false;
      let attempts = 0;
      const maxAttempts = 10;

      while (!isUnique && attempts < maxAttempts) {
        code = generateLinkingCode();
        const [existingCode] = await connection.query<RowDataPacket[]>(
          'SELECT code FROM linking_codes WHERE code = ? AND expires_at > NOW()',
          [code]
        );
        if (existingCode.length === 0) {
          isUnique = true;
        }
        attempts++;
      }

      if (!isUnique || !code) {
        await connection.rollback();
        return res.status(500).json({ error: 'Failed to generate unique code' });
      }

      // Code expires in 10 minutes
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

      await connection.query(
        'INSERT INTO linking_codes (code, tenant_id, expires_at) VALUES (?, ?, ?)',
        [code, tenantId, expiresAt]
      );

      await connection.commit();

      res.json({
        code,
        expiresAt,
      });
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('Error generating linking code:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Link a device to a tenant using a linking code
// POST /api/devices/link
// Body: { deviceGuid: string, linkingCode: string, deviceName?: string }
// Returns: { success: true, tenantId, deviceId }
router.post('/link', async (req: Request, res: Response) => {
  try {
    const { deviceGuid, linkingCode, deviceName } = req.body;

    if (!deviceGuid || !linkingCode) {
      return res.status(400).json({ error: 'deviceGuid and linkingCode are required' });
    }

    const code = linkingCode.toUpperCase();
    const connection = await pool.getConnection();

    try {
      await connection.beginTransaction();

      // Find the device
      const [devices] = await connection.query<RowDataPacket[]>(
        'SELECT * FROM devices WHERE device_guid = ?',
        [deviceGuid]
      );

      if (devices.length === 0) {
        await connection.rollback();
        return res.status(404).json({ error: 'Device not found' });
      }

      const device = devices[0] as Device;

      // Find the linking code
      const [codes] = await connection.query<RowDataPacket[]>(
        'SELECT * FROM linking_codes WHERE code = ? AND used_at IS NULL AND expires_at > NOW()',
        [code]
      );

      if (codes.length === 0) {
        await connection.rollback();
        return res.status(404).json({ error: 'Invalid or expired linking code' });
      }

      const linkingCodeData = codes[0] as LinkingCode;

      // Link the device to the tenant and optionally set the device name
      console.log(`[DEBUG] Linking device ${device.id} to tenant ${linkingCodeData.tenant_id}`);
      await connection.query(
        'UPDATE devices SET tenant_id = ?, linked_at = NOW(), device_name = ? WHERE id = ?',
        [linkingCodeData.tenant_id, deviceName || null, device.id]
      );

      // Verify the update worked
      const [updated] = await connection.query(
        'SELECT tenant_id FROM devices WHERE id = ?',
        [device.id]
      );
      console.log(`[DEBUG] Device ${device.id} after linking - tenant_id: ${updated[0]?.tenant_id}`);

      // Mark the code as used
      await connection.query(
        'UPDATE linking_codes SET used_at = NOW(), device_id = ? WHERE code = ?',
        [device.id, code]
      );

      await connection.commit();

      res.json({
        success: true,
        tenantId: linkingCodeData.tenant_id,
        deviceId: device.id,
      });
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('Error linking device:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get all devices linked to the authenticated user's tenant
// GET /api/devices
// Headers: Authorization: Bearer <token>
// Returns: { devices: Device[] }
router.get('/', async (req: Request, res: Response) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const token = authHeader.substring(7);
    const SECRET = process.env.JWT_SECRET || 'dev-secret-change-in-production';
    
    let decoded: JWTPayload;
    try {
      decoded = jwt.verify(token, SECRET) as JWTPayload;
    } catch (error) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    const tenantId = decoded.tenantId;

    const [devices] = await pool.query<RowDataPacket[]>(
      'SELECT id, device_guid, device_name, device_info, allowed_children_ids, linked_at, last_seen, created_at FROM devices WHERE tenant_id = ? ORDER BY last_seen DESC',
      [tenantId]
    );

    console.log(`[DEBUG] GET /api/devices - tenantId: ${tenantId}, found ${devices.length} devices`);

    res.json({
      devices: devices.map(d => ({
        id: d.id,
        deviceGuid: d.device_guid,
        deviceName: d.device_name,
        deviceInfo: (() => {
          if (typeof d.device_info === 'string') {
            try {
              return JSON.parse(d.device_info);
            } catch (e) {
              console.error(`[ERROR] Failed to parse device_info for device ${d.id}:`, e);
              return {};
            }
          }
          return d.device_info || {};
        })(),
        allowedChildrenIds: (() => {
          if (typeof d.allowed_children_ids === 'string') {
            try {
              const parsed = JSON.parse(d.allowed_children_ids);
              return Array.isArray(parsed) ? parsed : [];
            } catch {
              return [];
            }
          }
          return Array.isArray(d.allowed_children_ids) ? d.allowed_children_ids : [];
        })(),
        linkedAt: d.linked_at,
        lastSeen: d.last_seen,
        createdAt: d.created_at,
      })),
    });
  } catch (error) {
    console.error('Error getting devices:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update device name
// PATCH /api/devices/:deviceId
// Headers: Authorization: Bearer <token>
// Body: { deviceName?: string, allowedChildrenIds?: string[] }
// Returns: { success: true }
router.patch('/:deviceId', async (req: Request, res: Response) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const token = authHeader.substring(7);
    const SECRET = process.env.JWT_SECRET || 'dev-secret-change-in-production';
    
    let decoded: JWTPayload;
    try {
      decoded = jwt.verify(token, SECRET) as JWTPayload;
    } catch (error) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    const tenantId = decoded.tenantId;
    const { deviceId } = req.params;
    const { deviceName, allowedChildrenIds } = req.body;

    if (!('deviceName' in req.body) && !('allowedChildrenIds' in req.body)) {
      return res.status(400).json({ error: 'deviceName or allowedChildrenIds is required' });
    }

    const connection = await pool.getConnection();
    try {
      // Verify the device belongs to this tenant
      const [devices] = await connection.query<RowDataPacket[]>(
        'SELECT * FROM devices WHERE id = ? AND tenant_id = ?',
        [deviceId, tenantId]
      );

      if (devices.length === 0) {
        return res.status(404).json({ error: 'Device not found or not authorized' });
      }

      // Build update query dynamically based on provided fields
      const updates: string[] = [];
      const values: any[] = [];

      if ('deviceName' in req.body) {
        updates.push('device_name = ?');
        values.push(deviceName || null);
      }

      if ('allowedChildrenIds' in req.body) {
        updates.push('allowed_children_ids = ?');
        values.push(allowedChildrenIds ? JSON.stringify(allowedChildrenIds) : null);
      }

      if (updates.length > 0) {
        values.push(deviceId);
        await connection.query(
          `UPDATE devices SET ${updates.join(', ')} WHERE id = ?`,
          values
        );
      }

      res.json({ success: true });
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('Error updating device:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Unlink a device from a tenant
// DELETE /api/devices/:deviceId
// Headers: Authorization: Bearer <token>
// Returns: { success: true }
router.delete('/:deviceId', async (req: Request, res: Response) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const token = authHeader.substring(7);
    const SECRET = process.env.JWT_SECRET || 'dev-secret-change-in-production';
    
    let decoded: JWTPayload;
    try {
      decoded = jwt.verify(token, SECRET) as JWTPayload;
    } catch (error) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    const tenantId = decoded.tenantId;
    const { deviceId } = req.params;

    const connection = await pool.getConnection();
    try {
      // Verify the device belongs to this tenant
      const [devices] = await connection.query<RowDataPacket[]>(
        'SELECT * FROM devices WHERE id = ? AND tenant_id = ?',
        [deviceId, tenantId]
      );

      if (devices.length === 0) {
        return res.status(404).json({ error: 'Device not found or not authorized' });
      }

      // Unlink the device (set tenant_id to NULL instead of deleting)
      await connection.query(
        'UPDATE devices SET tenant_id = NULL, linked_at = NULL WHERE id = ?',
        [deviceId]
      );

      res.json({ success: true });
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('Error unlinking device:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
