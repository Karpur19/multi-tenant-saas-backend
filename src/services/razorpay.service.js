const Razorpay = require('razorpay');
const crypto = require('crypto');
const logger = require('../utils/logger');

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET
});

const createOrder = async ({ amount, currency = 'INR', tenantId, userId, planSlug, billingCycle }) => {
  try {
    const amountInPaise = Math.round(amount * 100);

    logger.info('Creating Razorpay order', {
      amount: amountInPaise,
      currency,
      tenantId,
      keyId: process.env.RAZORPAY_KEY_ID?.substring(0, 15) + '...'
    });

    const order = await razorpay.orders.create({
      amount: amountInPaise,
      currency,
      receipt: `rcpt_${Date.now()}`,
      notes: {
        tenant_id: tenantId,
        user_id: userId,
        plan_slug: planSlug,
        billing_cycle: billingCycle
      }
    });

    logger.info('Razorpay order created', { orderId: order.id });
    return order;

  } catch (error) {
    // Log the FULL error object
    logger.error('Failed to create Razorpay order', {
      message: error.message,
      description: error.error?.description,
      code: error.error?.code,
      field: error.error?.field,
      source: error.error?.source,
      step: error.error?.step,
      reason: error.error?.reason,
      statusCode: error.statusCode,
      fullError: JSON.stringify(error)
    });
    throw error;
  }
};

const verifyPaymentSignature = ({ orderId, paymentId, signature }) => {
  try {
    const body = `${orderId}|${paymentId}`;
    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(body)
      .digest('hex');
    return expectedSignature === signature;
  } catch (error) {
    logger.error('Signature verification error', { error: error.message });
    return false;
  }
};

const getPayment = async (paymentId) => {
  try {
    return await razorpay.payments.fetch(paymentId);
  } catch (error) {
    logger.error('Failed to fetch payment', { error: error.message });
    throw error;
  }
};

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

const convertUSDtoINR = (usdAmount) => {
  const exchangeRate = 83;
  return Math.round(usdAmount * exchangeRate);
};

module.exports = {
  razorpay,
  createOrder,
  verifyPaymentSignature,
  getPayment,
  verifyWebhookSignature,
  convertUSDtoINR
};
