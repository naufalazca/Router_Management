/**
 * RouterOS User Validators
 * Zod schemas for validating RouterOS user operations
 */

import { z } from 'zod';

/**
 * Router ID parameter validation
 */
export const routerIdParamSchema = z.object({
  routerId: z.string().uuid('Invalid router ID format'),
});

/**
 * User ID parameter validation
 */
export const userIdParamSchema = z.object({
  userId: z.string().min(1, 'User ID is required'),
});

/**
 * Combined router and user ID parameters
 */
export const routerUserIdParamsSchema = z.object({
  routerId: z.string().uuid('Invalid router ID format'),
  userId: z.string().min(1, 'User ID is required'),
});

/**
 * Create user request body validation
 */
export const createUserSchema = z.object({
  name: z.string().min(1, 'Username is required').max(50, 'Username too long'),
  password: z.string().min(1, 'Password is required'),
  group: z.string().optional(),
  address: z.string().optional(),
  comment: z.string().optional(),
  disabled: z.boolean().optional(),
});

/**
 * Update user request body validation
 */
export const updateUserSchema = z.object({
  password: z.string().optional(),
  group: z.string().optional(),
  address: z.string().optional(),
  comment: z.string().optional(),
  disabled: z.boolean().optional(),
}).refine(
  (data) => Object.keys(data).length > 0,
  { message: 'At least one field must be provided for update' }
);

export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
export type RouterIdParams = z.infer<typeof routerIdParamSchema>;
export type UserIdParams = z.infer<typeof userIdParamSchema>;
export type RouterUserIdParams = z.infer<typeof routerUserIdParamsSchema>;
