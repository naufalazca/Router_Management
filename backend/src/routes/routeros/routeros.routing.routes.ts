/**
 * RouterOS BGP Routing Routes
 * API endpoints for managing BGP routing on MikroTik routers
 */

import { Router } from 'express';
import * as routingController from '../../controllers/routeros/routeros.routing.controller';
import { authenticate, requireAdmin } from '../../middleware/auth';

const router = Router();

// Apply authentication and admin authorization to all BGP routing routes
router.use(authenticate);
router.use(requireAdmin);

// ============================================================================
// BGP CONNECTIONS
// ============================================================================

/**
 * @route   GET /api/routeros/:routerId/bgp/connections
 * @desc    Get all BGP connections from a router
 * @access  Private (Admin)
 */
router.get('/:routerId/bgp/connections', routingController.getBGPConnections);

/**
 * @route   GET /api/routeros/:routerId/bgp/connections/:connectionId
 * @desc    Get a specific BGP connection by ID
 * @access  Private (Admin)
 */
router.get('/:routerId/bgp/connections/:connectionId', routingController.getBGPConnectionById);

/**
 * @route   POST /api/routeros/:routerId/bgp/connections/:connectionId/enable
 * @desc    Enable a BGP connection
 * @access  Private (Admin)
 */
router.post('/:routerId/bgp/connections/:connectionId/enable', routingController.enableBGPConnection);

/**
 * @route   POST /api/routeros/:routerId/bgp/connections/:connectionId/disable
 * @desc    Disable a BGP connection
 * @access  Private (Admin)
 */
router.post('/:routerId/bgp/connections/:connectionId/disable', routingController.disableBGPConnection);

/**
 * @route   POST /api/routeros/:routerId/bgp/connections/:connectionId/reset
 * @desc    Reset a BGP connection
 * @access  Private (Admin)
 */
router.post('/:routerId/bgp/connections/:connectionId/reset', routingController.resetBGPConnection);

// ============================================================================
// BGP ADVERTISEMENTS
// ============================================================================

/**
 * @route   GET /api/routeros/:routerId/bgp/advertisements
 * @desc    Get all BGP advertisements from a router
 * @access  Private (Admin)
 */
router.get('/:routerId/bgp/advertisements', routingController.getBGPAdvertisements);

/**
 * @route   GET /api/routeros/:routerId/bgp/advertisements/filter
 * @desc    Get BGP advertisements with filters
 * @access  Private (Admin)
 * @query   prefix - Filter by prefix
 * @query   dstAddress - Filter by destination address
 * @query   fromPeer - Filter by peer
 */
router.get('/:routerId/bgp/advertisements/filter', routingController.getBGPAdvertisementsFiltered);

// ============================================================================
// BGP SESSIONS
// ============================================================================

/**
 * @route   GET /api/routeros/:routerId/bgp/sessions/stats
 * @desc    Get BGP session statistics
 * @access  Private (Admin)
 * @note    MUST be defined before /:sessionId route to avoid "stats" being treated as a sessionId
 */
router.get('/:routerId/bgp/sessions/stats', routingController.getBGPSessionStats);

/**
 * @route   GET /api/routeros/:routerId/bgp/sessions
 * @desc    Get all BGP sessions from a router
 * @access  Private (Admin)
 */
router.get('/:routerId/bgp/sessions', routingController.getBGPSessions);

/**
 * @route   GET /api/routeros/:routerId/bgp/sessions/:sessionId
 * @desc    Get a specific BGP session by ID
 * @access  Private (Admin)
 */
router.get('/:routerId/bgp/sessions/:sessionId', routingController.getBGPSessionById);

// ============================================================================
// ALL BGP DATA
// ============================================================================

/**
 * @route   GET /api/routeros/:routerId/bgp/all
 * @desc    Get all BGP data (connections, advertisements, sessions) for a router
 * @access  Private (Admin)
 */
router.get('/:routerId/bgp/all', routingController.getALLBGPData);

export default router;
