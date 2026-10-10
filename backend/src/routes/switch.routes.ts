import { Router } from 'express';
import { SwitchController } from '../controllers/switch.controller';
import { authenticate, requireAdmin } from '../middleware/auth';

const router = Router();
const switchController = new SwitchController();

// Apply authentication and admin authorization to all switch routes
router.use(authenticate);
router.use(requireAdmin);

// GET /api/switches - Get all switches
router.get('/', switchController.getAll);

// GET /api/switches/:id - Get switch by ID
router.get('/:id', switchController.getById);

// POST /api/switches - Create new switch
router.post('/', switchController.create);

// PUT /api/switches/:id - Update switch
router.put('/:id', switchController.update);

// DELETE /api/switches/:id - Delete switch
router.delete('/:id', switchController.delete);

export default router;
