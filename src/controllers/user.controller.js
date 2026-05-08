const userService = require('../services/user.service');
const response = require('../utils/response');
const logger = require('../utils/logger');

/**
 * List all users (admin only)
 * GET /api/v1/users
 */
const list = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, role, isActive } = req.query;
    const tenantId = req.tenantId;
    
    const result = await userService.listUsers(tenantId, {
      page: parseInt(page),
      limit: parseInt(limit),
      role,
      isActive: isActive !== undefined ? isActive === 'true' : null
    });
    
    return response.successWithPagination(res, result.data, result.pagination);
  } catch (error) {
    next(error);
  }
};

/**
 * Get user by ID
 * GET /api/v1/users/:id
 */
const getById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const tenantId = req.tenantId;
    
    const user = await userService.getUserById(id, tenantId);
    
    if (!user) {
      return response.notFound(res, 'User not found');
    }
    
    return response.success(res, { user });
  } catch (error) {
    next(error);
  }
};

/**
 * Create new user (admin only)
 * POST /api/v1/users
 */
const create = async (req, res, next) => {
  try {
    const { email, password, firstName, lastName, role } = req.body;
    const tenantId = req.tenantId;
    
    const user = await userService.createUser({
      tenantId,
      email,
      password,
      firstName,
      lastName,
      role: role || 'user'
    });
    
    logger.info('User created', {
      userId: user.id,
      tenantId,
      createdBy: req.user.userId
    });
    
    return response.success(res, { user }, 201);
  } catch (error) {
    next(error);
  }
};

/**
 * Update user
 * PUT /api/v1/users/:id
 */
const update = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { email, firstName, lastName, role, isActive } = req.body;
    const tenantId = req.tenantId;
    
    // Only admins can change role and isActive
    const updateData = { email, firstName, lastName };
    
    if (req.user.role === 'admin') {
      if (role) updateData.role = role;
      if (isActive !== undefined) updateData.isActive = isActive;
    }
    
    const user = await userService.updateUser(id, tenantId, updateData);
    
    if (!user) {
      return response.notFound(res, 'User not found');
    }
    
    logger.info('User updated', {
      userId: id,
      tenantId,
      updatedBy: req.user.userId
    });
    
    return response.success(res, { user });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete user (admin only)
 * DELETE /api/v1/users/:id
 */
const remove = async (req, res, next) => {
  try {
    const { id } = req.params;
    const tenantId = req.tenantId;
    
    // Prevent admin from deleting themselves
    if (id === req.user.userId) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'CANNOT_DELETE_SELF',
          message: 'You cannot delete your own account'
        }
      });
    }
    
    const deleted = await userService.deleteUser(id, tenantId);
    
    if (!deleted) {
      return response.notFound(res, 'User not found');
    }
    
    logger.info('User deleted', {
      userId: id,
      tenantId,
      deletedBy: req.user.userId
    });
    
    return response.success(res, { message: 'User deleted successfully' });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  list,
  getById,
  create,
  update,
  remove
};
