import { Request, Response, NextFunction } from 'express';
import { SwitchService } from '../services/switch/switch.service';
import { createSwitchSchema, updateSwitchSchema, switchIdParamSchema } from '../validators/switch/switch.validator';
import { ZodError } from 'zod';

export class SwitchController {
  private switchService: SwitchService;

  constructor() {
    this.switchService = new SwitchService();
  }

  getAll = async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const switches = await this.switchService.getAllSwitches();
      res.json({
        status: 'success',
        data: switches
      });
    } catch (error) {
      next(error);
    }
  };

  getById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = switchIdParamSchema.parse(req.params);
      const sw = await this.switchService.getSwitchById(id);

      if (!sw) {
        res.status(404).json({
          status: 'error',
          message: 'Switch not found'
        });
        return;
      }

      res.json({
        status: 'success',
        data: sw
      });
    } catch (error) {
      next(error);
    }
  };

  create = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const validatedData = createSwitchSchema.parse(req.body);

      // Validate referenced company exists
      const companyExists = await this.switchService.companyExists(validatedData.companyId);
      if (!companyExists) {
        res.status(404).json({
          status: 'error',
          message: 'Company not found'
        });
        return;
      }

      const sw = await this.switchService.createSwitch(validatedData);

      res.status(201).json({
        status: 'success',
        data: sw
      });
    } catch (error) {
      if (error instanceof ZodError) {
        res.status(400).json({
          status: 'error',
          message: 'Validation error',
          errors: error.errors
        });
        return;
      }
      next(error);
    }
  };

  update = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = switchIdParamSchema.parse(req.params);
      const validatedData = updateSwitchSchema.parse(req.body);

      const existing = await this.switchService.getSwitchById(id);
      if (!existing) {
        res.status(404).json({
          status: 'error',
          message: 'Switch not found'
        });
        return;
      }

      if (validatedData.companyId) {
        const companyExists = await this.switchService.companyExists(validatedData.companyId);
        if (!companyExists) {
          res.status(404).json({
            status: 'error',
            message: 'Company not found'
          });
          return;
        }
      }

      const sw = await this.switchService.updateSwitch(id, validatedData);

      res.json({
        status: 'success',
        data: sw
      });
    } catch (error) {
      if (error instanceof ZodError) {
        res.status(400).json({
          status: 'error',
          message: 'Validation error',
          errors: error.errors
        });
        return;
      }
      next(error);
    }
  };

  delete = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = switchIdParamSchema.parse(req.params);

      const existing = await this.switchService.getSwitchById(id);
      if (!existing) {
        res.status(404).json({
          status: 'error',
          message: 'Switch not found'
        });
        return;
      }

      await this.switchService.deleteSwitch(id);

      res.status(204).send();
    } catch (error) {
      next(error);
    }
  };
}
