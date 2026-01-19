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
 * @route   GET /api/routeros/users/:routerId
 * @desc    Get all users from a router
 * @access  Private
 */
router.get('/:routerId', userController.getUsers);

/**
 * @route   GET /api/routeros/users/:routerId/:username
 * @desc    Get a specific user by username
 * @access  Private
 */
router.get('/:routerId/:username', userController.getUserByName);

/**
 * @route   POST /api/routeros/users/:routerId
 * @desc    Create a new user on the router
 * @access  Private
 */
router.post('/:routerId', userController.createUser);

/**
 * @route   PUT /api/routeros/users/:routerId/:userId
 * @desc    Update an existing user
 * @access  Private
 */
router.put('/:routerId/:userId', userController.updateUser);

/**
 * @route   DELETE /api/routeros/users/:routerId/:userId
 * @desc    Delete a user from the router
 * @access  Private
 */
router.delete('/:routerId/:userId', userController.deleteUser);

/**
 * @route   POST /api/routeros/users/:routerId/:userId/enable
 * @desc    Enable a user
 * @access  Private
 */
router.post('/:routerId/:userId/enable', userController.enableUser);

/**
 * @route   POST /api/routeros/users/:routerId/:userId/disable
 * @desc    Disable a user
 * @access  Private
 */
router.post('/:routerId/:userId/disable', userController.disableUser);

export default router;
