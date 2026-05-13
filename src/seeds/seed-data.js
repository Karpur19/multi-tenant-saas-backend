const { Pool } = require('pg');
const { hashPassword } = require('../utils/password');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function seed() {
  try {
    console.log('🌱 Starting database seeding...');

    // 1. Seed subscription plans
    console.log('📦 Seeding subscription plans...');
    
    const plans = [
      {
        name: 'Free',
        slug: 'free',
        description: 'Perfect for getting started',
        price_monthly: 0,
        price_yearly: 0,
        features: ['1,000 API calls/month', '1 GB storage', 'Email support'],
        limits: { api_calls: 1000, storage_gb: 1, users: 1 }
      },
      {
        name: 'Starter',
        slug: 'starter',
        description: 'For small teams',
        price_monthly: 29,
        price_yearly: 290,
        features: ['10,000 API calls/month', '10 GB storage', 'Priority email support'],
        limits: { api_calls: 10000, storage_gb: 10, users: 5 }
      },
      {
        name: 'Pro',
        slug: 'pro',
        description: 'For growing businesses',
        price_monthly: 99,
        price_yearly: 990,
        features: ['100,000 API calls/month', '100 GB storage', 'Phone & email support', 'Custom integrations'],
        limits: { api_calls: 100000, storage_gb: 100, users: 20 }
      },
      {
        name: 'Enterprise',
        slug: 'enterprise',
        description: 'For large organizations',
        price_monthly: 299,
        price_yearly: 2990,
        features: ['1,000,000 API calls/month', 'Unlimited storage', '24/7 dedicated support', 'Custom SLA'],
        limits: { api_calls: 1000000, storage_gb: -1, users: -1 }
      }
    ];

    for (const plan of plans) {
      await pool.query(`
        INSERT INTO subscription_plans (name, slug, description, price_monthly, price_yearly, features, limits, is_public, is_active)
        VALUES ($1, $2, $3, $4, $5, $6, $7, true, true)
        ON CONFLICT (slug) DO NOTHING
      `, [plan.name, plan.slug, plan.description, plan.price_monthly, plan.price_yearly, JSON.stringify(plan.features), JSON.stringify(plan.limits)]);
    }
    console.log('✅ Subscription plans seeded!');

    // 2. Create demo tenant
    console.log('🏢 Creating demo tenant...');
    const existingTenant = await pool.query(`SELECT id FROM tenants WHERE subdomain = 'demo-company'`);
    
    let tenantId;
    if (existingTenant.rows.length > 0) {
      tenantId = existingTenant.rows[0].id;
      console.log(`✅ Demo tenant already exists: ${tenantId}`);
    } else {
      const tenantResult = await pool.query(`
        INSERT INTO tenants (name, subdomain, is_active)
        VALUES ('Demo Company', 'demo-company', true)
        RETURNING id
      `);
      tenantId = tenantResult.rows[0].id;
      console.log(`✅ Demo tenant created: ${tenantId}`);
    }

    // 3. Create demo user
    console.log('👤 Creating demo user...');
    const existingUser = await pool.query(`SELECT id FROM users WHERE email = 'demo@example.com'`);
    
    if (existingUser.rows.length > 0) {
      console.log('✅ Demo user already exists: demo@example.com');
    } else {
      const passwordHash = await hashPassword('DemoPassword123!');
      await pool.query(`
        INSERT INTO users (tenant_id, email, password_hash, first_name, last_name, role, is_active)
        VALUES ($1, 'demo@example.com', $2, 'Demo', 'User', 'admin', true)
      `, [tenantId, passwordHash]);
      console.log('✅ Demo user created: demo@example.com / DemoPassword123!');
    }

    // 4. Subscribe demo tenant to Pro plan
    console.log('📋 Creating demo subscription...');
    const planResult = await pool.query(`SELECT id FROM subscription_plans WHERE slug = 'pro'`);
    
    if (planResult.rows.length === 0) {
      console.log('❌ Pro plan not found!');
      return;
    }
    
    const planId = planResult.rows[0].id;
    const existingSub = await pool.query(`SELECT id FROM subscriptions WHERE tenant_id = $1`, [tenantId]);
    
    if (existingSub.rows.length > 0) {
      console.log('✅ Demo subscription already exists!');
    } else {
      await pool.query(`
        INSERT INTO subscriptions (tenant_id, plan_id, status, billing_cycle, current_period_start, current_period_end)
        VALUES ($1, $2, 'active', 'monthly', CURRENT_DATE, CURRENT_DATE + INTERVAL '30 days')
      `, [tenantId, planId]);
      console.log('✅ Demo subscription created (Pro plan)!');
    }

    console.log('\n🎉 Database seeding completed successfully!');
    console.log('\n📝 Test Credentials:');
    console.log('   Email: demo@example.com');
    console.log('   Password: DemoPassword123!');
    console.log('   Tenant: Demo Company (Pro Plan)');

  } catch (error) {
    console.error('❌ Seeding error:', error.message);
    console.error(error);
  } finally {
    await pool.end();
  }
}

seed();
