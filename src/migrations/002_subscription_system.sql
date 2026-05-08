-- ============================================
-- SUBSCRIPTION & METERING SYSTEM SCHEMA
-- Migration: 002_subscription_system
-- ============================================

-- Enable extensions if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================
-- 1. SUBSCRIPTION PLANS TABLE
-- Defines available subscription tiers
-- ============================================
CREATE TABLE subscription_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Plan identification
    name VARCHAR(100) NOT NULL,
    slug VARCHAR(50) UNIQUE NOT NULL, -- 'free', 'starter', 'pro', 'enterprise'
    description TEXT,
    
    -- Pricing
    price_monthly DECIMAL(10,2) NOT NULL DEFAULT 0,
    price_yearly DECIMAL(10,2) NOT NULL DEFAULT 0,
    
    -- Features list (stored as JSON array)
    features JSONB DEFAULT '[]',
    
    -- Display & Status
    is_active BOOLEAN DEFAULT true,
    is_public BOOLEAN DEFAULT true, -- Show on pricing page
    display_order INTEGER DEFAULT 0,
    
    -- Limits (stored as JSON for flexibility)
    limits JSONB DEFAULT '{}',
    -- Example: {"api_calls": 10000, "storage_gb": 5, "users": 10}
    
    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraints
    CONSTRAINT positive_prices CHECK (price_monthly >= 0 AND price_yearly >= 0),
    CONSTRAINT valid_slug CHECK (slug ~ '^[a-z0-9_-]+$')
);

-- Indexes
CREATE INDEX idx_plans_slug ON subscription_plans(slug);
CREATE INDEX idx_plans_active ON subscription_plans(is_active);
CREATE INDEX idx_plans_display_order ON subscription_plans(display_order);

-- Trigger for updated_at
CREATE TRIGGER update_plans_updated_at
    BEFORE UPDATE ON subscription_plans
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 2. SUBSCRIPTIONS TABLE
-- Tenant's active subscription
-- ============================================
CREATE TABLE subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    plan_id UUID NOT NULL REFERENCES subscription_plans(id) ON DELETE RESTRICT,
    
    -- Status: trial, active, past_due, cancelled, expired
    status VARCHAR(20) NOT NULL DEFAULT 'active',
    
    -- Billing cycle
    billing_cycle VARCHAR(20) NOT NULL DEFAULT 'monthly', -- 'monthly', 'yearly'
    
    -- Current period
    current_period_start DATE NOT NULL,
    current_period_end DATE NOT NULL,
    
    -- Trial period (if applicable)
    trial_start DATE,
    trial_end DATE,
    is_trial BOOLEAN DEFAULT false,
    
    -- Cancellation
    cancel_at_period_end BOOLEAN DEFAULT false,
    cancelled_at TIMESTAMP,
    cancellation_reason TEXT,
    
    -- Payment
    last_payment_date TIMESTAMP,
    next_payment_date TIMESTAMP,
    
    -- Metadata
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraints
    CONSTRAINT valid_status CHECK (status IN ('trial', 'active', 'past_due', 'cancelled', 'expired')),
    CONSTRAINT valid_billing_cycle CHECK (billing_cycle IN ('monthly', 'yearly')),
    CONSTRAINT valid_period CHECK (current_period_end > current_period_start)
);

-- Indexes
CREATE INDEX idx_subscriptions_tenant ON subscriptions(tenant_id);
CREATE INDEX idx_subscriptions_plan ON subscriptions(plan_id);
CREATE INDEX idx_subscriptions_status ON subscriptions(status);
CREATE INDEX idx_subscriptions_period_end ON subscriptions(current_period_end);
CREATE INDEX idx_subscriptions_active ON subscriptions(tenant_id, status) WHERE status = 'active';

-- Trigger for updated_at
CREATE TRIGGER update_subscriptions_updated_at
    BEFORE UPDATE ON subscriptions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Row-Level Security
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_subscriptions ON subscriptions
    USING (tenant_id::text = current_setting('app.current_tenant_id', true));

-- ============================================
-- 3. USAGE RECORDS TABLE
-- Track actual API usage per tenant
-- ============================================
CREATE TABLE usage_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    subscription_id UUID REFERENCES subscriptions(id) ON DELETE SET NULL,
    
    -- What metric was used?
    metric_type VARCHAR(50) NOT NULL, -- 'api_calls', 'storage_gb', 'bandwidth_gb'
    quantity INTEGER NOT NULL DEFAULT 1,
    
    -- When was it recorded?
    recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Billing period this belongs to
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    
    -- Request metadata (for debugging/analysis)
    metadata JSONB DEFAULT '{}',
    -- Example: {"endpoint": "/api/users", "method": "GET", "user_id": "..."}
    
    -- Aggregation tracking
    is_aggregated BOOLEAN DEFAULT false,
    
    -- Constraints
    CONSTRAINT positive_quantity CHECK (quantity > 0)
);

