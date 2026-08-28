-- ============================================================================
-- MIGRATION: 20260825_create_orders_and_order_items_tables.sql
-- Module: Orders, Order Items (with product snapshot), Order Payments, State Transitions
-- Sprint 3 Foundation
-- ============================================================================

-- 1. ORDERS TABLE
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

-- 2. ORDER ITEMS TABLE (WITH IMMUTABLE PRODUCT SNAPSHOT)
CREATE TABLE IF NOT EXISTS order_items (
    id VARCHAR(64) PRIMARY KEY,
    organization_id VARCHAR(64) NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    order_id VARCHAR(64) NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    product_id VARCHAR(64) NOT NULL REFERENCES products(id),
    location_id VARCHAR(64) NOT NULL REFERENCES inventory_locations(id),
    
    -- Immutable product snapshot: preserves SKU, name, pricing, bath/metal specs at order time
    product_snapshot JSONB NOT NULL,
    
    quantity INT NOT NULL CHECK (quantity > 0),
    unit_price NUMERIC(12,2) NOT NULL CHECK (unit_price >= 0),
    cost_price_snapshot NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    discount_amount NUMERIC(12,2) NOT NULL DEFAULT 0.00 CHECK (discount_amount >= 0),
    total_amount NUMERIC(12,2) NOT NULL CHECK (total_amount >= 0),
    
    customization_spec JSONB, -- Custom engraving / tailoring details
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_order_items_org_order ON order_items (organization_id, order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_org_prod ON order_items (organization_id, product_id);
CREATE INDEX IF NOT EXISTS idx_order_items_org_loc ON order_items (organization_id, location_id);

-- 3. ORDER PAYMENTS TABLE
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

-- 4. ORDER STATE TRANSITIONS TABLE (AUDIT TRAIL)
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
