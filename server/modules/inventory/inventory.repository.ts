import { dbStore } from "../../db/store";
import { TransactionContext } from "../../db/transaction";
import {
  InventoryMovementEntity,
  InventoryStockSummary,
  InventoryBalanceEntity,
  InventoryLocationEntity,
  InventoryReservationEntity,
  InventoryReservationStatus,
  LocationBalanceDetail,
} from "./inventory.types";

export interface IInventoryRepository {
  createMovement(movement: InventoryMovementEntity, tx?: TransactionContext): Promise<InventoryMovementEntity>;
  removeMovement(id: string): Promise<boolean>;
  findById(orgId: string, id: string): Promise<InventoryMovementEntity | null>;
  listMovementsByOrg(orgId: string, limit?: number): Promise<InventoryMovementEntity[]>;
  listMovementsByProduct(orgId: string, productId: string, limit?: number): Promise<InventoryMovementEntity[]>;
  
  // Locations
  listLocations(orgId: string): Promise<InventoryLocationEntity[]>;
  findLocationById(orgId: string, locationId: string): Promise<InventoryLocationEntity | null>;
  createLocation(location: InventoryLocationEntity): Promise<InventoryLocationEntity>;

  // Multi-Dimensional Balances (Product + Location)
  getBalance(orgId: string, productId: string, locationId: string, tx?: TransactionContext): Promise<InventoryBalanceEntity | null>;
  getBalanceForUpdate(orgId: string, productId: string, locationId: string, tx?: TransactionContext): Promise<InventoryBalanceEntity | null>;
  listBalancesByProduct(orgId: string, productId: string): Promise<InventoryBalanceEntity[]>;
  listBalancesByLocation(orgId: string, locationId: string): Promise<InventoryBalanceEntity[]>;
  upsertBalance(balance: InventoryBalanceEntity, tx?: TransactionContext): Promise<InventoryBalanceEntity>;
  
  // Atomic Concurrency & Integrity Protected Operations (enforcing DB CHECK constraints)
  reserveStock(orgId: string, productId: string, locationId: string, quantity: number, tx?: TransactionContext): Promise<InventoryBalanceEntity>;
  releaseReservation(orgId: string, productId: string, locationId: string, quantity: number, tx?: TransactionContext): Promise<InventoryBalanceEntity>;
  commitReservation(orgId: string, productId: string, locationId: string, quantity: number, tx?: TransactionContext): Promise<InventoryBalanceEntity>;
  adjustOnHand(orgId: string, productId: string, locationId: string, delta: number, tx?: TransactionContext): Promise<InventoryBalanceEntity>;

  // Formal Inventory Reservations (Sprint 3 Lifecycle)
  createReservationRecord(reservation: InventoryReservationEntity, tx?: TransactionContext): Promise<InventoryReservationEntity>;
  findReservationById(orgId: string, reservationId: string, tx?: TransactionContext): Promise<InventoryReservationEntity | null>;
  findReservationByIdempotencyKey(orgId: string, idempotencyKey: string, tx?: TransactionContext): Promise<InventoryReservationEntity | null>;
  updateReservationStatus(
    orgId: string,
    reservationId: string,
    status: InventoryReservationStatus,
    extra?: Partial<InventoryReservationEntity>,
    tx?: TransactionContext
  ): Promise<InventoryReservationEntity | null>;
  listActiveReservations(orgId: string): Promise<InventoryReservationEntity[]>;
  expireStaleReservations(orgId: string): Promise<InventoryReservationEntity[]>;

  // Aggregation & Reconciliation
  recalculateProductBalance(orgId: string, productId: string): Promise<InventoryStockSummary>;
  getStockSummary(orgId: string, productId: string): Promise<InventoryStockSummary>;
  getAllStockSummariesByOrg(orgId: string): Promise<Map<string, InventoryStockSummary>>;
}

export class InventoryRepository implements IInventoryRepository {
  async createMovement(movement: InventoryMovementEntity, tx?: TransactionContext): Promise<InventoryMovementEntity> {
    if (tx) {
      tx.stagedInventoryMovements.set(movement.id, movement);
    } else {
      dbStore.inventoryMovements.set(movement.id, movement);
    }
    return movement;
  }

