export type SaaSPlanId = "TRIAL_30D" | "STARTER" | "PRO" | "ENTERPRISE";

export type SubscriptionStatus =
  | "TRIALING"
  | "ACTIVE"
  | "PAST_DUE"
  | "READ_ONLY"
  | "SUSPENDED"
  | "CANCELED";

export type OrganizationRole =
  | "SUPER_ADMIN"
  | "OWNER"
  | "LOJA_ADMIN"
  | "GERENTE_COMERCIAL"
  | "VENDEDOR"
  | "REVENDEDORA_PORTAL"
  | "AI_GATEWAY";

export type SystemModuleKey =
  | "core_erp"
  | "catalog_inventory"
  | "consignments"
  | "commission_engine"
  | "digital_warranty"
  | "custom_jewelry"
  | "ecommerce_storefront"
  | "custom_domain_ssl"
  | "webhooks_api"
  | "ai_copilot_mcp"
  | "security_lgpd";

export interface PlanDefinition {
  id: SaaSPlanId;
  name: string;
  priceMonthlyBrl: number;
  trialDays: number;
  maxUsers: number;
  maxProducts: number;
  maxResellers: number;
  allowedModules: SystemModuleKey[];
  description: string;
  highlightBadge?: string;
}

export interface OrganizationEntity {
  id: string;
  name: string;
  slug: string;
  document: string; // CNPJ / CPF
  segment: "SEMIJOIAS" | "MODA" | "COSMETICOS" | "VAREJO_GERAL";
  logoUrl?: string;
  city: string;
  state: string;
  contactEmail: string;
  contactWhatsapp: string;
  customDomain?: string;
  customDomainStatus?: "NOT_CONFIGURED" | "PENDING_DNS" | "SSL_PROVISIONING" | "ACTIVE" | "ERROR";
  status: "ACTIVE" | "SUSPENDED" | "PENDING_ACTIVATION";
  createdAt: string;
  updatedAt: string;
}

export interface UserEntity {
  id: string;
  name: string;
  email: string;
  passwordHash: string; // bcrypt/argon2 hash or demo token
  avatarUrl?: string;
  phone?: string;
  isPlatformSuperAdmin: boolean;
  status: "ACTIVE" | "INACTIVE" | "BLOCKED";
  createdAt: string;
  lastLoginAt?: string;
}

export interface OrganizationMemberEntity {
  id: string;
  organizationId: string;
  userId: string;
  role: OrganizationRole;
  customPermissions?: string[];
  status: "ACTIVE" | "INVITED" | "SUSPENDED";
  createdAt: string;
}

export interface SubscriptionEntity {
  id: string;
  organizationId: string;
  planId: SaaSPlanId;
  status: SubscriptionStatus;
  trialStartedAt: string;
  trialEndsAt: string;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  paymentMethod?: "PIX" | "CREDIT_CARD" | "BOLETO" | "MANUAL_TRIAL";
  autoRenew: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface OrganizationModuleEntity {
  id: string;
  organizationId: string;
  moduleKey: SystemModuleKey;
  isEnabled: boolean;
  activatedAt: string;
}

export interface AuthSessionResponse {
  token: string;
  user: {
    id: string;
    name: string;
    email: string;
    avatarUrl?: string;
    isPlatformSuperAdmin: boolean;
  };
  organization: OrganizationEntity;
  membership: {
    role: OrganizationRole;
    permissions: string[];
  };
  subscription: {
    planId: SaaSPlanId;
    planName: string;
    status: SubscriptionStatus;
    trialEndsAt: string;
    daysRemainingInTrial: number;
    isTrial: boolean;
    isActive: boolean;
    allowedModules: SystemModuleKey[];
  };
  availableOrganizations: Array<{
    id: string;
    name: string;
    slug: string;
    role: OrganizationRole;
  }>;
}

export interface AuditLogEntity {
  id: string;
  organizationId: string;
  userId?: string;
  action: string;
  entity: string;
  entityId: string;
  status: "SUCESSO" | "NEGADO" | "ERRO";
  ipAddress: string;
  userAgent?: string;
  details?: string;
  changes?: any;
  createdAt: string;
}

