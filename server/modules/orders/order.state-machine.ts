import { OrderStatus, OrderEvent, OrderEntity, OrderItemEntity } from "./order.types";
import { inventoryRepo } from "../inventory/inventory.repository";
import { TransactionContext } from "../../db/transaction";

export interface StateTransitionResult {
  fromStatus: OrderStatus;
  toStatus: OrderStatus;
  event: OrderEvent;
  isAllowed: boolean;
  errorMessage?: string;
}

export interface InventoryValidationResult {
  isValid: boolean;
  errors: string[];
}

/**
 * Transition Matrix mapping: (CurrentStatus -> Allowed Events -> TargetStatus)
 * 
 * Formal Core Pipeline:
 * DRAFT -> INVENTORY_RESERVED -> AWAITING_PAYMENT -> PAYMENT_PROCESSING -> PAID -> FULFILLMENT_PENDING -> FULFILLED
 * 
 * Ancillary branches:
 * - Cancellations & Expirations (Releases active inventory reservations)
 * - Returns (Physical return of goods with RETURN movement type)
 * - Refunds (Financial settlement)
 */
export const ORDER_TRANSITION_MATRIX: Record<OrderStatus, Partial<Record<OrderEvent, OrderStatus>>> = {
  DRAFT: {
    SUBMIT_ORDER: "INVENTORY_RESERVED",
    RESERVE_INVENTORY: "INVENTORY_RESERVED",
    REQUEST_PAYMENT: "AWAITING_PAYMENT",
    CANCEL_ORDER: "CANCELED",
  },
  PENDING_CONFIRMATION: {
    SUBMIT_ORDER: "INVENTORY_RESERVED",
    RESERVE_INVENTORY: "INVENTORY_RESERVED",
    REQUEST_PAYMENT: "AWAITING_PAYMENT",
    CANCEL_ORDER: "CANCELED",
  },
  INVENTORY_RESERVED: {
    REQUEST_PAYMENT: "AWAITING_PAYMENT",
    PROCESS_PAYMENT: "PAYMENT_PROCESSING",
    CONFIRM_PAYMENT: "PAID",
    CANCEL_ORDER: "CANCELED",
    EXPIRE_ORDER: "EXPIRED",
  },
  AWAITING_PAYMENT: {
    PROCESS_PAYMENT: "PAYMENT_PROCESSING",
    CONFIRM_PAYMENT: "PAID",
    CANCEL_ORDER: "CANCELED",
    EXPIRE_ORDER: "EXPIRED",
  },
  PAYMENT_PROCESSING: {
    CONFIRM_PAYMENT: "PAID",
    CANCEL_ORDER: "CANCELED",
    REQUEST_PAYMENT: "AWAITING_PAYMENT", // Retorno em caso de recusa de cartão/tentativa de outro meio
    EXPIRE_ORDER: "EXPIRED",
  },
  PAID: {
    START_FULFILLMENT: "FULFILLMENT_PENDING",
    COMPLETE_FULFILLMENT: "FULFILLED",
    RETURN_ITEMS_PARTIAL: "PARTIALLY_RETURNED",
    RETURN_ITEMS_TOTAL: "RETURNED",
    REFUND_ORDER: "REFUNDED",
  },
  FULFILLMENT_PENDING: {
    COMPLETE_FULFILLMENT: "FULFILLED",
    RETURN_ITEMS_PARTIAL: "PARTIALLY_RETURNED",
    RETURN_ITEMS_TOTAL: "RETURNED",
    REFUND_ORDER: "REFUNDED",
  },
  FULFILLED: {
    RETURN_ITEMS_PARTIAL: "PARTIALLY_RETURNED",
    RETURN_ITEMS_TOTAL: "RETURNED",
    REFUND_ORDER: "REFUNDED",
  },
  PARTIALLY_RETURNED: {
    RETURN_ITEMS_PARTIAL: "PARTIALLY_RETURNED", // Devolução de itens remanescentes adicionais
    RETURN_ITEMS_TOTAL: "RETURNED",
    REFUND_ORDER: "REFUNDED",
  },
  RETURNED: {
    REFUND_ORDER: "REFUNDED",
  },
  CANCELED: {
    REOPEN_DRAFT: "DRAFT",
  },
  EXPIRED: {
    REOPEN_DRAFT: "DRAFT",
  },
  REFUNDED: {},
};

