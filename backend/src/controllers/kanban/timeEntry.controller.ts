import { Request, Response, NextFunction } from 'express';
import timeEntryService from '../../services/kanban/timeEntry.service';

export class TimeEntryController {
  getTaskTimeEntries = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { taskId } = req.params;
      const userId = req.user!.userId;

      const timeEntries = await timeEntryService.getTaskTimeEntries(taskId, userId);

      res.json({
        status: 'success',
        data: timeEntries,
      });
    } catch (error) {
      next(error);
    }
  };

  createManualTimeEntry = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { taskId } = req.params;
      const userId = req.user!.userId;
      const { duration, description, startTime, endTime } = req.body;

      const timeEntry = await timeEntryService.createManualTimeEntry(
        taskId,
        userId,
        duration,
        description,
        startTime ? new Date(startTime) : undefined,
        endTime ? new Date(endTime) : undefined
      );

      res.status(201).json({
        status: 'success',
        data: timeEntry,
      });
    } catch (error) {
      next(error);
    }
  };

  startTimer = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { taskId } = req.params;
      const userId = req.user!.userId;
      const { description } = req.body;

      const timeEntry = await timeEntryService.startTimer(taskId, userId, description);

      res.status(201).json({
        status: 'success',
        data: timeEntry,
      });
    } catch (error) {
      next(error);
    }
  };

  stopTimer = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { taskId, id } = req.params;
      const userId = req.user!.userId;

      const timeEntry = await timeEntryService.stopTimer(id, taskId, userId);

      res.json({
        status: 'success',
        data: timeEntry,
      });
    } catch (error) {
      next(error);
    }
  };

  getActiveTimer = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { taskId } = req.params;
      const userId = req.user!.userId;

      const timeEntry = await timeEntryService.getActiveTimer(taskId, userId);

      res.json({
        status: 'success',
        data: timeEntry,
      });
    } catch (error) {
      next(error);
    }
  };

  updateTimeEntry = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { taskId, id } = req.params;
      const userId = req.user!.userId;

      // Convert date strings if present
      const updateData: any = { ...req.body };
      if (updateData.startTime) updateData.startTime = new Date(updateData.startTime);
      if (updateData.endTime) updateData.endTime = new Date(updateData.endTime);

      const timeEntry = await timeEntryService.updateTimeEntry(id, taskId, userId, updateData);

      res.json({
        status: 'success',
        data: timeEntry,
      });
    } catch (error) {
      next(error);
    }
  };

  deleteTimeEntry = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { taskId, id } = req.params;
      const userId = req.user!.userId;

      await timeEntryService.deleteTimeEntry(id, taskId, userId);

      res.json({
        status: 'success',
        message: 'Time entry deleted successfully',
      });
    } catch (error) {
      next(error);
    }
  };

  getTaskTimeStats = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { taskId } = req.params;
      const userId = req.user!.userId;

      const stats = await timeEntryService.getTaskTimeStats(taskId, userId);

      res.json({
        status: 'success',
        data: stats,
      });
    } catch (error) {
      next(error);
    }
  };
}

export default new TimeEntryController();
