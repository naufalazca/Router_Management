/**
 * RouterOS Troubleshoot Service
 * Handles ping and traceroute operations via SSH
 */

import { prisma } from '../../lib/prisma';
import { decrypt } from '../../lib/encryption';
import { RouterOSSSHClient, type SSHConfig } from '../../lib/routeros/ssh-client';
import { TROUBLESHOOT_DEFAULTS } from '../../lib/routeros/constants';

/**
 * Ping result interface
 */
export interface PingResult {
  host: string;
  sent: number;
  received: number;
  packetLoss: number;
  rtt: {
    min: number;
    avg: number;
    max: number;
    stddev: number;
  };
  results: PingEntry[];
  rawOutput?: string;
}

/**
 * Single ping entry
 */
export interface PingEntry {
  sequence: number;
  bytes: number;
  time: number;
  ttl?: number;
  status: 'reply' | 'timeout' | 'error';
}

/**
 * Ping parameters
 */
export interface PingParams {
  address: string;
  count?: number;
  size?: number;
  ttl?: number;
  srcAddress?: string;
  interface?: string;
  doNotFragment?: boolean;
  dscp?: number;
}

/**
 * Traceroute result interface
 */
export interface TracerouteResult {
  target: string;
  hops: TracerouteHop[];
  rawOutput?: string;
}

/**
 * Single traceroute hop (MikroTik format)
 */
export interface TracerouteHop {
  hop: number;
  address: string;
  loss: string;
  sent: number;
  last: number;
  avg: number;
  best: number;
  worst: number;
  stdDev: number;
}

/**
 * Traceroute parameters
 */
export interface TracerouteParams {
  address: string;
  count?: number;
}

export class RouterOSTroubleshootService {
  /**
   * Get router SSH client from database credentials
   */
  private async getRouterSSHClient(routerId: string): Promise<RouterOSSSHClient> {
    const router = await prisma.router.findUnique({
      where: { id: routerId },
      select: {
        ipAddress: true,
        username: true,
        password: true,
        sshPort: true,
        status: true,
      },
    });

    if (!router) {
      throw new Error(`Router with ID ${routerId} not found`);
    }

    if (router.status !== 'ACTIVE') {
      throw new Error(`Router is not active (status: ${router.status})`);
    }

    // Decrypt password
    let decryptedPassword: string;
    try {
      decryptedPassword = decrypt(router.password);
    } catch (error) {
      console.error('Failed to decrypt router password:', error);
      throw new Error('Failed to decrypt router password. The password may be corrupted or encryption key is incorrect.');
    }

    const config: SSHConfig = {
      host: router.ipAddress,
      port: router.sshPort ?? 22,
      username: router.username,
      password: decryptedPassword,
      timeout: 30000,
    };

    const client = new RouterOSSSHClient(config);
    await client.connect();

    return client;
  }

