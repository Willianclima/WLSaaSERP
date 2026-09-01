import { dbStore } from "./store";

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
   * Executes a callback within an atomic transaction context.
   * If any exception is thrown, all staged changes and ledger entries are rolled back.
   */
  static async transaction<T>(
    organizationId: string,
    callback: (tx: TransactionContext) => Promise<T>
  ): Promise<T> {
    const txId = `tx-${Date.now()}-${Math.floor(Math.random() * 100000)}`;
    const tx: TransactionContext = {
      id: txId,
      organizationId,
      startedAt: new Date().toISOString(),
      isCommitted: false,
      isRolledBack: false,
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
      // Execute the business transaction
      const result = await callback(tx);

      // --- COMMIT PHASE ---
      // Apply all staged changes to the database store atomically
      for (const [id, order] of tx.stagedOrders) {
        dbStore.orders.set(id, order);
      }
      for (const [id, item] of tx.stagedOrderItems) {
        dbStore.orderItems.set(id, item);
      }
      for (const [id, pay] of tx.stagedOrderPayments) {
        dbStore.orderPayments.set(id, pay);
      }
      for (const [id, trans] of tx.stagedOrderTransitions) {
        dbStore.orderStateTransitions.set(id, trans);
      }
      for (const [id, mov] of tx.stagedInventoryMovements) {
        dbStore.inventoryMovements.set(id, mov);
      }
      for (const [key, bal] of tx.stagedInventoryBalances) {
        dbStore.inventoryBalances.set(key, bal);
      }
      for (const [id, res] of tx.stagedInventoryReservations) {
        dbStore.inventoryReservations.set(id, res);
      }

      tx.isCommitted = true;
      return result;
    } catch (error: any) {
      // --- ROLLBACK PHASE ---
      tx.isRolledBack = true;

      // Revert any partially applied balances
      for (const [key, original] of tx.originalInventoryBalances) {
        if (original) {
          dbStore.inventoryBalances.set(key, original);
        } else {
          dbStore.inventoryBalances.delete(key);
        }
      }

      // Revert any partially applied orders
      for (const [id, original] of tx.originalOrders) {
        if (original) {
          dbStore.orders.set(id, original);
        } else {
          dbStore.orders.delete(id);
        }
      }

      throw new Error(`[TRANSACTION_ROLLBACK] Transação ${txId} abortada e revertida: ${error.message}`);
    }
  }
}
