import { Request, Response, NextFunction } from 'express';
import { CompanyService } from '../services/company.service';
import { createCompanySchema, updateCompanySchema } from '../validators/company.validator';
import { ZodError } from 'zod';

export class CompanyController {
  private companyService: CompanyService;

  constructor() {
    this.companyService = new CompanyService();
  }

  getAll = async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const companies = await this.companyService.getAllCompanies();
      res.json({
        status: 'success',
        data: companies
      });
    } catch (error) {
      next(error);
    }
  };

  getById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      const company = await this.companyService.getCompanyById(id);

      if (!company) {
        res.status(404).json({
          status: 'error',
          message: 'Company not found'
        });
        return;
      }

      res.json({
        status: 'success',
        data: company
      });
    } catch (error) {
      next(error);
    }
  };

  getByCode = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { code } = req.params;
      const company = await this.companyService.getCompanyByCode(code);

      if (!company) {
        res.status(404).json({
          status: 'error',
          message: 'Company not found'
        });
        return;
      }

      res.json({
        status: 'success',
        data: company
      });
    } catch (error) {
      next(error);
    }
  };

  create = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const validatedData = createCompanySchema.parse(req.body);

      // Check if name already exists
      const nameExists = await this.companyService.isNameExists(validatedData.name);
      if (nameExists) {
        res.status(409).json({
          status: 'error',
          message: 'Company name already exists'
        });
        return;
      }

      // Check if code already exists
      const codeExists = await this.companyService.isCodeExists(validatedData.code);
      if (codeExists) {
        res.status(409).json({
          status: 'error',
          message: 'Company code already exists'
        });
        return;
      }

      const company = await this.companyService.createCompany(validatedData);

      res.status(201).json({
        status: 'success',
        data: company
      });
    } catch (error) {
      if (error instanceof ZodError) {
        res.status(400).json({
          status: 'error',
          message: 'Validation error',
          errors: error.errors
        });
        return;
      }
      next(error);
    }
  };

  update = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      const validatedData = updateCompanySchema.parse(req.body);

      // Check if company exists
      const existingCompany = await this.companyService.getCompanyById(id);
      if (!existingCompany) {
        res.status(404).json({
          status: 'error',
          message: 'Company not found'
        });
        return;
      }

      // Check if name is being updated and already exists
      if (validatedData.name) {
        const nameExists = await this.companyService.isNameExists(validatedData.name, id);
        if (nameExists) {
          res.status(409).json({
            status: 'error',
            message: 'Company name already exists'
          });
          return;
        }
      }

      // Check if code is being updated and already exists
      if (validatedData.code) {
        const codeExists = await this.companyService.isCodeExists(validatedData.code, id);
        if (codeExists) {
          res.status(409).json({
            status: 'error',
            message: 'Company code already exists'
          });
          return;
        }
      }

      const company = await this.companyService.updateCompany(id, validatedData);

      res.json({
        status: 'success',
        data: company
      });
    } catch (error) {
      if (error instanceof ZodError) {
        res.status(400).json({
          status: 'error',
          message: 'Validation error',
          errors: error.errors
        });
        return;
      }
      next(error);
    }
  };

  delete = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;

      // Check if company exists
      const company = await this.companyService.getCompanyById(id);
      if (!company) {
        res.status(404).json({
          status: 'error',
          message: 'Company not found'
        });
        return;
      }

      await this.companyService.deleteCompany(id);

      res.status(204).send();
    } catch (error) {
      next(error);
    }
  };

  getRouters = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;

      // Check if company exists
      const company = await this.companyService.getCompanyById(id);
      if (!company) {
        res.status(404).json({
          status: 'error',
          message: 'Company not found'
        });
        return;
      }

      const routers = await this.companyService.getCompanyRouters(id);

      res.json({
        status: 'success',
        data: routers
      });
    } catch (error) {
      next(error);
    }
  };
}
