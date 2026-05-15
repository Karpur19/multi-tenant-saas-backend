const express = require('express');
const router = express.Router();
const adminController = require('../controllers/admin.controller');
const { authenticate } = require('../middleware/auth');
const { requireMinRole } = require('../middleware/rbac');

// All admin routes require authentication and admin role
router.use(authenticate);
router.use(requireMinRole('admin'));

/**
 * @swagger
 * /api/v1/admin/stats:
 *   get:
 *     summary: Get overview statistics
 *     description: Retrieve key metrics (tenants, users, MRR, API calls)
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Statistics retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     tenants:
 *                       type: integer
 *                     users:
 *                       type: integer
 *                     activeSubscriptions:
 *                       type: integer
 *                     apiCalls:
 *                       type: integer
 *                     mrr:
 *                       type: string
 *       403:
 *         description: Forbidden - requires admin role
 */
router.get('/stats', adminController.getStats);

/**
 * @swagger
 * /api/v1/admin/tenants:
 *   get:
 *     summary: Get all tenants
 *     description: Retrieve list of all tenants with subscription and usage info
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Tenants retrieved successfully
 */
router.get('/tenants', adminController.getTenants);

/**
 * @swagger
 * /api/v1/admin/revenue:
 *   get:
 *     summary: Get revenue breakdown
 *     description: Revenue analysis by subscription plan
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Revenue breakdown retrieved successfully
 */
router.get('/revenue', adminController.getRevenueBreakdown);

/**
 * @swagger
 * /api/v1/admin/usage-analytics:
 *   get:
 *     summary: Get usage analytics
 *     description: API usage over last 7 days
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Usage analytics retrieved successfully
 */
router.get('/usage-analytics', adminController.getUsageAnalytics);

/**
 * @swagger
 * /api/v1/admin/top-endpoints:
 *   get:
 *     summary: Get top endpoints
 *     description: Most used API endpoints (last 30 days)
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Top endpoints retrieved successfully
 */
router.get('/top-endpoints', adminController.getTopEndpoints);

module.exports = router;
