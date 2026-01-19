/**
 * RouterOS User Controller
 * Handles HTTP requests for RouterOS user management operations
 */

import { Request, Response, NextFunction } from 'express';
import { routerOSUserService } from '../../services/routeros/routeros.user.service';
import {
  routerIdParamSchema,
  routerUserIdParamsSchema,
  createUserSchema,
  updateUserSchema,
} from '../../validators/routeros/routeros.user.validator';

/**
 * Get all users from a router
 * GET /api/routeros/:routerId/users
 */
export async function getUsers(req: Request, res: Response, next: NextFunction) {
  try {
    const { routerId } = routerIdParamSchema.parse(req.params);

    const users = await routerOSUserService.getUsers(routerId);

    res.json({
      status: 'success',
      data: users,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Get a specific user by name
 * GET /api/routeros/:routerId/users/:username
 */
export async function getUserByName(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { routerId } = routerIdParamSchema.parse(req.params);
    const { username } = req.params;

    if (!username) {
      res.status(400).json({
        status: 'error',
        message: 'Username is required',
      });
      return;
    }

    const user = await routerOSUserService.getUserByName(routerId, username);

    if (!user) {
      res.status(404).json({
        status: 'error',
        message: `User '${username}' not found`,
      });
      return;
    }

    res.json({
      status: 'success',
      data: user,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Create a new user on the router
 * POST /api/routeros/:routerId/users
 */
export async function createUser(req: Request, res: Response, next: NextFunction) {
  try {
    const { routerId } = routerIdParamSchema.parse(req.params);
    const userData = createUserSchema.parse(req.body);

    const user = await routerOSUserService.createUser(routerId, userData);

    res.status(201).json({
      status: 'success',
      data: user,
      message: `User '${user.name}' created successfully`,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Update an existing user
 * PUT /api/routeros/:routerId/users/:userId
 */
export async function updateUser(req: Request, res: Response, next: NextFunction) {
  try {
    const { routerId, userId } = routerUserIdParamsSchema.parse(req.params);
    const userData = updateUserSchema.parse(req.body);

    const user = await routerOSUserService.updateUser(routerId, userId, userData);

    res.json({
      status: 'success',
      data: user,
      message: `User updated successfully`,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Delete a user from the router
 * DELETE /api/routeros/:routerId/users/:userId
 */
export async function deleteUser(req: Request, res: Response, next: NextFunction) {
  try {
    const { routerId, userId } = routerUserIdParamsSchema.parse(req.params);

    await routerOSUserService.deleteUser(routerId, userId);

    res.json({
      status: 'success',
      message: 'User deleted successfully',
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Enable a user
 * POST /api/routeros/:routerId/users/:userId/enable
 */
export async function enableUser(req: Request, res: Response, next: NextFunction) {
  try {
    const { routerId, userId } = routerUserIdParamsSchema.parse(req.params);

    const user = await routerOSUserService.enableUser(routerId, userId);

    res.json({
      status: 'success',
      data: user,
      message: `User '${user.name}' enabled successfully`,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Disable a user
 * POST /api/routeros/:routerId/users/:userId/disable
 */
export async function disableUser(req: Request, res: Response, next: NextFunction) {
  try {
    const { routerId, userId } = routerUserIdParamsSchema.parse(req.params);

    const user = await routerOSUserService.disableUser(routerId, userId);

    res.json({
      status: 'success',
      data: user,
      message: `User '${user.name}' disabled successfully`,
    });
  } catch (error) {
    next(error);
  }
}
