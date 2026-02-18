import { Request, Response } from 'express';
import { ipinfoService } from '../services/ipinfo/ipinfo.service';
import { ipParamSchema } from '../validators/ipinfo.validator';

export const ipinfoController = {
  /**
   * Get IP information
   * GET /api/ipinfo/ip/:ip
   */
  async getIPInfo(req: Request, res: Response): Promise<void> {
    try {
      const { ip } = ipParamSchema.parse({ ip: req.params.ip });
      const result = await ipinfoService.getIPInfo(ip);

      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      if (error instanceof Error && error.name === 'ZodError') {
        res.status(400).json({
          success: false,
          error: error.message
        });
        return;
      }
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get IP info'
      });
    }
  }
};
