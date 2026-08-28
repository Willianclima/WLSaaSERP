export type InventoryMovementType =
  | "PURCHASE"             // Entrada Fornecedor / Fabricação (+ físico)
  | "SALE"                 // Venda Direta / PDV / E-commerce (- físico)
  | "RETURN"               // Devolução de Cliente (+ físico)
  | "CONSIGNMENT_OUT"      // Envio para Maleta de Revendedora (- físico, + consignado)
  | "CONSIGNMENT_RETURN"   // Retorno/Devolução de Maleta (+ físico, - consignado)
  | "CONSIGNMENT_SALE"     // Venda Efetivada pela Revendedora (- consignado)
  | "ADJUSTMENT"           // Ajuste de Inventário / Quebra / Aferição (+ ou - físico)
  | "TRANSFER"             // Transferência entre depósitos/localizações
  | "RESERVATION_HOLD"     // Reserva temporária de estoque para checkout/pedido (+ reserved)
  | "RESERVATION_RELEASE"  // Liberação de reserva por expiração ou cancelamento (- reserved)
  | "REVERSAL";            // Reversão/Estorno imutável de movimentação anterior

export type InventoryReferenceType =
  | "ORDER"
  | "CONSIGNMENT"
  | "SUPPLIER_INVOICE"
  | "MANUAL_ADJUSTMENT"
  | "INITIAL_STOCK"
  | "CHECKOUT_RESERVATION"
  | "CHECKOUT_CART"
  | "TRANSFER"
  | "PAYMENT"
  | "REVERSAL_OPERATION";

export type InventoryLocationType =
  | "HEADQUARTERS"        // Matriz / Showroom Central
  | "PHYSICAL_STORE"      // Loja Física / Filial
  | "WAREHOUSE"           // Depósito / Estoque Central
  | "RESELLER_BAG"        // Maleta de Revendedora Consignada
  | "EVENT_STAND";        // Stand / Showroom Temporário

export interface InventoryLocationEntity {
  id: string;
  organizationId: string;
  name: string;
  type: InventoryLocationType;
  code: string;
  description?: string;
  isActive: boolean;
  createdAt: string;
}

export interface InventoryBalanceEntity {
  id: string;
  organizationId: string;
  productId: string;
  locationId: string;
  onHandQuantity: number;       // Saldo físico real na prateleira/gaveta (CHECK >= 0)
  reservedQuantity: number;     // Saldo comprometido/reservado em pedidos abertos (CHECK >= 0, CHECK <= on_hand)
  availableQuantity: number;    // Saldo disponível para novas vendas/maletas = onHand - reserved (CHECK >= 0)
  createdAt: string;
  updatedAt: string;
}

export interface InventoryMovementEntity {
  id: string;
  organizationId: string;
  productId: string;
  locationId?: string;          // Origin or Target Location
  type: InventoryMovementType;
  quantityChange: number;
  physicalBalanceAfter: number;
  consignedBalanceAfter: number;
  onHandAfter?: number;
  reservedAfter?: number;
  availableAfter?: number;
  referenceType?: InventoryReferenceType;
  referenceId?: string;
  reversalOfMovementId?: string; // Reference to original movement if this is a reversal
  operatorName: string;
  notes?: string;
  createdAt: string;
}

export interface LocationBalanceDetail {
  locationId: string;
  locationName: string;
  locationType: InventoryLocationType;
  locationCode: string;
  onHandQuantity: number;
  reservedQuantity: number;
  availableQuantity: number;
}

export interface InventoryStockSummary {
  productId: string;
  // Multi-Location Aggregate Totals:
  onHandTotal: number;        // Total físico em posse da empresa e revendedoras
  reservedTotal: number;      // Total atualmente reservado / bloqueado
  availableTotal: number;     // Total livre para venda imediata (onHandTotal - reservedTotal)
  // Legacy / Domain breakdown:
  stockPhysical: number;      // Saldo Físico em Lojas e Depósitos Próprios
  stockConsigned: number;     // Saldo em Maletas de Revendedoras (type === 'RESELLER_BAG')
  stockAvailable: number;     // Disponível para faturamento
  totalStock: number;         // Saldo Global
  locations: LocationBalanceDetail[];
}

export interface CreateMovementDTO {
  productId: string;
  locationId?: string;
  type: InventoryMovementType;
  quantityChange: number; // positive or negative
  referenceType?: InventoryReferenceType;
  referenceId?: string;
  reversalOfMovementId?: string;
  operatorName?: string;
  notes?: string;
}

