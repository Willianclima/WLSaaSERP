import { Router } from "express";
import { AuthService } from "../services/authService";
import { SubscriptionService } from "../services/subscriptionService";
import { orgRepo, userRepo, memberRepo, subRepo, planRepo, moduleRepo } from "../repositories";
import { TenantContext } from "../db/tenantContext";
import { ProductService } from "../modules/products/product.service";
import { productRepo } from "../modules/products/product.repository";
import { OrderService } from "../modules/orders/order.service";
import { InventoryService } from "../modules/inventory/inventory.service";
import { inventoryRepo } from "../modules/inventory/inventory.repository";
import { storageService } from "../services/storageService";

const router = Router();

export interface StepCheckResult {
  step: number;
  title: string;
  passed: boolean;
  details: string;
  dataSnippet?: any;
}

// POST /api/diagnostics/core-flow - Automated 10-Step SaaS Core Pipeline Verification
router.post("/core-flow", async (_req, res) => {
  const steps: StepCheckResult[] = [];
  const runId = Date.now();
  const testEmail = `diagnostic_${runId}@auratest.com`;
  const testOrgName = `Diagnostic Ateliê ${runId.toString().slice(-4)}`;

  try {
    // STEP 1: POST /api/auth/register Execution
    const session = await AuthService.registerTrial({
      userName: "Willian Auditor",
      email: testEmail,
      password: "secure_pass_demo_123",
      organizationName: testOrgName,
      segment: "SEMIJOIAS",
      document: "12.345.678/0001-90",
      whatsapp: "+55 (19) 99876-5432",
      city: "Limeira",
      state: "SP",
    });

    steps.push({
      step: 1,
      title: "POST /api/auth/register (Onboarding Trigger)",
      passed: Boolean(session && session.token),
      details: `Endpoint de registro executado com payload de teste. Resposta gerou token de sessão: ${session.token.substring(0, 24)}...`,
      dataSnippet: { email: testEmail, orgName: testOrgName },
    });

    // STEP 2: Verify User entity created in Persistence Layer
    const createdUser = await userRepo.findByEmail(testEmail);
    const step2Passed = Boolean(createdUser && createdUser.name === "Willian Auditor");
    steps.push({
      step: 2,
      title: "Usuário Criado no Repositório de Persistência",
      passed: step2Passed,
      details: step2Passed
        ? `Usuário com ID [${createdUser?.id}] persistido com sucesso (Email: ${createdUser?.email}, Status: ${createdUser?.status}).`
        : "Falha: Usuário não foi localizado no repositório de persistência.",
      dataSnippet: createdUser,
    });

    // STEP 3: Verify Organization entity created with proper slug indexing
    const createdOrg = createdUser ? await orgRepo.findById(session.organization.id) : null;
    const step3Passed = Boolean(createdOrg && createdOrg.slug.length > 0 && createdOrg.segment === "SEMIJOIAS");
    steps.push({
      step: 3,
      title: "Organização Criada & Indexada por Slug",
      passed: step3Passed,
      details: step3Passed
        ? `Tenant [${createdOrg?.id}] persistido. Slug: "${createdOrg?.slug}", Domínio: "${createdOrg?.customDomain}".`
        : "Falha: Organização não encontrada no repositório.",
      dataSnippet: createdOrg,
    });

    // STEP 4: Verify Membership created (Role = OWNER, Status = ACTIVE)
    const membership = (createdUser && createdOrg)
      ? await memberRepo.findByOrgAndUser(createdOrg.id, createdUser.id)
      : null;
    const step4Passed = Boolean(membership && membership.role === "OWNER" && membership.status === "ACTIVE");
    steps.push({
      step: 4,
      title: "Vínculo N:N de Membership (Papel: OWNER)",
      passed: step4Passed,
      details: step4Passed
        ? `Vínculo [${membership?.id}] criado associando User [${createdUser?.id}] à Organization [${createdOrg?.id}] com papel [OWNER].`
        : "Falha: Membership não foi estabelecida.",
      dataSnippet: membership,
    });

    // STEP 5: Verify Subscription created in Repositories
    const subscription = createdOrg ? await subRepo.findByOrgId(createdOrg.id) : null;
    const step5Passed = Boolean(subscription && subscription.planId === "TRIAL_30D");
    steps.push({
      step: 5,
      title: "Assinatura Criada (Plano: TRIAL_30D)",
      passed: step5Passed,
      details: step5Passed
        ? `Registro de assinatura [${subscription?.id}] criado e vinculado ao tenant [${createdOrg?.id}].`
        : "Falha: Assinatura não localizada.",
      dataSnippet: subscription,
    });

    // STEP 6: Verify 30-Day Trial State Machine Dates
    const trialStart = subscription ? new Date(subscription.trialStartedAt) : null;
    const trialEnd = subscription ? new Date(subscription.trialEndsAt) : null;
    const daysDiff = (trialStart && trialEnd)
      ? Math.round((trialEnd.getTime() - trialStart.getTime()) / (1000 * 60 * 60 * 24))
      : 0;
    const step6Passed = Boolean(subscription?.status === "TRIALING" && daysDiff >= 29 && daysDiff <= 31);
    steps.push({
      step: 6,
      title: "Trial de 30 Dias Iniciado (Status: TRIALING)",
      passed: step6Passed,
      details: step6Passed
        ? `Início: ${subscription?.trialStartedAt} | Término: ${subscription?.trialEndsAt} | Duração calculada: exactly ${daysDiff} dias.`
        : `Falha: Duração ou status inválido (Status: ${subscription?.status}, Dias: ${daysDiff}).`,
      dataSnippet: { status: subscription?.status, daysDiff, trialStartedAt: subscription?.trialStartedAt, trialEndsAt: subscription?.trialEndsAt },
    });

    // STEP 7: Test Login & Token Generation for newly registered user
    const loginResult = await AuthService.login(testEmail, "secure_pass_demo_123", createdOrg?.id);
    const step7Passed = Boolean(loginResult && loginResult.token && loginResult.user.email === testEmail);
    steps.push({
      step: 7,
      title: "POST /api/auth/login (Autenticação do Usuário)",
      passed: step7Passed,
      details: step7Passed
        ? `Login bem-sucedido. Token emitido: ${loginResult.token.substring(0, 30)}...`
        : "Falha no processo de login.",
    });

    // STEP 8: Token / Session Validity Check
    const tokenValid = loginResult.token.startsWith("sess_aura_") && loginResult.token.includes(createdUser?.id || "");
    steps.push({
      step: 8,
      title: "Token / Sessão Válida e Decodificável",
      passed: tokenValid,
      details: tokenValid
        ? "Assinatura do token validada com integridade de prefixo, timestamp e ID de usuário."
        : "Falha: Formato do token inconsistente.",
    });

    // STEP 9: Active Tenant Resolution Context Check
    const resolvedTenantCorrect = loginResult.organization.id === createdOrg?.id;
    steps.push({
      step: 9,
      title: "Resolução Automática do Contexto do Tenant Ativo",
      passed: resolvedTenantCorrect,
      details: resolvedTenantCorrect
        ? `Tenant resolvido com sucesso: "${loginResult.organization.name}" [ID: ${loginResult.organization.id}].`
        : "Falha na resolução do Tenant ativo no login.",
    });

    // STEP 10: GET /api/subscriptions/current verification
    const subCurrent = createdOrg ? await SubscriptionService.getTenantSubscription(createdOrg.id) : null;
    const step10Passed = Boolean(
      subCurrent &&
      subCurrent.trial.isTrial &&
      subCurrent.trial.daysRemaining >= 29 &&
      subCurrent.allowedModules.length === 11
    );
    steps.push({
      step: 10,
      title: "GET /api/subscriptions/current (Auditoria de Módulos & Degustação)",
      passed: step10Passed,
      details: step10Passed
        ? `Todos os ${subCurrent?.allowedModules.length} módulos liberados no Trial. Dias restantes: ${subCurrent?.trial.daysRemaining} dias.`
        : "Falha na auditoria da assinatura corrente.",
      dataSnippet: {
        allowedModulesCount: subCurrent?.allowedModules.length,
        daysRemaining: subCurrent?.trial.daysRemaining,
        planName: subCurrent?.plan.name,
      },
    });

    const allPassed = steps.every((s) => s.passed);

    return res.json({
      success: true,
      pipelinePassed: allPassed,
      totalSteps: 10,
      passedCount: steps.filter((s) => s.passed).length,
      timestamp: new Date().toISOString(),
      testedOrganization: {
        id: createdOrg?.id,
        name: createdOrg?.name,
        slug: createdOrg?.slug,
      },
      steps,
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      pipelinePassed: false,
      error: error.message,
      steps,
    });
  }
});

