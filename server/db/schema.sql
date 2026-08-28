-- =========================================================================
-- AURA SAAS & ERP PLATFORM - POSTGRESQL MULTI-TENANT CORE SCHEMA
-- =========================================================================

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

-- 2. USERS (GLOBAL USERS)
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

-- 3. ORGANIZATION MEMBERSHIPS (MULTI-TENANT USER ROLES)
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

-- 4. PLANS
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

-- 5. SUBSCRIPTIONS (TRIAL & BILLING LIFECYCLE)
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

-- 6. ORGANIZATION MODULES (DYNAMIC FEATURE GATING)
CREATE TABLE IF NOT EXISTS organization_modules (
    id VARCHAR(64) PRIMARY KEY,
    organization_id VARCHAR(64) NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    module_key VARCHAR(100) NOT NULL,
    is_enabled BOOLEAN DEFAULT TRUE,
    activated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(organization_id, module_key)
);

-- 7. AUDIT TRAIL LOGS (LGPD & RBAC COMPLIANCE)
CREATE TABLE IF NOT EXISTS audit_logs (
    id VARCHAR(64) PRIMARY KEY,
    organization_id VARCHAR(64) NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    user_id VARCHAR(64) REFERENCES users(id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL,
    entity VARCHAR(100),
    entity_id VARCHAR(100),
    status VARCHAR(50) DEFAULT 'SUCESSO',
    ip_address VARCHAR(45) NOT NULL,
    user_agent TEXT,
    details TEXT,
    changes JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_audit_org_timestamp ON audit_logs(organization_id, created_at DESC);

-- =========================================================================
-- ERP DOMAIN: 8. PRODUCTS & 9. INVENTORY LEDGER (SEMIJOIAS DOMAIN)
-- =========================================================================

-- 8. PRODUCTS
CREATE TABLE IF NOT EXISTS products (
    id VARCHAR(64) PRIMARY KEY,
    organization_id VARCHAR(64) NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    sku VARCHAR(100) NOT NULL,
    name VARCHAR(255) NOT NULL,
    category VARCHAR(50) NOT NULL, -- COLARES, BRINCOS, ANEIS, PULSEIRAS, CONJUNTOS, PERSONALIZADOS
    collection VARCHAR(100) DEFAULT 'Linha Principal',
    material VARCHAR(100) DEFAULT 'Liga Nobre Hipoalergênica',
    bath VARCHAR(50) NOT NULL, -- OURO_18K, RODIO_BRANCO, RODIO_NEGRO, PRATA_925, ROSE_GOLD
    stones JSONB DEFAULT '[]'::jsonb,
    price NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    cost_price NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    promo_price NUMERIC(10, 2),
    warranty_months INT NOT NULL DEFAULT 12,
    is_customizable BOOLEAN NOT NULL DEFAULT FALSE,
    image_url TEXT,
    description TEXT,
    status VARCHAR(50) NOT NULL DEFAULT 'ATIVO', -- ATIVO, PAUSADO, ESGOTADO
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(organization_id, sku)
);

CREATE INDEX IF NOT EXISTS idx_products_org_category ON products(organization_id, category);
CREATE INDEX IF NOT EXISTS idx_products_org_sku ON products(organization_id, sku);
CREATE INDEX IF NOT EXISTS idx_products_org_status ON products(organization_id, status);

-- 9. INVENTORY MOVEMENTS (IMMUTABLE STOCK LEDGER)
CREATE TABLE IF NOT EXISTS inventory_movements (
    id VARCHAR(64) PRIMARY KEY,
    organization_id VARCHAR(64) NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    product_id VARCHAR(64) NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL, -- PURCHASE, SALE, RETURN, CONSIGNMENT_OUT, CONSIGNMENT_RETURN, CONSIGNMENT_SALE, ADJUSTMENT, TRANSFER, REVERSAL
    quantity_change INT NOT NULL,
    physical_balance_after INT NOT NULL, -- Snapshot at movement time (Source of Truth is the full event stream)
    consigned_balance_after INT NOT NULL, -- Snapshot at movement time
    location_id VARCHAR(64), -- Prepared for multi-location (e.g. MATRIZ, LOJA_01, MALETA_REVENDEDORA)
    reference_type VARCHAR(50), -- ORDER, CONSIGNMENT, SUPPLIER_INVOICE, MANUAL_ADJUSTMENT, REVERSAL_OPERATION
    reference_id VARCHAR(64),
    reversal_of_movement_id VARCHAR(64) REFERENCES inventory_movements(id) ON DELETE SET NULL, -- Audit linkage for reversal movements
    operator_name VARCHAR(100) NOT NULL DEFAULT 'Sistema',
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_inventory_org_product ON inventory_movements(organization_id, product_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_inventory_org_created ON inventory_movements(organization_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_inventory_reversal ON inventory_movements(reversal_of_movement_id);

-- 10. INVENTORY LOCATIONS (MULTI-LOCATION DOMAIN)
CREATE TABLE IF NOT EXISTS inventory_locations (
    id VARCHAR(64) PRIMARY KEY,
    organization_id VARCHAR(64) NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name VARCHAR(150) NOT NULL,
    type VARCHAR(50) NOT NULL DEFAULT 'PHYSICAL_STORE', -- HEADQUARTERS, PHYSICAL_STORE, WAREHOUSE, RESELLER_BAG, EVENT_STAND
    code VARCHAR(50) NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(organization_id, code)
);

CREATE INDEX IF NOT EXISTS idx_locations_org ON inventory_locations(organization_id);

-- 11. INVENTORY BALANCES (PRODUCT + LOCATION MULTI-DIMENSIONAL BALANCE ENGINE)
-- Replaces single current_balance with on_hand, reserved, and computed available quantities
CREATE TABLE IF NOT EXISTS inventory_balances (
    id VARCHAR(64) PRIMARY KEY,
    organization_id VARCHAR(64) NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    product_id VARCHAR(64) NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    location_id VARCHAR(64) NOT NULL REFERENCES inventory_locations(id) ON DELETE CASCADE,
    on_hand_quantity INT NOT NULL DEFAULT 0,
    reserved_quantity INT NOT NULL DEFAULT 0,
    available_quantity INT GENERATED ALWAYS AS (on_hand_quantity - reserved_quantity) STORED,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(organization_id, product_id, location_id),
    -- Integrity Constraints for Concurrency and Zero-Overselling Guarantee:
    CONSTRAINT check_on_hand_non_negative CHECK (on_hand_quantity >= 0),
    CONSTRAINT check_reserved_non_negative CHECK (reserved_quantity >= 0),
    CONSTRAINT check_reserved_within_on_hand CHECK (reserved_quantity <= on_hand_quantity)
);

CREATE INDEX IF NOT EXISTS idx_inventory_balances_org_product ON inventory_balances(organization_id, product_id);
CREATE INDEX IF NOT EXISTS idx_inventory_balances_org_location ON inventory_balances(organization_id, location_id);

-- 12. INVENTORY RESERVATIONS (LIFECYCLE & TTL RESERVATION ENGINE)
CREATE TABLE IF NOT EXISTS inventory_reservations (
    id VARCHAR(64) PRIMARY KEY,
    organization_id VARCHAR(64) NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    product_id VARCHAR(64) NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    location_id VARCHAR(64) NOT NULL REFERENCES inventory_locations(id) ON DELETE CASCADE,
    quantity INT NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'ACTIVE', -- ACTIVE, CONFIRMED, RELEASED, EXPIRED, CANCELED
    reference_type VARCHAR(100) NOT NULL, -- ORDER, CHECKOUT_CART, CONSIGNMENT_BAG, QUOTATION
    reference_id VARCHAR(150) NOT NULL,
    idempotency_key VARCHAR(255),
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    confirmed_at TIMESTAMP WITH TIME ZONE,
    released_at TIMESTAMP WITH TIME ZONE,
    operator_name VARCHAR(150),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT check_reservation_quantity_positive CHECK (quantity > 0),
    UNIQUE(organization_id, idempotency_key)
);

CREATE INDEX IF NOT EXISTS idx_inventory_reservations_org_status ON inventory_reservations(organization_id, status);
CREATE INDEX IF NOT EXISTS idx_inventory_reservations_expires ON inventory_reservations(organization_id, expires_at);
CREATE INDEX IF NOT EXISTS idx_inventory_reservations_product_loc ON inventory_reservations(organization_id, product_id, location_id);
-- 13. GLOBAL IDEMPOTENCY KEYS (DEDUPLICATION & SAFE RETRIES)
CREATE TABLE IF NOT EXISTS idempotency_keys (
    id VARCHAR(64) PRIMARY KEY,
    organization_id VARCHAR(64) NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    idempotency_key VARCHAR(255) NOT NULL,
    resource_type VARCHAR(100) NOT NULL, -- INVENTORY_RESERVATION, ORDER, PAYMENT, CONSIGNMENT, TRANSFER, WEBHOOK
    request_hash VARCHAR(64),
    status VARCHAR(30) NOT NULL DEFAULT 'PROCESSING', -- PROCESSING, COMPLETED, FAILED
    response_code INT,
    response_body JSONB,
    user_id VARCHAR(64),
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(organization_id, idempotency_key)
);

CREATE INDEX IF NOT EXISTS idx_idempotency_keys_lookup ON idempotency_keys(organization_id, idempotency_key);
CREATE INDEX IF NOT EXISTS idx_idempotency_keys_expires ON idempotency_keys(expires_at);
CREATE INDEX IF NOT EXISTS idx_idempotency_keys_resource ON idempotency_keys(organization_id, resource_type, created_at DESC);

-- 14. CUSTOMERS (MULTI-TENANT PF & PJ)
CREATE TABLE IF NOT EXISTS customers (
    id VARCHAR(64) PRIMARY KEY,
    organization_id VARCHAR(64) NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    person_type VARCHAR(2) NOT NULL CHECK (person_type IN ('PF', 'PJ')),
    
    -- Campos diretos / normalizados
    name VARCHAR(255),                  -- Nome exibição unificado (Pessoa Física ou Razão/Fantasia)
    document VARCHAR(30),               -- CPF ou CNPJ unificado
    email VARCHAR(255),                 -- Email principal unificado
    phone VARCHAR(30),                  -- Telefone principal unificado
    address JSONB,                      -- Objeto JSONB de endereço principal/padrão
    
    -- Pessoa Física (PF)
    full_name VARCHAR(255) NOT NULL,
    cpf VARCHAR(14),
    rg VARCHAR(20),
    birth_date DATE,
    gender VARCHAR(20) CHECK (gender IN ('M', 'F', 'OTHER', 'NOT_INFORMED')),
    
    -- Pessoa Jurídica (PJ)
    company_name VARCHAR(255),          -- Razão Social
    trade_name VARCHAR(255),            -- Nome Fantasia
    cnpj VARCHAR(18),
    state_registration VARCHAR(30),     -- Inscrição Estadual
    is_state_registration_exempt BOOLEAN DEFAULT FALSE,
    
    -- Contato Primário & Classificação
    primary_email VARCHAR(255) NOT NULL,
    primary_phone VARCHAR(30) NOT NULL,
    whatsapp VARCHAR(30),
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'INACTIVE', 'BLOCKED')),
    customer_tier VARCHAR(20) NOT NULL DEFAULT 'STANDARD' CHECK (customer_tier IN ('STANDARD', 'VIP', 'WHOLESALE', 'RESELLER')),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT uq_customer_org_cpf UNIQUE (organization_id, cpf),
    CONSTRAINT uq_customer_org_cnpj UNIQUE (organization_id, cnpj),
    CONSTRAINT uq_customer_org_email UNIQUE (organization_id, primary_email)
);

CREATE INDEX IF NOT EXISTS idx_customers_org_status ON customers (organization_id, status);
CREATE INDEX IF NOT EXISTS idx_customers_org_tier ON customers (organization_id, customer_tier);
CREATE INDEX IF NOT EXISTS idx_customers_org_name ON customers (organization_id, full_name);
CREATE INDEX IF NOT EXISTS idx_customers_org_doc ON customers (organization_id, document);
CREATE INDEX IF NOT EXISTS idx_customers_org_doc_cpf ON customers (organization_id, cpf);
CREATE INDEX IF NOT EXISTS idx_customers_org_doc_cnpj ON customers (organization_id, cnpj);

-- 15. CUSTOMER ADDRESSES (1:N)
CREATE TABLE IF NOT EXISTS customer_addresses (
    id VARCHAR(64) PRIMARY KEY,
    organization_id VARCHAR(64) NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    customer_id VARCHAR(64) NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    type VARCHAR(20) NOT NULL DEFAULT 'MAIN' CHECK (type IN ('SHIPPING', 'BILLING', 'MAIN', 'OTHER')),
    recipient_name VARCHAR(255) NOT NULL,
    zip_code VARCHAR(10) NOT NULL,      -- CEP (00000-000)
    street VARCHAR(255) NOT NULL,
    number VARCHAR(30) NOT NULL,
    complement VARCHAR(100),
    neighborhood VARCHAR(100) NOT NULL,  -- Bairro
    city VARCHAR(100) NOT NULL,
    state VARCHAR(2) NOT NULL,          -- UF
    country VARCHAR(3) DEFAULT 'BRA',
    reference_point TEXT,
    is_default BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_cust_addresses_cust ON customer_addresses (organization_id, customer_id);
CREATE INDEX IF NOT EXISTS idx_cust_addresses_zip ON customer_addresses (organization_id, zip_code);

-- 16. CUSTOMER CONTACTS (1:N)
CREATE TABLE IF NOT EXISTS customer_contacts (
    id VARCHAR(64) PRIMARY KEY,
    organization_id VARCHAR(64) NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    customer_id VARCHAR(64) NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    label VARCHAR(50) NOT NULL,         -- ex: 'Financeiro', 'Comprador', 'WhatsApp Secundário'
    contact_name VARCHAR(150),
    email VARCHAR(255),
    phone VARCHAR(30),
    is_nfe_recipient BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_cust_contacts_cust ON customer_contacts (organization_id, customer_id);

-- 17. ORDERS
CREATE TABLE IF NOT EXISTS orders (
    id VARCHAR(64) PRIMARY KEY,
    organization_id VARCHAR(64) NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    order_number VARCHAR(50) NOT NULL,
    customer_id VARCHAR(64) NOT NULL REFERENCES customers(id),
    customer_snapshot JSONB NOT NULL,
    
    channel VARCHAR(30) NOT NULL CHECK (
        channel IN ('ECOMMERCE', 'PRESENTIAL_POS', 'WHATSAPP', 'B2B_RESELLER', 'CUSTOM_STUDIO', 'MARKETPLACE')
    ),
    
    -- Finite State Machine (FSM)
    status VARCHAR(30) NOT NULL DEFAULT 'DRAFT' CHECK (
        status IN (
            'DRAFT', 'PENDING', 'INVENTORY_RESERVED',
            'PAYMENT_PENDING', 'PAID', 'IN_PREPARATION',
            'FULFILLED', 'CANCELED', 'REFUNDED'
        )
    ),
    
    shipping_address JSONB NOT NULL,
    currency VARCHAR(3) DEFAULT 'BRL',
    subtotal_amount NUMERIC(12,2) NOT NULL DEFAULT 0.00 CHECK (subtotal_amount >= 0),
    discount_amount NUMERIC(12,2) NOT NULL DEFAULT 0.00 CHECK (discount_amount >= 0),
    shipping_amount NUMERIC(12,2) NOT NULL DEFAULT 0.00 CHECK (shipping_amount >= 0),
    total_amount NUMERIC(12,2) NOT NULL DEFAULT 0.00 CHECK (total_amount >= 0),
    
    reseller_id VARCHAR(64),
    reseller_name VARCHAR(255),
    reseller_commission_rate NUMERIC(5,2) DEFAULT 0.00,
    reseller_commission_amount NUMERIC(12,2) DEFAULT 0.00,
    
    warranty_code VARCHAR(64),
    idempotency_key VARCHAR(128),
    ip_address VARCHAR(45),
    user_agent TEXT,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT uq_order_org_number UNIQUE (organization_id, order_number),
    CONSTRAINT uq_order_org_idempotency UNIQUE (organization_id, idempotency_key)
);

CREATE INDEX IF NOT EXISTS idx_orders_org_status ON orders (organization_id, status);
CREATE INDEX IF NOT EXISTS idx_orders_org_customer ON orders (organization_id, customer_id);
CREATE INDEX IF NOT EXISTS idx_orders_org_channel ON orders (organization_id, channel);
CREATE INDEX IF NOT EXISTS idx_orders_org_created ON orders (organization_id, created_at DESC);

-- 18. ORDER ITEMS (WITH PRODUCT SNAPSHOT)
CREATE TABLE IF NOT EXISTS order_items (
    id VARCHAR(64) PRIMARY KEY,
    organization_id VARCHAR(64) NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    order_id VARCHAR(64) NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    product_id VARCHAR(64) NOT NULL REFERENCES products(id),
    location_id VARCHAR(64) NOT NULL REFERENCES inventory_locations(id),
    
    -- Immutable product snapshot: SKU, name, pricing, bath/metal specs
    product_snapshot JSONB NOT NULL,
    
    quantity INT NOT NULL CHECK (quantity > 0),
    unit_price NUMERIC(12,2) NOT NULL CHECK (unit_price >= 0),
    cost_price_snapshot NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    discount_amount NUMERIC(12,2) NOT NULL DEFAULT 0.00 CHECK (discount_amount >= 0),
    total_amount NUMERIC(12,2) NOT NULL CHECK (total_amount >= 0),
    
    customization_spec JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_order_items_org_order ON order_items (organization_id, order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_org_prod ON order_items (organization_id, product_id);
CREATE INDEX IF NOT EXISTS idx_order_items_org_loc ON order_items (organization_id, location_id);

-- 19. ORDER PAYMENTS
CREATE TABLE IF NOT EXISTS order_payments (
    id VARCHAR(64) PRIMARY KEY,
    organization_id VARCHAR(64) NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    order_id VARCHAR(64) NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    payment_method VARCHAR(30) NOT NULL CHECK (
        payment_method IN ('PIX', 'CREDIT_CARD', 'DEBIT_CARD', 'BOLETO', 'CASH', 'STORE_CREDIT')
    ),
    gateway VARCHAR(30) NOT NULL DEFAULT 'MANUAL' CHECK (
        gateway IN ('MANUAL', 'MERCADOPAGO', 'ASAAS', 'STRIPE', 'PAGSEGURO', 'POS_REDE', 'POS_CIELO')
    ),
    gateway_transaction_id VARCHAR(255),
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING' CHECK (
        status IN ('PENDING', 'AUTHORIZED', 'PAID', 'FAILED', 'REFUNDED')
    ),
    amount NUMERIC(12,2) NOT NULL CHECK (amount > 0),
    installments INT NOT NULL DEFAULT 1 CHECK (installments >= 1),
    
    pix_qr_code TEXT,
    pix_qr_code_url TEXT,
    pix_copy_paste TEXT,
    pix_expiration TIMESTAMP WITH TIME ZONE,
    boleto_barcode TEXT,
    boleto_url TEXT,
    
    paid_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_order_payments_org_order ON order_payments (organization_id, order_id);
CREATE INDEX IF NOT EXISTS idx_order_payments_org_status ON order_payments (organization_id, status);

-- 20. ORDER STATE TRANSITIONS
CREATE TABLE IF NOT EXISTS order_state_transitions (
    id VARCHAR(64) PRIMARY KEY,
    organization_id VARCHAR(64) NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    order_id VARCHAR(64) NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    from_status VARCHAR(30) NOT NULL,
    to_status VARCHAR(30) NOT NULL,
    event VARCHAR(50) NOT NULL,
    operator_id VARCHAR(64),
    operator_name VARCHAR(150),
    reason TEXT,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_order_transitions_org_order ON order_state_transitions (organization_id, order_id);




