import { Request, Response, NextFunction } from 'express';
import { RouterService } from '../services/router/router.service';
import { routerOSTestService } from '../services/router/router.test.service';
import { createRouterSchema, updateRouterSchema, routerIdParamSchema } from '../validators/router/router.validator';
import { z } from 'zod';

// Validator schemas for test endpoints
const testConnectionTypeSchema = z.object({
  type: z.enum(['API', 'SSH', 'BOTH']).default('BOTH'),
});

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

  // ==================== CONNECTION TEST ENDPOINTS ====================

  /**
   * Test router connection (supports API, SSH, or both)
   * GET /api/routers/:routerId/test
   * Query: type=API|SSH|BOTH (default: BOTH)
   */
  testConnection = async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const { routerId } = routerIdParamSchema.parse(_req.params);
      const { type } = testConnectionTypeSchema.parse(_req.query);

      // Route to appropriate test based on type
      if (type === 'API') {
        const result = await routerOSTestService.testAPIConnection(routerId);
        res.json({
          status: result.success ? 'success' : 'error',
          data: result,
        });
      } else if (type === 'SSH') {
        const result = await routerOSTestService.testSSHConnection(routerId);
        res.json({
          status: result.success ? 'success' : 'error',
          data: result,
        });
      } else {
        // BOTH - default
        const results = await routerOSTestService.testBothConnections(routerId);
        res.json({
          status: 'success',
          data: results,
        });
      }
    } catch (error) {
      next(error);
    }
  };

  /**
   * Test all active routers
   * POST /api/routers/test/all
   */
  testAllActiveRouters = async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const results = await routerOSTestService.testAllActiveRouters();

      res.json({
        status: 'success',
        data: results,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Get diagnostics for a failed connection
   * GET /api/routers/:routerId/test/diagnostics?type=API|SSH|BOTH
   */
  getDiagnostics = async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const { routerId } = routerIdParamSchema.parse(_req.params);
      const { type } = testConnectionTypeSchema.parse(_req.query);

      const diagnostics = await routerOSTestService.getDiagnostics(routerId, type);

      res.json({
        status: 'success',
        data: diagnostics,
      });
    } catch (error) {
      next(error);
    }
  };
}