  async removeMovement(id: string): Promise<boolean> {
    return dbStore.inventoryMovements.delete(id);
  }

  async findById(orgId: string, id: string): Promise<InventoryMovementEntity | null> {
    const mov = dbStore.inventoryMovements.get(id);
    if (mov && mov.organizationId === orgId) {
      return mov;
    }
    return null;
  }

  async listMovementsByOrg(orgId: string, limit = 100): Promise<InventoryMovementEntity[]> {
    const list: InventoryMovementEntity[] = [];
    for (const mov of dbStore.inventoryMovements.values()) {
      if (mov.organizationId === orgId) {
        list.push(mov);
      }
    }
    list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return list.slice(0, limit);
  }

  async listMovementsByProduct(
    orgId: string,
    productId: string,
    limit = 50
  ): Promise<InventoryMovementEntity[]> {
    const list: InventoryMovementEntity[] = [];
    for (const mov of dbStore.inventoryMovements.values()) {
      if (mov.organizationId === orgId && mov.productId === productId) {
        list.push(mov);
      }
    }
    list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return list.slice(0, limit);
  }

  // --- Inventory Locations ---

  async listLocations(orgId: string): Promise<InventoryLocationEntity[]> {
    const list: InventoryLocationEntity[] = [];
    for (const loc of dbStore.inventoryLocations.values()) {
      if (loc.organizationId === orgId && loc.isActive) {
        list.push(loc);
      }
    }
    return list;
  }

  async findLocationById(orgId: string, locationId: string): Promise<InventoryLocationEntity | null> {
    const loc = dbStore.inventoryLocations.get(locationId);
    if (loc && loc.organizationId === orgId) {
      return loc;
    }
    return null;
  }

  async createLocation(location: InventoryLocationEntity): Promise<InventoryLocationEntity> {
    dbStore.inventoryLocations.set(location.id, location);
    return location;
  }

  // --- Inventory Balances (Multi-Dimensional: Product + Location) ---

  private getBalanceKey(orgId: string, productId: string, locationId: string): string {
    return `${orgId}:${productId}:${locationId}`;
  }

  async getBalance(orgId: string, productId: string, locationId: string, tx?: TransactionContext): Promise<InventoryBalanceEntity | null> {
    const key = this.getBalanceKey(orgId, productId, locationId);
    if (tx && tx.stagedInventoryBalances.has(key)) {
      return tx.stagedInventoryBalances.get(key);
    }
    return dbStore.inventoryBalances.get(key) || null;
  }

  /**
   * PostgreSQL Row-Level Lock Query Simulation (SELECT ... FOR UPDATE)
   */
  async getBalanceForUpdate(orgId: string, productId: string, locationId: string, tx?: TransactionContext): Promise<InventoryBalanceEntity | null> {
    const key = this.getBalanceKey(orgId, productId, locationId);
    let bal: InventoryBalanceEntity | undefined;
    if (tx && tx.stagedInventoryBalances.has(key)) {
      bal = tx.stagedInventoryBalances.get(key);
    } else {
      bal = dbStore.inventoryBalances.get(key);
    }
    if (!bal) {
      return null;
    }
    return { ...bal };
  }

  async listBalancesByProduct(orgId: string, productId: string): Promise<InventoryBalanceEntity[]> {
    const balances: InventoryBalanceEntity[] = [];
    for (const bal of dbStore.inventoryBalances.values()) {
      if (bal.organizationId === orgId && bal.productId === productId) {
        balances.push(bal);
      }
    }
    return balances;
  }

  async listBalancesByLocation(orgId: string, locationId: string): Promise<InventoryBalanceEntity[]> {
    const balances: InventoryBalanceEntity[] = [];
    for (const bal of dbStore.inventoryBalances.values()) {
      if (bal.organizationId === orgId && bal.locationId === locationId) {
        balances.push(bal);
      }
    }
    return balances;
  }

