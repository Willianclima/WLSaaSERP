import { subRepo, planRepo, moduleRepo } from "../repositories";
import { OrganizationRole, SystemModuleKey } from "../types/saas";

export class AccessControlService {
  /**
   * Checks if a user has sufficient RBAC role permission inside a tenant.
   * Note: Platform Super Admin is an enterprise SaaS identity (users.is_platform_super_admin),
   * while OWNER, LOJA_ADMIN, GERENTE_COMERCIAL, VENDEDOR are tenant-scoped roles (organization_members.role).
   */
  static hasRole(userRole: OrganizationRole, requiredRoles: OrganizationRole[], isPlatformSuperAdmin = false): boolean {
    // Platform Super Admin has universal platform maintenance bypass
    if (isPlatformSuperAdmin) {
      return true;
    }
    // Tenant Owner has full administrative control within their tenant
    if (userRole === "OWNER") {
      return true;
    }
    return requiredRoles.includes(userRole);
  }

  /**
   * Checks if an organization is authorized to access a given system module.
   */
  static async isModuleAuthorized(organizationId: string, moduleKey: SystemModuleKey): Promise<boolean> {
    const subscription = await subRepo.findByOrgId(organizationId);
    if (!subscription) return false;

    // Check if subscription status is active or trialing
    if (subscription.status !== "ACTIVE" && subscription.status !== "TRIALING") {
      return false;
    }

    const plan = await planRepo.findById(subscription.planId);
    if (!plan) return false;

    if (!plan.allowedModules.includes(moduleKey)) {
      return false;
    }

    const modules = await moduleRepo.listByOrgId(organizationId);
    const modConfig = modules.find((m) => m.moduleKey === moduleKey);
    return modConfig ? modConfig.isEnabled : true;
  }
}
