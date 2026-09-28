import { query } from "../../db/postgres";
import { TenantContext } from "../../db/tenantContext";
import { ConsignmentEntity } from "./consignment.types";

function mapRowToConsignment(row: any): ConsignmentEntity {
  return {
    id: row.id,
    organizationId: row.organization_id,
    code: row.code,
    resellerId: row.reseller_id || undefined,
    resellerName: row.reseller_name,
    resellerPhone: row.reseller_phone || undefined,
    status: row.status,
    commissionRate: parseFloat(row.commission_rate || "30.00"),
    totalPieces: parseInt(row.total_pieces, 10),
    totalValue: parseFloat(row.total_value),
    soldValue: parseFloat(row.sold_value || "0"),
    resellerCommission: parseFloat(row.reseller_commission || "0"),
    netStoreAmount: parseFloat(row.net_store_amount || "0"),
    items: typeof row.items === "string" ? JSON.parse(row.items) : (row.items || []),
    dispatchedAt: row.dispatched_at instanceof Date ? row.dispatched_at.toISOString() : String(row.dispatched_at),
    settlementDueAt: row.settlement_due_at instanceof Date ? row.settlement_due_at.toISOString() : String(row.settlement_due_at),
    settledAt: row.settled_at instanceof Date ? row.settled_at.toISOString() : (row.settled_at ? String(row.settled_at) : undefined),
    notes: row.notes || undefined,
    createdAt: row.created_at instanceof Date ? row.created_at.toISOString() : String(row.created_at),
    updatedAt: row.updated_at instanceof Date ? row.updated_at.toISOString() : String(row.updated_at),
  };
}

export class ConsignmentRepository {
  async listByOrg(orgId: string): Promise<ConsignmentEntity[]> {
    return TenantContext.run({ tenantId: orgId }, async () => {
      const res = await query(
        "SELECT * FROM consignments WHERE organization_id = $1 ORDER BY created_at DESC",
        [orgId]
      );
      return res.rows.map(mapRowToConsignment);
    });
  }

  async findById(id: string): Promise<ConsignmentEntity | null> {
    const res = await query("SELECT * FROM consignments WHERE id = $1", [id]);
    return res.rows.length > 0 ? mapRowToConsignment(res.rows[0]) : null;
  }

  async create(data: ConsignmentEntity): Promise<ConsignmentEntity> {
    return TenantContext.run({ tenantId: data.organizationId }, async () => {
      const res = await query(
        `INSERT INTO consignments (
          id, organization_id, code, reseller_id, reseller_name, reseller_phone,
          status, commission_rate, total_pieces, total_value, sold_value,
          reseller_commission, net_store_amount, items, dispatched_at,
          settlement_due_at, notes, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, NOW(), NOW())
        RETURNING *`,
        [
          data.id,
          data.organizationId,
          data.code,
          data.resellerId || null,
          data.resellerName,
          data.resellerPhone || null,
          data.status,
          data.commissionRate,
          data.totalPieces,
          data.totalValue,
          data.soldValue,
          data.resellerCommission,
          data.netStoreAmount,
          JSON.stringify(data.items || []),
          data.dispatchedAt,
          data.settlementDueAt,
          data.notes || null,
        ]
      );
      return mapRowToConsignment(res.rows[0]);
    });
  }
}

export const consignmentRepo = new ConsignmentRepository();
