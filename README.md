# 🚀 Multi-Tenant SaaS Backend

Enterprise-grade REST API with subscription management and usage metering built with Node.js, Express, and PostgreSQL.

**🔗 Live Demo:** [https://multi-tenant-saas-backend-lars.onrender.com](https://multi-tenant-saas-backend-lars.onrender.com)

## 📊 Project Stats

- **26** REST API Endpoints
- **10** Database Tables
- **29** Automated Tests (Unit + Integration)
- **4** Subscription Tiers
- **100%** TypeScript-Free (Pure JavaScript)

## ✨ Key Features

### 🏢 Multi-Tenancy Architecture
- Complete tenant isolation using Row-Level Security (RLS)
- Tenant context middleware for automatic data scoping
- Subdomain-based tenant identification

### 💳 Subscription Management
- 4-tier subscription system (Free, Starter, Pro, Enterprise)
- Upgrade/downgrade capabilities with prorated billing
- Subscription lifecycle management (trial, active, cancelled, expired)
- Automatic plan limit enforcement

### 📊 Usage Tracking & Metering
- Real-time API call tracking per tenant
- Automatic usage limit enforcement (429 responses when exceeded)
- Usage analytics and reporting endpoints
- Configurable usage alerts and notifications

### 🔐 Authentication & Authorization
- JWT-based authentication (access + refresh tokens)
- bcrypt password hashing (10 rounds)
- Role-based access control (Admin, User, Viewer)
- Session management with token refresh

### 🧪 Automated Testing
- **20 Unit Tests** - Services, utilities, and business logic
- **9 Integration Tests** - End-to-end API testing
- Jest test framework with coverage reporting
- Separate test configurations for unit and integration

## 🛠️ Tech Stack

**Backend:**
- Node.js 18+
- Express.js 4.x
- PostgreSQL 16 (Neon)

**Authentication:**
- JWT (jsonwebtoken)
- bcrypt

**Testing:**
- Jest
- Supertest

**DevOps:**
- Git & GitHub
- Render.com (deployment)
- Neon PostgreSQL (database hosting)

**Security:**
- Helmet.js
- CORS
- Rate limiting
- Input validation (express-validator)

## 📁 Project Structure
## 🔌 API Endpoints

### Authentication
- `POST /api/v1/auth/register` - Register new user
- `POST /api/v1/auth/login` - User login
- `POST /api/v1/auth/refresh` - Refresh access token
- `POST /api/v1/auth/logout` - User logout
- `GET /api/v1/auth/me` - Get current user

### Subscriptions
- `GET /api/v1/subscriptions/plans` - List all subscription plans
- `GET /api/v1/subscriptions/plans/:slug` - Get plan by slug
- `POST /api/v1/subscriptions/subscribe` - Subscribe to a plan
- `GET /api/v1/subscriptions/current` - Get current subscription
- `POST /api/v1/subscriptions/upgrade` - Upgrade subscription
- `POST /api/v1/subscriptions/downgrade` - Downgrade subscription
- `POST /api/v1/subscriptions/cancel` - Cancel subscription
- `GET /api/v1/subscriptions/history` - Subscription history

### Usage
- `GET /api/v1/usage/current` - Get current usage statistics
- `GET /api/v1/usage/history` - Usage history
- `GET /api/v1/usage/breakdown` - Usage breakdown by endpoint

### Users
- `GET /api/v1/users` - List all users (tenant-scoped)
- `GET /api/v1/users/:id` - Get user by ID
- `POST /api/v1/users` - Create new user
- `PUT /api/v1/users/:id` - Update user
- `DELETE /api/v1/users/:id` - Delete user

### Resources (Example CRUD)
- `GET /api/v1/resources` - List resources
- `GET /api/v1/resources/:id` - Get resource
- `POST /api/v1/resources` - Create resource
- `PUT /api/v1/resources/:id` - Update resource
- `DELETE /api/v1/resources/:id` - Delete resource

## 🧪 Testing

```bash
# Run all tests
npm test

# Run unit tests only
npm run test:unit

# Run integration tests only
npm run test:integration

# Run with coverage report
npm run test:coverage

# Watch mode for development
npm run test:watch
```

**Test Coverage:**
- Password utilities: 100%
- JWT utilities: 78%
- Usage service: 54%
- Overall: 7% (focused on critical paths)

## 🔑 Demo Credentials

Use these credentials to test the API:
## 🚀 Local Development

### Prerequisites
- Node.js 18+
- PostgreSQL 14+
- npm or yarn

### Installation

1. **Clone the repository**
```bash
git clone https://github.com/Karpur19/multi-tenant-saas-backend.git
cd multi-tenant-saas-backend
```

2. **Install dependencies**
```bash
npm install
```

3. **Set up environment variables**
```bash
cp .env.example .env
# Edit .env with your database credentials and secrets
```

4. **Run database migrations**
```bash
npm run migrate
```

5. **Seed the database**
```bash
npm run seed
```

6. **Start the development server**
```bash
npm run dev
```

The API will be available at `http://localhost:3000`

## 📦 Deployment

This project is deployed on Render.com with Neon PostgreSQL.

**Environment Variables Required:**
- `NODE_ENV=production`
- `PORT=3000`
- `DATABASE_URL` - PostgreSQL connection string
- `JWT_SECRET` - Secret for access tokens
- `JWT_REFRESH_SECRET` - Secret for refresh tokens
- `JWT_EXPIRES_IN=7d`
- `JWT_REFRESH_EXPIRES_IN=30d`

## 🏗️ Database Schema

**Key Tables:**
- `tenants` - Organization/company data
- `users` - User accounts (tenant-scoped)
- `subscription_plans` - Available subscription tiers
- `subscriptions` - Active subscriptions per tenant
- `usage_records` - API call tracking
- `usage_aggregates` - Pre-computed usage statistics
- `subscription_events` - Subscription change audit log
- `resources` - Example tenant-scoped resource

**Security:**
- Row-Level Security (RLS) policies on all tenant-scoped tables
- Automatic tenant context enforcement
- Prepared statements to prevent SQL injection

## 📈 Future Enhancements

- [ ] Stripe/Payment gateway integration
- [ ] Webhooks for subscription events
- [ ] API rate limiting per subscription tier
- [ ] Advanced usage analytics dashboard
- [ ] Email notifications (trial ending, usage alerts)
- [ ] API documentation (Swagger/OpenAPI)
- [ ] Docker containerization
- [ ] CI/CD pipeline (GitHub Actions)
- [ ] Monitoring and alerting (Sentry, DataDog)

## 📝 License

MIT License - feel free to use this project for learning or as a starting point for your own SaaS backend.

## 👤 Author

**Karpur19**
- GitHub: [@Karpur19](https://github.com/Karpur19)
- Live Demo: [multi-tenant-saas-backend-lars.onrender.com](https://multi-tenant-saas-backend-lars.onrender.com)

---

⭐ If you find this project helpful, please give it a star!
