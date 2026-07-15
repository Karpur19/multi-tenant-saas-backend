const Razorpay = require('razorpay');
const crypto = require('crypto');
const logger = require('../utils/logger');

// Initialize Razorpay instance
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET
});

/**
 * Create a Razorpay order (equivalent to Stripe checkout session)
 */
const createOrder = async ({ amount, currency = 'INR', tenantId, userId, planSlug, billingCycle }) => {
  try {
    // Razorpay amount is in paise (1 INR = 100 paise)
    const amountInPaise = Math.round(amount * 100);

    const order = await razorpay.orders.create({
      amount: amountInPaise,
      currency,
      receipt: `receipt_${tenantId}_${Date.now()}`,
      notes: {
        tenant_id: tenantId,
        user_id: userId,
        plan_slug: planSlug,
        billing_cycle: billingCycle
      }
    });

    logger.info('Razorpay order created', {
      orderId: order.id,
      amount: order.amount,
      tenantId
    });

    return order;
  } catch (error) {
    logger.error('Failed to create Razorpay order', { error: error.message });
    throw error;
  }
};

/**
 * Verify payment signature (critical security step)
 */
const verifyPaymentSignature = ({ orderId, paymentId, signature }) => {
  try {
    const body = `${orderId}|${paymentId}`;
    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(body)
      .digest('hex');

    const isValid = expectedSignature === signature;

    logger.info('Payment signature verification', {
      orderId,
      paymentId,
      isValid
    });

    return isValid;
  } catch (error) {
    logger.error('Signature verification error', { error: error.message });
    return false;
  }
};

/**
 * Fetch payment details from Razorpay
 */
const getPayment = async (paymentId) => {
  try {
    const payment = await razorpay.payments.fetch(paymentId);
    return payment;
  } catch (error) {
    logger.error('Failed to fetch payment', { error: error.message });
    throw error;
  }
};

/**
 * Create a refund
 */
const createRefund = async (paymentId, amount) => {
  try {
    const refund = await razorpay.payments.refund(paymentId, {
      amount: Math.round(amount * 100) // Convert to paise
    });

    logger.info('Refund created', { paymentId, refundId: refund.id });
    return refund;
  } catch (error) {
    logger.error('Failed to create refund', { error: error.message });
    throw error;
  }
};

/**
 * Verify webhook signature
 */
const verifyWebhookSignature = (body, signature) => {
  try {
    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_WEBHOOK_SECRET)
      .update(JSON.stringify(body))
      .digest('hex');

    return expectedSignature === signature;
  } catch (error) {
    logger.error('Webhook signature error', { error: error.message });
    return false;
  }
};

/**
 * Convert USD to INR (approximate for demo)
 */
const convertUSDtoINR = (usdAmount) => {
  const exchangeRate = 83; // Approximate rate, use real API in production
  return Math.round(usdAmount * exchangeRate);
};

module.exports = {
  razorpay,
  createOrder,
  verifyPaymentSignature,
  getPayment,
  createRefund,
  verifyWebhookSignature,
  convertUSDtoINR
};
