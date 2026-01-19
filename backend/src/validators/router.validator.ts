import { z } from 'zod';

export const createRouterSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  ipAddress: z.string().ip('Invalid IP address'),
  macAddress: z.string().optional(),
  model: z.string().optional(),
  location: z.string().optional(),
  status: z.enum(['ACTIVE', 'INACTIVE', 'MAINTENANCE']).optional(),
  companyId: z.string().uuid('Invalid company ID').optional(),
  username: z.string().min(1, 'Username is required'),
  password: z.string().min(1, 'Password is required'),
  apiPort: z.coerce.number().int().positive().optional(),
  sshPort: z.coerce.number().int().positive().optional()
});

export const updateRouterSchema = z.object({
  name: z.string().min(1).optional(),
  ipAddress: z.string().ip('Invalid IP address').optional(),
  macAddress: z.string().optional(),
  model: z.string().optional(),
  location: z.string().optional(),
  status: z.enum(['ACTIVE', 'INACTIVE', 'MAINTENANCE']).optional(),
  lastSeen: z.string().datetime().optional(),
  companyId: z.string().uuid('Invalid company ID').optional(),
  username: z.string().min(1).optional(),
  password: z.string().optional().transform(val => val === '' ? undefined : val),
  apiPort: z.coerce.number().int().positive().optional(),
  sshPort: z.coerce.number().int().positive().optional()
});

export type CreateRouterInput = z.infer<typeof createRouterSchema>;
export type UpdateRouterInput = z.infer<typeof updateRouterSchema>;
