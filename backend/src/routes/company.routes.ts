import { Router } from 'express';
import { CompanyController } from '../controllers/company.controller';

const router = Router();
const companyController = new CompanyController();

// GET /api/companies - Get all companies
router.get('/', companyController.getAll);

// GET /api/companies/:id - Get company by ID
router.get('/:id', companyController.getById);

// GET /api/companies/code/:code - Get company by code
router.get('/code/:code', companyController.getByCode);

// GET /api/companies/:id/routers - Get company's routers
router.get('/:id/routers', companyController.getRouters);

// POST /api/companies - Create new company
router.post('/', companyController.create);

// PUT /api/companies/:id - Update company
router.put('/:id', companyController.update);

// DELETE /api/companies/:id - Delete company
router.delete('/:id', companyController.delete);

export default router;
