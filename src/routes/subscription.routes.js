const express = require('express');
const router = express.Router();
const subscriptionController = require('../controllers/subscription.controller');
const { authenticate } = require('../middleware/auth');
const { setTenantContext } = require('../middleware/tenantContext');
const { requireMinRole } = require('../middleware/rbac');

// Public routes (no auth required)

/**
 * @swagger
 * /api/v1/subscriptions/plans:
 *   get:
 *     summary: Get all subscription plans
 *     description: Retrieve list of all available public subscription plans
 *     tags: [Subscriptions]
 *     security: []
 *     responses:
 *       200:
 *         description: List of subscription plans retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     plans:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/SubscriptionPlan'
 */
router.get('/plans', subscriptionController.getPlans);

/**
 * @swagger
 * /api/v1/subscriptions/plans/{slug}:
 *   get:
 *     summary: Get plan by slug
 *     description: Retrieve detailed information about a specific subscription plan
 *     tags: [Subscriptions]
 *     security: []
 *     parameters:
 *       - in: path
 *         name: slug
 *         required: true
 *         schema:
 *           type: string
 *           enum: [free, starter, pro, enterprise]
 *         description: Plan slug identifier
 *         example: pro
 *     responses:
 *       200:
 *         description: Plan details retrieved successfully
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
 *                     plan:
 *                       $ref: '#/components/schemas/SubscriptionPlan'
 *       404:
 *         description: Plan not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/plans/:slug', subscriptionController.getPlanBySlug);

// Protected routes (require authentication)
router.use(authenticate);
router.use(setTenantContext);

/**
 * @swagger
 * /api/v1/subscriptions/current:
 *   get:
 *     summary: Get current subscription
 *     description: Retrieve the authenticated tenant's active subscription details
 *     tags: [Subscriptions]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Current subscription retrieved successfully
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
 *                     subscription:
 *                       allOf:
 *                         - $ref: '#/components/schemas/Subscription'
 *                         - type: object
 *                           properties:
 *                             plan:
 *                               $ref: '#/components/schemas/SubscriptionPlan'
 *                             usage:
 *                               type: object
 *                               properties:
 *                                 api_calls:
 *                                   type: integer
 *                                 storage_gb:
 *                                   type: number
 *       404:
 *         description: No active subscription found
 *       401:
 *         description: Unauthorized
 */
router.get('/current', subscriptionController.getCurrentSubscription);

/**
 * @swagger
 * /api/v1/subscriptions/history:
 *   get:
 *     summary: Get subscription history
 *     description: Retrieve all subscription events and changes for the tenant
 *     tags: [Subscriptions]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Subscription history retrieved successfully
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
 *                     events:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: string
 *                           event_type:
 *                             type: string
 *                             enum: [subscribed, upgraded, downgraded, cancelled, renewed]
 *                           from_plan:
 *                             type: string
 *                           to_plan:
 *                             type: string
 *                           created_at:
 *                             type: string
 *                             format: date-time
 *       401:
 *         description: Unauthorized
 */
router.get('/history', subscriptionController.getSubscriptionHistory);

/**
 * @swagger
 * /api/v1/subscriptions/subscribe:
 *   post:
 *     summary: Subscribe to a plan (Admin only)
 *     description: Create a new subscription for the tenant (requires admin role)
 *     tags: [Subscriptions]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - planSlug
 *               - billingCycle
 *             properties:
 *               planSlug:
 *                 type: string
 *                 enum: [free, starter, pro, enterprise]
 *                 example: pro
 *               billingCycle:
 *                 type: string
 *                 enum: [monthly, yearly]
 *                 example: monthly
 *     responses:
 *       201:
 *         description: Subscription created successfully
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
 *                     subscription:
 *                       $ref: '#/components/schemas/Subscription'
 *       400:
 *         description: Already subscribed or invalid plan
 *       403:
 *         description: Forbidden - requires admin role
 *       404:
 *         description: Plan not found
 */
router.post(
  '/subscribe',
  requireMinRole('admin'),
  subscriptionController.subscribe
);

/**
 * @swagger
 * /api/v1/subscriptions/upgrade:
 *   put:
 *     summary: Upgrade subscription (Admin only)
 *     description: Upgrade to a higher-tier plan with prorated billing
 *     tags: [Subscriptions]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - planSlug
 *             properties:
 *               planSlug:
 *                 type: string
 *                 enum: [starter, pro, enterprise]
 *                 example: enterprise
 *     responses:
 *       200:
 *         description: Subscription upgraded successfully
 *       400:
 *         description: Cannot upgrade to same or lower tier
 *       403:
 *         description: Forbidden - requires admin role
 *       404:
 *         description: Plan not found or no active subscription
 */
router.put(
  '/upgrade',
  requireMinRole('admin'),
  subscriptionController.upgrade
);

/**
 * @swagger
 * /api/v1/subscriptions/downgrade:
 *   put:
 *     summary: Downgrade subscription (Admin only)
 *     description: Downgrade to a lower-tier plan (takes effect at period end)
 *     tags: [Subscriptions]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - planSlug
 *             properties:
 *               planSlug:
 *                 type: string
 *                 enum: [free, starter, pro]
 *                 example: starter
 *     responses:
 *       200:
 *         description: Subscription downgrade scheduled
 *       400:
 *         description: Cannot downgrade to same or higher tier
 *       403:
 *         description: Forbidden - requires admin role
 *       404:
 *         description: Plan not found or no active subscription
 */
router.put(
  '/downgrade',
  requireMinRole('admin'),
  subscriptionController.downgrade
);

/**
 * @swagger
 * /api/v1/subscriptions/cancel:
 *   delete:
 *     summary: Cancel subscription (Admin only)
 *     description: Cancel the current subscription (remains active until period end)
 *     tags: [Subscriptions]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Subscription cancelled successfully (active until period end)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                   example: Subscription cancelled. Will remain active until 2026-06-15
 *       403:
 *         description: Forbidden - requires admin role
 *       404:
 *         description: No active subscription to cancel
 */
router.delete(
  '/cancel',
  requireMinRole('admin'),
  subscriptionController.cancel
);

module.exports = router;