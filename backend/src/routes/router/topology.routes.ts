import { Router } from 'express';
import { TopologyController } from '../../controllers/topology.controller';
import { TopologyLayoutController } from '../../controllers/topology.layout.controller';
import { SwitchConnectionController } from '../../controllers/switch.connection.controller';
import { SwitchTopologyLayoutController } from '../../controllers/switch.layout.controller';
import { authenticate, requireAdmin } from '../../middleware/auth';

const router = Router();
const topologyController = new TopologyController();
const layoutController = new TopologyLayoutController();
const switchConnectionController = new SwitchConnectionController();
const switchLayoutController = new SwitchTopologyLayoutController();

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
// SWITCH CONNECTION ROUTES
// (declared before param routes to avoid capture)
// ==========================================

// GET /api/router/topology/switch-connections - Get all switch connections
router.get('/switch-connections', switchConnectionController.getAll);

// GET /api/router/topology/switch-connections/:id - Get switch connection by ID
router.get('/switch-connections/:id', switchConnectionController.getById);

// POST /api/router/topology/switch-connections - Create switch connection
router.post('/switch-connections', authenticate, requireAdmin, switchConnectionController.create);

// PUT /api/router/topology/switch-connections/:id - Update switch connection
router.put('/switch-connections/:id', authenticate, requireAdmin, switchConnectionController.update);

// DELETE /api/router/topology/switch-connections/:id - Delete switch connection
router.delete('/switch-connections/:id', authenticate, requireAdmin, switchConnectionController.delete);

// ==========================================
// SWITCH TOPOLOGY LAYOUT ROUTES
// (declared before param routes to avoid capture)
// ==========================================

// GET /api/router/topology/switch-layout - Get all switch node positions for a company
router.get('/switch-layout', switchLayoutController.getLayout);

// GET /api/router/topology/switch-layout/available - Get switches not yet added to topology
router.get('/switch-layout/available', switchLayoutController.getAvailableSwitches);

// POST /api/router/topology/switch-layout/add - Manually add a switch to topology
router.post('/switch-layout/add', authenticate, requireAdmin, switchLayoutController.addSwitch);

// POST /api/router/topology/switch-layout/remove - Manually remove a switch from topology
router.post('/switch-layout/remove', authenticate, requireAdmin, switchLayoutController.removeSwitch);

// GET /api/router/topology/switch-layout/:switchId - Get position for a specific switch
router.get('/switch-layout/:switchId', switchLayoutController.getSwitchPosition);

// POST /api/router/topology/switch-layout - Upsert a single switch node position
router.post('/switch-layout', authenticate, requireAdmin, switchLayoutController.upsertPosition);

// POST /api/router/topology/switch-layout/bulk - Bulk upsert switch node positions
router.post('/switch-layout/bulk', authenticate, requireAdmin, switchLayoutController.bulkUpsertPositions);

// DELETE /api/router/topology/switch-layout/:switchId - Delete switch node position
router.delete('/switch-layout/:switchId', authenticate, requireAdmin, switchLayoutController.deletePosition);

// DELETE /api/router/topology/switch-layout/company/:companyId - Reset all switch positions for a company
router.delete('/switch-layout/company/:companyId', authenticate, requireAdmin, switchLayoutController.resetCompanyLayout);

// ==========================================
// TOPOLOGY LAYOUT ROUTES
// ==========================================

// GET /api/router/topology/layout - Get all node positions for a company
router.get('/layout', layoutController.getLayout);

// ==========================================
// ROUTER TOPOLOGY ADD/REMOVE
// (declared before param routes to avoid capture)
// ==========================================

// GET /api/router/topology/layout/available - Get routers not yet added to topology
router.get('/layout/available', layoutController.getAvailableRouters);

// POST /api/router/topology/layout/add - Manually add a router to topology
router.post('/layout/add', authenticate, requireAdmin, layoutController.addRouter);

// POST /api/router/topology/layout/remove - Manually remove a router from topology
router.post('/layout/remove', authenticate, requireAdmin, layoutController.removeRouter);

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
