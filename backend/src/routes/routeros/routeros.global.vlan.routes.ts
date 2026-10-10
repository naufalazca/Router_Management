/**
 * RouterOS VLAN Routes
 * API endpoints for VLAN availability checks on MikroTik devices (Router + Switch)
 */

import { Router } from 'express';
import * as vlanController from '../../controllers/routeros/routeros.global.vlan.controller';
import { authenticate, requireAdmin } from '../../middleware/auth';

const router = Router();

// Apply authentication and admin authorization to all RouterOS VLAN routes
router.use(authenticate);
router.use(requireAdmin);

/**
 * @route   GET /api/routeros/vlan/:deviceId
 * @desc    Get the VLAN availability report for a device (bridge VLAN table,
 *          L3 VLAN interfaces, and port name + comment map)
 * @access  Private (Admin)
 */
router.get('/:deviceId', vlanController.getVlans);

export default router;
