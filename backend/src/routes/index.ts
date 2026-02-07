import { Router } from 'express';
import healthRoutes from './health.routes';
import routerRoutes from './router.routes';
import userRoutes from './user.routes';
import companyRoutes from './company.routes';
import routerosUserRoutes from './routeros/routeros.user.routes';
import routerosBackupRoutes from './routeros/routeros.backup.routes';
import routerosRoutingRoutes from './routeros/routeros.routing.routes';
import routerosTroubleshootRoutes from './routeros/routeros.troubleshoot.routes';
import kanbanRoutes from './kanban/kanban.routes';

const router = Router();

// API Routes
router.use('/health', healthRoutes);
router.use('/routers', routerRoutes);
router.use('/users', userRoutes);
router.use('/companies', companyRoutes);
router.use('/routeros/users', routerosUserRoutes);
router.use('/routeros/backup', routerosBackupRoutes);
router.use('/routeros', routerosRoutingRoutes);
router.use('/routeros/troubleshoot', routerosTroubleshootRoutes);
router.use('/kanban', kanbanRoutes);

export default router;
