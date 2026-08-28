import { dbStore } from "../../db/store";
import { inventoryRepo } from "./inventory.repository";
import { InventoryConcurrencyService } from "./inventoryConcurrency.service";
import { auditService } from "../../services/auditService";
import { InventoryReservationEntity } from "./inventory.types";

export interface ReservationExpiryWorkerConfig {
  /** Polling interval in milliseconds (default: 30000ms = 30s) */
  intervalMs: number;
  /** Default fallback TTL in minutes if not specified on individual reservation */
  defaultTtlMinutes: number;
  /** Whether the background worker timer is actively running */
  enabled: boolean;
  /** Automatically trigger stock reconciliation after expiring reservations */
  autoReconcile: boolean;
  /** Maximum reservations to process in a single batch to prevent event-loop starvation */
  maxBatchSize: number;
}

export interface ReconciledBalanceRecord {
  organizationId: string;
  productId: string;
  locationId: string;
  previousReserved: number;
  calculatedActiveSum: number;
  divergenceFound: boolean;
  corrected: boolean;
  onHandQuantity: number;
  newReservedQuantity: number;
  newAvailableQuantity: number;
}

export interface ExpiryCycleResult {
  cycleId: string;
  startedAt: string;
  finishedAt: string;
  durationMs: number;
  organizationsChecked: number;
  totalExpired: number;
  expiredReservations: Array<{
    id: string;
    organizationId: string;
    productId: string;
    locationId: string;
    quantity: number;
    referenceType: string;
    referenceId?: string;
    expiredAt: string;
  }>;
  reconciliations: ReconciledBalanceRecord[];
  errors: string[];
}

export interface WorkerStats {
  status: "RUNNING" | "STOPPED" | "PAUSED";
  uptimeSeconds: number;
  startedAt: string | null;
  lastRunAt: string | null;
  nextRunAt: string | null;
  totalCycles: number;
  totalReservationsExpired: number;
  totalReconciliationsPerformed: number;
  totalDivergencesRepaired: number;
  config: ReservationExpiryWorkerConfig;
  lastCycleResult: ExpiryCycleResult | null;
}

/**
 * Background Worker / Cron Task for Automatic Inventory Reservation Expiry & Stock Reconciliation.
 * 
 * Key Responsibilities:
 * 1. Continuously monitors the `inventory_reservations` table across all active tenants.
 * 2. Identifies 'ACTIVE' reservations where `expires_at <= NOW()` (or exceeding configured TTL).
 * 3. Uses PostgreSQL-compatible row-level locks to atomically set status to 'EXPIRED' and release `reserved_quantity`.
 * 4. Triggers an automatic Stock Reconciliation to ensure `reserved_quantity` in `inventory_balances`
 *    matches the true sum of remaining `ACTIVE` reservations (`SUM(quantity)`), repairing any divergence.
 * 5. Provides comprehensive telemetry, manual trigger, and runtime configuration APIs.
 */
export class ReservationExpiryWorker {
  private static instance: ReservationExpiryWorker;

  private config: ReservationExpiryWorkerConfig = {
    intervalMs: parseInt(process.env.RESERVATION_SWEEP_INTERVAL_MS || "30000", 10),
    defaultTtlMinutes: parseInt(process.env.DEFAULT_RESERVATION_TTL_MINUTES || "15", 10),
    enabled: process.env.ENABLE_RESERVATION_EXPIRY_WORKER !== "false",
    autoReconcile: true,
    maxBatchSize: 100,
  };

  private timer: NodeJS.Timeout | null = null;
  private isProcessing = false;
  private startedAt: Date | null = null;
  private lastRunAt: Date | null = null;
  private totalCycles = 0;
  private totalReservationsExpired = 0;
  private totalReconciliationsPerformed = 0;
  private totalDivergencesRepaired = 0;
  private lastCycleResult: ExpiryCycleResult | null = null;
  private recentHistory: ExpiryCycleResult[] = [];
  private maxHistorySize = 50;

  private constructor() {}

