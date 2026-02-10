import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { pool } from '../config/database.js';
import type { RowDataPacket } from 'mysql2';
import { getTenantData, setTenantData } from '../services/tenant-data-store.js';
import {
  approveIpAccessRequestById,
  findPendingIpAccessRequestForIp,
  getIpAccessRequestByToken,
  listPendingIpAccessRequests,
  upsertIpAccessRequest,
} from '../services/repositories/ip-access-repo.js';
import rateLimit from 'express-rate-limit';
import crypto from 'crypto';

const router = Router();

// Type definitions
interface IPAccessRequest {
  id: string;
  ip: string | null;
  token: string | null;
  requestedAt: number | null;
  expiresAt: number | null;
  approved: boolean;
  approvedAt?: number | null;
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

    const storedPin = await getTenantData('parent-pin', tenantId);

    if (!storedPin) {
      return res.status(400).json({ error: 'Parent PIN not configured' });
    }
    
    // Verify the parent PIN matches
    if (storedPin !== parentPin) {
      return res.status(401).json({ error: 'Invalid parent PIN' });
    }

    const now = Date.now();

    // Check if there's already an active request from this IP
    const existingRequest = await findPendingIpAccessRequestForIp(tenantId, ip, now);
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

    await upsertIpAccessRequest(tenantId, {
      id: newRequest.id,
      ip: newRequest.ip,
      token: newRequest.token,
      approved: newRequest.approved,
      requestedAt: newRequest.requestedAt,
      approvedAt: null,
      expiresAt: newRequest.expiresAt,
    });

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

    const foundRequest = await getIpAccessRequestByToken(token);

    if (!foundRequest) {
      return res.status(404).json({ error: 'Invalid or expired token' });
    }

    // Check if token has expired
    if (!foundRequest.expiresAt || foundRequest.expiresAt < Date.now()) {
      return res.status(410).json({ error: 'Token has expired' });
    }

    // Check if already approved
    if (foundRequest.approved) {
      return res.status(409).json({ error: 'This access request has already been approved' });
    }

    // Mark the request as approved
    const approvedAt = Date.now();
    await approveIpAccessRequestById(foundRequest.tenantId, foundRequest.id, approvedAt);

    // Add the IP to the allowed list
    const ipRestrictions = await getTenantData('ip-restrictions', foundRequest.tenantId);

    if (ipRestrictions && typeof ipRestrictions === 'object') {
      const settings = ipRestrictions as { allowedIPs?: string[] };
      settings.allowedIPs = settings.allowedIPs || [];
      if (foundRequest.ip && !settings.allowedIPs.includes(foundRequest.ip)) {
        settings.allowedIPs.push(foundRequest.ip);
        
        await setTenantData('ip-restrictions', foundRequest.tenantId, settings);
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

    const now = Date.now();
    const pendingRequests = await listPendingIpAccessRequests(tenantId, now);

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
