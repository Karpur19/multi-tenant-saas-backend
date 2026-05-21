\# 🚀 Multi-Tenant SaaS Backend

Enterprise-grade REST API with subscription management and usage metering built with Node.js, Express, and PostgreSQL.


\*\*🔗 Live Demo:\*\* https://multi-tenant-saas-backend-lars.onrender.com


\## 📊 Project Stats

\- \*\*26\*\* REST API Endpoints

\- \*\*10\*\* Database Tables

\- \*\*29\*\* Automated Tests (Unit + Integration)

\- \*\*4\*\* Subscription Tiers

\- \*\*100%\*\* TypeScript-Free (Pure JavaScript)



\## ✨ Key Features

\### 🏢 Multi-Tenancy Architecture

\- Complete tenant isolation using Row-Level Security (RLS)

\- Tenant context middleware for automatic data scoping

\- Subdomain-based tenant identification



\### 💳 Subscription Management

\- 4-tier subscription system (Free, Starter, Pro, Enterprise)

\- Upgrade/downgrade capabilities with prorated billing

\- Subscription lifecycle management (trial, active, cancelled, expired)

\- Automatic plan limit enforcement



\### 📊 Usage Tracking \& Metering

\- Real-time API call tracking per tenant

\- Automatic usage limit enforcement (429 responses when exceeded)

\- Usage analytics and reporting endpoints

\- Configurable usage alerts and notifications



\### 🔐 Authentication \& Authorization

\- JWT-based authentication (access + refresh tokens)

\- bcrypt password hashing (10 rounds)

\- Role-based access control (Admin, User, Viewer)

\- Session management with token refresh



\### 🧪 Automated Testing

\- \*\*20 Unit Tests\*\* - Services, utilities, and business logic

\- \*\*9 Integration Tests\*\* - End-to-end API testing

\- Jest test framework with coverage reporting

\- Separate test configurations for unit and integration



\## 🎨 Live Demo Features



\### 📚 Interactive API Documentation

Full Swagger/OpenAPI 3.0 specification with try-it-out functionality:



\*\*\[View API Docs] https://multi-tenant-saas-backend-lars.onrender.com/api-docs



\- 26 documented endpoints with request/response schemas

\- Authentication testing with Bearer tokens

\- Interactive "Try it out" buttons for each endpoint

\- Example payloads and error responses



\### 📊 Admin Dashboard

Real-time analytics dashboard with interactive charts and metrics:



\*\*\[View Admin Dashboard] https://multi-tenant-saas-backend-lars.onrender.com/admin



\*\*Demo Credentials:\*\*

Email: demo@example.com

Password: DemoPassword123!



\*\*Dashboard Features:\*\*

\- 📈 Real-time KPI cards (Tenants, Users, MRR, API Calls)

\- 💰 Revenue breakdown by subscription plan (interactive Chart.js bar chart)

\- 👥 Tenant management table with subscription details

\- 🔐 JWT-protected admin-only routes with RBAC

\- 🎨 Responsive design with purple gradient theme



\*\*Technologies:\*\* Vanilla JavaScript ES6, Chart.js 4.4.0, HTML5/CSS3



\## 🛠️ Tech Stack



\*\*Backend:\*\*

\- Node.js 18+

\- Express.js 4.x

\- PostgreSQL 16 (Neon)



\*\*Authentication:\*\*

\- JWT (jsonwebtoken)

\- bcrypt



\*\*Testing:\*\*

\- Jest

\- Supertest



\*\*Documentation:\*\*

\- Swagger UI Express

\- OpenAPI 3.0 Specification



\*\*DevOps:\*\*

\- Git \& GitHub

\- Render.com (deployment)

\- Neon PostgreSQL (database hosting)



\*\*Security:\*\*

\- Helmet.js with Content Security Policy

\- CORS

\- Rate limiting

\- Input validation (express-validator)



\## 📁 Project Structure



multi-tenant-saas-backend/

├── src/

│   ├── config/          # Database and app configuration

│   │   ├── database.js

│   │   └── swagger.js   # OpenAPI specification

│   ├── controllers/     # Request handlers

│   │   ├── admin.controller.js  # Admin analytics endpoints

│   │   ├── auth.controller.js

│   │   ├── subscription.controller.js

