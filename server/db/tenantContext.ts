import { AsyncLocalStorage } from "async_hooks";

export interface TenantSessionContext {
  tenantId?: string;
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
};
