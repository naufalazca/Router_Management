import { prisma } from '../../lib/prisma';
import { TimeEntryType, TaskActivityAction } from '@prisma/client';

export class TimeEntryService {
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
   * Get all time entries for a task
   */
  async getTaskTimeEntries(taskId: string, userId: string) {
    await this.verifyTaskAccess(taskId, userId);

    return prisma.taskTimeEntry.findMany({
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
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Create manual time entry
   */
  async createManualTimeEntry(
    taskId: string,
    userId: string,
    duration: number,
    description?: string,
    startTime?: Date,
    endTime?: Date
  ) {
    await this.verifyTaskAccess(taskId, userId);

    const timeEntry = await prisma.taskTimeEntry.create({
      data: {
        taskId,
        userId,
        entryType: TimeEntryType.MANUAL,
        duration,
        description,
        startTime,
        endTime,
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
        action: TaskActivityAction.TIME_ENTRY_ADDED,
        metadata: { duration, type: 'manual' },
      },
    });

    return timeEntry;
  }

  /**
   * Start timer
   */
  async startTimer(taskId: string, userId: string, description?: string) {
    await this.verifyTaskAccess(taskId, userId);

    // Check if there's already an active timer for this user on this task
    const activeTimer = await prisma.taskTimeEntry.findFirst({
      where: {
        taskId,
        userId,
        entryType: TimeEntryType.TIMER,
        endTime: null,
      },
    });

    if (activeTimer) {
      throw new Error('Timer already running for this task');
    }

    const timeEntry = await prisma.taskTimeEntry.create({
      data: {
        taskId,
        userId,
        entryType: TimeEntryType.TIMER,
        startTime: new Date(),
        endTime: null,
        duration: 0, // Will be calculated when stopped
        description,
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

    return timeEntry;
  }

  /**
   * Stop timer
   */
  async stopTimer(timeEntryId: string, taskId: string, userId: string) {
    await this.verifyTaskAccess(taskId, userId);

    const timeEntry = await prisma.taskTimeEntry.findFirst({
      where: {
        id: timeEntryId,
        taskId,
        userId,
        entryType: TimeEntryType.TIMER,
        endTime: null,
      },
    });

    if (!timeEntry) {
      throw new Error('Active timer not found');
    }

    if (!timeEntry.startTime) {
      throw new Error('Timer has no start time');
    }

    const endTime = new Date();
    const duration = Math.floor((endTime.getTime() - timeEntry.startTime.getTime()) / 1000);

    const updatedEntry = await prisma.taskTimeEntry.update({
      where: { id: timeEntryId },
      data: {
        endTime,
        duration,
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
        action: TaskActivityAction.TIME_ENTRY_ADDED,
        metadata: { duration, type: 'timer' },
      },
    });

    return updatedEntry;
  }

  /**
   * Get active timer for user on task
   */
  async getActiveTimer(taskId: string, userId: string) {
    await this.verifyTaskAccess(taskId, userId);

    return prisma.taskTimeEntry.findFirst({
      where: {
        taskId,
        userId,
        entryType: TimeEntryType.TIMER,
        endTime: null,
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
   * Update time entry
   */
  async updateTimeEntry(
    timeEntryId: string,
    taskId: string,
    userId: string,
    data: {
      duration?: number;
      description?: string;
      startTime?: Date;
      endTime?: Date;
    }
  ) {
    await this.verifyTaskAccess(taskId, userId);

    const timeEntry = await prisma.taskTimeEntry.findFirst({
      where: {
        id: timeEntryId,
        taskId,
        userId,
      },
    });

    if (!timeEntry) {
      throw new Error('Time entry not found or access denied');
    }

    const updatedEntry = await prisma.taskTimeEntry.update({
      where: { id: timeEntryId },
      data,
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
        action: TaskActivityAction.TIME_ENTRY_UPDATED,
      },
    });

    return updatedEntry;
  }

  /**
   * Delete time entry
   */
  async deleteTimeEntry(timeEntryId: string, taskId: string, userId: string) {
    await this.verifyTaskAccess(taskId, userId);

    const timeEntry = await prisma.taskTimeEntry.findFirst({
      where: {
        id: timeEntryId,
        taskId,
        userId,
      },
    });

    if (!timeEntry) {
      throw new Error('Time entry not found or access denied');
    }

    await prisma.taskTimeEntry.delete({
      where: { id: timeEntryId },
    });

    // Log activity
    await prisma.taskActivity.create({
      data: {
        taskId,
        userId,
        action: TaskActivityAction.TIME_ENTRY_DELETED,
        metadata: { duration: timeEntry.duration },
      },
    });

    return { message: 'Time entry deleted' };
  }

  /**
   * Get time stats for task
   */
  async getTaskTimeStats(taskId: string, userId: string) {
    await this.verifyTaskAccess(taskId, userId);

    const timeEntries = await prisma.taskTimeEntry.findMany({
      where: { taskId },
    });

    const totalSeconds = timeEntries.reduce((sum, entry) => sum + entry.duration, 0);
    const totalHours = totalSeconds / 3600;

    const byType = timeEntries.reduce(
      (acc, entry) => {
        const key = entry.entryType.toLowerCase();
        acc[key] = (acc[key] || 0) + entry.duration;
        return acc;
      },
      {} as Record<string, number>
    );

    return {
      totalSeconds,
      totalHours: parseFloat(totalHours.toFixed(2)),
      entriesCount: timeEntries.length,
      byType,
    };
  }
}

export default new TimeEntryService();
