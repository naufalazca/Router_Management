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
   * Upsert node position (create or update)
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
    const effectiveCompanyId = companyId || router.companyId;

    // @ts-ignore
    return await prisma.topologyLayout.upsert({
      where: {
        companyId_routerId: {
          companyId: effectiveCompanyId || null,
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
   * Bulk upsert node positions
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
        console.error(`Failed to upsert position for router ${pos.routerId}:`, error);
      }
    }

    return results;
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
