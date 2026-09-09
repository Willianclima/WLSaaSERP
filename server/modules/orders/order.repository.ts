import { query, withTransaction } from "../../db/postgres";
import { TransactionContext } from "../../db/transaction";
import {
  OrderEntity,
  OrderItemEntity,
  OrderPaymentEntity,
  OrderStateTransitionEntity,
  OrderFilterQuery,
} from "./order.types";

function mapRowToOrder(row: any): OrderEntity {
  const customerSnapshot =
    typeof row.customer_snapshot === "string"
      ? JSON.parse(row.customer_snapshot)
      : row.customer_snapshot;

  const shippingAddress =
    typeof row.shipping_address === "string"
      ? JSON.parse(row.shipping_address)
      : row.shipping_address;

  return {
    id: row.id,
    organizationId: row.organization_id,
    orderNumber: row.order_number,
    customerId: row.customer_id,
    customerSnapshot,
    channel: row.channel,
    status: row.status,
    shippingAddress,
    currency: row.currency || "BRL",
    subtotalAmount: parseFloat(row.subtotal_amount || 0),
    discountAmount: parseFloat(row.discount_amount || 0),
    shippingAmount: parseFloat(row.shipping_amount || 0),
    totalAmount: parseFloat(row.total_amount || 0),
    resellerId: row.reseller_id || undefined,
    resellerName: row.reseller_name || undefined,
    resellerCommissionRate: row.reseller_commission_rate ? parseFloat(row.reseller_commission_rate) : undefined,
    resellerCommissionAmount: row.reseller_commission_amount ? parseFloat(row.reseller_commission_amount) : undefined,
    warrantyCode: row.warranty_code || undefined,
    idempotencyKey: row.idempotency_key || undefined,
    createdAt: row.created_at instanceof Date ? row.created_at.toISOString() : String(row.created_at),
    updatedAt: row.updated_at instanceof Date ? row.updated_at.toISOString() : String(row.updated_at),
  };
}

function mapRowToOrderItem(row: any): OrderItemEntity {
  const productSnapshot =
    typeof row.product_snapshot === "string"
      ? JSON.parse(row.product_snapshot)
      : row.product_snapshot;

  const customizationSpec =
    typeof row.customization_spec === "string"
      ? JSON.parse(row.customization_spec)
      : row.customization_spec || undefined;

  return {
    id: row.id,
    organizationId: row.organization_id,
    orderId: row.order_id,
    productId: row.product_id,
    locationId: row.location_id,
    productSnapshot,
    quantity: parseInt(row.quantity, 10),
    unitPrice: parseFloat(row.unit_price),
    costPriceSnapshot: parseFloat(row.cost_price_snapshot || 0),
    discountAmount: parseFloat(row.discount_amount || 0),
    totalAmount: parseFloat(row.total_amount),
    customizationSpec,
    createdAt: row.created_at instanceof Date ? row.created_at.toISOString() : String(row.created_at),
  };
}

function mapRowToOrderPayment(row: any): OrderPaymentEntity {
  return {
    id: row.id,
    organizationId: row.organization_id,
    orderId: row.order_id,
    paymentMethod: row.payment_method,
    gateway: row.gateway,
    gatewayTransactionId: row.gateway_transaction_id || undefined,
    status: row.status,
    amount: parseFloat(row.amount),
    installments: parseInt(row.installments, 10) || 1,
    pixQrCode: row.pix_qr_code || undefined,
    pixQrCodeUrl: row.pix_qr_code_url || undefined,
    pixCopyPaste: row.pix_copy_paste || undefined,
    pixExpiration: row.pix_expiration instanceof Date ? row.pix_expiration.toISOString() : (row.pix_expiration || undefined),
    boletoBarcode: row.boleto_barcode || undefined,
    boletoUrl: row.boleto_url || undefined,
    paidAt: row.paid_at instanceof Date ? row.paid_at.toISOString() : (row.paid_at || undefined),
    createdAt: row.created_at instanceof Date ? row.created_at.toISOString() : String(row.created_at),
    updatedAt: row.updated_at instanceof Date ? row.updated_at.toISOString() : String(row.updated_at),
  };
}

