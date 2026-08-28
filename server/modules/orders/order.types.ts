/**
 * Domain types and interfaces for SPRINT 4 — ORDERS & SALES ENGINE
 * Omnichannel Sales Engine, Immutable Product Snapshots on Order Items,
 * Multi-Payment methods, Finite State Machine (FSM) Transition Auditing,
 * and Concurrency-Safe Inventory Ledger Integration.
 */

import { ProductCategory, ProductBath } from "../products/product.types";

export type OrderChannel =
  | "ECOMMERCE"
  | "PRESENTIAL_POS"
  | "WHATSAPP"
  | "B2B_RESELLER"
  | "CONSIGNMENT"
  | "CUSTOM_STUDIO"
  | "MARKETPLACE";

export type OrderStatus =
  | "DRAFT"                 // Rascunho / Carrinho em montagem
  | "PENDING_CONFIRMATION" // Aguardando confirmação do comprador/atendente
  | "INVENTORY_RESERVED"   // Estoque reservado sob row-lock pessimista com TTL
  | "AWAITING_PAYMENT"     // Cobrança gerada (PIX/Cartão/Boleto) aguardando liquidação
  | "PAYMENT_PROCESSING"   // Processamento em gateway / autorização bancária
  | "PAID"                 // Pagamento liquidado & Baixa definitiva no Ledger de Estoque
  | "FULFILLMENT_PENDING"  // Em separação / Cravação de joia / Embalagem / Expedição
  | "FULFILLED"            // Entregue / Retirado no balcão / Concluído com Garantia Digital
  | "CANCELED"             // Cancelado (reserva de estoque liberada atomicamente)
  | "EXPIRED"              // TTL de reserva de estoque expirado
  | "REFUNDED";            // Estornado pós-pagamento (devolução ao estoque via Ledger)

export type OrderEvent =
  | "SUBMIT_ORDER"          // DRAFT -> PENDING_CONFIRMATION / INVENTORY_RESERVED
  | "RESERVE_INVENTORY"     // DRAFT/PENDING -> INVENTORY_RESERVED
  | "REQUEST_PAYMENT"       // INVENTORY_RESERVED -> AWAITING_PAYMENT
  | "PROCESS_PAYMENT"       // AWAITING_PAYMENT -> PAYMENT_PROCESSING
  | "CONFIRM_PAYMENT"       // AWAITING_PAYMENT / PAYMENT_PROCESSING -> PAID
  | "START_FULFILLMENT"     // PAID -> FULFILLMENT_PENDING
  | "COMPLETE_FULFILLMENT"  // FULFILLMENT_PENDING -> FULFILLED
  | "CANCEL_ORDER"          // (ANY NÃO-FINAL) -> CANCELED
  | "EXPIRE_ORDER"          // (INVENTORY_RESERVED / AWAITING_PAYMENT) -> EXPIRED
  | "REFUND_ORDER"          // (PAID / FULFILLED) -> REFUNDED
  | "REOPEN_DRAFT";         // CANCELED / EXPIRED -> DRAFT

export type PaymentMethod =
  | "PIX"
  | "CREDIT_CARD"
  | "DEBIT_CARD"
  | "BOLETO"
  | "CASH"
  | "STORE_CREDIT";

export type PaymentGateway =
  | "MANUAL"
  | "MERCADOPAGO"
  | "ASAAS"
  | "STRIPE"
  | "PAGSEGURO"
  | "POS_REDE"
  | "POS_CIELO";

export type PaymentStatus =
  | "PENDING"
  | "AUTHORIZED"
  | "PAID"
  | "FAILED"
  | "REFUNDED";

/**
 * Immutable Snapshot of the Product at the exact moment the order was placed.
 * Guarantees total historical integrity even if the catalog item is renamed,
 * re-priced, or deleted later.
 */
export interface ProductSnapshot {
  productId: string;
  sku: string;
  name: string;
  category: ProductCategory;
  collection?: string;
  material: string;
  bath: ProductBath;
  stones: string[];
  price: number;
  costPrice: number;
  promoPrice?: number;
  warrantyMonths: number;
  isCustomizable: boolean;
  imageUrl: string;
  description?: string;
  snapshotTimestamp: string;
}

export interface CustomJewelryOrderSpec {
  engravingName: string;
  fontStyle: "CURSIVA" | "CLASSICA" | "MINIMALISTA" | "MODERNA";
  gemStone: "ZIRCONIA_CRISTAL" | "ESMERALDA_FUSION" | "RUBI_SYNTH" | "TURMALINA_PARAIBA";
  bathFinish: ProductBath;
  chainLengthCm: 40 | 45 | 50 | 60;
  giftBox: boolean;
  specialNotes?: string;
}

