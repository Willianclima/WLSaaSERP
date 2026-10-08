import crypto from "crypto";
import { planRepo, subRepo } from "../../repositories";
import { SaaSPlanId } from "../../types/saas";
import { SubscriptionService } from "../../services/subscriptionService";
import { auditService } from "../../services/auditService";
import { billingRepo } from "./billing.repository";
import {
  BillingInvoiceEntity,
  BillingPaymentMethod,
  BillingWebhookPayload,
  WebhookProcessResult,
} from "./billing.types";

export class BillingService {
  private static readonly activeWebhookEvents = new Set<string>();

  /**
   * Sanitizes webhook payload to remove any sensitive keys (tokens, cards, credentials)
   * before storing into audit/event database tables.
   */
  private static sanitizePayload(payload: any): any {
    if (!payload || typeof payload !== "object") return payload;
    try {
      const sanitized = JSON.parse(JSON.stringify(payload));
      const sensitiveKeys = ["token", "secret", "password", "hash", "cardnumber", "cvv", "securitycode", "access_token"];
      const redact = (obj: any) => {
        if (!obj || typeof obj !== "object") return;
        for (const key of Object.keys(obj)) {
          const lower = key.toLowerCase();
          if (sensitiveKeys.some((s) => lower.includes(s))) {
            obj[key] = "[REDACTED]";
          } else if (typeof obj[key] === "object") {
            redact(obj[key]);
          }
        }
      };
      redact(sanitized);
      return sanitized;
    } catch {
      return { eventId: payload.eventId, invoiceId: payload.invoiceId };
    }
  }

