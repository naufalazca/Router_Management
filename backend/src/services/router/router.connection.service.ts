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
  nodeType: 'ROUTER' | 'SWITCH';
  routerType?: string;
  routerBrand?: string;
  status: string;
  companyId?: string;
  companyName?: string;
  // Switch-specific fields
  brand?: string;
  portCount?: number;
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
  // Switch-connection detail
  edgeType?: 'ROUTER' | 'SWITCH';
  sourcePortNumber?: number;
  targetPortNumber?: number;
  vlan?: number;
  speed?: string;
  notes?: string;
}

interface TopologyData {
  nodes: TopologyNode[];
  edges: TopologyEdge[];
}

export class RouterConnectionService {
  /**
   * Map a switch row to a topology node (shared by company and global views)
   */
  private mapSwitchNode(s: {
    id: string;
    name: string;
    ipAddress: string;
    location?: string | null;
    status: string;
    brand?: string | null;
    portCount?: number | null;
    companyId?: string | null;
    company?: { name: string } | null;
  }): TopologyNode {
    return {
      id: s.id,
      name: s.name,
      ipAddress: s.ipAddress,
      location: s.location || undefined,
      nodeType: 'SWITCH' as const,
      status: s.status,
      brand: s.brand || undefined,
      portCount: s.portCount || undefined,
      companyId: s.companyId || undefined,
      companyName: s.company?.name
    };
  }

  /**
   * Map a switch connection row to a topology edge (shared by company and global views)
   */
  private mapSwitchEdge(conn: {
    id: string;
    sourceSwitchId?: string | null;
    sourceRouterId?: string | null;
    targetSwitchId?: string | null;
    targetRouterId?: string | null;
    linkType: string;
    linkStatus: string;
    sourceInterface?: string | null;
    targetInterface?: string | null;
    bandwidth?: string | null;
    distance?: any;
    isAutoDiscovered: boolean;
    sourcePortNumber?: number | null;
    targetPortNumber?: number | null;
    vlan?: number | null;
    speed?: string | null;
    notes?: string | null;
  }): TopologyEdge {
    return {
      id: conn.id,
      source: (conn.sourceSwitchId || conn.sourceRouterId)!,
      target: (conn.targetSwitchId || conn.targetRouterId)!,
      linkType: conn.linkType,
      linkStatus: conn.linkStatus,
      sourceInterface: conn.sourceInterface || undefined,
      targetInterface: conn.targetInterface || undefined,
      bandwidth: conn.bandwidth || undefined,
      distance: conn.distance ? Number(conn.distance) : undefined,
      isAutoDiscovered: conn.isAutoDiscovered,
      edgeType: 'SWITCH' as const,
      sourcePortNumber: conn.sourcePortNumber || undefined,
      targetPortNumber: conn.targetPortNumber || undefined,
      vlan: conn.vlan || undefined,
      speed: conn.speed || undefined,
      notes: conn.notes || undefined
    };
  }

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

    // Routers are opt-in: only routers manually added to the topology
    // (a TopologyLayout row exists for the company/view) render as nodes.
    const routerLayouts: Array<{ routerId: string }> = await (prisma as any).topologyLayout.findMany(
      companyId ? { where: { companyId }, select: { routerId: true } } : { select: { routerId: true } }
    );
    const addedRouterIds = new Set(routerLayouts.map(l => l.routerId));

    // Transform to nodes and edges for topology visualization
    const routerNodes: TopologyNode[] = routers
      .filter((router) => addedRouterIds.has(router.id))
      .map((router) => ({
      id: router.id,
      name: router.name,
      ipAddress: router.ipAddress,
      location: router.location || undefined,
      nodeType: 'ROUTER' as const,
      routerType: router.routerType,
      routerBrand: router.routerBrand,
      status: router.status,
      companyId: router.companyId || undefined,
      companyName: (router as any).company?.name
    }));

