import { Router } from 'express';
import { RouterController } from '../controllers/router.controller';
import { authenticate, requireAdmin } from '../middleware/auth';

const router = Router();
const routerController = new RouterController();

// Apply authentication and admin authorization to all router routes
router.use(authenticate);
router.use(requireAdmin);

// GET /api/routers - Get all routers
router.get('/', routerController.getAll);

// GET /api/routers/bgp - Get routers that support BGP (MikroTik + Upstream + Active)
router.get('/bgp', routerController.getBgpRouters);

// GET /api/routers/:id - Get router by ID
router.get('/:id', routerController.getById);

// POST /api/routers - Create new router
router.post('/', routerController.create);

// PUT /api/routers/:id - Update router
router.put('/:id', routerController.update);

// DELETE /api/routers/:id - Delete router
router.delete('/:id', routerController.delete);

export default router;
