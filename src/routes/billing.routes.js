const express = require('express');
const router = express.Router();
const billingController = require('../controllers/billing.controller');
const { authenticate } = require('../middleware/auth');
const { requireMinRole } = require('../middleware/rbac');

/**
 * @swagger
 * tags:
 *   name: Billing
 *   description: Razorpay payment integration and subscription billing
 */

/**
 * @swagger
 * /api/v1/billing/order:
 *   post:
 *     summary: Create Razorpay payment order
 *     tags: [Billing]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [planSlug]
 *             properties:
 *               planSlug:
 *                 type: string
 *                 enum: [starter, pro, enterprise]
 *                 example: pro
 *               billingCycle:
 *                 type: string
 *                 enum: [monthly, yearly]
 *                 example: monthly
 *     responses:
 *       200:
 *         description: Razorpay order created with key ID for frontend
 */
router.post('/order', authenticate, billingController.createOrder);

/**
 * @swagger
 * /api/v1/billing/verify:
 *   post:
 *     summary: Verify Razorpay payment and activate subscription
 *     tags: [Billing]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [razorpay_order_id, razorpay_payment_id, razorpay_signature]
 *             properties:
 *               razorpay_order_id:
 *                 type: string
 *                 example: order_abc123
 *               razorpay_payment_id:
 *                 type: string
 *                 example: pay_abc123
 *               razorpay_signature:
 *                 type: string
 *                 example: signature_hash
 *     responses:
 *       200:
 *         description: Payment verified and subscription activated
 */
router.post('/verify', authenticate, billingController.verifyPayment);

/**
 * @swagger
 * /api/v1/billing/info:
 *   get:
 *     summary: Get billing info and payment history
 *     tags: [Billing]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Billing info retrieved
 */
router.get('/info', authenticate, billingController.getBillingInfo);

/**
 * @swagger
 * /api/v1/billing/cancel:
 *   post:
 *     summary: Cancel subscription at period end
 *     tags: [Billing]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Cancellation scheduled
 */
router.post('/cancel', authenticate, requireMinRole('admin'), billingController.cancelSubscription);

/**
 * @swagger
 * /api/v1/billing/webhook:
 *   post:
 *     summary: Handle Razorpay webhooks
 *     tags: [Billing]
 *     responses:
 *       200:
 *         description: Webhook processed
 */
router.post('/webhook', express.json(), billingController.handleWebhook);

module.exports = router;
