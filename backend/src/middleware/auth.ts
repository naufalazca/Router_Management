import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { UserRole } from '@prisma/client';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

export interface AuthPayload {
  userId: string;
  username: string;
  role: UserRole;
}

/**
 * Authentication middleware
 * Verifies JWT token and attaches user payload to request
 */
export const authenticate = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Get token from Authorization header
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({
        success: false,
        message: 'No token provided. Authorization header must be in format: Bearer <token>',
      });
      return;
    }

    const token = authHeader.replace('Bearer ', '');

    // Verify token
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as AuthPayload;

      // Attach user payload to request (convert role enum to string)
      req.user = {
        userId: decoded.userId,
        username: decoded.username,
        role: decoded.role as string,
      };

      next();
    } catch (jwtError) {
      res.status(401).json({
        success: false,
        message: 'Invalid or expired token',
      });
      return;
    }
  } catch (error) {
    next(error);
  }
};

/**
 * Authorization middleware - requires ADMIN role
 * Must be used after authenticate middleware
 */
export const requireAdmin = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  if (!req.user) {
    res.status(401).json({
      success: false,
      message: 'Authentication required',
    });
    return;
  }

  if (req.user.role !== 'ADMIN') {
    res.status(403).json({
      success: false,
      message: 'Access denied. Admin role required.',
    });
    return;
  }

  next();
};

/**
 * Authorization middleware - requires USER or ADMIN role
 * Must be used after authenticate middleware
 */
export const requireUser = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  if (!req.user) {
    res.status(401).json({
      success: false,
      message: 'Authentication required',
    });
    return;
  }

  if (req.user.role !== 'USER' && req.user.role !== 'ADMIN') {
    res.status(403).json({
      success: false,
      message: 'Access denied. User role or higher required.',
    });
    return;
  }

  next();
};

/**
 * Authorization middleware - requires VIEWER, USER, or ADMIN role
 * Must be used after authenticate middleware
 */
export const requireViewer = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  if (!req.user) {
    res.status(401).json({
      success: false,
      message: 'Authentication required',
    });
    return;
  }

  // All roles are allowed (VIEWER, USER, ADMIN)
  next();
};
