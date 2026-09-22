import { Response, NextFunction } from "express";
import crypto from "crypto";
import pg from "pg";
import { AuthenticatedRequest } from "./authMiddleware";
import { JwtService, TenantJwtPayload } from "../services/jwtService";
import { getSessionSecret } from "../config/authConfig";
import { userRepo, orgRepo, memberRepo } from "../repositories";
import { TenantContext } from "../db/tenantContext";
import { getPostgresPool, setLocalTenantId, applyRlsContext } from "../db/postgres";
import { auditService } from "../services/auditService";
import { UserEntity, OrganizationEntity, OrganizationRole } from "../types/saas";

/**
 * Middleware Express que:
 * 1. Intercepta todas as requisições autenticadas.
 * 2. Valida o tenant_id proveniente do contexto de identidade do usuário no JWT (Membership).
 * 3. Garante que qualquer tentativa de spoofing via headers ou query seja rejeitada (HTTP 403).
 * 4. Executa o comando SQL 'SET LOCAL app.current_tenant_id = ?' antes da execução de qualquer query,
 *    garantindo o isolamento estrito do Row Level Security (RLS) no kernel do PostgreSQL.
 */
export async function jwtTenantRlsMiddleware(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const isProduction = process.env.NODE_ENV === "production";

    // -------------------------------------------------------------------------
    // 1. EXTRAÇÃO DO TOKEN (JWT ou Sessão Assinada)
    // -------------------------------------------------------------------------
    const authHeader = req.headers.authorization || (req.headers["x-session-token"] as string) || (req.query.token as string);
    const tenantHeader = (req.headers["x-tenant-id"] as string) || (req.query.tenantId as string);

    if (!authHeader && !req.user) {
      return res.status(401).json({
        success: false,
        code: "AUTH_TOKEN_REQUIRED",
        error: "Acesso não autorizado: token de autenticação JWT é obrigatório.",
      });
    }

    let tokenPayload: TenantJwtPayload | null = null;
    let userId: string | null = null;
    let tokenTenantId: string | null = null;

    if (authHeader) {
      const rawToken = authHeader.replace(/^Bearer\s+/i, "").trim();

      // Caso A: Token no formato JWT padrão RFC 7519 (header.payload.signature)
      if (JwtService.isJwt(rawToken)) {
        try {
          tokenPayload = JwtService.verify(rawToken);
          userId = tokenPayload.userId || tokenPayload.sub;
          tokenTenantId = tokenPayload.tenantId || tokenPayload.organizationId;
        } catch (jwtErr: any) {
          return res.status(401).json({
            success: false,
            code: "INVALID_JWT_TOKEN",
            error: `Token JWT inválido ou expirado: ${jwtErr.message}`,
          });
        }
      }
      // Caso B: Formato de sessão legada assinada com HMAC-SHA256 (sess_aura_{userId}_{orgId}_{timestamp}_{sig})
      else if (rawToken.startsWith("sess_aura_")) {
        const parts = rawToken.split("_");
        const uId = parts[2];
        const orgId = parts[3];
        const timestamp = parts[4];
        const signature = parts[5];

        if (!uId || !orgId) {
          return res.status(401).json({
            success: false,
            code: "INVALID_SESSION_PAYLOAD",
            error: "Token de sessão inválido: payload incompleto.",
          });
        }

        const sessionSecret = getSessionSecret();
        if (signature) {
          const expectedSig = crypto
            .createHmac("sha256", sessionSecret)
            .update(`${uId}_${orgId}_${timestamp}`)
            .digest("hex")
            .substring(0, 16);

          if (signature !== expectedSig) {
            return res.status(401).json({
              success: false,
              code: "INVALID_TOKEN_SIGNATURE",
              error: "Token de autenticação com assinatura inválida ou violada.",
            });
          }
        } else if (isProduction) {
          return res.status(401).json({
            success: false,
            code: "UNSIGNED_TOKEN_REJECTED",
            error: "Acesso negado: token sem assinatura criptográfica rejeitado em produção.",
          });
        }

        userId = uId;
        tokenTenantId = orgId;
        tokenPayload = {
          sub: uId,
          userId: uId,
          email: "",
          tenantId: orgId,
          organizationId: orgId,
          role: "OWNER" as OrganizationRole,
        };
      } else {
        return res.status(401).json({
          success: false,
          code: "UNKNOWN_TOKEN_FORMAT",
          error: "Formato de token de autenticação não reconhecido. Forneça um JWT válido.",
        });
      }
    }

    // -------------------------------------------------------------------------
    // 2. VALIDAÇÃO DE IDENTIDADE DO USUÁRIO
    // -------------------------------------------------------------------------
    let user: UserEntity | null = null;

    if (userId) {
      user = await userRepo.findById(userId);
    } else if (req.user) {
      user = req.user;
    }

    if (!user) {
      return res.status(401).json({
        success: false,
        code: "AUTH_TOKEN_REQUIRED",
        error: "Acesso não autorizado: token JWT com identidade válida é obrigatório.",
      });
    }

    if (user.status !== "ACTIVE") {
      return res.status(401).json({
        success: false,
        code: "USER_INACTIVE",
        error: "Conta de usuário inativa ou suspensa.",
      });
    }

    req.user = user;
    const isSuperAdmin = Boolean(user.isPlatformSuperAdmin);
    const isSupportSession = Boolean(tokenPayload?.isSupportSession);
    const supportReason = tokenPayload?.supportReason;
    const supportScope = tokenPayload?.supportScope || "FULL_SUPPORT";

    // -------------------------------------------------------------------------
    // 3. VALIDAÇÃO E ENFORCEMENT DO TENANT_ID A PARTIR DO MEMBERSHIP NO JWT
    // -------------------------------------------------------------------------
    // O tenant_id primário é obtido estritamente do contexto de identidade no JWT
    let targetTenantId = tokenTenantId || (req.jwtPayload?.tenantId || req.jwtPayload?.organizationId);

    // Se a requisição contiver cabeçalho 'x-tenant-id' ou 'tenantId', validamos contra tentativa de spoofing
    if (tenantHeader && tenantHeader.trim()) {
      const sanitizedHeaderTenant = tenantHeader.trim().replace(/[^a-zA-Z0-9_\-]/g, "");

      // Se o cabeçalho tentar sobrescrever o tenant do JWT:
      if (targetTenantId && sanitizedHeaderTenant !== targetTenantId) {
        // 1. Verifica se a identidade autenticada possui membership legítimo no tenant solicitado
        const memberships = await memberRepo.listByUser(user.id);
        const hasMembership = memberships.some(
          (m) => m.organizationId === sanitizedHeaderTenant && m.status === "ACTIVE"
        );

        if (hasMembership) {
          targetTenantId = sanitizedHeaderTenant;
        } else if (isSupportSession && tokenPayload?.tenantId === sanitizedHeaderTenant) {
          // Sessão de suporte controlada especificamente autorizada para este tenant
          targetTenantId = sanitizedHeaderTenant;
        } else if (isSuperAdmin) {
          // P0 CONTROLLED SUPPORT: Super Admin NÃO tem passe livre automático.
          // Deve obrigatoriamente iniciar sessão de suporte escopada com motivo e auditoria.
          await auditService.logAction(
            sanitizedHeaderTenant,
            user.id,
            "SUPER_ADMIN_UNAUTHORIZED_DIRECT_TENANT_ACCESS_BLOCKED",
            "ORGANIZATION",
            sanitizedHeaderTenant,
            req.ip,
            req.headers["user-agent"] as string,
            `Super Admin (${user.email}) tentou acessar tenant '${sanitizedHeaderTenant}' via cabeçalho direto sem sessão de suporte auditada. Bloqueado.`
          );

          return res.status(403).json({
            success: false,
            code: "CONTROLLED_SUPPORT_SESSION_REQUIRED",
            error: `Acesso negado: Administradores da plataforma devem iniciar uma sessão de suporte técnico controlada com motivo obrigatório e auditoria em PostgreSQL para acessar os dados da organização '${sanitizedHeaderTenant}'.`,
          });
        } else {
          await auditService.logAction(
            sanitizedHeaderTenant,
            user.id,
            "SECURITY_UNAUTHORIZED_TENANT_ACCESS",
            "RLS_BARRIER",
            targetTenantId || "unknown",
            req.ip,
            req.headers["user-agent"] as string,
            JSON.stringify({
              jwtTenantId: targetTenantId,
              attemptedTenantId: sanitizedHeaderTenant,
              reason: "Spoofing attempt blocked: user has no active membership in target organization",
            })
          );

          return res.status(403).json({
            success: false,
            code: "UNAUTHORIZED_TENANT_ACCESS",
            error: `Acesso não autorizado: a identidade autenticada (${user.email}) não possui membership ativo na organização '${sanitizedHeaderTenant}'. Bloqueado na barreira de Membership.`,
          });
        }
      } else if (!targetTenantId) {
        targetTenantId = sanitizedHeaderTenant;
      }
    }

    // Se ainda não tiver tenant definido, busca o membership ativo padrão do usuário
    if (!targetTenantId) {
      const memberships = await memberRepo.listByUser(user.id);
      const activeMembership = memberships.find((m) => m.status === "ACTIVE");
      if (!activeMembership && !isSupportSession) {
        return res.status(403).json({
          success: false,
          code: "MEMBERSHIP_REQUIRED",
          error: "O usuário não possui membership ativo em nenhuma organização.",
        });
      }
      targetTenantId = activeMembership?.organizationId;
    }

    if (!targetTenantId) {
      return res.status(400).json({
        success: false,
        code: "TENANT_ID_REQUIRED",
        error: "Não foi possível resolver o tenant_id a partir do contexto de Membership do usuário.",
      });
    }

    // Sanitiza contra SQL injection e caracteres maliciosos
    const validatedTenantId = targetTenantId.replace(/[^a-zA-Z0-9_\-]/g, "");

    // Validação estrita do Membership da identidade no banco de dados
    const membership = await memberRepo.findByOrgAndUser(validatedTenantId, user.id);
    if (!membership && !isSupportSession) {
      if (isSuperAdmin) {
        return res.status(403).json({
          success: false,
          code: "CONTROLLED_SUPPORT_SESSION_REQUIRED",
          error: `Acesso negado: Administradores da plataforma devem iniciar uma sessão de suporte técnico controlada com motivo obrigatório para acessar o tenant '${validatedTenantId}'.`,
        });
      }
      return res.status(403).json({
        success: false,
        code: "MEMBERSHIP_NOT_FOUND",
        error: `Acesso negado: membership não encontrado para o usuário na organização '${validatedTenantId}'.`,
      });
    }

    if (membership && membership.status !== "ACTIVE" && !isSupportSession) {
      return res.status(403).json({
        success: false,
        code: "MEMBERSHIP_SUSPENDED",
        error: "O seu acesso a esta organização está inativo ou suspenso.",
      });
    }

    // Se for sessão de suporte em modo SOMENTE LEITURA, bloquear operações de escrita
    if (isSupportSession && supportScope === "READ_ONLY") {
      const mutationMethods = ["POST", "PUT", "PATCH", "DELETE"];
      if (mutationMethods.includes(req.method.toUpperCase())) {
        return res.status(403).json({
          success: false,
          code: "SUPPORT_READ_ONLY_VIOLATION",
          error: "Sessão de suporte técnico sob escopo SOMENTE LEITURA. Operações de modificação de dados não são permitidas.",
        });
      }
    }

    const organization = await orgRepo.findById(validatedTenantId);
    if (!organization || (isProduction && organization.status !== "ACTIVE")) {
      return res.status(403).json({
        success: false,
        code: "ORGANIZATION_INACTIVE",
        error: "Organização vinculada não encontrada ou inativa.",
      });
    }

    const effectiveRole: OrganizationRole = isSupportSession
      ? (supportScope === "READ_ONLY" ? "VENDEDOR" : "OWNER")
      : (membership?.role || "VENDEDOR");

    // -------------------------------------------------------------------------
    // 4. ATRIBUIÇÃO AO OBJETO REQUEST
    // -------------------------------------------------------------------------
    req.user = user;
    req.tenant = organization;
    req.organizationId = validatedTenantId;
    req.userRole = effectiveRole;
    req.jwtPayload = tokenPayload || {
      sub: user.id,
      userId: user.id,
      email: user.email,
      tenantId: validatedTenantId,
      organizationId: validatedTenantId,
      role: effectiveRole,
      isPlatformSuperAdmin: isSuperAdmin,
    };

    // -------------------------------------------------------------------------
    // 5. INJEÇÃO DE CLIENT HELPERS COM 'SET LOCAL app.current_tenant_id = ?'
    // -------------------------------------------------------------------------
    req.withTenantDb = async <T>(
      callback: (client: pg.PoolClient) => Promise<T>
    ): Promise<T> => {
      const client = await getPostgresPool().connect();
      try {
        await client.query("BEGIN");
        // Executa explicitamente SET LOCAL app.current_tenant_id = '...' antes de qualquer query
        await setLocalTenantId(client, validatedTenantId, isSuperAdmin);
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
        await client.query(
          "SELECT set_config('app.current_tenant_id', $1, false), set_config('app.is_super_admin', $2, false)",
          [validatedTenantId, isSuperAdmin ? "true" : "false"]
        );
        try {
          await client.query(`SET LOCAL app.current_tenant_id = '${validatedTenantId}'`);
          await client.query(`SET LOCAL app.is_super_admin = '${isSuperAdmin ? "true" : "false"}'`);
        } catch {}
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
    // 6. EXECUÇÃO NO CONTEXTO TENANT (AsyncLocalStorage)
    // Garante que todas as queries executadas no escopo desta requisição (mesmo via query(...) do pool)
    // executem 'SET LOCAL app.current_tenant_id = ?' antes de tocar nas tabelas do PostgreSQL.
    // -------------------------------------------------------------------------
    TenantContext.run(
      {
        tenantId: validatedTenantId,
        userId: user.id,
        userEmail: user.email,
        userRole: effectiveRole,
        ipAddress: req.ip || (req.headers["x-forwarded-for"] as string) || "127.0.0.1",
        userAgent: (req.headers["user-agent"] as string) || "Aura Web Client",
        isSuperAdmin,
        isSupportSession,
        supportReason,
        supportScope,
        supportAdminEmail: tokenPayload?.supportAdminEmail,
      },
      () => {
        next();
      }
    );
  } catch (error: any) {
    console.error("[JwtTenantRlsMiddleware] Erro crítico no pipeline de segurança RLS:", error);
    return res.status(500).json({
      success: false,
      code: "RLS_MIDDLEWARE_ERROR",
      error: `Erro ao aplicar barreira de isolamento RLS: ${error.message}`,
    });
  }
}
