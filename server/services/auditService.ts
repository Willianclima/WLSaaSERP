import { AuditLogEntity } from "../types/saas";
import { query } from "../db/postgres";
import { TenantContext } from "../db/tenantContext";

export interface AuditContextParams {
  organizationId?: string;
  userId?: string;
  action: string;
  entity: string;
  entityId?: string | ((result: any) => string);
  ipAddress?: string;
  userAgent?: string;
  details?: string | ((result: any, args: any[]) => string);
  captureChanges?: boolean;
  extractChanges?: (args: any[], result: any) => any;
  /**
   * Se true, falha de persistência no PostgreSQL ABORTA a operação imediatamente (P0).
   * Se omitido, auto-determina como crítico baseado na lista de ações P0 de governança.
   */
  critical?: boolean;
}

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

  /**
   * Lista de ações P0 de alta governança onde a persistência de auditoria no PostgreSQL é OBRIGATÓRIA.
   * Se o banco falhar na gravação do log de auditoria, a operação inteira falha e é abortada.
   */
  private static readonly P0_CRITICAL_ACTIONS = new Set<string>([
    "SUPER_ADMIN_CONTROLLED_SUPPORT_ACCESS",
    "ORGANIZATION_SUSPENDED",
    "ORGANIZATION_ACTIVATED",
    "PLAN_CHANGED",
    "SUBSCRIPTION_SIMULATE_PAYMENT",
    "SUBSCRIPTION_CANCELLED",
    "MODULE_TOGGLED",
    "ORGANIZATION_MODULES_BULK_UPDATE",
    "MEMBER_REMOVED",
    "MEMBER_ROLE_CHANGED",
    "PERMISSION_REVOKED",
    "ORGANIZATION_DELETED",
    "DATA_PURGE",
  ]);

  /**
   * Determina se uma ação específica exige auditoria P0 infalível (PostgreSQL obrigatório).
   */
  isCriticalAction(action: string): boolean {
    if (!action) return false;
    const normalized = action.toUpperCase().trim();
    if (AuditService.P0_CRITICAL_ACTIONS.has(normalized)) return true;
    return (
      normalized.includes("SUSPEND") ||
      normalized.includes("PLAN") ||
      normalized.includes("SUPPORT_ACCESS") ||
      normalized.includes("PERMISSION") ||
      normalized.includes("DELETE") ||
      normalized.includes("REVOKE") ||
      normalized.includes("SUPER_ADMIN")
    );
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
    changes?: any,
    options?: { requirePersistence?: boolean }
  ): Promise<AuditLogEntity> {
    const id = `aud-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const sanitizedDetails = details ? this.maskSensitiveData(details) : undefined;
    const sanitizedChanges = changes ? this.maskSensitiveData(changes) : undefined;
    const nowIso = new Date().toISOString();

    const isCritical = options?.requirePersistence ?? this.isCriticalAction(action);

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

    // Persist in PostgreSQL
    try {
      const validUserId = userId && typeof userId === "string" && userId.startsWith("usr-") ? userId : null;
      await query(
        `INSERT INTO audit_logs (id, organization_id, user_id, action, entity, entity_id, status, ip_address, user_agent, details, changes, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
        [
          id,
          organizationId,
          validUserId,
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
    } catch (dbErr: any) {
      if (isCritical) {
        console.error(
          `[AUDIT P0 FATAL] Falha de persistência no PostgreSQL para ação crítica '${action}'. Operação abortada imediatamente:`,
          dbErr
        );
        throw new Error(
          `Falha de auditoria crítica P0: Não foi possível persistir o registro de auditoria no PostgreSQL para a ação '${action}'. A operação foi abortada por razões de governança e conformidade. Detalhes: ${dbErr?.message || dbErr}`
        );
      }

      console.warn("Falha ao gravar audit_logs no PostgreSQL (salvo em memória para ação não crítica):", dbErr);
    }

    return log;
  }

  /**
   * Wrapper funcional para operações críticas de backend.
   * Executa a operação e registra obrigatoriamente a alteração na tabela de auditoria PostgreSQL.
   * Se for operação P0/crítica e a persistência no PostgreSQL falhar, a operação inteira falha.
   */
  async withAudit<T>(
    params: AuditContextParams,
    operation: () => Promise<T>
  ): Promise<T> {
    const auditStamp = TenantContext.getAuditStamp();
    const effectiveOrgId = params.organizationId || auditStamp.tenantId;

    if (!effectiveOrgId) {
      console.warn(`[AuditService.withAudit] Alerta de Governança: Operação crítica '${params.action}' executada sem tenant_id definido.`);
    }

    const effectiveUserId = params.userId || auditStamp.userId;
    const effectiveIp = params.ipAddress || auditStamp.ipAddress;
    const effectiveUserAgent = params.userAgent || auditStamp.userAgent;
    const isCritical = params.critical ?? this.isCriticalAction(params.action);

    try {
      const result = await operation();

      // Resolve entityId se fornecido como callback ou string
      let resolvedEntityId = "";
      if (typeof params.entityId === "function") {
        try {
          resolvedEntityId = params.entityId(result);
        } catch {
          resolvedEntityId = "N/A";
        }
      } else if (params.entityId) {
        resolvedEntityId = params.entityId;
      } else if (result && typeof result === "object" && "id" in result) {
        resolvedEntityId = String((result as any).id);
      }

      // Resolve details se fornecido como callback ou string
      let resolvedDetails: string | undefined;
      if (typeof params.details === "function") {
        try {
          resolvedDetails = params.details(result, []);
        } catch {
          resolvedDetails = `Operação crítica ${params.action} executada com sucesso.`;
        }
      } else {
        resolvedDetails = params.details || `Operação crítica ${params.action} em ${params.entity} finalizada com sucesso.`;
      }

      // Extrai alterações se configurado
      let changes: any = undefined;
      if (params.extractChanges) {
        try {
          changes = params.extractChanges([], result);
        } catch {}
      } else if (params.captureChanges && result) {
        changes = result;
      }

      if (effectiveOrgId) {
        await this.logAction(
          effectiveOrgId,
          effectiveUserId,
          params.action,
          params.entity,
          resolvedEntityId,
          effectiveIp,
          effectiveUserAgent,
          resolvedDetails,
          changes,
          { requirePersistence: isCritical }
        );
      }

      return result;
    } catch (error: any) {
      // Se o próprio erro foi uma falha de auditoria P0, propaga diretamente sem tentar outro log com falha
      if (error?.message?.includes("Falha de auditoria crítica P0")) {
        throw error;
      }

      // Registrar falha crítica se houver tenant conhecido
      if (effectiveOrgId) {
        try {
          await this.logAction(
            effectiveOrgId,
            effectiveUserId,
            `${params.action}_FAILED`,
            params.entity,
            typeof params.entityId === "string" ? params.entityId : "ERROR",
            effectiveIp,
            effectiveUserAgent,
            `Falha na operação crítica ${params.action}: ${error.message}`,
            undefined,
            { requirePersistence: false }
          );
        } catch (secondaryErr) {
          console.warn("[AuditService] Não foi possível registrar falha no audit log secundário:", secondaryErr);
        }
      }
      throw error;
    }
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

/**
 * Função utilitária standalone wrapper para executar operações críticas de backend
 * com garantia de auditoria e governança P0.
 */
export async function withAuditedOperation<T>(
  params: AuditContextParams,
  operation: () => Promise<T>
): Promise<T> {
  return auditService.withAudit<T>(params, operation);
}

/**
 * Decorador TypeScript MethodDecorator para métodos assíncronos em Services/Controllers.
 * Registra automaticamente a execução com carimbo do usuário, timestamp e tenant validado.
 */
export function AuditedOperation(params: {
  action: string;
  entity: string;
  entityId?: string | ((result: any, args: any[]) => string);
  details?: string | ((result: any, args: any[]) => string);
  captureChanges?: boolean;
}) {
  return function (
    _target: any,
    _propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      const stamp = TenantContext.getAuditStamp();
      const entityIdFn = typeof params.entityId === "function"
        ? (res: any) => (params.entityId as any)(res, args)
        : params.entityId;

      const detailsFn = typeof params.details === "function"
        ? (res: any) => (params.details as any)(res, args)
        : params.details;

      return auditService.withAudit(
        {
          organizationId: stamp.tenantId,
          userId: stamp.userId,
          action: params.action,
          entity: params.entity,
          entityId: entityIdFn,
          ipAddress: stamp.ipAddress,
          userAgent: stamp.userAgent,
          details: detailsFn,
          captureChanges: params.captureChanges,
        },
        async () => {
          return await originalMethod.apply(this, args);
        }
      );
    };

    return descriptor;
  };
}
