import { prisma } from '../lib/prisma';
import { RouterStatus, RouterType, RouterBrand } from '@prisma/client';
import { encrypt } from '../lib/encryption';

interface CreateRouterData {
  name: string;
  ipAddress: string;
  macAddress?: string;
  model?: string;
  location?: string;
  status?: RouterStatus;
  routerType?: RouterType;
  routerBrand?: RouterBrand;
  companyId?: string;
  username: string;
  password: string;
  apiPort?: number;
  sshPort?: number;
}

interface UpdateRouterData {
  name?: string;
  ipAddress?: string;
  macAddress?: string;
  model?: string;
  location?: string;
  status?: RouterStatus;
  routerType?: RouterType;
  routerBrand?: RouterBrand;
  lastSeen?: Date;
  companyId?: string;
  username?: string;
  password?: string;
  apiPort?: number;
  sshPort?: number;
}

export class RouterService {
  async getAllRouters() {
    return await prisma.router.findMany({
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
        createdAt: 'desc'
      }
    });
  }

  /**
   * Get routers that support BGP operations
   * Only returns MikroTik routers with type UPSTREAM and status ACTIVE
   */
  async getBgpRouters() {
    return await prisma.router.findMany({
      where: {
        routerBrand: RouterBrand.MIKROTIK,
        routerType: RouterType.UPSTREAM,
        status: RouterStatus.ACTIVE
      },
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
  }

  async getRouterById(id: string) {
    return await prisma.router.findUnique({
      where: { id },
      include: {
        company: {
          select: {
            id: true,
            name: true,
            code: true
          }
        }
      }
    });
  }

  async createRouter(data: CreateRouterData) {
    // Encrypt the password before storing
    const encryptedPassword = encrypt(data.password);

    return await prisma.router.create({
      data: {
        ...data,
        password: encryptedPassword
      },
      include: {
        company: {
          select: {
            id: true,
            name: true,
            code: true
          }
        }
      }
    });
  }

  async updateRouter(id: string, data: UpdateRouterData) {
    // If password is being updated, encrypt it
    // If password is undefined or empty, don't include it in the update
    const updateData: any = { ...data };

    if (data.password) {
      updateData.password = encrypt(data.password);
    } else if (data.password === undefined) {
      // Remove password from update if it's undefined (not changing)
      delete updateData.password;
    }

    return await prisma.router.update({
      where: { id },
      data: updateData,
      include: {
        company: {
          select: {
            id: true,
            name: true,
            code: true
          }
        }
      }
    });
  }

  async deleteRouter(id: string) {
    return await prisma.router.delete({
      where: { id }
    });
  }

  async getRouterByIp(ipAddress: string) {
    return await prisma.router.findFirst({
      where: { ipAddress }
    });
  }
}
