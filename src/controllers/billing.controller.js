const db = require('../config/database');
const razorpayService = require('../services/razorpay.service');
const logger = require('../utils/logger');

const createOrder = async (req, res) => {
  try {
    const planSlug = req.body.planSlug;
    const billingCycle = req.body.billingCycle || 'monthly';
    const tenantId = req.user.tenantId;
    const userId = req.user.userId;

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
        error: { code: 'PLAN_NOT_FOUND', message: 'Plan not found' }
      });
    }

    const plan = planResult.rows[0];
    const usdAmount = billingCycle === 'yearly'
      ? parseFloat(plan.price_yearly)
      : parseFloat(plan.price_monthly);

    const inrAmount = razorpayService.convertUSDtoINR(usdAmount);

    logger.info('Creating Razorpay order', { planSlug, usdAmount, inrAmount, tenantId });

    const order = await razorpayService.createOrder({
      amount: inrAmount,
      currency: 'INR',
      tenantId: tenantId,
      userId: userId,
      planSlug: plan.slug,
      billingCycle: billingCycle
    });

    const metadata = JSON.stringify({ planSlug: plan.slug, inrAmount: inrAmount });

    await db.query(
      'INSERT INTO payment_sessions (session_id, tenant_id, user_id, plan_id, amount, billing_cycle, status, metadata) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)',
      [order.id, tenantId, userId, plan.id, usdAmount, billingCycle, 'pending', metadata]
    );

    logger.info('Order created successfully', { orderId: order.id });

    return res.json({
      success: true,
      data: {
        orderId: order.id,
        amount: order.amount,
        amountDisplay: inrAmount,
        amountUSD: usdAmount,
        currency: order.currency,
        plan: {
          name: plan.name,
          slug: plan.slug,
          billingCycle: billingCycle
        },
        razorpayKeyId: process.env.RAZORPAY_KEY_ID,
        testCards: {
          success: { number: '4111 1111 1111 1111', expiry: '12/29', cvv: '123' },
          failure: { number: '4000 0000 0000 0002', expiry: '12/29', cvv: '123' }
        }
      }
    });

  } catch (error) {
    const errDesc = error.error ? error.error.description : null;
    logger.error('Create order error', {
      message: error.message,
      description: errDesc,
      statusCode: error.statusCode || null,
      fullError: JSON.stringify(error)
    });
    return res.status(500).json({
      success: false,
      error: {
        code: 'ORDER_ERROR',
        message: error.message || 'Unknown error',
        description: errDesc
      }
    });
  }
};

const verifyPayment = async (req, res) => {
  try {
    const razorpay_order_id = req.body.razorpay_order_id;
    const razorpay_payment_id = req.body.razorpay_payment_id;
    const razorpay_signature = req.body.razorpay_signature;
    const tenantId = req.user.tenantId;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({
        success: false,
        error: { code: 'MISSING_FIELDS', message: 'razorpay_order_id, razorpay_payment_id and razorpay_signature required' }
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

    const subscriptionId = 'sub_rzp_' + razorpay_payment_id;
    const cardLast4 = payment.card ? payment.card.last4 : '****';
    const paymentMethod = payment.method || 'razorpay';
    const customerContact = payment.contact || 'rzp_customer';
    const description = 'Subscription to ' + plan.name + ' via Razorpay';

    await db.query(
      'INSERT INTO subscriptions (tenant_id, plan_id, status, billing_cycle, stripe_subscription_id, stripe_customer_id, current_period_start, current_period_end) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) ON CONFLICT (tenant_id) DO UPDATE SET plan_id = EXCLUDED.plan_id, status = EXCLUDED.status, billing_cycle = EXCLUDED.billing_cycle, stripe_subscription_id = EXCLUDED.stripe_subscription_id, current_period_start = EXCLUDED.current_period_start, current_period_end = EXCLUDED.current_period_end, updated_at = NOW()',
      [session.tenant_id, session.plan_id, 'active', session.billing_cycle, subscriptionId, customerContact, periodStart, periodEnd]
    );

    await db.query(
      'INSERT INTO payment_transactions (tenant_id, session_id, amount, status, plan_name, payment_method, card_last_four, description) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)',
      [session.tenant_id, razorpay_order_id, session.amount, 'succeeded', plan.name, paymentMethod, cardLast4, description]
    );

    await db.query(
      'UPDATE payment_sessions SET status = $1, completed_at = NOW() WHERE session_id = $2',
      ['completed', razorpay_order_id]
    );

    logger.info('Payment verified successfully', { orderId: razorpay_order_id, paymentId: razorpay_payment_id });

    return res.json({
      success: true,
      data: {
        status: 'succeeded',
        paymentId: razorpay_payment_id,
        subscriptionId: subscriptionId,
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

const getBillingInfo = async (req, res) => {
  try {
    const tenantId = req.user.tenantId;

    const result = await db.query(
      'SELECT s.status, s.billing_cycle, s.current_period_start, s.current_period_end, s.stripe_subscription_id as subscription_id, s.cancel_at_period_end, sp.name as plan_name, sp.slug as plan_slug, sp.price_monthly, sp.price_yearly FROM subscriptions s JOIN subscription_plans sp ON s.plan_id = sp.id WHERE s.tenant_id = $1 AND s.status = $2',
      [tenantId, 'active']
    );

    const transactions = await db.query(
      'SELECT amount, status, plan_name, payment_method, card_last_four, description, created_at FROM payment_transactions WHERE tenant_id = $1 ORDER BY created_at DESC LIMIT 10',
      [tenantId]
    );

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

    await db.query(
      'UPDATE subscriptions SET cancel_at_period_end = true, updated_at = NOW() WHERE tenant_id = $1 AND status = $2',
      [tenantId, 'active']
    );

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

const handleWebhook = async (req, res) => {
  try {
    const signature = req.headers['x-razorpay-signature'];
    const isValid = razorpayService.verifyWebhookSignature(req.body, signature);

    if (!isValid) {
      return res.status(400).json({ error: 'Invalid webhook signature' });
    }

    const event = req.body;
    logger.info('Razorpay webhook received', { event: event.event });

    if (event.event === 'payment.captured') {
      logger.info('Payment captured', { paymentId: event.payload.payment.entity.id });
    } else if (event.event === 'payment.failed') {
      const orderId = event.payload.payment.entity.order_id;
      await db.query('UPDATE payment_sessions SET status = $1 WHERE session_id = $2', ['failed', orderId]);
    } else if (event.event === 'subscription.cancelled') {
      const subId = 'sub_rzp_' + event.payload.subscription.entity.id;
      await db.query('UPDATE subscriptions SET status = $1, updated_at = NOW() WHERE stripe_subscription_id = $2', ['cancelled', subId]);
    } else {
      logger.info('Unhandled webhook event', { event: event.event });
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