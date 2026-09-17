import crypto from "crypto";
import { Response, NextFunction } from "express";
import pg from "pg";
import { getSessionSecret } from "../config/authConfig";
import { userRepo, orgRepo, memberRepo } from "../repositories";
import { UserEntity, OrganizationEntity, OrganizationRole } from "../types/saas";
import { Request } from "express";
import { TenantContext } from "../db/tenantContext";
import { auditService } from "../services/auditService";
import { getPostgresPool, setLocalTenantId, applyRlsContext } from "../db/postgres";

export interface AuthenticatedRequest extends Request {
  user?: UserEntity;
  tenant?: OrganizationEntity;
  userRole?: OrganizationRole;
  organizationId?: string;
  withTenantDb?: <T>(callback: (client: pg.PoolClient) => Promise<T>) => Promise<T>;
  executeWithRls?: <T>(callback: (client: pg.PoolClient) => Promise<T>) => Promise<T>;
  scopedQuery?: <T = any>(sql: string, params?: any[]) => Promise<pg.QueryResult<T>>;
  db?: {
    query: <T = any>(sql: string, params?: any[]) => Promise<pg.QueryResult<T>>;
    withTransaction: <T>(callback: (client: pg.PoolClient) => Promise<T>) => Promise<T>;
  };
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
    // 2. IDENTIDADE VERIFICADA (Nível 1 de Barreira)
    // -------------------------------------------------------------------------
    req.user = user;

    // -------------------------------------------------------------------------
    // 3. MEMBERSHIP DISCOVERY & VALIDAÇÃO (Nível 2 de Barreira)
    // A organização NUNCA vem puramente de um cabeçalho arbitrário (x-tenant-id).
    // Ela DEVE ser validada contra os memberships ativos da identidade:
    // IDENTIDADE -> MEMBERSHIP -> TENANT CONTEXT -> RLS -> POSTGRESQL
    // -------------------------------------------------------------------------
    const userMemberships = await memberRepo.listByUser(user.id);
    const activeMemberships = userMemberships.filter((m) => m.status === "ACTIVE");

    // Identificador de tenant que a requisição está solicitando (se houver)
    const requestedTenantId = (tenantHeader || orgIdFromToken)?.trim();

    let targetTenantId: string | undefined;
    let effectiveRole: OrganizationRole = "VENDEDOR";

    if (user.isPlatformSuperAdmin) {
      // -----------------------------------------------------------------------
      // PERFIL SUPER_ADMIN (Governança da Plataforma):
      // - Pode administrar a plataforma (infraestrutura, telemetria global)
      // - Pode gerenciar organizações (criar, listar, suspender)
      // - Pode habilitar/desabilitar módulos
      // - Pode administrar planos de assinatura
      // - Pode acessar SUPORTE CONTROLADO a lojas específicas
      // - TUDO AUDITADO (nunca bypass silencioso de RLS)
      // -----------------------------------------------------------------------
      if (requestedTenantId) {
        // Suporte técnico supervisionado a uma organização específica
        const tenant = await orgRepo.findById(requestedTenantId);
        if (!tenant || tenant.status !== "ACTIVE") {
          return res.status(404).json({
            success: false,
            code: "TENANT_NOT_FOUND",
            error: `Organização '${requestedTenantId}' não encontrada ou inativa no sistema.`,
          });
        }
        targetTenantId = tenant.id;
        effectiveRole = "SUPER_ADMIN";

        // AUDITORIA P0 MANDATÓRIA: Todo acesso de Super Admin a dados de tenant é registrado
        const supportReason = (req.headers["x-support-reason"] as string) || "Sessão de suporte técnico supervisionado de plataforma";
        await auditService.logAction(
          targetTenantId,
          user.id,
          "SUPER_ADMIN_CONTROLLED_SUPPORT_ACCESS",
          "ORGANIZATION",
          targetTenantId,
          req.ip,
          req.headers["user-agent"] as string,
          `Super Admin (${user.email}) acessou loja em suporte supervisionado. Motivo: ${supportReason}`
        );
      } else {
        // Super Admin operando em rota de plataforma global (sem escopo de loja específico)
        targetTenantId = activeMemberships[0]?.organizationId;
        effectiveRole = "SUPER_ADMIN";
      }
    } else {
      // -----------------------------------------------------------------------
      // USUÁRIOS REGULARES (OWNER, ADMIN, GERENTE, VENDEDOR, REVENDEDORA):
      // BLINDAGEM P0: Se o navegador tentar injetar x-tenant-id: loja-456
      // e o usuário for da loja-123, a tentativa é REJEITADA IMEDIATAMENTE com 403.
      // O cabeçalho adulterado JAMAIS é aceito.
      // -----------------------------------------------------------------------
      if (activeMemberships.length === 0) {
        if (!isProduction && allowDevDemoFallback) {
          // Dev convenience: auto-seed dev membership
          const allOrgs = await orgRepo.listAll();
          const devOrg = allOrgs[0];
          if (devOrg) {
            const devMembership = {
              id: `mem-dev-${user.id}-${devOrg.id}`,
              organizationId: devOrg.id,
              userId: user.id,
              role: "OWNER" as OrganizationRole,
              status: "ACTIVE" as const,
              createdAt: new Date().toISOString().replace("T", " ").substring(0, 16),
            };
            await memberRepo.create(devMembership);
            activeMemberships.push(devMembership);
          }
        }

        if (activeMemberships.length === 0) {
          return res.status(403).json({
            success: false,
            code: "NO_ACTIVE_MEMBERSHIPS",
            error: "Acesso negado: a sua identidade não possui membership ativo em nenhuma organização.",
          });
        }
      }

      if (requestedTenantId) {
        // Verifica se o tenant solicitado pertence aos memberships ATIVOS desta identidade
        const matchedMembership = activeMemberships.find((m) => m.organizationId === requestedTenantId);

        if (!matchedMembership) {
          // TENTATIVA DE SPOOFING OU ACESSO INDEVIDO DETECTADA:
          // O usuário está autenticado na loja-123 e tentou mandar x-tenant-id: loja-456
          return res.status(403).json({
            success: false,
            code: "UNAUTHORIZED_TENANT_ACCESS",
            error: `Acesso não autorizado: a sua identidade autenticada (${user.email}) não possui membership ativo na organização '${requestedTenantId}'. Violação de isolamento multi-tenant bloqueada na barreira de Membership.`,
          });
        }

        targetTenantId = matchedMembership.organizationId;
        effectiveRole = matchedMembership.role;
      } else {
        // Nenhuma organização solicitada no cabeçalho: deriva estritamente do membership principal da identidade
        targetTenantId = activeMemberships[0].organizationId;
        effectiveRole = activeMemberships[0].role;
      }
    }