export interface OrderItemEntity {
  id: string;
  organizationId: string;
  orderId: string;
  productId: string;
  locationId: string; // Origem física do estoque (ex: Matriz, Depósito, Maleta)
  
  // Snapshot imutável
  productSnapshot: ProductSnapshot;

  quantity: number;
  unitPrice: number;
  costPriceSnapshot: number;
  discountAmount: number;
  totalAmount: number;

  customizationSpec?: CustomJewelryOrderSpec;
  createdAt: string;
}

export interface OrderShippingAddress {
  recipientName: string;
  zipCode: string;
  street: string;
  number: string;
  complement?: string;
  neighborhood: string;
  city: string;
  state: string;
  country: string;
  phone?: string;
  referencePoint?: string;
}

export interface OrderCustomerSnapshot {
  id: string;
  personType: "PF" | "PJ";
  name: string; // fullName ou tradeName
  document: string; // CPF ou CNPJ
  email: string;
  phone: string;
  stateRegistration?: string;
}

export interface OrderPaymentEntity {
  id: string;
  organizationId: string;
  orderId: string;
  paymentMethod: PaymentMethod;
  gateway: PaymentGateway;
  gatewayTransactionId?: string;
  status: PaymentStatus;
  amount: number;
  installments: number;

  // Detalhes de Cobrança Instantânea (PIX / Boleto)
  pixQrCode?: string;
  pixQrCodeUrl?: string;
  pixCopyPaste?: string;
  pixExpiration?: string;
  boletoBarcode?: string;
  boletoUrl?: string;

  paidAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface OrderStateTransitionEntity {
  id: string;
  organizationId: string;
  orderId: string;
  fromStatus: OrderStatus;
  toStatus: OrderStatus;
  event: OrderEvent;
  operatorId?: string;
  operatorName?: string;
  reason?: string;
  metadata?: Record<string, any>;
  createdAt: string;
}

export interface OrderEntity {
  id: string;
  organizationId: string;
  orderNumber: string; // Ex: ORD-2026-0001
  customerId: string;
  customerSnapshot: OrderCustomerSnapshot;

  channel: OrderChannel;
  status: OrderStatus;

  shippingAddress: OrderShippingAddress;

  currency: string; // Default: 'BRL'
  subtotalAmount: number;
  discountAmount: number;
  shippingAmount: number;
  totalAmount: number;

  // Vínculos Comerciais / Revendedora (Consignado/Comissão)
  resellerId?: string;
  resellerName?: string;
  resellerCommissionRate?: number;
  resellerCommissionAmount?: number;

  // Garantia Digital & Rastreabilidade
  warrantyCode?: string;

  // Idempotência e Auditoria
  idempotencyKey?: string;
  createdBy?: string;
  operatorName?: string;
  ipAddress?: string;
  userAgent?: string;
  notes?: string;

  // Relacionamentos Hydrated
  items?: OrderItemEntity[];
  payments?: OrderPaymentEntity[];
  transitions?: OrderStateTransitionEntity[];

  createdAt: string;
  updatedAt: string;
}

// --- DTOs ---

export interface CreateOrderItemDTO {
  productId: string;
  locationId?: string; // Se omitido, usa a localização padrão da organização
  quantity: number;
  unitPrice?: number; // Se omitido, pega o preço do catálogo vigente
  discountAmount?: number;
  customizationSpec?: CustomJewelryOrderSpec;
}

export interface CreateOrderPaymentDTO {
  paymentMethod: PaymentMethod;
  gateway?: PaymentGateway;
  amount: number;
  installments?: number;
  pixQrCode?: string;
  pixCopyPaste?: string;
}

export interface CreateOrderDTO {
  customerId: string;
  channel: OrderChannel;
  items: CreateOrderItemDTO[];
  shippingAddress?: Partial<OrderShippingAddress>;
  shippingAmount?: number;
  discountAmount?: number;
  payments?: CreateOrderPaymentDTO[];
  resellerId?: string;
  resellerCommissionRate?: number;
  notes?: string;
  createdBy?: string;
  operatorName?: string;
  idempotencyKey?: string;
  initialStatus?: OrderStatus; // Default: 'DRAFT' ou 'AWAITING_PAYMENT'
}

export interface OrderTransitionDTO {
  event: OrderEvent;
  operatorName?: string;
  operatorId?: string;
  reason?: string;
  metadata?: Record<string, any>;
}

export interface OrderFilterQuery {
  channel?: OrderChannel;
  status?: OrderStatus;
  customerId?: string;
  resellerId?: string;
  search?: string; // orderNumber, customer name, doc
  startDate?: string;
  endDate?: string;
  minAmount?: number;
  maxAmount?: number;
  limit?: number;
  offset?: number;
}
