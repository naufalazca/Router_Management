import { Request, Response, NextFunction } from 'express';
import boardService from '../../services/kanban/board.service';
import boardListService from '../../services/kanban/boardList.service';

export class BoardController {
  /**
   * Get all boards for logged-in user
   */
  getUserBoards = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.userId;
      const boards = await boardService.getUserBoards(userId);

      res.json({
        status: 'success',
        data: boards,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Get board by ID
   */
  getBoardById = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const userId = req.user!.userId;

      const board = await boardService.getBoardById(id, userId);

      res.json({
        status: 'success',
        data: board,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Create a new board
   */
  createBoard = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.userId;
      const { name, description, color, icon } = req.body;

      const board = await boardService.createBoard(userId, {
        name,
        description,
        color,
        icon,
      });

      res.status(201).json({
        status: 'success',
        data: board,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Update board
   */
  updateBoard = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const userId = req.user!.userId;

      const board = await boardService.updateBoard(id, userId, req.body);

      res.json({
        status: 'success',
        data: board,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Delete board (archive)
   */
  deleteBoard = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const userId = req.user!.userId;

      await boardService.deleteBoard(id, userId);

      res.json({
        status: 'success',
        message: 'Board archived successfully',
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Reorder boards
   */
  reorderBoards = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.userId;
      const { boardIds } = req.body;

      await boardService.reorderBoards(userId, boardIds);

      res.json({
        status: 'success',
        message: 'Boards reordered successfully',
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Get archived boards
   */
  getArchivedBoards = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.userId;
      const boards = await boardService.getArchivedBoards(userId);

      res.json({
        status: 'success',
        data: boards,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Restore archived board
   */
  restoreBoard = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const userId = req.user!.userId;

      const board = await boardService.restoreBoard(id, userId);

      res.json({
        status: 'success',
        data: board,
      });
    } catch (error) {
      next(error);
    }
  };

  // Board List operations

  /**
   * Get all lists for a board
   */
  getBoardLists = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { boardId } = req.params;
      const userId = req.user!.userId;

      const lists = await boardListService.getBoardLists(boardId, userId);

      res.json({
        status: 'success',
        data: lists,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Create a new list
   */
  createBoardList = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { boardId } = req.params;
      const userId = req.user!.userId;
      const { name, color } = req.body;

      const list = await boardListService.createBoardList(boardId, userId, { name, color });

      res.status(201).json({
        status: 'success',
        data: list,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Update list
   */
  updateBoardList = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { boardId, id } = req.params;
      const userId = req.user!.userId;

      const list = await boardListService.updateBoardList(id, boardId, userId, req.body);

      res.json({
        status: 'success',
        data: list,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Delete list (archive)
   */
  deleteBoardList = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { boardId, id } = req.params;
      const userId = req.user!.userId;

      await boardListService.deleteBoardList(id, boardId, userId);

      res.json({
        status: 'success',
        message: 'List archived successfully',
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Reorder lists
   */
  reorderLists = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { boardId } = req.params;
      const userId = req.user!.userId;
      const { listIds } = req.body;

      await boardListService.reorderLists(boardId, userId, listIds);

      res.json({
        status: 'success',
        message: 'Lists reordered successfully',
      });
    } catch (error) {
      next(error);
    }
  };
}

export default new BoardController();
