const usageService = require('../services/usage.service');
const { error } = require('../utils/response');
const logger = require('../utils/logger');

/**
 * Middleware to track API usage and enforce limits
 * This runs on EVERY authenticated API request
 */
const trackUsage = async (req, res, next) => {
  console.log('===== 🔵 USAGE TRACKING MIDDLEWARE START =====');
  console.log('Path:', req.originalUrl);
  console.log('Method:', req.method);
  console.log('User exists:', !!req.user);
  console.log('Tenant ID:', req.user?.tenantId);
  console.log('===============================================');
  
  try {
    const tenantId = req.user?.tenantId;
    
    // Skip if no tenant (shouldn't happen after auth middleware)
    if (!tenantId) {
      console.log('⚠️  No tenant ID, skipping usage tracking');
      logger.warn('Usage tracking: No tenant ID found');
      return next();
    }
    
    const metricType = 'api_calls';
    
    console.log('🔍 Checking usage limits...');
    
    // Check if limit exceeded BEFORE processing request
    const limitCheck = await usageService.hasExceededLimit(tenantId, metricType);
    
    console.log('📊 Limit check result:', limitCheck);
    
    if (limitCheck.exceeded) {
      console.log('❌ LIMIT EXCEEDED - Blocking request');
      logger.warn('Usage limit exceeded', {
        tenantId,
        usage: limitCheck.usage,
        limit: limitCheck.limit
      });
      
      return error(
        res,
        `API call limit exceeded (${limitCheck.usage}/${limitCheck.limit}). Your limit will reset on the next billing cycle.`,
        'USAGE_LIMIT_EXCEEDED',
        429,
        {
          current: limitCheck.usage,
          limit: limitCheck.limit,
          percentage: limitCheck.percentage
        }
      );
    }
    
    console.log('✅ Limit check passed, proceeding with request');
    
    // Add usage warning headers if approaching limit (80%)
    if (limitCheck.limit > 0 && limitCheck.percentage >= 80) {
      res.setHeader('X-Usage-Warning', 'Approaching usage limit');
      res.setHeader('X-Usage-Current', limitCheck.usage);
      res.setHeader('X-Usage-Limit', limitCheck.limit);
      res.setHeader('X-Usage-Percentage', `${limitCheck.percentage}%`);
    }
    
    // Add usage info headers (always)
    res.setHeader('X-Usage-Remaining', limitCheck.remaining);
    
    console.log('📝 Setting up res.on(finish) listener...');
    
    // Record usage AFTER request completes (async, non-blocking)
    res.on('finish', () => {
      console.log('===== 🟢 RES.ON(FINISH) TRIGGERED =====');
      console.log('Status Code:', res.statusCode);
      console.log('Tenant ID:', tenantId);
      console.log('Will record:', res.statusCode < 400);
      console.log('======================================');
      
      // Only record successful requests (2xx, 3xx)
      if (res.statusCode < 400) {
        console.log('📞 Calling usageService.recordUsage...');
        
        usageService.recordUsage(tenantId, metricType, 1, {
          endpoint: req.originalUrl,
          method: req.method,
          status_code: res.statusCode,
          user_id: req.user?.userId,
          ip: req.ip
        }).then(result => {
          console.log('✅ Usage recorded successfully:', result);
        }).catch(err => {
          console.error('❌ Failed to record usage:', err.message);
          console.error('Error stack:', err.stack);
          logger.error('Failed to record usage', {
            error: err.message,
            tenantId,
            endpoint: req.originalUrl
          });
        });
      } else {
        console.log('⏭️  Skipping usage recording (status >= 400)');
      }
    });
    
    console.log('⏩ Calling next() to continue request...');
    
    // Continue to actual endpoint
    next();
    
  } catch (err) {
    console.error('❌ Usage tracking middleware error:', err);
    logger.error('Usage tracking middleware error', {
      error: err.message,
      tenantId: req.user?.tenantId
    });
    
    // Don't block request on tracking errors - just continue
    next();
  }
};

/**
 * Middleware to check specific metric limits (for uploads, storage, etc.)
 */
const checkMetricLimit = (metricType) => {
  return async (req, res, next) => {
    try {
      const tenantId = req.user?.tenantId;
      
      if (!tenantId) {
        return next();
      }
      
      const limitCheck = await usageService.hasExceededLimit(tenantId, metricType);
      
      if (limitCheck.exceeded) {
        return error(
          res,
          `${metricType} limit exceeded`,
          'METRIC_LIMIT_EXCEEDED',
          429,
          {
            metric: metricType,
            current: limitCheck.usage,
            limit: limitCheck.limit
          }
        );
      }
      
      next();
    } catch (err) {
      logger.error(`${metricType} limit check error`, {
        error: err.message,
        tenantId: req.user?.tenantId
      });
      next();
    }
  };
};

module.exports = {
  trackUsage,
  checkMetricLimit
};