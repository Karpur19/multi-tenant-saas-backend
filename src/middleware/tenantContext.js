const db = require('../config/database');
const logger = require('../utils/logger');

/**
 * Set tenant context for current request
 * This ensures database-level tenant isolation via PostgreSQL RLS
 */
const setTenantContext = async (req, res, next) => {
  try {
    if (!req.user || !req.user.tenantId) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'MISSING_TENANT',
          message: 'Tenant context is required'
        }
      });
    }
    
    const tenantId = req.user.tenantId;
    
    // Set tenant ID in PostgreSQL session variable
    // This is used by Row-Level Security policies
    await db.query(
      "SELECT set_config('app.current_tenant_id', $1, true)",
      [tenantId]
    );
    
    // Attach tenant ID to request for easy access
    req.tenantId = tenantId;
    
    logger.debug('Tenant context set', { tenantId });
    
    next();
  } catch (error) {
    logger.error('Failed to set tenant context', { 
      error: error.message,
      tenantId: req.user?.tenantId 
    });
    
    return res.status(500).json({
      success: false,
      error: {
        code: 'TENANT_CONTEXT_ERROR',
        message: 'Failed to set tenant context'
      }
    });
  }
};

/**
 * Validate that user has access to the requested tenant
 * Used for admin operations that might involve tenant switching
 */
const validateTenantAccess = (req, res, next) => {
  const requestedTenantId = req.params.tenantId || req.body.tenantId;
  
  if (!requestedTenantId) {
    return next();
  }
  
  // Check if user is trying to access a different tenant's data
  if (requestedTenantId !== req.user.tenantId) {
    logger.warn('Unauthorized tenant access attempt', {
      userId: req.user.userId,
      userTenantId: req.user.tenantId,
      requestedTenantId
    });
    
    return res.status(403).json({
      success: false,
      error: {
        code: 'FORBIDDEN',
        message: 'Access to this tenant is not allowed'
      }
    });
  }
  
  next();
};

module.exports = {
  setTenantContext,
  validateTenantAccess
};
