const db = require('../config/database');
const razorpayService = require('../services/razorpay.service');
const logger = require('../utils/logger');

/**
 * Create Razorpay order
 */
const createOrder = async (req, res) => {
  try {
    const { planSlug, billingCycle = 'monthly' } = req.body;
    const tenantId = req.user.tenantId;
    const userId = req.user.id;

    if (!planSlug) {
      return res.status(400).json({
        success: false,
        error: { code: 'MISSING_PLAN', message: 'planSlug is required' }
      });
    }

    const planResult = await db.query(
      'SELECT * FROM subscription_plans WHERE slug = $1 AND is_active = true',
      [planSlug]
    );

    if (planResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: { code: 'PLAN_NOT_FOUND', message: `Plan not found: ${planSlug}` }
      });
    }

    const plan = planResult.rows[0];
    const usdAmount = billingCycle === 'yearly'
      ? parseFloat(plan.price_yearly)
      : parseFloat(plan.price_monthly);

    const inrAmount = razorpayService.convertUSDtoINR(usdAmount);

    const order = await razorpayService.createOrder({
      amount: inrAmount,
      currency: 'INR',
      tenantId,
      userId,
      planSlug: plan.slug,
      billingCycle
    });

    await db.query(`
      INSERT INTO payment_sessions
        (session_id, tenant_id, user_id, plan_id, amount,
         billing_cycle, status, metadata)
      VALUES ($1, $2, $3, $4, $5, $6, 'pending', $7)
    `, [
      order.id, tenantId, userId, plan.id, usdAmount, billingCycle,
      JSON.stringify({ planSlug: plan.slug, inrAmount, razorpayOrderId: order.id })
    ]);

    logger.info('Order created', { orderId: order.id, tenantId, planSlug });

    return res.json({
      success: true,
      data: {
        orderId: order.id,
        amount: order.amount,
        amountDisplay: inrAmount,
        amountUSD: usdAmount,
        currency: order.currency,
        plan: { name: plan.name, slug: plan.slug, billingCycle },
        razorpayKeyId: process.env.RAZORPAY_KEY_ID,
        testCards: {
          success: { number: '4111 1111 1111 1111', expiry: '12/29', cvv: '123' },
          failure: { number: '4000 0000 0000 0002', expiry: '12/29', cvv: '123' }
        }
      }
    });

   } catch (error) {
    logger.error('Create order error', {
      message: error.message,
      description: error.error?.description,
      statusCode: error.statusCode,
      fullError: JSON.stringify(error)
    });
    return res.status(500).json({
      success: false,
      error: {
        code: 'ORDER_ERROR',
        message: error.message || 'Unknown error',
        description: error.error?.description || null,
        statusCode: error.statusCode || null
      }
    });
  }

/**
 * Verify Razorpay payment
 */
const verifyPayment = async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
    const tenantId = req.user.tenantId;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'MISSING_FIELDS',
          message: 'razorpay_order_id, razorpay_payment_id and razorpay_signature required'
        }
      });
    }

    const isValid = razorpayService.verifyPaymentSignature({
      orderId: razorpay_order_id,
      paymentId: razorpay_payment_id,
      signature: razorpay_signature
    });

    if (!isValid) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_SIGNATURE', message: 'Payment verification failed' }
      });
    }

    const sessionResult = await db.query(
      'SELECT * FROM payment_sessions WHERE session_id = $1',
      [razorpay_order_id]
    );

    if (sessionResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: { code: 'SESSION_NOT_FOUND', message: 'Order not found' }
      });
    }

    const session = sessionResult.rows[0];

    const payment = await razorpayService.getPayment(razorpay_payment_id);

    const planResult = await db.query(
      'SELECT * FROM subscription_plans WHERE id = $1',
      [session.plan_id]
    );
    const plan = planResult.rows[0];

    const periodStart = new Date();
    const periodEnd = session.billing_cycle === 'yearly'
      ? new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
      : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    const subscriptionId = `sub_rzp_${razorpay_payment_id}`;

    await db.query(`
      INSERT INTO subscriptions
        (tenant_id, plan_id, status, billing_cycle,
         stripe_subscription_id, stripe_customer_id,
         current_period_start, current_period_end)
      VALUES ($1, $2, 'active', $3, $4, $5, $6, $7)
      ON CONFLICT (tenant_id)
      DO UPDATE SET
        plan_id = EXCLUDED.plan_id,
        status = 'active',
        billing_cycle = EXCLUDED.billing_cycle,
        stripe_subscription_id = EXCLUDED.stripe_subscription_id,
        current_period_start = EXCLUDED.current_period_start,
        current_period_end = EXCLUDED.current_period_end,
        updated_at = NOW()
    `, [
      session.tenant_id, session.plan_id, session.billing_cycle,
      subscriptionId, payment.contact || 'rzp_customer',
      periodStart, periodEnd
    ]);

    await db.query(`
      INSERT INTO payment_transactions
        (tenant_id, session_id, amount, status, plan_name,
         payment_method, card_last_four, description)
      VALUES ($1, $2, $3, 'succeeded', $4, $5, $6, $7)
    `, [
      session.tenant_id, razorpay_order_id, session.amount,
      plan.name, payment.method || 'razorpay',
      payment.card?.last4 || '****',
      `Subscription to ${plan.name} (${session.billing_cycle}) via Razorpay`
    ]);

    await db.query(
      'UPDATE payment_sessions SET status = $1, completed_at = NOW() WHERE session_id = $2',
      ['completed', razorpay_order_id]
    );

    logger.info('Payment verified', {
      orderId: razorpay_order_id,
      paymentId: razorpay_payment_id,
      tenantId,
      plan: plan.name
    });

    return res.json({
      success: true,
      data: {
        status: 'succeeded',
        paymentId: razorpay_payment_id,
        subscriptionId,
        plan: {
          name: plan.name,
          slug: plan.slug,
          amount: session.amount,
          billingCycle: session.billing_cycle
        },
        subscription: {
          status: 'active',
          currentPeriodStart: periodStart,
          currentPeriodEnd: periodEnd
        }
      }
    });

  } catch (error) {
    logger.error('Verify payment error', { error: error.message });
    return res.status(500).json({
      success: false,
      error: { code: 'VERIFY_ERROR', message: error.message }
    });
  }
};

