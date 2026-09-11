import dotenv from "dotenv";
dotenv.config();

import pg from "pg";
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
  }

  return global._auraPgPool;
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

export async function query<T = any>(text: string, params?: any[]): Promise<pg.QueryResult<T>> {
  return getPostgresPool().query<T>(text, params);
}

export async function withTransaction<T>(
  callback: (client: pg.PoolClient) => Promise<T>
): Promise<T> {
  const client = await getPostgresPool().connect();
  try {
    await client.query("BEGIN");
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
