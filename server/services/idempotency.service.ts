import crypto from "crypto";
import { dbStore, IdempotencyRecord } from "../db/store";

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
    const key = `${orgId}:${idempotencyKey}`;
    const record = dbStore.idempotencyKeys.get(key);
    if (!record) return null;

    // Check expiration
    if (new Date(record.expiresAt).getTime() <= Date.now()) {
      dbStore.idempotencyKeys.delete(key);
      return null;
    }

    return record;
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
      // If no key is provided, execute directly without idempotency wrapper
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

    // Check existing record synchronously
    const existingRec = dbStore.idempotencyKeys.get(mapKey);
    if (existingRec && new Date(existingRec.expiresAt).getTime() > Date.now()) {
      if (existingRec.status === "COMPLETED") {
        return {
          fromCache: true,
          statusCode: existingRec.responseCode || 200,
          data: existingRec.responseBody as T,
        };
      }
    }

    // Check if another call is currently executing with this exact key
    if (this.locks.has(mapKey)) {
      try {
        await this.locks.get(mapKey);
      } catch {
        // Handled by worker
      }
      const cached = dbStore.idempotencyKeys.get(mapKey);
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

    // Register initial PROCESSING record
    const recordId = `idem-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
    const pendingRecord: IdempotencyRecord = {
      id: recordId,
      organizationId,
      idempotencyKey,
      resourceType,
      requestHash,
      status: "PROCESSING",
      userId,
      expiresAt,
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    };
    dbStore.idempotencyKeys.set(mapKey, pendingRecord);

    try {
      const result = await operation();
      const statusCode = result.statusCode || 200;

      // Save COMPLETED status with cached response
      const completedRecord: IdempotencyRecord = {
        ...pendingRecord,
        status: "COMPLETED",
        responseCode: statusCode,
        responseBody: result.data,
        updatedAt: new Date().toISOString(),
      };
      dbStore.idempotencyKeys.set(mapKey, completedRecord);
      resolveLock();

      return {
        fromCache: false,
        statusCode,
        data: result.data,
      };
    } catch (error: any) {
      // Mark as FAILED so client can retry with a fixed payload or new key
      const failedRecord: IdempotencyRecord = {
        ...pendingRecord,
        status: "FAILED",
        responseCode: 500,
        responseBody: { error: error.message },
        updatedAt: new Date().toISOString(),
      };
      dbStore.idempotencyKeys.set(mapKey, failedRecord);
      rejectLock(error);
      throw error;
    } finally {
      this.locks.delete(mapKey);
    }
  }

  /**
   * Sweeps expired idempotency keys
   */
  static sweepExpired(): number {
    let swept = 0;
    const now = Date.now();
    for (const [key, rec] of dbStore.idempotencyKeys.entries()) {
      if (new Date(rec.expiresAt).getTime() <= now) {
        dbStore.idempotencyKeys.delete(key);
        swept++;
      }
    }
    return swept;
  }
}
