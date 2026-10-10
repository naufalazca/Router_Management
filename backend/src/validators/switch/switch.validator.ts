import { z } from 'zod';

const ipv4Regex = /^(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}$/;
const hostnameRegex = /^(?=.{1,253}$)[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;
export const switchHostSchema = z.string().trim().refine(
  v => ipv4Regex.test(v) || hostnameRegex.test(v),
  'Must be a valid IPv4 address or domain'
);

export const switchIdParamSchema = z.object({
  id: z.string().uuid('Invalid switch ID')
});

export const createSwitchSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  ipAddress: switchHostSchema,
  macAddress: z.string().optional(),
  model: z.string().optional(),
  location: z.string().optional(),
  portCount: z.coerce.number().int().positive().optional(),
  status: z.enum(['ACTIVE', 'INACTIVE', 'MAINTENANCE']).optional(),
  brand: z.enum(['MIKROTIK', 'UBIVIQUITI']).optional(),
  companyId: z.string().uuid('Invalid company ID'), // Required — switches always belong to a company
  username: z.string().min(1, 'Username is required'),
  password: z.string().min(1, 'Password is required'),
  apiPort: z.coerce.number().int().positive().optional(),
  sshPort: z.coerce.number().int().positive().optional()
});

export const updateSwitchSchema = z.object({
  name: z.string().min(1).optional(),
  ipAddress: switchHostSchema.optional(),
  macAddress: z.string().optional(),
  model: z.string().optional(),
  location: z.string().optional(),
  portCount: z.coerce.number().int().positive().optional(),
  status: z.enum(['ACTIVE', 'INACTIVE', 'MAINTENANCE']).optional(),
  brand: z.enum(['MIKROTIK', 'UBIVIQUITI']).optional(),
  companyId: z.string().uuid('Invalid company ID').optional(), // Optional on update, but never nullable
  username: z.string().min(1).optional(),
  password: z.string().optional().transform(val => val === '' ? undefined : val),
  apiPort: z.coerce.number().int().positive().optional(),
  sshPort: z.coerce.number().int().positive().optional()
});
