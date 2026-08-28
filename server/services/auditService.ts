import { AuditLogEntity } from "../types/saas";

class AuditService {
  private inMemoryLogs: AuditLogEntity[] = [];

  async logAction(
    organizationId: string,
    userId: string | undefined,
    action: string,
    entity: string,
    entityId: string,
    ipAddress: string,
    userAgent: string,
    details?: string,
    changes?: any
  ): Promise<AuditLogEntity> {
    const log: AuditLogEntity = {
      id: `aud-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      organizationId,
      userId,
      action,
      entity,
      entityId,
      status: "SUCESSO",
      ipAddress,
      userAgent,
      details,
      changes,
      createdAt: new Date().toISOString().replace("T", " ").substring(0, 16),
    };

    this.inMemoryLogs.unshift(log);
    if (this.inMemoryLogs.length > 500) {
      this.inMemoryLogs = this.inMemoryLogs.slice(0, 500);
    }

    return log;
  }

  async listLogs(organizationId: string, limit = 100): Promise<AuditLogEntity[]> {
    return this.inMemoryLogs
      .filter((l) => l.organizationId === organizationId)
      .slice(0, limit);
  }
}

export const auditService = new AuditService();
