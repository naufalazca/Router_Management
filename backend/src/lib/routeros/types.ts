/**
 * RouterOS API Types
 * Type definitions for RouterOS API responses and requests
 */

/**
 * RouterOS Connection Configuration
 */
export interface RouterOSConfig {
  host: string;
  port?: number;
  username: string;
  password: string;
  timeout?: number;
}

/**
 * RouterOS User from /user/print
 */
export interface RouterOSUser {
  '.id': string;
  name: string;
  group: string;
  address?: string;
  comment?: string;
  disabled?: string; // 'true' | 'false'
  'last-logged-in'?: string;
}

/**
 * Parsed RouterOS User (cleaned up for frontend)
 */
export interface ParsedRouterUser {
  id: string;
  name: string;
  group: string;
  address?: string;
  comment?: string;
  disabled: boolean;
  lastLoggedIn?: Date;
}

/**
 * RouterOS User Create/Update Parameters
 */
export interface RouterOSUserParams {
  name: string;
  password?: string;
  group?: string;
  address?: string;
  comment?: string;
  disabled?: boolean;
}

/**
 * RouterOS Backup Info from /system/backup/print
 */
export interface RouterOSBackup {
  '.id': string;
  name: string;
  size: string;
  'creation-time': string;
}

/**
 * Parsed Backup Info
 */
export interface ParsedBackup {
  id: string;
  name: string;
  size: number;
  creationTime: Date;
}

/**
 * RouterOS Command Result
 */
export interface RouterOSCommandResult {
  success: boolean;
  data?: any[];
  error?: string;
}

/**
 * Connection Pool Entry
 */
export interface RouterConnection {
  routerId: number;
  host: string;
  username: string;
  lastUsed: Date;
  isConnected: boolean;
}
