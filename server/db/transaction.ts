import pg from "pg";
import { withTransaction, query } from "./postgres";

/**
 * Transaction Context and Unit-of-Work for Atomic Operations across Modules
 * 
 * Supports nested operations and atomic rollbacks across:
 * - Orders & Order Items & Snapshots
 * - Inventory Balances, Ledger Movements & Reservations
 * - Payments & Gateways
 * - Order State Transitions & Audit Logs
 */
export interface TransactionContext {
  id: string;
  organizationId: string;
  startedAt: string;
  isCommitted: boolean;
  isRolledBack: boolean;
  pgClient?: pg.PoolClient;

  // Staged records for transactional commit or rollback
  stagedOrders: Map<string, any>;
  stagedOrderItems: Map<string, any>;
  stagedOrderPayments: Map<string, any>;
  stagedOrderTransitions: Map<string, any>;
  stagedInventoryMovements: Map<string, any>;
  stagedInventoryBalances: Map<string, any>;
  stagedInventoryReservations: Map<string, any>;
  stagedAuditLogs: Array<any>;

  // Rollback compensations for existing modified records
  originalInventoryBalances: Map<string, any>;
  originalOrders: Map<string, any>;
}

export class UnitOfWork {
  /**
   * Executes a callback within an atomic transaction context directly on PostgreSQL.
   * Begins a transaction on a dedicated client, provides tx.pgClient to operations for
   * real row locks (SELECT ... FOR UPDATE), and atomically commits or rolls back.
   */
  static async transaction<T>(
    organizationId: string,
    callback: (tx: TransactionContext) => Promise<T>
  ): Promise<T> {
    const txId = `tx-${Date.now()}-${Math.floor(Math.random() * 100000)}`;

    return await withTransaction(async (client) => {
      const tx: TransactionContext = {
        id: txId,
        organizationId,
        startedAt: new Date().toISOString(),
        isCommitted: false,
        isRolledBack: false,
        pgClient: client,
        stagedOrders: new Map(),
        stagedOrderItems: new Map(),
        stagedOrderPayments: new Map(),
        stagedOrderTransitions: new Map(),
        stagedInventoryMovements: new Map(),
        stagedInventoryBalances: new Map(),
        stagedInventoryReservations: new Map(),
        stagedAuditLogs: [],
        originalInventoryBalances: new Map(),
        originalOrders: new Map(),
      };

      try {
        // 1. Execute the business transaction logic inside the active PostgreSQL transaction
        const result = await callback(tx);

        // 2. Commit all staged records to PostgreSQL using the SAME active connection
        // 1. Orders
        for (const order of tx.stagedOrders.values()) {
          await client.query(
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
              order.channel || "PRESENTIAL_POS",
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

        // 2. Order Items
        for (const item of tx.stagedOrderItems.values()) {
          await client.query(
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

        // 3. Order Payments
        for (const pay of tx.stagedOrderPayments.values()) {
          await client.query(
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
              pay.id,
              pay.organizationId,
              pay.orderId,
              pay.paymentMethod,
              pay.gateway || "MANUAL",
              pay.gatewayTransactionId || null,
              pay.status,
              pay.amount,
              pay.installments || 1,
              pay.pixQrCode || null,
              pay.pixQrCodeUrl || null,
              pay.pixCopyPaste || null,
              pay.pixExpiration || null,
              pay.boletoBarcode || null,
              pay.boletoUrl || null,
              pay.paidAt || null,
            ]
          );
        }

        // 4. Order State Transitions
        for (const trans of tx.stagedOrderTransitions.values()) {
          await client.query(
            `INSERT INTO order_state_transitions (
              id, organization_id, order_id, from_status, to_status, event, operator_id, operator_name, reason, metadata, created_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW())
            ON CONFLICT (id) DO NOTHING`,
            [
              trans.id,
              trans.organizationId,
              trans.orderId,
              trans.fromStatus,
              trans.toStatus,
              trans.event,
              trans.operatorId || null,
              trans.operatorName || null,
              trans.reason || null,
              JSON.stringify(trans.metadata || {}),
            ]
          );
        }

        // 5. Inventory Balances
        for (const bal of tx.stagedInventoryBalances.values()) {
          await client.query(
            `INSERT INTO inventory_balances (
              id, organization_id, product_id, location_id, on_hand_quantity, reserved_quantity, created_at, updated_at
            ) VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
            ON CONFLICT (organization_id, product_id, location_id) DO UPDATE SET
              on_hand_quantity = EXCLUDED.on_hand_quantity,
              reserved_quantity = EXCLUDED.reserved_quantity,
              updated_at = NOW()`,
            [
              bal.id,
              bal.organizationId,
              bal.productId,
              bal.locationId,
              bal.onHandQuantity,
              bal.reservedQuantity,
            ]
          );
        }

        // 6. Inventory Movements
        for (const mov of tx.stagedInventoryMovements.values()) {
          await client.query(
            `INSERT INTO inventory_movements (
              id, organization_id, product_id, type, quantity_change,
              physical_balance_after, consigned_balance_after, location_id,
              reference_type, reference_id, operator_name, notes, created_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW())
            ON CONFLICT (id) DO NOTHING`,
            [
              mov.id,
              mov.organizationId,
              mov.productId,
              mov.type,
              mov.quantityChange,
              mov.physicalBalanceAfter,
              mov.consignedBalanceAfter,
              mov.locationId || null,
              mov.referenceType || null,
              mov.referenceId || null,
              mov.operatorName,
              mov.notes || null,
            ]
          );
        }

        // 7. Inventory Reservations
        for (const res of tx.stagedInventoryReservations.values()) {
          await client.query(
            `INSERT INTO inventory_reservations (
              id, organization_id, product_id, location_id, quantity,
              status, reference_type, reference_id, idempotency_key, expires_at, created_at, updated_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), NOW())
            ON CONFLICT (id) DO UPDATE SET
              status = EXCLUDED.status,
              updated_at = NOW()`,
            [
              res.id,
              res.organizationId,
              res.productId,
              res.locationId,
              res.quantity,
              res.status || "ACTIVE",
              res.referenceType || "ORDER",
              res.referenceId || res.orderId || "N/A",
              res.idempotencyKey || null,
              res.expiresAt || new Date(Date.now() + 3600000).toISOString(),
            ]
          );
        }

        // Transaction committed atomically to PostgreSQL
        tx.isCommitted = true;
        return result;
      } catch (error: any) {
        tx.isRolledBack = true;
        throw error;
      }
    });
  }
}
