import { query } from "../../db/postgres";
import { TenantContext } from "../../db/tenantContext";
import { BillingInvoiceEntity, BillingInvoiceStatus } from "./billing.types";

function mapRowToInvoice(row: any): BillingInvoiceEntity {
  return {
    id: row.id,
    organizationId: row.organization_id,
    subscriptionId: row.subscription_id || undefined,
    planId: row.plan_id,
    amount: parseFloat(row.amount),
    currency: row.currency || "BRL",
    paymentMethod: row.payment_method,
    status: row.status,
    pixQrCode: row.pix_qr_code || undefined,
    pixCopyPaste: row.pix_copy_paste || undefined,
    pixTxid: row.pix_txid || undefined,
    boletoBarcode: row.boleto_barcode || undefined,
    boletoUrl: row.boleto_url || undefined,
    creditCardLast4: row.credit_card_last4 || undefined,
    paidAt: row.paid_at instanceof Date ? row.paid_at.toISOString() : (row.paid_at ? String(row.paid_at) : undefined),
    dueDate: row.due_date instanceof Date ? row.due_date.toISOString() : String(row.due_date),
    providerTxId: row.provider_tx_id || undefined,
    idempotencyKey: row.idempotency_key || undefined,
    metadata: typeof row.metadata === "string" ? JSON.parse(row.metadata) : (row.metadata || {}),
    createdAt: row.created_at instanceof Date ? row.created_at.toISOString() : String(row.created_at),
    updatedAt: row.updated_at instanceof Date ? row.updated_at.toISOString() : String(row.updated_at),
  };
}

export class BillingRepository {
  async findById(id: string): Promise<BillingInvoiceEntity | null> {
    return TenantContext.run({ isSuperAdmin: true }, async () => {
      const res = await query("SELECT * FROM billing_invoices WHERE id = $1", [id]);
      return res.rows.length > 0 ? mapRowToInvoice(res.rows[0]) : null;
    });
  }

  async findByProviderTxId(providerTxId: string): Promise<BillingInvoiceEntity | null> {
    return TenantContext.run({ isSuperAdmin: true }, async () => {
      const res = await query("SELECT * FROM billing_invoices WHERE provider_tx_id = $1", [providerTxId]);
      return res.rows.length > 0 ? mapRowToInvoice(res.rows[0]) : null;
    });
  }

  async listByOrgId(orgId: string): Promise<BillingInvoiceEntity[]> {
    return TenantContext.run({ tenantId: orgId }, async () => {
      const res = await query(
        "SELECT * FROM billing_invoices WHERE organization_id = $1 ORDER BY created_at DESC",
        [orgId]
      );
      return res.rows.map(mapRowToInvoice);
    });
  }

  async create(invoice: BillingInvoiceEntity): Promise<BillingInvoiceEntity> {
    return TenantContext.run({ tenantId: invoice.organizationId, isSuperAdmin: true }, async () => {
      const res = await query(
        `INSERT INTO billing_invoices (
          id, organization_id, subscription_id, plan_id, amount, currency,
          payment_method, status, pix_qr_code, pix_copy_paste, pix_txid,
          boleto_barcode, boleto_url, credit_card_last4, due_date,
          provider_tx_id, idempotency_key, metadata, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, NOW(), NOW())
        RETURNING *`,
        [
          invoice.id,
          invoice.organizationId,
          invoice.subscriptionId || null,
          invoice.planId,
          invoice.amount,
          invoice.currency || "BRL",
          invoice.paymentMethod,
          invoice.status,
          invoice.pixQrCode || null,
          invoice.pixCopyPaste || null,
          invoice.pixTxid || null,
          invoice.boletoBarcode || null,
          invoice.boletoUrl || null,
          invoice.creditCardLast4 || null,
          invoice.dueDate,
          invoice.providerTxId || null,
          invoice.idempotencyKey || null,
          JSON.stringify(invoice.metadata || {}),
        ]
      );
      return mapRowToInvoice(res.rows[0]);
    });
  }

