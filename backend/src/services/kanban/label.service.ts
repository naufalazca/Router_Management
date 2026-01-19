import { prisma } from '../../lib/prisma';
import { Prisma, TaskActivityAction } from '@prisma/client';

export class LabelService {
  /**
   * Verify board ownership
   */
  private async verifyBoardOwnership(boardId: string, userId: string) {
    const board = await prisma.board.findFirst({
      where: { id: boardId, userId },
    });

    if (!board) {
      throw new Error('Board not found or access denied');
    }

    return board;
  }

  /**
   * Get all labels for a board
   */
  async getBoardLabels(boardId: string, userId: string) {
    await this.verifyBoardOwnership(boardId, userId);

    return prisma.label.findMany({
      where: { boardId },
      include: {
        _count: {
          select: { taskLabels: true },
        },
      },
      orderBy: { name: 'asc' },
    });
  }

  /**
   * Create a new label
   */
  async createLabel(boardId: string, userId: string, name: string, color: string) {
    await this.verifyBoardOwnership(boardId, userId);

    return prisma.label.create({
      data: {
        boardId,
        name,
        color,
      },
    });
  }

  /**
   * Update label
   */
  async updateLabel(
    labelId: string,
    boardId: string,
    userId: string,
    data: Prisma.LabelUpdateInput
  ) {
    await this.verifyBoardOwnership(boardId, userId);

    const label = await prisma.label.findFirst({
      where: { id: labelId, boardId },
    });

    if (!label) {
      throw new Error('Label not found');
    }

    return prisma.label.update({
      where: { id: labelId },
      data,
    });
  }

  /**
   * Delete label
   */
  async deleteLabel(labelId: string, boardId: string, userId: string) {
    await this.verifyBoardOwnership(boardId, userId);

    const label = await prisma.label.findFirst({
      where: { id: labelId, boardId },
    });

    if (!label) {
      throw new Error('Label not found');
    }

    // This will cascade delete all task_labels associations
    return prisma.label.delete({
      where: { id: labelId },
    });
  }

  /**
   * Add label to task
   */
  async addLabelToTask(labelId: string, taskId: string, boardId: string, userId: string) {
    await this.verifyBoardOwnership(boardId, userId);

    // Verify label belongs to board
    const label = await prisma.label.findFirst({
      where: { id: labelId, boardId },
    });

    if (!label) {
      throw new Error('Label not found');
    }

    // Verify task belongs to board
    const task = await prisma.task.findFirst({
      where: {
        id: taskId,
        list: { boardId },
      },
    });

    if (!task) {
      throw new Error('Task not found');
    }

    // Add label to task (will fail if already exists due to unique constraint)
    const taskLabel = await prisma.taskLabel.create({
      data: {
        taskId,
        labelId,
      },
      include: {
        label: true,
      },
    });

    // Log activity
    await prisma.taskActivity.create({
      data: {
        taskId,
        userId,
        action: TaskActivityAction.LABEL_ADDED,
        metadata: { labelName: label.name, labelColor: label.color },
      },
    });

    return taskLabel;
  }

  /**
   * Remove label from task
   */
  async removeLabelFromTask(labelId: string, taskId: string, boardId: string, userId: string) {
    await this.verifyBoardOwnership(boardId, userId);

    const taskLabel = await prisma.taskLabel.findFirst({
      where: {
        taskId,
        labelId,
        label: { boardId },
      },
      include: { label: true },
    });

    if (!taskLabel) {
      throw new Error('Task label association not found');
    }

    await prisma.taskLabel.delete({
      where: { id: taskLabel.id },
    });

    // Log activity
    await prisma.taskActivity.create({
      data: {
        taskId,
        userId,
        action: TaskActivityAction.LABEL_REMOVED,
        metadata: { labelName: taskLabel.label.name, labelColor: taskLabel.label.color },
      },
    });

    return { message: 'Label removed from task' };
  }

  /**
   * Get all tasks with a specific label
   */
  async getTasksByLabel(labelId: string, boardId: string, userId: string) {
    await this.verifyBoardOwnership(boardId, userId);

    const label = await prisma.label.findFirst({
      where: { id: labelId, boardId },
      include: {
        taskLabels: {
          include: {
            task: {
              include: {
                list: true,
                taskLabels: {
                  include: { label: true },
                },
              },
            },
          },
        },
      },
    });

    if (!label) {
      throw new Error('Label not found');
    }

    return label.taskLabels.map((tl) => tl.task);
  }
}

export default new LabelService();
