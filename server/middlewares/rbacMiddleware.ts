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
 */
export function requireModule(moduleKey: SystemModuleKey) {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const orgId = req.organizationId;
      if (!orgId) {
        return res.status(400).json({ success: false, error: "Organização não identificada no contexto." });
      }

      const isAuthorized = await AccessControlService.isModuleAuthorized(orgId, moduleKey);
      if (!isAuthorized) {
        return res.status(403).json({
          success: false,
          error: `Módulo "${moduleKey}" bloqueado. Seu plano atual ou período de trial não contempla este recurso.`,
          moduleKey,
        });
      }
      next();
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  };
}
