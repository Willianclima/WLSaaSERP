-- =========================================================================
-- MIGRATION: 001_initial_core_schema.sql
-- DESCRIPTION: Core SaaS & ERP tables: Organizations, Users, Memberships,
--              Plans, Subscriptions, Modules, Audit Logs, Categories, Products
-- =========================================================================

DO $$ 
BEGIN 
    CREATE EXTENSION IF NOT EXISTS "pgcrypto"; 
EXCEPTION 
    WHEN OTHERS THEN NULL; 
END $$;

-- 1. ORGANIZATIONS (TENANTS)
CREATE TABLE IF NOT EXISTS organizations (
    id VARCHAR(64) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    document VARCHAR(32) NOT NULL, -- CNPJ / CPF
    segment VARCHAR(50) NOT NULL DEFAULT 'SEMIJOIAS',
    logo_url TEXT,
    city VARCHAR(100) NOT NULL DEFAULT 'Limeira',
    state VARCHAR(2) NOT NULL DEFAULT 'SP',
    contact_email VARCHAR(255) NOT NULL,
    contact_whatsapp VARCHAR(50) NOT NULL,
    custom_domain VARCHAR(255) UNIQUE,
    custom_domain_status VARCHAR(50) DEFAULT 'NOT_CONFIGURED',
    status VARCHAR(50) NOT NULL DEFAULT 'ACTIVE', -- ACTIVE, SUSPENDED, PENDING
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_organizations_slug ON organizations(slug);
CREATE INDEX IF NOT EXISTS idx_organizations_custom_domain ON organizations(custom_domain);

-- 2. USERS (GLOBAL USERS & CREDENTIALS)
CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(64) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    avatar_url TEXT,
    phone VARCHAR(50),
    is_platform_super_admin BOOLEAN DEFAULT FALSE,
    status VARCHAR(50) NOT NULL DEFAULT 'ACTIVE',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_login_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- 3. ORGANIZATION MEMBERSHIPS (MULTI-TENANT RBAC ROLES)
CREATE TABLE IF NOT EXISTS organization_members (
    id VARCHAR(64) PRIMARY KEY,
    organization_id VARCHAR(64) NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    user_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role VARCHAR(50) NOT NULL DEFAULT 'LOJA_ADMIN', -- SUPER_ADMIN, OWNER, LOJA_ADMIN, GERENTE_COMERCIAL, VENDEDOR, REVENDEDORA_PORTAL
    custom_permissions JSONB DEFAULT '[]'::jsonb,
    status VARCHAR(50) NOT NULL DEFAULT 'ACTIVE',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (organization_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_members_org_user ON organization_members(organization_id, user_id);

-- 4. PLANS (SAAS PRICING TIERS)
CREATE TABLE IF NOT EXISTS plans (
    id VARCHAR(50) PRIMARY KEY, -- TRIAL_30D, STARTER, PRO, ENTERPRISE
    name VARCHAR(100) NOT NULL,
    price_monthly_brl NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    trial_days INT NOT NULL DEFAULT 30,
    max_users INT NOT NULL DEFAULT 2,
    max_products INT NOT NULL DEFAULT 500,
    max_resellers INT NOT NULL DEFAULT 20,
    allowed_modules JSONB NOT NULL DEFAULT '[]'::jsonb,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 5. SUBSCRIPTIONS (BILLING & TRIAL LIFECYCLE)
CREATE TABLE IF NOT EXISTS subscriptions (
    id VARCHAR(64) PRIMARY KEY,
    organization_id VARCHAR(64) UNIQUE NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    plan_id VARCHAR(50) NOT NULL REFERENCES plans(id),
    status VARCHAR(50) NOT NULL DEFAULT 'TRIALING', -- TRIALING, ACTIVE, PAST_DUE, READ_ONLY, SUSPENDED, CANCELED
    trial_started_at TIMESTAMP WITH TIME ZONE NOT NULL,
    trial_ends_at TIMESTAMP WITH TIME ZONE NOT NULL,
    current_period_start TIMESTAMP WITH TIME ZONE NOT NULL,
    current_period_end TIMESTAMP WITH TIME ZONE NOT NULL,
    payment_method VARCHAR(50) DEFAULT 'MANUAL_TRIAL',
    auto_renew BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);

-- 6. ORGANIZATION MODULES (FEATURE GATING)
CREATE TABLE IF NOT EXISTS organization_modules (
    id VARCHAR(64) PRIMARY KEY,
    organization_id VARCHAR(64) NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    module_key VARCHAR(100) NOT NULL,
    is_enabled BOOLEAN DEFAULT TRUE,
    activated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(organization_id, module_key)
);

CREATE INDEX IF NOT EXISTS idx_org_modules_lookup ON organization_modules(organization_id, module_key);

-- 7. AUDIT TRAIL LOGS (IMMUTABLE POSTGRESQL SINGLE SOURCE OF TRUTH)
CREATE TABLE IF NOT EXISTS audit_logs (
    id VARCHAR(64) PRIMARY KEY,
    organization_id VARCHAR(64),
    user_id VARCHAR(64),
    action VARCHAR(100) NOT NULL,
    entity VARCHAR(100) NOT NULL,
    entity_id VARCHAR(64),
    changes JSONB,
    ip_address VARCHAR(45),
    user_agent TEXT,
    is_critical_security BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_org_created ON audit_logs(organization_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_critical ON audit_logs(is_critical_security) WHERE is_critical_security = TRUE;

-- 8. PRODUCT CATEGORIES
CREATE TABLE IF NOT EXISTS categories (
    id VARCHAR(64) PRIMARY KEY,
    organization_id VARCHAR(64) NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    slug VARCHAR(100) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(organization_id, slug)
);

-- 9. PRODUCTS (CORE CATALOG ENGINE)
CREATE TABLE IF NOT EXISTS products (
    id VARCHAR(64) PRIMARY KEY,
    organization_id VARCHAR(64) NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    sku VARCHAR(64) NOT NULL,
    name VARCHAR(255) NOT NULL,
    category VARCHAR(50) NOT NULL,
    collection VARCHAR(100),
    material VARCHAR(50) NOT NULL,
    bath VARCHAR(50) NOT NULL,
    stones JSONB DEFAULT '[]'::jsonb,
    price NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    cost_price NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    warranty_months INT NOT NULL DEFAULT 12,
    is_customizable BOOLEAN DEFAULT FALSE,
    status VARCHAR(50) NOT NULL DEFAULT 'ATIVO',
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(organization_id, sku)
);

CREATE INDEX IF NOT EXISTS idx_products_org_sku ON products(organization_id, sku);
CREATE INDEX IF NOT EXISTS idx_products_org_status ON products(organization_id, status);

-- 10. PRODUCT MEDIA
CREATE TABLE IF NOT EXISTS product_media (
    id VARCHAR(64) PRIMARY KEY,
    organization_id VARCHAR(64) NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    product_id VARCHAR(64) NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    media_url TEXT NOT NULL,
    media_type VARCHAR(50) DEFAULT 'IMAGE',
    is_primary BOOLEAN DEFAULT FALSE,
    sort_order INT DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_media_product ON product_media(product_id);
