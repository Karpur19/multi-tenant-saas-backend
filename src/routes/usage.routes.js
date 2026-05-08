const express = require('express');
const router = express.Router();
const usageController = require('../controllers/usage.controller');
const { authenticate } = require('../middleware/auth');
const { setTenantContext } = require('../middleware/tenantContext');

// All routes require authentication
router.use(authenticate);
router.use(setTenantContext);

// Get current usage
router.get('/current', usageController.getCurrentUsage);

// Get usage analytics
router.get('/analytics', usageController.getAnalytics);

// Get usage history
router.get('/history', usageController.getHistory);

module.exports = router;
