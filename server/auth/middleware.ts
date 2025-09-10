import { Request, Response, NextFunction } from 'express';
import { verifyToken, extractTokenFromHeader, type AuthenticatedUser, JWTPayload } from './jwt';
import jwt from 'jsonwebtoken';

/**
 * JWT Authentication Middleware
 * Protects routes by verifying JWT tokens
 */
export const authenticateToken = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Extract token from Authorization header
    const token = extractTokenFromHeader(req.headers.authorization);
    
    if (!token) {
      res.status(401).json({
        success: false,
        message: 'Access token is required',
        error: 'MISSING_TOKEN'
      });
      return;
    }

    // Verify the token
    const decoded = await verifyToken(token);
    
    // Add user info to request object
    req.user = {
      id: decoded.id,
      email: decoded.email,
      role: decoded.role,
      specialization: decoded.specialization
    };
    
    next();
  } catch (error) {
    let message = 'Invalid or expired token';
    let errorCode = 'INVALID_TOKEN';
    
    if (error instanceof jwt.TokenExpiredError) {
      message = 'Token has expired';
      errorCode = 'TOKEN_EXPIRED';
    } else if (error instanceof jwt.JsonWebTokenError) {
      message = 'Invalid token';
      errorCode = 'INVALID_TOKEN_FORMAT';
    } else if (error instanceof Error) {
      message = error.message;
      errorCode = 'TOKEN_VERIFICATION_FAILED';
    }
    
    res.status(401).json({
      success: false,
      message,
      error: errorCode
    });
  }
};

/**
 * Optional JWT Authentication Middleware
 * Adds user info to request if token is present and valid, but doesn't block if missing
 */
export const optionalAuthentication = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const token = extractTokenFromHeader(req.headers.authorization);
    
    if (token) {
      try {
        const decoded = await verifyToken(token);
        req.user = {
          id: decoded.id,
          email: decoded.email,
          role: decoded.role,
          specialization: decoded.specialization
        };
      } catch (error) {
        // Token is invalid, but we don't block the request
        // req.user remains undefined
      }
    }
    
    next();
  } catch (error) {
    // Even if there's an error, continue to next middleware
    next();
  }
};

/**
 * Role-based Authorization Middleware
 * Requires authentication and checks if user has required role(s)
 */
export const requireRole = (allowedRoles: string | string[]) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    // First ensure user is authenticated
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'Authentication required',
        error: 'NOT_AUTHENTICATED'
      });
      return;
    }

    const userRole = req.user.role;
    const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];
    
    if (!userRole || !roles.includes(userRole)) {
      res.status(403).json({
        success: false,
        message: 'Insufficient permissions',
        error: 'INSUFFICIENT_PERMISSIONS',
        required: roles,
        current: userRole
      });
      return;
    }
    
    next();
  };
};

/**
 * User Ownership Middleware
 * Ensures the authenticated user can only access their own resources
 */
export const requireOwnership = (userIdParam: string = 'id') => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'Authentication required',
        error: 'NOT_AUTHENTICATED'
      });
      return;
    }

    const resourceUserId = req.params[userIdParam] || req.body[userIdParam];
    
    if (!resourceUserId) {
      res.status(400).json({
        success: false,
        message: `Missing ${userIdParam} parameter`,
        error: 'MISSING_PARAMETER'
      });
      return;
    }

    if (req.user.id !== resourceUserId) {
      res.status(403).json({
        success: false,
        message: 'Access denied: Can only access your own resources',
        error: 'ACCESS_DENIED'
      });
      return;
    }
    
    next();
  };
};

/**
 * Combine authentication with role authorization
 */
export const authenticateAndAuthorize = (allowedRoles: string | string[]) => {
  return [authenticateToken, requireRole(allowedRoles)];
};

/**
 * Error handling wrapper for async middleware
 */
export const asyncHandler = (fn: Function) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};