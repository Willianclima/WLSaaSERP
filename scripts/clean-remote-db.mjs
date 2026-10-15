import pg from 'pg';

/**
 * Script universal e autocontido para limpar as tabelas transacionais
 * de QUALQUER banco de dados PostgreSQL (Cloud SQL, Supabase, Neon ou Local).
 * 
 * Uso no Cloud Shell ou terminal:
 *   node scripts/clean-remote-db.mjs "postgresql://usuario:senha@host:5432/banco?sslmode=require"
 * 
 * Ou definindo a variável de ambiente:
 *   DATABASE_URL="postgresql://..." node scripts/clean-remote-db.mjs
 */

const connectionString = process.argv[2] || process.env.DATABASE_URL;

if (!connectionString) {
  console.error("❌ ERRO: Nenhuma DATABASE_URL informada.");
  console.error("Uso: node scripts/clean-remote-db.mjs \"postgresql://usuario:senha@host:5432/banco\"");
  process.exit(1);
}

const pool = new pg.Pool({
  connectionString,
  ssl: connectionString.includes("localhost") || connectionString.includes("127.0.0.1") ? false : { rejectUnauthorized: false }
});

async function run() {
  console.log("================================================================================");
  console.log(" 🧹 LIMPEZA DE DADOS TRANSACIONAIS NO BANCO DE PRODUÇÃO");
  console.log("================================================================================\n");

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    console.log("1. Removendo pedidos e histórico de vendas...");
    await client.query("DELETE FROM order_payments");
    await client.query("DELETE FROM order_items");
    await client.query("DELETE FROM order_state_transitions");
    await client.query("DELETE FROM orders");

    console.log("2. Removendo consignações...");
    try { await client.query("DELETE FROM consignments"); } catch {}

    console.log("3. Removendo estoque e movimentações...");
    await client.query("DELETE FROM inventory_movements");
    await client.query("DELETE FROM inventory_reservations");
    await client.query("DELETE FROM inventory_balances");

    console.log("4. Removendo clientes e contatos (CRM)...");
    await client.query("DELETE FROM customer_contacts");
    await client.query("DELETE FROM customer_addresses");
    await client.query("DELETE FROM customers");

    console.log("5. Removendo catálogo de produtos de teste...");
    await client.query("DELETE FROM product_media");
    await client.query("DELETE FROM products");
    try { await client.query("DELETE FROM categories"); } catch {}

    console.log("6. Removendo faturas comerciais e webhooks...");
    try { await client.query("DELETE FROM billing_webhook_events"); } catch {}
    try { await client.query("DELETE FROM billing_invoices"); } catch {}

    console.log("7. Removendo chaves de idempotência e logs de auditoria...");
    try { await client.query("DELETE FROM idempotency_keys"); } catch {}
    try { await client.query("DELETE FROM audit_logs"); } catch {}

    await client.query("COMMIT");
    console.log("\n✅ Transação finalizada com COMMIT com sucesso!");

    // Verificação de segurança
    const orgs = await client.query("SELECT id, name, slug FROM organizations");
    const users = await client.query("SELECT id, name, email, is_platform_super_admin FROM users");
    const plans = await client.query("SELECT COUNT(*) FROM plans");

    console.log("\n================================================================================");
    console.log(" 🛡️ ESTRUTURA PRESERVADA:");
    console.log("================================================================================");
    console.log(` - Organizações ativas:   ${orgs.rows.length}`);
    orgs.rows.forEach(o => console.log(`    • [${o.id}] ${o.name} (${o.slug})`));
    console.log(` - Usuários cadastrados:  ${users.rows.length}`);
    users.rows.forEach(u => console.log(`    • [${u.id}] ${u.name} <${u.email}>`));
    console.log(` - Planos SaaS:           ${plans.rows[0].count}`);
    console.log("================================================================================");
    console.log(" 🚀 O banco está 100% pronto para a primeira cliente!");
    console.log("================================================================================\n");

  } catch (err) {
    await client.query("ROLLBACK");
    console.error("❌ Erro durante a limpeza:", err.message);
  } finally {
    client.release();
    await pool.end();
  }
}

run();