/**
 * Formal Finite State Machine (FSM) validator for Omnichannel Orders
 */
export class OrderStateMachine {
  /**
   * Validates if an event transition is permitted from currentStatus and returns the target state
   */
  static getNextState(currentStatus: OrderStatus, event: OrderEvent): StateTransitionResult {
    const allowedTransitions = ORDER_TRANSITION_MATRIX[currentStatus] || {};
    const nextStatus = allowedTransitions[event];

    if (!nextStatus) {
      return {
        fromStatus: currentStatus,
        toStatus: currentStatus,
        event,
        isAllowed: false,
        errorMessage: `Transição inválida: Não é permitido executar o evento '${event}' a partir do estado '${currentStatus}'.`,
      };
    }

    return {
      fromStatus: currentStatus,
      toStatus: nextStatus,
      event,
      isAllowed: true,
    };
  }

  /**
   * Checks if a transition between two statuses is directly permitted
   */
  static canTransitionStatus(fromStatus: OrderStatus, toStatus: OrderStatus): boolean {
    const allowedTransitions = ORDER_TRANSITION_MATRIX[fromStatus] || {};
    return Object.values(allowedTransitions).includes(toStatus);
  }

  /**
   * Validates business rules against Inventory State for a proposed state transition
   * 
   * Rules:
   * 1. RESERVE_INVENTORY / SUBMIT_ORDER: Verifies that (onHand - reserved) >= quantity for each item in its location.
   * 2. CONFIRM_PAYMENT: Verifies that stock is either already reserved for this order or physical onHand is available.
   * 3. CANCEL_ORDER / EXPIRE_ORDER: Identifies reservations that must be released back to available balance.
   */
  static async validateInventoryRules(
    organizationId: string,
    order: OrderEntity,
    items: OrderItemEntity[],
    event: OrderEvent,
    tx?: TransactionContext
  ): Promise<InventoryValidationResult> {
    const errors: string[] = [];

    // Check 1: Reserving Stock (Requires available = onHand - reserved >= required)
    if (event === "RESERVE_INVENTORY" || event === "SUBMIT_ORDER") {
      for (const item of items) {
        const bal = await inventoryRepo.getBalance(organizationId, item.productId, item.locationId, tx);
        const available = bal ? bal.onHandQuantity - bal.reservedQuantity : 0;
        if (available < item.quantity) {
          errors.push(
            `Estoque insuficiente para reservar o produto ${item.productSnapshot?.name || item.productId} na localização ${item.locationId}. Solicitado: ${item.quantity} un, Disponível para reserva: ${available} un (Físico: ${bal ? bal.onHandQuantity : 0}, Reservado: ${bal ? bal.reservedQuantity : 0}).`
          );
        }
      }
    }

    // Check 2: Confirming Payment / Permanent Deduction
    if (event === "CONFIRM_PAYMENT") {
      const isAlreadyReserved = this.hasActiveInventoryReservation(order.status);
      if (!isAlreadyReserved) {
        for (const item of items) {
          const bal = await inventoryRepo.getBalance(organizationId, item.productId, item.locationId, tx);
          if (!bal || bal.onHandQuantity < item.quantity) {
            errors.push(
              `Estoque físico insuficiente para faturar ${item.productSnapshot?.name || item.productId}. Físico: ${bal ? bal.onHandQuantity : 0} un, Necessário: ${item.quantity} un.`
            );
          }
        }
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Returns list of allowed events from current state
   */
  static getAllowedEvents(currentStatus: OrderStatus): OrderEvent[] {
    const allowed = ORDER_TRANSITION_MATRIX[currentStatus] || {};
    return Object.keys(allowed) as OrderEvent[];
  }

  /**
   * Checks if an order state is considered final/terminal (immutable)
   */
  static isFinalState(status: OrderStatus): boolean {
    return status === "REFUNDED" || status === "RETURNED" || status === "CANCELED" || status === "EXPIRED";
  }

  /**
   * Checks if an order in the given status has active reserved physical inventory
   */
  static hasActiveInventoryReservation(status: OrderStatus): boolean {
    return status === "INVENTORY_RESERVED" || status === "AWAITING_PAYMENT" || status === "PAYMENT_PROCESSING";
  }

  /**
   * Checks if an order in the given status has permanently deducted stock (sale closed/committed)
   */
  static hasPermanentlyDeductedStock(status: OrderStatus): boolean {
    return status === "PAID" || status === "FULFILLMENT_PENDING" || status === "FULFILLED" || status === "PARTIALLY_RETURNED";
  }

  /**
   * Determines if transitioning from fromStatus with event requires creating an inventory reservation
   */
  static requiresStockReservation(fromStatus: OrderStatus, event: OrderEvent): boolean {
    if (fromStatus === "DRAFT" || fromStatus === "PENDING_CONFIRMATION") {
      return event === "SUBMIT_ORDER" || event === "RESERVE_INVENTORY";
    }
    return false;
  }

  /**
   * Determines if transitioning with event requires releasing an active inventory reservation
   */
  static requiresStockRelease(fromStatus: OrderStatus, event: OrderEvent): boolean {
    if (this.hasActiveInventoryReservation(fromStatus)) {
      return event === "CANCEL_ORDER" || event === "EXPIRE_ORDER";
    }
    return false;
  }

  /**
   * Determines if transitioning with event requires committing the stock deduction in the ledger
   */
  static requiresStockCommit(fromStatus: OrderStatus, event: OrderEvent): boolean {
    return event === "CONFIRM_PAYMENT" && fromStatus !== "PAID";
  }
}

/**
 * ============================================================================
 * 🛠️ EXPORTED HELPER FUNCTIONS (Functional API for consumers and tests)
 * ============================================================================
 */

/**
 * Validates if a transition from current status using event is permitted
 */
export function isTransitionAllowed(currentStatus: OrderStatus, event: OrderEvent): boolean {
  return OrderStateMachine.getNextState(currentStatus, event).isAllowed;
}

/**
 * Validates if a direct transition between two statuses is possible
 */
export function canTransitionTo(fromStatus: OrderStatus, toStatus: OrderStatus): boolean {
  return OrderStateMachine.canTransitionStatus(fromStatus, toStatus);
}

/**
 * Gets the resulting status for a given current status and event
 */
export function getNextOrderStatus(currentStatus: OrderStatus, event: OrderEvent): OrderStatus | null {
  const result = OrderStateMachine.getNextState(currentStatus, event);
  return result.isAllowed ? result.toStatus : null;
}

/**
 * Gets all allowed events from a given status
 */
export function getAvailableOrderEvents(currentStatus: OrderStatus): OrderEvent[] {
  return OrderStateMachine.getAllowedEvents(currentStatus);
}

/**
 * Checks if the status holds active inventory reservations
 */
export function isInventoryReservedStatus(status: OrderStatus): boolean {
  return OrderStateMachine.hasActiveInventoryReservation(status);
}

/**
 * Checks if the status represents a terminal state
 */
export function isTerminalOrderStatus(status: OrderStatus): boolean {
  return OrderStateMachine.isFinalState(status);
}

/**
 * Asynchronously validates inventory availability for an order transition
 */
export async function validateOrderInventoryTransition(
  organizationId: string,
  order: OrderEntity,
  items: OrderItemEntity[],
  event: OrderEvent,
  tx?: TransactionContext
): Promise<InventoryValidationResult> {
  return await OrderStateMachine.validateInventoryRules(organizationId, order, items, event, tx);
}
