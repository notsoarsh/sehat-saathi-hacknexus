import jwt, { type SignOptions } from 'jsonwebtoken';
import { Request, Response, NextFunction } from 'express';

// JWT Payload Interface
export interface JWTPayload {
  id: string;
  email: string;
  role?: string;
  specialization?: string;
  iat?: number;
  exp?: number;
}

// Authenticated User Interface (extended from JWT payload)
export interface AuthenticatedUser {
  id: string;
  email: string;
  role?: string;
  specialization?: string;
}

// Extend Express Request interface to include user
declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
    }
  }
}

// JWT Configuration
const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

if (!JWT_SECRET) {
  throw new Error('JWT_SECRET environment variable is required');
}

/**
 * Generate JWT Token
 * @param payload - The payload to encode in the token
 * @param expiresIn - Optional custom expiration time
 * @returns Promise<string> - The generated JWT token
 */
export const generateToken = async (
  payload: Omit<JWTPayload, 'iat' | 'exp'>,
  expiresIn = JWT_EXPIRES_IN
): Promise<string> => {
  try {
    const token = jwt.sign(payload, JWT_SECRET as string, {
      expiresIn: expiresIn as string,
      issuer: 'sehat-saathi',
      audience: 'sehat-saathi-users'
    } as SignOptions);
    
    return token;
  } catch (error) {
    throw new Error('Failed to generate JWT token');
  }
};

/**
 * Verify JWT Token
 * @param token - The JWT token to verify
 * @returns Promise<JWTPayload> - The decoded payload
 */
export const verifyToken = async (token: string): Promise<JWTPayload> => {
  try {
    const decoded = jwt.verify(token, JWT_SECRET!, {
      issuer: 'sehat-saathi',
      audience: 'sehat-saathi-users'
    }) as JWTPayload;
    
    return decoded;
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      throw new Error('Token has expired');
    } else if (error instanceof jwt.JsonWebTokenError) {
      throw new Error('Invalid token');
    } else {
      throw new Error('Token verification failed');
    }
  }
};

/**
 * Decode JWT Token without verification (for debugging)
 * @param token - The JWT token to decode
 * @returns JWTPayload | null - The decoded payload or null if invalid
 */
export const decodeToken = (token: string): JWTPayload | null => {
  try {
    return jwt.decode(token) as JWTPayload;
  } catch (error) {
    return null;
  }
};

/**
 * Extract token from Authorization header
 * @param authHeader - The Authorization header value
 * @returns string | null - The extracted token or null if not found
 */
export const extractTokenFromHeader = (authHeader: string | undefined): string | null => {
  if (!authHeader) {
    return null;
  }

  // Support both "Bearer token" and "token" formats
  const parts = authHeader.split(' ');
  
  if (parts.length === 2 && parts[0] === 'Bearer') {
    return parts[1];
  } else if (parts.length === 1) {
    return parts[0];
  }
  
  return null;
};

/**
 * Check if token is expired
 * @param token - The JWT token to check
 * @returns boolean - True if token is expired
 */
export const isTokenExpired = (token: string): boolean => {
  try {
    const decoded = decodeToken(token);
    if (!decoded || !decoded.exp) {
      return true;
    }
    
    const currentTime = Math.floor(Date.now() / 1000);
    return decoded.exp < currentTime;
  } catch (error) {
    return true;
  }
};

/**
 * Get token expiration time
 * @param token - The JWT token
 * @returns Date | null - The expiration date or null if invalid
 */
export const getTokenExpiration = (token: string): Date | null => {
  try {
    const decoded = decodeToken(token);
    if (!decoded || !decoded.exp) {
      return null;
    }
    
    return new Date(decoded.exp * 1000);
  } catch (error) {
    return null;
  }
};
