/**
 * RouterOS Connection Test Service
 * Handles testing API and SSH connectivity to MikroTik routers
 */

import { prisma } from '../../lib/prisma';
import { decrypt } from '../../lib/encryption';
import { RouterOSClient } from '../../lib/routeros/client';
import { RouterOSSSHClient } from '../../lib/routeros/ssh-client';

/**
 * Test result types
 */
export type ConnectionType = 'API' | 'SSH' | 'BOTH';

export interface TestResult {
  success: boolean;
  type: ConnectionType;
  message: string;
  details?: TestDetails;
  timestamp: Date;
}

export interface TestDetails {
  host: string;
  apiPort?: number;
  sshPort?: number;
  username?: string;
  latency?: number;
  version?: string;
  uptime?: string;
  systemInfo?: SystemInfo;
  error?: string;
}

export interface SystemInfo {
  'board-name'?: string;
  version?: string;
  'architecture-name'?: string;
  'cpu-frequency'?: string;
  'cpu-count'?: string;
  'total-memory'?: string;
  'free-memory'?: string;
  'total-hdd-space'?: string;
  'free-hdd-space'?: string;
}

export interface BatchTestResult {
  routerId: string;
  routerName: string;
  ipAddress: string;
  apiTest: TestResult | null;
  sshTest: TestResult | null;
  timestamp: Date;
}

export class RouterOSTestService {
  /**
   * Get router credentials from database
   */
  private async getRouterCredentials(routerId: string) {
    const router = await prisma.router.findUnique({
      where: { id: routerId },
    });

    if (!router) {
      throw new Error(`Router with ID ${routerId} not found`);
    }

    // Decrypt password
    let decryptedPassword: string;
    try {
      decryptedPassword = decrypt(router.password);
    } catch (error) {
      console.error('Failed to decrypt router password:', error);
      throw new Error('Failed to decrypt router password. The password may be corrupted or encryption key is incorrect.');
    }

    return {
      router,
      password: decryptedPassword,
    };
  }

