import { query } from "../../db/postgres";
import { TransactionContext } from "../../db/transaction";
import {
  InventoryMovementEntity,
  InventoryStockSummary,
  InventoryBalanceEntity,
  InventoryLocationEntity,
  InventoryReservationEntity,
  InventoryReservationStatus,
  InventoryReferenceType,
  LocationBalanceDetail,
  InsufficientStockError,
} from "./inventory.types";

function mapRowToMovement(row: any): InventoryMovementEntity {
  return {
    id: row.id,
    organizationId: row.organization_id,
    productId: row.product_id,
    type: row.type,
    quantityChange: parseInt(row.quantity_change, 10),
    physicalBalanceAfter: parseInt(row.physical_balance_after, 10),
    consignedBalanceAfter: parseInt(row.consigned_balance_after, 10),
    locationId: row.location_id || undefined,
    referenceType: row.reference_type || undefined,
    referenceId: row.reference_id || undefined,
    operatorName: row.operator_name,
    notes: row.notes || undefined,
    createdAt: row.created_at instanceof Date ? row.created_at.toISOString() : String(row.created_at),
  };
}

function mapRowToLocation(row: any): InventoryLocationEntity {
  return {
    id: row.id,
    organizationId: row.organization_id,
    name: row.name,
    code: row.code,
    type: row.type,
    isActive: Boolean(row.is_active),
    description: row.description || (row.address ? (typeof row.address === "string" ? row.address : JSON.stringify(row.address)) : undefined),
    createdAt: row.created_at instanceof Date ? row.created_at.toISOString() : String(row.created_at),
  };
}

function mapRowToBalance(row: any): InventoryBalanceEntity {
  const onHand = parseInt(row.on_hand_quantity, 10);
  const reserved = parseInt(row.reserved_quantity, 10);
  return {
    id: row.id,
    organizationId: row.organization_id,
    productId: row.product_id,
    locationId: row.location_id,
    onHandQuantity: onHand,
    reservedQuantity: reserved,
    availableQuantity: Math.max(0, onHand - reserved),
    createdAt: row.created_at instanceof Date ? row.created_at.toISOString() : String(row.created_at),
    updatedAt: row.updated_at instanceof Date ? row.updated_at.toISOString() : String(row.updated_at),
  };
}