  /**
   * Parse MikroTik ping output to structured JSON
   * MikroTik v7 ping output format:
   *   SEQ HOST                                     SIZE TTL TIME       STATUS
   *     0 1.1.1.1                                    64  61 20ms688us
   *     1 1.1.1.1                                    64  61 20ms429us
   *   sent=10 received=10 packet-loss=0% min-rtt=20ms183us avg-rtt=21ms382us
   *   max-rtt=22ms531us
   */
  private parsePingOutput(output: string, address: string): PingResult {
    const lines = output.trim().split('\n');
    const entries: PingEntry[] = [];

    let sent = 0;
    let received = 0;
    let packetLoss = 0;
    let rttMin = 0;
    let rttAvg = 0;
    let rttMax = 0;
    let rttStddev = 0;

    for (const line of lines) {
      const trimmedLine = line.trim();

      // Skip header line
      if (trimmedLine.includes('SEQ') && trimmedLine.includes('HOST')) {
        continue;
      }

      // Parse individual ping response
      // Format: SEQ HOST SIZE TTL TIME STATUS
      // Example: "  0 1.1.1.1                                    64  61 20ms688us    "
      // Use a regex to match lines starting with a number (sequence)
      const pingMatch = trimmedLine.match(/^\s*(\d+)\s+(\S+)\s+(\d+)\s+(\d+)\s+([\d.]+ms[\d.]+us|[\d.]+ms|[\d.]+us|[\d.]+)\s*(.*)$/);
      if (pingMatch) {
        const seq = parseInt(pingMatch[1], 10);
        const size = parseInt(pingMatch[3], 10);
        const ttl = parseInt(pingMatch[4], 10);
        const timeValue = pingMatch[5]; // e.g., "20ms688us", "20ms", or just a number
        const status = pingMatch[6]?.trim() || '';

        // Convert time like "20ms688us" to milliseconds
        let timeInMs = 0;
        const msMatch = timeValue.match(/([\d.]+)ms/);
        const usMatch = timeValue.match(/([\d.]+)us/);

        if (msMatch) {
          timeInMs = parseFloat(msMatch[1]);
        }
        if (usMatch) {
          timeInMs += parseFloat(usMatch[1]) / 1000;
        }

        // If no unit found, treat as milliseconds
        if (!msMatch && !usMatch && timeValue) {
          timeInMs = parseFloat(timeValue);
        }

        entries.push({
          sequence: seq,
          bytes: size,
          time: timeInMs,
          ttl,
          status: status === 'timeout' ? 'timeout' : 'reply',
        });

        if (status !== 'timeout') {
          received++;
        }
        sent++;
      }

      // Parse statistics line (may contain min/avg RTT)
      // Format: sent=N received=N packet-loss=N% min-rtt=XmsXXXus avg-rtt=YmsXXXus
      const statsMatch = trimmedLine.match(/sent=(\d+)\s+received=(\d+)\s+packet-loss=([\d.]+)%/);
      if (statsMatch) {
        sent = parseInt(statsMatch[1], 10);
        received = parseInt(statsMatch[2], 10);
        packetLoss = parseFloat(statsMatch[3]);
      }

      // Parse RTT statistics from stats line (min-rtt and avg-rtt)
      // Format: sent=N received=N packet-loss=N% min-rtt=XmsXXXus avg-rtt=YmsXXXus
      const rttPartialMatch = trimmedLine.match(/min-rtt=([\d.]+)ms(?:([\d.]+)us)?\s+avg-rtt=([\d.]+)ms(?:([\d.]+)us)?/);
      if (rttPartialMatch) {
        rttMin = parseFloat(rttPartialMatch[1]) + (rttPartialMatch[2] ? parseFloat(rttPartialMatch[2]) / 1000 : 0);
        rttAvg = parseFloat(rttPartialMatch[3]) + (rttPartialMatch[4] ? parseFloat(rttPartialMatch[4]) / 1000 : 0);
      }

      // Parse max-rtt from separate line (max-rtt=XmsXXXus)
      const maxRttMatch = trimmedLine.match(/^max-rtt=([\d.]+)ms(?:([\d.]+)us)?/);
      if (maxRttMatch) {
        rttMax = parseFloat(maxRttMatch[1]) + (maxRttMatch[2] ? parseFloat(maxRttMatch[2]) / 1000 : 0);
      }
    }

    return {
      host: address,
      sent,
      received,
      packetLoss,
      rtt: {
        min: rttMin,
        avg: rttAvg,
        max: rttMax,
        stddev: rttStddev,
      },
      results: entries.sort((a, b) => a.sequence - b.sequence),
      rawOutput: output,
    };
  }

