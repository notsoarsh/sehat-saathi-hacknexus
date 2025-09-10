// Export all authentication utilities and middleware
export * from './jwt';
export * from './middleware';

// Re-export commonly used types and functions for convenience
export type { JWTPayload, AuthenticatedUser } from './jwt';
export { generateToken, verifyToken, extractTokenFromHeader } from './jwt';
export { 
  authenticateToken, 
  requireRole, 
  requireOwnership, 
  authenticateAndAuthorize,
  optionalAuthentication,
  asyncHandler 
} from './middleware';