/**
 * Get billing info
 */
const getBillingInfo = async (req, res) => {
  try {
    const tenantId = req.user.tenantId;

    const result = await db.query(`
      SELECT
        s.status, s.billing_cycle,
        s.current_period_start, s.current_period_end,
        s.stripe_subscription_id as subscription_id,
        s.cancel_at_period_end,
        sp.name as plan_name, sp.slug as plan_slug,
        sp.price_monthly, sp.price_yearly
      FROM subscriptions s
      JOIN subscription_plans sp ON s.plan_id = sp.id
      WHERE s.tenant_id = $1 AND s.status = 'active'
    `, [tenantId]);

    const transactions = await db.query(`
      SELECT amount, status, plan_name, payment_method,
             card_last_four, description, created_at
      FROM payment_transactions
      WHERE tenant_id = $1
      ORDER BY created_at DESC LIMIT 10
    `, [tenantId]);

    return res.json({
      success: true,
      data: {
        billing: result.rows[0] || null,
        transactions: transactions.rows,
        hasActivePlan: result.rows.length > 0
      }
    });

  } catch (error) {
    logger.error('Get billing info error', { error: error.message });
    return res.status(500).json({
      success: false,
      error: { code: 'BILLING_ERROR', message: error.message }
    });
  }
};

/**
 * Cancel subscription
 */
const cancelSubscription = async (req, res) => {
  try {
    const tenantId = req.user.tenantId;

    const subResult = await db.query(
      'SELECT * FROM subscriptions WHERE tenant_id = $1 AND status = $2',
      [tenantId, 'active']
    );

    if (subResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: { code: 'NO_SUBSCRIPTION', message: 'No active subscription found' }
      });
    }

    await db.query(`
      UPDATE subscriptions
      SET cancel_at_period_end = true, updated_at = NOW()
      WHERE tenant_id = $1 AND status = 'active'
    `, [tenantId]);

    return res.json({
      success: true,
      data: {
        message: 'Subscription will be cancelled at end of billing period',
        cancelAt: subResult.rows[0].current_period_end
      }
    });

  } catch (error) {
    logger.error('Cancel subscription error', { error: error.message });
    return res.status(500).json({
      success: false,
      error: { code: 'CANCEL_ERROR', message: error.message }
    });
  }
};

/**
 * Handle Razorpay webhooks
 */
const handleWebhook = async (req, res) => {
  try {
    const signature = req.headers['x-razorpay-signature'];
    const isValid = razorpayService.verifyWebhookSignature(req.body, signature);

    if (!isValid) {
      return res.status(400).json({ error: 'Invalid webhook signature' });
    }

    const event = req.body;
    logger.info('Razorpay webhook received', { event: event.event });

    switch (event.event) {
      case 'payment.captured':
        logger.info('Payment captured', { paymentId: event.payload.payment.entity.id });
        break;
      case 'payment.failed': {
        const payment = event.payload.payment.entity;
        await db.query(
          'UPDATE payment_sessions SET status = $1 WHERE session_id = $2',
          ['failed', payment.order_id]
        );
        break;
      }
      case 'subscription.cancelled': {
        const sub = event.payload.subscription.entity;
        await db.query(
          'UPDATE subscriptions SET status = $1, updated_at = NOW() WHERE stripe_subscription_id = $2',
          ['cancelled', `sub_rzp_${sub.id}`]
        );
        break;
      }
      default:
        logger.info('Unhandled webhook', { event: event.event });
    }

    return res.json({ received: true });

  } catch (error) {
    logger.error('Webhook error', { error: error.message });
    return res.status(500).json({ error: 'Webhook processing failed' });
  }
};

module.exports = {
  createOrder,
  verifyPayment,
  getBillingInfo,
  cancelSubscription,
  handleWebhook
};
