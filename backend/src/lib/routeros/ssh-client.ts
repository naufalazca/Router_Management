/**
 * RouterOS SSH Client
 * For operations that require SSH instead of API (like file download)
 */

import { Client, ClientChannel } from 'ssh2';

export interface SSHConfig {
  host: string;
  port?: number;
  username: string;
  password: string;
  timeout?: number;
}

export class RouterOSSSHClient {
  private config: SSHConfig;
  private client: Client | null = null;

  constructor(config: SSHConfig) {
    this.config = {
      ...config,
      port: config.port || 22,
      timeout: config.timeout || 30000,
    };
  }

  /**
   * Connect to RouterOS via SSH
   */
  async connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.client = new Client();

      this.client
        .on('ready', () => {
          console.log(`[SSH] Connected to ${this.config.host}`);
          resolve();
        })
        .on('error', (err) => {
          console.error(`[SSH] Connection error:`, err);
          reject(err);
        })
        .connect({
          host: this.config.host,
          port: this.config.port,
          username: this.config.username,
          password: this.config.password,
          readyTimeout: this.config.timeout,
        });
    });
  }

  /**
   * Disconnect from RouterOS
   */
  disconnect(): void {
    if (this.client) {
      this.client.end();
      this.client = null;
    }
  }

  /**
   * Execute a command via SSH
   */
  async executeCommand(command: string): Promise<string> {
    if (!this.client) {
      throw new Error('Not connected. Call connect() first.');
    }

    return new Promise((resolve, reject) => {
      this.client!.exec(command, (err, stream: ClientChannel) => {
        if (err) {
          reject(err);
          return;
        }

        let stdout = '';
        let stderr = '';

        stream
          .on('close', (code: number, signal: string) => {
            if (code !== 0 && code !== null) {
              reject(new Error(`Command failed with code ${code}: ${stderr}`));
            } else {
              resolve(stdout);
            }
          })
          .on('data', (data: Buffer) => {
            stdout += data.toString();
          })
          .stderr.on('data', (data: Buffer) => {
            stderr += data.toString();
          });
      });
    });
  }

  /**
   * Export configuration via SSH
   * This is the most reliable way to get export output from RouterOS
   */
  async exportConfig(compact: boolean = false): Promise<string> {
    if (!this.client) {
      throw new Error('Not connected. Call connect() first.');
    }

    const command = compact ? '/export compact' : '/export';
    console.log(`[SSH Export] Executing: ${command}`);

    try {
      const output = await this.executeCommand(command);
      console.log(`[SSH Export] Got ${output.length} bytes`);

      if (!output || output.length === 0) {
        throw new Error('Export command returned no output');
      }

      return output;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`SSH export failed: ${errorMsg}`);
    }
  }
}

/**
 * Factory function to create and connect SSH client
 */
export async function createSSHClient(config: SSHConfig): Promise<RouterOSSSHClient> {
  const client = new RouterOSSSHClient(config);
  await client.connect();
  return client;
}