-- Indexes
CREATE INDEX idx_usage_tenant ON usage_records(tenant_id);
CREATE INDEX idx_usage_metric ON usage_records(metric_type);
CREATE INDEX idx_usage_period ON usage_records(period_start, period_end);
CREATE INDEX idx_usage_recorded ON usage_records(recorded_at DESC);
CREATE INDEX idx_usage_tenant_period ON usage_records(tenant_id, period_start, period_end);
CREATE INDEX idx_usage_aggregated ON usage_records(is_aggregated) WHERE is_aggregated = false;

-- Row-Level Security
ALTER TABLE usage_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_usage_records ON usage_records
    USING (tenant_id::text = current_setting('app.current_tenant_id', true));

-- ============================================
-- 4. USAGE AGGREGATES TABLE
-- Daily/monthly rollups for performance
-- ============================================
CREATE TABLE usage_aggregates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    subscription_id UUID REFERENCES subscriptions(id) ON DELETE SET NULL,
    
    -- What and when?
    metric_type VARCHAR(50) NOT NULL,
    date DATE NOT NULL,
    
    -- Aggregated values
    total_quantity INTEGER NOT NULL DEFAULT 0,
    
    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraints
    CONSTRAINT unique_tenant_metric_date UNIQUE(tenant_id, metric_type, date),
    CONSTRAINT positive_total CHECK (total_quantity >= 0)
);

-- Indexes
CREATE INDEX idx_aggregates_tenant ON usage_aggregates(tenant_id);
CREATE INDEX idx_aggregates_date ON usage_aggregates(date DESC);
CREATE INDEX idx_aggregates_tenant_date ON usage_aggregates(tenant_id, date);

-- Trigger for updated_at
CREATE TRIGGER update_aggregates_updated_at
    BEFORE UPDATE ON usage_aggregates
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Row-Level Security
ALTER TABLE usage_aggregates ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_usage_aggregates ON usage_aggregates
    USING (tenant_id::text = current_setting('app.current_tenant_id', true));

-- ============================================
-- 5. SUBSCRIPTION EVENTS TABLE
-- Audit log for subscription changes
-- ============================================
CREATE TABLE subscription_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    subscription_id UUID REFERENCES subscriptions(id) ON DELETE CASCADE,
    
    -- Event type
    event_type VARCHAR(50) NOT NULL,
    -- 'created', 'upgraded', 'downgraded', 'cancelled', 'renewed', 
    -- 'trial_started', 'trial_ended', 'payment_failed', 'payment_succeeded'
    
    -- Plan transition
    old_plan_id UUID REFERENCES subscription_plans(id),
    new_plan_id UUID REFERENCES subscription_plans(id),
    
    -- Who performed the action?
    performed_by UUID REFERENCES users(id),
    
    -- Additional context
    reason TEXT,
    metadata JSONB DEFAULT '{}',
    
    -- When?
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX idx_events_tenant ON subscription_events(tenant_id);
CREATE INDEX idx_events_subscription ON subscription_events(subscription_id);
CREATE INDEX idx_events_type ON subscription_events(event_type);
CREATE INDEX idx_events_created ON subscription_events(created_at DESC);

-- Row-Level Security
ALTER TABLE subscription_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_subscription_events ON subscription_events
    USING (tenant_id::text = current_setting('app.current_tenant_id', true));

-- ============================================
-- 6. USAGE ALERTS TABLE
-- Track usage notifications sent
-- ============================================
CREATE TABLE usage_alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    subscription_id UUID REFERENCES subscriptions(id) ON DELETE CASCADE,
    
    -- Alert details
    alert_type VARCHAR(50) NOT NULL, -- 'approaching_limit', 'limit_exceeded', 'usage_spike'
    metric_type VARCHAR(50) NOT NULL,
    threshold_percentage INTEGER, -- e.g., 80 (for 80% of limit)
    
    -- Usage data
    current_usage INTEGER NOT NULL,
    limit_value INTEGER NOT NULL,
    
    -- Notification status
    is_sent BOOLEAN DEFAULT false,
    sent_at TIMESTAMP,
    
    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX idx_alerts_tenant ON usage_alerts(tenant_id);
CREATE INDEX idx_alerts_sent ON usage_alerts(is_sent);
CREATE INDEX idx_alerts_created ON usage_alerts(created_at DESC);

-- Row-Level Security
ALTER TABLE usage_alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_usage_alerts ON usage_alerts
    USING (tenant_id::text = current_setting('app.current_tenant_id', true));

-- ============================================
-- HELPER FUNCTIONS
-- ============================================

