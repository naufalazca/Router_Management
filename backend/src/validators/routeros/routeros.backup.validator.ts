import { z } from 'zod';
import { BackupType, BackupStatus, RestoreType } from '@prisma/client';

/**
 * Backup Management Validators
 */

// Trigger manual backup
export const triggerBackupSchema = z.object({
  routerId: z.string().uuid('Invalid router ID'),
  compact: z.boolean().optional().default(false),
  backupType: z.nativeEnum(BackupType).optional().default(BackupType.EXPORT)
});


// Restore backup
export const restoreBackupSchema = z.object({
  backupId: z.string().uuid('Invalid backup ID'),
  routerId: z.string().uuid('Invalid router ID'),
  createSafetyBackup: z.boolean().optional().default(true),
  restoreType: z.nativeEnum(RestoreType).optional().default(RestoreType.FULL)
});


// Pin/unpin backup
export const pinBackupSchema = z.object({
  reason: z.string().max(500).optional()
});


// List backups query params
export const listBackupsSchema = z.object({
  routerId: z.string().uuid().optional(),
  companyId: z.string().uuid().optional(),
  status: z.nativeEnum(BackupStatus).optional(),
  isPinned: z.enum(['true', 'false']).optional().transform(val => val === 'true'),
  limit: z.string().optional().transform(val => parseInt(val || '50')).refine(val => val > 0 && val <= 100),
  offset: z.string().optional().transform(val => parseInt(val || '0')).refine(val => val >= 0)
});


// Get download URL query params
export const downloadUrlSchema = z.object({
  expiresIn: z.string().optional()
    .transform(val => parseInt(val || '3600'))
    .refine(val => val > 0 && val <= 86400, 'Expires must be between 1 second and 24 hours')
});
