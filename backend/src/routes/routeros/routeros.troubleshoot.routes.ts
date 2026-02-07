/**
 * RouterOS Troubleshoot Routes
 * API endpoints for troubleshooting operations on MikroTik routers
 */

import { Router } from 'express';
import * as troubleshootController from '../../controllers/routeros/routeros.troubleshoot.controller';
import { authenticate, requireAdmin } from '../../middleware/auth';

const router = Router();

// Apply authentication and admin authorization to all RouterOS troubleshoot routes
router.use(authenticate);
router.use(requireAdmin);

/**
 * @route   POST /api/routeros/:routerId/troubleshoot/ping
 * @desc    Execute ping command on a router
 * @access  Private (Admin)
 * @body    {
 *           address: string (required) - Target IP or hostname
 *           count?: number - Number of pings (1-1000, default: 4)
 *           size?: number - Packet size in bytes (1-65000, default: 64)
 *           interval?: string - Time between pings (default: "1s")
 *           timeout?: string - Timeout for each ping (default: "2s")
 *           srcAddress?: string - Source IP address
 *           routingTable?: string - Routing table to use
 *         }
 */
router.post('/:routerId/ping', troubleshootController.ping);

/**
 * @route   POST /api/routeros/:routerId/troubleshoot/traceroute
 * @desc    Execute traceroute command on a router
 * @access  Private (Admin)
 * @body    {
 *           address: string (required) - Target IP or hostname
 *           count?: number - Number of probes per hop (1-100, default: 10)
 *           timeout?: string - Timeout per probe (default: "2s")
 *           maxHops?: number - Maximum hops (1-255, default: 30)
 *           srcAddress?: string - Source IP address
 *           protocol?: "udp" | "tcp" | "icmp" - Protocol to use (default: "icmp")
 *           port?: number - Port number (required for TCP)
 *         }
 */
router.post('/:routerId/traceroute', troubleshootController.traceroute);

/**
 * @route   POST /api/routeros/:routerId/troubleshoot/ping/continuous
 * @desc    Execute continuous ping for monitoring
 * @access  Private (Admin)
 * @body    {
 *           address: string (required) - Target IP or hostname
 *           count?: number - Number of pings per iteration (1-1000, default: 4)
 *           size?: number - Packet size in bytes (1-65000, default: 64)
 *           interval?: string - Time between pings (default: "1s")
 *           timeout?: string - Timeout for each ping (default: "2s")
 *           iterations?: number - Number of iterations (1-100, default: 1)
 *           srcAddress?: string - Source IP address
 *           routingTable?: string - Routing table to use
 *         }
 */
router.post('/:routerId/ping/continuous', troubleshootController.continuousPing);

export default router;
