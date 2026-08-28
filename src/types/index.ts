import { PersonType } from "./customer";
export * from "./customer";
export * from "./order";

export type SaaSPlanTier = "FREE" | "PRO" | "PREMIUM";

export interface StoreBrandingConfig {
  logoType: "TEXT" | "IMAGE";
  logoUrl: string;
  logoText: string;
  logoSubtext: string;
  paletteId: "GOLD_18K" | "ROSE_GOLD" | "RHODIUM_SILVER" | "EMERALD_NOBLE" | "RUBY_ROYAL" | "ONYX_NOIR";
  primaryColor: string; // e.g. #F59E0B
  accentColor: string; // e.g. #FEF3C7
  fontPairing: "CLASSIC_SERIF" | "ROMAN_IMPERIAL" | "MODERN_MINIMAL" | "EDITORIAL_VOGUE";
  heroPillBadge: string;
  heroHeadline: string;
  heroSubtitle: string;
  announcementBarText: string;
  ctaPrimaryText: string;
  ctaSecondaryText: string;
  footerSlogan: string;
  // Poster Expo Collage fields
  posterTitle: string;
  posterBadgeDate: string;
  posterLocation: string;
  posterDescription: string;
  posterPromoCode: string;
  posterPromoDiscount: string;
  // Social Media Handles & URLs
  instagramHandle: string;
  instagramUrl: string;
  contactWhatsapp: string;
  whatsappPrefilledMessage: string;
  contactEmail: string;
  facebookHandle: string;
  tiktokHandle: string;
  pinterestHandle: string;
  pinterestBoardUrl: string;
  websiteUrl: string;
  // QR Code & Editorial Collage settings
  qrCodeColor: string;
  qrCodeTarget: "WHATSAPP" | "INSTAGRAM" | "PINTEREST" | "STOREFRONT" | "POSTER";
  activeCollageFormat: "STORY" | "TOTEM_COUNTER" | "PINTEREST_PIN" | "FLYER_PROMO";
  showConsultantBadge: boolean;
  showPillarsOfTrust: boolean;
  // Background Wallpapers & Photography
  customBackgroundUrl?: string;
  backgroundPresetId?: string;
  // Custom Domain & Managed SSL Settings
  customDomain?: string;
  customDomainStatus?: "NOT_CONFIGURED" | "PENDING_DNS" | "SSL_PROVISIONING" | "ACTIVE" | "ERROR";
  customDomainSslAutoManaged?: boolean;
  customDomainCnameTarget?: string;
  customDomainIpTarget?: string;
  customDomainSslIssuer?: string;
  customDomainSslIssuedAt?: string;
  customDomainSslExpiresAt?: string;
  customDomainForceHttps?: boolean;
  customDomainHstsEnabled?: boolean;
  customDomainLastChecked?: string;
}

export interface TenantStore {
  id: string;
  name: string;
  slug: string;
  document: string; // CNPJ
  planTier: SaaSPlanTier;
  logo: string;
  city: string;
  state: string;
  contactEmail: string;
  contactWhatsapp: string;
  activeProductsCount: number;
  activeResellersCount: number;
  customDomain?: string;
  customDomainStatus?: "NOT_CONFIGURED" | "PENDING_DNS" | "SSL_PROVISIONING" | "ACTIVE" | "ERROR";
  customDomainSslAutoManaged?: boolean;
  tier?: string;
  features: {
    unlimitedProducts: boolean;
    consignments: boolean;
    commissionEngine: boolean;
    digitalWarranty: boolean;
    customJewelry: boolean;
    whatsappAutomations: boolean;
    aiGatewayMCP: boolean;
    marketplaces: boolean;
    multiUserRBAC: boolean;
  };
}

export type JewelryBath = "OURO_18K" | "RODIO_BRANCO" | "RODIO_NEGRO" | "PRATA_925" | "ROSE_GOLD";

export interface ProductItem {
  id: string;
  sku: string;
  name: string;
  category: "COLARES" | "BRINCOS" | "ANEIS" | "PULSEIRAS" | "CONJUNTOS" | "PERSONALIZADOS";
  collection: string;
  material: string;
  bath: JewelryBath;
  stones: string[];
  price: number;
  costPrice: number;
  promoPrice?: number;
  stockPhysical: number; // No estoque da empresa
  stockConsigned: number; // Em maletas com revendedoras
  stockAvailable: number; // Disponível para venda direta / envio
  warrantyMonths: number;
  isCustomizable: boolean;
  imageUrl: string;
  description: string;
  status: "ATIVO" | "PAUSADO" | "ESGOTADO";
}

