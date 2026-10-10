import { Request, Response, NextFunction } from 'express';
import { RouterLayoutService } from '../services/router/router.layout.topology.service';
import { z } from 'zod';

// Validator schemas
const upsertPositionSchema = z.object({
  routerId: z.string().uuid('Invalid router ID'),
  positionX: z.number().min(-10000).max(10000),
  positionY: z.number().min(-10000).max(10000),
  companyId: z.string().uuid().optional()
});

const bulkUpsertSchema = z.object({
  positions: z.array(z.object({
    routerId: z.string().uuid('Invalid router ID'),
    positionX: z.number(),
    positionY: z.number()
  })).min(1).max(100),
  companyId: z.string().uuid().optional()
});

export class TopologyLayoutController {
  private layoutService: RouterLayoutService;

  constructor() {
    this.layoutService = new RouterLayoutService();
  }

  /**
   * GET /api/router/topology/layout
   * Get all node positions for a company
   */
  getLayout = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { companyId } = req.query;

      const layout = await this.layoutService.getLayoutByCompany(
        companyId as string | undefined
      );

      res.json({
        status: 'success',
        data: layout
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /api/router/topology/layout/available
   * Get routers not yet added to the topology
   */
  getAvailableRouters = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { companyId } = req.query;

      if (!companyId || typeof companyId !== 'string') {
        res.status(400).json({
          status: 'error',
          message: 'companyId query parameter is required'
        });
        return;
      }

      const routers = await this.layoutService.getAvailableRouters(companyId);

      res.json({
        status: 'success',
        data: routers
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * POST /api/router/topology/layout/add
   * Manually add a router to the company topology
   */
  addRouter = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { routerId, companyId, positionX, positionY } = z.object({
        routerId: z.string().uuid('Invalid router ID'),
        companyId: z.string().uuid('Invalid company ID'),
        positionX: z.number().min(-10000).max(10000).optional(),
        positionY: z.number().min(-10000).max(10000).optional()
      }).parse(req.body);

      const result = await this.layoutService.addRouterToTopology(
        routerId,
        companyId,
        positionX,
        positionY
      ).catch((error: any) => {
        // Concurrent duplicate-add: unique constraint violation → conflict
        if (error?.code === 'P2002') {
          throw new Error('Router is already in the topology');
        }
        throw error;
      });

      res.status(201).json({
        status: 'success',
        message: 'Router added to topology',
        data: result
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * POST /api/router/topology/layout/remove
   * Manually remove a router from the company topology
   */
  removeRouter = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { routerId, companyId } = z.object({
        routerId: z.string().uuid('Invalid router ID'),
        companyId: z.string().uuid('Invalid company ID')
      }).parse(req.body);

      const result = await this.layoutService.removeRouterFromTopology(routerId, companyId);

      res.json({
        status: 'success',
        message: 'Router removed from topology',
        data: result
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /api/router/topology/layout/:routerId
   * Get position for a specific router
   */
  getRouterPosition = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { routerId } = req.params;
      const { companyId } = req.query;

      const position = await this.layoutService.getRouterPosition(
        routerId,
        companyId as string | undefined
      );

      if (!position) {
        res.status(404).json({
          status: 'error',
          message: 'Router position not found'
        });
        return;
      }

      res.json({
        status: 'success',
        data: position
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * POST /api/router/topology/layout
   * Upsert a single node position
   */
  upsertPosition = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const validatedData = upsertPositionSchema.parse(req.body);

      const result = await this.layoutService.upsertPosition(validatedData);

      res.status(200).json({
        status: 'success',
        message: 'Position saved successfully',
        data: result
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * POST /api/router/topology/layout/bulk
   * Bulk upsert node positions
   */
  bulkUpsertPositions = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const validatedData = bulkUpsertSchema.parse(req.body);

      const results = await this.layoutService.bulkUpsertPositions(validatedData);

      res.status(200).json({
        status: 'success',
        message: `Saved ${results.length} positions`,
        data: results
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * DELETE /api/router/topology/layout/:routerId
   * Delete node position
   */
  deletePosition = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { routerId } = req.params;
      const { companyId } = req.query;

      await this.layoutService.deletePosition(
        routerId,
        companyId as string | undefined
      );

      res.json({
        status: 'success',
        message: 'Position deleted successfully'
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * DELETE /api/router/topology/layout/company/:companyId
   * Reset all positions for a company
   */
  resetCompanyLayout = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { companyId } = req.params;

      await this.layoutService.resetCompanyLayout(companyId);

      res.json({
        status: 'success',
        message: 'All positions reset successfully'
      });
    } catch (error) {
      next(error);
    }
  };
}
