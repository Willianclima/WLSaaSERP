import { AuditLogEntity } from "../types/saas";
import { query } from "../db/postgres";

class AuditService {
  private inMemoryLogs: AuditLogEntity[] = [];

  /**
   * Sanitizes sensitive fields according to LGPD compliance guidelines.
   */
  private maskSensitiveData(data: any): any {
    if (!data) return data;
    if (typeof data === "string") {
      // Mask CPF pattern: 123.456.789-00 -> 123.***.***-00
      return data
        .replace(/\b(\d{3})\.\d{3}\.\d{3}-(\d{2})\b/g, "$1.***.***-$2")
        // Mask passwords or tokens in key-value strings
        .replace(/("password"|"token"|"secret"|"password_hash"):\s*"[^"]+"/gi, '$1: "********"');
    }
    if (typeof data === "object") {
      const sanitized: any = Array.isArray(data) ? [] : {};
      for (const [key, value] of Object.entries(data)) {
        if (/password|secret|token|card|cvv|hash/i.test(key)) {
          sanitized[key] = "********";
        } else if (typeof value === "object") {
          sanitized[key] = this.maskSensitiveData(value);
        } else if (typeof value === "string") {
          sanitized[key] = this.maskSensitiveData(value);
        } else {
          sanitized[key] = value;
        }
      }
      return sanitized;
    }
    return data;
  }

  async logAction(
    organizationId: string,
    userId: string | undefined,
    action: string,
    entity: string,
    entityId: string,
    ipAddress?: string,
    userAgent?: string,
    details?: string,
    changes?: any
  ): Promise<AuditLogEntity> {
    const id = `aud-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const sanitizedDetails = details ? this.maskSensitiveData(details) : undefined;
    const sanitizedChanges = changes ? this.maskSensitiveData(changes) : undefined;
    const nowIso = new Date().toISOString();

    const log: AuditLogEntity = {
      id,
      organizationId,
      userId: userId || "SYSTEM",
      action,
      entity,
      entityId,
      status: "SUCESSO",
      ipAddress: ipAddress || "127.0.0.1",
      userAgent: userAgent || "Aura Core Service",
      details: sanitizedDetails,
      changes: sanitizedChanges,
      createdAt: nowIso.replace("T", " ").substring(0, 16),
    };

    // Store in-memory buffer
    this.inMemoryLogs.unshift(log);
    if (this.inMemoryLogs.length > 500) {
      this.inMemoryLogs = this.inMemoryLogs.slice(0, 500);
    }

    // Persist asynchronously in PostgreSQL
    try {
      await query(
        `INSERT INTO audit_logs (id, organization_id, user_id, action, entity, entity_id, status, ip_address, user_agent, details, changes, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
        [
          id,
          organizationId,
          userId || null,
          action,
          entity || null,
          entityId || null,
          "SUCESSO",
          ipAddress || "127.0.0.1",
          userAgent || "Aura Core Service",
          sanitizedDetails || null,
          sanitizedChanges ? JSON.stringify(sanitizedChanges) : null,
          nowIso,
        ]
      );
    } catch (dbErr) {
      console.warn("Falha ao gravar audit_logs no PostgreSQL (salvo em memória):", dbErr);
    }

    return log;
  }

  async listLogs(organizationId: string, limit = 100): Promise<AuditLogEntity[]> {
    try {
      const res = await query(
        `SELECT id, organization_id, user_id, action, entity, entity_id, status, ip_address, user_agent, details, changes, created_at
         FROM audit_logs
         WHERE organization_id = $1
         ORDER BY created_at DESC
         LIMIT $2`,
        [organizationId, limit]
      );

      if (res.rows && res.rows.length > 0) {
        return res.rows.map((r: any) => ({
          id: r.id,
          organizationId: r.organization_id,
          userId: r.user_id,
          action: r.action,
          entity: r.entity,
          entityId: r.entity_id,
          status: r.status,
          ipAddress: r.ip_address,
          userAgent: r.user_agent,
          details: r.details,
          changes: typeof r.changes === "string" ? JSON.parse(r.changes) : r.changes,
          createdAt: r.created_at ? new Date(r.created_at).toISOString().replace("T", " ").substring(0, 16) : "",
        }));
      }
    } catch (err) {
      console.warn("Falha ao consultar audit_logs do PostgreSQL, retornando buffer:", err);
    }

    return this.inMemoryLogs
      .filter((l) => l.organizationId === organizationId)
      .slice(0, limit);
  }
}

export const auditService = new AuditService();
