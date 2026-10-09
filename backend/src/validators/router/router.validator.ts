import { z } from 'zod';

export const routerIdParamSchema = z.object({
  routerId: z.string().uuid('Invalid router ID'),
});

const ipv4Regex = /^(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}$/;
const hostnameRegex = /^(?=.{1,253}$)[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;
export const hostSchema = z.string().trim().refine(
  v => ipv4Regex.test(v) || hostnameRegex.test(v),
  'Must be a valid IPv4 address or domain (e.g. aaa.sabawave.net)'
);

export const createRouterSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  ipAddress: hostSchema,
  macAddress: z.string().optional(),
  model: z.string().optional(),
  location: z.string().optional(),
  status: z.enum(['ACTIVE', 'INACTIVE', 'MAINTENANCE']).optional(),
  routerType: z.enum(['UPSTREAM', 'CORE', 'DISTRIBUSI', 'WIRELESS']).optional(),
  routerBrand: z.enum(['MIKROTIK', 'UBIVIQUITI']).optional(),
  companyId: z.string().uuid('Invalid company ID').optional(),
  username: z.string().min(1, 'Username is required'),
  password: z.string().min(1, 'Password is required'),
  apiPort: z.coerce.number().int().positive().optional(),
  sshPort: z.coerce.number().int().positive().optional()
});

export const updateRouterSchema = z.object({
  name: z.string().min(1).optional(),
  ipAddress: hostSchema.optional(),
  macAddress: z.string().optional(),
  model: z.string().optional(),
  location: z.string().optional(),
  status: z.enum(['ACTIVE', 'INACTIVE', 'MAINTENANCE']).optional(),
  routerType: z.enum(['UPSTREAM', 'CORE', 'DISTRIBUSI', 'WIRELESS']).optional(),
  routerBrand: z.enum(['MIKROTIK', 'UBIVIQUITI']).optional(),
  lastSeen: z.string().datetime().optional(),
  companyId: z.string().uuid('Invalid company ID').optional(),
  username: z.string().min(1).optional(),
  password: z.string().optional().transform(val => val === '' ? undefined : val),
  apiPort: z.coerce.number().int().positive().optional(),
  sshPort: z.coerce.number().int().positive().optional()
});