  /**
   * Parse MikroTik traceroute output to structured JSON
   * Example output:
   *   Columns: ADDRESS, LOSS, SENT, LAST, AVG, BEST, WORST, STD-DEV
   *   #  ADDRESS        LOSS  SENT  LAST   AVG  BEST  WORST  STD-DEV
   *   1  119.11.184.14  0%      10  0.7ms  2.4  0.7   15.8   4.5
   *   2  162.158.43.45  0%      10  0.9ms  2    0.2   11.9   3.3
   *   3  1.1.1.1        0%      10  0.2ms  0.2  0.2   0.3    0
   */
  private parseTracerouteOutput(output: string, target: string): TracerouteResult {
    // MikroTik traceroute output contains multiple blocks (one for each probe sent)
    // Each block starts with "Columns: ADDRESS, LOSS, SENT, LAST, AVG, BEST, WORST, STD-DEV"
    // We only need the LAST complete block which has the most accurate statistics
    const blockMarker = 'Columns: ADDRESS, LOSS, SENT, LAST, AVG, BEST, WORST, STD-DEV';
    const blocks = output.split(blockMarker);
    const lastBlock = blocks[blocks.length - 1];

    const lines = lastBlock.trim().split('\n');
    const hops: TracerouteHop[] = [];

    for (const line of lines) {
      const trimmedLine = line.trim();

      // Skip header and empty lines
      if (!trimmedLine || trimmedLine.startsWith('#') || trimmedLine.includes('ADDRESS')) {
        continue;
      }

      // Parse hop line
      // Format: HOP ADDRESS LOSS SENT LAST AVG BEST WORST STD-DEV
      // Example: "1  160.25.54.1  0%      10  20.2ms  20.2  20.2  20.2   0"
      const hopMatch = trimmedLine.match(/^(\d+)\s+(\S+)\s+(\d+%\s*|\d+)\s+(\d+)\s+([\d.]+)(ms|us)?\s+([\d.]+)(ms|us)?\s+([\d.]+)(ms|us)?\s+([\d.]+)(ms|us)?\s+([\d.]+)(ms|us)?$/);

      if (hopMatch) {
        const hop = parseInt(hopMatch[1], 10);
        const address = hopMatch[2];
        const loss = hopMatch[3].trim(); // Trim extra whitespace
        const sent = parseInt(hopMatch[4], 10);

        // Parse time values (convert to ms if needed)
        const toMs = (val: string, unit?: string) => {
          const num = parseFloat(val);
          return unit === 'us' ? num / 1000 : num;
        };

        const last = toMs(hopMatch[5], hopMatch[6]);
        const avg = toMs(hopMatch[7], hopMatch[8]);
        const best = toMs(hopMatch[9], hopMatch[10]);
        const worst = toMs(hopMatch[11], hopMatch[12]);
        const stdDev = toMs(hopMatch[13], hopMatch[14]);

        hops.push({
          hop,
          address,
          loss,
          sent,
          last,
          avg,
          best,
          worst,
          stdDev,
        });
      }
      // Handle timeout hop (no address, just loss and sent)
      // Example: "5               0%      1  0ms"
      else if (trimmedLine.match(/^(\d+)\s+\s+(\d+%\s*|\d+)\s+(\d+)\s+/)) {
        const timeoutMatch = trimmedLine.match(/^(\d+)\s+\s+(\d+%\s*|\d+)\s+(\d+)\s+([\d.]+)(ms|us)?$/);
        if (timeoutMatch) {
          const hop = parseInt(timeoutMatch[1], 10);
          const loss = timeoutMatch[2].trim();
          const sent = parseInt(timeoutMatch[3], 10);
          const last = timeoutMatch[4] ? parseFloat(timeoutMatch[4]) : 0;

          hops.push({
            hop,
            address: '*',
            loss,
            sent,
            last,
            avg: last,
            best: last,
            worst: last,
            stdDev: 0,
          });
        }
      }
    }

    return {
      target,
      hops,
      rawOutput: output,
    };
  }

  /**
   * Execute ping command on router
   */
  async ping(routerId: string, params: PingParams): Promise<PingResult> {
    let client: RouterOSSSHClient | null = null;

    try {
      // Validate required parameters
      if (!params.address) {
        throw new Error('Target address is required for ping');
      }

      client = await this.getRouterSSHClient(routerId);

      // Build ping command
      const count = params.count || TROUBLESHOOT_DEFAULTS.PING.COUNT;
      const size = params.size || TROUBLESHOOT_DEFAULTS.PING.SIZE;

      let command = `/ping ${params.address} count=${count} size=${size}`;

      if (params.srcAddress) {
        command += ` src-address=${params.srcAddress}`;
      }

      if (params.ttl) {
        command += ` ttl=${params.ttl}`;
      }

      if (params.interface) {
        command += ` interface=${params.interface}`;
      }

      if (params.doNotFragment) {
        command += ` do-not-fragment=yes`;
      }

      if (params.dscp) {
        command += ` dscp=${params.dscp}`;
      }

      const output = await client.executeCommand(command);

      if (!output) {
        throw new Error('Ping command returned no output');
      }

      const parsed = this.parsePingOutput(output, params.address);

      return parsed;
    } finally {
      if (client) {
        client.disconnect();
      }
    }
  }

  /**
   * Execute traceroute command on router
   */
  async traceroute(routerId: string, params: TracerouteParams): Promise<TracerouteResult> {
    let client: RouterOSSSHClient | null = null;

    try {
      // Validate required parameters
      if (!params.address) {
        throw new Error('Target address is required for traceroute');
      }

      client = await this.getRouterSSHClient(routerId);

      // Build traceroute command (simple format with count only)
      const count = params.count || TROUBLESHOOT_DEFAULTS.TRACEROUTE.COUNT;
      const command = `/tool traceroute ${params.address} count=${count}`;

      const output = await client.executeCommand(command);

      if (!output) {
        throw new Error('Traceroute command returned no output');
      }

      const parsed = this.parseTracerouteOutput(output, params.address);

      return parsed;
    } finally {
      if (client) {
        client.disconnect();
      }
    }
  }

  /**
   * Execute continuous ping (for monitoring - returns first batch)
   * Use with interval for continuous monitoring
   */
  async continuousPing(routerId: string, params: PingParams, iterations: number = 1): Promise<PingResult[]> {
    const results: PingResult[] = [];

    for (let i = 0; i < iterations; i++) {
      const result = await this.ping(routerId, params);
      results.push(result);

      // Wait before next iteration if not the last one
      if (i < iterations - 1) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    return results;
  }
}

// Export singleton instance
export const routerOSTroubleshootService = new RouterOSTroubleshootService();
