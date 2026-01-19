import { prisma } from '../lib/prisma';
import { encrypt, decrypt } from '../lib/encryption';

interface CreateCompanyData {
  name: string;
  code: string;
  address: string;
  description?: string;
  logo?: string;
  masterUsername: string;
  masterPassword: string;
}

interface UpdateCompanyData {
  name?: string;
  code?: string;
  address?: string;
  description?: string;
  logo?: string;
  masterUsername?: string;
  masterPassword?: string;
}

interface CompanyWithDecryptedPassword {
  id: string;
  name: string;
  code: string;
  address: string;
  description: string | null;
  logo: string | null;
  masterUsername: string;
  masterPassword: string; // Decrypted
  createdAt: Date;
  updatedAt: Date;
  routerCount?: number;
}

export class CompanyService {
  /**
   * Get all companies with router count
   */
  async getAllCompanies() {
    const companies = await prisma.company.findMany({
      include: {
        _count: {
          select: { routers: true }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    // Return without decrypting passwords for list view
    return companies.map(company => ({
      id: company.id,
      name: company.name,
      code: company.code,
      address: company.address,
      description: company.description,
      logo: company.logo,
      masterUsername: company.masterUsername,
      routerCount: company._count.routers,
      createdAt: company.createdAt,
      updatedAt: company.updatedAt
    }));
  }

  /**
   * Get company by ID with decrypted password
   */
  async getCompanyById(id: string): Promise<CompanyWithDecryptedPassword | null> {
    const company = await prisma.company.findUnique({
      where: { id },
      include: {
        _count: {
          select: { routers: true }
        }
      }
    });

    if (!company) {
      return null;
    }

    return {
      id: company.id,
      name: company.name,
      code: company.code,
      address: company.address,
      description: company.description,
      logo: company.logo,
      masterUsername: company.masterUsername,
      masterPassword: decrypt(company.masterPassword),
      routerCount: company._count.routers,
      createdAt: company.createdAt,
      updatedAt: company.updatedAt
    };
  }

  /**
   * Get company by code
   */
  async getCompanyByCode(code: string) {
    const company = await prisma.company.findUnique({
      where: { code },
      include: {
        _count: {
          select: { routers: true }
        }
      }
    });

    if (!company) {
      return null;
    }

    return {
      id: company.id,
      name: company.name,
      code: company.code,
      address: company.address,
      description: company.description,
      logo: company.logo,
      masterUsername: company.masterUsername,
      masterPassword: decrypt(company.masterPassword),
      routerCount: company._count.routers,
      createdAt: company.createdAt,
      updatedAt: company.updatedAt
    };
  }

  /**
   * Create a new company
   */
  async createCompany(data: CreateCompanyData) {
    // Encrypt the master password before storing
    const encryptedPassword = encrypt(data.masterPassword);

    const company = await prisma.company.create({
      data: {
        name: data.name,
        code: data.code,
        address: data.address,
        description: data.description,
        logo: data.logo,
        masterUsername: data.masterUsername,
        masterPassword: encryptedPassword
      },
      include: {
        _count: {
          select: { routers: true }
        }
      }
    });

    // Return with decrypted password
    return {
      id: company.id,
      name: company.name,
      code: company.code,
      address: company.address,
      description: company.description,
      logo: company.logo,
      masterUsername: company.masterUsername,
      masterPassword: data.masterPassword, // Return original password
      routerCount: company._count.routers,
      createdAt: company.createdAt,
      updatedAt: company.updatedAt
    };
  }

  /**
   * Update company
   */
  async updateCompany(id: string, data: UpdateCompanyData) {
    // If password is being updated, encrypt it
    const updateData: any = { ...data };
    if (data.masterPassword) {
      updateData.masterPassword = encrypt(data.masterPassword);
    }

    const company = await prisma.company.update({
      where: { id },
      data: updateData,
      include: {
        _count: {
          select: { routers: true }
        }
      }
    });

    // Return with decrypted password
    return {
      id: company.id,
      name: company.name,
      code: company.code,
      address: company.address,
      description: company.description,
      logo: company.logo,
      masterUsername: company.masterUsername,
      masterPassword: decrypt(company.masterPassword),
      routerCount: company._count.routers,
      createdAt: company.createdAt,
      updatedAt: company.updatedAt
    };
  }

  /**
   * Delete company
   */
  async deleteCompany(id: string) {
    return await prisma.company.delete({
      where: { id }
    });
  }

  /**
   * Get company's routers
   */
  async getCompanyRouters(companyId: string) {
    return await prisma.router.findMany({
      where: { companyId },
      orderBy: {
        createdAt: 'desc'
      }
    });
  }

  /**
   * Check if company name exists
   */
  async isNameExists(name: string, excludeId?: string) {
    const company = await prisma.company.findUnique({
      where: { name }
    });

    if (!company) return false;
    if (excludeId && company.id === excludeId) return false;
    return true;
  }

  /**
   * Check if company code exists
   */
  async isCodeExists(code: string, excludeId?: string) {
    const company = await prisma.company.findUnique({
      where: { code }
    });

    if (!company) return false;
    if (excludeId && company.id === excludeId) return false;
    return true;
  }

  /**
   * Get decrypted master credentials for connecting to routers
   * This method should be used internally when establishing router connections
   */
  async getMasterCredentials(companyId: string): Promise<{ username: string; password: string } | null> {
    const company = await prisma.company.findUnique({
      where: { id: companyId },
      select: {
        masterUsername: true,
        masterPassword: true
      }
    });

    if (!company) {
      return null;
    }

    return {
      username: company.masterUsername,
      password: decrypt(company.masterPassword)
    };
  }
}
