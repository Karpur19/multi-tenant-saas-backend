const userRepository = require('../repositories/user.repository');
const tenantRepository = require('../repositories/tenant.repository');
const { hashPassword, comparePassword } = require('../utils/password');
const db = require('../config/database');

/**
 * Register new tenant and admin user
 */
const registerTenantAndUser = async (data) => {
  const { tenantName, subdomain, email, password, firstName, lastName } = data;
  
  // Use transaction to ensure atomicity
  return await db.transaction(async (client) => {
    // Check if subdomain already exists
    const existingTenant = await tenantRepository.findBySubdomain(subdomain, client);
    if (existingTenant) {
      const error = new Error('Subdomain already exists');
      error.statusCode = 409;
      error.code = 'SUBDOMAIN_EXISTS';
      throw error;
    }
    
    // Check if email already exists
    const existingUser = await userRepository.findByEmailGlobal(email, client);
    if (existingUser) {
      const error = new Error('Email already registered');
      error.statusCode = 409;
      error.code = 'EMAIL_EXISTS';
      throw error;
    }
    
    // Create tenant
    const tenant = await tenantRepository.create({
      name: tenantName,
      subdomain,
      settings: {}
    }, client);
    
    // Hash password
    const passwordHash = await hashPassword(password);
    
    // Create admin user
    const user = await userRepository.create({
      tenantId: tenant.id,
      email,
      passwordHash,
      firstName,
      lastName,
      role: 'admin', // First user is always admin
      isActive: true
    }, client);
    
    return { tenant, user };
  });
};

/**
 * Authenticate user with email and password
 */
const authenticateUser = async (email, password) => {
  // Find user by email (across all tenants)
  const user = await userRepository.findByEmailGlobal(email);
  
  if (!user) {
    const error = new Error('Invalid email or password');
    error.statusCode = 401;
    error.code = 'INVALID_CREDENTIALS';
    throw error;
  }
  
  // Check if user is active
  if (!user.is_active) {
    const error = new Error('Account is deactivated');
    error.statusCode = 403;
    error.code = 'ACCOUNT_DEACTIVATED';
    throw error;
  }
  
  // Verify password
  const isValidPassword = await comparePassword(password, user.password_hash);
  
  if (!isValidPassword) {
    const error = new Error('Invalid email or password');
    error.statusCode = 401;
    error.code = 'INVALID_CREDENTIALS';
    throw error;
  }
  
  // Remove password hash from returned object
  delete user.password_hash;

  user.tenantId = user.tenant_id;
  
  return user;
};

/**
 * Get user by ID
 */
const getUserById = async (userId) => {
  const user = await userRepository.findById(userId);
  
  if (user) {
    delete user.passwordHash;
  }
  
  return user;
};

/**
 * Change user password
 */
const changePassword = async (userId, currentPassword, newPassword) => {
  const user = await userRepository.findById(userId);
  
  if (!user) {
    const error = new Error('User not found');
    error.statusCode = 404;
    error.code = 'USER_NOT_FOUND';
    throw error;
  }
  
  // Verify current password
  const isValidPassword = await comparePassword(currentPassword, user.passwordHash);
  
  if (!isValidPassword) {
    const error = new Error('Current password is incorrect');
    error.statusCode = 401;
    error.code = 'INVALID_PASSWORD';
    throw error;
  }
  
  // Hash new password
  const newPasswordHash = await hashPassword(newPassword);
  
  // Update password
  await userRepository.updatePassword(userId, newPasswordHash);
  
  return true;
};

module.exports = {
  registerTenantAndUser,
  authenticateUser,
  getUserById,
  changePassword
};
