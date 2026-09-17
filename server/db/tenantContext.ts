import { AsyncLocalStorage } from "async_hooks";

export interface TenantSessionContext {
  tenantId?: string;
  userId?: string;
  userEmail?: string;
  userRole?: string;
  ipAddress?: string;
  userAgent?: string;
  isPublicStorefront?: boolean;
  isSuperAdmin?: boolean;
}

const tenantStorage = new AsyncLocalStorage<TenantSessionContext>();

export const TenantContext = {
  /**
   * Run a function with the provided tenant context active.
   */
  run<T>(context: TenantSessionContext, fn: () => T): T {
    return tenantStorage.run(context, fn);
  },

  /**
   * Get current tenant context.
   */
  get(): TenantSessionContext | undefined {
    return tenantStorage.getStore();
  },

  /**
   * Get current tenantId if present.
   */
  getTenantId(): string | undefined {
    return tenantStorage.getStore()?.tenantId;
  },

  /**
   * Get current authenticated user ID if present.
   */
  getUserId(): string | undefined {
    return tenantStorage.getStore()?.userId;
  },

  /**
   * Get current authenticated user email if present.
   */
  getUserEmail(): string | undefined {
    return tenantStorage.getStore()?.userEmail;
  },

  /**
   * Get current authenticated user role if present.
   */
  getUserRole(): string | undefined {
    return tenantStorage.getStore()?.userRole;
  },

  /**
   * Get client IP address if recorded in context.
   */
  getIpAddress(): string | undefined {
    return tenantStorage.getStore()?.ipAddress;
  },

  /**
   * Get client user agent if recorded in context.
   */
  getUserAgent(): string | undefined {
    return tenantStorage.getStore()?.userAgent;
  },

  /**
   * Returns a complete audit stamp for governance from current execution context.
   */
  getAuditStamp() {
    const store = tenantStorage.getStore();
    return {
      tenantId: store?.tenantId,
      userId: store?.userId || "SYSTEM",
      userEmail: store?.userEmail,
      userRole: store?.userRole,
      ipAddress: store?.ipAddress || "127.0.0.1",
      userAgent: store?.userAgent || "Aura Backend Service",
      timestamp: new Date().toISOString(),
    };
  },
};
