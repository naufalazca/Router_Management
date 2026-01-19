import { Request, Response, NextFunction } from 'express';
import labelService from '../../services/kanban/label.service';

export class LabelController {
  getBoardLabels = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { boardId } = req.params;
      const userId = req.user!.userId;

      const labels = await labelService.getBoardLabels(boardId, userId);

      res.json({
        status: 'success',
        data: labels,
      });
    } catch (error) {
      next(error);
    }
  };

  createLabel = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { boardId } = req.params;
      const userId = req.user!.userId;
      const { name, color } = req.body;

      const label = await labelService.createLabel(boardId, userId, name, color);

      res.status(201).json({
        status: 'success',
        data: label,
      });
    } catch (error) {
      next(error);
    }
  };

  updateLabel = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { boardId, id } = req.params;
      const userId = req.user!.userId;

      const label = await labelService.updateLabel(id, boardId, userId, req.body);

      res.json({
        status: 'success',
        data: label,
      });
    } catch (error) {
      next(error);
    }
  };

  deleteLabel = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { boardId, id } = req.params;
      const userId = req.user!.userId;

      await labelService.deleteLabel(id, boardId, userId);

      res.json({
        status: 'success',
        message: 'Label deleted successfully',
      });
    } catch (error) {
      next(error);
    }
  };

  addLabelToTask = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { boardId, taskId, labelId } = req.params;
      const userId = req.user!.userId;

      const taskLabel = await labelService.addLabelToTask(labelId, taskId, boardId, userId);

      res.status(201).json({
        status: 'success',
        data: taskLabel,
      });
    } catch (error) {
      next(error);
    }
  };

  removeLabelFromTask = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { boardId, taskId, labelId } = req.params;
      const userId = req.user!.userId;

      await labelService.removeLabelFromTask(labelId, taskId, boardId, userId);

      res.json({
        status: 'success',
        message: 'Label removed from task',
      });
    } catch (error) {
      next(error);
    }
  };

  getTasksByLabel = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { boardId, labelId } = req.params;
      const userId = req.user!.userId;

      const tasks = await labelService.getTasksByLabel(labelId, boardId, userId);

      res.json({
        status: 'success',
        data: tasks,
      });
    } catch (error) {
      next(error);
    }
  };
}

export default new LabelController();
