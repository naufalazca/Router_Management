import { Router } from 'express';
import { userController } from '../controllers/user.controller';

const router = Router();

/**
 * User Routes
 * Base path: /api/users
 */

// Authentication routes
router.post('/login', userController.login.bind(userController));
router.post('/verify-token', userController.verifyToken.bind(userController));

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
