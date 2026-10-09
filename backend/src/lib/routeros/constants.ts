/**
 * RouterOS API Commands and Constants
 */

/**
 * Default RouterOS API Port
 */
export const ROUTEROS_DEFAULT_PORT = 8728;

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
 * Retry Configuration
 */
export const RETRY_CONFIG = {
  MAX_RETRIES: 3,
  RETRY_DELAY: 1000, // milliseconds
  BACKOFF_MULTIPLIER: 2,
} as const;

/**
 * Troubleshooting Commands
 */
export const TROUBLESHOOT_COMMANDS = {
  PING: '/ping',
  TRACEROUTE: '/tool traceroute',
} as const;

/**
 * Default Troubleshooting Parameters
 */
export const TROUBLESHOOT_DEFAULTS = {
  PING: {
    COUNT: 4,
    INTERVAL: '1000', // milliseconds (MikroTik uses ms without suffix)
    SIZE: 64,
  },
  TRACEROUTE: {
    COUNT: 10,
    MAX_HOPS: 30,
  },
} as const;