function mapRowToReservation(row: any): InventoryReservationEntity {
  return {
    id: row.id,
    organizationId: row.organization_id,
    productId: row.product_id,
    locationId: row.location_id,
    quantity: parseInt(row.quantity, 10),
    status: row.status,
    referenceType: (row.reference_type as InventoryReferenceType) || "ORDER",
    referenceId: row.reference_id || row.order_id || "",
    idempotencyKey: row.idempotency_key || undefined,
    expiresAt: row.expires_at instanceof Date ? row.expires_at.toISOString() : String(row.expires_at),
    confirmedAt: row.confirmed_at instanceof Date ? row.confirmed_at.toISOString() : (row.confirmed_at ? String(row.confirmed_at) : undefined),
    releasedAt: row.released_at instanceof Date ? row.released_at.toISOString() : (row.released_at ? String(row.released_at) : undefined),
    operatorName: row.operator_name || undefined,
    notes: row.notes || undefined,
    createdAt: row.created_at instanceof Date ? row.created_at.toISOString() : String(row.created_at),
    updatedAt: row.updated_at instanceof Date ? row.updated_at.toISOString() : String(row.updated_at),
  };
}

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
  private getBalanceKey(orgId: string, productId: string, locationId: string): string {
    return `${orgId}:${productId}:${locationId}`;
  }

  async createMovement(movement: InventoryMovementEntity, tx?: TransactionContext): Promise<InventoryMovementEntity> {
    if (tx) {
      tx.stagedInventoryMovements.set(movement.id, movement);
      return movement;
    }

    const res = await query(
      `INSERT INTO inventory_movements (
        id, organization_id, product_id, type, quantity_change,
        physical_balance_after, consigned_balance_after, location_id,
        reference_type, reference_id, operator_name, notes, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW())
      RETURNING *`,
      [
        movement.id,
        movement.organizationId,
        movement.productId,
        movement.type,
        movement.quantityChange,
        movement.physicalBalanceAfter,
        movement.consignedBalanceAfter,
        movement.locationId || null,
        movement.referenceType || null,
        movement.referenceId || null,
        movement.operatorName,
        movement.notes || null,
      ]
    );
    return mapRowToMovement(res.rows[0]);
  }

  async removeMovement(id: string): Promise<boolean> {
    const res = await query("DELETE FROM inventory_movements WHERE id = $1", [id]);
    return (res.rowCount || 0) > 0;
  }

  async findById(orgId: string, id: string): Promise<InventoryMovementEntity | null> {
    const res = await query(
      "SELECT * FROM inventory_movements WHERE organization_id = $1 AND id = $2",
      [orgId, id]
    );
    if (res.rows.length === 0) return null;
    return mapRowToMovement(res.rows[0]);
  }

  async listMovementsByOrg(orgId: string, limit = 100): Promise<InventoryMovementEntity[]> {
    const res = await query(
      "SELECT * FROM inventory_movements WHERE organization_id = $1 ORDER BY created_at DESC LIMIT $2",
      [orgId, limit]
    );
    return res.rows.map(mapRowToMovement);
  }

  async listMovementsByProduct(
    orgId: string,
    productId: string,
    limit = 50
  ): Promise<InventoryMovementEntity[]> {
    const res = await query(
      "SELECT * FROM inventory_movements WHERE organization_id = $1 AND product_id = $2 ORDER BY created_at DESC LIMIT $3",
      [orgId, productId, limit]
    );
    return res.rows.map(mapRowToMovement);
  }

  // --- Inventory Locations ---

  async listLocations(orgId: string): Promise<InventoryLocationEntity[]> {
    const res = await query(
      "SELECT * FROM inventory_locations WHERE organization_id = $1 AND is_active = TRUE ORDER BY name ASC",
      [orgId]
    );
    return res.rows.map(mapRowToLocation);
  }

  async findLocationById(orgId: string, locationId: string): Promise<InventoryLocationEntity | null> {
    const res = await query(
      "SELECT * FROM inventory_locations WHERE organization_id = $1 AND id = $2",
      [orgId, locationId]
    );
    if (res.rows.length === 0) return null;
    return mapRowToLocation(res.rows[0]);
  }

  async createLocation(location: InventoryLocationEntity): Promise<InventoryLocationEntity> {
    const res = await query(
      `INSERT INTO inventory_locations (
        id, organization_id, name, code, type, is_active, address, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
      RETURNING *`,
      [
        location.id,
        location.organizationId,
        location.name,
        location.code,
        location.type,
        location.isActive,
        location.description ? JSON.stringify({ description: location.description }) : null,
      ]
    );
    return mapRowToLocation(res.rows[0]);
  }

  // --- Inventory Balances ---

  async getBalance(orgId: string, productId: string, locationId: string, tx?: TransactionContext): Promise<InventoryBalanceEntity | null> {
    const key = this.getBalanceKey(orgId, productId, locationId);
    if (tx && tx.stagedInventoryBalances.has(key)) {
      return tx.stagedInventoryBalances.get(key);
    }
    const queryFn = tx?.pgClient ? tx.pgClient.query.bind(tx.pgClient) : query;
    const res = await queryFn(
      "SELECT * FROM inventory_balances WHERE organization_id = $1 AND product_id = $2 AND location_id = $3",
      [orgId, productId, locationId]
    );
    if (res.rows.length === 0) return null;
    return mapRowToBalance(res.rows[0]);
  }

  async getBalanceForUpdate(orgId: string, productId: string, locationId: string, tx?: TransactionContext): Promise<InventoryBalanceEntity | null> {
    const key = this.getBalanceKey(orgId, productId, locationId);

    if (tx?.pgClient) {
      // 1. Ensure the balance row physically exists in PostgreSQL so FOR UPDATE locks a concrete row
      await tx.pgClient.query(
        `INSERT INTO inventory_balances (
          id, organization_id, product_id, location_id, on_hand_quantity, reserved_quantity, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, 0, 0, NOW(), NOW())
        ON CONFLICT (organization_id, product_id, location_id) DO NOTHING`,
        [`bal-${productId}-${locationId}`, orgId, productId, locationId]
      );

      // 2. Real PostgreSQL row-level lock (FOR UPDATE) within the active transaction
      const res = await tx.pgClient.query(
        "SELECT * FROM inventory_balances WHERE organization_id = $1 AND product_id = $2 AND location_id = $3 FOR UPDATE",
        [orgId, productId, locationId]
      );
      if (res.rows.length === 0) return null;
      const dbBal = mapRowToBalance(res.rows[0]);

      // If already modified in this transaction, return staged state with locked row
      if (tx.stagedInventoryBalances.has(key)) {
        return tx.stagedInventoryBalances.get(key);
      }
      return dbBal;
    }

    if (tx && tx.stagedInventoryBalances.has(key)) {
      return tx.stagedInventoryBalances.get(key);
    }
    const res = await query(
      "SELECT * FROM inventory_balances WHERE organization_id = $1 AND product_id = $2 AND location_id = $3 FOR UPDATE",
      [orgId, productId, locationId]
    );
    if (res.rows.length === 0) return null;
    return mapRowToBalance(res.rows[0]);
  }

  async listBalancesByProduct(orgId: string, productId: string): Promise<InventoryBalanceEntity[]> {
    const res = await query(
      "SELECT * FROM inventory_balances WHERE organization_id = $1 AND product_id = $2",
      [orgId, productId]
    );
    return res.rows.map(mapRowToBalance);
  }

  async listBalancesByLocation(orgId: string, locationId: string): Promise<InventoryBalanceEntity[]> {
    const res = await query(
      "SELECT * FROM inventory_balances WHERE organization_id = $1 AND location_id = $2",
      [orgId, locationId]
    );
    return res.rows.map(mapRowToBalance);
  }

  async listAllBalancesByOrg(orgId: string): Promise<InventoryBalanceEntity[]> {
    const res = await query(
      "SELECT * FROM inventory_balances WHERE organization_id = $1",
      [orgId]
    );
    return res.rows.map(mapRowToBalance);
  }

  async upsertBalance(balance: InventoryBalanceEntity, tx?: TransactionContext): Promise<InventoryBalanceEntity> {
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
      tx.stagedInventoryBalances.set(key, balance);
      if (tx.pgClient) {
        const res = await tx.pgClient.query(
          `INSERT INTO inventory_balances (
            id, organization_id, product_id, location_id, on_hand_quantity, reserved_quantity, created_at, updated_at
          ) VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
          ON CONFLICT (organization_id, product_id, location_id) DO UPDATE SET
            on_hand_quantity = EXCLUDED.on_hand_quantity,
            reserved_quantity = EXCLUDED.reserved_quantity,
            updated_at = NOW()
          RETURNING *`,
          [
            balance.id,
            balance.organizationId,
            balance.productId,
            balance.locationId,
            balance.onHandQuantity,
            balance.reservedQuantity,
          ]
        );
        return mapRowToBalance(res.rows[0]);
      }
      return balance;
    }

    const res = await query(
      `INSERT INTO inventory_balances (
        id, organization_id, product_id, location_id, on_hand_quantity, reserved_quantity, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
      ON CONFLICT (organization_id, product_id, location_id) DO UPDATE SET
        on_hand_quantity = EXCLUDED.on_hand_quantity,
        reserved_quantity = EXCLUDED.reserved_quantity,
        updated_at = NOW()
      RETURNING *`,
      [
        balance.id,
        balance.organizationId,
        balance.productId,
        balance.locationId,
        balance.onHandQuantity,
        balance.reservedQuantity,
      ]
    );
    return mapRowToBalance(res.rows[0]);
  }

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

    // Acquire PostgreSQL row-level lock (FOR UPDATE) within active transaction
    let bal = await this.getBalanceForUpdate(orgId, productId, locationId, tx);
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
      throw new InsufficientStockError(
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

    const bal = await this.getBalanceForUpdate(orgId, productId, locationId, tx);
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

    const bal = await this.getBalanceForUpdate(orgId, productId, locationId, tx);
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

  async adjustOnHand(
    orgId: string,
    productId: string,
    locationId: string,
    delta: number,
    tx?: TransactionContext
  ): Promise<InventoryBalanceEntity> {
    let bal = await this.getBalanceForUpdate(orgId, productId, locationId, tx);
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

  // --- Formal Inventory Reservations ---

  async createReservationRecord(reservation: InventoryReservationEntity, tx?: TransactionContext): Promise<InventoryReservationEntity> {
    if (tx) {
      tx.stagedInventoryReservations.set(reservation.id, reservation);
      return reservation;
    }

    const res = await query(
      `INSERT INTO inventory_reservations (
        id, organization_id, product_id, location_id, quantity,
        status, order_id, idempotency_key, expires_at, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())
      RETURNING *`,
      [
        reservation.id,
        reservation.organizationId,
        reservation.productId,
        reservation.locationId,
        reservation.quantity,
        reservation.status,
        reservation.referenceId || null,
        reservation.idempotencyKey || null,
        reservation.expiresAt,
      ]
    );
    return mapRowToReservation(res.rows[0]);
  }

  async findReservationById(orgId: string, reservationId: string, tx?: TransactionContext): Promise<InventoryReservationEntity | null> {
    if (tx && tx.stagedInventoryReservations.has(reservationId)) {
      return tx.stagedInventoryReservations.get(reservationId);
    }
    const res = await query(
      "SELECT * FROM inventory_reservations WHERE organization_id = $1 AND id = $2",
      [orgId, reservationId]
    );
    if (res.rows.length === 0) return null;
    return mapRowToReservation(res.rows[0]);
  }

  async findReservationByIdempotencyKey(orgId: string, idempotencyKey: string, tx?: TransactionContext): Promise<InventoryReservationEntity | null> {
    if (tx) {
      for (const res of tx.stagedInventoryReservations.values()) {
        if (res.organizationId === orgId && res.idempotencyKey === idempotencyKey) {
          return res;
        }
      }
    }
    const res = await query(
      "SELECT * FROM inventory_reservations WHERE organization_id = $1 AND idempotency_key = $2",
      [orgId, idempotencyKey]
    );
    if (res.rows.length === 0) return null;
    return mapRowToReservation(res.rows[0]);
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
      return updated;
    }

    const queryRes = await query(
      "UPDATE inventory_reservations SET status = $1, updated_at = NOW() WHERE organization_id = $2 AND id = $3 RETURNING *",
      [status, orgId, reservationId]
    );
    if (queryRes.rows.length === 0) return null;
    return mapRowToReservation(queryRes.rows[0]);
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
    let sql = "SELECT * FROM inventory_reservations WHERE organization_id = $1";
    const params: any[] = [orgId];
    let idx = 2;

    if (filter?.status) {
      sql += ` AND status = $${idx++}`;
      params.push(filter.status);
    }
    if (filter?.productId) {
      sql += ` AND product_id = $${idx++}`;
      params.push(filter.productId);
    }
    if (filter?.locationId) {
      sql += ` AND location_id = $${idx++}`;
      params.push(filter.locationId);
    }

    sql += " ORDER BY created_at DESC";
    const res = await query(sql, params);
    return res.rows.map(mapRowToReservation);
  }

  async expireStaleReservations(orgId: string): Promise<InventoryReservationEntity[]> {
    const res = await query(
      "UPDATE inventory_reservations SET status = 'EXPIRED', updated_at = NOW() WHERE organization_id = $1 AND status = 'ACTIVE' AND expires_at <= NOW() RETURNING *",
      [orgId]
    );
    return res.rows.map(mapRowToReservation);
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
    
    const res = await query(
      `SELECT DISTINCT product_id FROM inventory_balances WHERE organization_id = $1
       UNION
       SELECT id as product_id FROM products WHERE organization_id = $1`,
      [orgId]
    );

    for (const row of res.rows) {
      const summary = await this.recalculateProductBalance(orgId, row.product_id);
      summaries.set(row.product_id, summary);
    }

    return summaries;
  }
}

export const inventoryRepo = new InventoryRepository();
