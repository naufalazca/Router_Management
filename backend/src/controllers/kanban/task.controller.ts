import { Request, Response, NextFunction } from 'express';
import taskService from '../../services/kanban/task.service';

export class TaskController {
  /**
   * Get all tasks in a list
   */
  getListTasks = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { boardId, listId } = req.params;
      const userId = req.user!.userId;

      const tasks = await taskService.getListTasks(listId, boardId, userId);

      res.json({
        status: 'success',
        data: tasks,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Get task by ID with full details
   */
  getTaskById = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { boardId, listId, id } = req.params;
      const userId = req.user!.userId;

      const task = await taskService.getTaskById(id, listId, boardId, userId);

      res.json({
        status: 'success',
        data: task,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Create a new task
   */
  createTask = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { boardId, listId } = req.params;
      const userId = req.user!.userId;
      const {
        title,
        description,
        priority,
        dueDate,
        startDate,
        estimatedHours,
        routerId,
      } = req.body;

      const task = await taskService.createTask(listId, boardId, userId, {
        title,
        description,
        priority,
        dueDate: dueDate ? new Date(dueDate) : undefined,
        startDate: startDate ? new Date(startDate) : undefined,
        estimatedHours,
        position: 0,
        router: routerId ? { connect: { id: routerId } } : undefined,
      });

      res.status(201).json({
        status: 'success',
        data: task,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Update task
   */
  updateTask = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { boardId, listId, id } = req.params;
      const userId = req.user!.userId;

      // Convert date strings to Date objects if present
      const updateData: any = { ...req.body };
      if (updateData.dueDate) updateData.dueDate = new Date(updateData.dueDate);
      if (updateData.startDate) updateData.startDate = new Date(updateData.startDate);
      if (updateData.completedAt) updateData.completedAt = new Date(updateData.completedAt);

      const task = await taskService.updateTask(id, listId, boardId, userId, updateData);

      res.json({
        status: 'success',
        data: task,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Move task to another list
   */
  moveTask = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { boardId, listId, id } = req.params;
      const userId = req.user!.userId;
      const { targetListId, position } = req.body;

      const task = await taskService.moveTask(id, listId, boardId, userId, targetListId, position);

      res.json({
        status: 'success',
        data: task,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Delete task (archive)
   */
  deleteTask = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { boardId, listId, id } = req.params;
      const userId = req.user!.userId;

      await taskService.deleteTask(id, listId, boardId, userId);

      res.json({
        status: 'success',
        message: 'Task archived successfully',
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Get task time statistics
   */
  getTaskTimeStats = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;

      const stats = await taskService.getTaskTimeStats(id);

      res.json({
        status: 'success',
        data: stats,
      });
    } catch (error) {
      next(error);
    }
  };
}

export default new TaskController();
