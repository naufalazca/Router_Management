import { Router } from 'express';
import { userController } from '../controllers/user.controller';
import { authenticate, requireAdmin } from '../middleware/auth';

const router = Router();

/**
 * User Routes
 * Base path: /api/users
 */

// Authentication routes (no auth required)
router.post('/login', userController.login.bind(userController));
router.post('/verify-token', userController.verifyToken.bind(userController));

// Apply authentication and admin authorization to all user management routes
router.use(authenticate);
router.use(requireAdmin);

// User management routes
router.post('/', userController.createUser.bind(userController));
router.get('/', userController.getAllUsers.bind(userController));

// Specific routes must come before parameterized routes
router.get('/username/:username', userController.getUserByUsername.bind(userController));
router.put('/:id/password', userController.updatePassword.bind(userController));
router.delete('/:id/permanent', userController.permanentlyDeleteUser.bind(userController));

// Parameterized routes
router.get('/:id', userController.getUserById.bind(userController));
router.put('/:id', userController.updateUser.bind(userController));
router.delete('/:id', userController.deleteUser.bind(userController));

export default router;
