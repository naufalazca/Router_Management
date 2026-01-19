/**
 * RouterOS API Client
 * Low-level wrapper for node-routeros library
 */

import { RouterOSAPI } from 'node-routeros';
import type { RouterOSConfig, RouterOSCommandResult } from './types';
import { DEFAULT_TIMEOUT, ROUTEROS_DEFAULT_PORT, RETRY_CONFIG } from './constants';

export class RouterOSClient {
  private api: RouterOSAPI;
  private config: RouterOSConfig;
  private connected: boolean = false;

  constructor(config: RouterOSConfig) {
    this.config = {
      ...config,
      port: config.port || ROUTEROS_DEFAULT_PORT,
      timeout: config.timeout || DEFAULT_TIMEOUT,
    };
    this.api = new RouterOSAPI({
      host: this.config.host,
      user: this.config.username,
      password: this.config.password,
      port: this.config.port,
      timeout: this.config.timeout,
    });
  }

  /**
   * Connect to RouterOS device
   */
  async connect(): Promise<void> {
    if (this.connected) {
      return;
    }

    try {
      console.log(`Attempting to connect to RouterOS at ${this.config.host}:${this.config.port}`);
      await this.api.connect();
      this.connected = true;
      console.log(`Successfully connected to RouterOS at ${this.config.host}:${this.config.port}`);
    } catch (error) {
      this.connected = false;
      console.error('RouterOS connection error:', error);
      const errorMsg = error instanceof Error ? error.message : JSON.stringify(error);
      throw new Error(`Failed to connect to RouterOS at ${this.config.host}:${this.config.port} - ${errorMsg}`);
    }
  }

  /**
   * Disconnect from RouterOS device
   */
  async disconnect(): Promise<void> {
    if (!this.connected) {
      return;
    }

    try {
      await this.api.close();
      this.connected = false;
    } catch (error) {
      console.error('Error disconnecting from RouterOS:', error);
    }
  }

  /**
   * Check if client is connected
   */
  isConnected(): boolean {
    return this.connected;
  }

  /**
   * Execute a RouterOS command
   * @param command - RouterOS API command path (e.g., '/user/print')
   * @param params - Command parameters
   */
  async execute(command: string, params?: Record<string, any>): Promise<RouterOSCommandResult> {
    if (!this.connected) {
      throw new Error('Not connected to RouterOS. Call connect() first.');
    }

    try {
      // Convert object params to RouterOS API format
      // node-routeros expects:
      // - Regular params: '=key=value'
      // - Query/filter: '?key=value'
      // - Item ID: '=.id=value'
      const formattedParams: string[] = [];

      if (params) {
        for (const [key, value] of Object.entries(params)) {
          if (value !== undefined && value !== null) {
            // Query parameters start with ?
            if (key.startsWith('?')) {
              formattedParams.push(`${key}=${value}`);
            }
            // Everything else (including .id) needs = prefix
            else {
              formattedParams.push(`=${key}=${value}`);
            }
          }
        }
      }

      const data = await this.api.write(command, formattedParams);
      return {
        success: true,
        data: Array.isArray(data) ? data : [data],
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Execute command with automatic retry logic
   */
  async executeWithRetry(
    command: string,
    params?: Record<string, any>,
    maxRetries: number = RETRY_CONFIG.MAX_RETRIES
  ): Promise<RouterOSCommandResult> {
    let lastError: Error | undefined;
    let delay = RETRY_CONFIG.RETRY_DELAY;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        // Reconnect if not connected
        if (!this.connected) {
          await this.connect();
        }

        return await this.execute(command, params);
      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown error');

        if (attempt < maxRetries) {
          console.warn(`Attempt ${attempt + 1} failed, retrying in ${delay}ms...`);
          await this.sleep(delay);
          delay *= RETRY_CONFIG.BACKOFF_MULTIPLIER;

          // Try to reconnect
          this.connected = false;
        }
      }
    }

    return {
      success: false,
      error: lastError?.message || 'Max retries exceeded',
    };
  }

  /**
   * Execute multiple commands in sequence
   */
  async executeMany(commands: Array<{ command: string; params?: Record<string, any> }>): Promise<RouterOSCommandResult[]> {
    const results: RouterOSCommandResult[] = [];

    for (const cmd of commands) {
      const result = await this.execute(cmd.command, cmd.params);
      results.push(result);

      // Stop on first failure
      if (!result.success) {
        break;
      }
    }

    return results;
  }

  /**
   * Get connection info
   */
  getConnectionInfo() {
    return {
      host: this.config.host,
      port: this.config.port,
      username: this.config.username,
      connected: this.connected,
    };
  }

  /**
   * Sleep utility for retry delays
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

/**
 * Factory function to create and connect a RouterOS client
 */
export async function createRouterOSClient(config: RouterOSConfig): Promise<RouterOSClient> {
  const client = new RouterOSClient(config);
  await client.connect();
  return client;
}
