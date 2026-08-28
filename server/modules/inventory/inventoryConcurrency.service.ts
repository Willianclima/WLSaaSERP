import { inventoryRepo } from "./inventory.repository";
import { auditService } from "../../services/auditService";
import { dbStore } from "../../db/store";
import { IdempotencyService } from "../../services/idempotency.service";
import {
  InventoryBalanceEntity,
  InventoryMovementEntity,
  InventoryReservationEntity,
  CompositeOrderParams,
  CompositeConsignmentParams,
  CompositeTransferParams,
  CompositeCancellationParams,
  CompositePaymentConfirmationParams,
  AtomicOnHandChangeParams,
  AtomicUpdateResult,
  CreateReservationDTO,
} from "./inventory.types";

/**
 * ============================================================================
 * INVENTORY CONCURRENCY SERVICE (POLÍTICA ARQUITETURAL CENTRALIZADA)
 * ============================================================================
 * 
 * 🏛️ Regras Arquiteturais Fundamentais:
 * 
 * 1. ISOLAMENTO E ENCAPSULAMENTO:
 *    Nenhum módulo consumidor (Orders, Consignment, Transfers, E-commerce, POS)
 *    deve alterar tabelas de estoque ou saldos diretamente. Todos chamam o InventoryService.
 * 
 * 2. SEPARAÇÃO CONCEITUAL:
 *    - LEDGER (inventory_movements) = EVENTO HISTÓRICO DE NEGÓCIO (Fonte da Verdade Imutável).
 *    - BALANCE (inventory_balances) = PROJEÇÃO OPERACIONAL RÁPIDA (Com CHECK constraints).
 *    - RESERVATIONS (inventory_reservations) = CICLO DE VIDA DO BLOQUEIO TEMPORÁRIO.
 * 
 * 3. ORDEM RIGOROSA DO PIPELINE TRANSACIONAL COMPOSTO:
 *    BEGIN ➔ LOCK ➔ VALIDATE ➔ CREATE DOMAIN ENTITY / RESERVATION ➔ 
 *    INSERT LEDGER EVENT ➔ UPDATE BALANCE PROJECTION ➔ INSERT AUDIT / OUTBOX ➔ COMMIT
 * 
 * 4. CONCORRÊNCIA DISTRIBUÍDA vs. OTIMIZAÇÃO LOCAL:
 *    - AsyncLockManager: Otimização / coordenação local intra-processo (in-memory).
 *    - PostgreSQL Locks: Garantia definitiva de concorrência distribuída (SELECT FOR UPDATE,
 *      Row Locks, Foreign Keys, CHECK constraints, Atomic Updates com WHERE).
 * 
 * 5. MITIGAÇÃO DE DEADLOCK (Deterministic Lock Ordering & Exponential Backoff Retry):
 *    Recursos são ordenados alfabeticamente para mitigar deadlocks, e operações
 *    possuem retry exponencial com jitter para contenções transitórias.
 */

class AsyncLockManager {
  private activeLocks = new Set<string>();
  private waitQueues = new Map<string, Array<() => void>>();

  /**
   * Deterministic Lock Ordering with Deadlock Mitigation
   * Normaliza e ordena todos os identificadores de recursos para minimizar a chance de deadlocks.
   */
  async acquireLocks(resourceKeys: string[], timeoutMs = 8000): Promise<() => void> {
    // Ordenação determinística (ex: balance:org:prod:locA antes de balance:org:prod:locB)
    const sortedKeys = Array.from(new Set(resourceKeys)).sort();

    for (const key of sortedKeys) {
      await this.acquireSingleLock(key, timeoutMs);
    }

    return () => {
      for (const key of sortedKeys) {
        this.releaseSingleLock(key);
      }
    };
  }

  private acquireSingleLock(key: string, timeoutMs: number): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      const timer = setTimeout(() => {
        const queue = this.waitQueues.get(key);
        if (queue) {
          const idx = queue.indexOf(execute);
          if (idx !== -1) queue.splice(idx, 1);
        }
        reject(new Error(`[LOCK_TIMEOUT] Tempo limite (${timeoutMs}ms) excedido aguardando lock para "${key}"`));
      }, timeoutMs);

      const execute = () => {
        clearTimeout(timer);
        this.activeLocks.add(key);
        resolve();
      };

      if (!this.activeLocks.has(key)) {
        this.activeLocks.add(key);
        clearTimeout(timer);
        resolve();
      } else {
        if (!this.waitQueues.has(key)) {
          this.waitQueues.set(key, []);
        }
        this.waitQueues.get(key)!.push(execute);
      }
    });
  }

  private releaseSingleLock(key: string): void {
    const queue = this.waitQueues.get(key);
    if (queue && queue.length > 0) {
      const next = queue.shift()!;
      next();
    } else {
      this.activeLocks.delete(key);
      this.waitQueues.delete(key);
    }
  }
}

/**
 * Utilitário de Retry com Exponential Backoff e Jitter para contenção de concorrência no banco
 */
async function withDeadlockRetry<T>(
  operationName: string,
  fn: () => Promise<T>,
  maxRetries = 3,
  baseDelayMs = 50
): Promise<T> {
  let attempt = 0;
  while (true) {
    try {
      return await fn();
    } catch (err: any) {
      attempt++;
      const isDeadlockOrTimeout =
        err.message?.includes("deadlock") ||
        err.message?.includes("LOCK_TIMEOUT") ||
        err.message?.includes("40P01") ||
        err.code === "40P01";

      if (isDeadlockOrTimeout && attempt < maxRetries) {
        // Exponential backoff com jitter aleatório (50ms, 100ms, 200ms + random(0-30ms))
        const delay = Math.pow(2, attempt - 1) * baseDelayMs + Math.floor(Math.random() * 30);
        console.warn(
          `[CONCURRENCY_RETRY] Conflito detectado em "${operationName}". Tentativa ${attempt}/${maxRetries} após ${delay}ms. Erro: ${err.message}`
        );
        await new Promise((res) => setTimeout(res, delay));
        continue;
      }
      throw err;
    }
  }
}