    if (!targetTenantId) {
      return res.status(400).json({
        success: false,
        code: "TENANT_CONTEXT_MISSING",
        error: "Nenhuma organização identificada no contexto de autenticação.",
      });
    }

    const tenant = await orgRepo.findById(targetTenantId);
    if (!tenant || tenant.status !== "ACTIVE") {
      return res.status(404).json({
        success: false,
        code: "TENANT_INACTIVE_OR_NOT_FOUND",
        error: `Organização '${targetTenantId}' não encontrada ou inativa no sistema.`,
      });
    }

    req.tenant = tenant;
    req.organizationId = tenant.id;
    req.userRole = effectiveRole;

    const isSuperAdmin = Boolean(user.isPlatformSuperAdmin);
    const sanitizedTenantId = tenant.id.replace(/[^a-zA-Z0-9_\-]/g, "");

    // Injeção de helpers de banco garantindo SET LOCAL app.current_tenant_id antes de consultas
    req.withTenantDb = async <T>(
      callback: (client: pg.PoolClient) => Promise<T>
    ): Promise<T> => {
      const client = await getPostgresPool().connect();
      try {
        await client.query("BEGIN");
        await setLocalTenantId(client, sanitizedTenantId, isSuperAdmin);
        const result = await callback(client);
        await client.query("COMMIT");
        return result;
      } catch (err) {
        await client.query("ROLLBACK");
        throw err;
      } finally {
        client.release();
      }
    };
    req.executeWithRls = req.withTenantDb;

    req.scopedQuery = async <T = any>(
      text: string,
      params?: any[]
    ): Promise<pg.QueryResult<T>> => {
      const client = await getPostgresPool().connect();
      try {
        await applyRlsContext(client);
        return await client.query<T>(text, params);
      } finally {
        try {
          await client.query(
            "SELECT set_config('app.current_tenant_id', '', false), set_config('app.is_super_admin', 'false', false)"
          );
        } catch {}
        client.release();
      }
    };

    req.db = {
      query: <T = any>(sql: string, params?: any[]) => req.scopedQuery!<T>(sql, params),
      withTransaction: <T>(callback: (client: pg.PoolClient) => Promise<T>) => req.withTenantDb!<T>(callback),
    };

    // -------------------------------------------------------------------------
    // 4. TENANT CONTEXT INJECTION (ASYNC LOCAL STORAGE)
    // O tenant ID estritamente validado por membership é injetado no contexto.
    // O PostgreSQL RLS executará: SET LOCAL app.current_tenant_id = '<targetTenantId>'
    // -------------------------------------------------------------------------
    TenantContext.run(
      {
        tenantId: sanitizedTenantId,
        isSuperAdmin,
      },
      () => {
        next();
      }
    );
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      error: error.message || "Erro interno no middleware de autenticação",
    });
  }
}

export { tenantRlsMiddleware } from "./tenantRlsMiddleware";
