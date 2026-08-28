import { Response, NextFunction } from "express";
import { userRepo, orgRepo, memberRepo } from "../repositories";
import { UserEntity, OrganizationEntity, OrganizationRole } from "../types/saas";
import { Request } from "express";

export interface AuthenticatedRequest extends Request {
  user?: UserEntity;
  tenant?: OrganizationEntity;
  userRole?: OrganizationRole;
  organizationId?: string;
}

export async function authMiddleware(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const authHeader = req.headers.authorization || (req.headers["x-session-token"] as string);
    const tenantHeader = (req.headers["x-tenant-id"] as string) || (req.query.tenantId as string);

    // Fallback in dev/prototype to first admin user if no header provided
    let user: UserEntity | null = null;

    if (authHeader) {
      const token = authHeader.replace(/^Bearer\s+/i, "");
      // Format: sess_aura_{userId}_{orgId}_{timestamp}
      if (token.startsWith("sess_aura_")) {
        const parts = token.split("_");
        const userId = parts[2];
        user = await userRepo.findById(userId);
      }
    }

    if (!user) {
      // Default to primary seed admin
      const allUsers = await userRepo.listAll();
      user = allUsers[0] || null;
    }

    if (!user || user.status !== "ACTIVE") {
      return res.status(401).json({
        success: false,
        error: "Sessão expirada ou usuário inativo. Faça login novamente.",
      });
    }

    req.user = user;

    // 1. Resolve candidate tenant ID
    let targetOrgId = tenantHeader;
    if (!targetOrgId) {
      // Look up primary membership
      const userMemberships = await memberRepo.listByUser(user.id);
      if (userMemberships.length > 0) {
        targetOrgId = userMemberships[0].organizationId;
      }
    }

    if (!targetOrgId) {
      const allOrgs = await orgRepo.listAll();
      targetOrgId = allOrgs[0]?.id;
    }

    if (!targetOrgId) {
      return res.status(404).json({
        success: false,
        error: "Nenhuma organização disponível no sistema.",
      });
    }

    // 2. Validate Membership: User MUST have an active membership in the target organization unless platform Super Admin
    let membership = await memberRepo.findByOrgAndUser(targetOrgId, user.id);

    if (!membership && !user.isPlatformSuperAdmin) {
      // Check if user belongs to ANY organization, fallback if valid or deny if unauthorized tenant spoofing
      const validMemberships = await memberRepo.listByUser(user.id);
      if (validMemberships.length === 0) {
        return res.status(403).json({
          success: false,
          error: "Acesso negado: o usuário não possui vínculo ativo com nenhuma organização.",
        });
      }

      // If requested tenant is not in user's memberships, reject tenant spoofing
      return res.status(403).json({
        success: false,
        error: `Acesso não autorizado: você não é membro da organização ${targetOrgId}.`,
      });
    }

    if (membership && membership.status !== "ACTIVE" && !user.isPlatformSuperAdmin) {
      return res.status(403).json({
        success: false,
        error: "Seu acesso a esta organização está inativo ou suspenso.",
      });
    }

    const tenant = await orgRepo.findById(targetOrgId);
    if (!tenant) {
      return res.status(404).json({
        success: false,
        error: "Organização / Loja ativa não encontrada.",
      });
    }

    req.tenant = tenant;
    req.organizationId = tenant.id;

    // 3. Resolve RBAC Role
    let role: OrganizationRole = "VENDEDOR";
    if (membership) {
      role = membership.role;
    }

    if (user.isPlatformSuperAdmin) {
      role = "SUPER_ADMIN";
    }

    req.userRole = role;
    next();
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      error: error.message || "Erro no middleware de autenticação",
    });
  }
}
