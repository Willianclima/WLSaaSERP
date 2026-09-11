import { query } from "../server/db/postgres";
import { OrderService } from "../server/modules/orders/order.service";

async function run() {
  console.log("================================================================================");
  console.log("🧪 TESTE DE VALIDAÇÃO DE CONCORRÊNCIA E LOCK FOR UPDATE NO POSTGRESQL (FASE 1.2)");
  console.log("================================================================================");

  const orgId = "org-lumina-01";
  const testProductId = "prod-test-lock-" + Date.now();
  const testLocationId = "loc-lumina-matriz";

  try {
    // 1. Criar produto de teste no catálogo PostgreSQL
    await query(
      `INSERT INTO products (
        id, organization_id, sku, name, category, bath, price, cost_price, status, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, 'OURO_18K', $6, $7, 'ACTIVE', NOW(), NOW())`,
      [testProductId, orgId, `SKU-LOCK-${Date.now()}`, "Anel Teste Concorrência FOR UPDATE", "Aneis", 250.0, 80.0]
    );

    // 2. Definir saldo inicial no PostgreSQL com exatamente 1 unidade física:
    // on_hand = 1, reserved = 0, available = 1
    await query(
      `INSERT INTO inventory_balances (
        id, organization_id, product_id, location_id, on_hand_quantity, reserved_quantity, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, 1, 0, NOW(), NOW())`,
      [`bal-${testProductId}-${testLocationId}`, orgId, testProductId, testLocationId]
    );

    const initialBal = await query(
      "SELECT on_hand_quantity, reserved_quantity, available_quantity FROM inventory_balances WHERE organization_id = $1 AND product_id = $2 AND location_id = $3",
      [orgId, testProductId, testLocationId]
    );
    console.log("1️⃣ Saldo inicial no PostgreSQL:", initialBal.rows[0]);
    if (initialBal.rows[0].on_hand_quantity !== 1 || initialBal.rows[0].reserved_quantity !== 0) {
      throw new Error("Saldo inicial incorreto.");
    }

    // 3. Disparar Pedido A e Pedido B SIMULTANEAMENTE competindo pelo mesmo item
    console.log("\n2️⃣ Disparando Pedido A e Pedido B simultaneamente (Promise.allSettled)...");

    const payloadA = {
      customerId: "cust-lock-a",
      customerSnapshot: { id: "cust-lock-a", name: "Comprador A", phone: "11988880001" },
      channel: "ECOMMERCE" as const,
      initialStatus: "INVENTORY_RESERVED" as const,
      items: [{ productId: testProductId, locationId: testLocationId, quantity: 1 }],
    };

    const payloadB = {
      customerId: "cust-lock-b",
      customerSnapshot: { id: "cust-lock-b", name: "Comprador B", phone: "11988880002" },
      channel: "ECOMMERCE" as const,
      initialStatus: "INVENTORY_RESERVED" as const,
      items: [{ productId: testProductId, locationId: testLocationId, quantity: 1 }],
    };

    const [resA, resB] = await Promise.allSettled([
      OrderService.createOrder(orgId, payloadA, "Simulador Concorrente A"),
      OrderService.createOrder(orgId, payloadB, "Simulador Concorrente B"),
    ]);

    const winner = resA.status === "fulfilled" ? (resA as any).value : (resB as any).value;
    const loserReason = resA.status === "rejected" ? (resA as any).reason : (resB as any).reason;

    console.log("   Resultado Pedido A:", resA.status === "fulfilled" ? `✅ RESERVADO (${(resA as any).value.orderNumber})` : `❌ REJEITADO (${(resA as any).reason.message})`);
    console.log("   Resultado Pedido B:", resB.status === "fulfilled" ? `✅ RESERVADO (${(resB as any).value.orderNumber})` : `❌ REJEITADO (${(resB as any).reason.message})`);

    // Validar que exatamente UM pedido teve sucesso e o outro falhou com erro de estoque insuficiente
    const fulfilledCount = (resA.status === "fulfilled" ? 1 : 0) + (resB.status === "fulfilled" ? 1 : 0);
    const rejectedCount = (resA.status === "rejected" ? 1 : 0) + (resB.status === "rejected" ? 1 : 0);

    if (fulfilledCount !== 1 || rejectedCount !== 1) {
      throw new Error(`FALHA DE CONCORRÊNCIA: Esperado 1 sucesso e 1 rejeição, obtido ${fulfilledCount} sucessos e ${rejectedCount} rejeições!`);
    }

    const hasStockError = loserReason?.message?.includes("Saldo insuficiente") || loserReason?.message?.includes("INSUFFICIENT_STOCK");
    console.log(`   Validação do motivo da rejeição: ${hasStockError ? "✅ Saldo insuficiente detectado corretamente" : "⚠️ Erro inesperado: " + loserReason?.message}`);

    // 4. Verificar saldo pós-reserva no PostgreSQL: on_hand = 1, reserved = 1, available = 0
    const postReserveBal = await query(
      "SELECT on_hand_quantity, reserved_quantity, available_quantity FROM inventory_balances WHERE organization_id = $1 AND product_id = $2 AND location_id = $3",
      [orgId, testProductId, testLocationId]
    );
    console.log("\n3️⃣ Saldo pós-reserva no PostgreSQL:", postReserveBal.rows[0]);
    if (
      postReserveBal.rows[0].on_hand_quantity !== 1 ||
      postReserveBal.rows[0].reserved_quantity !== 1 ||
      postReserveBal.rows[0].available_quantity !== 0
    ) {
      throw new Error(`Saldo pós-reserva inválido! Esperado { on_hand: 1, reserved: 1, available: 0 }, obtido: ${JSON.stringify(postReserveBal.rows[0])}`);
    }
    console.log("   ✅ Saldo verificado: on_hand = 1, reserved = 1, available = 0");

    // 5. Simular Pagamento do Pedido Vencedor -> Transição para PAID (baixa definitiva de estoque / SALE)
    console.log(`\n4️⃣ Confirmando Pagamento do pedido vencedor (${winner.orderNumber})...`);
    const paidOrder = await OrderService.transitionOrder(
      orgId,
      winner.id,
      { event: "CONFIRM_PAYMENT", reason: "PIX aprovado no gateway" },
      "Operador Financeiro"
    );
    console.log(`   Status do pedido após pagamento: ${paidOrder.status}`);

    // 6. Verificar saldo final no PostgreSQL: on_hand = 0, reserved = 0, available = 0
    const finalBal = await query(
      "SELECT on_hand_quantity, reserved_quantity, available_quantity FROM inventory_balances WHERE organization_id = $1 AND product_id = $2 AND location_id = $3",
      [orgId, testProductId, testLocationId]
    );
    console.log("\n5️⃣ Saldo pós-pagamento (baixa SALE) no PostgreSQL:", finalBal.rows[0]);
    if (
      finalBal.rows[0].on_hand_quantity !== 0 ||
      finalBal.rows[0].reserved_quantity !== 0 ||
      finalBal.rows[0].available_quantity !== 0
    ) {
      throw new Error(`Saldo final inválido! Esperado { on_hand: 0, reserved: 0, available: 0 }, obtido: ${JSON.stringify(finalBal.rows[0])}`);
    }
    console.log("   ✅ Saldo verificado: on_hand = 0, reserved = 0, available = 0");

    // 7. Verificar movimentações no livro-razão (ledger) do PostgreSQL
    const movements = await query(
      "SELECT type, quantity_change, physical_balance_after, reference_type FROM inventory_movements WHERE organization_id = $1 AND product_id = $2 ORDER BY created_at ASC",
      [orgId, testProductId]
    );
    console.log("\n6️⃣ Movimentações no livro-razão (inventory_movements):", movements.rows);

    console.log("\n🎉 TESTE CONCLUÍDO COM 100% DE SUCESSO CONTRA O POSTGRESQL REAL!");
  } finally {
    // Limpeza de dados de teste
    try {
      await query("DELETE FROM order_state_transitions WHERE order_id IN (SELECT id FROM orders WHERE organization_id = $1 AND notes LIKE '%Simulador%')", [orgId]);
      await query("DELETE FROM order_items WHERE product_id = $1", [testProductId]);
      await query("DELETE FROM inventory_reservations WHERE product_id = $1", [testProductId]);
      await query("DELETE FROM inventory_movements WHERE product_id = $1", [testProductId]);
      await query("DELETE FROM inventory_balances WHERE product_id = $1", [testProductId]);
      await query("DELETE FROM products WHERE id = $1", [testProductId]);
    } catch {
      // Ignorar erros de cleanup
    }
  }

  process.exit(0);
}

run().catch((err) => {
  console.error("❌ ERRO NO TESTE:", err);
  process.exit(1);
});
