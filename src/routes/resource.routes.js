const express = require('express');
const router = express.Router();
const { body, param, query } = require('express-validator');
const resourceController = require('../controllers/resource.controller');
const { authenticate } = require('../middleware/auth');
const { setTenantContext } = require('../middleware/tenantContext');
const { trackUsage } = require('../middleware/usageTracking');
const { validate } = require('../middleware/validator');

// All routes require authentication
router.use(authenticate);
router.use(setTenantContext);
router.use(trackUsage);

// Validation rules
const createResourceValidation = [
  body('name')
    .trim()
    .notEmpty().withMessage('Name is required')
    .isLength({ max: 255 }).withMessage('Name must be at most 255 characters'),
  body('description')
    .optional()
    .trim(),
  body('status')
    .optional()
    .isIn(['active', 'inactive', 'archived']).withMessage('Invalid status'),
  body('metadata')
    .optional()
    .isObject().withMessage('Metadata must be an object'),
];

const updateResourceValidation = [
  param('id').isUUID().withMessage('Invalid resource ID'),
  body('name')
    .optional()
    .trim()
    .isLength({ max: 255 }).withMessage('Name must be at most 255 characters'),
  body('description')
    .optional()
    .trim(),
  body('status')
    .optional()
    .isIn(['active', 'inactive', 'archived']).withMessage('Invalid status'),
  body('metadata')
    .optional()
    .isObject().withMessage('Metadata must be an object'),
];

const idValidation = [
  param('id').isUUID().withMessage('Invalid resource ID'),
];

const listValidation = [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  query('status').optional().isIn(['active', 'inactive', 'archived']).withMessage('Invalid status'),
  query('sortBy').optional().isIn(['name', 'created_at', 'updated_at']).withMessage('Invalid sort field'),
  query('order').optional().isIn(['asc', 'desc']).withMessage('Order must be asc or desc'),
];

// Routes
router.get('/', listValidation, validate, resourceController.list);
router.get('/:id', idValidation, validate, resourceController.getById);
router.post('/', createResourceValidation, validate, resourceController.create);
router.put('/:id', updateResourceValidation, validate, resourceController.update);
router.delete('/:id', idValidation, validate, resourceController.remove);

module.exports = router;
