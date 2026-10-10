/**
 * RouterOS Troubleshoot Controller
 * Handles HTTP requests for RouterOS troubleshooting operations
 */

import { Request, Response, NextFunction } from 'express';
import { routerOSGlobalTroubleshootService } from '../../services/routeros/routeros.global.troubleshoot.service';
import {
  routerIdParamSchema,
  pingRequestSchema,
  tracerouteRequestSchema,
  continuousPingRequestSchema,
} from '../../validators/routeros/routeros.troubleshoot.validator';

/**
 * Execute ping command on a router
 * POST /api/routeros/:routerId/troubleshoot/ping
 */
export async function ping(req: Request, res: Response, next: NextFunction) {
  try {
    const { routerId } = routerIdParamSchema.parse(req.params);
    const pingParams = pingRequestSchema.parse(req.body);

    const result = await routerOSGlobalTroubleshootService.ping(routerId, pingParams);

    res.json({
      status: 'success',
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Execute traceroute command on a router
 * POST /api/routeros/:routerId/troubleshoot/traceroute
 */
export async function traceroute(req: Request, res: Response, next: NextFunction) {
  try {
    const { routerId } = routerIdParamSchema.parse(req.params);
    const tracerouteParams = tracerouteRequestSchema.parse(req.body);

    const result = await routerOSGlobalTroubleshootService.traceroute(routerId, tracerouteParams);

    res.json({
      status: 'success',
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Execute continuous ping on a router
 * POST /api/routeros/:routerId/troubleshoot/ping/continuous
 */
export async function continuousPing(req: Request, res: Response, next: NextFunction) {
  try {
    const { routerId } = routerIdParamSchema.parse(req.params);
    const { iterations = 1, ...pingParams } = continuousPingRequestSchema.parse(req.body);

    const result = await routerOSGlobalTroubleshootService.continuousPing(routerId, pingParams, iterations);

    res.json({
      status: 'success',
      data: result,
      count: result.length,
    });
  } catch (error) {
    next(error);
  }
}