export interface InventoryLedgerEntry {
  id: string;
  timestamp: string;
  productId: string;
  sku: string;
  productName: string;
  type:
    | "ENTRADA_FORNECEDOR"
    | "ENVIO_CONSIGNACAO"
    | "RETORNO_CONSIGNACAO"
    | "VENDA_DIRETA"
    | "VENDA_REVENDEDORA"
    | "AJUSTE_INVENTARIO"
    | "REVERSAO_ESTORNO";
  qtyChange: number;
  physicalBalanceAfter: number;
  consignedBalanceAfter: number;
  reversalOfMovementId?: string;
  resellerId?: string;
  resellerName?: string;
  orderNumber?: string;
  operator: string;
  reason: string;
}

export interface Reseller {
  id: string;
  name: string;
  email: string;
  phone: string;
  document?: string;
  avatar: string;
  level: "INICIANTE" | "PRATA" | "OURO" | "DIAMANTE";
  isLeader: boolean;
  leaderName?: string;
  leaderId?: string;
  teamSize?: number;
  commissionDirectRate: number; // ex: 25 (%)
  leaderBonusRate?: number; // ex: 5 (%)
  totalSalesAccumulated: number;
  currentConsignedValue?: number;
  pendingCommissionValue: number;
  activeConsignmentsCount?: number;
  city: string;
  state: string;
  status: "ATIVA" | "PENDENTE" | "BLOQUEADA";
  joinedAt?: string;
}

export interface ConsignmentItem {
  productId: string;
  sku: string;
  productName: string;
  unitPrice: number;
  unitCost?: number;
  quantityShipped: number;
  quantitySold: number;
  quantityReturned: number;
  quantityPending: number;
}