export interface ReserveStockDTO {
  productId: string;
  locationId: string;
  quantity: number;
  orderId?: string;
  notes?: string;
  operatorName?: string;
}

export interface ReleaseReservationDTO {
  productId: string;
  locationId: string;
  quantity: number;
  orderId?: string;
  reason?: string;
  operatorName?: string;
}

export interface CommitReservationDTO {
  productId: string;
  locationId: string;
  quantity: number;
  orderId?: string;
  operatorName?: string;
  notes?: string;
}

export interface CreateLocationDTO {
  name: string;
  type: InventoryLocationType;
  code: string;
  description?: string;
}

export interface ReverseMovementDTO {
  originalMovementId: string;
  reason: string;
  operatorName?: string;
}

/**
 * RESERVATION LIFECYCLE TYPES (Sprint 3 Readiness)
 */
export type InventoryReservationStatus =
  | "ACTIVE"
  | "CONFIRMED"
  | "RELEASED"
  | "EXPIRED"
  | "CANCELED";

export interface InventoryReservationEntity {
  id: string;
  organizationId: string;
  productId: string;
  locationId: string;
  quantity: number;
  status: InventoryReservationStatus;
  referenceType: InventoryReferenceType;
  referenceId: string;
  idempotencyKey?: string;
  expiresAt: string; // ISO String for automatic expiration
  confirmedAt?: string;
  releasedAt?: string;
  operatorName?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateReservationDTO {
  productId: string;
  locationId: string;
  quantity: number;
  referenceType: InventoryReferenceType;
  referenceId: string;
  idempotencyKey?: string;
  ttlMinutes?: number; // Time-to-live for expiration (default: 15 min for checkout)
  operatorName?: string;
  notes?: string;
}

/**
 * ARCHITECTURAL CONCURRENCY POLICY TYPES
 */
export type ConcurrencyStrategy = "PESSIMISTIC_LOCK_FOR_UPDATE" | "ATOMIC_CONDITIONAL_UPDATE";

export type StockErrorCode =
  | "STOCK_UNAVAILABLE"
  | "LOCK_TIMEOUT"
  | "DEADLOCK_RETRY_EXHAUSTED"
  | "INTEGRITY_CONSTRAINT_VIOLATION"
  | "RESERVATION_NOT_FOUND"
  | "RESERVATION_ALREADY_RESOLVED";

export interface CompositeOrderItem {
  productId: string;
  quantity: number;
  unitPrice?: number;
}

export interface CompositeOrderParams {
  orderId: string;
  locationId: string;
  items: CompositeOrderItem[];
  operatorName?: string;
  notes?: string;
  userId?: string;
  idempotencyKey?: string;
}

export interface CompositeConsignmentParams {
  consignmentId: string;
  resellerId: string;
  sourceLocationId: string;
  bagLocationId: string;
  items: Array<{ productId: string; quantity: number }>;
  operatorName?: string;
  notes?: string;
  idempotencyKey?: string;
}

export interface CompositeTransferParams {
  transferId: string;
  sourceLocationId: string;
  targetLocationId: string;
  items: Array<{ productId: string; quantity: number }>;
  operatorName?: string;
  notes?: string;
  idempotencyKey?: string;
}

export interface CompositeCancellationParams {
  referenceType: "ORDER" | "CONSIGNMENT" | "TRANSFER" | "RESERVATION";
  referenceId: string;
  locationId: string;
  items: Array<{ productId: string; quantity: number }>;
  reason: string;
  operatorName?: string;
  userId?: string;
}

export interface CompositePaymentConfirmationParams {
  orderId: string;
  locationId: string;
  paymentId: string;
  items: Array<{ productId: string; quantity: number }>;
  operatorName?: string;
  userId?: string;
}

export interface AtomicOnHandChangeParams {
  organizationId: string;
  productId: string;
  locationId: string;
  quantityDelta: number; // positive (inflow) or negative (outflow)
  movementType: InventoryMovementType;
  referenceType: InventoryReferenceType;
  referenceId: string;
  reason: string;
  operatorName?: string;
  userId?: string;
}

export interface AtomicUpdateResult {
  success: boolean;
  affectedRows: number;
  productId: string;
  locationId: string;
  quantityRequested: number;
  balance?: InventoryBalanceEntity;
  movement?: InventoryMovementEntity;
  errorCode?: StockErrorCode;
  errorMessage?: string;
}

