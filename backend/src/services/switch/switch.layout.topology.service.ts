import { prisma } from '../../lib/prisma';

interface UpdateSwitchPositionData {
  switchId: string;
  positionX: number;
  positionY: number;
  companyId?: string;
}

interface BulkUpdatePositionsData {
  positions: Array<{
    switchId: string;
    positionX: number;
    positionY: number;
  }>;
  companyId?: string;
}

export class SwitchLayoutService {
  /**
   * Get all switch node positions for a company
   */
  async getLayoutByCompany(companyId?: string) {
    const where = companyId ? { companyId } : {};

    const layouts = await prisma.switchTopologyLayout.findMany({
      where,
      include: {
        switch: {
          select: {
            id: true,
            name: true,
            ipAddress: true
          }
        }
      }
    });

    return layouts.map((layout: any) => ({
      switchId: layout.switchId,
      positionX: Number(layout.positionX),
      positionY: Number(layout.positionY),
      switch: layout.switch
    }));
  }

  /**
   * Get all switches NOT yet added to the given company's topology
   * (no SwitchTopologyLayout record for the company). Any company's
   * switch is addable — the layout is scoped per viewing company.
   */
  async getAvailableSwitches(companyId: string) {
    const [switches, layouts] = await Promise.all([
      prisma.switch.findMany({
        include: {
          company: { select: { id: true, name: true, code: true } }
        },
        orderBy: { name: 'asc' }
      }),
      prisma.switchTopologyLayout.findMany({
        where: { companyId },
        select: { switchId: true }
      })
    ]);

    const addedIds = new Set(layouts.map(l => l.switchId));
    const available = switches.filter(s => !addedIds.has(s.id));
    // Own switches first, then by name
    return available.sort((a, b) => {
      const aOwn = a.companyId === companyId ? 0 : 1;
      const bOwn = b.companyId === companyId ? 0 : 1;
      if (aOwn !== bOwn) return aOwn - bOwn;
      return a.name.localeCompare(b.name);
    });
  }

  /**
   * Add a switch to the company topology (manual add) with a default position.
   */
  async addSwitchToTopology(switchId: string, companyId: string, positionX?: number, positionY?: number) {
    const sw = await prisma.switch.findUnique({
      where: { id: switchId }
    });

    if (!sw) {
      throw new Error('Switch not found');
    }

    // Shared pool: any company may add any switch; the layout row is keyed
    // by the viewing company, independent of the switch owner.

    // Refuse duplicates
    const existing = await prisma.switchTopologyLayout.findUnique({
      where: {
        companyId_switchId: { companyId, switchId }
      }
    });
    if (existing) {
      throw new Error('Switch is already in the topology');
    }

    return await prisma.switchTopologyLayout.create({
      data: {
        switchId,
        companyId,
        positionX: positionX ?? 400,
        positionY: positionY ?? 300
      },
      include: {
        switch: {
          select: { id: true, name: true, ipAddress: true }
        }
      }
    });
  }

