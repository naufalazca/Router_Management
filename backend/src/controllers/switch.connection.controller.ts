import { Request, Response, NextFunction } from 'express';
import { SwitchConnectionService } from '../services/switch/switch.connection.service';
import {
  createSwitchConnectionSchema,
  updateSwitchConnectionSchema,
  switchConnectionIdParamSchema
} from '../validators/switch/switch.connection.validator';
import { ZodError } from 'zod';

export class SwitchConnectionController {
  private switchConnectionService: SwitchConnectionService;

  constructor() {
    this.switchConnectionService = new SwitchConnectionService();
  }

  getAll = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { companyId } = req.query;
      const connections = await this.switchConnectionService.getAllSwitchConnections(
        companyId as string | undefined
      );
      res.json({
        status: 'success',
        data: connections
      });
    } catch (error) {
      next(error);
    }
  };

  getById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = switchConnectionIdParamSchema.parse(req.params);
      const conn = await this.switchConnectionService.getSwitchConnectionById(id);
      res.json({
        status: 'success',
        data: conn
      });
    } catch (error) {
      next(error);
    }
  };

  create = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const validatedData = createSwitchConnectionSchema.parse(req.body);
      const conn = await this.switchConnectionService.createSwitchConnection(validatedData);
      res.status(201).json({
        status: 'success',
        message: 'Switch connection created successfully',
        data: conn
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
      const { id } = switchConnectionIdParamSchema.parse(req.params);
      const validatedData = updateSwitchConnectionSchema.parse(req.body);
      const conn = await this.switchConnectionService.updateSwitchConnection(id, validatedData);
      res.json({
        status: 'success',
        message: 'Switch connection updated successfully',
        data: conn
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
      const { id } = switchConnectionIdParamSchema.parse(req.params);
      await this.switchConnectionService.deleteSwitchConnection(id);
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  };
}
