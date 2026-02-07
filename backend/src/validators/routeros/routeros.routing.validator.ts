/**
 * RouterOS BGP Routing Validators
 * Zod schemas for validating BGP routing operations
 */

import { z } from 'zod';

/**
 * Router ID parameter validation
 */
export const routerIdParamSchema = z.object({
  routerId: z.string().uuid('Invalid router ID format'),
});

/**
 * Connection ID parameter validation
 */
export const connectionIdParamSchema = z.object({
  connectionId: z.string().min(1, 'Connection ID is required'),
});

/**
 * Combined router and connection ID parameters
 */
export const routerConnectionIdParamsSchema = z.object({
  routerId: z.string().uuid('Invalid router ID format'),
  connectionId: z.string().min(1, 'Connection ID is required'),
});

/**
 * Session ID parameter validation
 */
export const sessionIdParamSchema = z.object({
  sessionId: z.string().min(1, 'Session ID is required'),
});

/**
 * Combined router and session ID parameters
 */
export const routerSessionIdParamsSchema = z.object({
  routerId: z.string().uuid('Invalid router ID format'),
  sessionId: z.string().min(1, 'Session ID is required'),
});

/**
 * BGP Advertisement filter query validation
 */
export const bgpAdvertisementFilterSchema = z.object({
  prefix: z.string().optional(),
  dstAddress: z.string().optional(),
  fromPeer: z.string().optional(),
});

/**
 * Enable/Disable BGP connection body validation
 */
export const bgpConnectionActionSchema = z.object({
  reason: z.string().optional(),
});

/**
 * Reset BGP connection body validation
 */
export const bgpConnectionResetSchema = z.object({
  soft: z.boolean().optional().default(false), // Soft reset without tearing down session
});

// Export types
export type RouterIdParams = z.infer<typeof routerIdParamSchema>;
export type ConnectionIdParams = z.infer<typeof connectionIdParamSchema>;
export type RouterConnectionIdParams = z.infer<typeof routerConnectionIdParamsSchema>;
export type SessionIdParams = z.infer<typeof sessionIdParamSchema>;
export type RouterSessionIdParams = z.infer<typeof routerSessionIdParamsSchema>;
export type BGPAdvertisementFilter = z.infer<typeof bgpAdvertisementFilterSchema>;
export type BGPConnectionActionInput = z.infer<typeof bgpConnectionActionSchema>;
export type BGPConnectionResetInput = z.infer<typeof bgpConnectionResetSchema>;
