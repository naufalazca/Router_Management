import { Request, Response, NextFunction } from 'express';
import { RouterService } from '../services/router.service';
import { createRouterSchema, updateRouterSchema } from '../validators/router.validator';

export class RouterController {
  private routerService: RouterService;

  constructor() {
    this.routerService = new RouterService();
  }

  getAll = async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const routers = await this.routerService.getAllRouters();
      res.json({
        status: 'success',
        data: routers
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Get routers that support BGP operations
   * Only returns MikroTik routers with type UPSTREAM and status ACTIVE
   */
  getBgpRouters = async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const routers = await this.routerService.getBgpRouters();
      res.json({
        status: 'success',
        data: routers
      });
    } catch (error) {
      next(error);
    }
  };

  getById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      const router = await this.routerService.getRouterById(id);

      if (!router) {
        res.status(404).json({
          status: 'error',
          message: 'Router not found'
        });
        return;
      }

      res.json({
        status: 'success',
        data: router
      });
    } catch (error) {
      next(error);
    }
  };

  create = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const validatedData = createRouterSchema.parse(req.body);
      const router = await this.routerService.createRouter(validatedData);

      res.status(201).json({
        status: 'success',
        data: router
      });
    } catch (error) {
      next(error);
    }
  };

  update = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      const { lastSeen, ...validatedData } = updateRouterSchema.parse(req.body);

      // Transform lastSeen string to Date if present
      const updateData = {
        ...validatedData,
        ...(lastSeen && { lastSeen: new Date(lastSeen) })
      };

      const router = await this.routerService.updateRouter(id, updateData);

      if (!router) {
        res.status(404).json({
          status: 'error',
          message: 'Router not found'
        });
        return;
      }

      res.json({
        status: 'success',
        data: router
      });
    } catch (error) {
      next(error);
    }
  };

  delete = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      await this.routerService.deleteRouter(id);

      res.status(204).send();
    } catch (error) {
      next(error);
    }
  };
}
