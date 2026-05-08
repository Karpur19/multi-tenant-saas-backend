const logger = require('../utils/logger');

// Define role hierarchy (higher number = more permissions)
const ROLE_HIERARCHY = {
  'user': 1,
  'admin': 2,
  'superadmin': 3
};

/**
 * Require specific role(s) to access route
 * Usage: requireRole('admin'), requireRole('admin', 'superadmin')
 */
const requireRole = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required'
        }
      });
    }
    
    const userRole = req.user.role;
    
    if (!allowedRoles.includes(userRole)) {
      logger.warn('Insufficient permissions', {
        userId: req.user.userId,
        userRole,
        requiredRoles: allowedRoles,
        path: req.path
      });
      
      return res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'Insufficient permissions to access this resource'
        }
      });
    }
    
    next();
  };
};

/**
 * Require minimum role level to access route
 * Usage: requireMinRole('admin') - allows admin and superadmin
 */
const requireMinRole = (minRole) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required'
        }
      });
    }
    
    const userRole = req.user.role;
    const userLevel = ROLE_HIERARCHY[userRole] || 0;
    const minLevel = ROLE_HIERARCHY[minRole] || 0;
    
    if (userLevel < minLevel) {
      logger.warn('Insufficient role level', {
        userId: req.user.userId,
        userRole,
        userLevel,
        minRole,
        minLevel,
        path: req.path
      });
      
      return res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'Insufficient permissions to access this resource'
        }
      });
    }
    
    next();
  };
};

/**
 * Check if user owns the resource or is admin
 * Usage: requireOwnershipOrAdmin('userId') - checks req.params.userId
 */
const requireOwnershipOrAdmin = (ownerIdField = 'userId') => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required'
        }
      });
    }
    
    const resourceOwnerId = req.params[ownerIdField] || req.body[ownerIdField];
    const isOwner = resourceOwnerId === req.user.userId;
    const isAdmin = ['admin', 'superadmin'].includes(req.user.role);
    
    if (!isOwner && !isAdmin) {
      logger.warn('Unauthorized resource access', {
        userId: req.user.userId,
        resourceOwnerId,
        path: req.path
      });
      
      return res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'You do not have permission to access this resource'
        }
      });
    }
    
    next();
  };
};

/**
 * Check custom permission
 * Usage: checkPermission(async (req) => { return true/false; })
 */
const checkPermission = (permissionCheck) => {
  return async (req, res, next) => {
    try {
      const hasPermission = await permissionCheck(req);
      
      if (!hasPermission) {
        return res.status(403).json({
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: 'Insufficient permissions'
          }
        });
      }
      
      next();
    } catch (error) {
      logger.error('Permission check error', { error: error.message });
      return res.status(500).json({
        success: false,
        error: {
          code: 'PERMISSION_CHECK_ERROR',
          message: 'Failed to verify permissions'
        }
      });
    }
  };
};

module.exports = {
  requireRole,
  requireMinRole,
  requireOwnershipOrAdmin,
  checkPermission,
  ROLE_HIERARCHY
};
