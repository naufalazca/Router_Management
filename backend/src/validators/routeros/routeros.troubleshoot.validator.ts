/**
 * RouterOS Troubleshoot Validators
 * Zod schemas for validating RouterOS troubleshooting operations
 */

import { z } from 'zod';

/**
 * Router ID parameter validation
 */
export const routerIdParamSchema = z.object({
  routerId: z.string().uuid('Invalid router ID format'),
});

/**
 * Ping request body validation
 * Note: MikroTik ping does not support interval parameter (uses default)
 */
export const pingRequestSchema = z.object({
  address: z.string().min(1, 'Target address is required'),
  count: z.number().int().min(1).max(1000).optional(),
  size: z.number().int().min(1).max(65000).optional(),
  ttl: z.number().int().min(1).max(255).optional(),
  srcAddress: z.string().ip().optional(),
  interface: z.string().optional(),
  doNotFragment: z.boolean().optional(),
  dscp: z.number().int().min(0).max(63).optional(),
});

/**
 * Traceroute request body validation (simplified)
 */
export const tracerouteRequestSchema = z.object({
  address: z.string().min(1, 'Target address is required'),
  count: z.number().int().min(1).max(100).optional(),
});

/**
 * Continuous ping request body validation
 */
export const continuousPingRequestSchema = z.object({
  address: z.string().min(1, 'Target address is required'),
  count: z.number().int().min(1).max(100).optional(),
  size: z.number().int().min(1).max(65000).optional(),
  ttl: z.number().int().min(1).max(255).optional(),
  iterations: z.number().int().min(1).max(100).optional(),
  srcAddress: z.string().ip().optional(),
  interface: z.string().optional(),
  doNotFragment: z.boolean().optional(),
  dscp: z.number().int().min(0).max(63).optional(),
});

/**
 * Combined router ID with ping body
 */
export const routerIdWithPingSchema = routerIdParamSchema.extend({
  body: pingRequestSchema,
});

/**
 * Combined router ID with traceroute body
 */
export const routerIdWithTracerouteSchema = routerIdParamSchema.extend({
  body: tracerouteRequestSchema,
});

/**
 * Combined router ID with continuous ping body
 */
export const routerIdWithContinuousPingSchema = routerIdParamSchema.extend({
  body: continuousPingRequestSchema,
});

// Export types
export type PingRequestInput = z.infer<typeof pingRequestSchema>;
export type TracerouteRequestInput = z.infer<typeof tracerouteRequestSchema>;
export type ContinuousPingRequestInput = z.infer<typeof continuousPingRequestSchema>;
export type RouterIdParams = z.infer<typeof routerIdParamSchema>;
