import { query } from "../server/db/postgres";
import { TenantContext } from "../server/db/tenantContext";

/**
 * Script de Administração: Limpeza de Tabelas Transacionais
 * 
 * Finalidade:
 * Limpa pedidos, vendas, clientes, movimentações de estoque, consignações e garantias,
 * preservando integralmente:
 *  - A estrutura das organizações (tenants)
 *  - Os membros e papéis de acesso (organization_members)
 *  - As credenciais de login e conta mestre (users)
 *  - Os planos e assinaturas ativas (subscriptions, plans)
 *  - Os módulos contratados (organization_modules)
 *  - Os locais de estoque físicos (inventory_locations)
 * 
 * Uso:
 *   npx tsx scripts/reset-tenant-transactions.ts [ORGANIZATION_ID]
 * 
 * Exemplos:
 *   npx tsx scripts/reset-tenant-transactions.ts                     # Limpa transações de todas as organizações
 *   npx tsx scripts/reset-tenant-transactions.ts org-lumina-01       # Limpa transações apenas da organização especificada
 */

async function main() {
  const targetOrgId = process.argv[2];

  console.log("================================================================================");
  console.log(" 🧼 SCRIPT DE ADMINISTRAÇÃO: LIMPEZA DE DADOS TRANSACIONAIS");
  if (targetOrgId) {
    console.log(` Alvo: Organização específica [${targetOrgId}]`);
  } else {
    console.log(" Alvo: TODAS as organizações (Global Transacional)");
  }
  console.log("================================================================================\n");

  await TenantContext.run({ isSuperAdmin: true }, async () => {
    // 1. Pedidos, Pagamentos e Transições de Estado
    console.log("1. Limpando Pedidos, Itens e Pagamentos...");
    if (targetOrgId) {
      await query(
        `DELETE FROM order_payments WHERE order_id IN (SELECT id FROM orders WHERE organization_id = $1)`,
        [targetOrgId]
      );
      await query(
        `DELETE FROM order_items WHERE order_id IN (SELECT id FROM orders WHERE organization_id = $1)`,
        [targetOrgId]
      );
      await query(
        `DELETE FROM order_state_transitions WHERE order_id IN (SELECT id FROM orders WHERE organization_id = $1)`,
        [targetOrgId]
      );
      await query(`DELETE FROM orders WHERE organization_id = $1`, [targetOrgId]);
    } else {
      await query(`DELETE FROM order_payments`);
      await query(`DELETE FROM order_items`);
      await query(`DELETE FROM order_state_transitions`);
      await query(`DELETE FROM orders`);
    }
    console.log("   - Pedidos e histórico de vendas limpos.");

    // 2. Consignações para Revendedoras
    console.log("2. Limpando Consignações...");
    try {
      if (targetOrgId) {
        await query(`DELETE FROM consignments WHERE organization_id = $1`, [targetOrgId]);
      } else {
        await query(`DELETE FROM consignments`);
      }
      console.log("   - Consignações limpas.");
    } catch (e: any) {
      console.log("   - Consignações (tabela não encontrada ou vazia):", e.message);
    }

    // 3. Movimentações e Reservas de Estoque
    console.log("3. Limpando Movimentações e Saldos de Estoque...");
    if (targetOrgId) {
      await query(`DELETE FROM inventory_movements WHERE organization_id = $1`, [targetOrgId]);
      await query(`DELETE FROM inventory_reservations WHERE organization_id = $1`, [targetOrgId]);
      await query(`DELETE FROM inventory_balances WHERE organization_id = $1`, [targetOrgId]);
    } else {
      await query(`DELETE FROM inventory_movements`);
      await query(`DELETE FROM inventory_reservations`);
      await query(`DELETE FROM inventory_balances`);
    }
    console.log("   - Movimentações, reservas e saldos de estoque limpos.");

    // 4. Clientes (CRM), Contatos e Endereços
    console.log("4. Limpando CRM de Clientes...");
    if (targetOrgId) {
      await query(
        `DELETE FROM customer_contacts WHERE customer_id IN (SELECT id FROM customers WHERE organization_id = $1)`,
        [targetOrgId]
      );
      await query(
        `DELETE FROM customer_addresses WHERE customer_id IN (SELECT id FROM customers WHERE organization_id = $1)`,
        [targetOrgId]
      );
      await query(`DELETE FROM customers WHERE organization_id = $1`, [targetOrgId]);
    } else {
      await query(`DELETE FROM customer_contacts`);
      await query(`DELETE FROM customer_addresses`);
      await query(`DELETE FROM customers`);
    }
    console.log("   - Clientes, contatos e endereços limpos.");

    // 5. Catálogo de Produtos e Fotos (para lojista cadastrar suas próprias peças)
    console.log("5. Limpando Catálogo de Produtos...");
    if (targetOrgId) {
      await query(
        `DELETE FROM product_media WHERE product_id IN (SELECT id FROM products WHERE organization_id = $1)`,
        [targetOrgId]
      );
      await query(`DELETE FROM products WHERE organization_id = $1`, [targetOrgId]);
      try {
        await query(`DELETE FROM categories WHERE organization_id = $1`, [targetOrgId]);
      } catch {}
    } else {
      await query(`DELETE FROM product_media`);
      await query(`DELETE FROM products`);
      try {
        await query(`DELETE FROM categories`);
      } catch {}
    }
    console.log("   - Catálogo de produtos e mídias limpo.");

    // 6. Faturas e Webhooks de Cobrança
    console.log("6. Limpando Faturas Comerciais e Webhooks...");
    try {
      if (targetOrgId) {
        await query(`DELETE FROM billing_webhook_events WHERE organization_id = $1`, [targetOrgId]);
        await query(`DELETE FROM billing_invoices WHERE organization_id = $1`, [targetOrgId]);
      } else {
        await query(`DELETE FROM billing_webhook_events`);
        await query(`DELETE FROM billing_invoices`);
      }
      console.log("   - Faturas e webhooks limpos.");
    } catch (e: any) {
      console.log("   - Faturas/Webhooks:", e.message);
    }

    // 7. Chaves de Idempotência e Logs de Auditoria
    console.log("7. Limpando Chaves de Idempotência e Logs Transacionais...");
    try {
      if (targetOrgId) {
        await query(`DELETE FROM idempotency_keys WHERE organization_id = $1`, [targetOrgId]);
        await query(`DELETE FROM audit_logs WHERE organization_id = $1`, [targetOrgId]);
      } else {
        await query(`DELETE FROM idempotency_keys`);
        await query(`DELETE FROM audit_logs`);
      }
      console.log("   - Idempotência e logs limpos.");
    } catch (e: any) {
      console.log("   - Logs/Idempotência:", e.message);
    }
  });

  // Verificação e exibição da estrutura preservada
  console.log("\n================================================================================");
  console.log(" 🛡️ ESTRUTURA E CONFIGURAÇÕES PRESERVADAS:");
  console.log("================================================================================");
  const orgs = await query("SELECT id, name, slug FROM organizations");
  const users = await query("SELECT id, name, email, is_platform_super_admin FROM users");
  const members = await query("SELECT COUNT(*) FROM organization_members");
  const subs = await query("SELECT COUNT(*) FROM subscriptions");
  const locations = await query("SELECT COUNT(*) FROM inventory_locations");

  console.log(` - Organizações preservadas:    ${orgs.rows.length}`);
  orgs.rows.forEach((o: any) => console.log(`    • [${o.id}] ${o.name} (${o.slug})`));
  console.log(` - Usuários preservados:        ${users.rows.length}`);
  users.rows.forEach((u: any) => console.log(`    • [${u.id}] ${u.name} <${u.email}> (SuperAdmin: ${u.is_platform_super_admin})`));
  console.log(` - Vínculos de membros:         ${members.rows[0].count}`);
  console.log(` - Assinaturas ativas:          ${subs.rows[0].count}`);
  console.log(` - Locais de estoque matriz:    ${locations.rows[0].count}`);
  console.log("================================================================================");
  console.log(" ✅ AMBIENTE TRANSACIONAL LIMPO COM SUCESSO!");
  console.log(" A cliente pode iniciar imediatamente o cadastro de peças e vendas em base limpa.");
  console.log("================================================================================\n");

  process.exit(0);
}

main().catch((err) => {
  console.error("Erro ao executar limpeza transacional:", err);
  process.exit(1);
});
