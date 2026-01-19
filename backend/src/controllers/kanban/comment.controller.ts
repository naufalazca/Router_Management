import { Request, Response, NextFunction } from 'express';
import commentService from '../../services/kanban/comment.service';

export class CommentController {
  getTaskComments = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { taskId } = req.params;
      const userId = req.user!.userId;

      const comments = await commentService.getTaskComments(taskId, userId);

      res.json({
        status: 'success',
        data: comments,
      });
    } catch (error) {
      next(error);
    }
  };

  createComment = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { taskId } = req.params;
      const userId = req.user!.userId;
      const { content } = req.body;

      const comment = await commentService.createComment(taskId, userId, content);

      res.status(201).json({
        status: 'success',
        data: comment,
      });
    } catch (error) {
      next(error);
    }
  };

  updateComment = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { taskId, id } = req.params;
      const userId = req.user!.userId;
      const { content } = req.body;

      const comment = await commentService.updateComment(id, taskId, userId, content);

      res.json({
        status: 'success',
        data: comment,
      });
    } catch (error) {
      next(error);
    }
  };

  deleteComment = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { taskId, id } = req.params;
      const userId = req.user!.userId;

      await commentService.deleteComment(id, taskId, userId);

      res.json({
        status: 'success',
        message: 'Comment deleted successfully',
      });
    } catch (error) {
      next(error);
    }
  };
}

export default new CommentController();
