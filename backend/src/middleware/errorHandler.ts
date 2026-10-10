import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';

export class AppError extends Error {
  constructor(
    public statusCode: number,
    public message: string,
    public isOperational = true
  ) {
    super(message);
    Object.setPrototypeOf(this, AppError.prototype);
  }
}

export const errorHandler = (
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
) => {
  // Zod Validation Error
  if (err instanceof ZodError) {
    return res.status(400).json({
      status: 'error',
      message: 'Validation error',
      errors: err.errors.map(e => ({
        field: e.path.join('.'),
        message: e.message
      }))
    });
  }

  // Custom App Error
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      status: 'error',
      message: err.message
    });
  }

  // Prisma Error
  if (err.constructor.name.includes('Prisma')) {
    return res.status(500).json({
      status: 'error',
      message: 'Database error occurred'
    });
  }

  // Known operational errors (device lookup failures, connection failures, etc.)
  // carry a meaningful, user-safe message — forward them as 502 instead of
  // swallowing them behind a generic 500.
  if (err.message && !isGenericSystemError(err)) {
    console.error('Operational error:', err.message);
    return res.status(502).json({
      status: 'error',
      message: err.message
    });
  }

  // Default Error
  console.error('Error:', err);

  return res.status(500).json({
    status: 'error',
    message: 'Internal server error'
  });
};

/**
 * Detect low-level programming/system errors whose raw message should not be
 * exposed to clients (TypeError, ReferenceError, etc.).
 */
function isGenericSystemError(err: Error): boolean {
  return err instanceof TypeError
    || err instanceof ReferenceError
    || err instanceof RangeError
    || err instanceof SyntaxError;
}
