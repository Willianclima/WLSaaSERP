/**
 * Domain types and interfaces for Customers Module (Sprint 3)
 * Supports Multi-Tenant Pessoa Física (PF) and Pessoa Jurídica (PJ),
 * Multiple Addresses (1:N) and Multiple Contacts (1:N).
 */

export type PersonType = "PF" | "PJ";

export type CustomerStatus = "ACTIVE" | "INACTIVE" | "BLOCKED" | "ARCHIVED";

export type CustomerTier = "STANDARD" | "VIP" | "WHOLESALE" | "RESELLER";

export type CustomerAddressType = "SHIPPING" | "BILLING" | "MAIN" | "OTHER";

export interface CustomerAddressEntity {
  id: string;
  organizationId: string;
  customerId: string;
  type: CustomerAddressType;
  recipientName: string;
  zipCode: string; // CEP: 00000-000
  street: string;
  number: string;
  complement?: string;
  neighborhood: string; // Bairro
  city: string;
  state: string; // UF: SP, RJ, etc.
  country: string; // Default: 'BRA'
  referencePoint?: string;
  isDefault: boolean;
  createdAt: string;
}

export interface CustomerContactEntity {
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

export interface CustomerEntity {
  id: string;
  organizationId: string;
  personType: PersonType;

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

  // --- Contato Primário & Classificação ---
  primaryEmail: string;
  primaryPhone: string;
  whatsapp?: string;
  status: CustomerStatus;
  customerTier: CustomerTier;
  notes?: string;

  // Relacionamentos 1:N (opcionalmente hydrated)
  addresses?: CustomerAddressEntity[];
  contacts?: CustomerContactEntity[];

  createdAt: string;
  updatedAt: string;
}

// --- DTOs ---

export interface CreateCustomerAddressDTO {
  type: CustomerAddressType;
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

export interface CreateCustomerContactDTO {
  label: string;
  contactName?: string;
  email?: string;
  phone?: string;
  isNfeRecipient?: boolean;
}

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
  addresses?: CreateCustomerAddressDTO[];
  contacts?: CreateCustomerContactDTO[];
  initialAddress?: CreateCustomerAddressDTO;
  initialContact?: CreateCustomerContactDTO;
  address?: CreateCustomerAddressDTO;
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
  search?: string; // Busca por nome, razão social, documento ou email
  status?: CustomerStatus;
  customerTier?: CustomerTier;
  city?: string;
  state?: string;
  limit?: number;
  offset?: number;
}
