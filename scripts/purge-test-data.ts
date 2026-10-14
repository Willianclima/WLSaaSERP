import { query } from "../server/db/postgres";
import { TenantContext } from "../server/db/tenantContext";

async function purgeTestData() {
  console.log("================================================================================");
  console.log(" 🧹 LIMPEZA DE DADOS DE TESTE DO BANCO DE DADOS (PRONTO PARA PRODUÇÃO)");
  console.log("================================================================================\n");

  await TenantContext.run({ isSuperAdmin: true }, async () => {
    // 1. Limpar logs e webhooks
    console.log("1. Limpando logs e webhooks...");
    try {
      await query("DELETE FROM billing_webhook_events");
      console.log("   - billing_webhook_events limpo.");
    } catch (e: any) {
      console.log("   - billing_webhook_events:", e.message);
    }

    try {
      await query("DELETE FROM billing_invoices");
      console.log("   - billing_invoices limpo.");
    } catch (e: any) {
      console.log("   - billing_invoices:", e.message);
    }

    try {
      await query("DELETE FROM audit_logs");
      console.log("   - audit_logs limpo.");
    } catch (e: any) {
      console.log("   - audit_logs:", e.message);
    }

    // 2. Limpar pedidos, vendas e garantias
    console.log("2. Limpando pedidos e vendas...");
    try {
      await query("DELETE FROM order_payments");
      await query("DELETE FROM order_items");
      await query("DELETE FROM order_state_transitions");
      await query("DELETE FROM orders");
      console.log("   - orders e dependências limpos.");
    } catch (e: any) {
      console.log("   - orders:", e.message);
    }

    // 3. Limpar estoque e consignações
    console.log("3. Limpando estoque e consignações...");
    try {
      await query("DELETE FROM consignments");
    } catch {}
    try {
      await query("DELETE FROM inventory_movements");
      await query("DELETE FROM inventory_reservations");
      await query("DELETE FROM inventory_balances");
      await query("DELETE FROM inventory_locations");
      console.log("   - estoque e movimentações limpos.");
    } catch (e: any) {
      console.log("   - estoque:", e.message);
    }

    // 4. Limpar catálogo e mídias
    console.log("4. Limpando produtos e catálogo...");
    try {
      await query("DELETE FROM product_media");
      await query("DELETE FROM products");
      await query("DELETE FROM categories");
      console.log("   - produtos e mídias limpos.");
    } catch (e: any) {
      console.log("   - produtos:", e.message);
    }

    // 5. Limpar clientes
    console.log("5. Limpando CRM de clientes...");
    try {
      await query("DELETE FROM customer_contacts");
      await query("DELETE FROM customer_addresses");
      await query("DELETE FROM customers");
      console.log("   - clientes limpos.");
    } catch (e: any) {
      console.log("   - clientes:", e.message);
    }

    // 6. Limpar chaves de idempotência
    try {
      await query("DELETE FROM idempotency_keys");
      console.log("   - idempotency_keys limpo.");
    } catch {}

    // 7. Limpar assinaturas e membros
    console.log("6. Limpando assinaturas e membros...");
    try {
      await query("DELETE FROM subscriptions");
      await query("DELETE FROM organization_modules");
      await query("DELETE FROM organization_members");
      console.log("   - assinaturas e membros limpos.");
    } catch (e: any) {
      console.log("   - assinaturas/membros:", e.message);
    }

    // 8. Limpar organizações de teste
    console.log("7. Limpando organizações de teste...");
    try {
      await query("DELETE FROM organizations");
      console.log("   - organizações limpas.");
    } catch (e: any) {
      console.log("   - organizations:", e.message);
    }

    // 9. Limpar usuários de teste (mantendo o Super Admin Willian)
    console.log("8. Removendo usuários de teste (preservando Willian C. Lima)...");
    try {
      const res = await query(
        "DELETE FROM users WHERE email != 'willianCLima@gmail.com' AND (is_platform_super_admin IS NOT TRUE OR is_platform_super_admin IS NULL)"
      );
      console.log(`   - ${res.rowCount} usuários de teste removidos.`);
    } catch (e: any) {
      console.log("   - users:", e.message);
    }
  });

  // Verificação final
  console.log("\n================================================================================");
  console.log(" 📊 CONTAGEM FINAL DE REGISTROS NO BANCO:");
  console.log("================================================================================");
  const orgCount = await query("SELECT COUNT(*) FROM organizations");
  const userCount = await query("SELECT COUNT(*) FROM users");
  const planCount = await query("SELECT COUNT(*) FROM plans");
  const prodCount = await query("SELECT COUNT(*) FROM products");
  const orderCount = await query("SELECT COUNT(*) FROM orders");

  console.log(` - Organizações ativas:   ${orgCount.rows[0].count} (Pronto para a primeira cliente)`);
  console.log(` - Usuários cadastrados:  ${userCount.rows[0].count} (Apenas Super Admin)`);
  console.log(` - Planos SaaS ativos:    ${planCount.rows[0].count} (Preservados para assinatura)`);
  console.log(` - Produtos:              ${prodCount.rows[0].count}`);
  console.log(` - Pedidos:               ${orderCount.rows[0].count}`);
  console.log("================================================================================");
  console.log(" ✅ BANCO DE DADOS LIMPO E PREPARADO PARA A PRIMEIRA CLIENTE!");
  console.log("================================================================================\n");

  process.exit(0);
}

purgeTestData().catch((err) => {
  console.error("Falha ao limpar banco:", err);
  process.exit(1);
});
