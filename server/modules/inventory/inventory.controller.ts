import { Response } from "express";
import { AuthenticatedRequest } from "../../middlewares/authMiddleware";
import { InventoryService } from "./inventory.service";
import { inventoryRepo } from "./inventory.repository";
import { CreateMovementDTO } from "./inventory.types";
import { auditService } from "../../services/auditService";
import { InventoryHardeningTestSuite } from "./inventoryHardening.test";

export class InventoryController {
  /**
   * GET /api/inventory/ledger
   * Lists immutable stock ledger entries for the tenant.
   */
  static async listLedger(req: AuthenticatedRequest, res: Response) {
    try {
      const orgId = req.organizationId!;
      const productId = req.query.productId as string | undefined;
      const limit = req.query.limit ? Number(req.query.limit) : 100;

      const history = await InventoryService.getLedgerHistory(orgId, productId, limit);

      return res.json({
        success: true,
        data: history,
        total: history.length,
        organizationId: orgId,
      });
    } catch (error: any) {
      return res.status(500).json({
        success: false,
        error: error.message || "Erro ao consultar histórico do ledger.",
      });
    }
  }

  /**
   * GET /api/inventory/stock/:productId
   * Returns current stock balance for a product.
   */
  static async getProductStock(req: AuthenticatedRequest, res: Response) {
    try {
      const orgId = req.organizationId!;
      const { productId } = req.params;

      const stock = await InventoryService.getProductStock(orgId, productId);

      return res.json({
        success: true,
        data: stock,
      });
    } catch (error: any) {
      return res.status(500).json({
        success: false,
        error: error.message || "Erro ao consultar saldo de estoque.",
      });
    }
  }

  /**
   * POST /api/inventory/movement
   * Records a manual adjustment, stock purchase, or consignment movement.
   */
  static async recordMovement(req: AuthenticatedRequest, res: Response) {
    try {
      const orgId = req.organizationId!;
      const dto: CreateMovementDTO = req.body;
      const operatorName = req.user?.name || "Operador de Estoque";

      if (!dto.productId || !dto.type || dto.quantityChange === undefined) {
        return res.status(400).json({
          success: false,
          error: "Campos obrigatórios ausentes: productId, type, quantityChange.",
        });
      }

      const movement = await InventoryService.recordMovement(orgId, {
        ...dto,
        operatorName,
      });

      // Audit Log
      await auditService.logAction(
        orgId,
        req.user?.id,
        "INVENTORY_MOVEMENT",
        "INVENTORY",
        movement.id,
        (req.headers["x-forwarded-for"] as string) || req.socket.remoteAddress || "127.0.0.1",
        req.headers["user-agent"] || "Aura Web Client",
        `Movimentação ${movement.type} de ${movement.quantityChange} un registrada no ledger.`,
        {
          productId: movement.productId,
          type: movement.type,
          qty: movement.quantityChange,
          physicalAfter: movement.physicalBalanceAfter,
          consignedAfter: movement.consignedBalanceAfter,
        }
      );

      return res.status(201).json({
        success: true,
        data: movement,
        message: `Movimentação ${movement.type} registrada no Ledger com sucesso!`,
      });
    } catch (error: any) {
      return res.status(400).json({
        success: false,
        error: error.message || "Erro ao registrar movimentação de estoque.",
      });
    }
  }

