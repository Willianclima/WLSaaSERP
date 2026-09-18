import { Response, NextFunction } from "express";
import pg from "pg";
import { AuthenticatedRequest, authMiddleware } from "./authMiddleware";
import { TenantContext } from "../db/tenantContext";
import { getPostgresPool, setLocalTenantId, applyRlsContext } from "../db/postgres";
import { memberRepo, orgRepo } from "../repositories";
import { auditService } from "../services/auditService";

/**
 * Middleware de Segurança P0:
 * Barreira Inegociável de Isolamento Multi-Tenant:
 *
 *   REQUISIÇÃO
 *       ↓
 *   AUTENTICAÇÃO (Token/Assinatura HMAC)
 *       ↓
 *   AUTORIZAÇÃO (Identity Verified)
 *       ↓
 *   ORGANIZATION (Membership ativo no banco)
 *       ↓
 *   TENANT CONTEXT (AsyncLocalStorage)
 *       ↓
 *   SET LOCAL app.current_tenant_id = ?
 *       ↓
 *   ROW LEVEL SECURITY (PostgreSQL Kernel)
 *
 * Para TODA requisição autenticada:
 * 1. Intercepta a requisição e valida o usuário autenticado e seus Memberships ativos.
 * 2. Extrai o tenant_id estritamente a partir do contexto de Membership (bloqueando qualquer spoofing via x-tenant-id).
 * 3. Executa o comando 'SET LOCAL app.current_tenant_id = ?' antes de passar a requisição para o pool do PostgreSQL,
 *    garantindo que as políticas de Row Level Security (RLS) sejam aplicadas estritamente pelo banco.
 */
