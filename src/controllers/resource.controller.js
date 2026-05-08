const resourceService = require('../services/resource.service');
const response = require('../utils/response');
const logger = require('../utils/logger');

/**
 * List all resources with pagination and filtering
 * GET /api/v1/resources
 */
const list = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, status, sortBy = 'created_at', order = 'desc' } = req.query;
    const tenantId = req.tenantId;
    
    const result = await resourceService.listResources(tenantId, {
      page: parseInt(page),
      limit: parseInt(limit),
      status,
      sortBy,
      order
    });
    
    return response.successWithPagination(res, result.data, result.pagination);
  } catch (error) {
    next(error);
  }
};

/**
 * Get resource by ID
 * GET /api/v1/resources/:id
 */
const getById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const tenantId = req.tenantId;
    
    const resource = await resourceService.getResourceById(id, tenantId);
    
    if (!resource) {
      return response.notFound(res, 'Resource not found');
    }
    
    return response.success(res, { resource });
  } catch (error) {
    next(error);
  }
};

/**
 * Create new resource
 * POST /api/v1/resources
 */
const create = async (req, res, next) => {
  try {
    const { name, description, status, metadata } = req.body;
    const tenantId = req.tenantId;
    const userId = req.user.userId;
    
    const resource = await resourceService.createResource({
      tenantId,
      name,
      description,
      status,
      metadata,
      createdBy: userId
    });
    
    logger.info('Resource created', {
      resourceId: resource.id,
      tenantId,
      createdBy: userId
    });
    
    return response.success(res, { resource }, 201);
  } catch (error) {
    next(error);
  }
};

/**
 * Update resource
 * PUT /api/v1/resources/:id
 */
const update = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, description, status, metadata } = req.body;
    const tenantId = req.tenantId;
    
    const resource = await resourceService.updateResource(id, tenantId, {
      name,
      description,
      status,
      metadata
    });
    
    if (!resource) {
      return response.notFound(res, 'Resource not found');
    }
    
    logger.info('Resource updated', {
      resourceId: id,
      tenantId,
      updatedBy: req.user.userId
    });
    
    return response.success(res, { resource });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete resource
 * DELETE /api/v1/resources/:id
 */
const remove = async (req, res, next) => {
  try {
    const { id } = req.params;
    const tenantId = req.tenantId;
    
    const deleted = await resourceService.deleteResource(id, tenantId);
    
    if (!deleted) {
      return response.notFound(res, 'Resource not found');
    }
    
    logger.info('Resource deleted', {
      resourceId: id,
      tenantId,
      deletedBy: req.user.userId
    });
    
    return response.success(res, { message: 'Resource deleted successfully' });
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
