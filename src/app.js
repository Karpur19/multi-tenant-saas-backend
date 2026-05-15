const express = require('express');
const path = require('path');
const helmet = require('helmet');
const cors = require('cors');
require('dotenv').config();
const compression = require('compression');
const logger = require('./utils/logger');
const errorHandler = require('./middleware/errorHandler');
const rateLimiter = require('./middleware/rateLimiter');
const { trackUsage } = require('./middleware/usageTracking');
const swaggerUi = require('swagger-ui-express');
const swaggerSpec = require('./config/swagger');

// Import routes
const authRoutes = require('./routes/auth.routes');
const userRoutes = require('./routes/user.routes');
const resourceRoutes = require('./routes/resource.routes');
const subscriptionRoutes = require('./routes/subscription.routes');
const usageRoutes = require('./routes/usage.routes');
app.use('/api/v1/admin', require('./routes/admin.routes'));

// Initialize Express app
const app = express();

// Trust proxy (important for rate limiting behind load balancer)
app.set('trust proxy', 1);

// Security middleware
app.use(helmet());

// CORS configuration
const corsOptions = {
  origin: process.env.CORS_ORIGIN?.split(',') || '*',
  credentials: true,
  optionsSuccessStatus: 200
};
app.use(cors(corsOptions));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Compression middleware
app.use(compression());

// Request logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.info('HTTP Request', {
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      userAgent: req.get('user-agent'),
      ip: req.ip
    });
  });
  
  next();
});

// Swagger API documentation
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'Multi-Tenant SaaS API Docs'
}));

// Rate limiting
app.use('/api/', rateLimiter);

// Root endpoint
// Serve static files from public directory
app.use(express.static(path.join(__dirname, 'public')));

// Root endpoint - serve landing page
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// JSON API endpoint for programmatic access
app.get('/api', (req, res) => {
  res.json({
    success: true,
    message: 'Multi-tenant SaaS API is running',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    endpoints: {
      health: '/health',
      api: '/api/v1',
      docs: '/api/v1/subscriptions/plans'
    }
  });
});

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

// Root route - serve landing page
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// API version
const API_VERSION = process.env.API_VERSION || 'v1';

// Mount routes

// Public routes (no authentication, no usage tracking)
app.use('/api/v1/auth', authRoutes);

// Subscription routes (some public endpoints like /plans)
app.use('/api/v1/subscriptions', subscriptionRoutes);

// Protected routes WITH usage tracking (these count towards API limits)
app.use('/api/v1/users', userRoutes);
app.use('/api/v1/resources', resourceRoutes);

// Usage routes (don't track themselves to avoid infinite loop)
app.use('/api/v1/usage', usageRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: 'The requested resource was not found'
    }
  });
});

// Global error handler (must be last)
app.use(errorHandler);

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM signal received: closing HTTP server');
  app.close(() => {
    logger.info('HTTP server closed');
    const db = require('./config/database');
    db.close();
  });
});

module.exports = app;
