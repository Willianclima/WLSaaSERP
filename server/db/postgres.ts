import dotenv from "dotenv";
dotenv.config();

import pg from "pg";
import { TenantContext } from "./tenantContext";
const { Pool } = pg;

// Singleton connection pool adhering to lazy connection pattern
declare global {
  var _auraPgPool: pg.Pool | undefined;
}

/**
 * Returns or initializes the PostgreSQL connection pool lazily.
 * Prioritizes standard DATABASE_URL, followed by individual SQL_* / DB_* env variables.
 * Never hardcodes fallback passwords, hosts, or usernames in code.
 */
export function getPostgresPool(): pg.Pool {
  if (!global._auraPgPool) {
    const connectionString = process.env.DATABASE_URL;
    const host = process.env.SQL_HOST || process.env.DB_HOST;
    const user = process.env.SQL_USER || process.env.DB_USER;
    const password = process.env.SQL_PASSWORD || process.env.DB_PASSWORD;
    const database = process.env.SQL_DB_NAME || process.env.DB_NAME;
    const portEnv = process.env.SQL_PORT || process.env.DB_PORT;

    if (!connectionString && !host) {
      throw new Error(
        "[PostgreSQL Error] Nenhuma configuração de banco de dados encontrada. " +
        "Defina DATABASE_URL ou SQL_HOST / SQL_USER / SQL_PASSWORD no arquivo .env."
      );
    }

    const poolConfig: pg.PoolConfig = connectionString
      ? {
          connectionString,
          ssl:
            process.env.DATABASE_SSL === "true" || process.env.DB_SSL === "true"
              ? { rejectUnauthorized: false }
              : undefined,
          max: parseInt(process.env.DB_POOL_MAX || "10", 10),
          idleTimeoutMillis: 30000,
          connectionTimeoutMillis: 15000,
        }
      : {
          host,
          user,
          password,
          database,
          // If host is a Unix socket path (e.g. /app/cloudsql/...), omit port
          port: host && host.startsWith("/") ? undefined : parseInt(portEnv || "5432", 10),
          ssl:
            process.env.DATABASE_SSL === "true" || process.env.DB_SSL === "true"
              ? { rejectUnauthorized: false }
              : undefined,
          max: parseInt(process.env.DB_POOL_MAX || "10", 10),
          idleTimeoutMillis: 30000,
          connectionTimeoutMillis: 15000,
        };

    global._auraPgPool = new Pool(poolConfig);

    global._auraPgPool.on("error", (err) => {
      console.error("[PostgreSQL Pool Error]", err);
    });

    // Intercept client checkouts to automatically attach RLS session variables
    const originalConnect = global._auraPgPool.connect.bind(global._auraPgPool);
    global._auraPgPool.connect = function (...args: any[]) {
      if (typeof args[0] === "function") {
        const cb = args[0];
        return originalConnect((err: any, client: any, release: any) => {
          if (err) return cb(err, client, release);
          return cb(null, interceptClientWithRls(client), release);
        });
      }
      return originalConnect().then((client: any) => interceptClientWithRls(client));
    } as any;
  }

  return global._auraPgPool;
}

/**
 * Wraps a pg.PoolClient so that before executing queries, the active TenantContext
 * is automatically enforced with SET LOCAL app.current_tenant_id = '...' and session set_config.
 */
export function interceptClientWithRls(client: pg.PoolClient): pg.PoolClient {
  if (!client || typeof client.query !== "function") {
    return client;
  }
  const originalQuery = client.query.bind(client);
  let contextApplied = false;

  (client as any).query = async function (this: any, ...args: any[]) {
    const context = TenantContext.get();
    const tenantId = context?.tenantId;

    if (tenantId && !contextApplied) {
      const sanitized = tenantId.replace(/[^a-zA-Z0-9_\-]/g, "");
      const isSuper = context?.isSuperAdmin ? "true" : "false";

      await originalQuery.call(
        this,
        "SELECT set_config('app.current_tenant_id', $1, false), set_config('app.is_super_admin', $2, false)",
        [sanitized, isSuper]
      );
      try {
        await originalQuery.call(this, `SET LOCAL app.current_tenant_id = '${sanitized}'`);
      } catch {
        // SET LOCAL outside transaction is harmless
      }
      contextApplied = true;
    }

    return (originalQuery as any).apply(this, args);
  };

  const originalRelease = client.release.bind(client);
  client.release = function (destroy?: boolean | Error) {
    // Reset session configuration on client release to prevent pool cross-contamination
    originalQuery
      .call(
        this,
        "SELECT set_config('app.current_tenant_id', '', false), set_config('app.is_super_admin', 'false', false)"
      )
      .catch(() => {});
    contextApplied = false;
    return originalRelease(destroy as any);
  };

  return client;
}

