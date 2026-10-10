import { prisma } from '../../lib/prisma';
import { encrypt, decrypt } from '../../lib/encryption';

interface CreateSwitchData {
  name: string;
  ipAddress: string;
  macAddress?: string;
  model?: string;
  location?: string;
  portCount?: number;
  status?: 'ACTIVE' | 'INACTIVE' | 'MAINTENANCE';
  brand?: 'MIKROTIK' | 'UBIVIQUITI';
  companyId: string;
  username: string;
  password: string;
  apiPort?: number;
  sshPort?: number;
}

interface UpdateSwitchData {
  name?: string;
  ipAddress?: string;
  macAddress?: string;
  model?: string;
  location?: string;
  portCount?: number;
  status?: 'ACTIVE' | 'INACTIVE' | 'MAINTENANCE';
  brand?: 'MIKROTIK' | 'UBIVIQUITI';
  companyId?: string;
  username?: string;
  password?: string;
  apiPort?: number;
  sshPort?: number;
}

const switchInclude = {
  company: {
    select: { id: true, name: true, code: true }
  },
  _count: {
    select: { connectionsAsSource: true, connectionsAsTarget: true }
  }
} as const;

export class SwitchService {
  /**
   * Get all switches (no decrypted password in list view)
   */
  async getAllSwitches() {
    const switches = await prisma.switch.findMany({
      include: switchInclude,
      orderBy: { createdAt: 'desc' }
    });

    return switches.map(s => ({
      id: s.id,
      name: s.name,
      ipAddress: s.ipAddress,
      macAddress: s.macAddress,
      model: s.model,
      location: s.location,
      portCount: s.portCount,
      status: s.status,
      brand: s.brand,
      companyId: s.companyId,
      company: s.company,
      username: s.username,
      connectionCount: s._count.connectionsAsSource + s._count.connectionsAsTarget,
      createdAt: s.createdAt,
      updatedAt: s.updatedAt
    }));
  }

  /**
   * Get switch by ID with decrypted password (mirrors CompanyService behavior)
   */
  async getSwitchById(id: string) {
    const s = await prisma.switch.findUnique({
      where: { id },
      include: switchInclude
    });

    if (!s) return null;

    return {
      id: s.id,
      name: s.name,
      ipAddress: s.ipAddress,
      macAddress: s.macAddress,
      model: s.model,
      location: s.location,
      portCount: s.portCount,
      status: s.status,
      brand: s.brand,
      companyId: s.companyId,
      company: s.company,
      username: s.username,
      password: decrypt(s.password),
      apiPort: s.apiPort,
      sshPort: s.sshPort,
      connectionCount: s._count.connectionsAsSource + s._count.connectionsAsTarget,
      createdAt: s.createdAt,
      updatedAt: s.updatedAt
    };
  }

  /**
   * Create a switch — encrypts the password before storing
   */
  async createSwitch(data: CreateSwitchData) {
    const { password, ...rest } = data;

    const s = await prisma.switch.create({
      data: {
        ...rest,
        password: encrypt(password)
      },
      include: switchInclude
    });

    return {
      id: s.id,
      name: s.name,
      ipAddress: s.ipAddress,
      macAddress: s.macAddress,
      model: s.model,
      location: s.location,
      portCount: s.portCount,
      status: s.status,
      brand: s.brand,
      companyId: s.companyId,
      company: s.company,
      username: s.username,
      password, // Return original password
      apiPort: s.apiPort,
      sshPort: s.sshPort,
      connectionCount: s._count.connectionsAsSource + s._count.connectionsAsTarget,
      createdAt: s.createdAt,
      updatedAt: s.updatedAt
    };
  }

  /**
   * Update a switch — re-encrypts password if present; never stores plaintext
   */
  async updateSwitch(id: string, data: UpdateSwitchData) {
    const updateData: Record<string, unknown> = { ...data };
    if (data.password) {
      updateData.password = encrypt(data.password);
    }

    const s = await prisma.switch.update({
      where: { id },
      data: updateData,
      include: switchInclude
    });

    return {
      id: s.id,
      name: s.name,
      ipAddress: s.ipAddress,
      macAddress: s.macAddress,
      model: s.model,
      location: s.location,
      portCount: s.portCount,
      status: s.status,
      brand: s.brand,
      companyId: s.companyId,
      company: s.company,
      username: s.username,
      password: decrypt(s.password),
      apiPort: s.apiPort,
      sshPort: s.sshPort,
      connectionCount: s._count.connectionsAsSource + s._count.connectionsAsTarget,
      createdAt: s.createdAt,
      updatedAt: s.updatedAt
    };
  }

  /**
   * Delete a switch
   */
  async deleteSwitch(id: string) {
    return await prisma.switch.delete({ where: { id } });
  }

  /**
   * Check a company exists (used by controller for FK validation)
   */
  async companyExists(companyId: string) {
    const company = await prisma.company.findUnique({ where: { id: companyId }, select: { id: true } });
    return !!company;
  }
}
