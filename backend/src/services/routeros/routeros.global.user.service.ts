/**
 * RouterOS User Management Service (device-agnostic)
 * Handles user-related operations on any RouterOS device (Router or Switch)
 */

import { RouterOSClient } from '../../lib/routeros/client';
import { USER_COMMANDS } from '../../lib/routeros/constants';
import { resolveDevice, assertDeviceActive } from '../../lib/routeros/resolve-device';
import type {
  RouterOSUser,
  ParsedRouterUser,
  RouterOSUserParams,
} from '../../lib/routeros/types';

export class RouterOSGlobalUserService {
  /**
   * Resolve device credentials and create an API client
   */
  private async getDeviceClient(deviceId: string): Promise<RouterOSClient> {
    const device = await resolveDevice(deviceId);
    assertDeviceActive(device);

    const client = new RouterOSClient({
      host: device.ipAddress,
      port: device.apiPort,
      username: device.username,
      password: device.password,
    });
    await client.connect();

    return client;
  }

  /**
   * Parse RouterOS user data to frontend-friendly format
   */
  private parseRouterUser(user: RouterOSUser): ParsedRouterUser {
    return {
      id: user['.id'],
      name: user.name,
      group: user.group,
      address: user.address,
      comment: user.comment,
      disabled: user.disabled === 'true',
      lastLoggedIn: user['last-logged-in'] ? new Date(user['last-logged-in']) : undefined,
    };
  }

  /**
   * Fetch all users from a router
   */
  async getUsers(routerId: string): Promise<ParsedRouterUser[]> {
    let client: RouterOSClient | null = null;

    try {
      client = await this.getDeviceClient(routerId);

      const result = await client.executeWithRetry(USER_COMMANDS.PRINT);

      if (!result.success) {
        throw new Error(`Failed to fetch users: ${result.error}`);
      }

      const users = (result.data || []) as RouterOSUser[];
      return users.map(user => this.parseRouterUser(user));
    } finally {
      if (client) {
        await client.disconnect();
      }
    }
  }

  /**
   * Get a specific user by name
   */
  async getUserByName(routerId: string, username: string): Promise<ParsedRouterUser | null> {
    let client: RouterOSClient | null = null;

    try {
      client = await this.getDeviceClient(routerId);

      const result = await client.executeWithRetry(USER_COMMANDS.PRINT, {
        '?name': username,
      });

      if (!result.success) {
        throw new Error(`Failed to fetch user: ${result.error}`);
      }

      const users = (result.data || []) as RouterOSUser[];
      return users.length > 0 ? this.parseRouterUser(users[0]) : null;
    } finally {
      if (client) {
        await client.disconnect();
      }
    }
  }

  /**
   * Create a new user on the router
   */
  async createUser(routerId: string, params: RouterOSUserParams): Promise<ParsedRouterUser> {
    let client: RouterOSClient | null = null;

    try {
      if (!params.name || !params.password) {
        throw new Error('Username and password are required');
      }

      client = await this.getDeviceClient(routerId);

      // Build command parameters
      const cmdParams: Record<string, any> = {
        name: params.name,
        password: params.password,
      };

      if (params.group) cmdParams.group = params.group;
      if (params.address) cmdParams.address = params.address;
      if (params.comment) cmdParams.comment = params.comment;
      if (params.disabled !== undefined) cmdParams.disabled = params.disabled ? 'yes' : 'no';

      const result = await client.executeWithRetry(USER_COMMANDS.ADD, cmdParams);

      if (!result.success) {
        throw new Error(`Failed to create user: ${result.error}`);
      }

      // Fetch the created user
      const user = await this.getUserByName(routerId, params.name);
      if (!user) {
        throw new Error('User created but could not be retrieved');
      }

      return user;
    } finally {
      if (client) {
        await client.disconnect();
      }
    }
  }

  /**
   * Update an existing user
   */
  async updateUser(
    routerId: string,
    userId: string,
    params: Partial<RouterOSUserParams>
  ): Promise<ParsedRouterUser> {
    let client: RouterOSClient | null = null;

    try {
      client = await this.getDeviceClient(routerId);

      // Build command parameters
      const cmdParams: Record<string, any> = {
        '.id': userId,
      };

      if (params.name) cmdParams.name = params.name;
      if (params.password) cmdParams.password = params.password;
      if (params.group) cmdParams.group = params.group;
      if (params.address) cmdParams.address = params.address;
      if (params.comment) cmdParams.comment = params.comment;
      if (params.disabled !== undefined) cmdParams.disabled = params.disabled ? 'yes' : 'no';

      const result = await client.executeWithRetry(USER_COMMANDS.SET, cmdParams);

      if (!result.success) {
        throw new Error(`Failed to update user: ${result.error}`);
      }

      // Fetch the updated user
      const fetchResult = await client.executeWithRetry(USER_COMMANDS.PRINT, {
        '?.id': userId,
      });

      if (!fetchResult.success || !fetchResult.data || fetchResult.data.length === 0) {
        throw new Error('User updated but could not be retrieved');
      }

      return this.parseRouterUser(fetchResult.data[0] as RouterOSUser);
    } finally {
      if (client) {
        await client.disconnect();
      }
    }
  }

  /**
   * Delete a user from the router
   */
  async deleteUser(routerId: string, userId: string): Promise<void> {
    let client: RouterOSClient | null = null;

    try {
      client = await this.getDeviceClient(routerId);

      const result = await client.executeWithRetry(USER_COMMANDS.REMOVE, {
        '.id': userId,
      });

      if (!result.success) {
        throw new Error(`Failed to delete user: ${result.error}`);
      }
    } finally {
      if (client) {
        await client.disconnect();
      }
    }
  }

  /**
   * Enable a user
   */
  async enableUser(routerId: string, userId: string): Promise<ParsedRouterUser> {
    return this.updateUser(routerId, userId, { disabled: false });
  }

  /**
   * Disable a user
   */
  async disableUser(routerId: string, userId: string): Promise<ParsedRouterUser> {
    return this.updateUser(routerId, userId, { disabled: true });
  }
}

// Export singleton instance
export const routerOSGlobalUserService = new RouterOSGlobalUserService();
