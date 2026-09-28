import { Response, NextFunction } from "express";
import { AuthenticatedRequest } from "./authMiddleware";
import { OrganizationRole, SystemModuleKey } from "../types/saas";
import { AccessControlService } from "../services/accessControlService";

/**
 * Ensures the authenticated user has one of the allowed roles.
 */
export function requireRole(allowedRoles: OrganizationRole[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const userRole = req.userRole;
    const isSuperAdmin = !!req.user?.isPlatformSuperAdmin;

    if (!userRole || !AccessControlService.hasRole(userRole, allowedRoles, isSuperAdmin)) {
      return res.status(403).json({
        success: false,
        code: "FORBIDDEN_ROLE",
        error: `Acesso negado: Seu perfil (${userRole || "Desconhecido"}) não possui permissão para esta operação.`,
        allowedRoles,
      });
    }
    next();
  };
}

/**
 * Strict SuperAdmin Authorization Guard.
 * Completely blocks store owners and common users from accessing platform governance endpoints.
 */
export function requireSuperAdmin() {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const isSuperAdmin = Boolean(req.user?.isPlatformSuperAdmin || req.userRole === "SUPER_ADMIN");
    if (!isSuperAdmin) {
      return res.status(403).json({
        success: false,
        code: "FORBIDDEN_SUPER_ADMIN_REQUIRED",
        error: "Acesso estritamente restrito: este recurso exige privilégios de Administrador Geral da Plataforma (SUPER_ADMIN). Lojistas e usuários comuns não possuem autorização.",
      });
    }
    next();
  };
}

/**
 * Ensures the request belongs to an authenticated store context.
 */
export function requireStoreStaff() {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.organizationId) {
      return res.status(400).json({
        success: false,
        code: "TENANT_REQUIRED",
        error: "Organização não identificada no contexto da requisição.",
      });
    }
    next();
  };
}

/**
 * Ensures the tenant's active plan authorizes the requested module.
 * CONCEITO 3 & 4: Barreira de Módulos & Não Confiar no Frontend
 * Se o plano não possui o módulo (ex: Starter tentando chamar consignments):
 * O backend responde estritamente 403 com code "MODULE_NOT_INCLUDED".
 */
export function requireModule(moduleKey: SystemModuleKey) {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const orgId = req.organizationId;
      if (!orgId) {
        return res.status(400).json({
          success: false,
          code: "TENANT_REQUIRED",
          error: "Organização não identificada no contexto da requisição.",
        });
      }

      // SuperAdmin operando em governança global possui autorização técnica
      const isSuperAdmin = Boolean(req.user?.isPlatformSuperAdmin || req.userRole === "SUPER_ADMIN");
      if (isSuperAdmin) {
        return next();
      }

      // Validação estrita do Módulo contra o Plano Contratado
      const check = await AccessControlService.checkModuleInPlan(orgId, moduleKey);
      if (!check.allowed) {
        return res.status(403).json({
          success: false,
          code: check.code || "MODULE_NOT_INCLUDED",
          error: check.error,
          moduleKey,
          currentPlan: check.planId,
          planName: check.planName,
          requiredAction: "UPGRADE_PLAN",
        });
      }

      next();
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  };
}
