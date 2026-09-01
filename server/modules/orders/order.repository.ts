import { dbStore } from "../../db/store";
import { TransactionContext } from "../../db/transaction";
import {
  OrderEntity,
  OrderItemEntity,
  OrderPaymentEntity,
  OrderStateTransitionEntity,
  OrderFilterQuery,
} from "./order.types";

export class OrderRepository {
  /**
   * List orders filtered by organization and multi-criteria
   */
  static list(organizationId: string, filter: OrderFilterQuery = {}): OrderEntity[] {
    let allOrders = Array.from(dbStore.orders.values()).filter(
      (o) => o.organizationId === organizationId
    );

    if (filter.status) {
      allOrders = allOrders.filter((o) => o.status === filter.status);
    }
    if (filter.channel) {
      allOrders = allOrders.filter((o) => o.channel === filter.channel);
    }
    if (filter.customerId) {
      allOrders = allOrders.filter((o) => o.customerId === filter.customerId);
    }
    if (filter.resellerId) {
      allOrders = allOrders.filter((o) => o.resellerId === filter.resellerId);
    }
    if (filter.minAmount !== undefined) {
      allOrders = allOrders.filter((o) => o.totalAmount >= filter.minAmount!);
    }
    if (filter.maxAmount !== undefined) {
      allOrders = allOrders.filter((o) => o.totalAmount <= filter.maxAmount!);
    }
    if (filter.startDate) {
      allOrders = allOrders.filter((o) => o.createdAt >= filter.startDate!);
    }
    if (filter.endDate) {
      allOrders = allOrders.filter((o) => o.createdAt <= filter.endDate!);
    }
    if (filter.search) {
      const q = filter.search.toLowerCase().trim();
      allOrders = allOrders.filter((o) => {
        const orderNum = (o.orderNumber || "").toLowerCase();
        const custName = (o.customerSnapshot?.name || "").toLowerCase();
        const custDoc = (o.customerSnapshot?.document || "").toLowerCase();
        const custEmail = (o.customerSnapshot?.email || "").toLowerCase();
        const reseller = (o.resellerName || "").toLowerCase();
        const warranty = (o.warrantyCode || "").toLowerCase();
        return (
          orderNum.includes(q) ||
          custName.includes(q) ||
          custDoc.includes(q) ||
          custEmail.includes(q) ||
          reseller.includes(q) ||
          warranty.includes(q)
        );
      });
    }

    allOrders.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return allOrders;
  }

  /**
   * Find order by ID (checks current transaction context first if present)
   */
  static findById(organizationId: string, orderId: string, tx?: TransactionContext): OrderEntity | null {
    if (tx && tx.stagedOrders.has(orderId)) {
      return tx.stagedOrders.get(orderId);
    }
    const order = dbStore.orders.get(orderId);
    if (!order || order.organizationId !== organizationId) {
      return null;
    }
    return order;
  }

  /**
   * Find order by Idempotency Key
   */
  static findByIdempotencyKey(organizationId: string, key: string, tx?: TransactionContext): OrderEntity | null {
    if (!key) return null;
    if (tx) {
      for (const ord of tx.stagedOrders.values()) {
        if (ord.organizationId === organizationId && ord.idempotencyKey === key) {
          return ord;
        }
      }
    }
    const order = Array.from(dbStore.orders.values()).find(
      (o) => o.organizationId === organizationId && o.idempotencyKey === key
    );
    return order || null;
  }

  /**
   * Save or update an order (supports transactional unit-of-work staging)
   */
  static saveOrder(order: OrderEntity, tx?: TransactionContext): void {
    if (tx) {
      if (!tx.originalOrders.has(order.id) && dbStore.orders.has(order.id)) {
        tx.originalOrders.set(order.id, JSON.parse(JSON.stringify(dbStore.orders.get(order.id))));
      }
      tx.stagedOrders.set(order.id, order);
    } else {
      dbStore.orders.set(order.id, order);
    }
  }

  /**
   * Save order items (supports transactional unit-of-work staging)
   */
  static saveOrderItems(items: OrderItemEntity[], tx?: TransactionContext): void {
    if (tx) {
      for (const item of items) {
        tx.stagedOrderItems.set(item.id, item);
      }
    } else {
      for (const item of items) {
        dbStore.orderItems.set(item.id, item);
      }
    }
  }

  /**
   * Get items for an order
   */
  static getItemsByOrderId(organizationId: string, orderId: string, tx?: TransactionContext): OrderItemEntity[] {
    const list: OrderItemEntity[] = [];
    if (tx) {
      for (const item of tx.stagedOrderItems.values()) {
        if (item.organizationId === organizationId && item.orderId === orderId) {
          list.push(item);
        }
      }
    }
    const dbList = Array.from(dbStore.orderItems.values()).filter(
      (item) => item.organizationId === organizationId && item.orderId === orderId && !list.some((l) => l.id === item.id)
    );
    return [...list, ...dbList];
  }

  /**
   * Save an order payment
   */
  static savePayment(payment: OrderPaymentEntity, tx?: TransactionContext): void {
    if (tx) {
      tx.stagedOrderPayments.set(payment.id, payment);
    } else {
      dbStore.orderPayments.set(payment.id, payment);
    }
  }

  /**
   * Get payments for an order
   */
  static getPaymentsByOrderId(organizationId: string, orderId: string, tx?: TransactionContext): OrderPaymentEntity[] {
    const list: OrderPaymentEntity[] = [];
    if (tx) {
      for (const p of tx.stagedOrderPayments.values()) {
        if (p.organizationId === organizationId && p.orderId === orderId) {
          list.push(p);
        }
      }
    }
    const dbList = Array.from(dbStore.orderPayments.values()).filter(
      (pay) => pay.organizationId === organizationId && pay.orderId === orderId && !list.some((l) => l.id === pay.id)
    );
    return [...list, ...dbList];
  }

  /**
   * Save an order state transition audit record
   */
  static saveTransition(transition: OrderStateTransitionEntity, tx?: TransactionContext): void {
    if (tx) {
      tx.stagedOrderTransitions.set(transition.id, transition);
    } else {
      dbStore.orderStateTransitions.set(transition.id, transition);
    }
  }

  /**
   * Get all state transitions for an order
   */
  static getTransitionsByOrderId(organizationId: string, orderId: string, tx?: TransactionContext): OrderStateTransitionEntity[] {
    const list: OrderStateTransitionEntity[] = [];
    if (tx) {
      for (const t of tx.stagedOrderTransitions.values()) {
        if (t.organizationId === organizationId && t.orderId === orderId) {
          list.push(t);
        }
      }
    }
    const dbList = Array.from(dbStore.orderStateTransitions.values()).filter(
      (trans) => trans.organizationId === organizationId && trans.orderId === orderId && !list.some((l) => l.id === trans.id)
    );
    const combined = [...list, ...dbList];
    combined.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    return combined;
  }
}
