import crypto from "crypto";
import { Response, NextFunction } from "express";
import { getSessionSecret } from "../config/authConfig";
import { userRepo, orgRepo, memberRepo } from "../repositories";
import { UserEntity, OrganizationEntity, OrganizationRole } from "../types/saas";
import { Request } from "express";

export interface AuthenticatedRequest extends Request {
  user?: UserEntity;
  tenant?: OrganizationEntity;
  userRole?: OrganizationRole;
  organizationId?: string;
}

/**
 * Authentication and Multi-Tenant Isolation Middleware.
 *
 * ENVIRONMENTS:
 * 1. DEVELOPMENT (NODE_ENV !== "production" and ENABLE_DEV_AUTH_DEMO_FALLBACK !== "false"):
 *    - Allows developer demo fallback when no authorization token is provided.
 *    - Emits a clear console warning for visibility.
 *
 * 2. PRODUCTION (NODE_ENV === "production"):
 *    - STRICT HARDENING:
 *      * Token/Session is MANDATORY (no token -> 401 Unauthorized)
 *      * Cryptographic signature verified against SESSION_SECRET
 *      * User is MANDATORY (must exist in DB and be ACTIVE)
 *      * Tenant is MANDATORY (explicit x-tenant-id or embedded in verified session)
 *      * Membership is MANDATORY (user must belong to tenant with ACTIVE status, or be platform Super Admin)
 *      * ZERO arbitrary fallbacks to allUsers[0] or allOrgs[0].
 */
