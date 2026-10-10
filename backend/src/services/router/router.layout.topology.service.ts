import { prisma } from '../../lib/prisma';

interface UpdateNodePositionData {
  routerId: string;
  positionX: number;
  positionY: number;
  companyId?: string;
}

interface BulkUpdatePositionsData {
  positions: Array<{
    routerId: string;
    positionX: number;
    positionY: number;
  }>;
  companyId?: string;
}

export class RouterLayoutService {
  /**
   * Get all node positions for a company
   */
  async getLayoutByCompany(companyId?: string) {
    const where = companyId ? { companyId } : {};

    // @ts-ignore - topologyLayout will be available after prisma generate
    const layouts = await prisma.topologyLayout.findMany({
      where,
      include: {
        router: {
          select: {
            id: true,
            name: true,
            ipAddress: true
          }
        }
      }
    });

    return layouts.map((layout: any) => ({
      routerId: layout.routerId,
      positionX: Number(layout.positionX),
      positionY: Number(layout.positionY),
      router: layout.router
    }));
  }

  /**
   * Get position for a specific router
   */
  async getRouterPosition(routerId: string, companyId?: string) {
    const where: any = { routerId };
    if (companyId) {
      where.companyId = companyId;
    }

    // @ts-ignore
    const layout = await prisma.topologyLayout.findFirst({
      where,
    });

    if (!layout) {
      return null;
    }

    return {
      routerId: layout.routerId,
      positionX: Number(layout.positionX),
      positionY: Number(layout.positionY)
    };
  }

  /**
   * Get all routers NOT yet added to the given company's topology
   * (no TopologyLayout record for the company). Any company's
   * router is addable — the layout is scoped per viewing company.
   */
  async getAvailableRouters(companyId: string) {
    const [routers, layouts] = await Promise.all([
      prisma.router.findMany({
        include: {
          company: { select: { id: true, name: true, code: true } }
        },
        orderBy: { name: 'asc' }
      }),
      // @ts-ignore - topologyLayout will be available after prisma generate
      prisma.topologyLayout.findMany({
        where: { companyId },
        select: { routerId: true }
      })
    ]);

    const addedIds = new Set(layouts.map((l: any) => l.routerId));
    const available = routers.filter(r => !addedIds.has(r.id));
    // Own routers first, then by name
    return available.sort((a, b) => {
      const aOwn = a.companyId === companyId ? 0 : 1;
      const bOwn = b.companyId === companyId ? 0 : 1;
      if (aOwn !== bOwn) return aOwn - bOwn;
      return a.name.localeCompare(b.name);
    });
  }

  /**
   * Add a router to the company topology (manual add) with a default position.
   */
  async addRouterToTopology(routerId: string, companyId: string, positionX?: number, positionY?: number) {
    const router = await prisma.router.findUnique({
      where: { id: routerId }
    });

    if (!router) {
      throw new Error('Router not found');
    }

    // Shared pool: any company may add any router; the layout row is keyed
    // by the viewing company, independent of the router owner.

    // Refuse duplicates
    // @ts-ignore
    const existing = await prisma.topologyLayout.findUnique({
      where: {
        companyId_routerId: { companyId, routerId }
      }
    });
    if (existing) {
      throw new Error('Router is already in the topology');
    }

    // @ts-ignore
    return await prisma.topologyLayout.create({
      data: {
        routerId,
        companyId,
        positionX: positionX ?? 400,
        positionY: positionY ?? 300
      },
      include: {
        router: {
          select: { id: true, name: true, ipAddress: true }
        }
      }
    });
  }

