const userRepository = require('../repositories/user.repository');
const { hashPassword } = require('../utils/password');

/**
 * List users with pagination
 */
const listUsers = async (tenantId, options) => {
  return await userRepository.findAll(tenantId, options);
};

/**
 * Get user by ID
 */
const getUserById = async (id, tenantId) => {
  const user = await userRepository.findById(id, tenantId);
  
  if (user) {
    delete user.passwordHash;
  }
  
  return user;
};

/**
 * Create new user
 */
const createUser = async (data) => {
  const { tenantId, email, password, firstName, lastName, role } = data;
  
  // Check if user already exists in this tenant
  const existingUser = await userRepository.findByEmail(email, tenantId);
  
  if (existingUser) {
    const error = new Error('User with this email already exists');
    error.statusCode = 409;
    error.code = 'USER_EXISTS';
    throw error;
  }
  
  // Hash password
  const passwordHash = await hashPassword(password);
  
  // Create user
  const user = await userRepository.create({
    tenantId,
    email,
    passwordHash,
    firstName,
    lastName,
    role: role || 'user',
    isActive: true
  });
  
  // Remove password hash from response
  delete user.passwordHash;
  
  return user;
};

/**
 * Update user
 */
const updateUser = async (id, tenantId, data) => {
  // If email is being updated, check for duplicates
  if (data.email) {
    const existingUser = await userRepository.findByEmail(data.email, tenantId);
    
    if (existingUser && existingUser.id !== id) {
      const error = new Error('User with this email already exists');
      error.statusCode = 409;
      error.code = 'EMAIL_EXISTS';
      throw error;
    }
  }
  
  const user = await userRepository.update(id, data, tenantId);
  
  if (user) {
    delete user.passwordHash;
  }
  
  return user;
};

/**
 * Delete user
 */
const deleteUser = async (id, tenantId) => {
  return await userRepository.remove(id, tenantId);
};

module.exports = {
  listUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser
};
