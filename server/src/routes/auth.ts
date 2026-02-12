import { Router, Request, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';
import { pool } from '../config/database.js';
import { emailService } from '../services/email.js';
import { createFreeSubscription } from '../services/subscription.js';
import type { RowDataPacket, ResultSetHeader } from 'mysql2';

const router = Router();

// JWT secret - must be set in production
const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET && process.env.NODE_ENV === 'production') {
  throw new Error('JWT_SECRET environment variable must be set in production');
}

// Fallback for development only
const SECRET = JWT_SECRET || 'dev-secret-change-in-production';
const SALT_ROUNDS = 10;

// Type definitions
interface User {
  id: string;
  email: string;
  password_hash: string;
  tenant_id: string;
  role: string;
}

interface AuthRequest extends Request {
  userId?: string;
  tenantId?: string;
}

// Signup - creates a new tenant and primary parent user
router.post('/signup', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }

    // Validate password strength
    if (password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters long' });
    }

    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      // Check if user already exists
      const [existingUsers] = await connection.query<RowDataPacket[]>(
        'SELECT id FROM users WHERE email = ?',
        [email.toLowerCase()]
      );

      if (existingUsers.length > 0) {
        await connection.rollback();
        return res.status(409).json({ error: 'User with this email already exists' });
      }

      // Create new tenant
      const tenantId = uuidv4();
      await connection.query(
        'INSERT INTO tenants (id) VALUES (?)',
        [tenantId]
      );

      // Hash password
      const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

      // Create user
      const userId = uuidv4();
      await connection.query(
        'INSERT INTO users (id, email, password_hash, tenant_id, role) VALUES (?, ?, ?, ?, ?)',
        [userId, email.toLowerCase(), passwordHash, tenantId, 'parent']
      );

      await connection.commit();
      
      // Create free subscription for the new tenant (outside transaction)
      try {
        await createFreeSubscription(tenantId);
      } catch (subError) {
        console.error('Failed to create free subscription:', subError);
        // Don't fail signup if subscription creation fails
      }

      // Generate JWT token
      const token = jwt.sign(
        { userId, tenantId, email: email.toLowerCase() },
        SECRET,
        { expiresIn: '30d' }
      );

      res.status(201).json({
        success: true,
        token,
        user: {
          id: userId,
          email: email.toLowerCase(),
          tenantId,
          role: 'parent'
        }
      });
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('Error during signup:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Login
router.post('/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    // Find user
    const [users] = await pool.query<RowDataPacket[]>(
      'SELECT id, email, password_hash, tenant_id, role FROM users WHERE email = ?',
      [email.toLowerCase()]
    );

    if (users.length === 0) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const user = users[0] as User;

    // Verify password
    const passwordMatch = await bcrypt.compare(password, user.password_hash);
    if (!passwordMatch) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Generate JWT token
    const token = jwt.sign(
      { userId: user.id, tenantId: user.tenant_id, email: user.email },
      SECRET,
      { expiresIn: '30d' }
    );

    res.json({
      success: true,
      token,
      user: {
        id: user.id,
        email: user.email,
        tenantId: user.tenant_id,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Error during login:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Device-based login - authenticate using a linked device
router.post('/device-login', async (req: Request, res: Response) => {
  try {
    const { deviceGuid } = req.body;

    if (!deviceGuid) {
      return res.status(400).json({ error: 'deviceGuid is required' });
    }

    // Find device and check if it's linked to a tenant
    const [devices] = await pool.query<RowDataPacket[]>(
      'SELECT id, device_guid, tenant_id FROM devices WHERE device_guid = ?',
      [deviceGuid]
    );

    if (devices.length === 0) {
      return res.status(404).json({ error: 'Device not found' });
    }

    const device = devices[0];

    if (!device.tenant_id) {
      return res.status(401).json({ error: 'Device is not linked to a tenant' });
    }

    // Get a user from the tenant, preferring a parent but falling back to admin.
    // This keeps linked-device login working for legacy tenants that no longer
    // have a parent account but still have an admin in the same tenant.
    const [users] = await pool.query<RowDataPacket[]>(
      `SELECT id, email, tenant_id, role
       FROM users
       WHERE tenant_id = ?
         AND role IN (?, ?)
       ORDER BY CASE WHEN role = ? THEN 0 ELSE 1 END, created_at ASC
       LIMIT 1`,
      [device.tenant_id, 'parent', 'admin', 'parent']
    );

    if (users.length === 0) {
      return res.status(404).json({ error: 'No eligible user found for this tenant' });
    }

    const user = users[0] as User;

    // Update device last_seen
    await pool.query(
      'UPDATE devices SET last_seen = NOW() WHERE device_guid = ?',
      [deviceGuid]
    );

    // Generate JWT token
    const token = jwt.sign(
      { userId: user.id, tenantId: user.tenant_id, email: user.email },
      SECRET,
      { expiresIn: '30d' }
    );

    res.json({
      success: true,
      token,
      user: {
        id: user.id,
        email: user.email,
        tenantId: user.tenant_id,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Error during device login:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get current user info
router.get('/me', async (req: AuthRequest, res: Response) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, SECRET) as { userId: string; tenantId: string; email: string };

    // Get user info
    const [users] = await pool.query<RowDataPacket[]>(
      'SELECT id, email, tenant_id, role FROM users WHERE id = ?',
      [decoded.userId]
    );

    if (users.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = users[0];
    res.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        tenantId: user.tenant_id,
        role: user.role
      }
    });
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      return res.status(401).json({ error: 'Invalid token' });
    }
    console.error('Error getting user info:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get all users in the same tenant (for sharing with second parent)
router.get('/tenant-users', async (req: AuthRequest, res: Response) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, SECRET) as { userId: string; tenantId: string; email: string };

    // Get all users in the tenant
    const [users] = await pool.query<RowDataPacket[]>(
      'SELECT id, email, role, created_at FROM users WHERE tenant_id = ?',
      [decoded.tenantId]
    );

    res.json({
      success: true,
      users: users.map(u => ({
        id: u.id,
        email: u.email,
        role: u.role,
        createdAt: u.created_at
      }))
    });
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      return res.status(401).json({ error: 'Invalid token' });
    }
    console.error('Error getting tenant users:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Invite second parent to tenant (sends email invitation)
router.post('/invite-parent', async (req: AuthRequest, res: Response) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, SECRET) as { userId: string; tenantId: string; email: string };

    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }

    // Check if email service is enabled
    if (!emailService.isEnabled()) {
      return res.status(503).json({ 
        error: 'Email service is not configured. Please configure SMTP settings to send invitations.' 
      });
    }

    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      // Check how many users are in the tenant
      const [tenantUsers] = await connection.query<RowDataPacket[]>(
        'SELECT COUNT(*) as count FROM users WHERE tenant_id = ?',
        [decoded.tenantId]
      );

      if (tenantUsers[0].count >= 2) {
        await connection.rollback();
        return res.status(400).json({ error: 'Maximum of 2 parents per tenant allowed' });
      }

      // Check if user already exists (either as primary account holder or invited)
      const [existingUsers] = await connection.query<RowDataPacket[]>(
        'SELECT id, tenant_id FROM users WHERE email = ?',
        [email.toLowerCase()]
      );

      if (existingUsers.length > 0) {
        await connection.rollback();
        // Check if user is already in this tenant
        if (existingUsers[0].tenant_id === decoded.tenantId) {
          return res.status(409).json({ error: 'This user is already a member of your account' });
        } else {
          return res.status(409).json({ 
            error: 'This email is already registered as a primary account holder. Parents can only be primary for one account.' 
          });
        }
      }

      // Check for existing pending invitation
      const [existingInvitations] = await connection.query<RowDataPacket[]>(
        'SELECT id FROM parent_invitations WHERE email = ? AND tenant_id = ? AND status = ? AND expires_at > NOW()',
        [email.toLowerCase(), decoded.tenantId, 'pending']
      );

      if (existingInvitations.length > 0) {
        await connection.rollback();
        return res.status(409).json({ error: 'An invitation has already been sent to this email' });
      }

      // Generate invitation token
      const invitationToken = crypto.randomBytes(32).toString('hex');
      const invitationId = uuidv4();
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7); // 7 days expiration

      // Create invitation
      await connection.query(
        'INSERT INTO parent_invitations (id, token, email, tenant_id, inviter_id, expires_at) VALUES (?, ?, ?, ?, ?, ?)',
        [invitationId, invitationToken, email.toLowerCase(), decoded.tenantId, decoded.userId, expiresAt]
      );

      await connection.commit();

      // Send invitation email
      const appUrl = process.env.APP_URL || 'http://localhost:5000';
      try {
        await emailService.sendParentInvitation(
          email.toLowerCase(),
          decoded.email,
          invitationToken,
          appUrl
        );
      } catch (emailError) {
        console.error('Error sending invitation email:', emailError);
        // Delete the invitation since email failed
        await connection.query(
          'DELETE FROM parent_invitations WHERE id = ?',
          [invitationId]
        );
        return res.status(500).json({ error: 'Failed to send invitation email. Please try again.' });
      }

      res.status(201).json({
        success: true,
        invitation: {
          id: invitationId,
          email: email.toLowerCase(),
          expiresAt,
        }
      });
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      return res.status(401).json({ error: 'Invalid token' });
    }
    console.error('Error inviting parent:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Accept parent invitation and create account
router.post('/accept-invitation', async (req: Request, res: Response) => {
  try {
    const { token, password } = req.body;

    if (!token || !password) {
      return res.status(400).json({ error: 'Token and password are required' });
    }

    // Validate password strength
    if (password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters long' });
    }

    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      // Find invitation
      const [invitations] = await connection.query<RowDataPacket[]>(
        'SELECT id, email, tenant_id, status, expires_at FROM parent_invitations WHERE token = ?',
        [token]
      );

      if (invitations.length === 0) {
        await connection.rollback();
        return res.status(404).json({ error: 'Invalid invitation token' });
      }

      const invitation = invitations[0];

      // Check if invitation is already accepted
      if (invitation.status === 'accepted') {
        await connection.rollback();
        return res.status(400).json({ error: 'This invitation has already been accepted' });
      }

      // Check if invitation is expired
      if (new Date(invitation.expires_at) < new Date()) {
        await connection.rollback();
        // Mark as expired
        await connection.query(
          'UPDATE parent_invitations SET status = ? WHERE id = ?',
          ['expired', invitation.id]
        );
        return res.status(400).json({ error: 'This invitation has expired' });
      }

      // Check if user already exists
      const [existingUsers] = await connection.query<RowDataPacket[]>(
        'SELECT id FROM users WHERE email = ?',
        [invitation.email]
      );

      if (existingUsers.length > 0) {
        await connection.rollback();
        return res.status(409).json({ error: 'User with this email already exists' });
      }

      // Check how many users are in the tenant
      const [tenantUsers] = await connection.query<RowDataPacket[]>(
        'SELECT COUNT(*) as count FROM users WHERE tenant_id = ?',
        [invitation.tenant_id]
      );

      if (tenantUsers[0].count >= 2) {
        await connection.rollback();
        return res.status(400).json({ error: 'Maximum of 2 parents per tenant already reached' });
      }

      // Hash password
      const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

      // Create user
      const userId = uuidv4();
      await connection.query(
        'INSERT INTO users (id, email, password_hash, tenant_id, role) VALUES (?, ?, ?, ?, ?)',
        [userId, invitation.email, passwordHash, invitation.tenant_id, 'parent']
      );

      // Mark invitation as accepted
      await connection.query(
        'UPDATE parent_invitations SET status = ?, accepted_at = NOW() WHERE id = ?',
        ['accepted', invitation.id]
      );

      await connection.commit();

      // Generate JWT token
      const authToken = jwt.sign(
        { userId, tenantId: invitation.tenant_id, email: invitation.email },
        SECRET,
        { expiresIn: '30d' }
      );

      res.status(201).json({
        success: true,
        token: authToken,
        user: {
          id: userId,
          email: invitation.email,
          tenantId: invitation.tenant_id,
          role: 'parent'
        }
      });
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('Error accepting invitation:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get invitation details (for the accept invitation page)
router.get('/invitation/:token', async (req: Request, res: Response) => {
  try {
    const { token } = req.params;

    const [invitations] = await pool.query<RowDataPacket[]>(
      'SELECT email, status, expires_at FROM parent_invitations WHERE token = ?',
      [token]
    );

    if (invitations.length === 0) {
      return res.status(404).json({ error: 'Invalid invitation token' });
    }

    const invitation = invitations[0];

    // Check if expired
    if (new Date(invitation.expires_at) < new Date()) {
      return res.status(400).json({ error: 'This invitation has expired', status: 'expired' });
    }

    // Check if already accepted
    if (invitation.status === 'accepted') {
      return res.status(400).json({ error: 'This invitation has already been accepted', status: 'accepted' });
    }

    res.json({
      success: true,
      email: invitation.email,
      status: invitation.status,
      expiresAt: invitation.expires_at
    });
  } catch (error) {
    console.error('Error getting invitation:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get pending invitations for a tenant
router.get('/invitations', async (req: AuthRequest, res: Response) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, SECRET) as { userId: string; tenantId: string; email: string };

    const [invitations] = await pool.query<RowDataPacket[]>(
      'SELECT id, email, status, created_at, expires_at, accepted_at FROM parent_invitations WHERE tenant_id = ? ORDER BY created_at DESC',
      [decoded.tenantId]
    );

    res.json({
      success: true,
      invitations: invitations.map(inv => ({
        id: inv.id,
        email: inv.email,
        status: inv.status,
        createdAt: inv.created_at,
        expiresAt: inv.expires_at,
        acceptedAt: inv.accepted_at
      }))
    });
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      return res.status(401).json({ error: 'Invalid token' });
    }
    console.error('Error getting invitations:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Keep the old add-parent endpoint for backward compatibility (deprecated)
router.post('/add-parent', async (req: AuthRequest, res: Response) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, SECRET) as { userId: string; tenantId: string; email: string };

    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }

    // Validate password strength
    if (password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters long' });
    }

    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      // Check how many users are in the tenant
      const [tenantUsers] = await connection.query<RowDataPacket[]>(
        'SELECT COUNT(*) as count FROM users WHERE tenant_id = ?',
        [decoded.tenantId]
      );

      if (tenantUsers[0].count >= 2) {
        await connection.rollback();
        return res.status(400).json({ error: 'Maximum of 2 parents per tenant allowed' });
      }

      // Check if user already exists
      const [existingUsers] = await connection.query<RowDataPacket[]>(
        'SELECT id FROM users WHERE email = ?',
        [email.toLowerCase()]
      );

      if (existingUsers.length > 0) {
        await connection.rollback();
        return res.status(409).json({ error: 'User with this email already exists' });
      }

      // Hash password
      const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

      // Create second parent
      const userId = uuidv4();
      await connection.query(
        'INSERT INTO users (id, email, password_hash, tenant_id, role) VALUES (?, ?, ?, ?, ?)',
        [userId, email.toLowerCase(), passwordHash, decoded.tenantId, 'parent']
      );

      await connection.commit();

      res.status(201).json({
        success: true,
        user: {
          id: userId,
          email: email.toLowerCase(),
          tenantId: decoded.tenantId,
          role: 'parent'
        }
      });
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      return res.status(401).json({ error: 'Invalid token' });
    }
    console.error('Error adding parent:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Revoke access from a parent user
router.delete('/revoke-parent/:userId', async (req: AuthRequest, res: Response) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, SECRET) as { userId: string; tenantId: string; email: string };

    const { userId } = req.params;

    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    // Cannot revoke access from yourself
    if (userId === decoded.userId) {
      return res.status(400).json({ error: 'Cannot revoke access from yourself' });
    }

    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      // Verify the user exists and belongs to the same tenant
      const [users] = await connection.query<RowDataPacket[]>(
        'SELECT id, email, tenant_id, created_at FROM users WHERE id = ?',
        [userId]
      );

      if (users.length === 0) {
        await connection.rollback();
        return res.status(404).json({ error: 'User not found' });
      }

      const userToRevoke = users[0];

      // Verify user belongs to same tenant
      if (userToRevoke.tenant_id !== decoded.tenantId) {
        await connection.rollback();
        return res.status(403).json({ error: 'You do not have permission to revoke access from this user' });
      }

      // Check how many users are in the tenant
      const [tenantUsers] = await connection.query<RowDataPacket[]>(
        'SELECT COUNT(*) as count FROM users WHERE tenant_id = ?',
        [decoded.tenantId]
      );

      // Prevent revoking if it would leave no parents
      if (tenantUsers[0].count <= 1) {
        await connection.rollback();
        return res.status(400).json({ error: 'Cannot revoke access - at least one parent must remain' });
      }

      // Delete the user - CASCADE will handle related records
      await connection.query(
        'DELETE FROM users WHERE id = ?',
        [userId]
      );

      await connection.commit();

      res.json({
        success: true,
        message: 'Parent access revoked successfully'
      });
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      return res.status(401).json({ error: 'Invalid token' });
    }
    console.error('Error revoking parent access:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