  /**
   * Remove a router from the company topology (manual remove).
   * Only removes the company's own layout record and only the router
   * connections that touch one of the company's own devices.
   */
  async removeRouterFromTopology(routerId: string, companyId: string) {
    const router = await prisma.router.findUnique({
      where: { id: routerId }
    });

    if (!router) {
      throw new Error('Router not found');
    }

    // Layout must exist for this company — nothing to remove otherwise
    // @ts-ignore
    const layout = await prisma.topologyLayout.findUnique({
      where: {
        companyId_routerId: { companyId, routerId }
      }
    });
    if (!layout) {
      throw new Error('Router is not in this company topology');
    }

    // Company device IDs (routers + switches) — connections are only deleted
    // when BOTH endpoints belong to the company, so foreign links survive.
    const [companyRouters, companySwitches] = await Promise.all([
      prisma.router.findMany({ where: { companyId }, select: { id: true } }),
      prisma.switch.findMany({ where: { companyId }, select: { id: true } })
    ]);
    const deviceIds = new Set<string>([
      ...companyRouters.map(r => r.id),
      ...companySwitches.map(s => s.id)
    ]);

    const touchingConnections = await prisma.routerConnection.findMany({
      where: {
        OR: [
          { sourceRouterId: routerId },
          { targetRouterId: routerId }
        ]
      },
      select: {
        id: true,
        sourceRouterId: true,
        targetRouterId: true
      }
    });

    const deletableConnectionIds = touchingConnections
      .filter((conn) => {
        const endpointIds = [conn.sourceRouterId, conn.targetRouterId]
          .filter((v): v is string => !!v);
        return endpointIds.every(id => deviceIds.has(id));
      })
      .map(conn => conn.id);

    await prisma.$transaction([
      ...(deletableConnectionIds.length > 0
        ? [prisma.routerConnection.deleteMany({
            where: { id: { in: deletableConnectionIds } }
          })]
        : []),
      // @ts-ignore
      prisma.topologyLayout.deleteMany({
        where: { routerId, companyId }
      })
    ]);

    return { routerId, companyId };
  }

  /**
   * Upsert node position. Update-only when a company context is given:
   * routers are never auto-added to a topology by a position save — adding a
   * router (own or foreign) must go through addRouterToTopology(). Only when
   * no company context is provided (legacy/global fallback) may the row be
   * created, keyed on the router owner.
   */
  async upsertPosition(data: UpdateNodePositionData) {
    const { routerId, positionX, positionY, companyId } = data;

    // Verify router exists
    const router = await prisma.router.findUnique({
      where: { id: routerId }
    });

    if (!router) {
      throw new Error('Router not found');
    }

    // Use the router's companyId if not provided
    const effectiveCompanyId = companyId || router.companyId || null;

    // @ts-ignore
    const existingRow = await prisma.topologyLayout.findUnique({
      where: {
        companyId_routerId: {
          companyId: effectiveCompanyId as string,
          routerId
        }
      }
    });

    if (!existingRow && companyId) {
      // Not yet added to this company's topology: never auto-create on drag-save
      return null;
    }

    // @ts-ignore
    return await prisma.topologyLayout.upsert({
      where: {
        companyId_routerId: {
          companyId: effectiveCompanyId as string,
          routerId
        }
      },
      create: {
        routerId,
        companyId: effectiveCompanyId,
        positionX,
        positionY
      },
      update: {
        positionX,
        positionY
      },
      include: {
        router: {
          select: {
            id: true,
            name: true
          }
        }
      }
    });
  }

  /**
   * Bulk upsert node positions (parallel). Update-only: routers not already
   * present in the company's layout are skipped — adding a router to a
   * topology is always a manual action (addRouterToTopology), never a side
   * effect of a drag-save.
   */
  async bulkUpsertPositions(data: BulkUpdatePositionsData) {
    const { positions, companyId } = data;

    // Which of these routers are already placed in this company's topology?
    const routerIds = positions.map(p => p.routerId);
    // @ts-ignore
    const existingLayouts = await prisma.topologyLayout.findMany({
      where: {
        routerId: { in: routerIds },
        ...(companyId ? { companyId } : {})
      },
      select: { routerId: true }
    });
    const existingIds = new Set(existingLayouts.map((l: any) => l.routerId));

    const results = await Promise.all(positions.map(async (pos) => {
      try {
        if (!existingIds.has(pos.routerId)) {
          // Not yet added to the (company's) topology: skip (no auto-add)
          return null;
        }

        return await this.upsertPosition({
          ...pos,
          companyId
        });
      } catch (error) {
        console.error(`Failed to upsert position for router ${pos.routerId}:`, error);
        return null;
      }
    }));

    return results.filter((r): r is NonNullable<typeof r> => r !== null);
  }

  /**
   * Delete node position
   */
  async deletePosition(routerId: string, companyId?: string) {
    const where: any = { routerId };
    if (companyId) {
      where.companyId = companyId;
    }

    // @ts-ignore
    return await prisma.topologyLayout.deleteMany({
      where
    });
  }

  /**
   * Reset all positions for a company
   */
  async resetCompanyLayout(companyId: string) {
    // @ts-ignore
    return await prisma.topologyLayout.deleteMany({
      where: { companyId }
    });
  }
}
