import { prisma } from '../../lib/prisma';
import { createRouterOSClient } from '../../lib/routeros/client';
import { createSSHClient } from '../../lib/routeros/ssh-client';
import {
  uploadBackup,
  generateBackupStorageKey,
  parseConfigSummary,
  extractRouterOSVersion,
  generateBackupDownloadUrl,
  downloadAndVerifyBackup,
  deleteBackup
} from '../../lib/backup-storage';
import { BackupType, BackupStatus, TriggerType } from '@prisma/client';
import { resolveDevice, assertDeviceActive } from '../../lib/routeros/resolve-device';

/**
 * RouterOS Backup Service (device-agnostic)
 * Handles backup creation, restoration, and management for any RouterOS
 * device (Router or Switch). Each backup row has exactly one owner:
 * either routerId or switchId.
 */

export interface CreateBackupOptions {
  routerId: string; // Device id (router or switch)
  triggeredBy?: string; // User ID for manual backups
  triggerType?: TriggerType;
  backupType?: BackupType;
  compact?: boolean; // Compact export format
}

export interface RestoreBackupOptions {
  backupId: string;
  routerId: string;
  restoredBy: string; // User ID
  createSafetyBackup?: boolean;
}

export class RouterOSGlobalBackupService {
  /**
   * Create a new backup for a device (router or switch)
   */
  async createBackup(options: CreateBackupOptions) {
    const {
      routerId: deviceId,
      triggeredBy,
      triggerType = TriggerType.MANUAL,
      backupType = BackupType.EXPORT,
      compact = false
    } = options;

    // 1. Resolve device (switch first, then router)
    const device = await resolveDevice(deviceId);
    assertDeviceActive(device);

    // 2. Generate storage key (deviceId is unique across both tables)
    const storageKey = generateBackupStorageKey(deviceId, backupType);

    // 3. Create backup record with PENDING status — exactly one owner set
    const backup = await prisma.routerBackup.create({
      data: {
        routerId: device.deviceType === 'router' ? deviceId : null,
        switchId: device.deviceType === 'switch' ? deviceId : null,
        backupType,
        storageKey,
        fileSize: 0, // Will be updated after upload
        checksum: '', // Will be updated after upload
        backupStatus: BackupStatus.PENDING,
        triggerType,
        triggeredBy,
        isSafetyBackup: false
      }
    });

    try {
      // 4. Connect to RouterOS via SSH for export and API for version
      let configContent: string;
      let routerVersion: string;

      // Use SSH for export (RouterOS API doesn't support export)
      const sshClient = await createSSHClient({
        host: device.ipAddress,
        port: device.sshPort,
        username: device.username,
        password: device.password,
        timeout: 30000
      });

      try {
        configContent = await sshClient.exportConfig(compact);
      } finally {
        sshClient.disconnect();
      }

      // Use API to get RouterOS version
      const apiClient = await createRouterOSClient({
        host: device.ipAddress,
        username: device.username,
        password: device.password,
        port: device.apiPort
      });

      try {
        routerVersion = await apiClient.getVersion();
      } finally {
        await apiClient.disconnect();
      }

      // 5. Parse config summary
      const configSummary = parseConfigSummary(configContent);

      // 6. Extract version from export if not already obtained
      if (!routerVersion) {
        routerVersion = extractRouterOSVersion(configContent) || 'Unknown';
      }

      // 7. Upload to R2
      const uploadResult = await uploadBackup(
        storageKey,
        configContent,
        'text/plain; charset=utf-8'
      );

      // 8. Update backup record with success
      const updatedBackup = await prisma.routerBackup.update({
        where: { id: backup.id },
        data: {
          fileSize: uploadResult.fileSize,
          checksum: uploadResult.checksum,
          routerVersion,
          configSummary,
          backupStatus: BackupStatus.COMPLETED,
          completedAt: new Date()
        },
        include: {
          router: device.deviceType === 'router' ? {
            select: {
              id: true,
              name: true,
              ipAddress: true
            }
          } : undefined,
          switch: device.deviceType === 'switch' ? {
            select: {
              id: true,
              name: true,
              ipAddress: true
            }
          } : undefined
        }
      });

      // 9. Update device lastSeen (routers only; switches have no lastSeen field)
      if (device.deviceType === 'router') {
        await prisma.router.update({
          where: { id: deviceId },
          data: { lastSeen: new Date() }
        });
      }

      return updatedBackup;
    } catch (error) {
      // Update backup record with FAILED status
      await prisma.routerBackup.update({
        where: { id: backup.id },
        data: {
          backupStatus: BackupStatus.FAILED,
          completedAt: new Date()
        }
      });

      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Backup failed: ${errorMsg}`);
    }
  }

  /**
   * Create safety backup before restore operation
   */
  async createSafetyBackup(deviceId: string, restoredBy: string) {
    return await this.createBackup({
      routerId: deviceId,
      triggeredBy: restoredBy,
      triggerType: TriggerType.MANUAL,
      compact: true // Safety backups are compact
    }).then(async (backup) => {
      // Mark as safety backup
      return await prisma.routerBackup.update({
        where: { id: backup.id },
        data: { isSafetyBackup: true }
      });
    });
  }

  /**
   * Restore a backup to a router
   */
  async restoreBackup(options: RestoreBackupOptions) {
    const {
      backupId,
      routerId: deviceId,
      restoredBy,
      createSafetyBackup: shouldCreateSafetyBackup = true
    } = options;

    // 1. Get backup record
    const backup = await prisma.routerBackup.findUnique({
      where: { id: backupId },
      include: { router: true, switch: true }
    });

    if (!backup) {
      throw new Error(`Backup not found: ${backupId}`);
    }

    if (backup.backupStatus !== BackupStatus.COMPLETED) {
      throw new Error(`Backup is not completed: ${backup.backupStatus}`);
    }

    // 2. Resolve target device (switch first, then router)
    const device = await resolveDevice(deviceId);
    assertDeviceActive(device);

    // 3. Create safety backup if requested
    let safetyBackup = null;
    if (shouldCreateSafetyBackup) {
      try {
        safetyBackup = await this.createSafetyBackup(deviceId, restoredBy);
      } catch (error) {
        console.error('Failed to create safety backup:', error);
        // Continue with restore even if safety backup fails
        // User can decide if they want to proceed
        throw new Error(
          `Failed to create safety backup: ${error instanceof Error ? error.message : 'Unknown error'}`
        );
      }
    }

    // 4. Create restore record — exactly one owner set
    const restore = await prisma.backupRestore.create({
      data: {
        backupId,
        routerId: device.deviceType === 'router' ? deviceId : null,
        switchId: device.deviceType === 'switch' ? deviceId : null,
        restoredBy,
        safetyBackupId: safetyBackup?.id || null
      }
    });

    try {
      // 5. Download backup from R2 and verify
      const configContent = await downloadAndVerifyBackup(
        backup.storageKey,
        backup.checksum
      );

      // 6. Connect to RouterOS
      const client = await createRouterOSClient({
        host: device.ipAddress,
        username: device.username,
        password: device.password,
        port: device.apiPort
      });

      let restoreLog: string;

      try {
        // 7. Import configuration
        const result = await client.importConfig(configContent.toString(), true);

        restoreLog = result.error || 'Configuration restored successfully';

        if (!result.success) {
          throw new Error(restoreLog);
        }
      } finally {
        await client.disconnect();
      }

      // 8. Update restore record with success
      const updatedRestore = await prisma.backupRestore.update({
        where: { id: restore.id },
        data: {
          restoreStatus: 'COMPLETED',
          restoreLog,
          completedAt: new Date()
        },
        include: {
          backup: true,
          router: device.deviceType === 'router' ? {
            select: {
              id: true,
              name: true,
              ipAddress: true
            }
          } : undefined,
          switch: device.deviceType === 'switch' ? {
            select: {
              id: true,
              name: true,
              ipAddress: true
            }
          } : undefined
        }
      });

      return updatedRestore;
    } catch (error) {
      // Update restore record with FAILED status
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';

      await prisma.backupRestore.update({
        where: { id: restore.id },
        data: {
          restoreStatus: 'FAILED',
          errorMessage: errorMsg,
          completedAt: new Date()
        }
      });

      throw new Error(`Restore failed: ${errorMsg}`);
    }
  }

  /**
   * Get all backups with filters
   */
  async getBackups(filters: {
    routerId?: string;
    switchId?: string;
    deviceId?: string; // Matches either owner
    companyId?: string;
    status?: BackupStatus;
    isPinned?: boolean;
    limit?: number;
    offset?: number;
  }) {
    const { routerId, switchId, deviceId, companyId, status, isPinned, limit = 50, offset = 0 } = filters;

    const where: any = {};

    if (deviceId) {
      where.OR = [{ routerId: deviceId }, { switchId: deviceId }];
    } else {
      if (routerId) {
        where.routerId = routerId;
      }
      if (switchId) {
        where.switchId = switchId;
      }
    }

    if (companyId) {
      where.OR = [
        ...(where.OR || []),
        { router: { companyId } },
        { switch: { companyId } }
      ];
    }

    if (status) {
      where.backupStatus = status;
    }

    if (isPinned !== undefined) {
      where.isPinned = isPinned;
    }

    const [backups, total] = await Promise.all([
      prisma.routerBackup.findMany({
        where,
        include: {
          router: {
            select: {
              id: true,
              name: true,
              ipAddress: true,
              company: {
                select: {
                  id: true,
                  name: true
                }
              }
            }
          },
          switch: {
            select: {
              id: true,
              name: true,
              ipAddress: true,
              company: {
                select: {
                  id: true,
                  name: true
                }
              }
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset
      }),
      prisma.routerBackup.count({ where })
    ]);

    return {
      backups,
      total,
      limit,
      offset
    };
  }

  /**
   * Get single backup by ID
   */
  async getBackupById(backupId: string) {
    const backup = await prisma.routerBackup.findUnique({
      where: { id: backupId },
      include: {
        router: {
          select: {
            id: true,
            name: true,
            ipAddress: true,
            company: {
              select: {
                id: true,
                name: true
              }
            }
          }
        },
        switch: {
          select: {
            id: true,
            name: true,
            ipAddress: true,
            company: {
              select: {
                id: true,
                name: true
              }
            }
          }
        },
        restoreHistory: {
          orderBy: { createdAt: 'desc' },
          take: 10
        }
      }
    });

    if (!backup) {
      throw new Error(`Backup not found: ${backupId}`);
    }

    return backup;
  }

  /**
   * Generate download URL for a backup
   */
  async getBackupDownloadUrl(backupId: string, expiresIn: number = 3600) {
    const backup = await prisma.routerBackup.findUnique({
      where: { id: backupId }
    });

    if (!backup) {
      throw new Error(`Backup not found: ${backupId}`);
    }

    if (backup.backupStatus !== BackupStatus.COMPLETED) {
      throw new Error(`Backup is not available for download: ${backup.backupStatus}`);
    }

    const url = await generateBackupDownloadUrl(backup.storageKey, expiresIn);

    // Update storageUrl in database (optional, for caching)
    await prisma.routerBackup.update({
      where: { id: backupId },
      data: { storageUrl: url }
    });

    return url;
  }

  /**
   * Pin/unpin a backup
   */
  async togglePin(backupId: string, userId: string, reason?: string) {
    const backup = await prisma.routerBackup.findUnique({
      where: { id: backupId }
    });

    if (!backup) {
      throw new Error(`Backup not found: ${backupId}`);
    }

    const isPinned = !backup.isPinned;

    return await prisma.routerBackup.update({
      where: { id: backupId },
      data: {
        isPinned,
        pinnedBy: isPinned ? userId : null,
        pinnedAt: isPinned ? new Date() : null,
        pinnedReason: isPinned ? reason : null,
        expiresAt: isPinned ? null : backup.expiresAt // Clear expiry if pinned
      }
    });
  }

  /**
   * Delete a backup
   */
  async deleteBackup(backupId: string) {
    const backup = await prisma.routerBackup.findUnique({
      where: { id: backupId }
    });

    if (!backup) {
      throw new Error(`Backup not found: ${backupId}`);
    }

    if (backup.isPinned) {
      throw new Error('Cannot delete pinned backup. Unpin it first.');
    }

    // Delete from R2
    try {
      await deleteBackup(backup.storageKey);
    } catch (error) {
      console.error('Failed to delete from R2:', error);
      // Continue with database deletion even if R2 deletion fails
    }

    // Delete from database (cascade will delete restore history)
    await prisma.routerBackup.delete({
      where: { id: backupId }
    });
  }

  /**
   * Get restore history for a backup
   */
  async getRestoreHistory(backupId: string) {
    return await prisma.backupRestore.findMany({
      where: { backupId },
      orderBy: { createdAt: 'desc' },
      include: {
        router: {
          select: {
            id: true,
            name: true,
            ipAddress: true
          }
        },
        switch: {
          select: {
            id: true,
            name: true,
            ipAddress: true
          }
        }
      }
    });
  }
}

// Export singleton instance
export const routerOSGlobalBackupService = new RouterOSGlobalBackupService();
