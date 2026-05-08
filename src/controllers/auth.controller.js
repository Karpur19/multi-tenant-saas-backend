const authService = require('../services/auth.service');
const { generateTokens, verifyRefreshToken } = require('../utils/jwt');
const logger = require('../utils/logger');

/**
 * Register new user
 * POST /api/v1/auth/register
 */
const register = async (req, res, next) => {
  try {
    const { tenantName, subdomain, email, password, firstName, lastName } = req.body;
    
    // Create tenant and user
    const result = await authService.registerTenantAndUser({
      tenantName,
      subdomain,
      email,
      password,
      firstName,
      lastName
    });
    
    // Generate tokens
    const tokens = generateTokens({
      userId: result.user.id,
      tenantId: result.tenant.id,
      email: result.user.email,
      role: result.user.role
    });
    
    logger.info('New tenant and user registered', {
      tenantId: result.tenant.id,
      userId: result.user.id,
      email: result.user.email
    });
    
    res.status(201).json({
      success: true,
      data: {
        tenant: result.tenant,
        user: {
          id: result.user.id,
          email: result.user.email,
          firstName: result.user.firstName,
          lastName: result.user.lastName,
          role: result.user.role
        },
        tokens
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Login user
 * POST /api/v1/auth/login
 */
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    
    // Authenticate user
    const user = await authService.authenticateUser(email, password);
    
    // Generate tokens
    const tokens = generateTokens({
      userId: user.id,
      tenantId: user.tenantId,
      email: user.email,
      role: user.role
    });
    
    logger.info('User logged in', {
      userId: user.id,
      tenantId: user.tenantId,
      email: user.email
    });
    
    res.json({
      success: true,
      data: {
        user: {
          id: user.id,
          tenantId: user.tenantId,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role
        },
        tokens
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Refresh access token
 * POST /api/v1/auth/refresh
 */
const refresh = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;
    
    if (!refreshToken) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'MISSING_REFRESH_TOKEN',
          message: 'Refresh token is required'
        }
      });
    }
    
    // Verify refresh token
    const decoded = verifyRefreshToken(refreshToken);
    
    // Get user details
    const user = await authService.getUserById(decoded.userId);
    
    if (!user) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'INVALID_REFRESH_TOKEN',
          message: 'Invalid refresh token'
        }
      });
    }
    
    // Generate new tokens
    const tokens = generateTokens({
      userId: user.id,
      tenantId: user.tenantId,
      email: user.email,
      role: user.role
    });
    
    logger.info('Access token refreshed', {
      userId: user.id,
      tenantId: user.tenantId
    });
    
    res.json({
      success: true,
      data: { tokens }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get current user profile
 * GET /api/v1/auth/me
 */
const me = async (req, res, next) => {
  try {
    const user = await authService.getUserById(req.user.userId);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'USER_NOT_FOUND',
          message: 'User not found'
        }
      });
    }
    
    res.json({
      success: true,
      data: {
        user: {
          id: user.id,
          tenantId: user.tenantId,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
          isActive: user.isActive,
          createdAt: user.createdAt
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Logout user (optional - for token blacklisting if implemented)
 * POST /api/v1/auth/logout
 */
const logout = async (req, res, next) => {
  try {
    // If implementing token blacklisting, add token to blacklist here
    
    logger.info('User logged out', {
      userId: req.user.userId,
      tenantId: req.user.tenantId
    });
    
    res.json({
      success: true,
      message: 'Logged out successfully'
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  register,
  login,
  refresh,
  me,
  logout
};