  /**
   * Remove a switch from the company topology (manual remove).
   * Only removes the company's own layout record and only the switch
   * connections that touch one of the company's own devices.
   */
  async removeSwitchFromTopology(switchId: string, companyId: string) {
    const sw = await prisma.switch.findUnique({
      where: { id: switchId }
    });

    if (!sw) {
      throw new Error('Switch not found');
    }

    // Layout must exist for this company — nothing to remove otherwise
    const layout = await prisma.switchTopologyLayout.findUnique({
      where: {
        companyId_switchId: { companyId, switchId }
      }
    });
    if (!layout) {
      throw new Error('Switch is not in this company topology');
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

    const touchingConnections = await prisma.switchConnection.findMany({
      where: {
        OR: [
          { sourceSwitchId: switchId },
          { targetSwitchId: switchId }
        ]
      },
      select: {
        id: true,
        sourceSwitchId: true,
        sourceRouterId: true,
        targetSwitchId: true,
        targetRouterId: true
      }
    });

    const deletableConnectionIds = touchingConnections
      .filter((conn) => {
        const endpointIds = [
          conn.sourceSwitchId,
          conn.sourceRouterId,
          conn.targetSwitchId,
          conn.targetRouterId
        ].filter((v): v is string => !!v);
        return endpointIds.every(id => deviceIds.has(id));
      })
      .map(conn => conn.id);

    await prisma.$transaction([
      ...(deletableConnectionIds.length > 0
        ? [prisma.switchConnection.deleteMany({
            where: { id: { in: deletableConnectionIds } }
          })]
        : []),
      prisma.switchTopologyLayout.deleteMany({
        where: { switchId, companyId }
      })
    ]);

    return { switchId, companyId };
  }

  /**
   * Get position for a specific switch
   */
  async getSwitchPosition(switchId: string, companyId?: string) {
    const where: any = { switchId };
    if (companyId) {
      where.companyId = companyId;
    }

    const layout = await prisma.switchTopologyLayout.findFirst({
      where
    });

    if (!layout) {
      return null;
    }

    return {
      switchId: layout.switchId,
      positionX: Number(layout.positionX),
      positionY: Number(layout.positionY)
    };
  }

  /**
   * Upsert switch node position. Update-only when a company context is given:
   * switches are never auto-added to a topology by a position save — adding a
   * switch (own or foreign) must go through addSwitchToTopology(). Only when
   * no company context is provided (legacy/global fallback) may the row be
   * created, keyed on the switch owner.
   */
  async upsertPosition(data: UpdateSwitchPositionData) {
    const { switchId, positionX, positionY, companyId } = data;

    // Verify switch exists
    const sw = await prisma.switch.findUnique({
      where: { id: switchId }
    });

    if (!sw) {
      throw new Error('Switch not found');
    }

    const effectiveCompanyId = companyId || sw.companyId || null;

    const existing = await prisma.switchTopologyLayout.findUnique({
      where: {
        companyId_switchId: {
          companyId: effectiveCompanyId as string,
          switchId
        }
      }
    });

    if (!existing && companyId) {
      // Not yet added to this company's topology: never auto-create on drag-save
      return null;
    }

    return await prisma.switchTopologyLayout.upsert({
      where: {
        companyId_switchId: {
          companyId: effectiveCompanyId as string,
          switchId
        }
      },
      create: {
        switchId,
        companyId: effectiveCompanyId,
        positionX,
        positionY
      },
      update: {
        positionX,
        positionY
      },
      include: {
        switch: {
          select: {
            id: true,
            name: true
          }
        }
      }
    });
  }

  /**
   * Bulk upsert switch node positions (parallel). Each row is keyed by the
   * viewing company. Update-only: switches not already present in the
   * company's layout are skipped — adding a switch to a topology is always a
   * manual action (addSwitchToTopology), never a side effect of a drag-save.
   */
  async bulkUpsertPositions(data: BulkUpdatePositionsData) {
    const { positions, companyId } = data;

    // Which of these switches are already placed in this company's topology?
    const switchIds = positions.map(p => p.switchId);
    const existingLayouts = await prisma.switchTopologyLayout.findMany({
      where: {
        switchId: { in: switchIds },
        ...(companyId ? { companyId } : {})
      },
      select: { switchId: true }
    });
    const existingIds = new Set(existingLayouts.map(l => l.switchId));

    const results = await Promise.all(positions.map(async (pos) => {
      try {
        if (!existingIds.has(pos.switchId)) {
          // Not yet added to the (company's) topology: skip (no auto-add)
          return null;
        }

        return await prisma.switchTopologyLayout.upsert({
          where: {
            companyId_switchId: {
              companyId: (companyId || null) as string,
              switchId: pos.switchId
            }
          },
          create: {
            switchId: pos.switchId,
            companyId: companyId || null,
            positionX: pos.positionX,
            positionY: pos.positionY
          },
          update: {
            positionX: pos.positionX,
            positionY: pos.positionY
          },
          include: {
            switch: {
              select: { id: true, name: true }
            }
          }
        });
      } catch (error) {
        console.error(`Failed to upsert position for switch ${pos.switchId}:`, error);
        return null;
      }
    }));

    return results.filter((r): r is NonNullable<typeof r> => r !== null);
  }

  /**
   * Delete switch node position
   */
  async deletePosition(switchId: string, companyId?: string) {
    const where: any = { switchId };
    if (companyId) {
      where.companyId = companyId;
    }

    return await prisma.switchTopologyLayout.deleteMany({
      where
    });
  }

  /**
   * Reset all switch positions for a company
   */
  async resetCompanyLayout(companyId: string) {
    return await prisma.switchTopologyLayout.deleteMany({
      where: { companyId }
    });
  }
}
