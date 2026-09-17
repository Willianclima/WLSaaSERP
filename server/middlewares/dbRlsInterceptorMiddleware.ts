import { Response, NextFunction } from "express";
import { AuthenticatedRequest } from "./authMiddleware";
import { TenantContext } from "../db/tenantContext";
import { setLocalTenantId, getPostgresPool, applyRlsContext } from "../db/postgres";
import pg from "pg";

/**
 * Middleware e Interceptor de Banco de Dados para RLS (Row Level Security).
 *
 * Garante que em todas as conexões do banco de dados na requisição,
 * o comando:
 *    SET LOCAL app.current_tenant_id = '<tenant_id>'
 * seja executado antes de qualquer operação de leitura ou escrita,
 * impedindo fisicamente no PostgreSQL que uma organização acesse dados de outra.
 */
export async function dbRlsInterceptorMiddleware(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  const context = TenantContext.get();
  const tenantId = context?.tenantId || req.organizationId;
  const isSuperAdmin = Boolean(context?.isSuperAdmin || req.user?.isPlatformSuperAdmin);

  if (tenantId) {
    // Helper anexado à requisição para operações transacionais isoladas por RLS
    (req as any).withTenantDb = async <T>(
      callback: (client: pg.PoolClient) => Promise<T>
    ): Promise<T> => {
      const client = await getPostgresPool().connect();
      try {
        await client.query("BEGIN");
        await setLocalTenantId(client, tenantId, isSuperAdmin);
        const result = await callback(client);
        await client.query("COMMIT");
        return result;
      } catch (error) {
        await client.query("ROLLBACK");
        throw error;
      } finally {
        client.release();
      }
    };
  }

  next();
}

export { tenantRlsMiddleware } from "./tenantRlsMiddleware";
