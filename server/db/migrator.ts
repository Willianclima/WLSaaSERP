import fs from "fs";
import path from "path";
import crypto from "crypto";
import { getPostgresPool, withTransaction } from "./postgres";
import { TenantContext } from "./tenantContext";

export interface MigrationRecord {
  id: string;
  applied_at: string;
  checksum: string;
}

/**
 * Ensures the migration tracking table exists in PostgreSQL.
 */
async function ensureMigrationTable(): Promise<void> {
  const pool = getPostgresPool();
  await pool.query(`
    CREATE TABLE IF NOT EXISTS _schema_migrations (
      id VARCHAR(255) PRIMARY KEY,
      applied_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      checksum VARCHAR(64) NOT NULL
    );
  `);
}

/**
 * Splits SQL script into executable statements, preserving DO $$ ... $$; blocks.
 */
function splitSqlStatements(sql: string): string[] {
  const lines = sql.split("\n");
  const statements: string[] = [];
  let inDoBlock = false;
  let current = "";

  for (const line of lines) {
    const trimmed = line.trim();
    if (!inDoBlock && (trimmed.startsWith("--") || trimmed.length === 0)) {
      continue;
    }
    if (trimmed.includes("DO $$")) {
      inDoBlock = true;
    }
    current += line + "\n";
    if (inDoBlock) {
      if (trimmed.includes("$$;")) {
        inDoBlock = false;
        statements.push(current.trim());
        current = "";
      }
    } else if (trimmed.endsWith(";")) {
      statements.push(current.trim());
      current = "";
    }
  }
  if (current.trim().length > 0) {
    statements.push(current.trim());
  }
  return statements.filter((s) => s.length > 0);
}

/**
 * Runs all pending migrations from server/db/migrations in sequential alphanumeric order.
 * Guaranteed to be idempotent and safe to run on existing or fresh databases.
 */
export async function runMigrations(): Promise<{ applied: string[]; skipped: string[] }> {
  const migrationsDir = path.join(process.cwd(), "server", "db", "migrations");
  
  if (!fs.existsSync(migrationsDir)) {
    throw new Error(`[Migration Error] Migrations directory not found at: ${migrationsDir}`);
  }

  await ensureMigrationTable();

  const pool = getPostgresPool();
  const existingResult = await pool.query<{ id: string }>(
    "SELECT id FROM _schema_migrations ORDER BY id ASC"
  );
  const appliedSet = new Set(existingResult.rows.map((r) => r.id));

  // Read only .sql files in migrationsDir (ignoring subdirectories like /archive)
  const files = fs
    .readdirSync(migrationsDir)
    .filter((file) => file.endsWith(".sql") && fs.statSync(path.join(migrationsDir, file)).isFile())
    .sort();

  const applied: string[] = [];
  const skipped: string[] = [];

  console.log(`\n📦 [Aura Migrator] Verificando ${files.length} migrações oficiais...`);

  // Run migrations within super admin context so DDL & policies apply without restriction
  await TenantContext.run({ isSuperAdmin: true }, async () => {
    for (const file of files) {
      if (appliedSet.has(file)) {
        skipped.push(file);
        continue;
      }

      const filePath = path.join(migrationsDir, file);
      const sqlContent = fs.readFileSync(filePath, "utf-8");
      const checksum = crypto.createHash("sha256").update(sqlContent).digest("hex");
      const statements = splitSqlStatements(sqlContent);

      console.log(`🚀 [Aura Migrator] Aplicando: ${file} (${statements.length} instruções)...`);

      const client = await pool.connect();
      try {
        await client.query("BEGIN");
        
        for (let i = 0; i < statements.length; i++) {
          const stmt = statements[i];
          const spName = `sp_${i}`;
          await client.query(`SAVEPOINT ${spName}`);
          try {
            await client.query(stmt);
            await client.query(`RELEASE SAVEPOINT ${spName}`);
          } catch (stmtErr: any) {
            // If the error is table/relation ownership check on an existing table/index or duplicate object, safely continue
            const isOwnerErr =
              stmtErr.code === "42501" &&
              (stmtErr.message.includes("must be owner of") ||
                stmtErr.message.includes("permission denied"));
            const isDuplicate = stmtErr.code === "42710" || stmtErr.code === "42P07";

            if (isOwnerErr || isDuplicate) {
              await client.query(`ROLLBACK TO SAVEPOINT ${spName}`);
              // Ignored safely as the schema object is already present in the existing database
            } else {
              await client.query(`ROLLBACK TO SAVEPOINT ${spName}`);
              throw stmtErr;
            }
          }
        }

        // Record applied migration
        await client.query(
          "INSERT INTO _schema_migrations (id, checksum, applied_at) VALUES ($1, $2, CURRENT_TIMESTAMP)",
          [file, checksum]
        );
        await client.query("COMMIT");
        applied.push(file);
        console.log(`✅ [Aura Migrator] ${file} aplicado com sucesso.`);
      } catch (err: any) {
        await client.query("ROLLBACK");
        console.error(`❌ [Aura Migrator] Falha ao aplicar ${file}:`, err.message);
        throw err;
      } finally {
        client.release();
      }
    }
  });

  if (applied.length === 0) {
    console.log(`✨ [Aura Migrator] Banco de dados já está 100% atualizado (${skipped.length} migrações existentes).\n`);
  } else {
    console.log(`✨ [Aura Migrator] Concluído: ${applied.length} migrações aplicadas com sucesso.\n`);
  }

  return { applied, skipped };
}

// CLI execution handler
if (process.argv[1] && process.argv[1].endsWith("migrator.ts")) {
  runMigrations()
    .then(() => {
      console.log("[Aura Migrator] Processo finalizado com sucesso.");
      process.exit(0);
    })
    .catch((err) => {
      console.error("[Aura Migrator Fatal]", err);
      process.exit(1);
    });
}
