import pg from "pg";
const { Pool } = pg;

// Singleton connection pool adhering to object method and lazy connection
declare global {
  var _auraPgPool: pg.Pool | undefined;
}

export function createPostgresPool(): pg.Pool {
  if (!global._auraPgPool) {
    global._auraPgPool = new Pool({
      host: process.env.SQL_HOST || "10.222.0.3",
      user: process.env.SQL_USER || "applet_user",
      password: process.env.SQL_PASSWORD || "applet-password-snappy-champion-zsx2c",
      database: process.env.SQL_DB_NAME || "applet_db",
      port: parseInt(process.env.SQL_PORT || "5432", 10),
      max: 10,
      connectionTimeoutMillis: 15000,
    });

    global._auraPgPool.on("error", (err) => {
      console.error("[PostgreSQL Pool Error]", err);
    });
  }
  return global._auraPgPool;
}

export const pool = createPostgresPool();

export async function query<T = any>(text: string, params?: any[]): Promise<pg.QueryResult<T>> {
  return pool.query<T>(text, params);
}

export async function withTransaction<T>(
  callback: (client: pg.PoolClient) => Promise<T>
): Promise<T> {
  const client = await pool.connect();
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
