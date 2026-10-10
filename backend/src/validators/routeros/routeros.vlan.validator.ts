/**
 * RouterOS VLAN Validators
 * Zod schemas for validating RouterOS VLAN availability requests
 */

import { z } from 'zod';

/**
 * Device ID parameter validation (device-agnostic: Router or Switch)
 */
export const deviceIdParamSchema = z.object({
  deviceId: z.string().uuid('Invalid device ID format'),
});

// Export types
export type DeviceIdParams = z.infer<typeof deviceIdParamSchema>;
