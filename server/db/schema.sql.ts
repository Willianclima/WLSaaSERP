/**
 * Relational Database Schema (PostgreSQL DDL)
 * Multi-Tenant Architecture for SaaS & Semi-joias ERP
 * Modules: Customers (PF/PJ), Orders, Order Items (Snapshots), Payments, FSM Audit
 */

export const SCHEMA_CUSTOMERS_ORDERS_DDL = `
-- ============================================================================
-- SPRINT 3: CUSTOMERS & ORDERS SCHEMA (PostgreSQL Compatible DDL)
-- ============================================================================

-- 1. CUSTOMERS TABLE (PF & PJ Multi-Tenant)
CREATE TABLE IF NOT EXISTS customers (
    id VARCHAR(64) PRIMARY KEY,
    organization_id VARCHAR(64) NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    person_type VARCHAR(2) NOT NULL CHECK (person_type IN ('PF', 'PJ')),
    
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

-- 2. CUSTOMER ADDRESSES TABLE (1:N)
CREATE TABLE IF NOT EXISTS customer_addresses (
    id VARCHAR(64) PRIMARY KEY,
    organization_id VARCHAR(64) NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    customer_id VARCHAR(64) NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    type VARCHAR(20) NOT NULL DEFAULT 'MAIN' CHECK (type IN ('SHIPPING', 'BILLING', 'MAIN', 'OTHER')),
    recipient_name VARCHAR(255) NOT NULL,
    zip_code VARCHAR(10) NOT NULL,      -- CEP
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

-- 3. CUSTOMER CONTACTS TABLE (1:N)
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

-- 4. ORDERS TABLE (Sales Engine & Omnichannel)
CREATE TABLE IF NOT EXISTS orders (
    id VARCHAR(64) PRIMARY KEY,
    organization_id VARCHAR(64) NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    order_number VARCHAR(50) NOT NULL,  -- Ex: ORD-2026-0001
    customer_id VARCHAR(64) NOT NULL REFERENCES customers(id),
    customer_snapshot JSONB NOT NULL,   -- { id, name, document, email, phone, personType }
    
    channel VARCHAR(30) NOT NULL CHECK (
        channel IN ('ECOMMERCE', 'PRESENTIAL_POS', 'WHATSAPP', 'B2B_RESELLER', 'CUSTOM_STUDIO', 'MARKETPLACE')
    ),
    
    -- Máquina de Estados Finita (FSM)
    status VARCHAR(30) NOT NULL DEFAULT 'DRAFT' CHECK (
        status IN (
            'DRAFT',
            'PENDING',
            'INVENTORY_RESERVED',
            'PAYMENT_PENDING',
            'PAID',
            'IN_PREPARATION',
            'FULFILLED',
            'CANCELED',
            'REFUNDED'
        )
    ),
    
    -- Endereço de Entrega Snapshot
    shipping_address JSONB NOT NULL,
    
    -- Totais Financeiros
    currency VARCHAR(3) DEFAULT 'BRL',
    subtotal_amount NUMERIC(12,2) NOT NULL DEFAULT 0.00 CHECK (subtotal_amount >= 0),
    discount_amount NUMERIC(12,2) NOT NULL DEFAULT 0.00 CHECK (discount_amount >= 0),
    shipping_amount NUMERIC(12,2) NOT NULL DEFAULT 0.00 CHECK (shipping_amount >= 0),
    total_amount NUMERIC(12,2) NOT NULL DEFAULT 0.00 CHECK (total_amount >= 0),
    
    -- Vínculo com Revendedora (Consignação / Comissões)
    reseller_id VARCHAR(64),
    reseller_name VARCHAR(255),
    reseller_commission_rate NUMERIC(5,2) DEFAULT 0.00,
    reseller_commission_amount NUMERIC(12,2) DEFAULT 0.00,
    
    -- Garantia Digital
    warranty_code VARCHAR(64),
    
    -- Idempotência & Metadados
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
CREATE INDEX IF NOT EXISTS idx_orders_org_created ON orders (organization_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_org_channel ON orders (organization_id, channel);

-- 5. ORDER ITEMS (Immutable Product Snapshot)
CREATE TABLE IF NOT EXISTS order_items (
    id VARCHAR(64) PRIMARY KEY,
    organization_id VARCHAR(64) NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    order_id VARCHAR(64) NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    product_id VARCHAR(64) NOT NULL REFERENCES products(id),
    location_id VARCHAR(64) NOT NULL REFERENCES inventory_locations(id),
    
    -- Snapshot Imutável de Catálogo no Momento da Compra
    product_snapshot JSONB NOT NULL,
    -- Contém: { sku, name, category, material, bath, stones, price, costPrice, warrantyMonths, imageUrl, ... }
    
    quantity INT NOT NULL CHECK (quantity > 0),
    unit_price NUMERIC(12,2) NOT NULL CHECK (unit_price >= 0),
    cost_price_snapshot NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    discount_amount NUMERIC(12,2) NOT NULL DEFAULT 0.00 CHECK (discount_amount >= 0),
    total_amount NUMERIC(12,2) NOT NULL CHECK (total_amount >= 0),
    
    customization_spec JSONB, -- Estúdio de Personalização de Joias
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items (organization_id, order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_product ON order_items (organization_id, product_id);

-- 6. ORDER PAYMENTS (Multi-Payment Gateways)
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
    
    -- PIX / Instant Billing Payloads
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

CREATE INDEX IF NOT EXISTS idx_order_payments_order ON order_payments (organization_id, order_id);
CREATE INDEX IF NOT EXISTS idx_order_payments_status ON order_payments (organization_id, status);

-- 7. ORDER STATE TRANSITIONS (FSM Immutable Audit Trail)
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

CREATE INDEX IF NOT EXISTS idx_order_transitions_order ON order_state_transitions (organization_id, order_id, created_at ASC);
`;