    // Router↔router edges are shown only when BOTH endpoints are manually added.
    const routerEdges: TopologyEdge[] = connections
      .filter(conn => addedRouterIds.has(conn.sourceRouterId) && addedRouterIds.has(conn.targetRouterId))
      .map(conn => ({
      id: conn.id,
      source: conn.sourceRouterId,
      target: conn.targetRouterId,
      linkType: conn.linkType,
      linkStatus: conn.linkStatus,
      sourceInterface: conn.sourceInterface || undefined,
      targetInterface: conn.targetInterface || undefined,
      bandwidth: conn.bandwidth || undefined,
      distance: conn.distance ? Number(conn.distance) : undefined,
      isAutoDiscovered: conn.isAutoDiscovered,
      edgeType: 'ROUTER' as const
    }));

    // ==========================================
    // SWITCH nodes + SWITCH_CONNECTION edges
    // ==========================================
    // Cross-company visibility: a link is visible to a company if and only if at
    // least one of its endpoints belongs to the company. Both endpoints of every
    // visible link are returned as nodes ("if there's a link, show it"), so edges
    // and nodes always stay consistent.
    let switchNodes: TopologyNode[] = [];
    let switchEdges: TopologyEdge[] = [];

    if (companyId) {
      // Only switches that were manually added to the topology (have a layout
      // record for this company) appear as nodes — including switches owned by
      // another company (shared pool: layout rows are per viewing company).
      const companySwitchLayouts = await prisma.switchTopologyLayout.findMany({
        where: { companyId },
        select: { switchId: true }
      });
      const addedSwitchIds = new Set(companySwitchLayouts.map(l => l.switchId));
      const visibleCompanySwitchIds = Array.from(addedSwitchIds);

      const deviceIds = new Set<string>([
        ...Array.from(addedRouterIds),
        ...visibleCompanySwitchIds
      ]);

      const switchConnections = await prisma.switchConnection.findMany({
        where: {
          OR: [
            { sourceSwitch: { companyId } },
            { sourceRouter: { companyId } },
            { targetSwitch: { companyId } },
            { targetRouter: { companyId } }
          ]
        },
        include: {
          sourceSwitch: { include: { company: { select: { id: true, name: true } } } },
          sourceRouter: { include: { company: { select: { id: true, name: true } } } },
          targetSwitch: { include: { company: { select: { id: true, name: true } } } },
          targetRouter: { include: { company: { select: { id: true, name: true } } } }
        },
        orderBy: { createdAt: 'desc' }
      });

      // Keep only connections that touch the company's device set; every endpoint
      // (including foreign routers/switches) of a kept connection becomes visible.
      const visibleSwitchConnections = switchConnections.filter((conn) => {
        const endpointIds = [
          conn.sourceSwitchId,
          conn.sourceRouterId,
          conn.targetSwitchId,
          conn.targetRouterId
        ].filter((v): v is string => !!v);
        return endpointIds.some(id => deviceIds.has(id));
      });

      const foreignSwitchIds = new Set<string>();
      const foreignRouterIds = new Set<string>();
      for (const conn of visibleSwitchConnections) {
        if (conn.sourceSwitchId && !deviceIds.has(conn.sourceSwitchId)) {
          foreignSwitchIds.add(conn.sourceSwitchId);
        }
        if (conn.targetSwitchId && !deviceIds.has(conn.targetSwitchId)) {
          foreignSwitchIds.add(conn.targetSwitchId);
        }
        if (conn.sourceRouterId && !deviceIds.has(conn.sourceRouterId)) {
          foreignRouterIds.add(conn.sourceRouterId);
        }
        if (conn.targetRouterId && !deviceIds.has(conn.targetRouterId)) {
          foreignRouterIds.add(conn.targetRouterId);
        }
      }

      const visibleSwitchIds = new Set<string>([
        ...visibleCompanySwitchIds,
        ...foreignSwitchIds
      ]);

      if (visibleSwitchIds.size > 0) {
        const switches = await prisma.switch.findMany({
          where: { id: { in: Array.from(visibleSwitchIds) } },
          include: {
            company: { select: { id: true, name: true, code: true } }
          },
          orderBy: { name: 'asc' }
        });

        switchNodes = switches.map(s => this.mapSwitchNode(s));
      }

      // Foreign router endpoints must also be present as nodes so their edges
      // resolve — but routers are always opt-in: only show a foreign router
      // if it was manually added to this company's topology too.
      const visibleForeignRouterIds = Array.from(foreignRouterIds)
        .filter(id => addedRouterIds.has(id));
      if (visibleForeignRouterIds.length > 0) {
        const foreignRouters = await prisma.router.findMany({
          where: { id: { in: visibleForeignRouterIds } },
          include: { company: { select: { id: true, name: true } } }
        });

        const foreignRouterNodes: TopologyNode[] = foreignRouters.map((router) => ({
          id: router.id,
          name: router.name,
          ipAddress: router.ipAddress,
          location: router.location || undefined,
          nodeType: 'ROUTER' as const,
          routerType: router.routerType,
          routerBrand: router.routerBrand,
          status: router.status,
          companyId: router.companyId || undefined,
          companyName: (router as any).company?.name
        }));
        switchNodes = [...switchNodes, ...foreignRouterNodes];
      }

      // Drop switch edges whose router endpoint is not visible (hidden router),
      // otherwise Vue Flow would silently drop the edge.
      switchEdges = visibleSwitchConnections
        .filter(conn => {
          if (conn.sourceRouterId && !addedRouterIds.has(conn.sourceRouterId)) return false;
          if (conn.targetRouterId && !addedRouterIds.has(conn.targetRouterId)) return false;
          return true;
        })
        .map(conn => this.mapSwitchEdge(conn));
    } else {
      // Global view (no company filter): only switches that were manually
      // added to the topology (have a layout record) + all switch connections
      const addedLayouts = await prisma.switchTopologyLayout.findMany({
        select: { switchId: true }
      });
      const addedSwitchIdList = addedLayouts.map(l => l.switchId);

      const switches = await prisma.switch.findMany({
        where: { id: { in: addedSwitchIdList } },
        include: { company: { select: { id: true, name: true, code: true } } },
        orderBy: { name: 'asc' }
      });

      const switchConnections = await prisma.switchConnection.findMany({
        include: {
          sourceSwitch: { include: { company: { select: { id: true, name: true } } } },
          sourceRouter: { include: { company: { select: { id: true, name: true } } } },
          targetSwitch: { include: { company: { select: { id: true, name: true } } } },
          targetRouter: { include: { company: { select: { id: true, name: true } } } }
        },
        orderBy: { createdAt: 'desc' }
      });

      // Only keep connections whose switch endpoints were manually added to the
      // topology (have a layout record); router endpoints must also be manually
      // added (have a TopologyLayout row) — routers are always opt-in.
      const addedSwitchIdSet = new Set(addedSwitchIdList);
      const visibleConnections = switchConnections.filter((conn) => {
        if (conn.sourceSwitchId && !addedSwitchIdSet.has(conn.sourceSwitchId)) return false;
        if (conn.targetSwitchId && !addedSwitchIdSet.has(conn.targetSwitchId)) return false;
        if (conn.sourceRouterId && !addedRouterIds.has(conn.sourceRouterId)) return false;
        if (conn.targetRouterId && !addedRouterIds.has(conn.targetRouterId)) return false;
        return true;
      });

      switchNodes = switches.map(s => this.mapSwitchNode(s));

      switchEdges = visibleConnections.map(conn => this.mapSwitchEdge(conn));
    }

    const nodes: TopologyNode[] = [...routerNodes, ...switchNodes];
    const edges: TopologyEdge[] = [...routerEdges, ...switchEdges];

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