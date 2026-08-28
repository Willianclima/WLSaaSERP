/**
 * Customer Domain Interfaces & Database Schema Definition
 * Sprint 3: Customers + Orders Foundation
 * Multi-Tenant Architecture with support for PF (Pessoa Física) & PJ (Pessoa Jurídica)
 */

export enum PersonTypeEnum {
  PF = "PF",
  PJ = "PJ",
}

export type PersonType = "PF" | "PJ" | PersonTypeEnum;

export type CustomerStatus = "ACTIVE" | "INACTIVE" | "BLOCKED" | "ARCHIVED";

export type CustomerTier = "STANDARD" | "VIP" | "WHOLESALE" | "RESELLER";

export type AddressType = "SHIPPING" | "BILLING" | "MAIN" | "OTHER";
export type CustomerAddressType = AddressType;

export interface Address {
  id: string;
  organizationId: string;
  customerId: string;
  type: AddressType;
  recipientName: string;
  zipCode: string; // CEP: 00000-000
  street: string;
  number: string;
  complement?: string;
  neighborhood: string; // Bairro
  city: string;
  state: string; // UF: SP, RJ, MG...
  country: string; // Default: 'BRA'
  referencePoint?: string;
  isDefault: boolean;
  createdAt: string;
}

// Alias for customer address
export type CustomerAddress = Address;

export interface Contact {
  id: string;
  organizationId: string;
  customerId: string;
  label: string; // ex: 'Financeiro', 'Comprador', 'WhatsApp Secundário'
  contactName?: string;
  email?: string;
  phone?: string;
  isNfeRecipient: boolean;
  createdAt: string;
}

// Alias for customer contact
export type CustomerContact = Contact;

export interface Customer {
  id: string;
  organizationId: string;
  personType: PersonType;

  // Normalized / Direct access fields
  name?: string; // Standard display name (fullName or tradeName/companyName)
  document?: string; // Normalized CPF or CNPJ
  email?: string; // Normalized primary email
  phone?: string; // Normalized primary phone
  address?: Address; // Primary / Default address convenience object

  // --- Pessoa Física (PF) ---
  fullName: string;
  cpf?: string; // Format: 000.000.000-00
  rg?: string;
  birthDate?: string; // YYYY-MM-DD
  gender?: "M" | "F" | "OTHER" | "NOT_INFORMED";

  // --- Pessoa Jurídica (PJ) ---
  companyName?: string; // Razão Social
  tradeName?: string; // Nome Fantasia
  cnpj?: string; // Format: 00.000.000/0000-00
  stateRegistration?: string; // Inscrição Estadual
  isStateRegistrationExempt?: boolean;

  // --- Contato Primário & Metadados ---
  primaryEmail: string;
  primaryPhone: string;
  whatsapp?: string;
  status: CustomerStatus;
  customerTier: CustomerTier;
  notes?: string;

  // --- Relacionamentos 1:N ---
  addresses?: Address[];
  contacts?: Contact[];

  createdAt: string;
  updatedAt: string;
}

// --- DTOs para Criação, Atualização e Filtros ---

export interface CreateAddressDTO {
  type: AddressType;
  recipientName: string;
  zipCode: string;
  street: string;
  number: string;
  complement?: string;
  neighborhood: string;
  city: string;
  state: string;
  country?: string;
  referencePoint?: string;
  isDefault?: boolean;
}

export type CreateCustomerAddressDTO = CreateAddressDTO;

export interface CreateContactDTO {
  label: string;
  contactName?: string;
  email?: string;
  phone?: string;
  isNfeRecipient?: boolean;
}

export type CreateCustomerContactDTO = CreateContactDTO;

export interface CreateCustomerDTO {
  personType: PersonType;

  // PF
  fullName?: string;
  cpf?: string;
  rg?: string;
  birthDate?: string;
  gender?: "M" | "F" | "OTHER" | "NOT_INFORMED";

  // PJ
  companyName?: string;
  tradeName?: string;
  cnpj?: string;
  stateRegistration?: string;
  isStateRegistrationExempt?: boolean;

  // Contato & Metadados
  primaryEmail: string;
  primaryPhone: string;
  whatsapp?: string;
  status?: CustomerStatus;
  customerTier?: CustomerTier;
  notes?: string;

  // Endereços & Contatos Iniciais
  addresses?: CreateAddressDTO[];
  contacts?: CreateContactDTO[];
  initialAddress?: CreateAddressDTO;
  initialContact?: CreateContactDTO;
  address?: CreateAddressDTO;
}

export interface UpdateCustomerDTO {
  personType?: PersonType;
  fullName?: string;
  cpf?: string;
  rg?: string;
  birthDate?: string;
  gender?: "M" | "F" | "OTHER" | "NOT_INFORMED";

  companyName?: string;
  tradeName?: string;
  cnpj?: string;
  stateRegistration?: string;
  isStateRegistrationExempt?: boolean;

  primaryEmail?: string;
  primaryPhone?: string;
  whatsapp?: string;
  status?: CustomerStatus;
  customerTier?: CustomerTier;
  notes?: string;
}

export interface CustomerFilterQuery {
  personType?: PersonType;
  search?: string;
  status?: CustomerStatus;
  customerTier?: CustomerTier;
  city?: string;
  state?: string;
  limit?: number;
  offset?: number;
}

/**
 * PostgreSQL Database Schema Definition for Customers Module
 */
export const CUSTOMER_DATABASE_SCHEMA_DDL = `
-- ============================================================================
-- SPRINT 3: CUSTOMER MODULE SCHEMA (PostgreSQL DDL)
-- ============================================================================

-- 1. Tabela Principal de Clientes Multi-Tenant (PF & PJ)
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

-- 2. Endereços do Cliente (1:N)
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

-- 3. Contatos Adicionais (1:N)
CREATE TABLE IF NOT EXISTS customer_contacts (
    id VARCHAR(64) PRIMARY KEY,
    organization_id VARCHAR(64) NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    customer_id VARCHAR(64) NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    label VARCHAR(50) NOT NULL,         -- ex: 'Financeiro', 'Comprador'
    contact_name VARCHAR(150),
    email VARCHAR(255),
    phone VARCHAR(30),
    is_nfe_recipient BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_cust_contacts_cust ON customer_contacts (organization_id, customer_id);
`;
