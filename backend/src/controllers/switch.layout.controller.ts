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

export class SwitchTopologyLayoutController {
  private layoutService: SwitchLayoutService;

  constructor() {
    this.layoutService = new SwitchLayoutService();
  }

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
      const { switchId } = req.params;
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
      const { switchId } = req.params;
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
      const { companyId } = req.params;

      await this.layoutService.resetCompanyLayout(companyId);

      res.json({
        status: 'success',
        message: 'All switch positions reset successfully'
      });
    } catch (error) {
      next(error);
    }
  };
}