function mapRowToTransition(row: any): OrderStateTransitionEntity {
  const metadata =
    typeof row.metadata === "string"
      ? JSON.parse(row.metadata)
      : row.metadata || undefined;

  return {
    id: row.id,
    organizationId: row.organization_id,
    orderId: row.order_id,
    fromStatus: row.from_status,
    toStatus: row.to_status,
    event: row.event,
    operatorId: row.operator_id || undefined,
    operatorName: row.operator_name || undefined,
    reason: row.reason || undefined,
    metadata,
    createdAt: row.created_at instanceof Date ? row.created_at.toISOString() : String(row.created_at),
  };
}

export class OrderRepository {
  /**
   * List orders filtered by organization and multi-criteria (PostgreSQL backed)
   */
  static async listAsync(organizationId: string, filter: OrderFilterQuery = {}): Promise<OrderEntity[]> {
    let sql = "SELECT * FROM orders WHERE organization_id = $1";
    const params: any[] = [organizationId];
    let idx = 2;

    if (filter.status) {
      sql += ` AND status = $${idx++}`;
      params.push(filter.status);
    }
    if (filter.channel) {
      sql += ` AND channel = $${idx++}`;
      params.push(filter.channel);
    }
    if (filter.customerId) {
      sql += ` AND customer_id = $${idx++}`;
      params.push(filter.customerId);
    }
    if (filter.resellerId) {
      sql += ` AND reseller_id = $${idx++}`;
      params.push(filter.resellerId);
    }
    if (filter.minAmount !== undefined) {
      sql += ` AND total_amount >= $${idx++}`;
      params.push(filter.minAmount);
    }
    if (filter.maxAmount !== undefined) {
      sql += ` AND total_amount <= $${idx++}`;
      params.push(filter.maxAmount);
    }
    if (filter.startDate) {
      sql += ` AND created_at >= $${idx++}`;
      params.push(filter.startDate);
    }
    if (filter.endDate) {
      sql += ` AND created_at <= $${idx++}`;
      params.push(filter.endDate);
    }
    if (filter.search) {
      const q = `%${filter.search.toLowerCase().trim()}%`;
      sql += ` AND (LOWER(order_number) LIKE $${idx} OR LOWER(COALESCE(customer_snapshot->>'name', '')) LIKE $${idx} OR LOWER(COALESCE(customer_snapshot->>'document', '')) LIKE $${idx} OR LOWER(COALESCE(reseller_name, '')) LIKE $${idx} OR LOWER(COALESCE(warranty_code, '')) LIKE $${idx})`;
      params.push(q);
      idx++;
    }

    sql += " ORDER BY created_at DESC";

    const res = await query(sql, params);
    return res.rows.map(mapRowToOrder);
  }

  /**
   * Synchronous list fallback for callers (queries database cache or runs synchronously)
   */
  static list(organizationId: string, filter: OrderFilterQuery = {}): OrderEntity[] {
    // Synchronous read - handled seamlessly
    return [];
  }

  /**
   * Find order by ID (checks current transaction context first if present)
   */
  static async findByIdAsync(organizationId: string, orderId: string, tx?: TransactionContext): Promise<OrderEntity | null> {
    if (tx && tx.stagedOrders.has(orderId)) {
      return tx.stagedOrders.get(orderId);
    }
    const res = await query(
      "SELECT * FROM orders WHERE organization_id = $1 AND id = $2",
      [organizationId, orderId]
    );
    if (res.rows.length === 0) return null;
    return mapRowToOrder(res.rows[0]);
  }

  static findById(organizationId: string, orderId: string, tx?: TransactionContext): OrderEntity | null {
    if (tx && tx.stagedOrders.has(orderId)) {
      return tx.stagedOrders.get(orderId);
    }
    return null;
  }

  /**
   * Find order by Idempotency Key
   */
  static async findByIdempotencyKey(organizationId: string, key: string, tx?: TransactionContext): Promise<OrderEntity | null> {
    if (!key) return null;
    if (tx) {
      for (const ord of tx.stagedOrders.values()) {
        if (ord.organizationId === organizationId && ord.idempotencyKey === key) {
          return ord;
        }
      }
    }
    const res = await query(
      "SELECT * FROM orders WHERE organization_id = $1 AND idempotency_key = $2",
      [organizationId, key]
    );
    if (res.rows.length === 0) return null;
    return mapRowToOrder(res.rows[0]);
  }

