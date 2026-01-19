import { Router } from 'express';
import { HealthController } from '../controllers/health.controller';

const router = Router();
const healthController = new HealthController();

// GET /api/health - Health check endpoint
router.get('/', healthController.check);

export default router;
