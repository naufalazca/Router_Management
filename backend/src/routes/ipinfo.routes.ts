import { Router } from 'express';
import { ipinfoController } from '../controllers/ipinfo.controller';

const router = Router();

/**
 * @route   GET /api/ipinfo/ip/:ip
 * @desc    Get IP information
 * @access  Public
 * @param   ip - IP address (e.g., "8.8.8.8")
 */
router.get('/ip/:ip', ipinfoController.getIPInfo);

export default router;