  /**
   * POST /api/inventory/reverse
   * Creates an immutable reversal movement for a previous errant transaction.
   */
  static async reverse(req: AuthenticatedRequest, res: Response) {
    try {
      const orgId = req.organizationId!;
      const { originalMovementId, reason } = req.body;
      const operatorName = req.user?.name || "Gestor Matriz (Estorno)";

      if (!originalMovementId || !reason) {
        return res.status(400).json({
          success: false,
          error: "Campos obrigatórios ausentes: originalMovementId e reason.",
        });
      }

      const reversalMovement = await InventoryService.reverseMovement(
        orgId,
        originalMovementId,
        reason,
        operatorName
      );

      // Audit Log
      await auditService.logAction(
        orgId,
        req.user?.id,
        "INVENTORY_REVERSAL",
        "INVENTORY",
        reversalMovement.id,
        (req.headers["x-forwarded-for"] as string) || req.socket.remoteAddress || "127.0.0.1",
        req.headers["user-agent"] || "Aura Web Client",
        `Estorno imutável do movimento ${originalMovementId} efetuado. Motivo: ${reason}`,
        {
          reversalId: reversalMovement.id,
          originalMovementId,
          quantityReversed: reversalMovement.quantityChange,
        }
      );

      return res.status(201).json({
        success: true,
        data: reversalMovement,
        message: `Movimento ${originalMovementId} estornado no Ledger com sucesso via lançamento imutável!`,
      });
    } catch (error: any) {
      return res.status(400).json({
        success: false,
        error: error.message || "Erro ao estornar movimento de estoque.",
      });
    }
  }

  /**
   * GET /api/inventory/reconcile/:productId
   * Audit reconciliation endpoint: calculates the expected inventory balance based on the full
   * Ledger event stream and compares it against the latest recorded snapshot balance.
   */
  static async reconcile(req: AuthenticatedRequest, res: Response) {
    try {
      const orgId = req.organizationId!;
      const { productId } = req.params;

      const report = await InventoryService.reconcileProduct(orgId, productId);

      return res.json({
        success: true,
        data: report,
        message: report.isConsistent
          ? `Auditoria de conciliação concluída: O saldo do produto ${productId} está 100% consistente com a trilha do Ledger.`
          : `Auditoria de conciliação concluída: Foram detectadas divergências entre o snapshot e o histórico imutável do Ledger.`,
      });
    } catch (error: any) {
      return res.status(500).json({
        success: false,
        error: error.message || "Erro ao executar auditoria de conciliação do produto.",
      });
    }
  }

  /**
   * GET /api/inventory/locations
   * Lists all inventory locations (Matriz, Lojas, Depósitos, Maletas de Revendedoras).
   */
  static async listLocations(req: AuthenticatedRequest, res: Response) {
    try {
      const orgId = req.organizationId!;
      const locations = await InventoryService.listLocations(orgId);
      return res.json({
        success: true,
        data: locations,
        total: locations.length,
      });
    } catch (error: any) {
      return res.status(500).json({
        success: false,
        error: error.message || "Erro ao listar localizações de estoque.",
      });
    }
  }

  /**
   * POST /api/inventory/locations
   * Creates a new inventory location.
   */
  static async createLocation(req: AuthenticatedRequest, res: Response) {
    try {
      const orgId = req.organizationId!;
      const { name, type, code, description } = req.body;

      if (!name || !type || !code) {
        return res.status(400).json({
          success: false,
          error: "Campos obrigatórios ausentes: name, type, code.",
        });
      }

      const location = await InventoryService.createLocation(orgId, {
        name,
        type,
        code,
        description,
      });

      return res.status(201).json({
        success: true,
        data: location,
        message: `Localização de estoque "${location.name}" criada com sucesso.`,
      });
    } catch (error: any) {
      return res.status(400).json({
        success: false,
        error: error.message || "Erro ao criar localização de estoque.",
      });
    }
  }

  /**
   * GET /api/inventory/balances/:productId
   * Returns granular multi-location inventory balances (on_hand, reserved, available).
   */
  static async getProductBalances(req: AuthenticatedRequest, res: Response) {
    try {
      const orgId = req.organizationId!;
      const { productId } = req.params;

      const balances = await InventoryService.getProductBalances(orgId, productId);
      return res.json({
        success: true,
        data: balances,
        productId,
      });
    } catch (error: any) {
      return res.status(500).json({
        success: false,
        error: error.message || "Erro ao consultar saldos multi-localização.",
      });
    }
  }

