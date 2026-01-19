/**
 * RouterOS User Routes
 * API endpoints for managing users on MikroTik routers
 */

import { Router } from 'express';
import * as userController from '../../controllers/routeros/routeros.user.controller';

const router = Router();

// TODO: Add authentication middleware when available
// All routes should require authentication in production

/**
 * @route   GET /api/routeros/:routerId/users
 * @desc    Get all users from a router
 * @access  Private
 */
router.get('/:routerId/users', userController.getUsers);

/**
 * @route   GET /api/routeros/:routerId/users/:username
 * @desc    Get a specific user by username
 * @access  Private
 */
router.get('/:routerId/users/:username', userController.getUserByName);

/**
 * @route   POST /api/routeros/:routerId/users
 * @desc    Create a new user on the router
 * @access  Private
 */
router.post('/:routerId/users', userController.createUser);

/**
 * @route   PUT /api/routeros/:routerId/users/:userId
 * @desc    Update an existing user
 * @access  Private
 */
router.put('/:routerId/users/:userId', userController.updateUser);

/**
 * @route   DELETE /api/routeros/:routerId/users/:userId
 * @desc    Delete a user from the router
 * @access  Private
 */
router.delete('/:routerId/users/:userId', userController.deleteUser);

/**
 * @route   POST /api/routeros/:routerId/users/:userId/enable
 * @desc    Enable a user
 * @access  Private
 */
router.post('/:routerId/users/:userId/enable', userController.enableUser);

/**
 * @route   POST /api/routeros/:routerId/users/:userId/disable
 * @desc    Disable a user
 * @access  Private
 */
router.post('/:routerId/users/:userId/disable', userController.disableUser);

export default router;