  public static getInstance(): ReservationExpiryWorker {
    if (!ReservationExpiryWorker.instance) {
      ReservationExpiryWorker.instance = new ReservationExpiryWorker();
    }
    return ReservationExpiryWorker.instance;
  }

  /**
   * Starts the background cron/interval task.
   */
  public start(): void {
    if (this.timer) {
      return;
    }

    this.startedAt = new Date();
    console.log(
      `🕒 [ReservationExpiryWorker] Iniciado com intervalo de ${this.config.intervalMs}ms (TTL padrão: ${this.config.defaultTtlMinutes}m, AutoReconcile: ${this.config.autoReconcile}).`
    );

    // Initial check after 2 seconds to allow full server warm-up
    setTimeout(() => {
      if (this.config.enabled) {
        this.runSweepCycle().catch((err) => {
          console.error(`[ReservationExpiryWorker] Erro no ciclo inicial:`, err);
        });
      }
    }, 2000);

    this.timer = setInterval(() => {
      if (this.config.enabled && !this.isProcessing) {
        this.runSweepCycle().catch((err) => {
          console.error(`[ReservationExpiryWorker] Erro durante o ciclo periódico:`, err);
        });
      }
    }, this.config.intervalMs);
  }

  /**
   * Stops the background worker timer.
   */
  public stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
      console.log(`🛑 [ReservationExpiryWorker] Parado.`);
    }
  }

  /**
   * Reconfigures worker parameters at runtime.
   */
  public updateConfig(newConfig: Partial<ReservationExpiryWorkerConfig>): ReservationExpiryWorkerConfig {
    const prevInterval = this.config.intervalMs;
    const prevEnabled = this.config.enabled;

    this.config = {
      ...this.config,
      ...newConfig,
    };

    // If interval changed or enabled toggled, restart timer
    if (this.timer && (newConfig.intervalMs !== undefined && newConfig.intervalMs !== prevInterval || newConfig.enabled !== undefined && newConfig.enabled !== prevEnabled)) {
      this.stop();
      if (this.config.enabled) {
        this.start();
      }
    }

    return { ...this.config };
  }

  public getConfig(): ReservationExpiryWorkerConfig {
    return { ...this.config };
  }

  /**
   * Executes a complete sweep and stock reconciliation cycle.
   * Can be invoked by the timer or manually via REST API / test suites.
   */
  public async runSweepCycle(targetOrgId?: string): Promise<ExpiryCycleResult> {
    if (this.isProcessing) {
      console.warn(`[ReservationExpiryWorker] Ciclo anterior ainda em execução. Pulando tick.`);
      return (
        this.lastCycleResult || {
          cycleId: `skip-${Date.now()}`,
          startedAt: new Date().toISOString(),
          finishedAt: new Date().toISOString(),
          durationMs: 0,
          organizationsChecked: 0,
          totalExpired: 0,
          expiredReservations: [],
          reconciliations: [],
          errors: ["Ciclo anterior ainda em execução."],
        }
      );
    }

    this.isProcessing = true;
    const startTime = Date.now();
    const cycleId = `cycle-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const errors: string[] = [];
    const expiredList: ExpiryCycleResult["expiredReservations"] = [];
    const reconciliationsList: ReconciledBalanceRecord[] = [];

    try {
      // 1. Coleta organizações ativas
      const orgIds = new Set<string>();
      if (targetOrgId) {
        orgIds.add(targetOrgId);
      } else {
        for (const org of dbStore.organizations.values()) {
          orgIds.add(org.id);
        }
        for (const res of dbStore.inventoryReservations.values()) {
          orgIds.add(res.organizationId);
        }
      }

      const now = Date.now();

      // 2. Itera por organização processando reservas expiradas sob lock
      for (const orgId of orgIds) {
        try {
          const expiredInOrg = await this.processExpiredReservationsForOrg(orgId, now);
          for (const exp of expiredInOrg) {
            expiredList.push({
              id: exp.id,
              organizationId: exp.organizationId,
              productId: exp.productId,
              locationId: exp.locationId,
              quantity: exp.quantity,
              referenceType: exp.referenceType,
              referenceId: exp.referenceId,
              expiredAt: new Date().toISOString(),
            });
          }

          // 3. Trigger Stock Reconciliation
          if (this.config.autoReconcile) {
            // Se houve reservas expiradas, reconcilia os produtos/locais afetados ou todos da organização
            const affectedProductIds = new Set<string>(expiredInOrg.map((r) => r.productId));
            const orgReconcileResults = await this.reconcileOrgReservationsAndBalances(
              orgId,
              affectedProductIds.size > 0 ? Array.from(affectedProductIds) : undefined
            );
            reconciliationsList.push(...orgReconcileResults);
          }
        } catch (orgErr: any) {
          const msg = `Falha ao processar organização #${orgId}: ${orgErr.message}`;
          console.error(`[ReservationExpiryWorker] ${msg}`, orgErr);
          errors.push(msg);
        }
      }

      const durationMs = Date.now() - startTime;
      const cycleResult: ExpiryCycleResult = {
        cycleId,
        startedAt: new Date(startTime).toISOString(),
        finishedAt: new Date().toISOString(),
        durationMs,
        organizationsChecked: orgIds.size,
        totalExpired: expiredList.length,
        expiredReservations: expiredList,
        reconciliations: reconciliationsList,
        errors,
      };

      // Atualiza métricas
      this.totalCycles += 1;
      this.totalReservationsExpired += expiredList.length;
      this.totalReconciliationsPerformed += reconciliationsList.length;
      const repairedCount = reconciliationsList.filter((r) => r.corrected).length;
      this.totalDivergencesRepaired += repairedCount;
      this.lastRunAt = new Date();
      this.lastCycleResult = cycleResult;

      // Mantém histórico recente
      this.recentHistory.unshift(cycleResult);
      if (this.recentHistory.length > this.maxHistorySize) {
        this.recentHistory.pop();
      }

      if (expiredList.length > 0 || repairedCount > 0) {
        console.log(
          `🧹 [ReservationExpiryWorker] Ciclo ${cycleId} concluído em ${durationMs}ms: ${expiredList.length} reservas expiradas, ${reconciliationsList.length} saldos reconciliados (${repairedCount} divergências reparadas).`
        );
      }

      return cycleResult;
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Processa reservas expiradas para uma organização específica sob row-level locks
   */
  private async processExpiredReservationsForOrg(
    orgId: string,
    now: number
  ): Promise<InventoryReservationEntity[]> {
    const expiredProcessed: InventoryReservationEntity[] = [];

    // Identifica candidatas preliminares (ACTIVE e com expiresAt <= now)
    const candidateIds: string[] = [];
    for (const res of dbStore.inventoryReservations.values()) {
      if (res.organizationId !== orgId || res.status !== "ACTIVE") continue;

      const expiryTime = new Date(res.expiresAt).getTime();
      const isExpired = expiryTime <= now;

      if (isExpired) {
        candidateIds.push(res.id);
        if (candidateIds.length >= this.config.maxBatchSize) break;
      }
    }

    if (candidateIds.length === 0) {
      return [];
    }

    // Processa cada reserva atômica com locks determinísticos
    for (const resId of candidateIds) {
      const current = dbStore.inventoryReservations.get(resId);
      if (!current || current.status !== "ACTIVE") continue;

      const lockKeys = [
        `reservation:${orgId}:${resId}`,
        `balance:${orgId}:${current.productId}:${current.locationId}`,
      ];

      const releaseLock = await InventoryConcurrencyService.lockManager.acquireLocks(lockKeys);
      let balanceReleased = false;

      try {
        // Re-verificar status sob lock para evitar concorrência com pagamento simultâneo
        const fresh = await inventoryRepo.findReservationById(orgId, resId);
        if (!fresh || fresh.status !== "ACTIVE") {
          continue;
        }

        if (new Date(fresh.expiresAt).getTime() > Date.now()) {
          continue;
        }

        // 1. Decrementa reserved_quantity
        await inventoryRepo.releaseReservation(orgId, fresh.productId, fresh.locationId, fresh.quantity);
        balanceReleased = true;

        // 2. Atualiza registro na tabela inventory_reservations para EXPIRED
        const updated = await inventoryRepo.updateReservationStatus(orgId, resId, "EXPIRED", {
          releasedAt: new Date().toISOString(),
          notes: `${fresh.notes || ""} [Expirada automaticamente pelo Background Worker (TTL excedido)]`.trim(),
        });

        // 3. Registra auditoria transacional
        await auditService.logAction(
          orgId,
          undefined,
          "RESERVATION_TTL_EXPIRED",
          fresh.referenceType,
          fresh.referenceId,
          "127.0.0.1",
          "ReservationExpiryWorker",
          `Reserva #${fresh.id} expirou por TTL. ${fresh.quantity} un devolvidas ao saldo disponível.`,
          {
            reservationId: fresh.id,
            productId: fresh.productId,
            locationId: fresh.locationId,
            quantity: fresh.quantity,
            expiresAt: fresh.expiresAt,
          }
        );

        if (updated) {
          expiredProcessed.push(updated);
        }
      } catch (err: any) {
        if (balanceReleased) {
          try {
            await inventoryRepo.reserveStock(orgId, current.productId, current.locationId, current.quantity);
          } catch (rbErr) {
            console.error(`[ROLLBACK_ERROR] Falha ao reverter expiração de reserva:`, rbErr);
          }
        }
        console.error(`[ReservationExpiryWorker] Erro ao expirar reserva #${resId}:`, err.message);
      } finally {
        releaseLock();
      }
    }

    return expiredProcessed;
  }

  /**
   * Reconcilia a integridade dos saldos com a soma das reservas ativas em `inventory_reservations`.
   * Verifica se `inventory_balances.reserved_quantity == SUM(ACTIVE reservations)` e repara divergências.
   */
  public async reconcileOrgReservationsAndBalances(
    orgId: string,
    filterProductIds?: string[]
  ): Promise<ReconciledBalanceRecord[]> {
    const results: ReconciledBalanceRecord[] = [];

    // 1. Calcula a soma real de reservas ativas agrupadas por (productId, locationId)
    const activeSums = new Map<string, number>(); // key: `${productId}:::${locationId}`
    const productLocations = new Set<string>();

    for (const res of dbStore.inventoryReservations.values()) {
      if (res.organizationId !== orgId || res.status !== "ACTIVE") continue;
      if (filterProductIds && filterProductIds.length > 0 && !filterProductIds.includes(res.productId)) continue;

      const key = `${res.productId}:::${res.locationId}`;
      const current = activeSums.get(key) || 0;
      activeSums.set(key, current + res.quantity);
      productLocations.add(key);
    }

    // 2. Coleta todos os registros de saldo existentes
    for (const bal of dbStore.inventoryBalances.values()) {
      if (bal.organizationId !== orgId) continue;
      if (filterProductIds && filterProductIds.length > 0 && !filterProductIds.includes(bal.productId)) continue;

      const key = `${bal.productId}:::${bal.locationId}`;
      productLocations.add(key);
    }

    // 3. Valida e reconcilia cada par (productId, locationId) sob lock
    for (const key of productLocations) {
      const [productId, locationId] = key.split(":::");
      const expectedReserved = activeSums.get(key) || 0;

      const lockKey = `balance:${orgId}:${productId}:${locationId}`;
      const releaseLock = await InventoryConcurrencyService.lockManager.acquireLocks([lockKey]);

      try {
        let bal = await inventoryRepo.getBalance(orgId, productId, locationId);
        if (!bal) {
          if (expectedReserved > 0) {
            // Cria registro se houver reservas ativas órfãs
            bal = {
              id: `bal-${productId}-${locationId}`,
              organizationId: orgId,
              productId,
              locationId,
              onHandQuantity: expectedReserved,
              reservedQuantity: expectedReserved,
              availableQuantity: 0,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            };
            await inventoryRepo.upsertBalance(bal);
            results.push({
              organizationId: orgId,
              productId,
              locationId,
              previousReserved: 0,
              calculatedActiveSum: expectedReserved,
              divergenceFound: true,
              corrected: true,
              onHandQuantity: bal.onHandQuantity,
              newReservedQuantity: expectedReserved,
              newAvailableQuantity: 0,
            });
          }
          continue;
        }

        const prevReserved = bal.reservedQuantity;
        const divergenceFound = prevReserved !== expectedReserved || bal.availableQuantity !== (bal.onHandQuantity - prevReserved);

        if (divergenceFound) {
          const newReserved = expectedReserved;
          const newAvailable = Math.max(0, bal.onHandQuantity - newReserved);

          const correctedBal = {
            ...bal,
            reservedQuantity: newReserved,
            availableQuantity: newAvailable,
            updatedAt: new Date().toISOString(),
          };

          await inventoryRepo.upsertBalance(correctedBal);

          await auditService.logAction(
            orgId,
            undefined,
            "INVENTORY_RECONCILIATION_REPAIR",
            "RESERVATION_TABLE",
            `bal-${productId}-${locationId}`,
            "127.0.0.1",
            "ReservationExpiryWorker",
            `Reconciliação automática: divergência reparada em (${productId}, ${locationId}). Reservado anterior: ${prevReserved}, Corrigido: ${newReserved}. Disponível: ${newAvailable}.`,
            { productId, locationId, previousReserved: prevReserved, newReserved, onHandQuantity: bal.onHandQuantity }
          );

          results.push({
            organizationId: orgId,
            productId,
            locationId,
            previousReserved: prevReserved,
            calculatedActiveSum: expectedReserved,
            divergenceFound: true,
            corrected: true,
            onHandQuantity: bal.onHandQuantity,
            newReservedQuantity: newReserved,
            newAvailableQuantity: newAvailable,
          });
        } else {
          results.push({
            organizationId: orgId,
            productId,
            locationId,
            previousReserved: prevReserved,
            calculatedActiveSum: expectedReserved,
            divergenceFound: false,
            corrected: false,
            onHandQuantity: bal.onHandQuantity,
            newReservedQuantity: bal.reservedQuantity,
            newAvailableQuantity: bal.availableQuantity,
          });
        }
      } catch (recErr: any) {
        console.error(`[ReservationExpiryWorker] Erro ao reconciliar saldo ${key}:`, recErr);
      } finally {
        releaseLock();
      }
    }

    return results;
  }

  /**
   * Returns current worker status, configuration, and telemetry.
   */
  public getStats(): WorkerStats {
    let nextRunAt: string | null = null;
    if (this.timer && this.lastRunAt) {
      nextRunAt = new Date(this.lastRunAt.getTime() + this.config.intervalMs).toISOString();
    } else if (this.timer && this.startedAt) {
      nextRunAt = new Date(this.startedAt.getTime() + this.config.intervalMs).toISOString();
    }

    return {
      status: this.timer ? (this.config.enabled ? "RUNNING" : "PAUSED") : "STOPPED",
      uptimeSeconds: this.startedAt ? Math.floor((Date.now() - this.startedAt.getTime()) / 1000) : 0,
      startedAt: this.startedAt ? this.startedAt.toISOString() : null,
      lastRunAt: this.lastRunAt ? this.lastRunAt.toISOString() : null,
      nextRunAt,
      totalCycles: this.totalCycles,
      totalReservationsExpired: this.totalReservationsExpired,
      totalReconciliationsPerformed: this.totalReconciliationsPerformed,
      totalDivergencesRepaired: this.totalDivergencesRepaired,
      config: { ...this.config },
      lastCycleResult: this.lastCycleResult,
    };
  }

  /**
   * Returns execution history of recent cycles.
   */
  public getHistory(): ExpiryCycleResult[] {
    return [...this.recentHistory];
  }
}

export const reservationExpiryWorker = ReservationExpiryWorker.getInstance();