export async function authMiddleware(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const isProduction = process.env.NODE_ENV === "production";
    const allowDevDemoFallback = !isProduction && process.env.ENABLE_DEV_AUTH_DEMO_FALLBACK !== "false";

    const authHeader = req.headers.authorization || (req.headers["x-session-token"] as string);
    const tenantHeader = (req.headers["x-tenant-id"] as string) || (req.query.tenantId as string);

    let user: UserEntity | null = null;
    let orgIdFromToken: string | undefined;

    // -------------------------------------------------------------------------
    // 1. EXTRACT & VERIFY SESSION TOKEN
    // -------------------------------------------------------------------------
    if (authHeader) {
      const token = authHeader.replace(/^Bearer\s+/i, "").trim();

      // Format: sess_aura_{userId}_{orgId}_{timestamp}_{signature?}
      if (token.startsWith("sess_aura_")) {
        const parts = token.split("_");
        const userId = parts[2];
        orgIdFromToken = parts[3];
        const timestamp = parts[4];
        const signature = parts[5];

        if (!userId) {
          return res.status(401).json({
            success: false,
            code: "INVALID_TOKEN_PAYLOAD",
            error: "Token de sessão inválido: identificador de usuário ausente.",
          });
        }

        // Cryptographic Signature verification
        const sessionSecret = getSessionSecret();
        if (!signature) {
          // In production, reject unsigned tokens
          if (isProduction) {
            return res.status(401).json({
              success: false,
              code: "UNSIGNED_TOKEN_REJECTED",
              error: "Acesso negado: token sem assinatura criptográfica rejeitado em produção.",
            });
          }
        } else {
          const expectedSig = crypto
            .createHmac("sha256", sessionSecret)
            .update(`${userId}_${orgIdFromToken}_${timestamp}`)
            .digest("hex")
            .substring(0, 16);

          if (signature !== expectedSig) {
            return res.status(401).json({
              success: false,
              code: "INVALID_TOKEN_SIGNATURE",
              error: "Token de sessão com assinatura inválida ou adulterada.",
            });
          }
        }

        user = await userRepo.findById(userId);
      } else {
        return res.status(401).json({
          success: false,
          code: "UNKNOWN_TOKEN_FORMAT",
          error: "Formato de token de autenticação não reconhecido.",
        });
      }
    }

    // -------------------------------------------------------------------------
    // 2. USER VALIDATION (STRICT IN PRODUCTION, DEMO FALLBACK ONLY IN DEV)
    // -------------------------------------------------------------------------
    if (!user) {
      if (isProduction || !allowDevDemoFallback) {
        return res.status(401).json({
          success: false,
          code: "AUTH_TOKEN_REQUIRED",
          error: "Acesso não autorizado: token de autenticação e sessão é obrigatório.",
        });
      }

      // DEVELOPMENT ONLY: Fallback demo user
      console.warn("[AuthMiddleware] [MODO DEV ATIVO] Requisição sem token em ambiente de desenvolvimento. Aplicando usuário demo.");
      const allUsers = await userRepo.listAll();
      user = allUsers.find((u) => u.status === "ACTIVE") || allUsers[0] || null;
    }

    if (!user || user.status !== "ACTIVE") {
      return res.status(401).json({
        success: false,
        code: "USER_INACTIVE_OR_NOT_FOUND",
        error: "Sessão inválida, usuário não encontrado ou inativo.",
      });
    }

    req.user = user;

    // -------------------------------------------------------------------------
    // 3. TENANT RESOLUTION (STRICT IN PRODUCTION, DEMO FALLBACK ONLY IN DEV)
    // -------------------------------------------------------------------------
    let targetOrgId = tenantHeader || orgIdFromToken;

    if (!targetOrgId) {
      if (isProduction || !allowDevDemoFallback) {
        return res.status(400).json({
          success: false,
          code: "TENANT_REQUIRED",
          error: "Identificador da organização/loja (x-tenant-id) é obrigatório em produção.",
        });
      }

      // DEVELOPMENT ONLY: Look up primary membership or seed tenant
      const userMemberships = await memberRepo.listByUser(user.id);
      if (userMemberships.length > 0) {
        targetOrgId = userMemberships[0].organizationId;
      } else {
        const allOrgs = await orgRepo.listAll();
        targetOrgId = allOrgs[0]?.id;
      }
    }

    if (!targetOrgId) {
      return res.status(404).json({
        success: false,
        code: "TENANT_NOT_FOUND",
        error: "Nenhuma organização vinculada ao contexto da requisição.",
      });
    }

    const tenant = await orgRepo.findById(targetOrgId);
    if (!tenant || tenant.status !== "ACTIVE") {
      return res.status(404).json({
        success: false,
        code: "TENANT_INACTIVE_OR_NOT_FOUND",
        error: `Organização '${targetOrgId}' não encontrada ou inativa no sistema.`,
      });
    }

    // -------------------------------------------------------------------------
    // 4. MEMBERSHIP VALIDATION (STRICT RBAC & MULTI-TENANT ISOLATION)
    // -------------------------------------------------------------------------
    let membership = await memberRepo.findByOrgAndUser(tenant.id, user.id);

    if (!membership && !user.isPlatformSuperAdmin) {
      if (isProduction || !allowDevDemoFallback) {
        return res.status(403).json({
          success: false,
          code: "MEMBERSHIP_REQUIRED",
          error: `Acesso negado: o usuário não possui vínculo ativo com a organização '${tenant.name}'.`,
        });
      }

      // In dev mode, check if user belongs to any org or auto-grant dev access
      const userMemberships = await memberRepo.listByUser(user.id);
      if (userMemberships.length === 0) {
        console.warn(`[AuthMiddleware] [DEV] Criando vínculo de desenvolvimento para ${user.email} na organização ${tenant.name}`);
        membership = {
          id: `mem-dev-${user.id}-${tenant.id}`,
          organizationId: tenant.id,
          userId: user.id,
          role: "OWNER",
          status: "ACTIVE",
          createdAt: new Date().toISOString().replace("T", " ").substring(0, 16),
        };
        await memberRepo.create(membership);
      } else {
        return res.status(403).json({
          success: false,
          code: "UNAUTHORIZED_TENANT_ACCESS",
          error: `Acesso não autorizado: você não é membro da organização ${tenant.name}.`,
        });
      }
    }

    if (membership && membership.status !== "ACTIVE" && !user.isPlatformSuperAdmin) {
      return res.status(403).json({
        success: false,
        code: "MEMBERSHIP_SUSPENDED",
        error: "Seu acesso de membro a esta organização está suspenso ou inativo.",
      });
    }

    req.tenant = tenant;
    req.organizationId = tenant.id;

    // -------------------------------------------------------------------------
    // 5. RESOLVE RBAC ROLE
    // -------------------------------------------------------------------------
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
      error: error.message || "Erro interno no middleware de autenticação",
    });
  }
}
