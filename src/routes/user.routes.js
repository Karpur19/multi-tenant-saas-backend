const express = require('express');
const router = express.Router();
const { body, param, query } = require('express-validator');
const userController = require('../controllers/user.controller');
const { authenticate } = require('../middleware/auth');
const { setTenantContext } = require('../middleware/tenantContext');
const { requireRole, requireOwnershipOrAdmin } = require('../middleware/rbac');
const { trackUsage } = require('../middleware/usageTracking');
const { validate } = require('../middleware/validator');

// All routes require authentication
router.use(authenticate);
router.use(setTenantContext);
router.use(trackUsage);

// Validation rules
const createUserValidation = [
  body('email')
    .trim()
    .notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Must be a valid email')
    .normalizeEmail(),
  body('password')
    .notEmpty().withMessage('Password is required')
    .isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
  body('firstName')
    .trim()
    .notEmpty().withMessage('First name is required')
    .isLength({ max: 100 }).withMessage('First name must be at most 100 characters'),
  body('lastName')
    .trim()
    .notEmpty().withMessage('Last name is required')
    .isLength({ max: 100 }).withMessage('Last name must be at most 100 characters'),
  body('role')
    .optional()
    .isIn(['user', 'admin']).withMessage('Role must be either user or admin'),
];

const updateUserValidation = [
  param('id').isUUID().withMessage('Invalid user ID'),
  body('email')
    .optional()
    .trim()
    .isEmail().withMessage('Must be a valid email')
    .normalizeEmail(),
  body('firstName')
    .optional()
    .trim()
    .isLength({ max: 100 }).withMessage('First name must be at most 100 characters'),
  body('lastName')
    .optional()
    .trim()
    .isLength({ max: 100 }).withMessage('Last name must be at most 100 characters'),
  body('role')
    .optional()
    .isIn(['user', 'admin']).withMessage('Role must be either user or admin'),
  body('isActive')
    .optional()
    .isBoolean().withMessage('isActive must be a boolean'),
];

const idValidation = [
  param('id').isUUID().withMessage('Invalid user ID'),
];

const listValidation = [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  query('role').optional().isIn(['user', 'admin']).withMessage('Invalid role'),
  query('isActive').optional().isBoolean().withMessage('isActive must be a boolean'),
];

// Routes
router.get('/', requireRole('admin'), listValidation, validate, userController.list);
router.get('/:id', idValidation, validate, requireOwnershipOrAdmin('id'), userController.getById);
router.post('/', requireRole('admin'), createUserValidation, validate, userController.create);
router.put('/:id', updateUserValidation, validate, requireOwnershipOrAdmin('id'), userController.update);
router.delete('/:id', idValidation, validate, requireRole('admin'), userController.remove);

module.exports = router;