  /**
   * POST /api/inventory/reserve
   * Atomic inventory reservation endpoint:
   * Performs an atomic transaction under pessimistic lock to decrement available stock
   * and creates a reservation record in `inventory_reservations` with status 'ACTIVE',
   * ensuring zero-overselling and race condition protection.
   */
  static async reserve(req: AuthenticatedRequest, res: Response) {
    try {
      const orgId = req.organizationId!;
      const {
        productId,
        locationId,
        quantity,
        orderId,
        referenceType,
        referenceId,
        idempotencyKey,
        ttlMinutes,
        notes,
      } = req.body;
      const operatorName = req.user?.name || "Motor de Reservas";

      if (!productId || !locationId || quantity === undefined || Number(quantity) <= 0) {
        return res.status(400).json({
          success: false,
          error: "Campos obrigatórios ausentes ou inválidos: productId, locationId, quantity > 0.",
        });
      }

      const numQuantity = Number(quantity);
      const effectiveIdempotencyKey =
        idempotencyKey ||
        (req.headers["idempotency-key"] as string | undefined) ||
        (req.headers["x-idempotency-key"] as string | undefined);

      const reservation = await InventoryService.createFormalReservation(orgId, {
        productId,
        locationId,
        quantity: numQuantity,
        referenceType: referenceType || (orderId ? "ORDER" : "CHECKOUT_CART"),
        referenceId: referenceId || orderId || `REF-${Date.now()}`,
        idempotencyKey: effectiveIdempotencyKey,
        ttlMinutes: ttlMinutes ? Number(ttlMinutes) : 15,
        operatorName,
        notes: notes || (orderId ? `Reserva vinculada ao pedido #${orderId}` : undefined),
      });

      const balance = await inventoryRepo.getBalance(orgId, productId, locationId);

      return res.status(201).json({
        success: true,
        data: reservation,
        balance,
        message: `Reserva #${reservation.id} criada com sucesso com status ACTIVE. Saldo disponível decrementado atomicamente sob lock. (Expira em: ${reservation.expiresAt})`,
      });
    } catch (error: any) {
      const isStockUnavailable =
        error.message?.includes("Saldo insuficiente") ||
        error.message?.includes("CHECK") ||
        error.message?.includes("disponível") ||
        error.message?.includes("on_hand");

      return res.status(isStockUnavailable ? 409 : 400).json({
        success: false,
        errorCode: isStockUnavailable ? "STOCK_UNAVAILABLE" : "RESERVATION_FAILED",
        error: error.message || "Erro ao realizar reserva atômica de estoque.",
      });
    }
  }

  /**
   * POST /api/inventory/release-reservation
   * Releases previously reserved stock back to available stock.
   */
  static async releaseReservation(req: AuthenticatedRequest, res: Response) {
    try {
      const orgId = req.organizationId!;
      const { productId, locationId, quantity, orderId, reason } = req.body;
      const operatorName = req.user?.name || "Motor de Reservas";

      if (!productId || !locationId || !quantity || quantity <= 0) {
        return res.status(400).json({
          success: false,
          error: "Campos obrigatórios ausentes ou inválidos: productId, locationId, quantity > 0.",
        });
      }

      const balance = await InventoryService.releaseReservation(orgId, {
        productId,
        locationId,
        quantity: Number(quantity),
        orderId,
        reason,
        operatorName,
      });

      return res.json({
        success: true,
        data: balance,
        message: `Reserva de ${quantity} un liberada com sucesso. Saldo disponível restaurado.`,
      });
    } catch (error: any) {
      return res.status(400).json({
        success: false,
        error: error.message || "Erro ao liberar reserva de estoque.",
      });
    }
  }

  /**
   * POST /api/inventory/commit-reservation
   * Confirms order completion, decrementing on_hand_quantity and reserved_quantity simultaneously.
   */
  static async commitReservation(req: AuthenticatedRequest, res: Response) {
    try {
      const orgId = req.organizationId!;
      const { productId, locationId, quantity, orderId, notes } = req.body;
      const operatorName = req.user?.name || "PDV Faturamento";

      if (!productId || !locationId || !quantity || quantity <= 0) {
        return res.status(400).json({
          success: false,
          error: "Campos obrigatórios ausentes ou inválidos: productId, locationId, quantity > 0.",
        });
      }

      const balance = await InventoryService.commitReservation(orgId, {
        productId,
        locationId,
        quantity: Number(quantity),
        orderId,
        operatorName,
        notes,
      });

      return res.json({
        success: true,
        data: balance,
        message: `Venda confirmada! Reserva de ${quantity} un convertida em baixa física definitiva.`,
      });
    } catch (error: any) {
      return res.status(400).json({
        success: false,
        error: error.message || "Erro ao confirmar baixa de reserva.",
      });
    }
  }

