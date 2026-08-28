import { inventoryRepo } from "./inventory.repository";
import { InventoryConcurrencyService } from "./inventoryConcurrency.service";
import { reservationExpiryWorker } from "./reservationExpiryWorker";
import {
  InventoryMovementEntity,
  CreateMovementDTO,
  InventoryStockSummary,
  ReserveStockDTO,
  ReleaseReservationDTO,
  CommitReservationDTO,
  CreateLocationDTO,
  InventoryLocationEntity,
  InventoryBalanceEntity,
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

export class InventoryService {
  /**
   * ============================================================================
   * 🏛️ ARQUITETURA CENTRALIZADA DE CONCORRÊNCIA E INTEGRIDADE DE ESTOQUE
   * ============================================================================
   * Nenhum módulo externo (Orders, Consignment, Transfers, E-commerce, POS)
   * manipula tabelas ou saldos de estoque diretamente.
   * Todos os acessos passam por InventoryService / InventoryConcurrencyService.
   */

  // --- OPERAÇÕES COMPOSTAS (Pessimistic Locking: SELECT ... FOR UPDATE) ---

  /**
   * Executa operação composta de pedido (Faturamento direto ou Reserva no checkout).
   * Bloqueia Order + Balances (SELECT FOR UPDATE) e grava Ledger + Balances + Auditoria.
   */
  static async executeCompositeOrder(
    orgId: string,
    params: CompositeOrderParams,
    mode: "DIRECT_SALE" | "RESERVE_FOR_CHECKOUT" = "DIRECT_SALE"
  ) {
    return await InventoryConcurrencyService.executeCompositeOrder(orgId, params, mode);
  }

  /**
   * Executa expedição composta de consignação (Matriz -> Maleta da Revendedora).
   * Bloqueia Consignação + Balances de Origem e Destino com gravação do Ledger e Auditoria.
   */
  static async executeCompositeConsignment(orgId: string, params: CompositeConsignmentParams) {
    return await InventoryConcurrencyService.executeCompositeConsignmentDispatch(orgId, params);
  }

  /**
   * Executa transferência composta entre locais (e.g. Matriz -> Loja Shopping).
   * Bloqueia Transferência + Balances dos locais envolvidos.
   */
  static async executeCompositeTransfer(orgId: string, params: CompositeTransferParams) {
    return await InventoryConcurrencyService.executeCompositeTransfer(orgId, params);
  }

  /**
   * Executa cancelamento e estorno transacional composto (Pedidos, Consignações, Transferências).
   */
  static async executeCompositeCancellation(orgId: string, params: CompositeCancellationParams) {
    return await InventoryConcurrencyService.executeCompositeCancellation(orgId, params);
  }

  /**
   * Executa confirmação composta de pagamento (converte reserva prévia em venda faturada com baixa on-hand e reserved).
   */
  static async executeCompositePaymentConfirmation(orgId: string, params: CompositePaymentConfirmationParams) {
    return await InventoryConcurrencyService.executeCompositePaymentConfirmation(orgId, params);
  }

  // --- CICLO DE VIDA DE RESERVAS (inventory_reservations) ---

  static async createFormalReservation(orgId: string, dto: CreateReservationDTO): Promise<InventoryReservationEntity> {
    return await InventoryConcurrencyService.createReservation(orgId, dto);
  }

  static async confirmFormalReservation(orgId: string, reservationId: string, operatorName?: string): Promise<InventoryReservationEntity> {
    return await InventoryConcurrencyService.confirmReservation(orgId, reservationId, operatorName);
  }

  static async releaseFormalReservation(orgId: string, reservationId: string, reason?: string): Promise<InventoryReservationEntity> {
    return await InventoryConcurrencyService.releaseReservation(orgId, reservationId, reason);
  }

  static async cancelFormalReservation(orgId: string, reservationId: string, reason?: string, operatorName?: string): Promise<InventoryReservationEntity> {
    return await InventoryConcurrencyService.cancelReservation(orgId, reservationId, reason, operatorName);
  }

  static async getReservationById(orgId: string, reservationId: string): Promise<InventoryReservationEntity | null> {
    return await inventoryRepo.findReservationById(orgId, reservationId);
  }

  static async listReservations(
    orgId: string,
    filter?: {
      status?: any;
      productId?: string;
      locationId?: string;
    }
  ): Promise<InventoryReservationEntity[]> {
    return await inventoryRepo.listReservations(orgId, filter);
  }

  static async listActiveReservations(orgId: string): Promise<InventoryReservationEntity[]> {
    return await inventoryRepo.listActiveReservations(orgId);
  }

  static async expireStaleReservations(orgId: string): Promise<InventoryReservationEntity[]> {
    return await InventoryConcurrencyService.sweepExpiredReservations(orgId);
  }

  /**
   * Executa ciclo do Background Worker para expirar reservas por TTL e disparar reconciliação de estoque
   */
  static async runReservationExpiryWorkerCycle(targetOrgId?: string) {
    return await reservationExpiryWorker.runSweepCycle(targetOrgId);
  }

  /**
   * Reconcilia a integridade entre tabela de reservas (inventory_reservations) e saldos (inventory_balances)
   */
  static async reconcileReservations(orgId: string, productIds?: string[]) {
    return await reservationExpiryWorker.reconcileOrgReservationsAndBalances(orgId, productIds);
  }

  static getReservationWorkerStats() {
    return reservationExpiryWorker.getStats();
  }

  static getReservationWorkerHistory() {
    return reservationExpiryWorker.getHistory();
  }

  static updateReservationWorkerConfig(config: any) {
    return reservationExpiryWorker.updateConfig(config);
  }

  // --- OPERAÇÕES ISOLADAS SIMPLES (Atomic Conditional Update) ---

  /**
   * Executa reserva atômica condicional isolada:
   * UPDATE inventory_balances SET reserved = reserved + :qty WHERE on_hand - reserved >= :qty
   * Retorna affectedRows = 1 (sucesso) ou 0 (insuficiente).
   */
  static async executeAtomicReserve(
    orgId: string,
    productId: string,
    locationId: string,
    quantity: number,
    orderId?: string
  ): Promise<AtomicUpdateResult> {
    return await InventoryConcurrencyService.executeAtomicReserve(orgId, productId, locationId, quantity, orderId);
  }

  /**
   * Executa liberação atômica condicional isolada.
   */
  static async executeAtomicRelease(
    orgId: string,
    productId: string,
    locationId: string,
    quantity: number,
    orderId?: string
  ): Promise<AtomicUpdateResult> {
    return await InventoryConcurrencyService.executeAtomicRelease(orgId, productId, locationId, quantity, orderId);
  }

  /**
   * Executa alteração controlada de On-Hand com movimento obrigatório no Ledger
   */
  static async executeAtomicOnHandChange(
    params: AtomicOnHandChangeParams
  ): Promise<AtomicUpdateResult> {
    return await InventoryConcurrencyService.executeAtomicOnHandChange(params);
  }
  /**
   * TRANSACTIONAL PIPELINE:
   * 1. VALIDATE BUSINESS RULES
   * 2. INSERT INVENTORY MOVEMENT (Ledger as Source of Truth)
   * 3. UPDATE INVENTORY BALANCES (Operational Projection)
   * 4. ROLLBACK MOVEMENT IF PROJECTION UPDATE FAILS
   */
  static async recordMovement(
    orgId: string,
    dto: CreateMovementDTO
  ): Promise<InventoryMovementEntity> {
    const { productId, type, quantityChange, referenceType, referenceId, operatorName, notes } = dto;

    if (quantityChange === 0) {
      throw new Error("A quantidade movimentada não pode ser zero.");
    }

    // Determine target location (default to Matriz if none provided)
    let locationId = dto.locationId;
    if (!locationId) {
      const locations = await inventoryRepo.listLocations(orgId);
      const defaultLoc = locations.find((l) => l.type === "HEADQUARTERS" || l.code === "MATRIZ") || locations[0];
      locationId = defaultLoc ? defaultLoc.id : "loc-lumina-matriz";
    }

    const currentStock = await inventoryRepo.getStockSummary(orgId, productId);
    let newPhysical = currentStock.stockPhysical;
    let newConsigned = currentStock.stockConsigned;
    const absQty = Math.abs(quantityChange);

    // Pre-validation
    if (type === "CONSIGNMENT_OUT" && newPhysical < absQty) {
      throw new Error(
        `Saldo físico insuficiente (${newPhysical} un) para enviar ${absQty} un em consignação.`
      );
    }

    // 1. Generate & Insert Ledger Movement First (Source of Truth Event)
    const movementId = `mov-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const movement: InventoryMovementEntity = {
      id: movementId,
      organizationId: orgId,
      productId,
      locationId,
      type,
      quantityChange,
      physicalBalanceAfter: Math.max(0, newPhysical),
      consignedBalanceAfter: Math.max(0, newConsigned),
      onHandAfter: currentStock.onHandTotal,
      reservedAfter: currentStock.reservedTotal,
      availableAfter: currentStock.availableTotal,
      referenceType: referenceType || "MANUAL_ADJUSTMENT",
      referenceId,
      reversalOfMovementId: dto.reversalOfMovementId,
      operatorName: operatorName || "Gestão Matriz (Sistema)",
      notes: notes || `Movimentação ${type} de ${quantityChange} un registrada.`,
      createdAt: new Date().toISOString().replace("T", " ").substring(0, 16),
    };

    await inventoryRepo.createMovement(movement);

    // 2. Project into inventory_balances with rollback safety
    try {
      switch (type) {
        case "PURCHASE":
        case "RETURN":
          newPhysical += absQty;
          await inventoryRepo.adjustOnHand(orgId, productId, locationId, absQty);
          break;

        case "SALE":
          newPhysical -= absQty;
          await inventoryRepo.adjustOnHand(orgId, productId, locationId, -absQty);
          break;

        case "CONSIGNMENT_OUT": {
          newPhysical -= absQty;
          newConsigned += absQty;

          const locations = await inventoryRepo.listLocations(orgId);
          const originLoc = locations.find((l) => l.id === locationId) || locations[0];
          const targetBag = locations.find((l) => l.type === "RESELLER_BAG") || originLoc;

          await inventoryRepo.adjustOnHand(orgId, productId, originLoc.id, -absQty);
          await inventoryRepo.adjustOnHand(orgId, productId, targetBag.id, absQty);
          break;
        }

        case "CONSIGNMENT_RETURN": {
          newConsigned = Math.max(0, newConsigned - absQty);
          newPhysical += absQty;

          const locations = await inventoryRepo.listLocations(orgId);
          const bagLoc = locations.find((l) => l.type === "RESELLER_BAG") || locations[0];
          const matrizLoc = locations.find((l) => l.type === "HEADQUARTERS" || l.code === "MATRIZ") || locations[0];

          await inventoryRepo.adjustOnHand(orgId, productId, bagLoc.id, -absQty);
          await inventoryRepo.adjustOnHand(orgId, productId, matrizLoc.id, absQty);
          break;
        }

        case "CONSIGNMENT_SALE": {
          newConsigned = Math.max(0, newConsigned - absQty);
          const locations = await inventoryRepo.listLocations(orgId);
          const bagLoc = locations.find((l) => l.id === locationId || l.type === "RESELLER_BAG") || locations[0];
          await inventoryRepo.adjustOnHand(orgId, productId, bagLoc.id, -absQty);
          break;
        }

        case "ADJUSTMENT":
        case "TRANSFER":
          newPhysical += quantityChange;
          await inventoryRepo.adjustOnHand(orgId, productId, locationId, quantityChange);
          break;

        case "REVERSAL":
          if (dto.reversalOfMovementId) {
            const orig = await inventoryRepo.findById(orgId, dto.reversalOfMovementId);
            if (orig) {
              const origQty = Math.abs(orig.quantityChange);
              switch (orig.type) {
                case "PURCHASE":
                case "RETURN":
                  newPhysical -= origQty;
                  await inventoryRepo.adjustOnHand(orgId, productId, locationId, -origQty);
                  break;
                case "SALE":
                  newPhysical += origQty;
                  await inventoryRepo.adjustOnHand(orgId, productId, locationId, origQty);
                  break;
                case "CONSIGNMENT_OUT":
                  newPhysical += origQty;
                  newConsigned = Math.max(0, newConsigned - origQty);
                  await inventoryRepo.adjustOnHand(orgId, productId, locationId, origQty);
                  break;
                case "CONSIGNMENT_RETURN":
                  newPhysical = Math.max(0, newPhysical - origQty);
                  newConsigned += origQty;
                  await inventoryRepo.adjustOnHand(orgId, productId, locationId, -origQty);
                  break;
                case "CONSIGNMENT_SALE":
                  newConsigned += origQty;
                  await inventoryRepo.adjustOnHand(orgId, productId, locationId, origQty);
                  break;
                default:
                  newPhysical += quantityChange;
                  await inventoryRepo.adjustOnHand(orgId, productId, locationId, quantityChange);
                  break;
              }
            } else {
              newPhysical += quantityChange;
              await inventoryRepo.adjustOnHand(orgId, productId, locationId, quantityChange);
            }
          } else {
            newPhysical += quantityChange;
            await inventoryRepo.adjustOnHand(orgId, productId, locationId, quantityChange);
          }
          break;

        default:
          throw new Error(`Tipo de movimentação "${type}" desconhecido.`);
      }

      // Update movement snapshot with final calculated values
      const updatedSummary = await inventoryRepo.getStockSummary(orgId, productId);
      movement.physicalBalanceAfter = Math.max(0, newPhysical);
      movement.consignedBalanceAfter = Math.max(0, newConsigned);
      movement.onHandAfter = updatedSummary.onHandTotal;
      movement.reservedAfter = updatedSummary.reservedTotal;
      movement.availableAfter = updatedSummary.availableTotal;

      return movement;
    } catch (projectionError: any) {
      // 🛡️ ROLLBACK TRANSACTION: Remove movement so no uncommitted/orphan record remains
      await inventoryRepo.removeMovement(movementId);
      throw new Error(`[TRANSACIONAL ROLLBACK] Falha ao atualizar projeção de saldo: ${projectionError.message}`);
    }
  }

  /**
   * ATOMIC STOCK RESERVATION (e.g. Shopping Cart, Checkout, Consignment Assembly)
   * 1. Validate rules
   * 2. Insert ledger reservation movement
   * 3. Update inventory_balances reserved_quantity
   * 4. Rollback movement if CHECK constraint fails
   */
  static async reserveStock(orgId: string, dto: ReserveStockDTO): Promise<InventoryBalanceEntity> {
    const { productId, locationId, quantity, orderId, notes, operatorName } = dto;
    if (quantity <= 0) {
      throw new Error("A quantidade de reserva deve ser maior que zero.");
    }

    const movementId = `mov-res-hold-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    // 1. Insert Ledger Trace First
    await inventoryRepo.createMovement({
      id: movementId,
      organizationId: orgId,
      productId,
      locationId,
      type: "RESERVATION_HOLD",
      quantityChange: quantity,
      physicalBalanceAfter: 0,
      consignedBalanceAfter: 0,
      onHandAfter: 0,
      reservedAfter: 0,
      availableAfter: 0,
      referenceType: "CHECKOUT_RESERVATION",
      referenceId: orderId,
      operatorName: operatorName || "Motor de Reservas Concorrentes",
      notes: notes || `Reserva concorrente de ${quantity} un realizada para pedido ${orderId || "N/A"}.`,
      createdAt: new Date().toISOString().replace("T", " ").substring(0, 16),
    });

    // 2. Project into Balances with Rollback Protection
    try {
      const balance = await inventoryRepo.reserveStock(orgId, productId, locationId, quantity);
      return balance;
    } catch (err: any) {
      await inventoryRepo.removeMovement(movementId);
      throw new Error(`[TRANSACIONAL ROLLBACK] Falha na reserva de estoque: ${err.message}`);
    }
  }

  /**
   * ATOMIC RESERVATION RELEASE (Order Cancelled or Expired)
   */
  static async releaseReservation(orgId: string, dto: ReleaseReservationDTO): Promise<InventoryBalanceEntity> {
    const { productId, locationId, quantity, orderId, reason, operatorName } = dto;
    if (quantity <= 0) {
      throw new Error("A quantidade a liberar deve ser maior que zero.");
    }

    const movementId = `mov-res-rel-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    // 1. Insert Ledger Trace First
    await inventoryRepo.createMovement({
      id: movementId,
      organizationId: orgId,
      productId,
      locationId,
      type: "RESERVATION_RELEASE",
      quantityChange: -quantity,
      physicalBalanceAfter: 0,
      consignedBalanceAfter: 0,
      onHandAfter: 0,
      reservedAfter: 0,
      availableAfter: 0,
      referenceType: "CHECKOUT_RESERVATION",
      referenceId: orderId,
      operatorName: operatorName || "Motor de Reservas Concorrentes",
      notes: `Liberação de reserva de ${quantity} un. Motivo: ${reason || "Cancelamento/Expiração"}`,
      createdAt: new Date().toISOString().replace("T", " ").substring(0, 16),
    });

    // 2. Project into Balances with Rollback Protection
    try {
      const balance = await inventoryRepo.releaseReservation(orgId, productId, locationId, quantity);
      return balance;
    } catch (err: any) {
      await inventoryRepo.removeMovement(movementId);
      throw new Error(`[TRANSACIONAL ROLLBACK] Falha ao liberar reserva: ${err.message}`);
    }
  }

  /**
   * COMMIT RESERVATION (Order Paid / Fulfilled)
   */
  static async commitReservation(orgId: string, dto: CommitReservationDTO): Promise<InventoryBalanceEntity> {
    const { productId, locationId, quantity, orderId, operatorName, notes } = dto;
    if (quantity <= 0) {
      throw new Error("A quantidade a confirmar deve ser maior que zero.");
    }

    const movementId = `mov-sale-commit-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    // 1. Insert Ledger Sale Trace First
    await inventoryRepo.createMovement({
      id: movementId,
      organizationId: orgId,
      productId,
      locationId,
      type: "SALE",
      quantityChange: -quantity,
      physicalBalanceAfter: 0,
      consignedBalanceAfter: 0,
      onHandAfter: 0,
      reservedAfter: 0,
      availableAfter: 0,
      referenceType: "ORDER",
      referenceId: orderId,
      operatorName: operatorName || "PDV / E-commerce Faturamento",
      notes: notes || `Venda confirmada a partir de reserva de ${quantity} un (Pedido ${orderId || "N/A"}).`,
      createdAt: new Date().toISOString().replace("T", " ").substring(0, 16),
    });

    // 2. Commit in Balances with Rollback Protection
    try {
      const balance = await inventoryRepo.commitReservation(orgId, productId, locationId, quantity);
      return balance;
    } catch (err: any) {
      await inventoryRepo.removeMovement(movementId);
      throw new Error(`[TRANSACIONAL ROLLBACK] Falha ao confirmar baixa de reserva: ${err.message}`);
    }
  }

  /**
   * Creates an immutable reversal movement for a previous errant transaction.
   */
  static async reverseMovement(
    orgId: string,
    originalMovementId: string,
    reason: string,
    operatorName = "Gestor Matriz (Reversão)"
  ): Promise<InventoryMovementEntity> {
    const original = await inventoryRepo.findById(orgId, originalMovementId);
    if (!original) {
      throw new Error(`Movimento original "${originalMovementId}" não encontrado.`);
    }

    if (original.type === "REVERSAL") {
      throw new Error("Não é permitido estornar um movimento que já é uma reversão.");
    }

    // Inverse quantity
    const inverseDelta = -original.quantityChange;

    return await this.recordMovement(orgId, {
      productId: original.productId,
      locationId: original.locationId,
      type: "REVERSAL",
      quantityChange: inverseDelta,
      referenceType: "REVERSAL_OPERATION",
      referenceId: original.id,
      reversalOfMovementId: original.id,
      operatorName,
      notes: `Estorno/Reversão referente ao movimento ${original.id} (${original.type}). Motivo: ${reason}`,
    });
  }

  /**
   * Reconciles product inventory balance by comparing the full event-sourced Ledger history (Source of Truth)
   * against the multi-dimensional inventory_balances (on_hand, reserved, available).
   */
  static async reconcileProduct(orgId: string, productId: string) {
    const movements = await inventoryRepo.listMovementsByProduct(orgId, productId, 10000);
    
    // Sort chronologically (oldest first) for event stream analysis
    const chronological = [...movements].sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );

    // Latest recorded movement snapshot (or null if no movements)
    const latestMovement = movements.length > 0 ? movements[0] : null;

    const currentSnapshot = {
      physical: latestMovement ? latestMovement.physicalBalanceAfter : 0,
      consigned: latestMovement ? latestMovement.consignedBalanceAfter : 0,
      total: latestMovement ? latestMovement.physicalBalanceAfter + latestMovement.consignedBalanceAfter : 0,
      onHand: latestMovement?.onHandAfter ?? (latestMovement ? latestMovement.physicalBalanceAfter + latestMovement.consignedBalanceAfter : 0),
      reserved: latestMovement?.reservedAfter ?? 0,
      available: latestMovement?.availableAfter ?? (latestMovement ? latestMovement.physicalBalanceAfter : 0),
      lastMovementId: latestMovement?.id || null,
      lastMovementType: latestMovement?.type || null,
      lastMovementTimestamp: latestMovement?.createdAt || null,
    };

    // Calculate expected balance directly from full multi-location balances
    const expected = await inventoryRepo.recalculateProductBalance(orgId, productId);

    // Activity breakdown by movement type
    const breakdown: Record<string, { count: number; totalUnits: number }> = {
      PURCHASE: { count: 0, totalUnits: 0 },
      SALE: { count: 0, totalUnits: 0 },
      CONSIGNMENT_OUT: { count: 0, totalUnits: 0 },
      CONSIGNMENT_RETURN: { count: 0, totalUnits: 0 },
      CONSIGNMENT_SALE: { count: 0, totalUnits: 0 },
      ADJUSTMENT: { count: 0, totalUnits: 0 },
      TRANSFER: { count: 0, totalUnits: 0 },
      RESERVATION_HOLD: { count: 0, totalUnits: 0 },
      RESERVATION_RELEASE: { count: 0, totalUnits: 0 },
      REVERSAL: { count: 0, totalUnits: 0 },
    };

    for (const mov of chronological) {
      if (breakdown[mov.type]) {
        breakdown[mov.type].count += 1;
        breakdown[mov.type].totalUnits += Math.abs(mov.quantityChange);
      }
    }

    const physicalDelta = expected.stockPhysical - currentSnapshot.physical;
    const consignedDelta = expected.stockConsigned - currentSnapshot.consigned;
    const onHandDelta = expected.onHandTotal - currentSnapshot.onHand;
    const hasDivergence = physicalDelta !== 0 || consignedDelta !== 0 || onHandDelta !== 0;

    return {
      productId,
      status: hasDivergence ? ("DIVERGENT" as const) : ("BALANCED" as const),
      isConsistent: !hasDivergence,
      expectedBalance: {
        physical: expected.stockPhysical,
        consigned: expected.stockConsigned,
        available: expected.stockAvailable,
        total: expected.totalStock,
        onHandTotal: expected.onHandTotal,
        reservedTotal: expected.reservedTotal,
        availableTotal: expected.availableTotal,
      },
      currentSnapshotBalance: currentSnapshot,
      divergence: {
        physicalDelta,
        consignedDelta,
        onHandDelta,
        totalDelta: expected.totalStock - currentSnapshot.total,
        hasDivergence,
      },
      locations: expected.locations,
      ledgerAudit: {
        totalMovements: movements.length,
        firstMovementAt: chronological.length > 0 ? chronological[0].createdAt : null,
        lastMovementAt: latestMovement ? latestMovement.createdAt : null,
        breakdownByType: breakdown,
      },
      reconciledAt: new Date().toISOString(),
    };
  }

  /**
   * Retrieves stock summary with location breakdowns.
   */
  static async getProductStock(orgId: string, productId: string): Promise<InventoryStockSummary> {
    return await inventoryRepo.getStockSummary(orgId, productId);
  }

  /**
   * Retrieves all product stock summaries for an organization.
   */
  static async getOrgStockSummaries(orgId: string): Promise<Map<string, InventoryStockSummary>> {
    return await inventoryRepo.getAllStockSummariesByOrg(orgId);
  }

  /**
   * Retrieves immutable ledger history for an organization.
   */
  static async getLedgerHistory(orgId: string, productId?: string, limit = 100): Promise<InventoryMovementEntity[]> {
    if (productId) {
      return await inventoryRepo.listMovementsByProduct(orgId, productId, limit);
    }
    return await inventoryRepo.listMovementsByOrg(orgId, limit);
  }

  /**
   * Locations management
   */
  static async listLocations(orgId: string): Promise<InventoryLocationEntity[]> {
    return await inventoryRepo.listLocations(orgId);
  }

  static async createLocation(orgId: string, dto: CreateLocationDTO): Promise<InventoryLocationEntity> {
    const loc: InventoryLocationEntity = {
      id: `loc-${dto.code.toLowerCase().replace(/[^a-z0-9]/g, "-")}-${Date.now()}`,
      organizationId: orgId,
      name: dto.name,
      type: dto.type,
      code: dto.code,
      description: dto.description,
      isActive: true,
      createdAt: new Date().toISOString().replace("T", " ").substring(0, 16),
    };
    return await inventoryRepo.createLocation(loc);
  }

  static async getProductBalances(orgId: string, productId: string): Promise<InventoryBalanceEntity[]> {
    return await inventoryRepo.listBalancesByProduct(orgId, productId);
  }
}

