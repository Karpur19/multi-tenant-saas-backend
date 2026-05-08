const express = require('express');
const router = express.Router();
const subscriptionController = require('../controllers/subscription.controller');
const { authenticate } = require('../middleware/auth');
const { setTenantContext } = require('../middleware/tenantContext');
const { requireMinRole } = require('../middleware/rbac');

// Public routes (no auth required)
// Get available plans
router.get('/plans', subscriptionController.getPlans);

// Get specific plan by slug
router.get('/plans/:slug', subscriptionController.getPlanBySlug);

// Protected routes (require authentication)
router.use(authenticate);
router.use(setTenantContext);

// Get current subscription (any authenticated user)
router.get('/current', subscriptionController.getCurrentSubscription);

// Get subscription history (any authenticated user)
router.get('/history', subscriptionController.getSubscriptionHistory);

// Subscribe to a plan (requires admin role)
router.post(
  '/subscribe',
  requireMinRole('admin'),
  subscriptionController.subscribe
);

// Upgrade subscription (requires admin role)
router.put(
  '/upgrade',
  requireMinRole('admin'),
  subscriptionController.upgrade
);

// Downgrade subscription (requires admin role)
router.put(
  '/downgrade',
  requireMinRole('admin'),
  subscriptionController.downgrade
);

// Cancel subscription (requires admin role)
router.delete(
  '/cancel',
  requireMinRole('admin'),
  subscriptionController.cancel
);

module.exports = router;