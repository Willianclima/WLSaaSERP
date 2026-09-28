import { SaaSPlanId } from "../../types/saas";

export type BillingPaymentMethod = "PIX" | "CREDIT_CARD" | "BOLETO";

export type BillingInvoiceStatus = "PENDING" | "PAID" | "FAILED" | "EXPIRED" | "CANCELED";

export interface BillingInvoiceEntity {
  id: string;
  organizationId: string;
  subscriptionId?: string;
  planId: SaaSPlanId;
  amount: number;
  currency: string;
  paymentMethod: BillingPaymentMethod;
  status: BillingInvoiceStatus;
  pixQrCode?: string;
  pixCopyPaste?: string;
  pixTxid?: string;
  boletoBarcode?: string;
  boletoUrl?: string;
  creditCardLast4?: string;
  paidAt?: string;
  dueDate: string;
  providerTxId?: string;
  idempotencyKey?: string;
  metadata?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

export type WebhookEventType =
  | "PAYMENT_APPROVED"
  | "PAYMENT_FAILED"
  | "INVOICE_OVERDUE"
  | "SUBSCRIPTION_CANCELED";

export interface BillingWebhookPayload {
  eventId: string;
  eventType: WebhookEventType;
  invoiceId: string;
  providerTxId: string;
  amount: number;
  paymentMethod: BillingPaymentMethod;
  paidAt?: string;
  metadata?: Record<string, any>;
}

export interface WebhookProcessResult {
  received: boolean;
  processed: boolean;
  idempotent: boolean;
  message: string;
  invoiceId: string;
  status: BillingInvoiceStatus;
  subscriptionStatus?: string;
  planId?: string;
}
