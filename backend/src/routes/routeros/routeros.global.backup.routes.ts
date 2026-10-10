import { Router } from 'express';
import { routerOSGlobalBackupController } from '../../controllers/routeros/routeros.global.backup.controller';
import { authenticate, requireAdmin } from '../../middleware/auth';

const router = Router();

/**
 * RouterOS Backup Routes
 * Base path: /api/routeros/backup
 */

// Apply authentication and admin authorization to all RouterOS backup routes
router.use(authenticate);
router.use(requireAdmin);

// Trigger manual backup for a specific router
router.post('/:routerId/trigger', (req, res, next) =>
  routerOSGlobalBackupController.triggerBackup(req, res, next)
);

// List all backups with filters
router.get('/', (req, res, next) =>
  routerOSGlobalBackupController.listBackups(req, res, next)
);

// Get backup details by ID
router.get('/:id', (req, res, next) =>
  routerOSGlobalBackupController.getBackupById(req, res, next)
);

// Get presigned download URL
router.get('/:id/download', (req, res, next) =>
  routerOSGlobalBackupController.getDownloadUrl(req, res, next)
);

// Restore backup
router.post('/:id/restore', (req, res, next) =>
  routerOSGlobalBackupController.restoreBackup(req, res, next)
);

// Get restore history
router.get('/:id/restore-history', (req, res, next) =>
  routerOSGlobalBackupController.getRestoreHistory(req, res, next)
);

// Pin/unpin backup
router.patch('/:id/pin', (req, res, next) =>
  routerOSGlobalBackupController.togglePin(req, res, next)
);

// Delete backup
router.delete('/:id', (req, res, next) =>
  routerOSGlobalBackupController.deleteBackup(req, res, next)
);

export default router;
