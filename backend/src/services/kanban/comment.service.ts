import { prisma } from '../../lib/prisma';
import { TaskActivityAction } from '@prisma/client';

export class CommentService {
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
   * Get all comments for a task
   */
  async getTaskComments(taskId: string, userId: string) {
    await this.verifyTaskAccess(taskId, userId);

    return prisma.taskComment.findMany({
      where: { taskId },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            fullName: true,
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  /**
   * Create a new comment
   */
  async createComment(taskId: string, userId: string, content: string) {
    await this.verifyTaskAccess(taskId, userId);

    const comment = await prisma.taskComment.create({
      data: {
        taskId,
        userId,
        content,
      },
      include: {
        user: {
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
        action: TaskActivityAction.COMMENTED,
      },
    });

    return comment;
  }

  /**
   * Update comment
   */
  async updateComment(commentId: string, taskId: string, userId: string, content: string) {
    await this.verifyTaskAccess(taskId, userId);

    const comment = await prisma.taskComment.findFirst({
      where: {
        id: commentId,
        taskId,
        userId, // Only comment owner can edit
      },
    });

    if (!comment) {
      throw new Error('Comment not found or access denied');
    }

    return prisma.taskComment.update({
      where: { id: commentId },
      data: {
        content,
        isEdited: true,
        editedAt: new Date(),
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            fullName: true,
          },
        },
      },
    });
  }

  /**
   * Delete comment
   */
  async deleteComment(commentId: string, taskId: string, userId: string) {
    await this.verifyTaskAccess(taskId, userId);

    const comment = await prisma.taskComment.findFirst({
      where: {
        id: commentId,
        taskId,
        userId, // Only comment owner can delete
      },
    });

    if (!comment) {
      throw new Error('Comment not found or access denied');
    }

    return prisma.taskComment.delete({
      where: { id: commentId },
    });
  }
}

export default new CommentService();