-- Function to get current period usage for a tenant
CREATE OR REPLACE FUNCTION get_current_period_usage(
    p_tenant_id UUID,
    p_metric_type VARCHAR
) RETURNS INTEGER AS $$
DECLARE
    v_usage INTEGER;
BEGIN
    SELECT COALESCE(SUM(quantity), 0)
    INTO v_usage
    FROM usage_records
    WHERE tenant_id = p_tenant_id
    AND metric_type = p_metric_type
    AND period_start <= CURRENT_DATE
    AND period_end >= CURRENT_DATE;
    
    RETURN v_usage;
END;
$$ LANGUAGE plpgsql;

-- Function to check if tenant has exceeded limit
CREATE OR REPLACE FUNCTION has_exceeded_limit(
    p_tenant_id UUID,
    p_metric_type VARCHAR
) RETURNS BOOLEAN AS $$
DECLARE
    v_current_usage INTEGER;
    v_limit INTEGER;
BEGIN
    -- Get current usage
    v_current_usage := get_current_period_usage(p_tenant_id, p_metric_type);
    
    -- Get limit from active subscription
    SELECT (sp.limits->>p_metric_type)::INTEGER
    INTO v_limit
    FROM subscriptions s
    JOIN subscription_plans sp ON s.plan_id = sp.id
    WHERE s.tenant_id = p_tenant_id
    AND s.status = 'active'
    LIMIT 1;
    
    -- If no limit found or unlimited (-1), return false
    IF v_limit IS NULL OR v_limit = -1 THEN
        RETURN false;
    END IF;
    
    -- Check if exceeded
    RETURN v_current_usage >= v_limit;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- SEED DATA: Default Subscription Plans
-- ============================================

INSERT INTO subscription_plans (name, slug, description, price_monthly, price_yearly, features, limits, is_public, display_order)
VALUES
-- FREE PLAN
(
    'Free',
    'free',
    'Perfect for testing and small projects',
    0,
    0,
    '["Basic API access", "Community support", "1 user", "7-day data retention"]'::jsonb,
    '{"api_calls": 1000, "storage_gb": 1, "users": 1, "projects": 1}'::jsonb,
    true,
    1
),

-- STARTER PLAN
(
    'Starter',
    'starter',
    'Great for growing teams and small businesses',
    29,
    290, -- ~17% discount on yearly
    '["10,000 API calls/month", "Email support", "5 users", "30-day data retention", "Basic analytics"]'::jsonb,
    '{"api_calls": 10000, "storage_gb": 10, "users": 5, "projects": 5}'::jsonb,
    true,
    2
),

-- PRO PLAN
(
    'Pro',
    'pro',
    'For professional teams needing more power',
    99,
    990, -- ~17% discount on yearly
    '["100,000 API calls/month", "Priority support", "25 users", "90-day data retention", "Advanced analytics", "Custom integrations", "API rate limit: 100 req/s"]'::jsonb,
    '{"api_calls": 100000, "storage_gb": 100, "users": 25, "projects": 25}'::jsonb,
    true,
    3
),

-- ENTERPRISE PLAN
(
    'Enterprise',
    'enterprise',
    'For large organizations with custom needs',
    299,
    2990, -- ~17% discount on yearly
    '["1,000,000 API calls/month", "24/7 dedicated support", "Unlimited users", "Unlimited data retention", "Custom analytics", "SLA guarantee", "On-premise option", "API rate limit: 1000 req/s", "Custom contracts"]'::jsonb,
    '{"api_calls": 1000000, "storage_gb": 1000, "users": -1, "projects": -1}'::jsonb,
    true,
    4
);

-- ============================================
-- COMMENTS FOR DOCUMENTATION
-- ============================================

COMMENT ON TABLE subscription_plans IS 'Defines available subscription tiers with pricing and limits';
COMMENT ON TABLE subscriptions IS 'Tracks each tenant''s active subscription';
COMMENT ON TABLE usage_records IS 'Detailed records of tenant usage for billing and analytics';
COMMENT ON TABLE usage_aggregates IS 'Pre-aggregated usage data for performance';
COMMENT ON TABLE subscription_events IS 'Audit trail of all subscription changes';
COMMENT ON TABLE usage_alerts IS 'Tracks usage threshold notifications';

COMMENT ON COLUMN subscription_plans.limits IS 'JSON object with metric limits: {"api_calls": 10000, "storage_gb": 5}. Use -1 for unlimited.';
COMMENT ON COLUMN subscriptions.status IS 'Subscription status: trial, active, past_due, cancelled, expired';
COMMENT ON COLUMN usage_records.metadata IS 'Additional context: {"endpoint": "/api/users", "method": "GET", "response_time_ms": 45}';

-- ============================================
-- GRANT PERMISSIONS (if needed)
-- ============================================

-- Grant necessary permissions to your application user
-- GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO your_app_user;
-- GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO your_app_user;