/**
 * Backwards-compatible alias for getPostgresPool.
 */
export function createPostgresPool(): pg.Pool {
  return getPostgresPool();
}

/**
 * Transparent proxy for pg.Pool so that importing `pool` does NOT
 * instantiate the connection on module load time. The pool is created
 * strictly on the first call to a method (e.g. query, connect).
 */
export const pool = new Proxy({} as pg.Pool, {
  get(_target, prop) {
    const actualPool = getPostgresPool();
    const value = (actualPool as any)[prop];
    if (typeof value === "function") {
      return value.bind(actualPool);
    }
    return value;
  },
});

/**
 * Helper to apply RLS session variables to a PostgreSQL client or pool connection.
 * Executed via 'SET LOCAL' within transactions or set_config session parameters,
 * enforcing: IDENTIDADE -> MEMBERSHIP -> TENANT CONTEXT -> RLS -> POSTGRESQL.
 */
export async function applyRlsContext(client: pg.PoolClient | pg.Pool): Promise<void> {
  const context = TenantContext.get();
  const tenantId = context?.tenantId;
  const isSuperAdmin = context?.isSuperAdmin ? "true" : "false";

  if (tenantId) {
    const sanitizedTenantId = tenantId.replace(/[^a-zA-Z0-9_\-]/g, "");
    // Parameterized session set_config
    await client.query(
      "SELECT set_config('app.current_tenant_id', $1, false), set_config('app.is_super_admin', $2, false)",
      [sanitizedTenantId, isSuperAdmin]
    );
    // Explicit SET LOCAL app.current_tenant_id
    try {
      await client.query(`SET LOCAL app.current_tenant_id = '${sanitizedTenantId}'`);
      await client.query(`SET LOCAL app.is_super_admin = '${isSuperAdmin}'`);
    } catch {
      // Handled by set_config if outside explicit BEGIN..COMMIT block
    }
  } else if (context?.isSuperAdmin) {
    await client.query(
      "SELECT set_config('app.current_tenant_id', '', false), set_config('app.is_super_admin', 'true', false)"
    );
    try {
      await client.query("SET LOCAL app.current_tenant_id = ''");
      await client.query("SET LOCAL app.is_super_admin = 'true'");
    } catch {}
  }
}

/**
 * Explicit helper to set the local tenant ID context on a PostgreSQL client.
 * Executes: SET LOCAL app.current_tenant_id = '...'
 * This is guaranteed to be bound to the current transaction scope in PostgreSQL.
 */
export async function setLocalTenantId(
  client: pg.PoolClient,
  tenantId: string,
  isSuperAdmin: boolean = false
): Promise<void> {
  // Sanitize tenantId: only allow alphanumeric and dashes/underscores
  const sanitizedTenantId = tenantId.replace(/[^a-zA-Z0-9_\-]/g, "");
  await client.query(`SET LOCAL app.current_tenant_id = '${sanitizedTenantId}'`);
  await client.query(`SET LOCAL app.is_super_admin = '${isSuperAdmin ? "true" : "false"}'`);
}

/**
 * High-level helper to execute any database query block with guaranteed
 * SET LOCAL app.current_tenant_id = '...' transaction isolation.
 */
export async function executeWithTenantRlsContext<T>(
  tenantId: string,
  callback: (client: pg.PoolClient) => Promise<T>,
  isSuperAdmin: boolean = false
): Promise<T> {
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
}

export async function query<T = any>(text: string, params?: any[]): Promise<pg.QueryResult<T>> {
  const context = TenantContext.get();
  // If a tenant context is active, acquire a dedicated client from pool to set session config safely
  if (context?.tenantId || context?.isSuperAdmin) {
    const client = await getPostgresPool().connect();
    try {
      await applyRlsContext(client);
      return await client.query<T>(text, params);
    } finally {
      try {
        await client.query("SELECT set_config('app.current_tenant_id', '', false), set_config('app.is_super_admin', 'false', false)");
      } catch {}
      client.release();
    }
  }

  return getPostgresPool().query<T>(text, params);
}

export async function withTransaction<T>(
  callback: (client: pg.PoolClient) => Promise<T>
): Promise<T> {
  const client = await getPostgresPool().connect();
  try {
    await client.query("BEGIN");
    await applyRlsContext(client);
    const result = await callback(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    try {
      await client.query("SELECT set_config('app.current_tenant_id', '', false), set_config('app.is_super_admin', 'false', false)");
    } catch {}
    client.release();
  }
}
