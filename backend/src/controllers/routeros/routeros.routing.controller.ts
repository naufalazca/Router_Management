/**
 * RouterOS BGP Routing Controller
 * Handles HTTP requests for BGP routing operations
 */

import { Request, Response, NextFunction } from 'express';
import { routerOSRoutingService } from '../../services/routeros/routeros.routing.service';

/**
 * Get all BGP connections from a router
 * GET /api/routeros/:routerId/bgp/connections
 */
export async function getBGPConnections(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { routerId } = req.params;

    const connections = await routerOSRoutingService.getBGPConnections(routerId);

    res.json({
      status: 'success',
      data: connections,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Get a specific BGP connection by ID
 * GET /api/routeros/:routerId/bgp/connections/:connectionId
 */
export async function getBGPConnectionById(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { routerId } = req.params;
    const { connectionId } = req.params;

    const connection = await routerOSRoutingService.getBGPConnectionById(routerId, connectionId);

    if (!connection) {
      res.status(404).json({
        status: 'error',
        message: 'BGP connection not found',
      });
      return;
    }

    res.json({
      status: 'success',
      data: connection,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Enable a BGP connection
 * POST /api/routeros/:routerId/bgp/connections/:connectionId/enable
 */
export async function enableBGPConnection(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { routerId } = req.params;
    const { connectionId } = req.params;

    await routerOSRoutingService.enableBGPConnection(routerId, connectionId);

    res.json({
      status: 'success',
      message: 'BGP connection enabled successfully',
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Disable a BGP connection
 * POST /api/routeros/:routerId/bgp/connections/:connectionId/disable
 */
export async function disableBGPConnection(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { routerId } = req.params;
    const { connectionId } = req.params;

    await routerOSRoutingService.disableBGPConnection(routerId, connectionId);

    res.json({
      status: 'success',
      message: 'BGP connection disabled successfully',
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Reset a BGP connection
 * POST /api/routeros/:routerId/bgp/connections/:connectionId/reset
 */
export async function resetBGPConnection(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { routerId } = req.params;
    const { connectionId } = req.params;

    await routerOSRoutingService.resetBGPConnection(routerId, connectionId);

    res.json({
      status: 'success',
      message: 'BGP connection reset successfully',
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Get all BGP advertisements from a router
 * GET /api/routeros/:routerId/bgp/advertisements
 */
export async function getBGPAdvertisements(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { routerId } = req.params;

    const advertisements = await routerOSRoutingService.getBGPAdvertisements(routerId);

    res.json({
      status: 'success',
      data: advertisements,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Get BGP advertisements with filters
 * GET /api/routeros/:routerId/bgp/advertisements/filter
 */
export async function getBGPAdvertisementsFiltered(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { routerId } = req.params;
    const { prefix, dstAddress, fromPeer } = req.query;

    const advertisements = await routerOSRoutingService.getBGPAdvertisementsFiltered(routerId, {
      prefix: prefix as string | undefined,
      dstAddress: dstAddress as string | undefined,
      fromPeer: fromPeer as string | undefined,
    });

    res.json({
      status: 'success',
      data: advertisements,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Get all BGP sessions from a router
 * GET /api/routeros/:routerId/bgp/sessions
 */
export async function getBGPSessions(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { routerId } = req.params;

    const sessions = await routerOSRoutingService.getBGPSessions(routerId);

    res.json({
      status: 'success',
      data: sessions,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Get a specific BGP session by ID
 * GET /api/routeros/:routerId/bgp/sessions/:sessionId
 */
export async function getBGPSessionById(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { routerId } = req.params;
    const { sessionId } = req.params;

    const session = await routerOSRoutingService.getBGPSessionById(routerId, sessionId);

    if (!session) {
      res.status(404).json({
        status: 'error',
        message: 'BGP session not found',
      });
      return;
    }

    res.json({
      status: 'success',
      data: session,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Get all BGP data (connections, advertisements, sessions) for a router
 * GET /api/routeros/:routerId/bgp/all
 */
export async function getALLBGPData(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { routerId } = req.params;

    const data = await routerOSRoutingService.getALLBGPData(routerId);

    res.json({
      status: 'success',
      data: data,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Get BGP session statistics
 * GET /api/routeros/:routerId/bgp/sessions/stats
 */
export async function getBGPSessionStats(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { routerId } = req.params;

    const stats = await routerOSRoutingService.getBGPSessionStats(routerId);

    res.json({
      status: 'success',
      data: stats,
    });
  } catch (error) {
    next(error);
  }
}
