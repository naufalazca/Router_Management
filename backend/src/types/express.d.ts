/**
 * Extend Express Request interface to include user information
 */

declare namespace Express {
  export interface Request {
    user?: {
      userId: string;
      username: string;
      role: string;
    };
  }
}
