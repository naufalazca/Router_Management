import { Request, Response, NextFunction } from 'express';
import { routerOSBackupService } from '../../services/routeros/routeros.backup.service';
import {
  triggerBackupSchema,
  restoreBackupSchema,
  pinBackupSchema,
  listBackupsSchema,
  downloadUrlSchema
} from '../../validators/routeros/routeros.backup.validator';
import { TriggerType } from '@prisma/client';

/**
 * RouterOS Backup Controller
 * Handles HTTP requests for backup management
 */

export class RouterOSBackupController {
  /**
   * POST /api/routeros/backup/:routerId/trigger
   * Trigger manual backup for a router
   */
  async triggerBackup(req: Request, res: Response, next: NextFunction) {
    try {
      const { routerId } = req.params;
      const validatedData = triggerBackupSchema.parse(req.body);
      const userId = (req as any).user?.userId; // From auth middleware

      const backup = await routerOSBackupService.createBackup({
        routerId: routerId,
        triggeredBy: userId,
        triggerType: TriggerType.MANUAL,
        backupType: validatedData.backupType,
        compact: validatedData.compact
      });

      // Convert BigInt fields to strings for JSON serialization
      const serializedBackup = {
        ...backup,
        fileSize: backup.fileSize.toString()
      };

      res.status(201).json({
        success: true,
        message: 'Backup created successfully',
        data: serializedBackup
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/backups
   * List all backups with filters
   */
  async listBackups(req: Request, res: Response, next: NextFunction) {
    try {
      const validatedQuery = listBackupsSchema.parse(req.query);

      const result = await routerOSBackupService.getBackups({
        routerId: validatedQuery.routerId,
        companyId: validatedQuery.companyId,
        status: validatedQuery.status,
        isPinned: validatedQuery.isPinned,
        limit: validatedQuery.limit,
        offset: validatedQuery.offset
      });

      // Convert BigInt fields to strings for JSON serialization
      const serializedBackups = result.backups.map(backup => ({
        ...backup,
        fileSize: backup.fileSize.toString()
      }));

      res.json({
        success: true,
        data: serializedBackups,
        pagination: {
          total: result.total,
          limit: result.limit,
          offset: result.offset,
          hasMore: result.offset + result.limit < result.total
        }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/backups/:id
   * Get backup details by ID
   */
  async getBackupById(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;

      const backup = await routerOSBackupService.getBackupById(id);

      // Convert BigInt fields to strings for JSON serialization
      const serializedBackup = {
        ...backup,
        fileSize: backup.fileSize.toString()
      };

      res.json({
        success: true,
        data: serializedBackup
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/backups/:id/download
   * Get presigned download URL for a backup
   */
  async getDownloadUrl(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const validatedQuery = downloadUrlSchema.parse(req.query);

      const url = await routerOSBackupService.getBackupDownloadUrl(
        id,
        validatedQuery.expiresIn
      );

      res.json({
        success: true,
        data: {
          url,
          expiresIn: validatedQuery.expiresIn
        }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/backups/:id/restore
   * Restore a backup to a router
   */
  async restoreBackup(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const validatedData = restoreBackupSchema.parse(req.body);
      const userId = (req as any).user?.userId;

      const restore = await routerOSBackupService.restoreBackup({
        backupId: id,
        routerId: validatedData.routerId,
        restoredBy: userId,
        createSafetyBackup: validatedData.createSafetyBackup
      });

      // Convert BigInt fields to strings for JSON serialization
      const serializedRestore = {
        ...restore,
        backup: restore.backup ? {
          ...restore.backup,
          fileSize: restore.backup.fileSize.toString()
        } : undefined
      };

      res.json({
        success: true,
        message: 'Backup restored successfully',
        data: serializedRestore
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/backups/:id/restore-history
   * Get restore history for a backup
   */
  async getRestoreHistory(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;

      const history = await routerOSBackupService.getRestoreHistory(id);

      res.json({
        success: true,
        data: history
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * PATCH /api/backups/:id/pin
   * Pin or unpin a backup
   */
  async togglePin(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const validatedData = pinBackupSchema.parse(req.body);
      const userId = (req as any).user?.userId;

      const backup = await routerOSBackupService.togglePin(
        id,
        userId,
        validatedData.reason
      );

      // Convert BigInt fields to strings for JSON serialization
      const serializedBackup = {
        ...backup,
        fileSize: backup.fileSize.toString()
      };

      res.json({
        success: true,
        message: backup.isPinned ? 'Backup pinned successfully' : 'Backup unpinned successfully',
        data: serializedBackup
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * DELETE /api/backups/:id
   * Delete a backup
   */
  async deleteBackup(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;

      await routerOSBackupService.deleteBackup(id);

      res.json({
        success: true,
        message: 'Backup deleted successfully'
      });
    } catch (error) {
      next(error);
    }
  }
}

// Export singleton instance
export const routerOSBackupController = new RouterOSBackupController();
