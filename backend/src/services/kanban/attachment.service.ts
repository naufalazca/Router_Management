import { prisma } from '../../lib/prisma';
import { r2Client } from '../../lib/r2-client';
import { TaskActivityAction } from '@prisma/client';
import crypto from 'crypto';

export class AttachmentService {
  /**
   * Verify task access through board ownership
   */
  private async verifyTaskAccess(taskId: string, userId: string) {
    const task = await prisma.task.findFirst({
      where: {
        id: taskId,
        list: {
          board: { userId },
        },
      },
    });

    if (!task) {
      throw new Error('Task not found or access denied');
    }

    return task;
  }

  /**
   * Generate storage key for attachment
   * Format: kanban/{taskId}/{timestamp}_{filename}
   */
  private generateStorageKey(taskId: string, filename: string): string {
    const timestamp = Date.now();
    const sanitizedFilename = filename.replace(/[^a-zA-Z0-9._-]/g, '_');
    return `kanban/${taskId}/${timestamp}_${sanitizedFilename}`;
  }

  /**
   * Calculate SHA256 checksum
   */
  private calculateChecksum(buffer: Buffer): string {
    return crypto.createHash('sha256').update(buffer).digest('hex');
  }

  /**
   * Get all attachments for a task
   */
  async getTaskAttachments(taskId: string, userId: string) {
    await this.verifyTaskAccess(taskId, userId);

    const attachments = await prisma.taskAttachment.findMany({
      where: { taskId },
      include: {
        uploader: {
          select: {
            id: true,
            username: true,
            fullName: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Generate fresh presigned URLs for all attachments (valid for 7 days)
    const attachmentsWithFreshUrls = await Promise.all(
      attachments.map(async (attachment) => {
        const freshUrl = await r2Client.getPresignedUrl(attachment.storageKey, 7 * 24 * 3600);
        return {
          ...attachment,
          storageUrl: freshUrl,
        };
      })
    );

    return attachmentsWithFreshUrls;
  }

  /**
   * Upload attachment to R2 and save metadata
   */
  async uploadAttachment(
    taskId: string,
    userId: string,
    file: {
      buffer: Buffer;
      originalname: string;
      mimetype: string;
      size: number;
    }
  ) {
    await this.verifyTaskAccess(taskId, userId);

    // Generate storage key
    const storageKey = this.generateStorageKey(taskId, file.originalname);

    // Calculate checksum
    const checksum = this.calculateChecksum(file.buffer);

    try {
      // Upload to R2
      await r2Client.upload(storageKey, file.buffer, file.mimetype);

      // Save metadata to database (storageKey only, no storageUrl)
      const attachment = await prisma.taskAttachment.create({
        data: {
          taskId,
          uploadedBy: userId,
          fileName: file.originalname,
          fileSize: BigInt(file.size),
          mimeType: file.mimetype,
          storageKey,
          checksum,
        },
        include: {
          uploader: {
            select: {
              id: true,
              username: true,
              fullName: true,
            },
          },
        },
      });

      // Log activity
      await prisma.taskActivity.create({
        data: {
          taskId,
          userId,
          action: TaskActivityAction.ATTACHMENT_ADDED,
          metadata: {
            fileName: file.originalname,
            fileSize: file.size,
            mimeType: file.mimetype,
          },
        },
      });

      // Generate fresh presigned URL for response (valid for 7 days)
      const storageUrl = await r2Client.getPresignedUrl(storageKey, 7 * 24 * 3600);

      return {
        ...attachment,
        storageUrl,
      };
    } catch (error) {
      throw new Error(`Failed to upload attachment: ${(error as Error).message}`);
    }
  }

  /**
   * Get attachment by ID with fresh presigned URL
   */
  async getAttachmentById(attachmentId: string, taskId: string, userId: string) {
    await this.verifyTaskAccess(taskId, userId);

    const attachment = await prisma.taskAttachment.findFirst({
      where: { id: attachmentId, taskId },
      include: {
        uploader: {
          select: {
            id: true,
            username: true,
            fullName: true,
          },
        },
      },
    });

    if (!attachment) {
      throw new Error('Attachment not found');
    }

    // Generate fresh presigned URL (valid for 1 hour)
    const freshUrl = await r2Client.getPresignedUrl(attachment.storageKey, 3600);

    return {
      ...attachment,
      storageUrl: freshUrl,
    };
  }

  /**
   * Download attachment from R2
   */
  async downloadAttachment(attachmentId: string, taskId: string, userId: string) {
    await this.verifyTaskAccess(taskId, userId);

    const attachment = await prisma.taskAttachment.findFirst({
      where: { id: attachmentId, taskId },
    });

    if (!attachment) {
      throw new Error('Attachment not found');
    }

    try {
      // Download from R2
      const buffer = await r2Client.download(attachment.storageKey);

      // Verify checksum
      const downloadChecksum = this.calculateChecksum(buffer);
      if (downloadChecksum !== attachment.checksum) {
        throw new Error('File integrity check failed');
      }

      return {
        buffer,
        fileName: attachment.fileName,
        mimeType: attachment.mimeType,
      };
    } catch (error) {
      throw new Error(`Failed to download attachment: ${(error as Error).message}`);
    }
  }

  /**
   * Delete attachment
   */
  async deleteAttachment(attachmentId: string, taskId: string, userId: string) {
    await this.verifyTaskAccess(taskId, userId);

    const attachment = await prisma.taskAttachment.findFirst({
      where: {
        id: attachmentId,
        taskId,
        uploadedBy: userId, // Only uploader can delete
      },
    });

    if (!attachment) {
      throw new Error('Attachment not found or access denied');
    }

    try {
      // Delete from R2
      await r2Client.delete(attachment.storageKey);

      // Delete from database
      await prisma.taskAttachment.delete({
        where: { id: attachmentId },
      });

      // Log activity
      await prisma.taskActivity.create({
        data: {
          taskId,
          userId,
          action: TaskActivityAction.ATTACHMENT_REMOVED,
          metadata: {
            fileName: attachment.fileName,
            fileSize: Number(attachment.fileSize),
          },
        },
      });

      return { message: 'Attachment deleted successfully' };
    } catch (error) {
      throw new Error(`Failed to delete attachment: ${(error as Error).message}`);
    }
  }

  /**
   * Get storage statistics for a task
   */
  async getTaskStorageStats(taskId: string, userId: string) {
    await this.verifyTaskAccess(taskId, userId);

    const attachments = await prisma.taskAttachment.findMany({
      where: { taskId },
      select: { fileSize: true },
    });

    const totalSize = attachments.reduce((sum, att) => sum + Number(att.fileSize), 0);

    return {
      totalSize,
      totalSizeMB: (totalSize / (1024 * 1024)).toFixed(2),
      fileCount: attachments.length,
    };
  }

  /**
   * Cleanup orphaned files in R2 (for maintenance)
   * This should be run periodically via cron job
   */
  async cleanupOrphanedFiles() {
    // Get all attachment keys from database
    const attachments = await prisma.taskAttachment.findMany({
      select: { storageKey: true },
    });

    const dbKeys = new Set(attachments.map((a) => a.storageKey));

    // List all files in kanban/ prefix in R2
    const r2Keys = await r2Client.listObjects('kanban/');

    // Find orphaned files (in R2 but not in DB)
    const orphanedKeys = r2Keys.filter((key) => !dbKeys.has(key));

    if (orphanedKeys.length > 0) {
      await r2Client.deleteMany(orphanedKeys);
    }

    return {
      cleaned: orphanedKeys.length,
      orphanedKeys,
    };
  }

  /**
   * Get global storage statistics for user
   */
  async getUserStorageStats(userId: string) {
    const attachments = await prisma.taskAttachment.findMany({
      where: {
        task: {
          list: {
            board: { userId },
          },
        },
      },
      select: { fileSize: true },
    });

    const totalSize = attachments.reduce((sum, att) => sum + Number(att.fileSize), 0);

    return {
      totalSize,
      totalSizeMB: (totalSize / (1024 * 1024)).toFixed(2),
      totalSizeGB: (totalSize / (1024 * 1024 * 1024)).toFixed(2),
      fileCount: attachments.length,
    };
  }
}

export default new AttachmentService();
