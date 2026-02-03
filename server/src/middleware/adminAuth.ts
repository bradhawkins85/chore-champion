import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { pool } from '../config/database.js';
import type { RowDataPacket } from 'mysql2';

// Extend Express Request type to include user info
declare global {
  namespace Express {
    interface Request {
      userId?: string;
      tenantId?: string;
      userEmail?: string;
      userRole?: string;
    }
  }
}

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

interface JWTPayload {
  userId: string;
  tenantId: string;
  email: string;
  role: string;
}

/**
 * Middleware to require admin role for accessing admin endpoints
 */
export async function requireAdmin(req: Request, res: Response, next: NextFunction) {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const token = authHeader.substring(7);
    
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as JWTPayload;
      
      // Verify user still exists and has admin role
      const [rows] = await pool.query<RowDataPacket[]>(
        'SELECT id, email, role, tenant_id FROM users WHERE id = ? AND role = ?',
        [decoded.userId, 'admin']
      );

      if (rows.length === 0) {
        return res.status(403).json({ error: 'Access denied. Admin role required.' });
      }

      const user = rows[0];
      
      // Attach user info to request
      req.userId = user.id;
      req.userEmail = user.email;
      req.tenantId = user.tenant_id;
      req.userRole = user.role;
      
      next();
    } catch (err) {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }
  } catch (error) {
    console.error('Admin auth error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}