  async updateStatus(
    id: string,
    status: BillingInvoiceStatus,
    extra?: { paidAt?: string; providerTxId?: string; metadata?: any }
  ): Promise<BillingInvoiceEntity> {
    return TenantContext.run({ isSuperAdmin: true }, async () => {
      const setClauses = ["status = $2", "updated_at = NOW()"];
      const params: any[] = [id, status];
      let idx = 3;

      if (extra?.paidAt) {
        setClauses.push(`paid_at = $${idx++}`);
        params.push(extra.paidAt);
      }
      if (extra?.providerTxId) {
        setClauses.push(`provider_tx_id = $${idx++}`);
        params.push(extra.providerTxId);
      }
      if (extra?.metadata) {
        setClauses.push(`metadata = $${idx++}`);
        params.push(JSON.stringify(extra.metadata));
      }

      const sql = `UPDATE billing_invoices SET ${setClauses.join(", ")} WHERE id = $1 RETURNING *`;
      const res = await query(sql, params);
      if (res.rows.length === 0) {
        throw new Error(`Fatura de cobrança '${id}' não encontrada.`);
      }
      return mapRowToInvoice(res.rows[0]);
    });
  }

  // Idempotent webhook verification backed by PostgreSQL UNIQUE constraint on event_id
  async findWebhookEvent(eventId: string): Promise<any | null> {
    return TenantContext.run({ isSuperAdmin: true }, async () => {
      const res = await query("SELECT * FROM billing_webhook_events WHERE event_id = $1", [eventId]);
      return res.rows.length > 0 ? res.rows[0] : null;
    });
  }

