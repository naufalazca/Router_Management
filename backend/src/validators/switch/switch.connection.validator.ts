import { z } from 'zod';

export const switchConnectionIdParamSchema = z.object({
  id: z.string().uuid('Invalid switch connection ID')
});

const endpointSchema = z
  .object({
    switchId: z.string().uuid('Invalid switch ID').optional(),
    routerId: z.string().uuid('Invalid router ID').optional()
  })
  .refine(
    v => (v.switchId ? 1 : 0) + (v.routerId ? 1 : 0) === 1,
    'Each endpoint must specify exactly one of switchId or routerId'
  );

export const createSwitchConnectionSchema = z
  .object({
    source: endpointSchema,
    target: endpointSchema,
    linkType: z.enum(['ETHERNET', 'FIBER', 'WIRELESS', 'VPN']).optional(),
    linkStatus: z.enum(['ACTIVE', 'INACTIVE', 'PLANNED']).optional(),
    sourceInterface: z.string().optional(),
    targetInterface: z.string().optional(),
    sourcePortNumber: z.coerce.number().int().positive().optional(),
    targetPortNumber: z.coerce.number().int().positive().optional(),
    vlan: z.coerce.number().int().positive().optional(),
    speed: z.string().optional(),
    bandwidth: z.string().optional(),
    distance: z.number().positive().optional(),
    notes: z.string().optional()
  })
  .refine(
    v =>
      (v.source.switchId || v.source.routerId) !== (v.target.switchId || v.target.routerId),
    'Source and target endpoints cannot be the same device'
  );

export const updateSwitchConnectionSchema = z.object({
  linkType: z.enum(['ETHERNET', 'FIBER', 'WIRELESS', 'VPN']).optional(),
  linkStatus: z.enum(['ACTIVE', 'INACTIVE', 'PLANNED']).optional(),
  sourceInterface: z.string().optional(),
  targetInterface: z.string().optional(),
  sourcePortNumber: z.coerce.number().int().positive().optional(),
  targetPortNumber: z.coerce.number().int().positive().optional(),
  vlan: z.coerce.number().int().positive().optional(),
  speed: z.string().optional(),
  bandwidth: z.string().optional(),
  distance: z.number().positive().optional(),
  notes: z.string().optional()
});