export interface ConsignmentMaleta {
  id: string;
  code: string; // ex: MLT-2026-08
  resellerId: string;
  resellerName: string;
  resellerPhone: string;
  startDate: string;
  dueDate: string;
  status: "EM_ABERTO" | "PARCIALMENTE_ACERTADA" | "FINALIZADA" | "VENCIDA";
  items: ConsignmentItem[];
  totalValue: number;
  soldValue: number;
  returnedValue?: number;
  pendingValue: number;
  commissionCalculated: number;
  commissionPaid: boolean;
  settlementDate?: string;
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface CommissionTier {
  id: string;
  minSales: number;
  maxSales: number;
  ratePercent: number;
  leaderBonusPercent: number;
  badge: string;
}

export interface CommissionSettlement {
  id: string;
  period: string;
  resellerId: string;
  resellerName: string;
  isLeader: boolean;
  directSalesTotal: number;
  directCommissionEarned: number;
  teamSalesTotal?: number;
  teamBonusEarned?: number;
  totalPayable: number;
  status: "CALCULADO" | "APROVADO" | "PAGO";
  paymentDate?: string;
  receiptNumber?: string;
}

export interface DigitalWarranty {
  id: string;
  code: string; // ex: GRT-8F2A9D
  customerName: string;
  customerDocument: string; // CPF
  customerPhone: string;
  customerEmail: string;
  orderNumber: string;
  sku: string;
  productName: string;
  bathType: string;
  issueDate: string;
  expirationDate: string;
  status: "VALIDA" | "REPARO_SOLICITADO" | "CONCLUIDA" | "EXPIRADA";
  terms: string;
  channel: string;
  resellerName?: string;
  claimsCount: number;
  claimLogs?: Array<{
    date: string;
    description: string;
    status: string;
  }>;
}

export interface CustomJewelryOrderSpec {
  engravingName: string;
  fontStyle: "CURSIVA" | "CLASSICA" | "MINIMALISTA" | "MODERNA";
  gemStone: "ZIRCONIA_CRISTAL" | "ESMERALDA_FUSION" | "RUBI_SYNTH" | "TURMALINA_PARAIBA";
  bathFinish: JewelryBath;
  chainLengthCm: 40 | 45 | 50 | 60;
  giftBox: boolean;
  specialNotes: string;
}

// ============================================================================
// SPRINT 3 & 4: CUSTOMERS & ORDERS DOMAIN TYPES
// ============================================================================

export * from "./customer";
export * from "./order";

export interface RBACUser {
  id: string;
  name: string;
  email: string;
  role: "SUPER_ADMIN" | "LOJA_ADMIN" | "GERENTE_COMERCIAL" | "REVENDEDORA_PORTAL" | "AI_GATEWAY";
  tenantId: string;
}

export interface AuditTrailLog {
  id: string;
  timestamp: string;
  userName?: string;
  userEmail?: string;
  userRole?: "SUPER_ADMIN" | "LOJA_ADMIN" | "GERENTE_COMERCIAL" | "REVENDEDORA_PORTAL" | "AI_GATEWAY";
  action: string; // ex: "ORDER_CANCELLED", "CONSIGNMENT_SETTLED", "WARRANTY_VALIDATED", "STOCK_LEDGER_ADJUSTED"
  entity?: string;
  entityId?: string;
  targetEntity?: string;
  resource?: string;
  resourceId?: string;
  actor?: string;
  status?: "SUCESSO" | "NEGADO_RBAC" | "CONFIRMADO_HUMANO";
  ipAddress: string;
  userAgent?: string;
  details?: string;
  changes?: Record<string, any>;
}

export type AuditLogEntry = AuditTrailLog;

export interface DomainSSLAuditEntry {
  id: string;
  timestamp: string;
  adminName: string;
  adminEmail: string;
  adminRole: string;
  domain: string;
  action:
    | "VALIDATE_DNS_AVAILABILITY"
    | "PROVISION_AUTO_SSL"
    | "UPDATE_CUSTOM_DOMAIN"
    | "ENABLE_HTTPS_FORCE"
    | "ENABLE_HSTS_POLICY"
    | "DNS_VERIFICATION_CHECK"
    | "SSL_RENEWAL_SIMULATION"
    | "DNS_RECORD_MISMATCH";
  status: "SUCESSO" | "EM_PROGRESSO" | "ALERTA_DNS" | "FALHA_PROVEDOR";
  cnameTarget?: string;
  ipTarget?: string;
  dnsResponseTimeMs?: number;
  sslIssuer?: string;
  sslExpiresAt?: string;
  ipAddress: string;
  userAgent: string;
  technicalDetails: string;
}

export interface MCPProposedAction {
  id: string;
  action?: string;
  actionType?: string;
  toolName?: string;
  intent?: string;
  description?: string;
  title?: string;
  riskLevel: "BAIXO" | "MEDIO" | "ALTO" | "CRITICO";
  requiresConfirmation: boolean;
  permissionRequired?: string;
  parameters?: Record<string, any>;
  params?: Record<string, any>;
  payload?: Record<string, any>;
  status?: "PENDENTE_APROVACAO" | "APROVADO_EXECUTADO" | "REJEITADO";
  message?: string;
}

export type MCPActionProposal = MCPProposedAction;

export type WebhookEventTopic =
  | "order.placed"
  | "order.paid"
  | "order.cancelled"
  | "consignment.issued"
  | "consignment.settled"
  | "consignment.item_sold"
  | "warranty.generated"
  | "customer.registered";

export interface WebhookEndpointConfig {
  id: string;
  name: string;
  url: string;
  status: "ACTIVE" | "INACTIVE" | "ERROR";
  secret: string;
  events: WebhookEventTopic[];
  contentType: "application/json";
  retryPolicy: "EXPONENTIAL_BACKOFF" | "IMMEDIATE_3X";
  customHeaders?: Record<string, string>;
  createdAt: string;
  lastDeliveredAt?: string;
  lastDeliveryStatus?: "SUCCESS" | "FAILURE" | "PENDING";
  successRate: number;
  deliveryCount: number;
  description?: string;
}

export interface WebhookDeliveryLog {
  id: string;
  endpointId: string;
  endpointName: string;
  endpointUrl: string;
  event: WebhookEventTopic;
  timestamp: string;
  httpStatus: number;
  status: "DELIVERED" | "FAILED" | "PENDING";
  durationMs: number;
  requestHeaders: Record<string, string>;
  requestPayload: Record<string, any>;
  responseHeaders?: Record<string, string>;
  responseBody?: string;
  attempt: number;
  signatureHeader: string;
}