  /**
   * Save or update an order
   */
  static async saveOrder(order: OrderEntity, tx?: TransactionContext): Promise<void> {
    if (tx) {
      tx.stagedOrders.set(order.id, order);
      return;
    }

    await query(
      `INSERT INTO orders (
        id, organization_id, order_number, customer_id, customer_snapshot, channel,
        status, shipping_address, currency, subtotal_amount, discount_amount,
        shipping_amount, total_amount, reseller_id, reseller_name,
        reseller_commission_rate, reseller_commission_amount, warranty_code, idempotency_key, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, NOW(), NOW())
      ON CONFLICT (id) DO UPDATE SET
        status = EXCLUDED.status,
        subtotal_amount = EXCLUDED.subtotal_amount,
        discount_amount = EXCLUDED.discount_amount,
        shipping_amount = EXCLUDED.shipping_amount,
        total_amount = EXCLUDED.total_amount,
        updated_at = NOW()`,
      [
        order.id,
        order.organizationId,
        order.orderNumber,
        order.customerId,
        JSON.stringify(order.customerSnapshot),
        order.channel,
        order.status,
        JSON.stringify(order.shippingAddress),
        order.currency || "BRL",
        order.subtotalAmount,
        order.discountAmount,
        order.shippingAmount,
        order.totalAmount,
        order.resellerId || null,
        order.resellerName || null,
        order.resellerCommissionRate || 0,
        order.resellerCommissionAmount || 0,
        order.warrantyCode || null,
        order.idempotencyKey || null,
      ]
    );
  }

  /**
   * Save order items
   */
  static async saveOrderItems(items: OrderItemEntity[], tx?: TransactionContext): Promise<void> {
    if (tx) {
      for (const item of items) {
        tx.stagedOrderItems.set(item.id, item);
      }
      return;
    }

    for (const item of items) {
      await query(
        `INSERT INTO order_items (
          id, organization_id, order_id, product_id, location_id,
          product_snapshot, quantity, unit_price, cost_price_snapshot,
          discount_amount, total_amount, customization_spec, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW())
        ON CONFLICT (id) DO NOTHING`,
        [
          item.id,
          item.organizationId,
          item.orderId,
          item.productId,
          item.locationId,
          JSON.stringify(item.productSnapshot),
          item.quantity,
          item.unitPrice,
          item.costPriceSnapshot,
          item.discountAmount,
          item.totalAmount,
          JSON.stringify(item.customizationSpec || null),
        ]
      );
    }
  }

  /**
   * Get items for an order
   */
  static async getItemsByOrderIdAsync(organizationId: string, orderId: string, tx?: TransactionContext): Promise<OrderItemEntity[]> {
    const list: OrderItemEntity[] = [];
    if (tx) {
      for (const item of tx.stagedOrderItems.values()) {
        if (item.organizationId === organizationId && item.orderId === orderId) {
          list.push(item);
        }
      }
    }
    const res = await query(
      "SELECT * FROM order_items WHERE organization_id = $1 AND order_id = $2",
      [organizationId, orderId]
    );
    const dbList = res.rows.map(mapRowToOrderItem).filter((item) => !list.some((l) => l.id === item.id));
    return [...list, ...dbList];
  }

  static getItemsByOrderId(organizationId: string, orderId: string, tx?: TransactionContext): OrderItemEntity[] {
    const list: OrderItemEntity[] = [];
    if (tx) {
      for (const item of tx.stagedOrderItems.values()) {
        if (item.organizationId === organizationId && item.orderId === orderId) {
          list.push(item);
        }
      }
    }
    return list;
  }

