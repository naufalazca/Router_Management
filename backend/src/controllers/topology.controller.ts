import { Request, Response, NextFunction } from 'express';
import { RouterConnectionService } from '../services/router/router.connection.service';
import { z } from 'zod';

// Validator schemas
const createConnectionSchema = z.object({
  sourceRouterId: z.string().uuid('Invalid source router ID'),
  targetRouterId: z.string().uuid('Invalid target router ID'),
  linkType: z.enum(['ETHERNET', 'FIBER', 'WIRELESS', 'VPN']).optional(),
  linkStatus: z.enum(['ACTIVE', 'INACTIVE', 'PLANNED']).optional(),
  sourceInterface: z.string().optional(),
  targetInterface: z.string().optional(),
  bandwidth: z.string().optional(),
  distance: z.number().positive().optional(),
  notes: z.string().optional()
});

const updateConnectionSchema = z.object({
  sourceRouterId: z.string().uuid().optional(),
  targetRouterId: z.string().uuid().optional(),
  linkType: z.enum(['ETHERNET', 'FIBER', 'WIRELESS', 'VPN']).optional(),
  linkStatus: z.enum(['ACTIVE', 'INACTIVE', 'PLANNED']).optional(),
  sourceInterface: z.string().optional(),
  targetInterface: z.string().optional(),
  bandwidth: z.string().optional(),
  distance: z.number().positive().optional(),
  notes: z.string().optional()
});

const connectionIdParamSchema = z.object({
  id: z.string().uuid('Invalid connection ID')
});

const companyIdParamSchema = z.object({
  companyId: z.string().uuid('Invalid company ID')
});

const routerIdParamSchema = z.object({
  routerId: z.string().uuid('Invalid router ID')
});

export class TopologyController {
  private connectionService: RouterConnectionService;

  constructor() {
    this.connectionService = new RouterConnectionService();
  }

  /**
   * GET /api/topology
   * Get all topology data (nodes and edges)
   */
  getTopology = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { companyId } = req.query;

      const topology = await this.connectionService.getTopology(
        companyId as string | undefined
      );

      res.json({
        status: 'success',
        data: topology
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /api/topology/company/:companyId
   * Get topology by company
   */
  getTopologyByCompany = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { companyId } = companyIdParamSchema.parse(req.params);

      const topology = await this.connectionService.getTopology(companyId);

      res.json({
        status: 'success',
        data: topology
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /api/topology/connections
   * Get all connections
   */
  getAllConnections = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { companyId } = req.query;

      const connections = await this.connectionService.getAllConnections(
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

  /**
   * GET /api/topology/connections/:id
   * Get connection by ID
   */
  getConnectionById = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = connectionIdParamSchema.parse(req.params);

      const connection = await this.connectionService.getConnectionById(id);

      res.json({
        status: 'success',
        data: connection
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * POST /api/topology/connections
   * Create a new connection
   */
  createConnection = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const validatedData = createConnectionSchema.parse(req.body);

      const connection = await this.connectionService.createConnection(validatedData);

      res.status(201).json({
        status: 'success',
        message: 'Connection created successfully',
        data: connection
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * PUT /api/topology/connections/:id
   * Update a connection
   */
  updateConnection = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = connectionIdParamSchema.parse(req.params);
      const validatedData = updateConnectionSchema.parse(req.body);

      const connection = await this.connectionService.updateConnection(id, validatedData);

      res.json({
        status: 'success',
        message: 'Connection updated successfully',
        data: connection
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * DELETE /api/topology/connections/:id
   * Delete a connection
   */
  deleteConnection = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = connectionIdParamSchema.parse(req.params);

      await this.connectionService.deleteConnection(id);

      res.json({
        status: 'success',
        message: 'Connection deleted successfully'
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * POST /api/topology/discover/:routerId
   * Auto-discover connections from a router
   */
  discoverConnections = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { routerId } = routerIdParamSchema.parse(req.params);

      const result = await this.connectionService.discoverConnections(routerId);

      res.json({
        status: 'success',
        data: result
      });
    } catch (error) {
      next(error);
    }
  };
}
