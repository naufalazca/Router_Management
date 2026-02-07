/**
 * RouterOS BGP Routing Service
 * Handles BGP-related operations on MikroTik routers
 */

import { prisma } from '../../lib/prisma';
import { decrypt } from '../../lib/encryption';
import { RouterOSClient } from '../../lib/routeros/client';

/**
 * BGP Connection from /routing/bgp/connection/print
 */
export interface BGPConnection {
  '.id': string;
  name?: string;
  'remote.address'?: string;
  'remote.as'?: string;
  'local.address'?: string;
  'local.as'?: string;
  'state'?: string;
  'uptime'?: string;
  'prefix-count'?: string;
  disabled?: string;
  'in.filter'?: string;
  'out.filter'?: string;
}

/**
 * BGP Advertisement from /routing/bgp/peer/print
 * Shows routes advertised by BGP peers
 */
export interface BGPAdvertisement {
  '.id': string;
  'dst-address'?: string;
  'prefix'?: string;
  'gateway'?: string;
  'interface'?: string;
  'scope'?: string;
  'from'?: string;
  'as-path'?: string;
  'origin'?: string;
  'local-pref'?: string;
  'med'?: string;
  'bgp-communities'?: string;
  'routing-mark'?: string;
  'type'?: string;
}

/**
 * BGP Session from /routing/bgp/session/print
 */
export interface BGPSession {
  '.id': string;
  name?: string;
  'remote.address'?: string;
  'remote.port'?: string;
  'remote.as'?: string;
  'local.address'?: string;
  'local.port'?: string;
  'local.as'?: string;
  'established'?: string;
  'state'?: string;
  'uptime'?: string;
  'received.update'?: string;
  'sent.update'?: string;
  'withdrawn'?: string;
  'keepalive'?: string;
  'opensent'?: string;
  'openconfirm'?: string;
  'active'?: string;
  'connect'?: string;
  'idle'?: string;
  disabled?: string;
  'remote.messages'?: string;
  'local.messages'?: string;
  'keepalive-time'?: string;
  'prefix-count'?: string;
}

/**
 * Parsed BGP Connection (cleaned up for frontend)
 */
export interface ParsedBGPConnection {
  id: string;
  name?: string;
  remoteAddress?: string;
  remoteAs?: string;
  localAddress?: string;
  localAs?: string;
  state?: string;
  uptime?: string;
  prefixCount?: number;
  disabled: boolean;
  inFilter?: string;
  outFilter?: string;
}

/**
 * Parsed BGP Advertisement (cleaned up for frontend)
 */
export interface ParsedBGPAdvertisement {
  id: string;
  dstAddress?: string;
  prefix?: string;
  gateway?: string;
  interface?: string;
  scope?: string;
  from?: string;
  asPath?: string;
  origin?: string;
  localPref?: number;
  med?: number;
  bgpCommunities?: string;
}

/**
 * Parsed BGP Session (cleaned up for frontend)
 */
export interface ParsedBGPSession {
  id: string;
  name?: string;
  remoteAddress?: string;
  remotePort?: number;
  remoteAs?: string;
  localAddress?: string;
  localPort?: number;
  localAs?: string;
  established?: string;
  state?: string;
  uptime?: string;
  receivedUpdate?: string;
  sentUpdate?: string;
  withdrawn?: string;
  keepalive?: string;
  opensent?: string;
  openconfirm?: string;
  active?: string;
  connect?: string;
  idle?: string;
  disabled: boolean;
  prefixCount?: number;
}

