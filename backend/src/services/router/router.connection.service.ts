import { prisma } from '../../lib/prisma';
import { LinkType, LinkStatus } from '@prisma/client';

interface CreateConnectionData {
  sourceRouterId: string;
  targetRouterId: string;
  linkType?: LinkType;
  linkStatus?: LinkStatus;
  sourceInterface?: string;
  targetInterface?: string;
  bandwidth?: string;
  distance?: number;
  isAutoDiscovered?: boolean;
  notes?: string;
}

interface UpdateConnectionData {
  sourceRouterId?: string;
  targetRouterId?: string;
  linkType?: LinkType;
  linkStatus?: LinkStatus;
  sourceInterface?: string;
  targetInterface?: string;
  bandwidth?: string;
  distance?: number;
  notes?: string;
}

interface TopologyNode {
  id: string;
  name: string;
  ipAddress: string;
  location?: string;
  routerType: string;
  routerBrand: string;
  status: string;
  companyId?: string;
  companyName?: string;
}

interface TopologyEdge {
  id: string;
  source: string;
  target: string;
  linkType: string;
  linkStatus: string;
  sourceInterface?: string;
  targetInterface?: string;
  bandwidth?: string;
  distance?: number;
  isAutoDiscovered: boolean;
}

interface TopologyData {
  nodes: TopologyNode[];
  edges: TopologyEdge[];
}

