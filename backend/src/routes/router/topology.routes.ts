import { Router } from 'express';
import { TopologyController } from '../../controllers/topology.controller';
import { TopologyLayoutController } from '../../controllers/topology.layout.controller';
import { authenticate, requireAdmin } from '../../middleware/auth';

const router = Router();
const topologyController = new TopologyController();
const layoutController = new TopologyLayoutController();

// Apply authentication to all topology routes
router.use(authenticate);

// GET /api/router/topology - Get all topology data (nodes and edges)
router.get('/', topologyController.getTopology);

// GET /api/router/topology/company/:companyId - Get topology by company
router.get('/company/:companyId', topologyController.getTopologyByCompany);

// POST /api/router/topology/connections - Create manual connection
// Note: Only requires authentication, not admin - users can create connections for their company's routers
router.post('/connections', topologyController.createConnection);

// PUT /api/router/topology/connections/:id - Update connection
router.put('/connections/:id', authenticate, requireAdmin, topologyController.updateConnection);

// DELETE /api/router/topology/connections/:id - Delete connection
router.delete('/connections/:id', authenticate, requireAdmin, topologyController.deleteConnection);

// GET /api/router/topology/connections/:id - Get connection by ID
router.get('/connections/:id', topologyController.getConnectionById);

// GET /api/router/topology/connections - Get all connections
router.get('/connections', topologyController.getAllConnections);

// POST /api/router/topology/discover/:routerId - Auto-discover connections from router
router.post('/discover/:routerId', authenticate, requireAdmin, topologyController.discoverConnections);

// ==========================================
// TOPOLOGY LAYOUT ROUTES
// ==========================================

// GET /api/router/topology/layout - Get all node positions for a company
router.get('/layout', layoutController.getLayout);

// GET /api/router/topology/layout/:routerId - Get position for a specific router
router.get('/layout/:routerId', layoutController.getRouterPosition);

// POST /api/router/topology/layout - Upsert a single node position
router.post('/layout', layoutController.upsertPosition);

// POST /api/router/topology/layout/bulk - Bulk upsert node positions
router.post('/layout/bulk', layoutController.bulkUpsertPositions);

// DELETE /api/router/topology/layout/:routerId - Delete node position
router.delete('/layout/:routerId', layoutController.deletePosition);

// DELETE /api/router/topology/layout/company/:companyId - Reset all positions for a company
router.delete('/layout/company/:companyId', layoutController.resetCompanyLayout);

export default router;
