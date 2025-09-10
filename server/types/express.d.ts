// Type definitions for Express Request extensions
import { type AuthenticatedUser } from '../auth/jwt'; // Correct import path for AuthenticatedUser

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
    }
  }
}

export {};