export async function tenantRlsMiddleware(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  try {
    let user = req.user;

    // Se o usuário ainda não foi autenticado por um middleware anterior, resolve a autenticação
    if (!user) {
      const hasAuthHeader = Boolean(
        req.headers.authorization ||
        req.headers["x-session-token"] ||
        req.query.token
      );
      if (hasAuthHeader) {
        return authMiddleware(req, res, () => {
          return tenantRlsMiddleware(req, res, next);
        });
      }
      return res.status(401).json({
        success: false,
        code: "AUTH_TOKEN_REQUIRED",
        error: "Acesso não autorizado: token de autenticação e sessão é obrigatório para isolamento RLS.",
      });
    }

    const tenantHeader = (req.headers["x-tenant-id"] as string) || (req.query.tenantId as string);
    let verifiedTenantId: string | null = null;
    let isSuperAdmin = Boolean(user.isPlatformSuperAdmin);

    // -------------------------------------------------------------------------
    // 1. RESOLVER TENANT A PARTIR DO MEMBERSHIP DA IDENTIDADE
    // -------------------------------------------------------------------------
    if (user.isPlatformSuperAdmin) {
      // Super Admin: acesso administrativo auditado
      if (tenantHeader) {
        const tenant = await orgRepo.findById(tenantHeader.trim());
        if (!tenant || tenant.status !== "ACTIVE") {
          return res.status(404).json({
            success: false,
            code: "TENANT_NOT_FOUND",
            error: `Organização '${tenantHeader}' não encontrada ou inativa.`,
          });
        }
        verifiedTenantId = tenant.id;

        // Auditoria obrigatória de suporte supervisionado de plataforma
        const reason = (req.headers["x-support-reason"] as string) || "Operação administrativa supervisionada";
        await auditService.logAction(
          verifiedTenantId,
          user.id,
          "SUPER_ADMIN_RLS_CONTEXT_ATTACHED",
          "ORGANIZATION",
          verifiedTenantId,
          req.ip,
          req.headers["user-agent"] as string,
          `Super Admin (${user.email}) associou contexto RLS à loja ${verifiedTenantId}. Motivo: ${reason}`
        );
      } else if (req.organizationId) {
        verifiedTenantId = req.organizationId;
      }
    } else {
      // Usuário Regular: consulta obrigatória dos memberships ativos desta identidade
      const memberships = await memberRepo.listByUser(user.id);
      const activeMemberships = memberships.filter((m) => m.status === "ACTIVE");

      if (activeMemberships.length === 0) {
        return res.status(403).json({
          success: false,
          code: "NO_ACTIVE_MEMBERSHIPS",
          error: "Acesso negado: a sua identidade não possui membership ativo em nenhuma organização.",
        });
      }

      const requestedTenant = tenantHeader?.trim();

      if (requestedTenant) {
        // Validação estrita: o tenant solicitado pertence aos memberships ativos da identidade?
        const matchingMembership = activeMemberships.find((m) => m.organizationId === requestedTenant);
        if (!matchingMembership) {
          // Bloqueio imediato de tentativa de spoofing (ex: usuário da loja-123 tentando acessar loja-456)
          console.warn(
            `[tenantRlsMiddleware] BLOQUEIO P0: Usuário ${user.email} (${user.id}) tentou acessar tenant não autorizado '${requestedTenant}'.`
          );
          return res.status(403).json({
            success: false,
            code: "MEMBERSHIP_TENANT_MISMATCH",
            error: `Violação de segurança P0: O usuário '${user.email}' não possui membership ativo na organização '${requestedTenant}'. Acesso bloqueado antes da consulta ao banco.`,
          });
        }
        verifiedTenantId = matchingMembership.organizationId;
      } else {
        // Sem cabeçalho explícito: utiliza a organização do membership principal da identidade
        verifiedTenantId = req.organizationId || activeMemberships[0].organizationId;
      }
    }

    if (!verifiedTenantId && !isSuperAdmin) {
      return res.status(400).json({
        success: false,
        code: "TENANT_CONTEXT_REQUIRED",
        error: "Identificador de tenant não pôde ser resolvido a partir do contexto de Membership.",
      });
    }

    const finalTenantId = verifiedTenantId || req.organizationId || "";
    const sanitizedTenantId = finalTenantId.replace(/[^a-zA-Z0-9_\-]/g, "");

    // -------------------------------------------------------------------------
    // 2. ATRIBUIR HELPERS E DB CLIENT SCOPED AO OBJETO REQ
    // -------------------------------------------------------------------------
    req.organizationId = finalTenantId;

    // Helper para executar consultas transacionais onde SET LOCAL app.current_tenant_id é pré-injetado
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

    (req as any).executeWithRls = req.withTenantDb;

    // Consulta com injeção automática e segura de SET LOCAL
    (req as any).scopedQuery = async <T = any>(
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
      query: <T = any>(sql: string, params?: any[]) => (req as any).scopedQuery(sql, params),
      withTransaction: <T>(callback: (client: pg.PoolClient) => Promise<T>) => req.withTenantDb!(callback),
    };

    // -------------------------------------------------------------------------
    // 3. EXECUÇÃO DENTRO DO TENANT CONTEXT (AsyncLocalStorage)
    // Garante que qualquer chamada de query(...) ou pool.connect() executada
    // durante a resolução desta requisição receba 'SET LOCAL app.current_tenant_id'
    // -------------------------------------------------------------------------
    TenantContext.run(
      {
        tenantId: sanitizedTenantId,
        userId: user?.id,
        userEmail: user?.email,
        userRole: req.userRole,
        ipAddress: req.ip || (req.headers["x-forwarded-for"] as string) || "127.0.0.1",
        userAgent: (req.headers["user-agent"] as string) || "Aura Web Client",
        isSuperAdmin,
      },
      () => {
        next();
      }
    );
  } catch (error: any) {
    console.error("[tenantRlsMiddleware] Erro inesperado ao aplicar contexto RLS:", error);
    return res.status(500).json({
      success: false,
      error: "Erro interno na aplicação do contexto de segurança RLS.",
    });
  }
}

export const enforceTenantRlsMiddleware = tenantRlsMiddleware;
export default tenantRlsMiddleware;