│   │   └── ...

│   ├── middleware/      # Auth, RBAC, tenant context, usage tracking

│   ├── repositories/    # Database access layer

│   ├── routes/          # API route definitions

│   ├── services/        # Business logic

│   ├── utils/           # Helper functions (JWT, password, logger)

│   ├── migrations/      # Database schema migrations

│   ├── seeds/           # Database seed data

│   ├── public/          # Static files

│   │   ├── index.html   # Landing page

│   │   ├── admin.html   # Admin dashboard

│   │   └── admin-test.html  # API test tool

│   ├── app.js           # Express app setup

│   └── server.js        # Server entry point

├── tests/

│   ├── unit/            # Unit tests

│   ├── integration/     # Integration tests

│   └── fixtures/        # Test data

├── .env.example         # Environment variables template

├── jest.config.js       # Jest configuration

├── package.json         # Dependencies and scripts

└── README.md



\## 🔌 API Endpoints



\### Authentication

\- `POST /api/v1/auth/register` - Register new user

\- `POST /api/v1/auth/login` - User login

\- `POST /api/v1/auth/refresh` - Refresh access token

\- `POST /api/v1/auth/logout` - User logout

\- `GET /api/v1/auth/me` - Get current user



\### Subscriptions

\- `GET /api/v1/subscriptions/plans` - List all subscription plans

\- `GET /api/v1/subscriptions/plans/:slug` - Get plan by slug

\- `POST /api/v1/subscriptions/subscribe` - Subscribe to a plan

\- `GET /api/v1/subscriptions/current` - Get current subscription

\- `POST /api/v1/subscriptions/upgrade` - Upgrade subscription

\- `POST /api/v1/subscriptions/downgrade` - Downgrade subscription

\- `POST /api/v1/subscriptions/cancel` - Cancel subscription

\- `GET /api/v1/subscriptions/history` - Subscription history



\### Usage

\- `GET /api/v1/usage/current` - Get current usage statistics

\- `GET /api/v1/usage/history` - Usage history

\- `GET /api/v1/usage/breakdown` - Usage breakdown by endpoint



\### Users

\- `GET /api/v1/users` - List all users (tenant-scoped)

\- `GET /api/v1/users/:id` - Get user by ID

\- `POST /api/v1/users` - Create new user

\- `PUT /api/v1/users/:id` - Update user

\- `DELETE /api/v1/users/:id` - Delete user



\### Resources (Example CRUD)

\- `GET /api/v1/resources` - List resources

\- `GET /api/v1/resources/:id` - Get resource

\- `POST /api/v1/resources` - Create resource

\- `PUT /api/v1/resources/:id` - Update resource

\- `DELETE /api/v1/resources/:id` - Delete resource



\## 🧪 Testing



```bash

\# Run all tests

npm test



\# Run unit tests only

npm run test:unit



\# Run integration tests only

npm run test:integration



\# Run with coverage report

npm run test:coverage



\# Watch mode for development

npm run test:watch

```



\*\*Test Coverage:\*\*

\- Password utilities: 100%

\- JWT utilities: 78%

\- Usage service: 54%

\- Overall: 7% (focused on critical paths)



\*\*Test Structure:\*\*

\- \*\*Unit Tests (20):\*\* Services, utilities with mocked dependencies

\- \*\*Integration Tests (9):\*\* End-to-end API testing with real database

\- \*\*Fixtures:\*\* Reusable test data generators



\## 🔑 Demo Credentials



Use these credentials to test the API:

\## 🚀 Local Development



\### Prerequisites

\- Node.js 18+

\- PostgreSQL 14+

\- npm or yarn



\### Installation



1\. \*\*Clone the repository\*\*

```bash

git clone https://github.com/Karpur19/multi-tenant-saas-backend.git

cd multi-tenant-saas-backend

```



2\. \*\*Install dependencies\*\*

```bash

npm install

```



3\. \*\*Set up environment variables\*\*

```bash

cp .env.example .env

\# Edit .env with your database credentials and secrets

```



4\. \*\*Run database migrations\*\*

```bash

npm run migrate

```



5\. \*\*Seed the database\*\*

```bash

npm run seed

```



6\. \*\*Start the development server\*\*

```bash

npm run dev

```



