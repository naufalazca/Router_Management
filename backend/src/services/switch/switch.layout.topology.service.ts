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
   * Upsert switch node position (create or update)
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

    // Use the switch's companyId if not provided
    const effectiveCompanyId = companyId || sw.companyId || null;

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
   * Bulk upsert switch node positions
   */
  async bulkUpsertPositions(data: BulkUpdatePositionsData) {
    const { positions, companyId } = data;

    const results: any[] = [];

    for (const pos of positions) {
      try {
        const result = await this.upsertPosition({
          ...pos,
          companyId
        });
        results.push(result);
      } catch (error) {
        console.error(`Failed to upsert position for switch ${pos.switchId}:`, error);
      }
    }

    return results;
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