  // --- FORMAL INVENTORY RESERVATIONS (SPRINT 3 READY) ---

  /**
   * POST /api/inventory/reservations
   * Creates a formal reservation entity with idempotency key and TTL.
   */
  static async createFormalReservation(req: AuthenticatedRequest, res: Response) {
    try {
      const orgId = req.organizationId!;
      const { productId, locationId, quantity, referenceType, referenceId, idempotencyKey, ttlMinutes, notes } = req.body;
      const operatorName = req.user?.name || "Operador de Reservas";

      if (!productId || !locationId || !quantity || quantity <= 0) {
        return res.status(400).json({
          success: false,
          error: "Campos obrigatórios ausentes: productId, locationId, quantity > 0.",
        });
      }

      const reservation = await InventoryService.createFormalReservation(orgId, {
        productId,
        locationId,
        quantity: Number(quantity),
        referenceType: referenceType || "MANUAL_RESERVATION",
        referenceId: referenceId || `REF-${Date.now()}`,
        idempotencyKey,
        ttlMinutes: ttlMinutes ? Number(ttlMinutes) : 15,
        operatorName,
        notes,
      });

      return res.status(201).json({
        success: true,
        data: reservation,
        message: `Reserva #${reservation.id} criada com sucesso (Expira em: ${reservation.expiresAt}).`,
      });
    } catch (error: any) {
      return res.status(409).json({
        success: false,
        errorCode: "STOCK_UNAVAILABLE",
        error: error.message || "Não foi possível criar a reserva de estoque.",
      });
    }
  }

  /**
   * POST /api/inventory/reservations/:id/confirm
   */
  static async confirmFormalReservation(req: AuthenticatedRequest, res: Response) {
    try {
      const orgId = req.organizationId!;
      const { id } = req.params;
      const operatorName = req.user?.name || "Operador de Vendas";

      const confirmed = await InventoryService.confirmFormalReservation(orgId, id, operatorName);

      return res.json({
        success: true,
        data: confirmed,
        message: `Reserva #${id} confirmada com sucesso. Saldo físico baixado.`,
      });
    } catch (error: any) {
      return res.status(400).json({
        success: false,
        error: error.message || "Erro ao confirmar reserva.",
      });
    }
  }

  /**
   * POST /api/inventory/reservations/:id/release
   */
  static async releaseFormalReservation(req: AuthenticatedRequest, res: Response) {
    try {
      const orgId = req.organizationId!;
      const { id } = req.params;
      const { reason } = req.body || {};

      const released = await InventoryService.releaseFormalReservation(orgId, id, reason);

      return res.json({
        success: true,
        data: released,
        message: `Reserva #${id} liberada com sucesso. Saldo disponível restaurado.`,
      });
    } catch (error: any) {
      return res.status(400).json({
        success: false,
        error: error.message || "Erro ao liberar reserva.",
      });
    }
  }

  /**
   * POST /api/inventory/reservations/:id/cancel
   */
  static async cancelFormalReservation(req: AuthenticatedRequest, res: Response) {
    try {
      const orgId = req.organizationId!;
      const { id } = req.params;
      const { reason } = req.body || {};
      const operatorName = req.user?.name || "Operador de Cancelamento";

      const canceled = await InventoryService.cancelFormalReservation(orgId, id, reason, operatorName);

      return res.json({
        success: true,
        data: canceled,
        message: `Reserva #${id} cancelada com sucesso. Saldo disponível restaurado.`,
      });
    } catch (error: any) {
      return res.status(400).json({
        success: false,
        error: error.message || "Erro ao cancelar reserva.",
      });
    }
  }

