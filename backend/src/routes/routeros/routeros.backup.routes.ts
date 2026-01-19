import { Router } from 'express';
import { routerOSBackupController } from '../../controllers/routeros/routeros.backup.controller';

const router = Router();

/**
 * RouterOS Backup Routes
 * Base path: /api/routeros/backup
 */

// Trigger manual backup for a specific router
router.post('/:routerId/trigger', (req, res, next) =>
  routerOSBackupController.triggerBackup(req, res, next)
);

// List all backups with filters
router.get('/', (req, res, next) =>
  routerOSBackupController.listBackups(req, res, next)
);

// Get backup details by ID
router.get('/:id', (req, res, next) =>
  routerOSBackupController.getBackupById(req, res, next)
);

// Get presigned download URL
router.get('/:id/download', (req, res, next) =>
  routerOSBackupController.getDownloadUrl(req, res, next)
);

// Restore backup
router.post('/:id/restore', (req, res, next) =>
  routerOSBackupController.restoreBackup(req, res, next)
);

// Get restore history
router.get('/:id/restore-history', (req, res, next) =>
  routerOSBackupController.getRestoreHistory(req, res, next)
);

// Pin/unpin backup
router.patch('/:id/pin', (req, res, next) =>
  routerOSBackupController.togglePin(req, res, next)
);

// Delete backup
router.delete('/:id', (req, res, next) =>
  routerOSBackupController.deleteBackup(req, res, next)
);

export default router;