  async upsertBalance(balance: InventoryBalanceEntity, tx?: TransactionContext): Promise<InventoryBalanceEntity> {
    // Enforce DB CHECK Constraints at repository level
    if (balance.onHandQuantity < 0) {
      throw new Error(`Violação de integridade CHECK (on_hand_quantity >= 0): valor=${balance.onHandQuantity}`);
    }
    if (balance.reservedQuantity < 0) {
      throw new Error(`Violação de integridade CHECK (reserved_quantity >= 0): valor=${balance.reservedQuantity}`);
    }
    if (balance.reservedQuantity > balance.onHandQuantity) {
      throw new Error(
        `Violação de integridade CHECK (reserved_quantity <= on_hand_quantity): reserved=${balance.reservedQuantity} > on_hand=${balance.onHandQuantity}`
      );
    }

    balance.availableQuantity = balance.onHandQuantity - balance.reservedQuantity;
    balance.updatedAt = new Date().toISOString();

    const key = this.getBalanceKey(balance.organizationId, balance.productId, balance.locationId);
    if (tx) {
      if (!tx.originalInventoryBalances.has(key) && dbStore.inventoryBalances.has(key)) {
        tx.originalInventoryBalances.set(key, JSON.parse(JSON.stringify(dbStore.inventoryBalances.get(key))));
      }
      tx.stagedInventoryBalances.set(key, balance);
    } else {
      dbStore.inventoryBalances.set(key, balance);
    }
    return balance;
  }