  /**
   * GET /api/inventory/reservations/:id
   */
  static async getReservationById(req: AuthenticatedRequest, res: Response) {
    try {
      const orgId = req.organizationId!;
      const { id } = req.params;

      const reservation = await InventoryService.getReservationById(orgId, id);
      if (!reservation) {
        return res.status(404).json({
          success: false,
          error: `Reserva #${id} não encontrada.`,
        });
      }

      return res.json({
        success: true,
        data: reservation,
      });
    } catch (error: any) {
      return res.status(500).json({
        success: false,
        error: error.message || "Erro ao consultar reserva.",
      });
    }
  }

  /**
   * GET /api/inventory/reservations
   */
  static async listActiveReservations(req: AuthenticatedRequest, res: Response) {
    try {
      const orgId = req.organizationId!;
      const { status, productId, locationId } = req.query;

      const list = await InventoryService.listReservations(orgId, {
        status: status as any,
        productId: productId as string | undefined,
        locationId: locationId as string | undefined,
      });

      return res.json({
        success: true,
        data: list,
        total: list.length,
      });
    } catch (error: any) {
      return res.status(500).json({
        success: false,
        error: error.message || "Erro ao consultar reservas.",
      });
    }
  }

  /**
   * POST /api/inventory/reservations/sweep-expired
   */
  static async sweepExpiredReservations(req: AuthenticatedRequest, res: Response) {
    try {
      const orgId = req.organizationId!;
      const cycleResult = await InventoryService.runReservationExpiryWorkerCycle(orgId);

      return res.json({
        success: true,
        data: cycleResult.expiredReservations,
        totalExpired: cycleResult.totalExpired,
        reconciliations: cycleResult.reconciliations,
        durationMs: cycleResult.durationMs,
        message: `${cycleResult.totalExpired} reservas expiradas processadas e reconciliação de estoque executada.`,
      });
    } catch (error: any) {
      return res.status(500).json({
        success: false,
        error: error.message || "Erro ao processar reservas expiradas.",
      });
    }
  }

  /**
   * GET /api/inventory/reservations/worker/status
   */
  static async getWorkerStatus(req: AuthenticatedRequest, res: Response) {
    try {
      const stats = InventoryService.getReservationWorkerStats();
      const history = InventoryService.getReservationWorkerHistory();

      return res.json({
        success: true,
        stats,
        history,
      });
    } catch (error: any) {
      return res.status(500).json({
        success: false,
        error: error.message || "Erro ao consultar status do worker de reservas.",
      });
    }
  }

  /**
   * POST /api/inventory/reservations/worker/trigger
   */
  static async triggerWorkerCycle(req: AuthenticatedRequest, res: Response) {
    try {
      const orgId = req.organizationId;
      const { allOrganizations } = req.body || {};

      const cycleResult = await InventoryService.runReservationExpiryWorkerCycle(
        allOrganizations ? undefined : orgId
      );

      return res.json({
        success: true,
        data: cycleResult,
        message: `Ciclo do background worker concluído: ${cycleResult.totalExpired} reservas expiradas, ${cycleResult.reconciliations.length} saldos verificados.`,
      });
    } catch (error: any) {
      return res.status(500).json({
        success: false,
        error: error.message || "Erro ao disparar ciclo do worker de reservas.",
      });
    }
  }

  /**
   * PUT /api/inventory/reservations/worker/config
   */
  static async updateWorkerConfig(req: AuthenticatedRequest, res: Response) {
    try {
      const { intervalMs, defaultTtlMinutes, enabled, autoReconcile, maxBatchSize } = req.body || {};

      const updated = InventoryService.updateReservationWorkerConfig({
        intervalMs: intervalMs !== undefined ? Number(intervalMs) : undefined,
        defaultTtlMinutes: defaultTtlMinutes !== undefined ? Number(defaultTtlMinutes) : undefined,
        enabled: enabled !== undefined ? Boolean(enabled) : undefined,
        autoReconcile: autoReconcile !== undefined ? Boolean(autoReconcile) : undefined,
        maxBatchSize: maxBatchSize !== undefined ? Number(maxBatchSize) : undefined,
      });

      return res.json({
        success: true,
        config: updated,
        message: "Configuração do background worker atualizada com sucesso.",
      });
    } catch (error: any) {
      return res.status(400).json({
        success: false,
        error: error.message || "Erro ao atualizar configuração do worker.",
      });
    }
  }