  /**
   * Test API connection to a router
   */
  async testAPIConnection(routerId: string): Promise<TestResult> {
    const startTime = Date.now();
    const details: TestDetails = {} as TestDetails;

    try {
      const { router, password } = await this.getRouterCredentials(routerId);

      details.host = router.ipAddress;
      details.apiPort = router.apiPort || 8728;
      details.username = router.username;

      // For non-MikroTik routers, we can't test API connection
      if (router.routerBrand !== 'MIKROTIK') {
        return {
          success: false,
          type: 'API',
          message: 'API testing is only supported for MikroTik routers',
          details,
          timestamp: new Date(),
        };
      }

      const config = {
        host: router.ipAddress,
        port: router.apiPort || 8728,
        username: router.username,
        password: password,
        timeout: 15000, // 15 seconds timeout for testing
      };

      const client = new RouterOSClient(config);

      try {
        await client.connect();
        details.latency = Date.now() - startTime;

        // Try to get system resource info to verify full functionality
        const resourceResult = await client.execute('/system/resource/print');

        if (resourceResult.success && resourceResult.data && resourceResult.data.length > 0) {
          const resource = resourceResult.data[0];
          details.version = resource.version || resource['version'];
          details.uptime = resource.uptime || resource['uptime'];

          // Store system info
          details.systemInfo = {
            'board-name': resource['board-name'],
            version: resource.version,
            'architecture-name': resource['architecture-name'],
            'cpu-frequency': resource['cpu-frequency'],
            'cpu-count': resource['cpu-count'],
            'total-memory': resource['total-memory'],
            'free-memory': resource['free-memory'],
            'total-hdd-space': resource['total-hdd-space'],
            'free-hdd-space': resource['free-hdd-space'],
          };
        }

        await client.disconnect();

        return {
          success: true,
          type: 'API',
          message: `API connection successful. RouterOS version: ${details.version || 'Unknown'}`,
          details,
          timestamp: new Date(),
        };
      } catch (connectError) {
        details.error = connectError instanceof Error ? connectError.message : 'Unknown connection error';

        // Check for specific error types
        const errorMsg = details.error.toLowerCase();
        if (errorMsg.includes('timeout') || errorMsg.includes('etimedout')) {
          return {
            success: false,
            type: 'API',
            message: `Connection timeout. Router may be unreachable or API port (${details.apiPort}) may be blocked.`,
            details,
            timestamp: new Date(),
          };
        } else if (errorMsg.includes('econnrefused')) {
          return {
            success: false,
            type: 'API',
            message: `Connection refused. API service may not be enabled or wrong port (${details.apiPort}).`,
            details,
            timestamp: new Date(),
          };
        } else if (errorMsg.includes('authentication') || errorMsg.includes('login')) {
          return {
            success: false,
            type: 'API',
            message: 'Authentication failed. Please check username and password.',
            details,
            timestamp: new Date(),
          };
        }

        return {
          success: false,
          type: 'API',
          message: `API connection failed: ${details.error}`,
          details,
          timestamp: new Date(),
        };
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      details.error = errorMsg;

      return {
        success: false,
        type: 'API',
        message: `Test failed: ${errorMsg}`,
        details,
        timestamp: new Date(),
      };
    }
  }

  /**
   * Test SSH connection to a router
   */
  async testSSHConnection(routerId: string): Promise<TestResult> {
    const startTime = Date.now();
    const details: TestDetails = {} as TestDetails;

    try {
      const { router, password } = await this.getRouterCredentials(routerId);

      details.host = router.ipAddress;
      details.sshPort = router.sshPort || 22;
      details.username = router.username;

      const config = {
        host: router.ipAddress,
        port: router.sshPort || 22,
        username: router.username,
        password: password,
        timeout: 15000, // 15 seconds timeout for testing
      };

      const client = new RouterOSSSHClient(config);

      try {
        await client.connect();
        details.latency = Date.now() - startTime;

        // Execute a simple command to verify connection works
        const output = await client.executeCommand('/system resource print');

        // Parse version from output
        const versionMatch = output.match(/version:\s*(\S+)/i);
        const uptimeMatch = output.match(/uptime:\s*(\S+)/i);

        details.version = versionMatch ? versionMatch[1] : undefined;
        details.uptime = uptimeMatch ? uptimeMatch[1] : undefined;

        // Try to get board name
        const boardMatch = output.match(/board-name:\s*(\S+)/i);
        const archMatch = output.match(/architecture-name:\s*(\S+)/i);

        details.systemInfo = {
          'board-name': boardMatch ? boardMatch[1] : undefined,
          version: details.version,
          'architecture-name': archMatch ? archMatch[1] : undefined,
        };

        client.disconnect();

        return {
          success: true,
          type: 'SSH',
          message: `SSH connection successful. RouterOS version: ${details.version || 'Unknown'}`,
          details,
          timestamp: new Date(),
        };
      } catch (connectError) {
        details.error = connectError instanceof Error ? connectError.message : 'Unknown connection error';

        // Check for specific error types
        const errorMsg = details.error.toLowerCase();
        if (errorMsg.includes('timeout') || errorMsg.includes('timed out')) {
          return {
            success: false,
            type: 'SSH',
            message: `Connection timeout. Router may be unreachable or SSH port (${details.sshPort}) may be blocked.`,
            details,
            timestamp: new Date(),
          };
        } else if (errorMsg.includes('econnrefused') || errorMsg.includes('connect')) {
          return {
            success: false,
            type: 'SSH',
            message: `Connection refused. SSH service may not be enabled or wrong port (${details.sshPort}).`,
            details,
            timestamp: new Date(),
          };
        } else if (errorMsg.includes('authentication') || errorMsg.includes('auth')) {
          return {
            success: false,
            type: 'SSH',
            message: 'Authentication failed. Please check username and password.',
            details,
            timestamp: new Date(),
          };
        }

        return {
          success: false,
          type: 'SSH',
          message: `SSH connection failed: ${details.error}`,
          details,
          timestamp: new Date(),
        };
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      details.error = errorMsg;

      return {
        success: false,
        type: 'SSH',
        message: `Test failed: ${errorMsg}`,
        details: { ...details, error: errorMsg },
        timestamp: new Date(),
      };
    }
  }

  /**
   * Test both API and SSH connections
   */
  async testBothConnections(routerId: string): Promise<{ api: TestResult; ssh: TestResult }> {
    // Run tests in parallel for faster results
    const [apiResult, sshResult] = await Promise.all([
      this.testAPIConnection(routerId),
      this.testSSHConnection(routerId),
    ]);

    return {
      api: apiResult,
      ssh: sshResult,
    };
  }

  /**
   * Quick connection test (API only, faster)
   * Useful for health checks
   */
  async quickTest(routerId: string): Promise<TestResult> {
    return this.testAPIConnection(routerId);
  }

  /**
   * Comprehensive test with diagnostics
   */
  async comprehensiveTest(routerId: string): Promise<{
    api: TestResult;
    ssh: TestResult;
    summary: string;
  }> {
    const results = await this.testBothConnections(routerId);

    const apiSuccess = results.api.success;
    const sshSuccess = results.ssh.success;

    let summary = '';
    if (apiSuccess && sshSuccess) {
      summary = 'Both API and SSH connections are working properly.';
    } else if (apiSuccess) {
      summary = 'API connection is working, but SSH has issues. Check SSH service on router.';
    } else if (sshSuccess) {
      summary = 'SSH connection is working, but API has issues. Check API service on router.';
    } else {
      summary = 'Both API and SSH connections failed. Check network connectivity and router status.';
    }

    return {
      ...results,
      summary,
    };
  }

  /**
   * Test multiple routers (batch test)
   */
  async testMultipleRouters(routerIds: string[]): Promise<BatchTestResult[]> {
    const results: BatchTestResult[] = [];

    // Process routers in parallel (with a limit)
    const CONCURRENT_LIMIT = 5;
    const chunks: string[][] = [];

    for (let i = 0; i < routerIds.length; i += CONCURRENT_LIMIT) {
      chunks.push(routerIds.slice(i, i + CONCURRENT_LIMIT));
    }

    for (const chunk of chunks) {
      const chunkResults = await Promise.all(
        chunk.map(async (routerId) => {
          try {
            // Get router info first
            const router = await prisma.router.findUnique({
              where: { id: routerId },
              select: {
                id: true,
                name: true,
                ipAddress: true,
              },
            });

            if (!router) {
              return {
                routerId,
                routerName: 'Unknown',
                ipAddress: 'Unknown',
                apiTest: {
                  success: false,
                  type: 'API' as const,
                  message: 'Router not found',
                  timestamp: new Date(),
                },
                sshTest: null,
                timestamp: new Date(),
              };
            }

            // Run both tests
            const [apiTest, sshTest] = await Promise.all([
              this.testAPIConnection(routerId).catch(() => ({
                success: false,
                type: 'API' as const,
                message: 'Test failed with exception',
                timestamp: new Date(),
              })),
              this.testSSHConnection(routerId).catch(() => ({
                success: false,
                type: 'SSH' as const,
                message: 'Test failed with exception',
                timestamp: new Date(),
              })),
            ]);

            return {
              routerId: router.id,
              routerName: router.name,
              ipAddress: router.ipAddress,
              apiTest,
              sshTest,
              timestamp: new Date(),
            };
          } catch (error) {
            return {
              routerId,
              routerName: 'Unknown',
              ipAddress: 'Unknown',
              apiTest: {
                success: false,
                type: 'API' as const,
                message: error instanceof Error ? error.message : 'Unknown error',
                timestamp: new Date(),
              },
              sshTest: null,
              timestamp: new Date(),
            };
          }
        })
      );

      results.push(...chunkResults);
    }

    return results;
  }

  /**
   * Test all active routers
   */
  async testAllActiveRouters(): Promise<BatchTestResult[]> {
    const routers = await prisma.router.findMany({
      where: {
        status: 'ACTIVE',
      },
      select: {
        id: true,
      },
    });

    const routerIds = routers.map((r) => r.id);
    return this.testMultipleRouters(routerIds);
  }

  /**
   * Get diagnostic information for a failed connection
   */
  async getDiagnostics(routerId: string, connectionType: ConnectionType): Promise<{
    router: {
      id: string;
      name: string;
      ipAddress: string;
      apiPort: number | null;
      sshPort: number | null;
      username: string;
      routerBrand: string;
      status: string;
    };
    suggestions: string[];
  }> {
    const router = await prisma.router.findUnique({
      where: { id: routerId },
    });

    if (!router) {
      throw new Error(`Router with ID ${routerId} not found`);
    }

    const suggestions: string[] = [];

    if (router.status !== 'ACTIVE') {
      suggestions.push(`Router status is ${router.status}. Only ACTIVE routers can be tested.`);
    }

    if (connectionType === 'API' || connectionType === 'BOTH') {
      suggestions.push('Check if API service is enabled on the router: /ip service enable api');
      suggestions.push(`Verify API port (${router.apiPort || 8728}) is correct and not blocked by firewall.`);
      suggestions.push('Ensure the API IP is allowed in /ip service api settings.');
    }

    if (connectionType === 'SSH' || connectionType === 'BOTH') {
      suggestions.push('Check if SSH service is enabled on the router: /ip service enable ssh');
      suggestions.push(`Verify SSH port (${router.sshPort || 22}) is correct and not blocked by firewall.`);
    }

    suggestions.push('Verify username and password are correct.');
    suggestions.push('Check network connectivity between this server and the router.');
    suggestions.push('Ensure the router is powered on and functioning properly.');

    return {
      router: {
        id: router.id,
        name: router.name,
        ipAddress: router.ipAddress,
        apiPort: router.apiPort,
        sshPort: router.sshPort,
        username: router.username,
        routerBrand: router.routerBrand,
        status: router.status,
      },
      suggestions,
    };
  }
}

// Export singleton instance
export const routerOSTestService = new RouterOSTestService();
