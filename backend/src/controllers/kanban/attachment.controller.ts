import { Request, Response, NextFunction } from 'express';
import attachmentService from '../../services/kanban/attachment.service';

export class AttachmentController {
  /**
   * Get all attachments for a task
   */
  getTaskAttachments = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { taskId } = req.params;
      const userId = req.user!.userId;

      const attachments = await attachmentService.getTaskAttachments(taskId, userId);

      res.json({
        status: 'success',
        data: attachments,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Upload attachment
   */
  uploadAttachment = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { taskId } = req.params;
      const userId = req.user!.userId;

      if (!req.file) {
        return res.status(400).json({
          status: 'error',
          message: 'No file uploaded',
        });
      }

      const attachment = await attachmentService.uploadAttachment(taskId, userId, {
        buffer: req.file.buffer,
        originalname: req.file.originalname,
        mimetype: req.file.mimetype,
        size: req.file.size,
      });

      res.status(201).json({
        status: 'success',
        data: attachment,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Get attachment by ID (with fresh presigned URL)
   */
  getAttachmentById = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { taskId, id } = req.params;
      const userId = req.user!.userId;

      const attachment = await attachmentService.getAttachmentById(id, taskId, userId);

      res.json({
        status: 'success',
        data: attachment,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Download attachment
   */
  downloadAttachment = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { taskId, id } = req.params;
      const userId = req.user!.userId;

      const { buffer, fileName, mimeType } = await attachmentService.downloadAttachment(
        id,
        taskId,
        userId
      );

      res.setHeader('Content-Type', mimeType);
      res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
      res.send(buffer);
    } catch (error) {
      next(error);
    }
  };

  /**
   * Delete attachment
   */
  deleteAttachment = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { taskId, id } = req.params;
      const userId = req.user!.userId;

      await attachmentService.deleteAttachment(id, taskId, userId);

      res.json({
        status: 'success',
        message: 'Attachment deleted successfully',
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Get storage statistics for task
   */
  getTaskStorageStats = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { taskId } = req.params;
      const userId = req.user!.userId;

      const stats = await attachmentService.getTaskStorageStats(taskId, userId);

      res.json({
        status: 'success',
        data: stats,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Get user's global storage statistics
   */
  getUserStorageStats = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.userId;

      const stats = await attachmentService.getUserStorageStats(userId);

      res.json({
        status: 'success',
        data: stats,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Cleanup orphaned files (admin only)
   */
  cleanupOrphanedFiles = async (req: Request, res: Response, next: NextFunction) => {
    try {
      // TODO: Add admin role check
      const result = await attachmentService.cleanupOrphanedFiles();

      res.json({
        status: 'success',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  };
}

export default new AttachmentController();
