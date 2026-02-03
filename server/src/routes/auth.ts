import { Router, Request, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { pool } from '../config/database.js';
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

    // Get any parent user from the tenant
    const [users] = await pool.query<RowDataPacket[]>(
      'SELECT id, email, tenant_id, role FROM users WHERE tenant_id = ? AND role = ? LIMIT 1',
      [device.tenant_id, 'parent']
    );

    if (users.length === 0) {
      return res.status(404).json({ error: 'No parent user found for this tenant' });
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

// Add second parent to tenant
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

export default router;