export class RouterOSRoutingService {
  /**
   * Get router credentials from database and create client
   */
  private async getRouterClient(routerId: string): Promise<RouterOSClient> {
    const router = await prisma.router.findUnique({
      where: { id: routerId },
      select: {
        ipAddress: true,
        username: true,
        password: true,
        apiPort: true,
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

    const config = {
      host: router.ipAddress,
      port: router.apiPort || 8728,
      username: router.username,
      password: decryptedPassword,
    };

    const client = new RouterOSClient(config);
    await client.connect();

    return client;
  }

  /**
   * Parse BGP Connection data to frontend-friendly format
   */
  private parseBGPConnection(connection: BGPConnection): ParsedBGPConnection {
    return {
      id: connection['.id'],
      name: connection.name,
      remoteAddress: connection['remote.address'],
      remoteAs: connection['remote.as'],
      localAddress: connection['local.address'],
      localAs: connection['local.as'],
      state: connection.state,
      uptime: connection.uptime,
      prefixCount: connection['prefix-count'] ? parseInt(connection['prefix-count'], 10) : undefined,
      disabled: connection.disabled === 'true',
      inFilter: connection['in.filter'],
      outFilter: connection['out.filter'],
    };
  }

  /**
   * Parse plain text BGP advertisements output to structured format
   * Input format: "peer=AMAZON-1 dst=160.25.54.0/24 afi=ip nexthop=119.11.187.29 origin=0 as-path=sequence 15306"
   */
  private parseBGPAdvertisementsOutput(rawData: any[]): ParsedBGPAdvertisement[] {
    const advertisements: ParsedBGPAdvertisement[] = [];
    let counter = 0;

    for (const item of rawData) {
      // Handle string output format
      if (typeof item === 'string') {
        const adv: ParsedBGPAdvertisement = {
          id: `adv-${Date.now()}-${counter++}`,
        };

        // Parse the string format: peer=... dst=... afi=... nexthop=... origin=... as-path=...
        const peerMatch = item.match(/peer=([\w-]+)/);
        if (peerMatch) {
          adv.from = peerMatch[1];
        }

        const dstMatch = item.match(/dst=([\d.\/]+)/);
        if (dstMatch) {
          adv.prefix = dstMatch[1];
          adv.dstAddress = dstMatch[1];
        }

        const nexthopMatch = item.match(/nexthop=([\d.]+)/);
        if (nexthopMatch) {
          adv.gateway = nexthopMatch[1];
        }

        const originMatch = item.match(/origin=(\d+)/);
        if (originMatch) {
          const originCode = parseInt(originMatch[1], 10);
          if (originCode === 0) adv.origin = 'IGP';
          else if (originCode === 1) adv.origin = 'EGP';
          else adv.origin = 'INCOMPLETE';
        }

        const asPathMatch = item.match(/as-path=sequence\s+([\d\s]+)/);
        if (asPathMatch) {
          const asNumbers = asPathMatch[1].trim().split(/\s+/).filter(Boolean);
          if (asNumbers.length > 0) {
            adv.asPath = asNumbers.join(' ');
          }
        }

        const afiMatch = item.match(/afi=(\w+)/);
        if (afiMatch) {
          adv.interface = afiMatch[1]; // Using interface field to store afi info temporarily
        }

        advertisements.push(adv);
      }
      // Handle object output format (if API returns structured data)
      else if (typeof item === 'object' && item !== null) {
        advertisements.push({
          id: item['.id'] || `adv-${Date.now()}-${counter++}`,
          dstAddress: item['dst-address'] || item.dst,
          prefix: item.prefix,
          gateway: item.gateway || item.nexthop,
          interface: item.interface,
          scope: item.scope,
          from: item.from || item.peer,
          asPath: item['as-path'] || item['as-path'],
          origin: item.origin,
          localPref: item['local-pref'] ? parseInt(item['local-pref'], 10) : undefined,
          med: item.med ? parseInt(item.med, 10) : undefined,
          bgpCommunities: item['bgp-communities'],
        });
      }
    }

    return advertisements;
  }

  /**
   * Parse BGP Session data to frontend-friendly format
   * Handles both JSON object format and plain text format from RouterOS
   * Plain text format example:
   * "0 E name=GMIX-1 remote.address=10.98.80.44 remote.as=138089 ..."
   * First character indicates state: E=Established, D=Down, I=Idle, A=Active, etc.
   */
  private parseBGPSession(session: BGPSession | string): ParsedBGPSession {
    // Handle string format (raw RouterOS output)
    if (typeof session === 'string') {
      const parsed: ParsedBGPSession = {
        id: `session-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`,
        disabled: false,
      };

      // The first character indicates the state
      const firstChar = session.charAt(0);
      if (firstChar === 'E') {
        parsed.state = 'established';
        parsed.established = 'true';
      } else if (firstChar === 'D') {
        parsed.state = 'down';
      } else if (firstChar === 'I') {
        parsed.state = 'idle';
      } else if (firstChar === 'A') {
        parsed.state = 'active';
      } else if (firstChar === 'C') {
        parsed.state = 'connect';
      } else if (firstChar === 'O') {
        parsed.state = 'opensent';
      } else {
        parsed.state = 'unknown';
      }

      // Parse name=
      const nameMatch = session.match(/name=([\S]+)/);
      if (nameMatch) parsed.name = nameMatch[1];

      // Parse remote.address=
      const remoteAddrMatch = session.match(/remote\.address=([\d.]+)/);
      if (remoteAddrMatch) parsed.remoteAddress = remoteAddrMatch[1];

      // Parse remote.as= (also handles .as= format)
      const remoteAsMatch = session.match(/(?:remote\.)?\.as=(\d+)/);
      if (remoteAsMatch) parsed.remoteAs = remoteAsMatch[1];

      // Parse local.address=
      const localAddrMatch = session.match(/local\.address=([\d.]+)/);
      if (localAddrMatch) parsed.localAddress = localAddrMatch[1];

      // Parse local.as= (after local.address)
      const localAsMatch = session.match(/local\.as=(\d+)/);
      if (localAsMatch) parsed.localAs = localAsMatch[1];

      // Parse uptime=
      const uptimeMatch = session.match(/uptime=([\S]+)/);
      if (uptimeMatch) parsed.uptime = uptimeMatch[1];

      // Parse prefix-count=
      const prefixCountMatch = session.match(/prefix-count=(\d+)/);
      if (prefixCountMatch) {
        parsed.prefixCount = parseInt(prefixCountMatch[1], 10);
      }

      // Parse .messages= (remote messages)
      const remoteMsgMatch = session.match(/remote.*\.messages=(\d+)/);
      if (remoteMsgMatch) parsed.receivedUpdate = remoteMsgMatch[1];

      // Parse local .messages= (local messages sent)
      const localMsgMatch = session.match(/local.*\.messages=(\d+)/);
      if (localMsgMatch) parsed.sentUpdate = localMsgMatch[1];

      // Parse disabled=
      const disabledMatch = session.match(/disabled=(yes|true)/i);
      if (disabledMatch) parsed.disabled = true;

      return parsed;
    }

    // Handle object format (standard JSON response from RouterOS API)
    // RouterOS returns fields like: remote.messages, local.messages, prefix-count, established
    const parsed: ParsedBGPSession = {
      id: session['.id'],
      name: session.name,
      remoteAddress: session['remote.address'],
      remotePort: session['remote.port'] ? parseInt(session['remote.port'], 10) : undefined,
      remoteAs: session['remote.as'],
      localAddress: session['local.address'],
      localPort: session['local.port'] ? parseInt(session['local.port'], 10) : undefined,
      localAs: session['local.as'],
      established: session.established,
      // If established is true, set state to 'established'
      state: session.state || (session.established === 'true' ? 'established' : undefined),
      uptime: session.uptime,
      // RouterOS uses remote.messages and local.messages
      receivedUpdate: session['remote.messages'] || session['received.update'],
      sentUpdate: session['local.messages'] || session['sent.update'],
      withdrawn: session.withdrawn,
      keepalive: session.keepalive,
      opensent: session.opensent,
      openconfirm: session.openconfirm,
      active: session.active,
      connect: session.connect,
      idle: session.idle,
      disabled: session.disabled === 'true',
      // Parse prefix-count from string to number
      prefixCount: session['prefix-count'] ? parseInt(session['prefix-count'], 10) : undefined,
    };

    return parsed;
  }

  /**
   * Fetch all BGP connections from a router
   * Command: /routing/bgp/connection/print
   */
  async getBGPConnections(routerId: string): Promise<ParsedBGPConnection[]> {
    let client: RouterOSClient | null = null;

    try {
      client = await this.getRouterClient(routerId);

      const result = await client.execute('/routing/bgp/connection/print');

      if (!result.success) {
        throw new Error(`Failed to fetch BGP connections: ${result.error}`);
      }

      const connections = (result.data || []) as BGPConnection[];
      return connections.map(conn => this.parseBGPConnection(conn));
    } finally {
      if (client) {
        await client.disconnect();
      }
    }
  }

  /**
   * Get a specific BGP connection by name or ID
   */
  async getBGPConnectionById(routerId: string, connectionId: string): Promise<ParsedBGPConnection | null> {
    let client: RouterOSClient | null = null;

    try {
      client = await this.getRouterClient(routerId);

      const result = await client.execute('/routing/bgp/connection/print', {
        '?.id': connectionId,
      });

      if (!result.success) {
        throw new Error(`Failed to fetch BGP connection: ${result.error}`);
      }

      const connections = (result.data || []) as BGPConnection[];
      return connections.length > 0 ? this.parseBGPConnection(connections[0]) : null;
    } finally {
      if (client) {
        await client.disconnect();
      }
    }
  }

  /**
   * Fetch all BGP advertisements from a router
   * Command: /routing/bgp/advertisements/print (RouterOS v7)
   */
  async getBGPAdvertisements(routerId: string): Promise<ParsedBGPAdvertisement[]> {
    let client: RouterOSClient | null = null;

    try {
      client = await this.getRouterClient(routerId);

      const result = await client.execute('/routing/bgp/advertisements/print');

      if (!result.success) {
        throw new Error(`Failed to fetch BGP advertisements: ${result.error}`);
      }

      // Parse plain text output format
      return this.parseBGPAdvertisementsOutput(result.data || []);
    } finally {
      if (client) {
        await client.disconnect();
      }
    }
  }

  /**
   * Get BGP advertisements with filters
   */
  async getBGPAdvertisementsFiltered(
    routerId: string,
    filters: {
      prefix?: string;
      dstAddress?: string;
      fromPeer?: string;
    }
  ): Promise<ParsedBGPAdvertisement[]> {
    let client: RouterOSClient | null = null;

    try {
      client = await this.getRouterClient(routerId);

      const params: Record<string, string> = {};

      if (filters.prefix) {
        params['?prefix'] = filters.prefix;
      }
      if (filters.dstAddress) {
        params['?dst-address'] = filters.dstAddress;
      }
      if (filters.fromPeer) {
        params['?from'] = filters.fromPeer;
      }

      const result = await client.execute('/routing/bgp/advertisements/print', params);

      if (!result.success) {
        throw new Error(`Failed to fetch BGP advertisements: ${result.error}`);
      }

      // Parse plain text output format
      return this.parseBGPAdvertisementsOutput(result.data || []);
    } finally {
      if (client) {
        await client.disconnect();
      }
    }
  }

  /**
   * Fetch all BGP sessions from a router
   * Command: /routing/bgp/session/print
   */
  async getBGPSessions(routerId: string): Promise<ParsedBGPSession[]> {
    let client: RouterOSClient | null = null;

    try {
      client = await this.getRouterClient(routerId);

      const result = await client.execute('/routing/bgp/session/print');

      if (!result.success) {
        throw new Error(`Failed to fetch BGP sessions: ${result.error}`);
      }

      const sessions = (result.data || []) as BGPSession[];
      return sessions.map(session => this.parseBGPSession(session));
    } finally {
      if (client) {
        await client.disconnect();
      }
    }
  }

  /**
   * Get a specific BGP session by name or ID
   */
  async getBGPSessionById(routerId: string, sessionId: string): Promise<ParsedBGPSession | null> {
    let client: RouterOSClient | null = null;

    try {
      client = await this.getRouterClient(routerId);

      const result = await client.execute('/routing/bgp/session/print', {
        '?.id': sessionId,
      });

      if (!result.success) {
        throw new Error(`Failed to fetch BGP session: ${result.error}`);
      }

      const sessions = (result.data || []) as BGPSession[];
      return sessions.length > 0 ? this.parseBGPSession(sessions[0]) : null;
    } finally {
      if (client) {
        await client.disconnect();
      }
    }
  }

  /**
   * Get all BGP data (connections, advertisements, sessions) for a router
   * Useful for dashboard overview
   */
  async getALLBGPData(routerId: string): Promise<{
    connections: ParsedBGPConnection[];
    advertisements: ParsedBGPAdvertisement[];
    sessions: ParsedBGPSession[];
  }> {
    let client: RouterOSClient | null = null;

    try {
      client = await this.getRouterClient(routerId);

      // Execute all commands in parallel for better performance
      const [connectionsResult, advertisementsResult, sessionsResult] = await Promise.all([
        client.execute('/routing/bgp/connection/print'),
        client.execute('/routing/bgp/advertisements/print'),
        client.execute('/routing/bgp/session/print'),
      ]);

      if (!connectionsResult.success) {
        throw new Error(`Failed to fetch BGP connections: ${connectionsResult.error}`);
      }

      if (!advertisementsResult.success) {
        throw new Error(`Failed to fetch BGP advertisements: ${advertisementsResult.error}`);
      }

      if (!sessionsResult.success) {
        throw new Error(`Failed to fetch BGP sessions: ${sessionsResult.error}`);
      }

      return {
        connections: (connectionsResult.data || []).map((c: BGPConnection) => this.parseBGPConnection(c)),
        advertisements: this.parseBGPAdvertisementsOutput(advertisementsResult.data || []),
        sessions: (sessionsResult.data || []).map((s: BGPSession) => this.parseBGPSession(s)),
      };
    } finally {
      if (client) {
        await client.disconnect();
      }
    }
  }

  /**
   * Enable a BGP connection
   */
  async enableBGPConnection(routerId: string, connectionId: string): Promise<void> {
    let client: RouterOSClient | null = null;

    try {
      client = await this.getRouterClient(routerId);

      const result = await client.execute('/routing/bgp/connection/enable', {
        '.id': connectionId,
      });

      if (!result.success) {
        throw new Error(`Failed to enable BGP connection: ${result.error}`);
      }
    } finally {
      if (client) {
        await client.disconnect();
      }
    }
  }

  /**
   * Disable a BGP connection
   */
  async disableBGPConnection(routerId: string, connectionId: string): Promise<void> {
    let client: RouterOSClient | null = null;

    try {
      client = await this.getRouterClient(routerId);

      const result = await client.execute('/routing/bgp/connection/disable', {
        '.id': connectionId,
      });

      if (!result.success) {
        throw new Error(`Failed to disable BGP connection: ${result.error}`);
      }
    } finally {
      if (client) {
        await client.disconnect();
      }
    }
  }

  /**
   * Reset a BGP connection (soft reset - re-establishes session)
   */
  async resetBGPConnection(routerId: string, connectionId: string): Promise<void> {
    let client: RouterOSClient | null = null;

    try {
      client = await this.getRouterClient(routerId);

      const result = await client.execute('/routing/bgp/connection/reset', {
        '.id': connectionId,
      });

      if (!result.success) {
        throw new Error(`Failed to reset BGP connection: ${result.error}`);
      }
    } finally {
      if (client) {
        await client.disconnect();
      }
    }
  }

  /**
   * Get BGP session statistics summary
   */
  async getBGPSessionStats(routerId: string): Promise<{
    totalSessions: number;
    establishedSessions: number;
    activeSessions: number;
    idleSessions: number;
    downSessions: number;
  }> {
    const sessions = await this.getBGPSessions(routerId);

    const stats = {
      totalSessions: sessions.length,
      establishedSessions: 0,
      activeSessions: 0,
      idleSessions: 0,
      downSessions: 0,
    };

    for (const session of sessions) {
      const state = session.state?.toLowerCase() || '';
      if (state.includes('established')) {
        stats.establishedSessions++;
      } else if (state.includes('active')) {
        stats.activeSessions++;
      } else if (state.includes('idle')) {
        stats.idleSessions++;
      } else {
        stats.downSessions++;
      }
    }

    return stats;
  }
}

// Export singleton instance
export const routerOSRoutingService = new RouterOSRoutingService();