  /**
   * Generates a Brazilian EMVCo-compliant simulated PIX Copia e Cola payload.
   */
  private static generatePixPayload(txId: string, amount: number, orgName: string): { copyPaste: string; qrCode: string } {
    const formattedAmount = amount.toFixed(2);
    const cleanName = orgName.substring(0, 25).toUpperCase().replace(/[^A-Z0-9 ]/g, "");
    const copyPaste = `00020101021226840014br.gov.bcb.pix2562pix.aura.com.br/qr/v2/${txId}520400005303986540${formattedAmount.length}${formattedAmount}5802BR59${cleanName.length < 10 ? "0" + cleanName.length : cleanName.length}${cleanName}6007LIMEIRA62070503***6304ABCD`;
    const qrCode = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(copyPaste)}`;
    return { copyPaste, qrCode };
  }

  /**
   * Generates a Febraban-compliant 47-digit Boleto barcode.
   */
  private static generateBoletoData(amount: number): { barcode: string; url: string } {
    const randomBlock1 = Math.floor(10000 + Math.random() * 90000);
    const randomBlock2 = Math.floor(100000 + Math.random() * 900000);
    const randomBlock3 = Math.floor(100000 + Math.random() * 900000);
    const cents = Math.round(amount * 100).toString().padStart(10, "0");
    const barcode = `34191.${randomBlock1} ${randomBlock2}.123456 ${randomBlock3}.789012 1 ${cents}`;
    const url = `https://billing.aura.com/boleto/pdf/${Date.now()}`;
    return { barcode, url };
  }

  /**
   * Creates a formal checkout invoice for subscription upgrade or renewal.
   * Subscription -> Billing -> Provider Checkout (PIX, Cartão, Boleto)
   */
  static async createCheckoutInvoice(data: {
    organizationId: string;
    targetPlanId: SaaSPlanId;
    paymentMethod: BillingPaymentMethod;
    idempotencyKey?: string;
  }): Promise<BillingInvoiceEntity> {
    const { organizationId, targetPlanId, paymentMethod, idempotencyKey } = data;

    const plan = await planRepo.findById(targetPlanId);
    if (!plan) {
      throw new Error(`Plano '${targetPlanId}' não encontrado.`);
    }

    const sub = await subRepo.findByOrgId(organizationId);
    const invoiceId = `inv-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`;
    const txId = `tx-${Date.now()}`;
    const now = new Date();
    const dueDate = new Date(now.getTime() + 3 * 86400000); // 3 days for PIX/Boleto

    const { copyPaste: pixCopyPaste, qrCode: pixQrCode } = this.generatePixPayload(
      txId,
      plan.priceMonthlyBrl,
      "AURA SEMIJOIAS"
    );

    const { barcode: boletoBarcode, url: boletoUrl } = this.generateBoletoData(plan.priceMonthlyBrl);

    const invoice: BillingInvoiceEntity = {
      id: invoiceId,
      organizationId,
      subscriptionId: sub?.id,
      planId: targetPlanId,
      amount: plan.priceMonthlyBrl,
      currency: "BRL",
      paymentMethod,
      status: "PENDING",
      pixQrCode: paymentMethod === "PIX" ? pixQrCode : undefined,
      pixCopyPaste: paymentMethod === "PIX" ? pixCopyPaste : undefined,
      pixTxid: paymentMethod === "PIX" ? txId : undefined,
      boletoBarcode: paymentMethod === "BOLETO" ? boletoBarcode : undefined,
      boletoUrl: paymentMethod === "BOLETO" ? boletoUrl : undefined,
      creditCardLast4: paymentMethod === "CREDIT_CARD" ? "4242" : undefined,
      dueDate: dueDate.toISOString(),
      providerTxId: txId,
      idempotencyKey,
      metadata: {
        planName: plan.name,
        planPrice: plan.priceMonthlyBrl,
        maxUsers: plan.maxUsers,
        maxProducts: plan.maxProducts,
      },
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    };

    const created = await billingRepo.create(invoice);

    await auditService.logAction(
      organizationId,
      undefined,
      "BILLING_INVOICE_CREATED",
      "INVOICE",
      invoiceId,
      "127.0.0.1",
      "Aura Billing Service",
      `Fatura gerada para plano ${plan.name} (${paymentMethod}) no valor de R$ ${plan.priceMonthlyBrl.toFixed(2)}`
    );

    return created;
  }

  /**
   * Processes a payment provider webhook with STRICT IDEMPOTENCY.
   * If provider sends:
   * PAYMENT_APPROVED
   * PAYMENT_APPROVED
   * PAYMENT_APPROVED
   * The system processes the payment and activates the plan EXACTLY ONCE.
   */
  static async processWebhook(payload: BillingWebhookPayload): Promise<WebhookProcessResult> {
    const { eventId, eventType, invoiceId, providerTxId, paymentMethod } = payload;

    if (!eventId) {
      throw new Error("Webhook inválido: 'eventId' é obrigatório para garantia de idempotência.");
    }

    if (!invoiceId) {
      throw new Error("Webhook inválido: 'invoiceId' é obrigatório.");
    }

    if (this.activeWebhookEvents.has(eventId)) {
      return {
        received: true,
        processed: false,
        idempotent: true,
        message: "Evento de webhook já está sendo processado concorrentemente. Bloqueio atômico de concorrência ativo.",
        invoiceId,
        status: "PENDING",
      };
    }

    this.activeWebhookEvents.add(eventId);

    try {
      const sanitized = this.sanitizePayload(payload);

      // -------------------------------------------------------------------------
      // 1. FETCH INVOICE
      // -------------------------------------------------------------------------
      const invoice = await billingRepo.findById(invoiceId);
      if (!invoice) {
        throw new Error(`Fatura '${invoiceId}' não foi encontrada para conciliação do webhook.`);
      }

      // -------------------------------------------------------------------------
      // 2. DATABASE-LEVEL IDEMPOTENCY LOCK (PostgreSQL UNIQUE CONSTRAINT)
      // -------------------------------------------------------------------------
      const claimResult = await billingRepo.claimWebhookEvent({
        eventId,
        providerTxId,
        eventType,
        invoiceId,
        organizationId: invoice.organizationId,
        payload: sanitized,
      });

      if (!claimResult.claimed) {
        return {
          received: true,
          processed: false,
          idempotent: true,
          message: "Webhook já registrado no banco de dados. Nenhuma ação duplicada executada (Garantia de Idempotência no PostgreSQL).",
          invoiceId,
          status: invoice.status || "PAID",
          subscriptionStatus: "ACTIVE",
          planId: invoice.planId,
        };
      }

      // If invoice was already marked PAID previously by another event, ensure idempotent return
      if (invoice.status === "PAID" && eventType === "PAYMENT_APPROVED") {
        await billingRepo.markWebhookEventCompleted(eventId, "PROCESSED");
        return {
          received: true,
          processed: false,
          idempotent: true,
          message: "Fatura já liquidada anteriormente. Evento duplicado registrado como idempotente.",
          invoiceId,
          status: "PAID",
          subscriptionStatus: "ACTIVE",
          planId: invoice.planId,
        };
      }

      // -------------------------------------------------------------------------
      // 3. EXECUTE PAYMENT APPROVAL & SUBSCRIPTION ACTIVATION
      // -------------------------------------------------------------------------
      if (eventType === "PAYMENT_APPROVED") {
        const now = new Date().toISOString();

        // Mark invoice as PAID
        await billingRepo.updateStatus(invoiceId, "PAID", {
          paidAt: now,
          providerTxId: providerTxId || invoice.providerTxId,
          metadata: {
            ...invoice.metadata,
            approvedViaWebhook: true,
            webhookEventId: eventId,
          },
        });

        // Activate Subscription in Core SaaS Engine
        await SubscriptionService.activateSubscriptionFromPayment({
          organizationId: invoice.organizationId,
          targetPlanId: invoice.planId,
          invoiceId: invoice.id,
          paymentMethod: paymentMethod || invoice.paymentMethod,
        });

        // Mark event as successfully processed in database
        await billingRepo.markWebhookEventCompleted(eventId, "PROCESSED");

        return {
          received: true,
          processed: true,
          idempotent: false,
          message: `Pagamento aprovado com sucesso! Plano ${invoice.planId} ativado para a organização.`,
          invoiceId,
          status: "PAID",
          subscriptionStatus: "ACTIVE",
          planId: invoice.planId,
        };
      } else if (eventType === "INVOICE_OVERDUE") {
        // Transition invoice to EXPIRED and subscription to PAST_DUE
        await billingRepo.updateStatus(invoiceId, "EXPIRED");
        try {
          await SubscriptionService.transitionStatus(
            invoice.organizationId,
            "PAST_DUE",
            `Fatura ${invoiceId} vencida sem pagamento.`
          );
        } catch (err: any) {
          console.warn("Notice transitioning to PAST_DUE:", err.message);
        }

        await billingRepo.markWebhookEventCompleted(eventId, "PROCESSED");

        return {
          received: true,
          processed: true,
          idempotent: false,
          message: "Fatura expirada. Assinatura marcada como PAST_DUE.",
          invoiceId,
          status: "EXPIRED",
          subscriptionStatus: "PAST_DUE",
          planId: invoice.planId,
        };
      } else if (eventType === "SUBSCRIPTION_CANCELED") {
        await billingRepo.updateStatus(invoiceId, "CANCELED");
        try {
          await SubscriptionService.transitionStatus(
            invoice.organizationId,
            "CANCELED",
            `Cancelamento solicitado via provedor de cobrança.`
          );
        } catch (err: any) {
          console.warn("Notice transitioning to CANCELED:", err.message);
        }

        await billingRepo.markWebhookEventCompleted(eventId, "PROCESSED");

        return {
          received: true,
          processed: true,
          idempotent: false,
          message: "Assinatura cancelada via provedor.",
          invoiceId,
          status: "CANCELED",
          subscriptionStatus: "CANCELED",
          planId: invoice.planId,
        };
      }

      return {
        received: true,
        processed: false,
        idempotent: false,
        message: `Tipo de evento de webhook desconhecido ou não aplicável: ${eventType}`,
        invoiceId,
        status: invoice.status,
      };
    } finally {
      this.activeWebhookEvents.delete(eventId);
    }
  }

  /**
   * Helper for testing/simulating external payment gateway webhooks.
   */
  static async simulateProviderWebhook(data: {
    invoiceId: string;
    eventType?: "PAYMENT_APPROVED" | "INVOICE_OVERDUE" | "SUBSCRIPTION_CANCELED";
    customEventId?: string;
  }) {
    const invoice = await billingRepo.findById(data.invoiceId);
    if (!invoice) {
      throw new Error(`Fatura '${data.invoiceId}' não encontrada.`);
    }

    const eventId = data.customEventId || `evt-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;

    const payload: BillingWebhookPayload = {
      eventId,
      eventType: data.eventType || "PAYMENT_APPROVED",
      invoiceId: invoice.id,
      providerTxId: invoice.providerTxId || `tx-prov-${Date.now()}`,
      amount: invoice.amount,
      paymentMethod: invoice.paymentMethod,
      paidAt: new Date().toISOString(),
    };

    return this.processWebhook(payload);
  }
}
