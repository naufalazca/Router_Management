/**
 * RouterOS VLAN Controller
 * Handles HTTP requests for RouterOS VLAN availability checks
 */

import { Request, Response, NextFunction } from 'express';
import { routerOSGlobalVlanService } from '../../services/routeros/routeros.global.vlan.service';
import { deviceIdParamSchema } from '../../validators/routeros/routeros.vlan.validator';

/**
 * Get the VLAN availability report for a device (Router or Switch)
 * GET /api/routeros/vlan/:deviceId
 */
export async function getVlans(req: Request, res: Response, next: NextFunction) {
  try {
    const { deviceId } = deviceIdParamSchema.parse(req.params);

    const result = await routerOSGlobalVlanService.getVlanReport(deviceId);

    res.json({
      status: 'success',
      data: result,
    });
  } catch (error) {
    next(error);
  }
}
