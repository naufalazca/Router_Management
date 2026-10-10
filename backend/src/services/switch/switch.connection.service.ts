import { prisma } from '../../lib/prisma';
import { LinkType, LinkStatus } from '@prisma/client';

interface CreateSwitchConnectionData {
  source: { switchId?: string; routerId?: string };
  target: { switchId?: string; routerId?: string };
  linkType?: LinkType;
  linkStatus?: LinkStatus;
  sourceInterface?: string;
  targetInterface?: string;
  sourcePortNumber?: number;
  targetPortNumber?: number;
  vlan?: number;
  speed?: string;
  bandwidth?: string;
  distance?: number;
  notes?: string;
}

interface UpdateSwitchConnectionData {
  linkType?: LinkType;
  linkStatus?: LinkStatus;
  sourceInterface?: string;
  targetInterface?: string;
  sourcePortNumber?: number;
  targetPortNumber?: number;
  vlan?: number;
  speed?: string;
  bandwidth?: string;
  distance?: number;
  notes?: string;
}

const connectionInclude = {
  sourceSwitch: {
    select: { id: true, name: true, ipAddress: true, companyId: true }
  },
  sourceRouter: {
    select: { id: true, name: true, ipAddress: true, companyId: true }
  },
  targetSwitch: {
    select: { id: true, name: true, ipAddress: true, companyId: true }
  },
  targetRouter: {
    select: { id: true, name: true, ipAddress: true, companyId: true }
  },
  company: {
    select: { id: true, name: true, code: true }
  }
} as const;

export class SwitchConnectionService {
  /**
   * Resolve device info for an endpoint (switch or router)
   */
  private async resolveDevice(deviceId: string, kind: 'switch' | 'router') {
    if (kind === 'switch') {
      return prisma.switch.findUnique({ where: { id: deviceId } });
    }
    return prisma.router.findUnique({ where: { id: deviceId } });
  }

  /**
   * Get all switch connections, optionally filtered by company
   * (a connection matches if either endpoint or the connection itself belongs to the company)
   */
  async getAllSwitchConnections(companyId?: string) {
    const where = companyId
      ? {
          OR: [
            { companyId },
            { sourceSwitch: { companyId } },
            { sourceRouter: { companyId } },
            { targetSwitch: { companyId } },
            { targetRouter: { companyId } }
          ]
        }
      : undefined;

    return await prisma.switchConnection.findMany({
      where,
      include: connectionInclude,
      orderBy: { createdAt: 'desc' }
    });
  }

  /**
   * Get switch connection by ID
   */
  async getSwitchConnectionById(id: string) {
    const conn = await prisma.switchConnection.findUnique({
      where: { id },
      include: connectionInclude
    });

    if (!conn) {
      throw new Error('Switch connection not found');
    }

    return conn;
  }

  /**
   * Create a switch connection.
   * Validates both endpoints exist, are different, and derives companyId
   * from the involved devices (mirrors RouterConnectionService.createConnection).
   */
  async createSwitchConnection(data: CreateSwitchConnectionData) {
    const sourceId = data.source.switchId || data.source.routerId!;
    const targetId = data.target.switchId || data.target.routerId!;
    const sourceKind = data.source.switchId ? 'switch' : 'router';
    const targetKind = data.target.switchId ? 'switch' : 'router';

    const [sourceDevice, targetDevice] = await Promise.all([
      this.resolveDevice(sourceId, sourceKind),
      this.resolveDevice(targetId, targetKind)
    ]);

    if (!sourceDevice) {
      throw new Error(`Source ${sourceKind} not found`);
    }
    if (!targetDevice) {
      throw new Error(`Target ${targetKind} not found`);
    }

    // CompanyId derived from the involved devices' company
    const companyId = sourceDevice.companyId || targetDevice.companyId;

    // Dedupe: same endpoints (either direction) + same interfaces
    const existing = await prisma.switchConnection.findFirst({
      where: {
        OR: [
          {
            sourceSwitchId: sourceKind === 'switch' ? sourceId : null,
            sourceRouterId: sourceKind === 'router' ? sourceId : null,
            targetSwitchId: targetKind === 'switch' ? targetId : null,
            targetRouterId: targetKind === 'router' ? targetId : null
          },
          {
            sourceSwitchId: targetKind === 'switch' ? targetId : null,
            sourceRouterId: targetKind === 'router' ? targetId : null,
            targetSwitchId: sourceKind === 'switch' ? sourceId : null,
            targetRouterId: sourceKind === 'router' ? sourceId : null
          }
        ],
        sourceInterface: data.sourceInterface || null,
        targetInterface: data.targetInterface || null
      }
    });

    if (existing) {
      throw new Error('Switch connection already exists between these devices with the same interfaces');
    }

    return await prisma.switchConnection.create({
      data: {
        sourceSwitchId: sourceKind === 'switch' ? sourceId : null,
        sourceRouterId: sourceKind === 'router' ? sourceId : null,
        targetSwitchId: targetKind === 'switch' ? targetId : null,
        targetRouterId: targetKind === 'router' ? targetId : null,
        linkType: data.linkType,
        linkStatus: data.linkStatus,
        sourceInterface: data.sourceInterface,
        targetInterface: data.targetInterface,
        sourcePortNumber: data.sourcePortNumber,
        targetPortNumber: data.targetPortNumber,
        vlan: data.vlan,
        speed: data.speed,
        bandwidth: data.bandwidth,
        distance: data.distance,
        notes: data.notes,
        companyId: companyId || null
      },
      include: connectionInclude
    });
  }

  /**
   * Update a switch connection (link details only — endpoints are immutable here)
   */
  async updateSwitchConnection(id: string, data: UpdateSwitchConnectionData) {
    const existing = await prisma.switchConnection.findUnique({ where: { id } });

    if (!existing) {
      throw new Error('Switch connection not found');
    }

    return await prisma.switchConnection.update({
      where: { id },
      data,
      include: connectionInclude
    });
  }

  /**
   * Delete a switch connection
   */
  async deleteSwitchConnection(id: string) {
    const existing = await prisma.switchConnection.findUnique({ where: { id } });

    if (!existing) {
      throw new Error('Switch connection not found');
    }

    await prisma.switchConnection.delete({ where: { id } });

    return { message: 'Switch connection deleted successfully' };
  }
}
