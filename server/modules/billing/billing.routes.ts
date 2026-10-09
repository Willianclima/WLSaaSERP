import { Router, Request, Response } from "express";
import crypto from "crypto";
import { authMiddleware, AuthenticatedRequest } from "../../middlewares/authMiddleware";
import { requireRole } from "../../middlewares/rbacMiddleware";
import { BillingService } from "./billing.service";
import { billingRepo } from "./billing.repository";
import { BillingPaymentMethod } from "./billing.types";
import { SaaSPlanId } from "../../types/saas";
import { isProduction } from "../../config/environment";

const router = Router();

/**
 * Timing-safe cryptographic comparison to prevent timing attacks on webhook tokens/signatures.
 * Hashes both strings with HMAC-SHA256 first so both buffers are guaranteed identical 32-byte length.
 */
function verifyWebhookSecret(received: string | undefined, expected: string | undefined): boolean {
  if (!received || !expected) return false;
  const key = "aura_webhook_constant_len_key";
  const receivedHash = crypto.createHmac("sha256", key).update(received.trim()).digest();
  const expectedHash = crypto.createHmac("sha256", key).update(expected.trim()).digest();
  return crypto.timingSafeEqual(receivedHash, expectedHash);
}

// ============================================================================
// 1. PUBLIC PAYMENT PROVIDER WEBHOOK (STRICT IDEMPOTENCY & AUTHENTICITY)
// Provedor de Pagamentos -> POST /api/billing/webhook -> Autenticação -> Idempotência -> Subscription ACTIVE
// ============================================================================
router.post("/webhook", async (req: Request, res: Response) => {
  try {
    const isProd = isProduction();
    const receivedToken =
      (req.headers["x-webhook-token"] as string) ||
      (req.headers["x-billing-secret"] as string) ||
      (req.headers["x-aura-signature"] as string);

    if (!receivedToken) {
      return res.status(401).json({
        success: false,
        error: "Acesso não autorizado: token/assinatura de webhook ausente nos cabeçalhos.",
      });
    }

    const expectedSecret = process.env.BILLING_WEBHOOK_SECRET || (!isProd ? "dev_billing_webhook_secret_local" : undefined);

    if (!expectedSecret) {
      console.error("[Billing Webhook] Security Alert: BILLING_WEBHOOK_SECRET não configurado no ambiente.");
      return res.status(500).json({
        success: false,
        error: "Configuração de autenticação de webhook (BILLING_WEBHOOK_SECRET) pendente no servidor.",
      });
    }

    if (!verifyWebhookSecret(receivedToken, expectedSecret)) {
      return res.status(401).json({
        success: false,
        error: "Acesso não autorizado: token/assinatura de webhook inválido.",
      });
    }

    const payload = req.body;
    if (!payload || !payload.eventId || !payload.invoiceId) {
      return res.status(400).json({
        success: false,
        error: "Payload de webhook inválido: 'eventId' e 'invoiceId' são campos obrigatórios.",
      });
    }

    const result = await BillingService.processWebhook(payload);
    return res.status(200).json(result);
  } catch (error: any) {
    console.error("[Billing Webhook Error]:", error?.message || "Internal error");
    return res.status(500).json({
      received: false,
      error: isProduction() ? "Erro ao processar webhook de faturamento." : error.message,
    });
  }
});

