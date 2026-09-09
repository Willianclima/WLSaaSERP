import crypto from "crypto";
import { query } from "../db/postgres";

export interface IdempotencyRecord {
  id: string;
  organizationId: string;
  idempotencyKey: string;
  resourceType: string;
  requestHash?: string;
  status: "PROCESSING" | "COMPLETED" | "FAILED";
  responseCode?: number;
  responseBody?: any;
  userId?: string;
  expiresAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface IdempotencyExecuteOptions {
  organizationId: string;
  idempotencyKey: string;
  resourceType: string;
  payload?: any;
  userId?: string;
  ttlMinutes?: number;
}

export interface IdempotencyExecutionResult<T> {
  fromCache: boolean;
  statusCode: number;
  data: T;
}

/**
 * Universal Idempotency Service for Distributed SaaS Operations
 * Handles idempotency keys for Orders, Payments, Inventory Reservations, Transfers, Consignments & Webhooks.
 * Backed by PostgreSQL idempotency_keys table.
 */
export class IdempotencyService {
  private static locks = new Map<string, Promise<any>>();

  /**
   * Generates a deterministic SHA-256 hash for payload verification.
   */
  private static hashPayload(payload: any): string {
    if (!payload) return "";
    try {
      const serialized = typeof payload === "string" ? payload : JSON.stringify(payload);
      return crypto.createHash("sha256").update(serialized).digest("hex");
    } catch {
      return "";
    }
  }

  /**
   * Finds an existing valid idempotency record for the organization.
   */
  static async getRecord(orgId: string, idempotencyKey: string): Promise<IdempotencyRecord | null> {
    try {
      const res = await query(
        "SELECT * FROM idempotency_keys WHERE organization_id = $1 AND idempotency_key = $2 AND expires_at > NOW()",
        [orgId, idempotencyKey]
      );
      if (res.rows.length === 0) return null;
      const r = res.rows[0];
      return {
        id: r.id,
        organizationId: r.organization_id,
        idempotencyKey: r.idempotency_key,
        resourceType: r.resource_type,
        requestHash: r.request_hash,
        status: r.status,
        responseCode: r.response_code,
        responseBody: r.response_body,
        userId: r.user_id,
        expiresAt: r.expires_at,
        createdAt: r.created_at,
        updatedAt: r.updated_at,
      };
    } catch (err: any) {
      console.warn(`[IdempotencyService] Warning fetching record:`, err.message);
      return null;
    }
  }

  /**
   * Wraps an operation in an idempotent execution boundary with lock and response caching.
   */
  static async execute<T>(
    options: IdempotencyExecuteOptions,
    operation: () => Promise<{ statusCode?: number; data: T }>
  ): Promise<IdempotencyExecutionResult<T>> {
    const {
      organizationId,
      idempotencyKey,
      resourceType,
      payload,
      userId,
      ttlMinutes = 60,
    } = options;

    if (!idempotencyKey) {
      const result = await operation();
      return {
        fromCache: false,
        statusCode: result.statusCode || 200,
        data: result.data,
      };
    }

    const mapKey = `${organizationId}:${idempotencyKey}`;
    const requestHash = this.hashPayload(payload);
    const now = new Date();
    const expiresAt = new Date(now.getTime() + ttlMinutes * 60000).toISOString();

    // Check existing record from PostgreSQL
    const existingRec = await this.getRecord(organizationId, idempotencyKey);
    if (existingRec && existingRec.status === "COMPLETED") {
      return {
        fromCache: true,
        statusCode: existingRec.responseCode || 200,
        data: existingRec.responseBody as T,
      };
    }

    // Check if another in-flight call is currently executing with this exact key
    if (this.locks.has(mapKey)) {
      try {
        await this.locks.get(mapKey);
      } catch {
        // Handled by worker
      }
      const cached = await this.getRecord(organizationId, idempotencyKey);
      if (cached && cached.status === "COMPLETED") {
        return {
          fromCache: true,
          statusCode: cached.responseCode || 200,
          data: cached.responseBody as T,
        };
      }
    }

    // Acquire lock synchronously before yielding to any microtasks
    let resolveLock!: () => void;
    let rejectLock!: (err: any) => void;
    const lockPromise = new Promise<void>((res, rej) => {
      resolveLock = res;
      rejectLock = rej;
    });
    this.locks.set(mapKey, lockPromise);

    // Register initial PROCESSING record in PostgreSQL
    const recordId = `idem-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
    try {
      await query(
        `INSERT INTO idempotency_keys (
          id, organization_id, idempotency_key, resource_type, request_hash, status, user_id, expires_at, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, 'PROCESSING', $6, $7, NOW(), NOW())
        ON CONFLICT (organization_id, idempotency_key) DO UPDATE SET
          status = 'PROCESSING',
          updated_at = NOW()`,
        [recordId, organizationId, idempotencyKey, resourceType, requestHash, userId || null, expiresAt]
      );
    } catch (err: any) {
      console.warn(`[IdempotencyService] Notice on initial insert:`, err.message);
    }

    try {
      const result = await operation();
      const statusCode = result.statusCode || 200;

      // Save COMPLETED status with cached response in PostgreSQL
      try {
        await query(
          `UPDATE idempotency_keys SET
            status = 'COMPLETED',
            response_code = $1,
            response_body = $2,
            updated_at = NOW()
          WHERE organization_id = $3 AND idempotency_key = $4`,
          [statusCode, JSON.stringify(result.data), organizationId, idempotencyKey]
        );
      } catch (err: any) {
        console.warn(`[IdempotencyService] Notice on completion update:`, err.message);
      }

      resolveLock();

      return {
        fromCache: false,
        statusCode,
        data: result.data,
      };
    } catch (error: any) {
      // Mark as FAILED so client can retry with a fixed payload or new key
      try {
        await query(
          `UPDATE idempotency_keys SET
            status = 'FAILED',
            response_code = 500,
            response_body = $1,
            updated_at = NOW()
          WHERE organization_id = $2 AND idempotency_key = $3`,
          [JSON.stringify({ error: error.message }), organizationId, idempotencyKey]
        );
      } catch (err: any) {
        console.warn(`[IdempotencyService] Notice on failure update:`, err.message);
      }

      rejectLock(error);
      throw error;
    } finally {
      this.locks.delete(mapKey);
    }
  }

  /**
   * Sweeps expired idempotency keys from PostgreSQL
   */
  static async sweepExpired(): Promise<number> {
    try {
      const res = await query("DELETE FROM idempotency_keys WHERE expires_at <= NOW()");
      return res.rowCount || 0;
    } catch (err: any) {
      console.error(`[IdempotencyService] Error sweeping expired keys:`, err.message);
      return 0;
    }
  }
}
