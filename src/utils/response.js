/**
 * Standard success response
 */
const success = (res, data, statusCode = 200) => {
  return res.status(statusCode).json({
    success: true,
    data
  });
};

/**
 * Success response with pagination
 */
const successWithPagination = (res, data, pagination, statusCode = 200) => {
  return res.status(statusCode).json({
    success: true,
    data,
    pagination
  });
};

/**
 * Error response
 */
const error = (res, message, code = 'ERROR', statusCode = 500, details = null) => {
  const response = {
    success: false,
    error: {
      code,
      message
    }
  };
  
  if (details) {
    response.error.details = details;
  }
  
  return res.status(statusCode).json(response);
};

/**
 * Validation error response
 */
const validationError = (res, errors) => {
  return res.status(400).json({
    success: false,
    error: {
      code: 'VALIDATION_ERROR',
      message: 'Validation failed',
      details: errors
    }
  });
};

/**
 * Not found response
 */
const notFound = (res, message = 'Resource not found') => {
  return res.status(404).json({
    success: false,
    error: {
      code: 'NOT_FOUND',
      message
    }
  });
};

/**
 * Unauthorized response
 */
const unauthorized = (res, message = 'Authentication required') => {
  return res.status(401).json({
    success: false,
    error: {
      code: 'UNAUTHORIZED',
      message
    }
  });
};

/**
 * Forbidden response
 */
const forbidden = (res, message = 'Access forbidden') => {
  return res.status(403).json({
    success: false,
    error: {
      code: 'FORBIDDEN',
      message
    }
  });
};

module.exports = {
  success,
  successWithPagination,
  error,
  validationError,
  notFound,
  unauthorized,
  forbidden
};