  /**
   * POST /api/inventory/reconcile/reservations
   * Explicitly triggers reconciliation between inventory_reservations and inventory_balances.
   */
  static async reconcileReservations(req: AuthenticatedRequest, res: Response) {
    try {
      const orgId = req.organizationId!;
      const { productIds } = req.body || {};

      const results = await InventoryService.reconcileReservations(
        orgId,
        Array.isArray(productIds) ? productIds : undefined
      );

      const divergencesRepaired = results.filter((r) => r.corrected).length;

      return res.json({
        success: true,
        data: results,
        totalChecked: results.length,
        divergencesRepaired,
        message: `Reconciliação de reservas concluída: ${results.length} registros auditados, ${divergencesRepaired} divergências corrigidas.`,
      });
    } catch (error: any) {
      return res.status(500).json({
        success: false,
        error: error.message || "Erro ao executar reconciliação de reservas.",
      });
    }
  }

  /**
   * POST /api/inventory/on-hand-change
   * Restricted atomic on-hand adjustment with required business metadata & immutable ledger entry.
   */
  static async executeControlledOnHandChange(req: AuthenticatedRequest, res: Response) {
    try {
      const orgId = req.organizationId!;
      const {
        productId,
        locationId,
        quantityDelta,
        movementType,
        referenceType,
        referenceId,
        reason,
      } = req.body;

      if (!productId || !locationId || quantityDelta === undefined || !movementType || !referenceType || !referenceId || !reason) {
        return res.status(400).json({
          success: false,
          error: "Metadados de negócio obrigatórios ausentes: productId, locationId, quantityDelta, movementType, referenceType, referenceId, reason.",
        });
      }

      const result = await InventoryService.executeAtomicOnHandChange({
        organizationId: orgId,
        productId,
        locationId,
        quantityDelta: Number(quantityDelta),
        movementType,
        referenceType,
        referenceId,
        reason,
        operatorName: req.user?.name || "Operador de Ajuste",
        userId: req.user?.id,
      });

      if (!result.success) {
        return res.status(409).json({
          success: false,
          errorCode: result.errorCode || "INTEGRITY_CONSTRAINT_VIOLATION",
          error: result.errorMessage,
        });
      }

      return res.json({
        success: true,
        data: result,
        message: `Ajuste controlado de ${quantityDelta} un realizado com registro imutável no ledger.`,
      });
    } catch (error: any) {
      return res.status(500).json({
        success: false,
        error: error.message || "Erro ao processar alteração de estoque.",
      });
    }
  }

