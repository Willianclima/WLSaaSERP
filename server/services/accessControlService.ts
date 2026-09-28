import { subRepo, planRepo, moduleRepo } from "../repositories";
import { OrganizationRole, SystemModuleKey, SaaSPlanId, SubscriptionStatus } from "../types/saas";

export interface ModuleAccessCheckResult {
  allowed: boolean;
  code?: "MODULE_NOT_INCLUDED" | "MODULE_DISABLED_BY_STORE" | "SUBSCRIPTION_REQUIRED" | "PLAN_NOT_FOUND";
  error?: string;
  planId?: SaaSPlanId;
  planName?: string;
  moduleKey?: SystemModuleKey;
}

export class AccessControlService {
  /**
   * Checks if a user has sufficient RBAC role permission inside a tenant.
   * CONCEITO 2: PERMISSÃO (O que o usuário pode fazer?)
   * Note: Platform Super Admin is an enterprise SaaS identity (users.is_platform_super_admin),
   * while OWNER, LOJA_ADMIN, GERENTE_COMERCIAL, VENDEDOR are tenant-scoped roles (organization_members.role).
   */
  static hasRole(userRole: OrganizationRole, requiredRoles: OrganizationRole[], isPlatformSuperAdmin = false): boolean {
    // 1. Se o papel exato do usuário está na lista de roles permitidas (ex: OWNER está em ["SUPER_ADMIN", "OWNER"])
    if (requiredRoles.includes(userRole)) {
      return true;
    }

    // 2. Platform Super Admin possui autorização geral (e suporte assistido supervisionado)
    if (isPlatformSuperAdmin || userRole === "SUPER_ADMIN") {
      return true;
    }

    // 3. Tenant Owner possui autorização sobre todas as rotas operacionais de loja (a menos que a rota seja exclusivamente SUPER_ADMIN)
    const isExclusivelySuperAdmin = requiredRoles.length === 1 && requiredRoles[0] === "SUPER_ADMIN";
    if (userRole === "OWNER" && !isExclusivelySuperAdmin) {
      return true;
    }

    return false;
  }

  /**
   * Checks if an organization is commercially licensed for a given system module under its contracted plan.
   * CONCEITO 3 & 4: MÓDULOS & PLANO (Não confiar no frontend - se não contratou, 403 MODULE_NOT_INCLUDED).
   */
  static async checkModuleInPlan(organizationId: string, moduleKey: SystemModuleKey): Promise<ModuleAccessCheckResult> {
    const subscription = await subRepo.findByOrgId(organizationId);
    if (!subscription) {
      return {
        allowed: false,
        code: "SUBSCRIPTION_REQUIRED",
        error: "Organização não possui assinatura registrada no sistema.",
        moduleKey,
      };
    }

    const plan = await planRepo.findById(subscription.planId);
    if (!plan) {
      return {
        allowed: false,
        code: "PLAN_NOT_FOUND",
        error: `Plano '${subscription.planId}' não foi localizado no catálogo da plataforma.`,
        moduleKey,
      };
    }

    // Validação estrita: O módulo solicitado faz parte do plano contratado?
    if (!plan.allowedModules.includes(moduleKey)) {
      const moduleNames: Record<SystemModuleKey, string> = {
        core_erp: "Core ERP & Cadastros Básicos",
        catalog_inventory: "Catálogo & Ledger de Estoque",
        consignments: "Gestão de Consignações & Revendedoras",
        commission_engine: "Motor de Comissões Escalonadas",
        digital_warranty: "Passaporte de Garantia Digital QR",
        custom_jewelry: "Estúdio de Joias Personalizadas",
        ecommerce_storefront: "E-commerce & Vitrine Digital",
        custom_domain_ssl: "Domínio Próprio & SSL Gerenciado",
        webhooks_api: "Webhooks Externos & Event-Driven API",
        ai_copilot_mcp: "AI Copilot & Assistente de Vendas",
        security_lgpd: "Auditoria de Segurança & LGPD",
      };

      const moduleDisplayName = moduleNames[moduleKey] || moduleKey;

      return {
        allowed: false,
        code: "MODULE_NOT_INCLUDED",
        error: `Acesso negado: O recurso "${moduleDisplayName}" (${moduleKey}) não está incluído no seu plano atual (${plan.name}). Faça upgrade para o plano Pro ou Enterprise para desbloquear este módulo.`,
        planId: plan.id,
        planName: plan.name,
        moduleKey,
      };
    }

    // Se o plano permite, verifica se a loja desativou voluntariamente em organization_modules
    const modules = await moduleRepo.listByOrgId(organizationId);
    const modConfig = modules.find((m) => m.moduleKey === moduleKey);
    if (modConfig && !modConfig.isEnabled) {
      return {
        allowed: false,
        code: "MODULE_DISABLED_BY_STORE",
        error: `O módulo "${moduleKey}" está temporariamente desativado nas preferências de módulos da sua loja.`,
        planId: plan.id,
        planName: plan.name,
        moduleKey,
      };
    }

    return {
      allowed: true,
      planId: plan.id,
      planName: plan.name,
      moduleKey,
    };
  }

  /**
   * Helper legado para compatibilidade com chamadas booleanas anteriores.
   */
  static async isModuleAuthorized(organizationId: string, moduleKey: SystemModuleKey): Promise<boolean> {
    const res = await this.checkModuleInPlan(organizationId, moduleKey);
    return res.allowed;
  }
}