  /**
   * Database-level atomic claim for webhook event idempotency and failure recovery.
   * Leverages PostgreSQL's unique constraint on `billing_webhook_events(event_id)`.
   * 
   * Handles:
   * 1. Initial claim: atomic INSERT ... ON CONFLICT (event_id) DO NOTHING
   * 2. Already processed: returns claimed: false, reason: "ALREADY_PROCESSED"
   * 3. Failed events: allows safe retry by atomically updating status = 'PROCESSING'
   * 4. Abandoned processing events (> 2 min): allows atomic reclamation for retry
   * 5. Active processing (< 2 min): rejects duplicate/concurrent requests safely
   */
  async claimWebhookEvent(data: {
    eventId: string;
    providerTxId?: string;
    eventType: string;
    invoiceId?: string;
    organizationId?: string;
    payload: any;
  }): Promise<{
    claimed: boolean;
    status: "PROCESSING" | "PROCESSED" | "FAILED";
    isRetry?: boolean;
    existingEvent?: any;
    reason: "CLAIMED" | "RETRY_CLAIMED" | "ALREADY_PROCESSED" | "CONCURRENT_PROCESSING";
  }> {
    return TenantContext.run({ isSuperAdmin: true }, async () => {
      // 1. Check if event is already registered
      const existing = await query("SELECT * FROM billing_webhook_events WHERE event_id = $1", [data.eventId]);

      if (existing.rows.length > 0) {
        const row = existing.rows[0];

        // 1a. If already successfully PROCESSED, do not re-run (Strict Idempotency)
        if (row.status === "PROCESSED") {
          return {
            claimed: false,
            status: "PROCESSED",
            existingEvent: row,
            reason: "ALREADY_PROCESSED",
          };
        }

        // 1b. If previous attempt FAILED, allow safe retry by atomically claiming the row
        if (row.status === "FAILED") {
          const retryRes = await query(
            `UPDATE billing_webhook_events
             SET status = 'PROCESSING',
                 attempts = COALESCE(attempts, 1) + 1,
                 last_attempt_at = NOW(),
                 payload = $2
             WHERE event_id = $1 AND status = 'FAILED'
             RETURNING *`,
            [data.eventId, JSON.stringify(data.payload)]
          );

          if (retryRes.rows.length > 0) {
            return {
              claimed: true,
              status: "PROCESSING",
              isRetry: true,
              existingEvent: retryRes.rows[0],
              reason: "RETRY_CLAIMED",
            };
          }

          // Another concurrent request grabbed the retry
          return {
            claimed: false,
            status: "PROCESSING",
            existingEvent: row,
            reason: "CONCURRENT_PROCESSING",
          };
        }

        // 1c. If event is currently in PROCESSING, check if it was abandoned (> 2 minutes)
        if (row.status === "PROCESSING") {
          const abandonedRes = await query(
            `UPDATE billing_webhook_events
             SET status = 'PROCESSING',
                 attempts = COALESCE(attempts, 1) + 1,
                 last_attempt_at = NOW(),
                 payload = $2
             WHERE event_id = $1
               AND status = 'PROCESSING'
               AND (
                 processed_at < NOW() - INTERVAL '2 minutes'
                 OR last_attempt_at < NOW() - INTERVAL '2 minutes'
               )
             RETURNING *`,
            [data.eventId, JSON.stringify(data.payload)]
          );

          if (abandonedRes.rows.length > 0) {
            return {
              claimed: true,
              status: "PROCESSING",
              isRetry: true,
              existingEvent: abandonedRes.rows[0],
              reason: "RETRY_CLAIMED",
            };
          }

          // Fresh active execution in progress
          return {
            claimed: false,
            status: "PROCESSING",
            existingEvent: row,
            reason: "CONCURRENT_PROCESSING",
          };
        }
      }

      // 2. Initial insert with atomic UNIQUE constraint on event_id
      const id = `wbk-evt-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
      const res = await query(
        `INSERT INTO billing_webhook_events (
          id, event_id, provider_tx_id, event_type, invoice_id, organization_id, payload, status, processed_at, last_attempt_at, attempts
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, 'PROCESSING', NOW(), NOW(), 1)
        ON CONFLICT (event_id) DO NOTHING
        RETURNING id`,
        [
          id,
          data.eventId,
          data.providerTxId || null,
          data.eventType,
          data.invoiceId || null,
          data.organizationId || null,
          JSON.stringify(data.payload),
        ]
      );

      if (res.rows.length === 0) {
        // Race condition: another process inserted first. Re-fetch and evaluate state.
        const raceExisting = await query("SELECT * FROM billing_webhook_events WHERE event_id = $1", [data.eventId]);
        const raceRow = raceExisting.rows[0];
        if (raceRow?.status === "PROCESSED") {
          return { claimed: false, status: "PROCESSED", existingEvent: raceRow, reason: "ALREADY_PROCESSED" };
        }
        return {
          claimed: false,
          status: raceRow?.status || "PROCESSING",
          existingEvent: raceRow,
          reason: "CONCURRENT_PROCESSING",
        };
      }

      return { claimed: true, status: "PROCESSING", reason: "CLAIMED" };
    });
  }

  async markWebhookEventCompleted(
    eventId: string,
    status: "PROCESSED" | "FAILED" = "PROCESSED",
    errorMessage?: string
  ): Promise<void> {
    return TenantContext.run({ isSuperAdmin: true }, async () => {
      await query(
        `UPDATE billing_webhook_events
         SET status = $1,
             error_message = $2,
             processed_at = NOW()
         WHERE event_id = $3`,
        [status, errorMessage || null, eventId]
      );
    });
  }

  async recordWebhookEvent(data: {
    eventId: string;
    providerTxId?: string;
    eventType: string;
    invoiceId?: string;
    organizationId?: string;
    payload: any;
  }): Promise<void> {
    return TenantContext.run({ isSuperAdmin: true }, async () => {
      const id = `wbk-evt-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
      await query(
        `INSERT INTO billing_webhook_events (
          id, event_id, provider_tx_id, event_type, invoice_id, organization_id, payload, status, processed_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, 'PROCESSED', NOW())
        ON CONFLICT (event_id) DO UPDATE SET status = 'PROCESSED', processed_at = NOW()`,
        [
          id,
          data.eventId,
          data.providerTxId || null,
          data.eventType,
          data.invoiceId || null,
          data.organizationId || null,
          JSON.stringify(data.payload),
        ]
      );
    });
  }
}

export const billingRepo = new BillingRepository();