export class RouterConnectionService {
  /**
   * Get all topology data (nodes and edges)
   */
  async getTopology(companyId?: string): Promise<TopologyData> {
    const where = companyId ? { companyId } : {};

    const routers = await prisma.router.findMany({
      where,
      include: {
        company: {
          select: {
            id: true,
            name: true,
            code: true
          }
        }
      },
      orderBy: {
        name: 'asc'
      }
    });

    // For connections: find where source OR target router belongs to the company
    // Also include connections where the connection itself has the companyId set
    const connectionWhere = companyId
      ? {
          OR: [
            { companyId },  // Connection explicitly linked to company
            { sourceRouter: { companyId } },  // Source router in company
            { targetRouter: { companyId } }   // Target router in company
          ]
        }
      : {};

    const connections = await prisma.routerConnection.findMany({
      where: connectionWhere,
      include: {
        sourceRouter: {
          select: { id: true, companyId: true }
        },
        targetRouter: {
          select: { id: true, companyId: true }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    // Transform to nodes and edges for topology visualization
    const nodes: TopologyNode[] = routers.map((router) => ({
      id: router.id,
      name: router.name,
      ipAddress: router.ipAddress,
      location: router.location || undefined,
      routerType: router.routerType,
      routerBrand: router.routerBrand,
      status: router.status,
      companyId: router.companyId || undefined,
      companyName: (router as any).company?.name
    }));

    const edges: TopologyEdge[] = connections.map(conn => ({
      id: conn.id,
      source: conn.sourceRouterId,
      target: conn.targetRouterId,
      linkType: conn.linkType,
      linkStatus: conn.linkStatus,
      sourceInterface: conn.sourceInterface || undefined,
      targetInterface: conn.targetInterface || undefined,
      bandwidth: conn.bandwidth || undefined,
      distance: conn.distance ? Number(conn.distance) : undefined,
      isAutoDiscovered: conn.isAutoDiscovered
    }));

    return { nodes, edges };
  }

  /**
   * Get all connections
   */
  async getAllConnections(companyId?: string) {
    const where = companyId
      ? {
          OR: [
            { sourceRouter: { companyId } },
            { targetRouter: { companyId } }
          ]
        }
      : undefined;

    return await prisma.routerConnection.findMany({
      where,
      include: {
        sourceRouter: {
          include: {
            company: {
              select: {
                id: true,
                name: true,
                code: true
              }
            }
          }
        },
        targetRouter: {
          include: {
            company: {
              select: {
                id: true,
                name: true,
                code: true
              }
            }
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });
  }

  /**
   * Get connection by ID
   */
  async getConnectionById(id: string) {
    const connection = await prisma.routerConnection.findUnique({
      where: { id },
      include: {
        sourceRouter: {
          include: {
            company: {
              select: {
                id: true,
                name: true,
                code: true
              }
            }
          }
        },
        targetRouter: {
          include: {
            company: {
              select: {
                id: true,
                name: true,
                code: true
              }
            }
          }
        }
      }
    });

    if (!connection) {
      throw new Error('Connection not found');
    }

    return connection;
  }

  /**
   * Get connections by router ID (both as source and target)
   */
  async getConnectionsByRouter(routerId: string) {
    const connections = await prisma.routerConnection.findMany({
      where: {
        OR: [
          { sourceRouterId: routerId },
          { targetRouterId: routerId }
        ]
      },
      include: {
        sourceRouter: {
          select: {
            id: true,
            name: true,
            ipAddress: true,
            location: true,
            routerType: true,
            routerBrand: true,
            status: true
          }
        },
        targetRouter: {
          select: {
            id: true,
            name: true,
            ipAddress: true,
            location: true,
            routerType: true,
            routerBrand: true,
            status: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    return connections;
  }

  /**
   * Create a new connection
   */
  async createConnection(data: CreateConnectionData) {
    // Validate that source and target routers exist and are different
    const [sourceRouter, targetRouter] = await Promise.all([
      prisma.router.findUnique({ where: { id: data.sourceRouterId } }),
      prisma.router.findUnique({ where: { id: data.targetRouterId } })
    ]);

    if (!sourceRouter) {
      throw new Error('Source router not found');
    }

    if (!targetRouter) {
      throw new Error('Target router not found');
    }

    if (data.sourceRouterId === data.targetRouterId) {
      throw new Error('Source and target routers cannot be the same');
    }

    // Determine companyId from routers (both should be in same company)
    const companyId = sourceRouter.companyId || targetRouter.companyId;

    // Check if connection already exists
    const existing = await prisma.routerConnection.findFirst({
      where: {
        sourceRouterId: data.sourceRouterId,
        targetRouterId: data.targetRouterId,
        sourceInterface: data.sourceInterface || null,
        targetInterface: data.targetInterface || null
      }
    });

    if (existing) {
      throw new Error('Connection already exists between these routers with the same interfaces');
    }

    return await prisma.routerConnection.create({
      data: {
        sourceRouter: {
          connect: { id: data.sourceRouterId }
        },
        targetRouter: {
          connect: { id: data.targetRouterId }
        },
        linkType: data.linkType,
        linkStatus: data.linkStatus,
        sourceInterface: data.sourceInterface,
        targetInterface: data.targetInterface,
        bandwidth: data.bandwidth,
        distance: data.distance,
        isAutoDiscovered: data.isAutoDiscovered,
        notes: data.notes,
        ...(companyId && {
          company: {
            connect: { id: companyId }
          }
        })
      },
      include: {
        sourceRouter: {
          select: {
            id: true,
            name: true,
            ipAddress: true
          }
        },
        targetRouter: {
          select: {
            id: true,
            name: true,
            ipAddress: true
          }
        }
      }
    });
  }

  /**
   * Update a connection
   */
  async updateConnection(id: string, data: UpdateConnectionData) {
    // Check if connection exists
    const existing = await prisma.routerConnection.findUnique({
      where: { id }
    });

    if (!existing) {
      throw new Error('Connection not found');
    }

    // If updating routers, validate they exist
    if (data.sourceRouterId || data.targetRouterId) {
      const sourceId = data.sourceRouterId || existing.sourceRouterId;
      const targetId = data.targetRouterId || existing.targetRouterId;

      if (sourceId === targetId) {
        throw new Error('Source and target routers cannot be the same');
      }

      const [sourceRouter, targetRouter] = await Promise.all([
        prisma.router.findUnique({ where: { id: sourceId } }),
        prisma.router.findUnique({ where: { id: targetId } })
      ]);

      if (!sourceRouter) {
        throw new Error('Source router not found');
      }

      if (!targetRouter) {
        throw new Error('Target router not found');
      }
    }

    return await prisma.routerConnection.update({
      where: { id },
      data,
      include: {
        sourceRouter: {
          select: {
            id: true,
            name: true,
            ipAddress: true
          }
        },
        targetRouter: {
          select: {
            id: true,
            name: true,
            ipAddress: true
          }
        }
      }
    });
  }

  /**
   * Delete a connection
   */
  async deleteConnection(id: string) {
    // Check if connection exists
    const existing = await prisma.routerConnection.findUnique({
      where: { id }
    });

    if (!existing) {
      throw new Error('Connection not found');
    }

    await prisma.routerConnection.delete({
      where: { id }
    });

    return { message: 'Connection deleted successfully' };
  }

  /**
   * Auto-discover connections from a router (placeholder for future RouterOS API integration)
   * This will connect to the router and fetch neighbor information
   */
  async discoverConnections(routerId: string) {
    // TODO: Implement actual RouterOS API discovery
    // For now, this is a placeholder that demonstrates the structure

    const router = await prisma.router.findUnique({
      where: { id: routerId }
    });

    if (!router) {
      throw new Error('Router not found');
    }

    // Placeholder: In real implementation, this would:
    // 1. Connect to RouterOS via API
    // 2. Fetch IP neighbors, OSPF neighbors, BGP peers
    // 3. Match discovered neighbors with known routers
    // 4. Create connections automatically

    throw new Error('Auto-discovery not yet implemented. Please use manual connection creation.');
  }

  /**
   * Bulk create connections (useful for auto-discovery)
   */
  async bulkCreateConnections(connections: CreateConnectionData[]) {
    const created = [];

    for (const conn of connections) {
      try {
        const createdConn = await this.createConnection(conn);
        created.push(createdConn);
      } catch (error) {
        // Log error but continue with others
        console.error(`Failed to create connection: ${error}`);
      }
    }

    return created;
  }
}