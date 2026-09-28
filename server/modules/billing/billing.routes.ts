import { Router, Request, Response } from "express";
import { authMiddleware, AuthenticatedRequest } from "../../middlewares/authMiddleware";
import { requireRole } from "../../middlewares/rbacMiddleware";
import { BillingService } from "./billing.service";
import { billingRepo } from "./billing.repository";
import { BillingPaymentMethod } from "./billing.types";
import { SaaSPlanId } from "../../types/saas";

const router = Router();

// ============================================================================
// 1. PUBLIC PAYMENT PROVIDER WEBHOOK (STRICT IDEMPOTENCY)
// Provedor de Pagamentos -> POST /api/billing/webhook -> Idempotência -> Subscription ACTIVE
// ============================================================================
router.post("/webhook", async (req: Request, res: Response) => {
  try {
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
    console.error("[Billing Webhook Error]:", error);
    return res.status(500).json({
      received: false,
      error: error.message,
    });
  }
});

// ============================================================================
// 1.1 ASAAS PAYMENT PROVIDER ADAPTER (PILOTO 01 — ÚNICO PROVEDOR CONECTADO)
// Asaas Webhook -> POST /api/billing/webhook/asaas -> Idempotência -> ACTIVE
// ============================================================================
router.post("/webhook/asaas", async (req: Request, res: Response) => {
  try {
    const asaasBody = req.body;
    const eventId = asaasBody.id || asaasBody.payment?.id || `asaas-evt-${Date.now()}`;
    const invoiceId = asaasBody.payment?.externalReference || asaasBody.invoiceId || asaasBody.externalReference;

    if (!invoiceId) {
      return res.status(400).json({
        success: false,
        error: "Asaas webhook: externalReference (invoiceId) não informado.",
      });
    }

    let eventType: "PAYMENT_APPROVED" | "INVOICE_OVERDUE" = "PAYMENT_APPROVED";
    if (asaasBody.event === "PAYMENT_OVERDUE") {
      eventType = "INVOICE_OVERDUE";
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
    console.error("[Asaas Webhook Error]:", error);
    return res.status(500).json({ success: false, error: error.message });
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
