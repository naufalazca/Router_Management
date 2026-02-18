import { z } from 'zod';

// IP address validation regex
const IP_REGEX = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;

export const ipParamSchema = z.object({
  ip: z.string().refine(
    (val) => IP_REGEX.test(val),
    'Invalid IP address format'
  )
});

export type IpParamInput = z.infer<typeof ipParamSchema>;
