const resourceRepository = require('../repositories/resource.repository');

/**
 * List resources with pagination and filtering
 */
const listResources = async (tenantId, options) => {
  return await resourceRepository.findAll(tenantId, options);
};

/**
 * Get resource by ID
 */
const getResourceById = async (id, tenantId) => {
  return await resourceRepository.findById(id, tenantId);
};

/**
 * Create new resource
 */
const createResource = async (data) => {
  const resource = await resourceRepository.create(data);
  return resource;
};

/**
 * Update resource
 */
const updateResource = async (id, tenantId, data) => {
  // Remove undefined values
  const cleanData = Object.entries(data).reduce((acc, [key, value]) => {
    if (value !== undefined) {
      acc[key] = value;
    }
    return acc;
  }, {});
  
  if (Object.keys(cleanData).length === 0) {
    const error = new Error('No fields to update');
    error.statusCode = 400;
    error.code = 'NO_UPDATE_FIELDS';
    throw error;
  }
  
  return await resourceRepository.update(id, tenantId, cleanData);
};

/**
 * Delete resource
 */
const deleteResource = async (id, tenantId) => {
  return await resourceRepository.remove(id, tenantId);
};

module.exports = {
  listResources,
  getResourceById,
  createResource,
  updateResource,
  deleteResource
};
