import { prisma } from '../../lib/prisma';
import { Prisma, TaskActivityAction } from '@prisma/client';

export class TaskService {
  /**
   * Verify list ownership through board
   */
  private async verifyListOwnership(listId: string, boardId: string, userId: string) {
    const list = await prisma.boardList.findFirst({
      where: {
        id: listId,
        boardId,
        board: { userId },
      },
    });

    if (!list) {
      throw new Error('List not found or access denied');
    }

    return list;
  }

  /**
   * Log task activity
   */
  private async logActivity(
    taskId: string,
    userId: string,
    action: TaskActivityAction,
    fieldChanged?: string,
    oldValue?: any,
    newValue?: any,
    metadata?: any
  ) {
    return prisma.taskActivity.create({
      data: {
        taskId,
        userId,
        action,
        fieldChanged,
        oldValue: oldValue !== undefined ? oldValue : Prisma.JsonNull,
        newValue: newValue !== undefined ? newValue : Prisma.JsonNull,
        metadata: metadata || Prisma.JsonNull,
      },
    });
  }

  /**
   * Get all tasks in a list
   */
  async getListTasks(listId: string, boardId: string, userId: string) {
    await this.verifyListOwnership(listId, boardId, userId);

    return prisma.task.findMany({
      where: {
        listId,
        isArchived: false,
      },
      include: {
        creator: {
          select: {
            id: true,
            username: true,
            fullName: true,
          },
        },
        taskLabels: {
          include: { label: true },
        },
        router: {
          select: {
            id: true,
            name: true,
            ipAddress: true,
            location: true,
          },
        },
        _count: {
          select: {
            comments: true,
            attachments: true,
            timeEntries: true,
          },
        },
      },
      orderBy: { position: 'asc' },
    });
  }

  /**
   * Get task by ID with full details
   */
  async getTaskById(taskId: string, listId: string, boardId: string, userId: string) {
    await this.verifyListOwnership(listId, boardId, userId);

    const task = await prisma.task.findFirst({
      where: { id: taskId, listId },
      include: {
        creator: {
          select: {
            id: true,
            username: true,
            fullName: true,
          },
        },
        taskLabels: {
          include: { label: true },
        },
        router: true,
        comments: {
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
        },
        attachments: {
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
        },
        activities: {
          include: {
            user: {
              select: {
                id: true,
                username: true,
                fullName: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
          take: 50, // Limit activities
        },
        timeEntries: {
          include: {
            user: {
              select: {
                id: true,
                username: true,
                fullName: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!task) {
      throw new Error('Task not found');
    }

    return task;
  }

  /**
   * Create a new task
   */
  async createTask(
    listId: string,
    boardId: string,
    userId: string,
    data: Omit<Prisma.TaskCreateInput, 'list' | 'creator'>
  ) {
    await this.verifyListOwnership(listId, boardId, userId);

    // Get max position
    const maxPosition = await prisma.task.findFirst({
      where: { listId },
      orderBy: { position: 'desc' },
      select: { position: true },
    });

    const newPosition = (maxPosition?.position ?? -1) + 1;

    const task = await prisma.task.create({
      data: {
        ...data,
        position: newPosition,
        list: { connect: { id: listId } },
        creator: { connect: { id: userId } },
      },
      include: {
        creator: {
          select: {
            id: true,
            username: true,
            fullName: true,
          },
        },
        taskLabels: {
          include: { label: true },
        },
      },
    });

    // Log creation activity
    await this.logActivity(task.id, userId, TaskActivityAction.CREATED);

    return task;
  }

  /**
   * Update task
   */
  async updateTask(
    taskId: string,
    listId: string,
    boardId: string,
    userId: string,
    data: Prisma.TaskUpdateInput
  ) {
    await this.verifyListOwnership(listId, boardId, userId);

    const task = await prisma.task.findFirst({
      where: { id: taskId, listId },
    });

    if (!task) {
      throw new Error('Task not found');
    }

    // Track changes for activity log
    const changes: any[] = [];

    if (data.title !== undefined && data.title !== task.title) {
      changes.push({ field: 'title', old: task.title, new: data.title });
    }
    if (data.priority !== undefined && data.priority !== task.priority) {
      changes.push({ field: 'priority', old: task.priority, new: data.priority });
    }
    if (data.dueDate !== undefined) {
      changes.push({ field: 'dueDate', old: task.dueDate, new: data.dueDate });
    }

    const updatedTask = await prisma.task.update({
      where: { id: taskId },
      data,
      include: {
        creator: {
          select: {
            id: true,
            username: true,
            fullName: true,
          },
        },
        taskLabels: {
          include: { label: true },
        },
      },
    });

    // Log all changes
    for (const change of changes) {
      await this.logActivity(
        taskId,
        userId,
        TaskActivityAction.UPDATED,
        change.field,
        change.old,
        change.new
      );
    }

    return updatedTask;
  }

  /**
   * Move task to another list
   */
  async moveTask(
    taskId: string,
    listId: string,
    boardId: string,
    userId: string,
    targetListId: string,
    position: number
  ) {
    await this.verifyListOwnership(listId, boardId, userId);
    await this.verifyListOwnership(targetListId, boardId, userId);

    const task = await prisma.task.findFirst({
      where: { id: taskId, listId },
      include: { list: true },
    });

    if (!task) {
      throw new Error('Task not found');
    }

    const targetList = await prisma.boardList.findUnique({
      where: { id: targetListId },
    });

    const movedTask = await prisma.task.update({
      where: { id: taskId },
      data: {
        listId: targetListId,
        position,
      },
    });

    // Log move activity
    await this.logActivity(taskId, userId, TaskActivityAction.MOVED, undefined, undefined, undefined, {
      fromList: task.list.name,
      toList: targetList?.name,
    });

    return movedTask;
  }

  /**
   * Delete task (soft delete)
   */
  async deleteTask(taskId: string, listId: string, boardId: string, userId: string) {
    await this.verifyListOwnership(listId, boardId, userId);

    const task = await prisma.task.findFirst({
      where: { id: taskId, listId },
    });

    if (!task) {
      throw new Error('Task not found');
    }

    const archivedTask = await prisma.task.update({
      where: { id: taskId },
      data: { isArchived: true },
    });

    // Log archive activity
    await this.logActivity(taskId, userId, TaskActivityAction.ARCHIVED);

    return archivedTask;
  }

  /**
   * Calculate total time spent on task
   */
  async getTaskTimeStats(taskId: string) {
    const timeEntries = await prisma.taskTimeEntry.findMany({
      where: { taskId },
    });

    const totalSeconds = timeEntries.reduce((sum, entry) => sum + entry.duration, 0);
    const totalHours = totalSeconds / 3600;

    return {
      totalSeconds,
      totalHours: parseFloat(totalHours.toFixed(2)),
      entriesCount: timeEntries.length,
    };
  }
}

export default new TaskService();