The API will be available at `http://localhost:3000`



\## 📦 Deployment



This project is deployed on Render.com with Neon PostgreSQL.



\*\*Environment Variables Required:\*\*

\- `NODE\_ENV=production`

\- `PORT=3000`

\- `DATABASE\_URL` - PostgreSQL connection string

\- `JWT\_SECRET` - Secret for access tokens

\- `JWT\_REFRESH\_SECRET` - Secret for refresh tokens

\- `JWT\_EXPIRES\_IN=7d`

\- `JWT\_REFRESH\_EXPIRES\_IN=30d`



\*\*Deployment Features:\*\*

\- Auto-deploy from GitHub main branch

\- Free SSL certificates included

\- Database connection pooling

\- Health check endpoint (`/health`)

\- Graceful shutdown handling



\## 🏗️ Database Schema



\*\*Key Tables:\*\*

\- `tenants` - Organization/company data

\- `users` - User accounts (tenant-scoped)

\- `subscription\_plans` - Available subscription tiers

\- `subscriptions` - Active subscriptions per tenant

\- `usage\_records` - API call tracking

\- `usage\_aggregates` - Pre-computed usage statistics

\- `subscription\_events` - Subscription change audit log

\- `usage\_alerts` - Usage threshold notifications

\- `resources` - Example tenant-scoped resource



\*\*Security:\*\*

\- Row-Level Security (RLS) policies on all tenant-scoped tables

\- Automatic tenant context enforcement via middleware

\- Prepared statements to prevent SQL injection

\- Password hashing with bcrypt (10 rounds)

\- JWT tokens with configurable expiration



\## 📈 Future Enhancements



\- \[ ] Stripe payment gateway integration

\- \[ ] Email notifications (SendGrid) for trial ending and usage alerts

\- \[ ] Webhooks for subscription lifecycle events

\- \[ ] Advanced analytics with usage trends and forecasting

\- \[ ] WebSocket support for real-time updates

\- \[ ] Multi-factor authentication (MFA)

\- \[ ] API versioning (v2 endpoints)

\- \[ ] Docker containerization

\- \[ ] CI/CD pipeline (GitHub Actions)

\- \[ ] Monitoring and alerting (Sentry, DataDog)

\- \[ ] Export usage reports (CSV, PDF)



\## 🔒 Security Features



\- \*\*Helmet.js:\*\* Security headers and Content Security Policy

\- \*\*CORS:\*\* Configurable cross-origin resource sharing

\- \*\*Rate Limiting:\*\* Per-IP and per-endpoint limits

\- \*\*Input Validation:\*\* Request validation with express-validator

\- \*\*JWT Tokens:\*\* Secure access and refresh token flow

\- \*\*Password Hashing:\*\* bcrypt with salt rounds

\- \*\*SQL Injection Protection:\*\* Parameterized queries

\- \*\*XSS Protection:\*\* Content sanitization

\- \*\*HTTPS Only:\*\* SSL/TLS encryption enforced



\## 📝 License



MIT License - feel free to use this project for learning or as a starting point for your own SaaS backend.



\## 👤 Author



\*\*Karpur19\*\*

\- GitHub: \[@Karpur19](https://github.com/Karpur19)

\- Live Demo: \[multi-tenant-saas-backend-lars.onrender.com](https://multi-tenant-saas-backend-lars.onrender.com)

\- API Docs: \[/api-docs](https://multi-tenant-saas-backend-lars.onrender.com/api-docs)

\- Admin Dashboard: \[/admin](https://multi-tenant-saas-backend-lars.onrender.com/admin)



\---



\## 🌟 Highlights



\*\*Production-Ready Features:\*\*

\- ✅ Complete multi-tenant isolation

\- ✅ Subscription billing with 4 tiers

\- ✅ Real-time usage metering

\- ✅ Comprehensive API documentation

\- ✅ Admin analytics dashboard

\- ✅ 29 automated tests

\- ✅ Role-based access control

\- ✅ Live deployment with $0 cost



\*\*Perfect for:\*\*

\- Learning SaaS architecture patterns

\- Building subscription-based applications

\- Understanding multi-tenancy at scale

\- Portfolio demonstration for backend roles



⭐ If you find this project helpful, please give it a star!

