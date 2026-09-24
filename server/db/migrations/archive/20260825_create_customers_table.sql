-- ============================================================================
-- MIGRATION: 20260825_create_customers_table.sql
-- Module: Customers (PF & PJ Multi-Tenant), Addresses (1:N), Contacts (1:N)
-- Sprint 3 Foundation
-- ============================================================================

-- 1. CUSTOMERS TABLE (PF & PJ Multi-Tenant)
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

-- 2. CUSTOMER ADDRESSES TABLE (1:N)
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