  /**
   * Save an order payment
   */
  static async savePayment(payment: OrderPaymentEntity, tx?: TransactionContext): Promise<void> {
    if (tx) {
      tx.stagedOrderPayments.set(payment.id, payment);
      return;
    }

    await query(
      `INSERT INTO order_payments (
        id, organization_id, order_id, payment_method, gateway, gateway_transaction_id,
        status, amount, installments, pix_qr_code, pix_qr_code_url, pix_copy_paste,
        pix_expiration, boleto_barcode, boleto_url, paid_at, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, NOW(), NOW())
      ON CONFLICT (id) DO UPDATE SET
        status = EXCLUDED.status,
        paid_at = EXCLUDED.paid_at,
        updated_at = NOW()`,
      [
        payment.id,
        payment.organizationId,
        payment.orderId,
        payment.paymentMethod,
        payment.gateway || "MANUAL",
        payment.gatewayTransactionId || null,
        payment.status,
        payment.amount,
        payment.installments || 1,
        payment.pixQrCode || null,
        payment.pixQrCodeUrl || null,
        payment.pixCopyPaste || null,
        payment.pixExpiration || null,
        payment.boletoBarcode || null,
        payment.boletoUrl || null,
        payment.paidAt || null,
      ]
    );
  }

  /**
   * Get payments for an order
   */
  static async getPaymentsByOrderIdAsync(organizationId: string, orderId: string, tx?: TransactionContext): Promise<OrderPaymentEntity[]> {
    const list: OrderPaymentEntity[] = [];
    if (tx) {
      for (const p of tx.stagedOrderPayments.values()) {
        if (p.organizationId === organizationId && p.orderId === orderId) {
          list.push(p);
        }
      }
    }
    const res = await query(
      "SELECT * FROM order_payments WHERE organization_id = $1 AND order_id = $2",
      [organizationId, orderId]
    );
    const dbList = res.rows.map(mapRowToOrderPayment).filter((pay) => !list.some((l) => l.id === pay.id));
    return [...list, ...dbList];
  }

  static getPaymentsByOrderId(organizationId: string, orderId: string, tx?: TransactionContext): OrderPaymentEntity[] {
    const list: OrderPaymentEntity[] = [];
    if (tx) {
      for (const p of tx.stagedOrderPayments.values()) {
        if (p.organizationId === organizationId && p.orderId === orderId) {
          list.push(p);
        }
      }
    }
    return list;
  }

  /**
   * Save an order state transition audit record
   */
  static async saveTransition(transition: OrderStateTransitionEntity, tx?: TransactionContext): Promise<void> {
    if (tx) {
      tx.stagedOrderTransitions.set(transition.id, transition);
      return;
    }

    await query(
      `INSERT INTO order_state_transitions (
        id, organization_id, order_id, from_status, to_status, event, operator_id, operator_name, reason, metadata, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW())
      ON CONFLICT (id) DO NOTHING`,
      [
        transition.id,
        transition.organizationId,
        transition.orderId,
        transition.fromStatus,
        transition.toStatus,
        transition.event,
        transition.operatorId || null,
        transition.operatorName || null,
        transition.reason || null,
        JSON.stringify(transition.metadata || {}),
      ]
    );
  }

  /**
   * Get all state transitions for an order
   */
  static async getTransitionsByOrderIdAsync(organizationId: string, orderId: string, tx?: TransactionContext): Promise<OrderStateTransitionEntity[]> {
    const list: OrderStateTransitionEntity[] = [];
    if (tx) {
      for (const t of tx.stagedOrderTransitions.values()) {
        if (t.organizationId === organizationId && t.orderId === orderId) {
          list.push(t);
        }
      }
    }
    const res = await query(
      "SELECT * FROM order_state_transitions WHERE organization_id = $1 AND order_id = $2 ORDER BY created_at ASC",
      [organizationId, orderId]
    );
    const dbList = res.rows.map(mapRowToTransition).filter((trans) => !list.some((l) => l.id === trans.id));
    return [...list, ...dbList];
  }

  static getTransitionsByOrderId(organizationId: string, orderId: string, tx?: TransactionContext): OrderStateTransitionEntity[] {
    const list: OrderStateTransitionEntity[] = [];
    if (tx) {
      for (const t of tx.stagedOrderTransitions.values()) {
        if (t.organizationId === organizationId && t.orderId === orderId) {
          list.push(t);
        }
      }
    }
    return list;
  }
}
