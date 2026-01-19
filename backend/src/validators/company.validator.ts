import { z } from 'zod';

export const createCompanySchema = z.object({
  name: z.string().min(1, 'Company name is required'),
  code: z.string().min(1, 'Company code is required').regex(/^[A-Z0-9_-]+$/, 'Code must contain only uppercase letters, numbers, hyphens, and underscores'),
  address: z.string().min(1, 'Address is required'),
  description: z.string().optional(),
  logo: z.string().url('Logo must be a valid URL').optional(),
  masterUsername: z.string().min(1, 'Master username is required'),
  masterPassword: z.string().min(1, 'Master password is required')
});

export const updateCompanySchema = z.object({
  name: z.string().min(1).optional(),
  code: z.string().min(1).regex(/^[A-Z0-9_-]+$/, 'Code must contain only uppercase letters, numbers, hyphens, and underscores').optional(),
  address: z.string().min(1).optional(),
  description: z.string().optional(),
  logo: z.string().url('Logo must be a valid URL').optional(),
  masterUsername: z.string().min(1).optional(),
  masterPassword: z.string().min(1).optional()
});

export type CreateCompanyInput = z.infer<typeof createCompanySchema>;
export type UpdateCompanyInput = z.infer<typeof updateCompanySchema>;
