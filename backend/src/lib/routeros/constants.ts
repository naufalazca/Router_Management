/**
 * RouterOS API Commands and Constants
 */

/**
 * Default RouterOS API Port
 */
export const ROUTEROS_DEFAULT_PORT = 8728;
export const ROUTEROS_SSL_PORT = 8729;

/**
 * Connection Timeout (milliseconds)
 */
export const DEFAULT_TIMEOUT = 10000; // 10 seconds

/**
 * User Management Commands
 */
export const USER_COMMANDS = {
  PRINT: '/user/print',
  ADD: '/user/add',
  SET: '/user/set',
  REMOVE: '/user/remove',
  ENABLE: '/user/enable',
  DISABLE: '/user/disable',
} as const;

/**
 * System Backup Commands
 */
export const BACKUP_COMMANDS = {
  PRINT: '/system/backup/print',
  SAVE: '/system/backup/save',
  REMOVE: '/system/backup/remove',
} as const;

/**
 * File Commands
 */
export const FILE_COMMANDS = {
  PRINT: '/file/print',
  REMOVE: '/file/remove',
  GET_CONTENTS: '/file/get-contents',
} as const;

/**
 * System Info Commands
 */
export const SYSTEM_COMMANDS = {
  RESOURCE: '/system/resource/print',
  IDENTITY: '/system/identity/print',
  CLOCK: '/system/clock/print',
  ROUTERBOARD: '/system/routerboard/print',
} as const;

/**
 * Interface Commands
 */
export const INTERFACE_COMMANDS = {
  PRINT: '/interface/print',
  ENABLE: '/interface/enable',
  DISABLE: '/interface/disable',
  MONITOR: '/interface/monitor-traffic',
} as const;

/**
 * Default User Groups in RouterOS
 */
export const USER_GROUPS = {
  FULL: 'full',
  READ: 'read',
  WRITE: 'write',
} as const;

/**
 * Retry Configuration
 */
export const RETRY_CONFIG = {
  MAX_RETRIES: 3,
  RETRY_DELAY: 1000, // milliseconds
  BACKOFF_MULTIPLIER: 2,
} as const;