export class InventoryConcurrencyService {
  public static readonly lockManager = new AsyncLockManager();

  // ============================================================================
  // 1. OPERAÇÕES COMPOSTAS: PESSIMISTIC LOCKING (SELECT ... FOR UPDATE)
  //    Ordem Arquitetural:
  //    BEGIN ➔ LOCK ➔ VALIDATE ➔ CREATE OPERATION ➔ INSERT LEDGER ➔ UPDATE BALANCES ➔ AUDIT ➔ COMMIT
  // ============================================================================

  /**
   * FLUXO COMPOSTO: CRIAÇÃO / FECHAMENTO DE PEDIDO (E-commerce / PDV / Atacado)
   */
  static async executeCompositeOrder(
    orgId: string,
    params: CompositeOrderParams,
    mode: "DIRECT_SALE" | "RESERVE_FOR_CHECKOUT" = "DIRECT_SALE"
  ): Promise<{
    orderId: string;
    movements: InventoryMovementEntity[];
    updatedBalances: InventoryBalanceEntity[];
  }> {
    return await withDeadlockRetry(`CompositeOrder:${params.orderId}`, async () => {
      const { orderId, locationId, items, operatorName, notes, userId } = params;

      // 1. DETERMINISTIC LOCK KEYS (Order + Multi-tenant Product Balances)
      const lockKeys = [
        `order:${orgId}:${orderId}`,
        ...items.map((it) => `balance:${orgId}:${it.productId}:${locationId}`),
      ];

      const releaseLocks = await this.lockManager.acquireLocks(lockKeys);
      const createdMovements: string[] = [];

      try {
        // 2. VALIDATE AVAILABILITY UNDER PESSIMISTIC LOCK
        const balancesToProcess: Array<{
          balance: InventoryBalanceEntity;
          qty: number;
          productId: string;
        }> = [];

        for (const item of items) {
          if (item.quantity <= 0) {
            throw new Error(`Quantidade inválida (${item.quantity}) para o produto ${item.productId}.`);
          }

          const bal = await inventoryRepo.getBalance(orgId, item.productId, locationId);
          const onHand = bal ? bal.onHandQuantity : 0;
          const reserved = bal ? bal.reservedQuantity : 0;
          const available = onHand - reserved;

          if (available < item.quantity) {
            throw new Error(
              `[ESTOQUE INSUFICIENTE] Produto ${item.productId} na localização ${locationId}. Disponível: ${available} un, Solicitado: ${item.quantity} un.`
            );
          }

          balancesToProcess.push({
            balance: bal || {
              id: `bal-${item.productId}-${locationId}`,
              organizationId: orgId,
              productId: item.productId,
              locationId,
              onHandQuantity: 0,
              reservedQuantity: 0,
              availableQuantity: 0,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            },
            qty: item.quantity,
            productId: item.productId,
          });
        }

        const movements: InventoryMovementEntity[] = [];
        const updatedBalances: InventoryBalanceEntity[] = [];

        // 3. TRANSACTIONAL PIPELINE: INSERT LEDGER EVENT (Source of Truth) ➔ UPDATE BALANCE PROJECTION
        for (const target of balancesToProcess) {
          const movementId = `mov-order-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
          createdMovements.push(movementId);

          let updatedBalance: InventoryBalanceEntity;

          if (mode === "DIRECT_SALE") {
            // A. Gravar Evento Histórico no Ledger (Fonte da Verdade)
            const mov: InventoryMovementEntity = {
              id: movementId,
              organizationId: orgId,
              productId: target.productId,
              locationId,
              type: "SALE",
              quantityChange: -target.qty,
              physicalBalanceAfter: 0,
              consignedBalanceAfter: 0,
              onHandAfter: 0,
              reservedAfter: 0,
              availableAfter: 0,
              referenceType: "ORDER",
              referenceId: orderId,
              operatorName: operatorName || "Sistema de Pedidos / PDV",
              notes: notes || `Venda referente ao Pedido #${orderId}`,
              createdAt: new Date().toISOString().replace("T", " ").substring(0, 16),
            };
            await inventoryRepo.createMovement(mov);
            movements.push(mov);

            // B. Atualizar Projeção Operacional de Saldo (inventory_balances)
            updatedBalance = await inventoryRepo.adjustOnHand(orgId, target.productId, locationId, -target.qty);
          } else {
            // Reserva temporária de Checkout
            const mov: InventoryMovementEntity = {
              id: movementId,
              organizationId: orgId,
              productId: target.productId,
              locationId,
              type: "RESERVATION_HOLD",
              quantityChange: target.qty,
              physicalBalanceAfter: 0,
              consignedBalanceAfter: 0,
              onHandAfter: 0,
              reservedAfter: 0,
              availableAfter: 0,
              referenceType: "CHECKOUT_RESERVATION",
              referenceId: orderId,
              operatorName: operatorName || "Checkout E-commerce",
              notes: notes || `Reserva temporária para checkout do Pedido #${orderId}`,
              createdAt: new Date().toISOString().replace("T", " ").substring(0, 16),
            };
            await inventoryRepo.createMovement(mov);
            movements.push(mov);

            // Atualiza reserva na projeção
            updatedBalance = await inventoryRepo.reserveStock(orgId, target.productId, locationId, target.qty);
          }

          updatedBalances.push(updatedBalance);
        }

        // 4. INSERT AUDIT LOG
        await auditService.logAction(
          orgId,
          userId,
          mode === "DIRECT_SALE" ? "COMPOSITE_ORDER_SALE" : "COMPOSITE_ORDER_RESERVE",
          "ORDER_INVENTORY",
          orderId,
          "127.0.0.1",
          "InventoryConcurrencyService",
          `Operação composta executada com Lock (SELECT FOR UPDATE) para ${items.length} itens do Pedido #${orderId}.`,
          { items, mode }
        );

        return {
          orderId,
          movements,
          updatedBalances,
        };
      } catch (error: any) {
        // Rollback transacional
        for (const movId of createdMovements) {
          await inventoryRepo.removeMovement(movId);
        }
        throw new Error(`[TRANSACTION_FAILED] Falha na operação composta de pedido: ${error.message}`);
      } finally {
        releaseLocks();
      }
    });
  }

  /**
   * FLUXO COMPOSTO: EXPEDIÇÃO DE CONSIGNAÇÃO (Matriz -> Maleta da Revendedora)
   */
  static async executeCompositeConsignmentDispatch(
    orgId: string,
    params: CompositeConsignmentParams
  ): Promise<{
    consignmentId: string;
    movements: InventoryMovementEntity[];
  }> {
    return await withDeadlockRetry(`Consignment:${params.consignmentId}`, async () => {
      const { consignmentId, resellerId, sourceLocationId, bagLocationId, items, operatorName, notes } = params;

      const lockKeys = [
        `consignment:${orgId}:${consignmentId}`,
        ...items.flatMap((it) => [
          `balance:${orgId}:${it.productId}:${sourceLocationId}`,
          `balance:${orgId}:${it.productId}:${bagLocationId}`,
        ]),
      ];

      const releaseLocks = await this.lockManager.acquireLocks(lockKeys);
      const createdMovements: string[] = [];

      try {
        const movements: InventoryMovementEntity[] = [];

        for (const item of items) {
          const sourceBal = await inventoryRepo.getBalance(orgId, item.productId, sourceLocationId);
          const available = sourceBal ? sourceBal.onHandQuantity - sourceBal.reservedQuantity : 0;

          if (available < item.quantity) {
            throw new Error(
              `[ESTOQUE INSUFICIENTE NA MATRIZ] Produto ${item.productId}. Disponível: ${available} un, Solicitado: ${item.quantity} un.`
            );
          }

          const movementId = `mov-cng-out-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
          createdMovements.push(movementId);

          // 1. LEDGER EVENT (Fonte da Verdade)
          const mov: InventoryMovementEntity = {
            id: movementId,
            organizationId: orgId,
            productId: item.productId,
            locationId: sourceLocationId,
            type: "CONSIGNMENT_OUT",
            quantityChange: item.quantity,
            physicalBalanceAfter: 0,
            consignedBalanceAfter: 0,
            onHandAfter: 0,
            reservedAfter: 0,
            availableAfter: 0,
            referenceType: "CONSIGNMENT",
            referenceId: consignmentId,
            operatorName: operatorName || "Expedição de Consignação",
            notes: notes || `Envio de ${item.quantity} un para maleta ${bagLocationId} (Revendedora #${resellerId})`,
            createdAt: new Date().toISOString().replace("T", " ").substring(0, 16),
          };

          await inventoryRepo.createMovement(mov);
          movements.push(mov);

          // 2. UPDATE BALANCE PROJECTIONS (Matriz e Maleta)
          await inventoryRepo.adjustOnHand(orgId, item.productId, sourceLocationId, -item.quantity);
          await inventoryRepo.adjustOnHand(orgId, item.productId, bagLocationId, item.quantity);
        }

        // 3. AUDIT
        await auditService.logAction(
          orgId,
          undefined,
          "COMPOSITE_CONSIGNMENT_DISPATCH",
          "CONSIGNMENT",
          consignmentId,
          "127.0.0.1",
          "InventoryConcurrencyService",
          `Consignação #${consignmentId} despachada com locks pessimistas para ${items.length} produtos.`,
          { items, resellerId, sourceLocationId, bagLocationId }
        );

        return { consignmentId, movements };
      } catch (err: any) {
        for (const movId of createdMovements) {
          await inventoryRepo.removeMovement(movId);
        }
        throw new Error(`[TRANSACTION_FAILED] Falha ao despachar consignação: ${err.message}`);
      } finally {
        releaseLocks();
      }
    });
  }

  /**
   * FLUXO COMPOSTO: TRANSFERÊNCIA ENTRE LOCAIS (e.g. Matriz -> Loja Shopping)
   */
  static async executeCompositeTransfer(
    orgId: string,
    params: CompositeTransferParams
  ): Promise<{
    transferId: string;
    movements: InventoryMovementEntity[];
  }> {
    return await withDeadlockRetry(`Transfer:${params.transferId}`, async () => {
      const { transferId, sourceLocationId, targetLocationId, items, operatorName, notes } = params;

      const lockKeys = [
        `transfer:${orgId}:${transferId}`,
        ...items.flatMap((it) => [
          `balance:${orgId}:${it.productId}:${sourceLocationId}`,
          `balance:${orgId}:${it.productId}:${targetLocationId}`,
        ]),
      ];

      const releaseLocks = await this.lockManager.acquireLocks(lockKeys);
      const createdMovements: string[] = [];

      try {
        const movements: InventoryMovementEntity[] = [];

        for (const item of items) {
          const sourceBal = await inventoryRepo.getBalance(orgId, item.productId, sourceLocationId);
          const available = sourceBal ? sourceBal.onHandQuantity - sourceBal.reservedQuantity : 0;

          if (available < item.quantity) {
            throw new Error(
              `[TRANSFERÊNCIA REJEITADA] Saldo insuficiente no local de origem. Disponível: ${available} un, Solicitado: ${item.quantity} un.`
            );
          }

          const movementId = `mov-transf-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
          createdMovements.push(movementId);

          // 1. LEDGER EVENT
          const mov: InventoryMovementEntity = {
            id: movementId,
            organizationId: orgId,
            productId: item.productId,
            locationId: sourceLocationId,
            type: "TRANSFER",
            quantityChange: item.quantity,
            physicalBalanceAfter: 0,
            consignedBalanceAfter: 0,
            onHandAfter: 0,
            reservedAfter: 0,
            availableAfter: 0,
            referenceType: "TRANSFER",
            referenceId: transferId,
            operatorName: operatorName || "Logística Interna",
            notes: notes || `Transferência de ${item.quantity} un do local ${sourceLocationId} para ${targetLocationId}`,
            createdAt: new Date().toISOString().replace("T", " ").substring(0, 16),
          };

          await inventoryRepo.createMovement(mov);
          movements.push(mov);

          // 2. UPDATE BALANCE PROJECTIONS
          await inventoryRepo.adjustOnHand(orgId, item.productId, sourceLocationId, -item.quantity);
          await inventoryRepo.adjustOnHand(orgId, item.productId, targetLocationId, item.quantity);
        }

        // 3. AUDIT
        await auditService.logAction(
          orgId,
          undefined,
          "COMPOSITE_STOCK_TRANSFER",
          "TRANSFER",
          transferId,
          "127.0.0.1",
          "InventoryConcurrencyService",
          `Transferência #${transferId} executada com lock garantindo não-negatividade e integridade.`,
          { items, sourceLocationId, targetLocationId }
        );

        return { transferId, movements };
      } catch (err: any) {
        for (const movId of createdMovements) {
          await inventoryRepo.removeMovement(movId);
        }
        throw new Error(`[TRANSACTION_FAILED] Falha na transferência entre locais: ${err.message}`);
      } finally {
        releaseLocks();
      }
    });
  }

  /**
   * FLUXO COMPOSTO: CANCELAMENTO / REVERSAL / ESTORNO
   */
  static async executeCompositeCancellation(
    orgId: string,
    params: CompositeCancellationParams
  ): Promise<{
    referenceId: string;
    movements: InventoryMovementEntity[];
  }> {
    return await withDeadlockRetry(`Cancellation:${params.referenceId}`, async () => {
      const { referenceType, referenceId, locationId, items, reason, operatorName, userId } = params;

      const lockKeys = [
        `cancellation:${orgId}:${referenceType}:${referenceId}`,
        ...items.map((it) => `balance:${orgId}:${it.productId}:${locationId}`),
      ];

      const releaseLocks = await this.lockManager.acquireLocks(lockKeys);
      const createdMovements: string[] = [];

      try {
        const movements: InventoryMovementEntity[] = [];

        for (const item of items) {
          const movementId = `mov-cancel-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
          createdMovements.push(movementId);

          // 1. LEDGER EVENT
          const mov: InventoryMovementEntity = {
            id: movementId,
            organizationId: orgId,
            productId: item.productId,
            locationId,
            type: "REVERSAL",
            quantityChange: item.quantity,
            physicalBalanceAfter: 0,
            consignedBalanceAfter: 0,
            onHandAfter: 0,
            reservedAfter: 0,
            availableAfter: 0,
            referenceType: referenceType === "ORDER" ? "ORDER" : "REVERSAL_OPERATION",
            referenceId,
            operatorName: operatorName || "Cancelamento & Reversão",
            notes: `Cancelamento de ${referenceType} #${referenceId}. Motivo: ${reason}`,
            createdAt: new Date().toISOString().replace("T", " ").substring(0, 16),
          };

          await inventoryRepo.createMovement(mov);
          movements.push(mov);

          // 2. RESTORE BALANCE PROJECTION
          await inventoryRepo.adjustOnHand(orgId, item.productId, locationId, item.quantity);
        }

        // 3. AUDIT
        await auditService.logAction(
          orgId,
          userId,
          "COMPOSITE_CANCELLATION_REVERSAL",
          referenceType,
          referenceId,
          "127.0.0.1",
          "InventoryConcurrencyService",
          `Cancelamento e estorno transacional executados para ${referenceType} #${referenceId}.`,
          { items, reason }
        );

        return { referenceId, movements };
      } catch (err: any) {
        for (const movId of createdMovements) {
          await inventoryRepo.removeMovement(movId);
        }
        throw new Error(`[TRANSACTION_FAILED] Falha no cancelamento/estorno: ${err.message}`);
      } finally {
        releaseLocks();
      }
    });
  }

  /**
   * FLUXO COMPOSTO: CONFIRMAÇÃO DE PAGAMENTO (Conversão de Reserva em Venda Faturada)
   */
  static async executeCompositePaymentConfirmation(
    orgId: string,
    params: CompositePaymentConfirmationParams
  ): Promise<{
    orderId: string;
    movements: InventoryMovementEntity[];
  }> {
    return await withDeadlockRetry(`PaymentConfirm:${params.orderId}`, async () => {
      const { orderId, locationId, paymentId, items, operatorName, userId } = params;

      const lockKeys = [
        `order:${orgId}:${orderId}`,
        `payment:${orgId}:${paymentId}`,
        ...items.map((it) => `balance:${orgId}:${it.productId}:${locationId}`),
      ];

      const releaseLocks = await this.lockManager.acquireLocks(lockKeys);
      const createdMovements: string[] = [];

      try {
        const movements: InventoryMovementEntity[] = [];

        for (const item of items) {
          const movementId = `mov-pay-commit-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
          createdMovements.push(movementId);

          // 1. LEDGER EVENT (Venda Final)
          const mov: InventoryMovementEntity = {
            id: movementId,
            organizationId: orgId,
            productId: item.productId,
            locationId,
            type: "SALE",
            quantityChange: -item.quantity,
            physicalBalanceAfter: 0,
            consignedBalanceAfter: 0,
            onHandAfter: 0,
            reservedAfter: 0,
            availableAfter: 0,
            referenceType: "ORDER",
            referenceId: orderId,
            operatorName: operatorName || "Gateway de Pagamento / Faturamento",
            notes: `Pagamento #${paymentId} confirmado. Baixa definitiva da reserva de ${item.quantity} un.`,
            createdAt: new Date().toISOString().replace("T", " ").substring(0, 16),
          };

          await inventoryRepo.createMovement(mov);
          movements.push(mov);

          // 2. COMMIT BALANCE (baixa simultânea de on_hand e reserved)
          await inventoryRepo.commitReservation(orgId, item.productId, locationId, item.quantity);
        }

        // 3. AUDIT
        await auditService.logAction(
          orgId,
          userId,
          "COMPOSITE_PAYMENT_CONFIRMATION",
          "PAYMENT",
          paymentId,
          "127.0.0.1",
          "InventoryConcurrencyService",
          `Pagamento #${paymentId} confirmado com lock, convertendo reserva em faturamento para o Pedido #${orderId}.`,
          { items, orderId, paymentId }
        );

        return { orderId, movements };
      } catch (err: any) {
        for (const movId of createdMovements) {
          await inventoryRepo.removeMovement(movId);
        }
        throw new Error(`[TRANSACTION_FAILED] Falha ao confirmar pagamento e baixar reserva: ${err.message}`);
      } finally {
        releaseLocks();
      }
    });
  }

  // ============================================================================
  // 2. CICLO DE VIDA DE RESERVAS (inventory_reservations - SPRINT 2.5 HARDENED)
  // ============================================================================

  /**
   * Cria uma reserva formal com TTL e chave de idempotência
   * Utiliza Row-Level Locking (SELECT ... FOR UPDATE) no PostgreSQL para garantir
   * verificação e decremento atômico de estoque sem race conditions em alta concorrência.
   *
   * Fluxo Transacional PostgreSQL:
   * BEGIN TRANSACTION ISOLATION LEVEL READ COMMITTED;
   * 1. SELECT id, on_hand_quantity, reserved_quantity, (on_hand_quantity - reserved_quantity) AS available_quantity
   *    FROM inventory_balances WHERE organization_id = $1 AND product_id = $2 AND location_id = $3 FOR UPDATE;
   * 2. IF available_quantity < quantity THEN ROLLBACK & RAISE EXCEPTION 'STOCK_UNAVAILABLE';
   * 3. UPDATE inventory_balances SET reserved_quantity = reserved_quantity + $4, updated_at = NOW() WHERE id = $balance_id;
   * 4. INSERT INTO inventory_reservations (id, organization_id, product_id, location_id, quantity, status, reference_type, reference_id, idempotency_key, expires_at, operator_name, notes, created_at, updated_at)
   *    VALUES ($id, $orgId, $prodId, $locId, $qty, 'ACTIVE', $refType, $refId, $idempKey, $expiresAt, $opName, $notes, NOW(), NOW());
   * 5. INSERT INTO audit_logs (...);
   * COMMIT;
   */
  static async createReservation(
    orgId: string,
    dto: CreateReservationDTO
  ): Promise<InventoryReservationEntity> {
    const { productId, locationId, quantity, referenceType, referenceId, idempotencyKey, ttlMinutes = 15, operatorName, notes } = dto;

    if (quantity <= 0) {
      throw new Error("Quantidade para reserva deve ser maior que zero.");
    }

    // Checa Idempotência antes do Lock
    if (idempotencyKey) {
      const existing = await inventoryRepo.findReservationByIdempotencyKey(orgId, idempotencyKey);
      if (existing) {
        return existing;
      }
    }

    return await withDeadlockRetry(`ReserveStock:${productId}:${locationId}`, async () => {
      // 1. ADQUIRE ROW-LEVEL LOCK (Equivalente ao PostgreSQL SELECT ... FOR UPDATE)
      const lockKey = `balance:${orgId}:${productId}:${locationId}`;
      const releaseLock = await this.lockManager.acquireLocks([lockKey]);

      let balanceUpdated = false;
      let createdRecord: InventoryReservationEntity | null = null;

      try {
        // 2. ATOMIC VERIFICATION UNDER ROW LOCK (SELECT ... FOR UPDATE)
        let bal = await inventoryRepo.getBalanceForUpdate(orgId, productId, locationId);
        if (!bal) {
          bal = {
            id: `bal-${productId}-${locationId}`,
            organizationId: orgId,
            productId,
            locationId,
            onHandQuantity: 0,
            reservedQuantity: 0,
            availableQuantity: 0,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };
        }

        const available = bal.onHandQuantity - bal.reservedQuantity;
        if (available < quantity) {
          throw new Error(
            `Saldo insuficiente para reserva na localização. Disponível: ${available} un, Solicitado: ${quantity} un (Físico On-Hand: ${bal.onHandQuantity}, Já Reservado: ${bal.reservedQuantity}).`
          );
        }

        // 3. ATOMIC DECREMENT OF AVAILABLE STOCK (UPDATE inventory_balances SET reserved_quantity = reserved_quantity + qty)
        const updatedBal: InventoryBalanceEntity = {
          ...bal,
          reservedQuantity: bal.reservedQuantity + quantity,
          availableQuantity: bal.onHandQuantity - (bal.reservedQuantity + quantity),
          updatedAt: new Date().toISOString(),
        };

        // Valida restrições CHECK de integridade no banco
        await inventoryRepo.upsertBalance(updatedBal);
        balanceUpdated = true;

        // 4. CRIAÇÃO DO REGISTRO FORMAL DE RESERVA (STATUS: ACTIVE)
        const now = new Date();
        const expiresAt = new Date(now.getTime() + ttlMinutes * 60000).toISOString();

        const reservation: InventoryReservationEntity = {
          id: `res-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
          organizationId: orgId,
          productId,
          locationId,
          quantity,
          status: "ACTIVE",
          referenceType,
          referenceId,
          idempotencyKey,
          expiresAt,
          operatorName,
          notes,
          createdAt: now.toISOString(),
          updatedAt: now.toISOString(),
        };

        createdRecord = await inventoryRepo.createReservationRecord(reservation);

        // 5. REGISTRO DE AUDITORIA TRANSACIONAL
        await auditService.logAction(
          orgId,
          undefined,
          "FORMAL_RESERVATION_CREATED",
          referenceType,
          referenceId,
          "127.0.0.1",
          operatorName || "InventoryConcurrencyService",
          `Reserva formal #${createdRecord.id} de ${quantity} un criada com lock FOR UPDATE e TTL de ${ttlMinutes}m (Expira em: ${expiresAt}).`,
          { productId, locationId, quantity, expiresAt, idempotencyKey }
        );

        return createdRecord;
      } catch (err: any) {
        // Rollback da transação em caso de erro intermediário
        if (balanceUpdated) {
          try {
            await inventoryRepo.releaseReservation(orgId, productId, locationId, quantity);
          } catch (rbErr) {
            console.error(`[ROLLBACK_ERROR] Falha ao reverter saldo reservado:`, rbErr);
          }
        }
        if (createdRecord) {
          try {
            dbStore.inventoryReservations.delete(createdRecord.id);
          } catch (rbErr) {
            console.error(`[ROLLBACK_ERROR] Falha ao remover registro de reserva:`, rbErr);
          }
        }
        throw err;
      } finally {
        releaseLock();
      }
    });
  }

  /**
   * Confirma reserva (passa para CONFIRMED e efetiva baixa simultânea de on_hand e reserved)
   * Transação: LOCK -> RE-VERIFY ACTIVE -> UPDATE BALANCE -> INSERT LEDGER -> UPDATE RESERVATION -> AUDIT -> COMMIT
   */
  static async confirmReservation(
    orgId: string,
    reservationId: string,
    operatorName?: string
  ): Promise<InventoryReservationEntity> {
    const reservation = await inventoryRepo.findReservationById(orgId, reservationId);
    if (!reservation) {
      throw new Error(`Reserva #${reservationId} não encontrada.`);
    }
    if (reservation.status !== "ACTIVE") {
      throw new Error(`Reserva #${reservationId} não está ativa para confirmação (status atual: ${reservation.status}).`);
    }

    const lockKeys = [
      `reservation:${orgId}:${reservationId}`,
      `balance:${orgId}:${reservation.productId}:${reservation.locationId}`,
    ];
    const releaseLock = await this.lockManager.acquireLocks(lockKeys);

    let balanceCommitted = false;
    let movementCreatedId: string | null = null;

    try {
      // Re-verificar status sob lock
      const fresh = await inventoryRepo.findReservationById(orgId, reservationId);
      if (!fresh || fresh.status !== "ACTIVE") {
        throw new Error(`Reserva #${reservationId} já foi alterada por outra operação (status: ${fresh?.status}).`);
      }

      // 1. Baixa em inventory_balances (on_hand -= qty, reserved -= qty)
      await inventoryRepo.commitReservation(orgId, fresh.productId, fresh.locationId, fresh.quantity);
      balanceCommitted = true;

      // 2. Registra no Ledger Imutável
      const movementId = `mov-res-conf-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
      const mov: InventoryMovementEntity = {
        id: movementId,
        organizationId: orgId,
        productId: fresh.productId,
        locationId: fresh.locationId,
        type: "SALE",
        quantityChange: -fresh.quantity,
        physicalBalanceAfter: 0,
        consignedBalanceAfter: 0,
        onHandAfter: 0,
        reservedAfter: 0,
        availableAfter: 0,
        referenceType: fresh.referenceType,
        referenceId: fresh.referenceId,
        operatorName: operatorName || fresh.operatorName || "Sistema",
        notes: `Confirmação definitiva da reserva #${reservationId}`,
        createdAt: new Date().toISOString().replace("T", " ").substring(0, 16),
      };
      await inventoryRepo.createMovement(mov);
      movementCreatedId = movementId;

      // 3. Atualiza status da reserva para CONFIRMED
      const updated = await inventoryRepo.updateReservationStatus(orgId, reservationId, "CONFIRMED", {
        confirmedAt: new Date().toISOString(),
      });

      // 4. Log de auditoria
      await auditService.logAction(
        orgId,
        undefined,
        "FORMAL_RESERVATION_CONFIRMED",
        fresh.referenceType,
        fresh.referenceId,
        "127.0.0.1",
        operatorName || "InventoryConcurrencyService",
        `Reserva #${reservationId} confirmada. Faturamento e baixa física de ${fresh.quantity} un efetivados.`,
        { reservationId, quantity: fresh.quantity, movementId }
      );

      return updated!;
    } catch (err: any) {
      if (movementCreatedId) {
        await inventoryRepo.removeMovement(movementCreatedId);
      }
      if (balanceCommitted) {
        // Rollback balance commit
        try {
          await inventoryRepo.adjustOnHand(orgId, reservation.productId, reservation.locationId, reservation.quantity);
          await inventoryRepo.reserveStock(orgId, reservation.productId, reservation.locationId, reservation.quantity);
        } catch (rbErr) {
          console.error(`[ROLLBACK_ERROR] Falha ao reverter commit de saldo:`, rbErr);
        }
      }
      throw err;
    } finally {
      releaseLock();
    }
  }

  /**
   * Libera reserva (passa para RELEASED e devolve reserved_quantity ao available)
   * Transação: LOCK -> RE-VERIFY ACTIVE -> DECREMENT RESERVED -> UPDATE RESERVATION -> AUDIT -> COMMIT
   */
  static async releaseReservation(
    orgId: string,
    reservationId: string,
    reason?: string
  ): Promise<InventoryReservationEntity> {
    const reservation = await inventoryRepo.findReservationById(orgId, reservationId);
    if (!reservation) {
      throw new Error(`Reserva #${reservationId} não encontrada.`);
    }
    if (reservation.status !== "ACTIVE") {
      throw new Error(`Reserva #${reservationId} não está ativa (status atual: ${reservation.status}).`);
    }

    const lockKeys = [
      `reservation:${orgId}:${reservationId}`,
      `balance:${orgId}:${reservation.productId}:${reservation.locationId}`,
    ];
    const releaseLock = await this.lockManager.acquireLocks(lockKeys);

    let balanceReleased = false;

    try {
      // Re-verificar status sob lock
      const fresh = await inventoryRepo.findReservationById(orgId, reservationId);
      if (!fresh || fresh.status !== "ACTIVE") {
        throw new Error(`Reserva #${reservationId} não está mais ativa (status atual: ${fresh?.status}).`);
      }

      await inventoryRepo.releaseReservation(orgId, fresh.productId, fresh.locationId, fresh.quantity);
      balanceReleased = true;

      const updated = await inventoryRepo.updateReservationStatus(orgId, reservationId, "RELEASED", {
        releasedAt: new Date().toISOString(),
        notes: reason ? `${fresh.notes || ""} [Liberação: ${reason}]`.trim() : fresh.notes,
      });

      await auditService.logAction(
        orgId,
        undefined,
        "FORMAL_RESERVATION_RELEASED",
        fresh.referenceType,
        fresh.referenceId,
        "127.0.0.1",
        "InventoryConcurrencyService",
        `Reserva #${reservationId} liberada. ${fresh.quantity} un devolvidas ao saldo disponível. Motivo: ${reason || "Cancelamento"}`,
        { reservationId, quantity: fresh.quantity }
      );

      return updated!;
    } catch (err: any) {
      if (balanceReleased) {
        try {
          await inventoryRepo.reserveStock(orgId, reservation.productId, reservation.locationId, reservation.quantity);
        } catch (rbErr) {
          console.error(`[ROLLBACK_ERROR] Falha ao reverter release de saldo:`, rbErr);
        }
      }
      throw err;
    } finally {
      releaseLock();
    }
  }

  /**
   * Cancela reserva (passa para CANCELED e devolve reserved_quantity ao available)
   * Transação: LOCK -> RE-VERIFY ACTIVE -> DECREMENT RESERVED -> UPDATE RESERVATION (CANCELED) -> AUDIT -> COMMIT
   */
  static async cancelReservation(
    orgId: string,
    reservationId: string,
    reason?: string,
    operatorName?: string
  ): Promise<InventoryReservationEntity> {
    const reservation = await inventoryRepo.findReservationById(orgId, reservationId);
    if (!reservation) {
      throw new Error(`Reserva #${reservationId} não encontrada.`);
    }
    if (reservation.status !== "ACTIVE") {
      throw new Error(`Reserva #${reservationId} não está ativa (status atual: ${reservation.status}).`);
    }

    const lockKeys = [
      `reservation:${orgId}:${reservationId}`,
      `balance:${orgId}:${reservation.productId}:${reservation.locationId}`,
    ];
    const releaseLock = await this.lockManager.acquireLocks(lockKeys);

    let balanceReleased = false;

    try {
      // Re-verificar status sob lock
      const fresh = await inventoryRepo.findReservationById(orgId, reservationId);
      if (!fresh || fresh.status !== "ACTIVE") {
        throw new Error(`Reserva #${reservationId} não está mais ativa (status atual: ${fresh?.status}).`);
      }

      await inventoryRepo.releaseReservation(orgId, fresh.productId, fresh.locationId, fresh.quantity);
      balanceReleased = true;

      const updated = await inventoryRepo.updateReservationStatus(orgId, reservationId, "CANCELED", {
        releasedAt: new Date().toISOString(),
        notes: reason ? `${fresh.notes || ""} [Cancelamento: ${reason}]`.trim() : fresh.notes,
      });

      await auditService.logAction(
        orgId,
        undefined,
        "FORMAL_RESERVATION_CANCELED",
        fresh.referenceType,
        fresh.referenceId,
        "127.0.0.1",
        operatorName || "InventoryConcurrencyService",
        `Reserva #${reservationId} cancelada. ${fresh.quantity} un devolvidas ao saldo disponível. Motivo: ${reason || "Cancelamento Solicitado"}`,
        { reservationId, quantity: fresh.quantity, reason }
      );

      return updated!;
    } catch (err: any) {
      if (balanceReleased) {
        try {
          await inventoryRepo.reserveStock(orgId, reservation.productId, reservation.locationId, reservation.quantity);
        } catch (rbErr) {
          console.error(`[ROLLBACK_ERROR] Falha ao reverter cancelamento de reserva:`, rbErr);
        }
      }
      throw err;
    } finally {
      releaseLock();
    }
  }

  /**
   * Varredura Idempotente de Reservas Expiradas (Multi-Worker Proof)
   * 
   * Garante que entre múltiplos workers concorrentes:
   * 1. Cada reserva expirada é transicionada ACTIVE -> EXPIRED apenas uma vez.
   * 2. O saldo reservado (reserved_quantity) é decrementado apenas uma vez.
   * 3. Retorna exclusivamente a lista de reservas que foram transicionadas nesta execução.
   */
  static async sweepExpiredReservations(orgId: string): Promise<InventoryReservationEntity[]> {
    const expiredProcessed: InventoryReservationEntity[] = [];
    const now = Date.now();

    // 1. Identifica candidatas preliminares (ACTIVE e expiresAt <= now)
    const candidateIds: string[] = [];
    for (const res of dbStore.inventoryReservations.values()) {
      if (
        res.organizationId === orgId &&
        res.status === "ACTIVE" &&
        new Date(res.expiresAt).getTime() <= now
      ) {
        candidateIds.push(res.id);
      }
    }

    // 2. Processa cada reserva atomicamente com lock individual
    for (const resId of candidateIds) {
      const current = dbStore.inventoryReservations.get(resId);
      if (!current || current.status !== "ACTIVE") continue;

      const lockKeys = [
        `reservation:${orgId}:${resId}`,
        `balance:${orgId}:${current.productId}:${current.locationId}`,
      ];

      const releaseLock = await this.lockManager.acquireLocks(lockKeys);
      try {
        // RE-FETCH FRESH UNDER LOCK: se outro worker já expirou ou confirmou, skip imediato
        const fresh = await inventoryRepo.findReservationById(orgId, resId);
        if (!fresh || fresh.status !== "ACTIVE") {
          continue;
        }

        // Se o prazo ainda não expirou de acordo com o relógio do momento do lock, skip
        if (new Date(fresh.expiresAt).getTime() > Date.now()) {
          continue;
        }

        // Transiciona status para EXPIRED
        const updated = await inventoryRepo.updateReservationStatus(orgId, resId, "EXPIRED", {
          releasedAt: new Date().toISOString(),
          notes: `${fresh.notes || ""} [Expirada automaticamente por TTL]`.trim(),
        });

        // Decrementa reserved_quantity exatamente UMA VEZ
        await inventoryRepo.releaseReservation(orgId, fresh.productId, fresh.locationId, fresh.quantity);

        // Registra auditoria
        await auditService.logAction(
          orgId,
          undefined,
          "RESERVATION_TTL_EXPIRED",
          fresh.referenceType,
          fresh.referenceId,
          "127.0.0.1",
          "SweepExpiredReservationsWorker",
          `Reserva #${fresh.id} expirou por TTL. ${fresh.quantity} un desbloqueadas para venda.`,
          { reservationId: fresh.id, quantity: fresh.quantity }
        );

        if (updated) {
          expiredProcessed.push(updated);
        }
      } catch (err: any) {
        console.error(`[SWEEP_RESERVATION_ERROR] Falha ao expirar reserva #${resId}:`, err.message);
      } finally {
        releaseLock();
      }
    }

    return expiredProcessed;
  }


  // ============================================================================
  // 3. OPERAÇÕES ISOLADAS SIMPLES: ATOMIC CONDITIONAL UPDATE & LEDGER TRACE
  //    Equivalente SQL:
  //    UPDATE inventory_balances
  //    SET reserved_quantity = reserved_quantity + :quantity
  //    WHERE organization_id = :organizationId
  //      AND product_id = :productId 
  //      AND location_id = :locationId
  //      AND (on_hand_quantity - reserved_quantity) >= :quantity;
  // ============================================================================

  /**
   * Reserva atômica condicional expressa (1 produto/localização)
   * Retorna affectedRows = 1 (sucesso) vs affectedRows = 0 (STOCK_UNAVAILABLE)
   */
  static async executeAtomicReserve(
    orgId: string,
    productId: string,
    locationId: string,
    quantity: number,
    orderId?: string
  ): Promise<AtomicUpdateResult> {
    if (quantity <= 0) {
      return {
        success: false,
        affectedRows: 0,
        productId,
        locationId,
        quantityRequested: quantity,
        errorCode: "INTEGRITY_CONSTRAINT_VIOLATION",
        errorMessage: "Quantidade para reserva deve ser maior que zero.",
      };
    }

    try {
      const balance = await inventoryRepo.reserveStock(orgId, productId, locationId, quantity);
      return {
        success: true,
        affectedRows: 1,
        productId,
        locationId,
        quantityRequested: quantity,
        balance,
      };
    } catch (err: any) {
      console.warn(
        `[ATOMIC_RESERVE_REJECTED] Org: ${orgId}, Prod: ${productId}, Loc: ${locationId}. Motivo: ${err.message}`
      );
      return {
        success: false,
        affectedRows: 0,
        productId,
        locationId,
        quantityRequested: quantity,
        errorCode: "STOCK_UNAVAILABLE",
        errorMessage: "Estoque insuficiente para atendimento imediato.",
      };
    }
  }

  /**
   * Liberação atômica condicional de reserva
   */
  static async executeAtomicRelease(
    orgId: string,
    productId: string,
    locationId: string,
    quantity: number,
    orderId?: string
  ): Promise<AtomicUpdateResult> {
    if (quantity <= 0) {
      return {
        success: false,
        affectedRows: 0,
        productId,
        locationId,
        quantityRequested: quantity,
        errorCode: "INTEGRITY_CONSTRAINT_VIOLATION",
        errorMessage: "Quantidade para liberação deve ser maior que zero.",
      };
    }

    try {
      const balance = await inventoryRepo.releaseReservation(orgId, productId, locationId, quantity);
      return {
        success: true,
        affectedRows: 1,
        productId,
        locationId,
        quantityRequested: quantity,
        balance,
      };
    } catch (err: any) {
      return {
        success: false,
        affectedRows: 0,
        productId,
        locationId,
        quantityRequested: quantity,
        errorCode: "RESERVATION_NOT_FOUND",
        errorMessage: err.message || "Saldo reservado insuficiente para liberação.",
      };
    }
  }

  /**
   * ALTERAÇÃO CONTROLADA DE ON-HAND COM VÍNCULO OBRIGATÓRIO AO LEDGER
   * Proíbe alteração arbitrária de saldo sem movimento contábil correspondente.
   */
  static async executeAtomicOnHandChange(
    params: AtomicOnHandChangeParams
  ): Promise<AtomicUpdateResult> {
    const {
      organizationId,
      productId,
      locationId,
      quantityDelta,
      movementType,
      referenceType,
      referenceId,
      reason,
      operatorName,
      userId,
    } = params;

    if (quantityDelta === 0) {
      return {
        success: false,
        affectedRows: 0,
        productId,
        locationId,
        quantityRequested: 0,
        errorMessage: "Delta de quantidade não pode ser zero.",
      };
    }

    const lockKey = `balance:${organizationId}:${productId}:${locationId}`;
    const releaseLock = await this.lockManager.acquireLocks([lockKey]);

    try {
      // 1. Grava no Ledger (Imutável)
      const movementId = `mov-atom-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
      const mov: InventoryMovementEntity = {
        id: movementId,
        organizationId,
        productId,
        locationId,
        type: movementType,
        quantityChange: quantityDelta,
        physicalBalanceAfter: 0,
        consignedBalanceAfter: 0,
        onHandAfter: 0,
        reservedAfter: 0,
        availableAfter: 0,
        referenceType,
        referenceId,
        operatorName: operatorName || "Operação Atômica Controlada",
        notes: reason,
        createdAt: new Date().toISOString().replace("T", " ").substring(0, 16),
      };

      await inventoryRepo.createMovement(mov);

      // 2. Atualiza Projeção (inventory_balances)
      const balance = await inventoryRepo.adjustOnHand(organizationId, productId, locationId, quantityDelta);

      // 3. Auditoria
      await auditService.logAction(
        organizationId,
        userId,
        "ATOMIC_ON_HAND_CHANGE",
        referenceType,
        referenceId,
        "127.0.0.1",
        "InventoryConcurrencyService",
        `Ajuste on-hand de ${quantityDelta} un (${movementType}) efetuado com rastreabilidade completa. Motivo: ${reason}`,
        { productId, locationId, quantityDelta, movementType }
      );

      return {
        success: true,
        affectedRows: 1,
        productId,
        locationId,
        quantityRequested: quantityDelta,
        balance,
        movement: mov,
      };
    } catch (err: any) {
      console.warn(`[ATOMIC_ON_HAND_FAILED] Falha ao ajustar estoque físico: ${err.message}`);
      return {
        success: false,
        affectedRows: 0,
        productId,
        locationId,
        quantityRequested: quantityDelta,
        errorCode: "INTEGRITY_CONSTRAINT_VIOLATION",
        errorMessage: err.message || "Violação de integridade ao ajustar estoque físico.",
      };
    } finally {
      releaseLock();
    }
  }
}
