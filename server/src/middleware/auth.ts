import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

// Extend Express Request type to include auth properties
export interface AuthRequest extends Request {
  userId?: string;
  tenantId?: string;
  userEmail?: string;
}

/**
 * Middleware to verify JWT token and extract user information
 */
export function authenticateToken(req: AuthRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  const token = authHeader.substring(7); // Remove 'Bearer ' prefix

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as {
      userId: string;
      tenantId: string;
      email: string;
    };

    // Attach user info to request
    req.userId = decoded.userId;
    req.tenantId = decoded.tenantId;
    req.userEmail = decoded.email;

    next();
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      return res.status(401).json({ error: 'Token expired' });
    }
    if (error instanceof jwt.JsonWebTokenError) {
      return res.status(401).json({ error: 'Invalid token' });
    }
    console.error('Error verifying token:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Optional authentication middleware - doesn't fail if no token provided
 * Used for endpoints that work with or without authentication
 */
export function optionalAuth(req: AuthRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    // No token provided, continue without authentication
    return next();
  }

  const token = authHeader.substring(7);

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as {
      userId: string;
      tenantId: string;
      email: string;
    };

    req.userId = decoded.userId;
    req.tenantId = decoded.tenantId;
    req.userEmail = decoded.email;

    next();
  } catch (error) {
    // Token invalid, but we allow the request to continue
    // The endpoint can check if tenantId is set to determine if user is authenticated
    console.warn('Invalid token provided but continuing with optional auth:', error);
    next();
  }
}
