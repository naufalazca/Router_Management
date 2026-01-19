import { Router } from 'express';
import { RouterController } from '../controllers/router.controller';

const router = Router();
const routerController = new RouterController();

// GET /api/routers - Get all routers
router.get('/', routerController.getAll);

// GET /api/routers/:id - Get router by ID
router.get('/:id', routerController.getById);

// POST /api/routers - Create new router
router.post('/', routerController.create);

// PUT /api/routers/:id - Update router
router.put('/:id', routerController.update);

// DELETE /api/routers/:id - Delete router
router.delete('/:id', routerController.delete);

export default router;