// ============================================================================
// 1.1 ASAAS PAYMENT PROVIDER ADAPTER (PILOTO 01 — ÚNICO PROVEDOR CONECTADO)
// Asaas Webhook -> POST /api/billing/webhook/asaas -> Validação Token -> Idempotência -> ACTIVE
// ============================================================================
router.post("/webhook/asaas", async (req: Request, res: Response) => {
  try {
    const isProd = isProduction();
    const receivedToken = (req.headers["asaas-access-token"] as string) || (req.headers["x-asaas-access-token"] as string);

    if (!receivedToken) {
      return res.status(401).json({
        success: false,
        error: "Acesso não autorizado: token de autenticação Asaas ausente no cabeçalho 'asaas-access-token'.",
      });
    }

    const expectedAsaasToken = process.env.ASAAS_WEBHOOK_ACCESS_TOKEN || (!isProd ? "dev_asaas_webhook_token_local" : undefined);

    if (!expectedAsaasToken) {
      console.error("[Asaas Webhook] Security Alert: ASAAS_WEBHOOK_ACCESS_TOKEN não configurado no ambiente.");
      return res.status(500).json({
        success: false,
        error: "Configuração de webhook Asaas (ASAAS_WEBHOOK_ACCESS_TOKEN) pendente no servidor.",
      });
    }

    if (!verifyWebhookSecret(receivedToken, expectedAsaasToken)) {
      return res.status(401).json({
        success: false,
        error: "Acesso não autorizado: token de autenticação Asaas inválido.",
      });
    }

    const asaasBody = req.body;
    if (!asaasBody || typeof asaasBody !== "object") {
      return res.status(400).json({
        success: false,
        error: "Payload de webhook Asaas inválido ou vazio.",
      });
    }

    // Require trustworthy event identifier officially provided by Asaas. Never synthesize random IDs in production.
    const eventId = asaasBody.id || (asaasBody.event && asaasBody.payment?.id ? `${asaasBody.event}_${asaasBody.payment.id}` : null);
    if (!eventId) {
      return res.status(400).json({
        success: false,
        error: "Payload de webhook Asaas inválido: identificador único de evento ('id' ou 'payment.id') ausente.",
      });
    }

    const invoiceId = asaasBody.payment?.externalReference || asaasBody.invoiceId || asaasBody.externalReference;

    if (!invoiceId) {
      return res.status(400).json({
        success: false,
        error: "Asaas webhook: externalReference (invoiceId) não informado no payload.",
      });
    }

    // Map Asaas events to internal domain status
    let eventType: "PAYMENT_APPROVED" | "INVOICE_OVERDUE" | "SUBSCRIPTION_CANCELED" | "IGNORED" = "IGNORED";
    if (
      asaasBody.event === "PAYMENT_RECEIVED" ||
      asaasBody.event === "PAYMENT_CONFIRMED" ||
      asaasBody.event === "PAYMENT_APPROVED"
    ) {
      eventType = "PAYMENT_APPROVED";
    } else if (asaasBody.event === "PAYMENT_OVERDUE") {
      eventType = "INVOICE_OVERDUE";
    } else if (
      asaasBody.event === "PAYMENT_DELETED" ||
      asaasBody.event === "PAYMENT_REFUNDED" ||
      asaasBody.event === "SUBSCRIPTION_CANCELED"
    ) {
      eventType = "SUBSCRIPTION_CANCELED";
    }

    if (eventType === "IGNORED") {
      return res.status(200).json({
        received: true,
        ignored: true,
        event: asaasBody.event,
        message: `Evento Asaas '${asaasBody.event}' recebido e ignorado (não afeta faturas ativas).`,
      });
    }

    const result = await BillingService.processWebhook({
      eventId,
      eventType,
      invoiceId,
      providerTxId: asaasBody.payment?.id,
      amount: asaasBody.payment?.value,
      paymentMethod: "PIX",
      paidAt: asaasBody.payment?.paymentDate || new Date().toISOString(),
      rawPayload: asaasBody,
    });

    return res.status(200).json({ success: true, provider: "ASAAS", result });
  } catch (error: any) {
    console.error("[Asaas Webhook Error]:", error?.message || "Internal error");
    return res.status(500).json({
      success: false,
      error: isProduction() ? "Erro ao processar webhook do Asaas." : error.message,
    });
  }
});

// ============================================================================
// 2. CHECKOUT & INVOICE CREATION (LOJISTA / STORE OWNER)
// ============================================================================
router.post(
  "/checkout",
  authMiddleware,
  requireRole(["SUPER_ADMIN", "OWNER", "LOJA_ADMIN"]),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const orgId = req.organizationId!;
      const { targetPlanId, paymentMethod } = req.body;

      if (!targetPlanId) {
        return res.status(400).json({
          success: false,
          error: "targetPlanId é obrigatório para gerar fatura de checkout.",
        });
      }

      const validMethod: BillingPaymentMethod =
        paymentMethod === "CREDIT_CARD" || paymentMethod === "BOLETO" ? paymentMethod : "PIX";

      const idempotencyKey = (req.headers["x-idempotency-key"] as string) || req.body.idempotencyKey;

      const invoice = await BillingService.createCheckoutInvoice({
        organizationId: orgId,
        targetPlanId: targetPlanId as SaaSPlanId,
        paymentMethod: validMethod,
        idempotencyKey,
      });

      return res.status(201).json({
        success: true,
        message: `Fatura de checkout criada com sucesso via ${validMethod}.`,
        invoice,
      });
    } catch (error: any) {
      return res.status(500).json({ success: false, error: error.message });
    }
  }
);

// ============================================================================
// 3. INVOICES QUERYING
// ============================================================================
router.get("/invoices", authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const orgId = req.organizationId!;
    const invoices = await billingRepo.listByOrgId(orgId);
    return res.json({ success: true, invoices });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

router.get("/invoices/:id", authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const invoice = await billingRepo.findById(req.params.id);
    if (!invoice) {
      return res.status(404).json({ success: false, error: "Fatura não encontrada." });
    }

    // Tenant isolation verification
    if (invoice.organizationId !== req.organizationId && !req.user?.isPlatformSuperAdmin) {
      return res.status(403).json({ success: false, error: "Acesso não autorizado a esta fatura." });
    }

    return res.json({ success: true, invoice });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================================================
// 4. SIMULATION ENDPOINT FOR TESTING GATEWAY WEBHOOK IDEMPOTENCY
// ============================================================================
router.post(
  "/simulate-provider-event",
  authMiddleware,
  requireRole(["SUPER_ADMIN", "OWNER", "LOJA_ADMIN"]),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (isProduction()) {
        return res.status(403).json({
          success: false,
          error: "Rota de simulação desativada em ambiente de produção.",
        });
      }

      const { invoiceId, eventType, customEventId } = req.body;
      if (!invoiceId) {
        return res.status(400).json({
          success: false,
          error: "invoiceId é obrigatório para simular evento do provedor.",
        });
      }

      const result = await BillingService.simulateProviderWebhook({
        invoiceId,
        eventType,
        customEventId,
      });

      return res.json({
        success: true,
        data: result,
      });
    } catch (error: any) {
      return res.status(500).json({ success: false, error: error.message });
    }
  }
);

export default router;
