import { Request, Response, NextFunction } from 'express';
import { SwitchLayoutService } from '../services/switch/switch.layout.topology.service';
import { z } from 'zod';

// Validator schemas
const upsertPositionSchema = z.object({
  switchId: z.string().uuid('Invalid switch ID'),
  positionX: z.number().min(-10000).max(10000),
  positionY: z.number().min(-10000).max(10000),
  companyId: z.string().uuid().optional()
});

const bulkUpsertSchema = z.object({
  positions: z.array(z.object({
    switchId: z.string().uuid('Invalid switch ID'),
    positionX: z.number(),
    positionY: z.number()
  })).min(1).max(100),
  companyId: z.string().uuid().optional()
});

const switchIdParamSchema = z.object({
  switchId: z.string().uuid('Invalid switch ID')
});

const companyIdParamSchema = z.object({
  companyId: z.string().uuid('Invalid company ID')
});

export class SwitchTopologyLayoutController {
  private layoutService: SwitchLayoutService;

  constructor() {
    this.layoutService = new SwitchLayoutService();
  }

  /**
   * GET /api/router/topology/switch-layout/available
   * Get switches of a company not yet added to the topology
   */
  getAvailableSwitches = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { companyId } = req.query;

      if (!companyId || typeof companyId !== 'string') {
        res.status(400).json({
          status: 'error',
          message: 'companyId query parameter is required'
        });
        return;
      }

      const switches = await this.layoutService.getAvailableSwitches(companyId);

      res.json({
        status: 'success',
        data: switches
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * POST /api/router/topology/switch-layout/add
   * Manually add a switch to the company topology
   */
  addSwitch = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { switchId, companyId, positionX, positionY } = z.object({
        switchId: z.string().uuid('Invalid switch ID'),
        companyId: z.string().uuid('Invalid company ID'),
        positionX: z.number().min(-10000).max(10000).optional(),
        positionY: z.number().min(-10000).max(10000).optional()
      }).parse(req.body);

      const result = await this.layoutService.addSwitchToTopology(
        switchId,
        companyId,
        positionX,
        positionY
      ).catch((error: any) => {
        // Concurrent duplicate-add: unique constraint violation → conflict
        if (error?.code === 'P2002') {
          throw new Error('Switch is already in the topology');
        }
        throw error;
      });

      res.status(201).json({
        status: 'success',
        message: 'Switch added to topology',
        data: result
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * POST /api/router/topology/switch-layout/remove
   * Manually remove a switch from the company topology
   */
  removeSwitch = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { switchId, companyId } = z.object({
        switchId: z.string().uuid('Invalid switch ID'),
        companyId: z.string().uuid('Invalid company ID')
      }).parse(req.body);

      const result = await this.layoutService.removeSwitchFromTopology(switchId, companyId);

      res.json({
        status: 'success',
        message: 'Switch removed from topology',
        data: result
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /api/router/topology/switch-layout
   * Get all switch node positions for a company
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
   * GET /api/router/topology/switch-layout/:switchId
   * Get position for a specific switch
   */
  getSwitchPosition = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const parsed = switchIdParamSchema.safeParse(req.params);
      if (!parsed.success) {
        res.status(400).json({
          status: 'error',
          message: parsed.error.issues[0]?.message || 'Invalid switch ID'
        });
        return;
      }
      const { switchId } = parsed.data;
      const { companyId } = req.query;

      const position = await this.layoutService.getSwitchPosition(
        switchId,
        companyId as string | undefined
      );

      if (!position) {
        res.status(404).json({
          status: 'error',
          message: 'Switch position not found'
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
   * POST /api/router/topology/switch-layout
   * Upsert a single switch node position
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
   * POST /api/router/topology/switch-layout/bulk
   * Bulk upsert switch node positions
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
   * DELETE /api/router/topology/switch-layout/:switchId
   * Delete switch node position
   */
  deletePosition = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const parsed = switchIdParamSchema.safeParse(req.params);
      if (!parsed.success) {
        res.status(400).json({
          status: 'error',
          message: parsed.error.issues[0]?.message || 'Invalid switch ID'
        });
        return;
      }
      const { switchId } = parsed.data;
      const { companyId } = req.query;

      await this.layoutService.deletePosition(
        switchId,
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
   * DELETE /api/router/topology/switch-layout/company/:companyId
   * Reset all switch positions for a company
   */
  resetCompanyLayout = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const parsed = companyIdParamSchema.safeParse(req.params);
      if (!parsed.success) {
        res.status(400).json({
          status: 'error',
          message: parsed.error.issues[0]?.message || 'Invalid company ID'
        });
        return;
      }

      await this.layoutService.resetCompanyLayout(parsed.data.companyId);

      res.json({
        status: 'success',
        message: 'All switch positions reset successfully'
      });
    } catch (error) {
      next(error);
    }
  };
}