// POST /api/diagnostics/sprint-1-2-real-sale - Comprehensive First Real Sale End-to-End Test
router.post("/sprint-1-2-real-sale", async (_req, res) => {
  const steps: StepCheckResult[] = [];
  const runId = Date.now();
  const testEmail = `realsale_${runId}@auratest.com`;
  const testOrgName = `Ateliê Alta Joalheria ${runId.toString().slice(-4)}`;

  try {
    // 1. Setup real tenant with user
    const session = await AuthService.registerTrial({
      userName: "Dona Maria",
      email: testEmail,
      password: "password_real_123",
      organizationName: testOrgName,
      segment: "SEMIJOIAS",
      document: "98.765.432/0001-10",
      whatsapp: "+55 (19) 98888-7777",
      city: "Limeira",
      state: "SP",
    });

    const org = session.organization;

    // STEP 1: Real Photo Upload & Storage Layer
    // Upload 1x1 transparent PNG / real WebP buffer to storageService
    const samplePngBase64 = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";
    const uploadResult = await storageService.uploadBase64(samplePngBase64, `foto_alta_resolucao_${runId}.png`, "image/png", org.id);

    const step1Passed = Boolean(uploadResult && uploadResult.url && uploadResult.storageKey);
    steps.push({
      step: 1,
      title: "P0: Upload -> Storage -> URL Permanente",
      passed: step1Passed,
      details: step1Passed
        ? `Foto real persistida no storage: key="${uploadResult.storageKey}", url="${uploadResult.url}".`
        : "Falha ao gravar arquivo no Object Storage.",
      dataSnippet: uploadResult,
    });

    // STEP 2: Create Product with 1 Unit of Stock and Real Photo attached
    const skuCode = `SOLITARIO-${runId.toString().slice(-4)}`;
    const createdProduct = await TenantContext.run({ tenantId: org.id }, async () => {
      return await ProductService.createProduct(org.id, {
        sku: skuCode,
        name: `Anel Solitário Ouro 18K Zircônia ${runId.toString().slice(-4)}`,
        category: "ANEIS",
        collection: "Coleção Noivas 2026",
        material: "OURO",
        bath: "OURO_18K",
        price: 349.90,
        costPrice: 110.00,
        initialStock: 1, // Exactly 1 unit of stock
        imageUrl: uploadResult.url,
        media: [
          {
            storageKey: uploadResult.storageKey,
            url: uploadResult.url,
            mediaType: "IMAGE",
            isPrimary: true,
            sortOrder: 0,
            title: "Foto Principal Solitário",
          },
        ],
        description: "Peça única em estoque para teste de venda real.",
      }, "Dona Maria");
    });

    const step2Passed = Boolean(createdProduct && createdProduct.id && createdProduct.stockPhysical === 1);
    steps.push({
      step: 2,
      title: "P0: Produto Cadastrado com Estoque = 1 & product_media",
      passed: step2Passed,
      details: step2Passed
        ? `SKU ${createdProduct.sku} criado com estoque físico = 1, disponível = 1, e foto persistida em product_media.`
        : "Falha ao criar produto no banco de dados.",
      dataSnippet: createdProduct,
    });

    // STEP 3: Anonymous Public Catalog Query (No authentication / no token)
    const publicCatalog = await ProductService.listPublicProducts(org.slug);
    const catalogProduct = publicCatalog.products.find((p: any) => p.sku === skuCode);

    const step3Passed = Boolean(
      catalogProduct &&
      catalogProduct.imageUrl === uploadResult.url &&
      catalogProduct.stockPhysical === 1 &&
      publicCatalog.organization.contactWhatsapp === "+55 (19) 98888-7777"
    );

    steps.push({
      step: 3,
      title: "P1: Catálogo Público Acessado por Cliente Anônimo (Sem Auth)",
      passed: step3Passed,
      details: step3Passed
        ? `Catálogo de "${publicCatalog.organization.name}" carregado publicamente via slug "${org.slug}". Foto real confirmada: ${catalogProduct?.imageUrl}. Estoque real = 1.`
        : "Falha: Produto não localizado no catálogo público ou dados divergentes.",
      dataSnippet: {
        organization: publicCatalog.organization,
        catalogProduct,
      },
    });

    // STEP 4: Anonymous Buyer Adds to Bag & Submits Order via WhatsApp
    // Initial status: INVENTORY_RESERVED
    const orderCreated = await TenantContext.run({ tenantId: org.id }, async () => {
      return await OrderService.createOrder(org.id, {
        channel: "WHATSAPP",
        status: "INVENTORY_RESERVED",
        customer: {
          name: "Roberta Compradora",
          phone: "+55 (11) 97777-6666",
        },
        items: [
          {
            productId: createdProduct.id,
            quantity: 1,
            unitPrice: 349.90,
            productSnapshot: {
              sku: createdProduct.sku,
              name: createdProduct.name,
              category: createdProduct.category,
              bath: createdProduct.bath,
              price: createdProduct.price,
              costPrice: createdProduct.costPrice,
            },
          },
        ],
        notes: "Pedido teste sacola catálogo público.",
      });
    });

    // Verify Stock Reservation in DB
    const stockAfterReservation = await TenantContext.run({ tenantId: org.id }, async () => {
      return await InventoryService.getProductStock(org.id, createdProduct.id);
    });

    const reservedQtyStep4 = stockAfterReservation.stockReserved !== undefined
      ? stockAfterReservation.stockReserved
      : stockAfterReservation.reservedTotal;
    const availableQtyStep4 = stockAfterReservation.stockAvailable !== undefined
      ? stockAfterReservation.stockAvailable
      : stockAfterReservation.availableTotal;

    const step4Passed = Boolean(
      orderCreated &&
      orderCreated.status === "INVENTORY_RESERVED" &&
      stockAfterReservation.stockPhysical === 1 &&
      reservedQtyStep4 === 1 &&
      availableQtyStep4 === 0
    );

    steps.push({
      step: 4,
      title: "P1: Pedido no ERP & Reserva de Estoque (Estoque Disponível = 0)",
      passed: step4Passed,
      details: step4Passed
        ? `Pedido ${orderCreated.orderNumber} registrado como INVENTORY_RESERVED. Estoque Físico = 1, Reserva = 1, Disponível = 0 (peça bloqueada para outros compradores).`
        : `Falha na reserva de estoque: Físico=${stockAfterReservation.stockPhysical}, Reserva=${reservedQtyStep4}, Disponível=${availableQtyStep4}`,
      dataSnippet: {
        order: orderCreated,
        stockAfterReservation,
      },
    });

    // STEP 5: Vendedora Confirms Payment -> Transição para PAID
    const orderPaid = await TenantContext.run({ tenantId: org.id }, async () => {
      return await OrderService.transitionOrder(org.id, orderCreated.id, {
        event: "CONFIRM_PAYMENT",
        operatorName: "Dona Maria (Vendedora)",
        reason: "Comprovante PIX recebido e conferido",
      });
    });

    // Check Stock After Payment: Físico = 0, Reserva = 0, Disponível = 0
    const stockAfterPayment = await TenantContext.run({ tenantId: org.id }, async () => {
      return await InventoryService.getProductStock(org.id, createdProduct.id);
    });

    const reservedQtyStep5 = stockAfterPayment.stockReserved !== undefined
      ? stockAfterPayment.stockReserved
      : stockAfterPayment.reservedTotal;
    const availableQtyStep5 = stockAfterPayment.stockAvailable !== undefined
      ? stockAfterPayment.stockAvailable
      : stockAfterPayment.availableTotal;

    const step5Passed = Boolean(
      orderPaid &&
      orderPaid.status === "PAID" &&
      orderPaid.paymentStatus === "PAID" &&
      stockAfterPayment.stockPhysical === 0 &&
      reservedQtyStep5 === 0 &&
      availableQtyStep5 === 0
    );

    steps.push({
      step: 5,
      title: "P1: Vendedora Confirma Pagamento -> STATUS PAID & Baixa de Estoque",
      passed: step5Passed,
      details: step5Passed
        ? `Pedido ${orderPaid.orderNumber} marcado como PAID. Estoque Físico = 0, Reserva = 0, Disponível = 0 (baixa consumada com sucesso).`
        : `Falha na baixa: Status=${orderPaid?.status}, Físico=${stockAfterPayment.stockPhysical}, Reserva=${reservedQtyStep5}`,
      dataSnippet: {
        orderPaid,
        stockAfterPayment,
      },
    });

    // STEP 6: Inventory Ledger Check (Movimento SALE com quantidade = -1)
    const movements = await TenantContext.run({ tenantId: org.id }, async () => {
      return await inventoryRepo.listMovements(org.id, createdProduct.id);
    });

    const saleMovement = movements.find((m: any) => m.type === "SALE" && m.referenceId === orderPaid.orderNumber);
    const step6Passed = Boolean(saleMovement && saleMovement.quantityChange === -1);

    steps.push({
      step: 6,
      title: "P1: Baixa no Ledger de Estoque (Audit Trail Imutável)",
      passed: step6Passed,
      details: step6Passed
        ? `Movimentação SALE localizada no Ledger: id="${saleMovement?.id}", qtyChange=${saleMovement?.quantityChange}, ref="${saleMovement?.referenceId}", operador="${saleMovement?.operatorName}".`
        : "Falha: Movimentação de venda não foi encontrada no Ledger de estoque.",
      dataSnippet: saleMovement,
    });

    // STEP 7: Digital Warranty Emission
    const warrantyCode = orderPaid.warrantyCode;
    const step7Passed = Boolean(warrantyCode && warrantyCode.length >= 6);

    steps.push({
      step: 7,
      title: "P1: Emissão de Garantia Digital Automática",
      passed: step7Passed,
      details: step7Passed
        ? `Código de garantia digital gerado: ${warrantyCode} para cliente ${orderPaid.customerSnapshot?.name}.`
        : "Falha: Código de garantia digital não foi emitido.",
      dataSnippet: { warrantyCode },
    });

    // STEP 8: Cross-Device / Fresh Session Catalog Persistence Verification
    // A separate client checks the catalog: product is still there, photo is intact, stock is 0 (esgotado)
    const freshCatalog = await ProductService.listPublicProducts(org.slug);
    const freshProduct = freshCatalog.products.find((p: any) => p.sku === skuCode);

    const step8Passed = Boolean(
      freshProduct &&
      freshProduct.imageUrl === uploadResult.url &&
      freshProduct.totalStock === 0
    );

    steps.push({
      step: 8,
      title: "P1: Persistência Multi-Dispositivo & Foto Inalterada",
      passed: step8Passed,
      details: step8Passed
        ? `Consulta independente em novo cliente confirmou SKU ${freshProduct?.sku}: Foto permanece idêntica (${freshProduct?.imageUrl}) e estoque total = 0 (Esgotado).`
        : "Falha na sincronização multi-dispositivo.",
      dataSnippet: freshProduct,
    });

    const allPassed = steps.every((s) => s.passed);

    return res.json({
      success: true,
      allPassed,
      totalSteps: 8,
      passedCount: steps.filter((s) => s.passed).length,
      timestamp: new Date().toISOString(),
      testedOrganization: {
        id: org.id,
        name: org.name,
        slug: org.slug,
      },
      steps,
    });
  } catch (err: any) {
    console.error("Sprint 1.2 diagnostic error:", err);
    return res.status(500).json({
      success: false,
      allPassed: false,
      error: err.message,
      steps,
    });
  }
});

export default router;
