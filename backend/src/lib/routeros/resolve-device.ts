/**
 * Device credential resolver
 * Resolves RouterOS credentials for any device (Switch first, then Router)
 * so the device-agnostic services can operate on either device type.
 */

import { prisma } from '../prisma';
import { decrypt } from '../encryption';

export type DeviceType = 'router' | 'switch';

export interface ResolvedDevice {
  deviceType: DeviceType;
  id: string;
  name: string;
  ipAddress: string;
  username: string;
  password: string; // decrypted
  apiPort: number; // default 8728
  sshPort: number; // default 22
  status: string;
}

/**
 * Resolve a device by id: try the Switch table first, then the Router table.
 * Enforces an ACTIVE status and returns the decrypted password.
 */
export async function resolveDevice(deviceId: string): Promise<ResolvedDevice> {
  // 1. Try Switch first
  const sw = await prisma.switch.findUnique({
    where: { id: deviceId },
    select: {
      id: true,
      name: true,
      ipAddress: true,
      username: true,
      password: true,
      apiPort: true,
      sshPort: true,
      status: true,
    },
  });

  if (sw) {
    return {
      deviceType: 'switch',
      id: sw.id,
      name: sw.name,
      ipAddress: sw.ipAddress,
      username: sw.username,
      password: decryptPassword(sw.password, 'device'),
      apiPort: sw.apiPort || 8728,
      sshPort: sw.sshPort ?? 22,
      status: sw.status,
    };
  }

  // 2. Fall back to Router
  const router = await prisma.router.findUnique({
    where: { id: deviceId },
    select: {
      id: true,
      name: true,
      ipAddress: true,
      username: true,
      password: true,
      apiPort: true,
      sshPort: true,
      status: true,
    },
  });

  if (router) {
    return {
      deviceType: 'router',
      id: router.id,
      name: router.name,
      ipAddress: router.ipAddress,
      username: router.username,
      password: decryptPassword(router.password, 'device'),
      apiPort: router.apiPort || 8728,
      sshPort: router.sshPort ?? 22,
      status: router.status,
    };
  }

  // 3. Neither table has the id
  throw new Error(`Device not found: ${deviceId}`);
}

/**
 * Decrypt a device password with the established error handling.
 */
export function decryptPassword(encrypted: string, label: string = 'device'): string {
  try {
    return decrypt(encrypted);
  } catch (error) {
    console.error(`Failed to decrypt ${label} password:`, error);
    throw new Error(
      `Failed to decrypt ${label} password. The password may be corrupted or encryption key is incorrect.`
    );
  }
}

/**
 * Enforce the ACTIVE status guard, generalized to "Device".
 */
export function assertDeviceActive(device: Pick<ResolvedDevice, 'status' | 'name'>): void {
  if (device.status !== 'ACTIVE') {
    throw new Error(`Device is not active (status: ${device.status})`);
  }
}
