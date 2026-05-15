const swaggerJsdoc = require('swagger-jsdoc');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Multi-Tenant SaaS Backend API',
      version: '1.0.0',
      description: 'Enterprise-grade REST API with subscription management and usage metering',
      contact: {
        name: 'Karpur19',
        url: 'https://github.com/Karpur19/multi-tenant-saas-backend'
      },
      license: {
        name: 'MIT',
        url: 'https://opensource.org/licenses/MIT'
      }
    },
    servers: [
      {
        url: 'https://multi-tenant-saas-backend-lars.onrender.com',
        description: 'Production server'
      },
      {
        url: 'http://localhost:3000',
        description: 'Development server'
      }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Enter your JWT token (get it from /api/v1/auth/login)'
        }
      },
      schemas: {
        User: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            tenant_id: { type: 'string', format: 'uuid' },
            email: { type: 'string', format: 'email' },
            first_name: { type: 'string' },
            last_name: { type: 'string' },
            role: { type: 'string', enum: ['admin', 'user', 'viewer'] },
            is_active: { type: 'boolean' },
            created_at: { type: 'string', format: 'date-time' }
          }
        },
        SubscriptionPlan: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            name: { type: 'string' },
            slug: { type: 'string' },
            description: { type: 'string' },
            price_monthly: { type: 'number' },
            price_yearly: { type: 'number' },
            features: { type: 'array', items: { type: 'string' } },
            limits: {
              type: 'object',
              properties: {
                api_calls: { type: 'integer' },
                storage_gb: { type: 'integer' },
                users: { type: 'integer' }
              }
            }
          }
        },
        Subscription: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            tenant_id: { type: 'string', format: 'uuid' },
            plan_id: { type: 'string', format: 'uuid' },
            status: { type: 'string', enum: ['trial', 'active', 'cancelled', 'expired'] },
            billing_cycle: { type: 'string', enum: ['monthly', 'yearly'] },
            current_period_start: { type: 'string', format: 'date' },
            current_period_end: { type: 'string', format: 'date' }
          }
        },
        Error: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: false },
            error: {
              type: 'object',
              properties: {
                code: { type: 'string' },
                message: { type: 'string' }
              }
            }
          }
        }
      }
    },
    security: [
      {
        bearerAuth: []
      }
    ]
  },
  apis: ['./src/routes/*.js', './src/controllers/*.js']
};

const swaggerSpec = swaggerJsdoc(options);

module.exports = swaggerSpec;