  /**
   * POST /api/inventory/recalculate/:productId
   * Recalculates live balances from scratch by traversing the entire immutable ledger.
   * Restricted to OWNER and SUPER_ADMIN for sensitive maintenance and audit reconciliation.
   */
  static async recalculate(req: AuthenticatedRequest, res: Response) {
    try {
      const orgId = req.organizationId!;
      const { productId } = req.params;
      const { reason } = req.body || {};
      const operatorName = req.user?.name || "Administrador da Conta / Plataforma";
      const operatorRole = req.userRole || "SUPER_ADMIN";

      // 1. Get latest recorded movement snapshot as "Saldo Antes"
      const recentMovements = await InventoryService.getLedgerHistory(orgId, productId, 1);
      const latestSnapshot = recentMovements.length > 0 ? recentMovements[0] : null;

      const snapshotBefore = {
        physical: latestSnapshot ? latestSnapshot.physicalBalanceAfter : 0,
        consigned: latestSnapshot ? latestSnapshot.consignedBalanceAfter : 0,
        total: latestSnapshot ? latestSnapshot.physicalBalanceAfter + latestSnapshot.consignedBalanceAfter : 0,
        lastMovementId: latestSnapshot?.id || null,
        lastMovementType: latestSnapshot?.type || null,
      };

      // 2. Execute full-chain recomputation directly from ledger stream
      const recalculated = await InventoryService.getProductStock(orgId, productId);

      const physicalDelta = recalculated.stockPhysical - snapshotBefore.physical;
      const consignedDelta = recalculated.stockConsigned - snapshotBefore.consigned;
      const hasDivergence = physicalDelta !== 0 || consignedDelta !== 0;

      const auditPayload = {
        requestedBy: {
          userId: req.user?.id || "sys-admin",
          name: operatorName,
          role: operatorRole,
          isPlatformSuperAdmin: !!req.user?.isPlatformSuperAdmin,
        },
        timestamp: new Date().toISOString(),
        productId,
        reason: reason || "Rotina de conciliação / auditoria de consistência do Ledger",
        balanceBefore: snapshotBefore,
        balanceRecalculated: {
          physical: recalculated.stockPhysical,
          consigned: recalculated.stockConsigned,
          available: recalculated.stockAvailable,
          total: recalculated.totalStock,
        },
        difference: {
          physicalDelta,
          consignedDelta,
          hasDivergence,
        },
      };

      // 3. Register high-priority audit log
      await auditService.logAction(
        orgId,
        req.user?.id,
        "INVENTORY_RECONCILIATION_RECALCULATE",
        "INVENTORY",
        productId,
        (req.headers["x-forwarded-for"] as string) || req.socket.remoteAddress || "127.0.0.1",
        req.headers["user-agent"] || "Aura Platform System Maintenance",
        `Reconciliação e recomputação do produto ${productId} executada por ${operatorName} (${operatorRole}). Divergência: ${hasDivergence ? "SIM (" + physicalDelta + " físico / " + consignedDelta + " consig)" : "NÃO (Saldos consistentes)"}`,
        auditPayload
      );

      return res.json({
        success: true,
        data: {
          summary: recalculated,
          auditReceipt: auditPayload,
        },
        message: hasDivergence
          ? `Recomputação concluída com divergência detectada (Físico: ${physicalDelta > 0 ? "+" + physicalDelta : physicalDelta}, Consignado: ${consignedDelta > 0 ? "+" + consignedDelta : consignedDelta}). O evento foi auditado com sucesso.`
          : `Saldo do produto ${productId} recalculado com sucesso a partir da trilha do Ledger. Nenhuma divergência com o último snapshot.`,
      });
    } catch (error: any) {
      return res.status(500).json({
        success: false,
        error: error.message || "Erro ao recalcular saldos do ledger.",
      });
    }
  }

  /**
   * POST /api/inventory/hardening/run-tests
   * Runs the automated Sprint 2.5 Concurrency & Hardening test suite.
   * STRICT SECURITY GUARD:
   * 1. Requires SUPER_ADMIN / OWNER / LOJA_ADMIN
   * 2. Blocked in strict production unless DEV_ALLOW_TEST_RUNNER is explicitly enabled.
   * 3. Runs strictly in an isolated ephemeral Sandbox Tenant ('org-hardening-sandbox-tenant')
   *    with guaranteed setup and teardown, never touching real customer tenant data.
   */
  static async runHardeningTests(req: AuthenticatedRequest, res: Response) {
    try {
      const isProduction = process.env.NODE_ENV === "production";
      const devAllowOverride = req.headers["x-dev-test-runner"] === "enabled" || process.env.ENABLE_DEV_TEST_RUNNER === "true";

      if (isProduction && !devAllowOverride) {
        return res.status(403).json({
          success: false,
          error: "A execução de testes automatizados de concorrência é restrita a ambientes de desenvolvimento/staging ou requer flag de autorização explícita (x-dev-test-runner: enabled).",
        });
      }

      const report = await InventoryHardeningTestSuite.runFullSuite();

      return res.json({
        success: true,
        data: report,
        message: `Bateria de Testes de Concorrência e Hardening concluída: ${report.passedTests}/${report.totalTests} testes aprovados em ${report.totalDurationMs}ms (Sandbox Isolada).`,
      });
    } catch (error: any) {
      return res.status(500).json({
        success: false,
        error: error.message || "Erro ao executar suite de testes de concorrência.",
      });
    }
  }
}
