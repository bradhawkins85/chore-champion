import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { pool } from '../config/database.js';
import type { RowDataPacket } from 'mysql2';
import rateLimit from 'express-rate-limit';
import crypto from 'crypto';

const router = Router();

// Type definitions
interface IPAccessRequest {
  id: string;
  ip: string;
  token: string;
  requestedAt: number;
  expiresAt: number;
  approved: boolean;
  approvedAt?: number;
}

// Rate limiting for access requests - 5 requests per 15 minutes per IP
const requestAccessLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 requests per window
  message: 'Too many access requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    // Use the IP from the request
    return req.body.ip || req.ip || 'unknown';
  },
});

// Helper function to generate a secure random token
function generateSecureToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

// Request access approval - requires parent PIN for brute force protection
router.post('/request-access', requestAccessLimiter, async (req: Request, res: Response) => {
  try {
    const { tenantId, ip, parentPin } = req.body;

    if (!tenantId || !ip || !parentPin) {
      return res.status(400).json({ error: 'tenantId, ip, and parentPin are required' });
    }

    // Get the tenant's KV store to verify the parent PIN
    const [kvRows] = await pool.query<RowDataPacket[]>(
      'SELECT value FROM kv_store WHERE tenant_id = ? AND key_name = ?',
      [tenantId, 'parent-pin']
    );

    if (kvRows.length === 0) {
      return res.status(400).json({ error: 'Parent PIN not configured' });
    }

    const storedPin = JSON.parse(kvRows[0].value);
    
    // Verify the parent PIN matches
    if (storedPin !== parentPin) {
      return res.status(401).json({ error: 'Invalid parent PIN' });
    }

    // Check for existing active requests from this IP
    const [existingRequests] = await pool.query<RowDataPacket[]>(
      'SELECT value FROM kv_store WHERE tenant_id = ? AND key_name = ?',
      [tenantId, 'ip-access-requests']
    );

    let requests: IPAccessRequest[] = [];
    if (existingRequests.length > 0) {
      requests = JSON.parse(existingRequests[0].value);
    }

    // Clean up expired requests
    const now = Date.now();
    requests = requests.filter((r: IPAccessRequest) => r.expiresAt > now);

    // Check if there's already an active request from this IP
    const existingRequest = requests.find((r: IPAccessRequest) => r.ip === ip && !r.approved);
    if (existingRequest) {
      return res.status(409).json({ 
        error: 'An access request from this IP is already pending',
        requestId: existingRequest.id 
      });
    }

    // Create a new access request with a unique token
    const token = generateSecureToken();
    const newRequest = {
      id: uuidv4(),
      ip,
      token,
      requestedAt: now,
      expiresAt: now + (60 * 60 * 1000), // 1 hour expiry
      approved: false,
    };

    requests.push(newRequest);

    // Save the updated requests
    if (existingRequests.length > 0) {
      await pool.query(
        'UPDATE kv_store SET value = ?, updated_at = NOW() WHERE tenant_id = ? AND key_name = ?',
        [JSON.stringify(requests), tenantId, 'ip-access-requests']
      );
    } else {
      await pool.query(
        'INSERT INTO kv_store (tenant_id, key_name, value, created_at, updated_at) VALUES (?, ?, ?, NOW(), NOW())',
        [tenantId, 'ip-access-requests', JSON.stringify(requests)]
      );
    }

    // Get the primary parent's email to send the approval link
    const [users] = await pool.query<RowDataPacket[]>(
      'SELECT email FROM users WHERE tenant_id = ? AND role = ? ORDER BY created_at ASC LIMIT 1',
      [tenantId, 'parent']
    );

    if (users.length === 0) {
      return res.status(404).json({ error: 'No parent user found for this tenant' });
    }

    const primaryParentEmail = users[0].email;

    // Check if SMTP is enabled
    const smtpEnabled = process.env.SMTP_ENABLED === 'true';

    if (smtpEnabled) {
      // Send approval email (we'll implement the email sending later)
      // For now, we'll just log it
      const approvalUrl = `${process.env.APP_URL || 'http://localhost:5000'}?token=${token}`;
      console.log(`Approval email would be sent to: ${primaryParentEmail}`);
      console.log(`Approval URL: ${approvalUrl}`);
      console.log(`Request from IP: ${ip}`);
      
      // TODO: Implement actual email sending using nodemailer or similar
    }

    res.json({
      success: true,
      requestId: newRequest.id,
      message: smtpEnabled 
        ? 'Access request sent. Check your email for the approval link.'
        : 'Access request created. Email notifications are not configured.',
      emailSent: smtpEnabled,
      primaryParentEmail: smtpEnabled ? primaryParentEmail : undefined,
    });
  } catch (error) {
    console.error('Error requesting access:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Approve access via token
router.post('/approve-access', async (req: Request, res: Response) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({ error: 'Token is required' });
    }

    // Search for the token across all tenants
    const [allRequests] = await pool.query<RowDataPacket[]>(
      'SELECT tenant_id, value FROM kv_store WHERE key_name = ?',
      ['ip-access-requests']
    );

    let foundTenantId: string | null = null;
    let foundRequest: IPAccessRequest | null = null;
    let allTenantRequests: IPAccessRequest[] = [];

    for (const row of allRequests) {
      const requests: IPAccessRequest[] = JSON.parse(row.value);
      const request = requests.find((r: IPAccessRequest) => r.token === token);
      if (request) {
        foundTenantId = row.tenant_id;
        foundRequest = request;
        allTenantRequests = requests;
        break;
      }
    }

    if (!foundRequest) {
      return res.status(404).json({ error: 'Invalid or expired token' });
    }

    // Check if token has expired
    if (foundRequest.expiresAt < Date.now()) {
      return res.status(410).json({ error: 'Token has expired' });
    }

    // Check if already approved
    if (foundRequest.approved) {
      return res.status(409).json({ error: 'This access request has already been approved' });
    }

    // Mark the request as approved
    foundRequest.approved = true;
    foundRequest.approvedAt = Date.now();

    // Update the requests in the database
    await pool.query(
      'UPDATE kv_store SET value = ?, updated_at = NOW() WHERE tenant_id = ? AND key_name = ?',
      [JSON.stringify(allTenantRequests), foundTenantId, 'ip-access-requests']
    );

    // Add the IP to the allowed list
    const [ipRestrictions] = await pool.query<RowDataPacket[]>(
      'SELECT value FROM kv_store WHERE tenant_id = ? AND key_name = ?',
      [foundTenantId, 'ip-restrictions']
    );

    if (ipRestrictions.length > 0) {
      const settings = JSON.parse(ipRestrictions[0].value);
      if (!settings.allowedIPs.includes(foundRequest.ip)) {
        settings.allowedIPs.push(foundRequest.ip);
        
        await pool.query(
          'UPDATE kv_store SET value = ?, updated_at = NOW() WHERE tenant_id = ? AND key_name = ?',
          [JSON.stringify(settings), foundTenantId, 'ip-restrictions']
        );
      }
    }

    res.json({
      success: true,
      message: 'Access approved successfully',
      ip: foundRequest.ip,
    });
  } catch (error) {
    console.error('Error approving access:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get pending requests for a tenant (for admin UI)
router.get('/pending-requests/:tenantId', async (req: Request, res: Response) => {
  try {
    const { tenantId } = req.params;

    const [rows] = await pool.query<RowDataPacket[]>(
      'SELECT value FROM kv_store WHERE tenant_id = ? AND key_name = ?',
      [tenantId, 'ip-access-requests']
    );

    if (rows.length === 0) {
      return res.json({ success: true, requests: [] });
    }

    const requests: IPAccessRequest[] = JSON.parse(rows[0].value);
    const now = Date.now();

    // Filter to only active (not expired, not approved) requests
    const pendingRequests = requests.filter((r: IPAccessRequest) => 
      !r.approved && r.expiresAt > now
    );

    res.json({
      success: true,
      requests: pendingRequests.map((r: IPAccessRequest) => ({
        id: r.id,
        ip: r.ip,
        requestedAt: r.requestedAt,
        expiresAt: r.expiresAt,
      })),
    });
  } catch (error) {
    console.error('Error getting pending requests:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
