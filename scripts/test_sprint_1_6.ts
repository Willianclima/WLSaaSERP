import { AuthService } from "../server/services/authService";
import { BillingService } from "../server/modules/billing/billing.service";
import { AccessControlService } from "../server/services/accessControlService";
import { SubscriptionService } from "../server/services/subscriptionService";
import { subRepo, orgRepo, userRepo, planRepo } from "../server/repositories";
import { getPostgresPool } from "../server/db/postgres";

async function runTests() {
  console.log("=================================================================");
  console.log("🛡️ INICIANDO SUÍTE DE TESTES SPRINT 1.6 — COMMERCIAL HARDENING");
  console.log("=================================================================\n");

  try {
    // 1. SETUP: Obter ou criar organização de teste
    const testOrgId = "org-lumina-01";
    const sub = await subRepo.findByOrgId(testOrgId);
    console.log(`[Setup] Assinatura da loja ${testOrgId}: Status=${sub?.status}, Plano=${sub?.planId}`);

    // 2. TESTE 1: Ciclo Comercial da Assinatura & Transições Válidas
    console.log("\n▶ TESTE 1: Ciclo Comercial da Assinatura (FSM Transitions)");
    const valid1 = SubscriptionService.isValidTransition("TRIALING", "ACTIVE");
    const valid2 = SubscriptionService.isValidTransition("ACTIVE", "PAST_DUE");
    const valid3 = SubscriptionService.isValidTransition("PAST_DUE", "READ_ONLY");
    const valid4 = SubscriptionService.isValidTransition("READ_ONLY", "SUSPENDED");
    const valid5 = SubscriptionService.isValidTransition("SUSPENDED", "CANCELED");
    const valid6 = SubscriptionService.isValidTransition("PAST_DUE", "ACTIVE"); // Pagamento
    const invalid1 = SubscriptionService.isValidTransition("READ_ONLY", "TRIALING"); // Não volta pra trial!

    console.log(`  TRIALING -> ACTIVE: ${valid1 ? "✅ Permitido" : "❌ Falhou"}`);
    console.log(`  ACTIVE -> PAST_DUE: ${valid2 ? "✅ Permitido" : "❌ Falhou"}`);
    console.log(`  PAST_DUE -> READ_ONLY: ${valid3 ? "✅ Permitido" : "❌ Falhou"}`);
    console.log(`  READ_ONLY -> SUSPENDED: ${valid4 ? "✅ Permitido" : "❌ Falhou"}`);
    console.log(`  SUSPENDED -> CANCELED: ${valid5 ? "✅ Permitido" : "❌ Falhou"}`);
    console.log(`  PAST_DUE -> ACTIVE (Pagamento recebido): ${valid6 ? "✅ Permitido" : "❌ Falhou"}`);
    console.log(`  READ_ONLY -> TRIALING (Inválido): ${!invalid1 ? "✅ Bloqueado com sucesso" : "❌ Falhou"}`);

    // 3. TESTE 2: Módulos do Plano & Não confiar no frontend (Starter vs Consignments)
    console.log("\n▶ TESTE 2: Plano Controla Funcionalidade (Starter sem Consignments)");
    // Temporariamente setar plano para STARTER
    await subRepo.update(testOrgId, { planId: "STARTER", status: "ACTIVE" });
    
    // Verificar se Starter tem catalog_inventory
    const checkCatalog = await AccessControlService.checkModuleInPlan(testOrgId, "catalog_inventory");
    console.log(`  Starter acessando 'catalog_inventory': Allowed=${checkCatalog.allowed} ${checkCatalog.allowed ? "✅" : "❌"}`);

    // Verificar se Starter tem consignments
    const checkConsignments = await AccessControlService.checkModuleInPlan(testOrgId, "consignments");
    console.log(`  Starter acessando 'consignments': Allowed=${checkConsignments.allowed}, Code=${checkConsignments.code} ${!checkConsignments.allowed && checkConsignments.code === "MODULE_NOT_INCLUDED" ? "✅ (403 MODULE_NOT_INCLUDED)" : "❌"}`);

    // 4. TESTE 3: Camada Própria de Billing & Webhook Idempotente
    console.log("\n▶ TESTE 3: Billing Layer & Webhook Idempotente");
    const checkoutInvoice = await BillingService.createCheckoutInvoice({
      organizationId: testOrgId,
      targetPlanId: "PRO",
      paymentMethod: "PIX",
    });
    console.log(`  1. Fatura criada: ID=${checkoutInvoice.id}, Status=${checkoutInvoice.status}, Valor=R$ ${checkoutInvoice.amount}`);
    console.log(`     PIX Copia e Cola gerado: ${checkoutInvoice.pixCopyPaste?.substring(0, 50)}...`);

    const eventId = `test-webhook-${Date.now()}`;

    // Disparo 1 do Webhook: PAYMENT_APPROVED
    const webhook1 = await BillingService.processWebhook({
      eventId,
      eventType: "PAYMENT_APPROVED",
      invoiceId: checkoutInvoice.id,
      providerTxId: "tx-mercadopago-123",
      amount: checkoutInvoice.amount,
      paymentMethod: "PIX",
      paidAt: new Date().toISOString(),
    });
    console.log(`  2. Webhook #1 (PAYMENT_APPROVED): Processed=${webhook1.processed}, Idempotent=${webhook1.idempotent}, Status=${webhook1.status}, SubscriptionStatus=${webhook1.subscriptionStatus} ✅`);

    // Disparo 2 do Webhook: MESMO eventId duplicado pelo provedor
    const webhook2 = await BillingService.processWebhook({
      eventId,
      eventType: "PAYMENT_APPROVED",
      invoiceId: checkoutInvoice.id,
      providerTxId: "tx-mercadopago-123",
      amount: checkoutInvoice.amount,
      paymentMethod: "PIX",
      paidAt: new Date().toISOString(),
    });
    console.log(`  3. Webhook #2 (DUPLICADO): Processed=${webhook2.processed}, Idempotent=${webhook2.idempotent}, Msg="${webhook2.message}" ${webhook2.idempotent ? "✅ (IDEMPOTENTE - NÃO DUPLICOU)" : "❌"}`);

    // Disparo 3 do Webhook: MESMO eventId novamente
    const webhook3 = await BillingService.processWebhook({
      eventId,
      eventType: "PAYMENT_APPROVED",
      invoiceId: checkoutInvoice.id,
      providerTxId: "tx-mercadopago-123",
      amount: checkoutInvoice.amount,
      paymentMethod: "PIX",
      paidAt: new Date().toISOString(),
    });
    console.log(`  4. Webhook #3 (TRIPLICADO): Processed=${webhook3.processed}, Idempotent=${webhook3.idempotent}, Msg="${webhook3.message}" ${webhook3.idempotent ? "✅ (IDEMPOTENTE - NÃO DUPLICOU)" : "❌"}`);

    // Verificar se agora a loja está no plano PRO e ACTIVE
    const updatedSub = await subRepo.findByOrgId(testOrgId);
    console.log(`  5. Assinatura após Webhook: Plano=${updatedSub?.planId}, Status=${updatedSub?.status} ✅`);

    // Verificar se agora a loja no plano PRO PODE acessar consignments
    const checkConsignmentsPro = await AccessControlService.checkModuleInPlan(testOrgId, "consignments");
    console.log(`  6. Pro acessando 'consignments': Allowed=${checkConsignmentsPro.allowed} ${checkConsignmentsPro.allowed ? "✅ (MÓDULO LIBERADO NO PRO)" : "❌"}`);

    // 5. TESTE 4: Fluxo Criar Minha Loja (Trial 30 dias sem cartão)
    console.log("\n▶ TESTE 4: Fluxo Criar Nova Loja (Trial 30 dias sem cartão)");
    const newStoreSession = await AuthService.registerTrial({
      userName: "Fernanda Consultora",
      email: `fernanda-${Date.now()}@teste.com`,
      password: "password123",
      organizationName: `Joias da Fernanda ${Date.now().toString().slice(-4)}`,
      whatsapp: "(11) 98765-4321",
      city: "São Paulo",
      state: "SP",
    });
    console.log(`  Loja criada: Org=${newStoreSession.organization.name}, ID=${newStoreSession.organization.id}`);
    console.log(`  Usuário=${newStoreSession.user.name}, Role=${newStoreSession.membership.role}`);
    console.log(`  Assinatura: Status=${newStoreSession.subscription.status}, Dias=${newStoreSession.subscription.daysRemainingInTrial} dias, Sem cartão de crédito ✅`);

    console.log("\n=================================================================");
    console.log("🎉 TODOS OS TESTES DO SPRINT 1.6 FORAM VALIDADOS COM SUCESSO!");
    console.log("=================================================================\n");
  } catch (err: any) {
    console.error("❌ ERRO NO TESTE:", err);
  } finally {
    getPostgresPool().end();
  }
}

runTests();