  /**
   * ATOMIC STOCK RESERVATION (supports TransactionContext)
   * Enforces: AVAILABLE = ON_HAND - RESERVED >= quantity
   */
  async reserveStock(
    orgId: string,
    productId: string,
    locationId: string,
    quantity: number,
    tx?: TransactionContext
  ): Promise<InventoryBalanceEntity> {
    if (quantity <= 0) {
      throw new Error("A quantidade de reserva deve ser maior que zero.");
    }

    let bal = await this.getBalance(orgId, productId, locationId, tx);
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
        `Saldo insuficiente para reserva na localização ${locationId}. Disponível: ${available} un, Solicitado: ${quantity} un (Físico On-Hand: ${bal.onHandQuantity}, Já Reservado: ${bal.reservedQuantity}).`
      );
    }

    const updated: InventoryBalanceEntity = {
      ...bal,
      reservedQuantity: bal.reservedQuantity + quantity,
      onHandQuantity: bal.onHandQuantity,
      availableQuantity: bal.onHandQuantity - (bal.reservedQuantity + quantity),
      updatedAt: new Date().toISOString(),
    };

    return await this.upsertBalance(updated, tx);
  }

  /**
   * ATOMIC RESERVATION RELEASE
   */
  async releaseReservation(
    orgId: string,
    productId: string,
    locationId: string,
    quantity: number,
    tx?: TransactionContext
  ): Promise<InventoryBalanceEntity> {
    if (quantity <= 0) {
      throw new Error("A quantidade a liberar deve ser maior que zero.");
    }

    const bal = await this.getBalance(orgId, productId, locationId, tx);
    if (!bal || bal.reservedQuantity < quantity) {
      throw new Error(
        `Quantidade reservada insuficiente para liberação. Reservado atual: ${bal ? bal.reservedQuantity : 0} un, Solicitado para liberar: ${quantity} un.`
      );
    }

    const updated: InventoryBalanceEntity = {
      ...bal,
      reservedQuantity: bal.reservedQuantity - quantity,
      availableQuantity: bal.onHandQuantity - (bal.reservedQuantity - quantity),
      updatedAt: new Date().toISOString(),
    };

    return await this.upsertBalance(updated, tx);
  }

  /**
   * COMMIT RESERVATION (Order Completed / Consignment Dispatched)
   * Deducts both on_hand_quantity and reserved_quantity simultaneously.
   */
  async commitReservation(
    orgId: string,
    productId: string,
    locationId: string,
    quantity: number,
    tx?: TransactionContext
  ): Promise<InventoryBalanceEntity> {
    if (quantity <= 0) {
      throw new Error("A quantidade a confirmar deve ser maior que zero.");
    }

    const bal = await this.getBalance(orgId, productId, locationId, tx);
    if (!bal) {
      throw new Error("Saldo não encontrado para confirmação de reserva.");
    }

    if (bal.reservedQuantity < quantity || bal.onHandQuantity < quantity) {
      throw new Error(
        `Inconsistência ao confirmar reserva: On-Hand (${bal.onHandQuantity}) ou Reservado (${bal.reservedQuantity}) menor que ${quantity} un.`
      );
    }

    const updated: InventoryBalanceEntity = {
      ...bal,
      onHandQuantity: bal.onHandQuantity - quantity,
      reservedQuantity: bal.reservedQuantity - quantity,
      availableQuantity: (bal.onHandQuantity - quantity) - (bal.reservedQuantity - quantity),
      updatedAt: new Date().toISOString(),
    };

    return await this.upsertBalance(updated, tx);
  }

  /**
   * ADJUST ON-HAND QUANTITY (Direct Inflow/Outflow like Purchase, Direct Sale, Adjustment)
   */
  async adjustOnHand(
    orgId: string,
    productId: string,
    locationId: string,
    delta: number,
    tx?: TransactionContext
  ): Promise<InventoryBalanceEntity> {
    let bal = await this.getBalance(orgId, productId, locationId, tx);
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

    const newOnHand = bal.onHandQuantity + delta;
    if (newOnHand < 0) {
      throw new Error(`Saldo on-hand não pode ser negativo (${newOnHand} un). Operação abortada.`);
    }
    if (newOnHand < bal.reservedQuantity) {
      throw new Error(
        `Saldo on-hand resultante (${newOnHand} un) não pode ser inferior às reservas ativas (${bal.reservedQuantity} un).`
      );
    }

    const updated: InventoryBalanceEntity = {
      ...bal,
      onHandQuantity: newOnHand,
      availableQuantity: newOnHand - bal.reservedQuantity,
      updatedAt: new Date().toISOString(),
    };

    return await this.upsertBalance(updated, tx);
  }

  // --- Formal Inventory Reservations (Sprint 3 Lifecycle) ---

  async createReservationRecord(reservation: InventoryReservationEntity, tx?: TransactionContext): Promise<InventoryReservationEntity> {
    if (tx) {
      tx.stagedInventoryReservations.set(reservation.id, reservation);
    } else {
      dbStore.inventoryReservations.set(reservation.id, reservation);
    }
    return reservation;
  }

  async findReservationById(orgId: string, reservationId: string, tx?: TransactionContext): Promise<InventoryReservationEntity | null> {
    if (tx && tx.stagedInventoryReservations.has(reservationId)) {
      return tx.stagedInventoryReservations.get(reservationId);
    }
    const res = dbStore.inventoryReservations.get(reservationId);
    if (res && res.organizationId === orgId) {
      return res;
    }
    return null;
  }

  async findReservationByIdempotencyKey(orgId: string, idempotencyKey: string, tx?: TransactionContext): Promise<InventoryReservationEntity | null> {
    if (tx) {
      for (const res of tx.stagedInventoryReservations.values()) {
        if (res.organizationId === orgId && res.idempotencyKey === idempotencyKey) {
          return res;
        }
      }
    }
    for (const res of dbStore.inventoryReservations.values()) {
      if (res.organizationId === orgId && res.idempotencyKey === idempotencyKey) {
        return res;
      }
    }
    return null;
  }

  async updateReservationStatus(
    orgId: string,
    reservationId: string,
    status: InventoryReservationStatus,
    extra?: Partial<InventoryReservationEntity>,
    tx?: TransactionContext
  ): Promise<InventoryReservationEntity | null> {
    const res = await this.findReservationById(orgId, reservationId, tx);
    if (!res) return null;

    const updated: InventoryReservationEntity = {
      ...res,
      ...extra,
      status,
      updatedAt: new Date().toISOString(),
    };

    if (tx) {
      tx.stagedInventoryReservations.set(reservationId, updated);
    } else {
      dbStore.inventoryReservations.set(reservationId, updated);
    }
    return updated;
  }

  async listActiveReservations(orgId: string): Promise<InventoryReservationEntity[]> {
    return this.listReservations(orgId, { status: "ACTIVE" });
  }

  async listReservations(
    orgId: string,
    filter?: {
      status?: InventoryReservationStatus;
      productId?: string;
      locationId?: string;
    }
  ): Promise<InventoryReservationEntity[]> {
    const list: InventoryReservationEntity[] = [];

    for (const res of dbStore.inventoryReservations.values()) {
      if (res.organizationId !== orgId) continue;
      if (filter?.status && res.status !== filter.status) continue;
      if (filter?.productId && res.productId !== filter.productId) continue;
      if (filter?.locationId && res.locationId !== filter.locationId) continue;
      list.push(res);
    }
    return list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  async expireStaleReservations(orgId: string): Promise<InventoryReservationEntity[]> {
    const expired: InventoryReservationEntity[] = [];
    const now = new Date();

    for (const res of dbStore.inventoryReservations.values()) {
      if (res.organizationId === orgId && res.status === "ACTIVE") {
        if (new Date(res.expiresAt).getTime() <= now.getTime()) {
          res.status = "EXPIRED";
          res.updatedAt = now.toISOString();
          dbStore.inventoryReservations.set(res.id, res);
          expired.push(res);
        }
      }
    }
    return expired;
  }

  /**
   * SOURCE OF TRUTH RECOMPUTATION & MULTI-LOCATION AGGREGATION
   */
  async recalculateProductBalance(orgId: string, productId: string): Promise<InventoryStockSummary> {
    const balances = await this.listBalancesByProduct(orgId, productId);
    const locations = await this.listLocations(orgId);
    const locMap = new Map<string, InventoryLocationEntity>();
    locations.forEach((l) => locMap.set(l.id, l));

    let onHandTotal = 0;
    let reservedTotal = 0;
    let stockPhysical = 0;
    let stockConsigned = 0;

    const locationDetails: LocationBalanceDetail[] = [];

    for (const bal of balances) {
      const loc = locMap.get(bal.locationId);
      const locName = loc ? loc.name : "Localização Desconhecida";
      const locType = loc ? loc.type : "PHYSICAL_STORE";
      const locCode = loc ? loc.code : bal.locationId;

      onHandTotal += bal.onHandQuantity;
      reservedTotal += bal.reservedQuantity;

      if (locType === "RESELLER_BAG") {
        stockConsigned += bal.onHandQuantity;
      } else {
        stockPhysical += bal.onHandQuantity;
      }

      locationDetails.push({
        locationId: bal.locationId,
        locationName: locName,
        locationType: locType,
        locationCode: locCode,
        onHandQuantity: bal.onHandQuantity,
        reservedQuantity: bal.reservedQuantity,
        availableQuantity: bal.availableQuantity,
      });
    }

    const availableTotal = Math.max(0, onHandTotal - reservedTotal);

    return {
      productId,
      onHandTotal,
      reservedTotal,
      availableTotal,
      stockPhysical,
      stockConsigned,
      stockAvailable: Math.max(0, stockPhysical - reservedTotal),
      totalStock: onHandTotal,
      locations: locationDetails,
    };
  }

  async getStockSummary(orgId: string, productId: string): Promise<InventoryStockSummary> {
    return await this.recalculateProductBalance(orgId, productId);
  }

  async getAllStockSummariesByOrg(orgId: string): Promise<Map<string, InventoryStockSummary>> {
    const summaries = new Map<string, InventoryStockSummary>();
    
    const productIds = new Set<string>();
    for (const bal of dbStore.inventoryBalances.values()) {
      if (bal.organizationId === orgId) {
        productIds.add(bal.productId);
      }
    }
    for (const p of dbStore.products.values()) {
      if (p.organizationId === orgId) {
        productIds.add(p.id);
      }
    }

    for (const pId of productIds) {
      const summary = await this.recalculateProductBalance(orgId, pId);
      summaries.set(pId, summary);
    }

    return summaries;
  }
}

export const inventoryRepo = new InventoryRepository();
