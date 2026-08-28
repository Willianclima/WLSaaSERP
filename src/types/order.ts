/**
 * Client-Side Domain types for SPRINT 4 — ORDERS & SALES ENGINE
 */
import { PersonType } from "./customer";

export type OrderChannel =
  | "ECOMMERCE"
  | "PRESENTIAL_POS"
  | "WHATSAPP"
  | "B2B_RESELLER"
  | "CONSIGNMENT"
  | "CUSTOM_STUDIO"
  | "MARKETPLACE";

export type OrderStatus =
  | "DRAFT"
  | "PENDING_CONFIRMATION"
  | "INVENTORY_RESERVED"
  | "AWAITING_PAYMENT"
  | "PAYMENT_PROCESSING"
  | "PAID"
  | "FULFILLMENT_PENDING"
  | "FULFILLED"
  | "CANCELED"
  | "EXPIRED"
  | "REFUNDED";

export type OrderEvent =
  | "SUBMIT_ORDER"
  | "RESERVE_INVENTORY"
  | "REQUEST_PAYMENT"
  | "PROCESS_PAYMENT"
  | "CONFIRM_PAYMENT"
  | "START_FULFILLMENT"
  | "COMPLETE_FULFILLMENT"
  | "CANCEL_ORDER"
  | "EXPIRE_ORDER"
  | "REFUND_ORDER"
  | "REOPEN_DRAFT";

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

export interface ProductSnapshot {
  productId: string;
  sku: string;
  name: string;
  category: string;
  collection?: string;
  material: string;
  bath: string;
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
  bathFinish: string;
  chainLengthCm: 40 | 45 | 50 | 60;
  giftBox: boolean;
  specialNotes?: string;
}

export interface OrderItem {
  id: string;
  organizationId: string;
  orderId: string;
  productId: string;
  locationId: string;
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
  personType: PersonType;
  name: string;
  document: string;
  email: string;
  phone: string;
  stateRegistration?: string;
}

export interface OrderPayment {
  id: string;
  organizationId: string;
  orderId: string;
  paymentMethod: PaymentMethod;
  gateway: PaymentGateway;
  gatewayTransactionId?: string;
  status: PaymentStatus;
  amount: number;
  installments: number;
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

export interface OrderStateTransition {
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

export interface Order {
  id: string;
  organizationId: string;
  orderNumber: string;
  customerId: string;
  customerSnapshot: OrderCustomerSnapshot;
  channel: OrderChannel;
  status: OrderStatus;
  shippingAddress: OrderShippingAddress;
  currency: string;
  subtotalAmount: number;
  discountAmount: number;
  shippingAmount: number;
  totalAmount: number;
  resellerId?: string;
  resellerName?: string;
  resellerCommissionRate?: number;
  resellerCommissionAmount?: number;
  warrantyCode?: string;
  idempotencyKey?: string;
  createdBy?: string;
  operatorName?: string;
  ipAddress?: string;
  userAgent?: string;
  notes?: string;
  items?: OrderItem[];
  payments?: OrderPayment[];
  transitions?: OrderStateTransition[];
  createdAt: string;
  updatedAt: string;
}

// Legacy alias to ensure zero breakages across older views
export type UnifiedOrder = Order;

export interface CreateOrderItemDTO {
  productId: string;
  locationId?: string;
  quantity: number;
  unitPrice?: number;
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
  initialStatus?: OrderStatus;
}

export interface OrderTransitionDTO {
  event: OrderEvent;
  operatorId?: string;
  operatorName?: string;
  reason?: string;
  metadata?: Record<string, any>;
}

