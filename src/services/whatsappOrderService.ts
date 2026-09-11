/**
 * WhatsApp Traceable Order & ERP Identification Service
 * Ensures that all orders and inquiries initiated via WhatsApp carry strict,
 * structured, auditable ERP identifiers:
 * - organization_id
 * - product_id
 * - sku
 * - quantity
 * - sales_channel = 'WHATSAPP'
 * - external_reference (e.g., 'WA-2026-1042' or 'WA-89421')
 * - reseller / consultant (e.g., 'Maria')
 * - customer / client (e.g., 'João')
 */

import { CreateOrderDTO, Order, CustomJewelryOrderSpec } from "../types";

export interface WhatsAppOrderItem {
  productId: string;
  sku: string;
  name: string;
  quantity: number;
  unitPrice: number;
  totalAmount: number;
  bath?: string;
  customizationSpec?: any;
}

export interface TraceableWhatsAppOrderPayload {
  organizationId: string;
  organizationName?: string;
  salesChannel: "WHATSAPP";
  externalReference: string;
  orderNumber?: string;
  
  // Reseller / Consultant (Consultora)
  resellerId?: string;
  resellerName?: string;
  resellerPhone?: string;

  // Customer / Client (Cliente)
  customerId?: string;
  customerName: string;
  customerPhone?: string;
  customerCity?: string;

  // Products
  items: WhatsAppOrderItem[];
  
  subtotal: number;
  shippingAmount?: number;
  discountAmount?: number;
  totalAmount: number;
  
  status?: "DRAFT" | "PENDING_CONFIRMATION" | "INVENTORY_RESERVED" | "AWAITING_PAYMENT";
  notes?: string;
  isInquiryOnly?: boolean; // When product is sob consulta / out of stock
}

class WhatsAppOrderService {
  /**
   * Generates a distinct traceable external reference code.
   * e.g., "WA-2026-1042" or "WA-2026-89421"
   */
  public generateExternalReference(customId?: string | number): string {
    const year = new Date().getFullYear();
    if (customId) {
      const clean = String(customId).replace(/\D/g, "");
      return `WA-${year}-${clean || "1042"}`;
    }
    const randomSuffix = Math.floor(10000 + Math.random() * 90000);
    return `WA-${year}-${randomSuffix}`;
  }

  /**
   * Formats a direct luxury product inquiry for WhatsApp
   * Creates an immediate, friction-free conversation starter for the buyer.
   */
  public formatDirectProductInquiry(product: {
    name: string;
    sku?: string;
    price: number;
    bath?: string;
    warrantyMonths?: number;
    externalReference?: string;
    resellerName?: string;
  }): string {
    const bathName = product.bath === "OURO_18K" ? "Ouro 18K (10 Milésimos)" : product.bath === "RODIO_BRANCO" ? "Ródio Branco Nobre" : (product.bath || "Banho Nobre");
    const warranty = product.warrantyMonths || 12;

    let msg = `Olá! ✨ Tenho interesse na peça *${product.name}*.\n\n`;
    if (product.sku) {
      msg += `💎 *Código:* ${product.sku}\n`;
    }
    msg += `✨ *Banho:* ${bathName}\n`;
    msg += `💰 *Valor:* R$ ${product.price.toFixed(2).replace(".", ",")}\n`;
    msg += `🛡️ *Garantia:* ${warranty} meses (Certificado Digital)\n\n`;
    msg += `Gostaria de saber mais informações ou combinar a entrega! 😊`;

    if (product.externalReference) {
      msg += `\n\n_(Ref: ${product.externalReference})_`;
    }

    return msg;
  }

  /**
   * Builds the formatted, structured message text containing all order metadata
   * ready for sending to WhatsApp with high elegance and no dry ERP jargon.
   */
  public formatTraceableMessage(payload: TraceableWhatsAppOrderPayload): string {
    const isSingle = payload.items.length === 1;
    
    if (isSingle && payload.isInquiryOnly) {
      const item = payload.items[0];
      return this.formatDirectProductInquiry({
        name: item.name,
        sku: item.sku,
        price: item.unitPrice,
        bath: item.bath,
        externalReference: payload.externalReference,
        resellerName: payload.resellerName,
      });
    }

    let msg = `Olá! ✨ Gostaria de fazer o pedido das seguintes semijoias:\n\n`;
    
    payload.items.forEach((item, index) => {
      msg += `💎 *${item.name}*\n`;
      if (item.bath) {
        msg += `   • Banho: ${item.bath === "OURO_18K" ? "Ouro 18K" : item.bath === "RODIO_BRANCO" ? "Ródio Branco" : item.bath}\n`;
      }
      if (item.customizationSpec?.engravingName) {
        msg += `   • Gravação: "${item.customizationSpec.engravingName}"\n`;
      }
      msg += `   • Qtd: ${item.quantity}x — R$ ${item.totalAmount.toFixed(2).replace(".", ",")}\n\n`;
    });

    if (payload.shippingAmount && payload.shippingAmount > 0) {
      msg += `🚚 *Frete:* R$ ${payload.shippingAmount.toFixed(2).replace(".", ",")}\n`;
    }
    if (payload.discountAmount && payload.discountAmount > 0) {
      msg += `🎟️ *Desconto:* -R$ ${payload.discountAmount.toFixed(2).replace(".", ",")}\n`;
    }

    msg += `💰 *Valor Total:* *R$ ${payload.totalAmount.toFixed(2).replace(".", ",")}*\n`;
    msg += `🛡️ *Garantia:* 1 ano com Certificado Digital em todas as peças\n\n`;

    if (payload.customerName) {
      msg += `👤 *Nome:* ${payload.customerName}\n`;
    }
    if (payload.customerCity) {
      msg += `📍 *Entrega:* ${payload.customerCity}\n`;
    }

    msg += `\nPoderia me enviar a chave PIX ou link de pagamento para fecharmos? Obrigada! ✨`;
    msg += `\n\n_(Ref: ${payload.externalReference})_`;

    return msg;
  }

  /**
   * Formats a professional WhatsApp message sent by the Reseller / Store to the customer
   * confirming payment receipt and digital warranty activation.
   */
  public formatPaymentConfirmationMessage(order: {
    orderNumber: string;
    customerName: string;
    totalAmount: number;
    warrantyCode?: string;
    items?: Array<{ name?: string; productSnapshot?: { name: string } }>;
    resellerName?: string;
  }): string {
    const pieces = order.items
      ?.map((i) => i.productSnapshot?.name || i.name)
      .filter(Boolean)
      .join(", ") || "Semijoia Lumina";

    let msg = `💎 *PAGAMENTO CONFIRMADO & PEDIDO EM PREPARAÇÃO!* 💎\n`;
    msg += `━━━━━━━━━━━━━━━━━━━━━\n`;
    msg += `📋 *Pedido:* \`${order.orderNumber}\`\n`;
    msg += `👤 *Cliente:* ${order.customerName}\n`;
    msg += `💰 *Valor Liquidado:* R$ ${order.totalAmount.toFixed(2)}\n`;
    msg += `✨ *Peça(s):* ${pieces}\n`;
    
    if (order.warrantyCode) {
      msg += `🛡️ *Garantia Digital Ativada:* \`${order.warrantyCode}\` (12 Meses)\n`;
    }
    
    msg += `📦 *Status do Pedido:* PAGO • Estoque Baixado (SALE)\n`;
    msg += `━━━━━━━━━━━━━━━━━━━━━\n\n`;
    msg += `Olá ${order.customerName}! Confirmamos o recebimento do seu pagamento com sucesso! ✨\n\n`;
    msg += `Suas peças já entraram no processo de separação e embalagem nobre com certificado de garantia ativo.\n\n`;
    msg += `Muito obrigado(a) pela confiança! ${order.resellerName ? `— ${order.resellerName}` : "— Lumina Semijoias"}`;

    return msg;
  }

  /**
   * Generates the WhatsApp wa.me URL
   */
  public generateWhatsAppUrl(phone: string, message: string): string {
    const cleanPhone = phone.replace(/\D/g, "");
    const finalPhone = cleanPhone.length <= 11 ? `55${cleanPhone}` : cleanPhone;
    return `https://wa.me/${finalPhone}?text=${encodeURIComponent(message)}`;
  }

  /**
   * Translates the WhatsApp payload into a standard CreateOrderDTO and
   * posts it to the ERP backend (/api/orders) to ensure it gets registered.
   */
  public async submitOrderToERP(
    payload: TraceableWhatsAppOrderPayload,
    authToken?: string
  ): Promise<{ success: boolean; order?: Order; error?: string }> {
    try {
      const orderDto: CreateOrderDTO = {
        customerId: payload.customerId || `cust-wa-${Date.now()}`,
        channel: "WHATSAPP",
        externalReference: payload.externalReference,
        resellerId: payload.resellerId,
        items: payload.items.map((item) => ({
          productId: item.productId,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          customizationSpec: item.customizationSpec,
        })),
        shippingAddress: {
          recipientName: payload.customerName,
          phone: payload.customerPhone,
          city: payload.customerCity || "São Paulo",
          state: "SP",
          street: "Pedido WhatsApp",
          number: "S/N",
          zipCode: "00000-000",
        },
        shippingAmount: payload.shippingAmount || 0,
        discountAmount: payload.discountAmount || 0,
        notes: `Pedido gerado via WhatsApp com Ref. Externa ${payload.externalReference}. Consultora: ${payload.resellerName || "Maria"}. Cliente: ${payload.customerName}.`,
        initialStatus: payload.isInquiryOnly ? "DRAFT" : "INVENTORY_RESERVED",
        metadata: {
          organization_id: payload.organizationId,
          sales_channel: "WHATSAPP",
          external_reference: payload.externalReference,
          consultant_name: payload.resellerName,
          customer_name: payload.customerName,
          product_skus: payload.items.map((i) => i.sku),
          product_ids: payload.items.map((i) => i.productId),
          quantities: payload.items.map((i) => i.quantity),
          created_via: "STOREFRONT_WHATSAPP_BUTTON",
        },
      };

      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        "x-tenant-id": payload.organizationId || "org-lumina-01",
      };
      if (authToken) {
        headers["Authorization"] = `Bearer ${authToken}`;
      }

      const endpoint = authToken ? "/api/orders" : "/api/orders/public";
      const requestPayload = authToken
        ? orderDto
        : {
            ...orderDto,
            organizationId: payload.organizationId || "org-lumina-01",
          };

      const response = await fetch(endpoint, {
        method: "POST",
        headers,
        body: JSON.stringify(requestPayload),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok || !data.success) {
        const errorMsg = data.error || data.message || `Erro HTTP ${response.status} ao registrar pedido`;
        console.error("ERP backend order registration failed:", errorMsg);
        return {
          success: false,
          error: errorMsg,
        };
      }

      return { success: true, order: data.data || data };
    } catch (err: any) {
      console.error("Failed to create order via API:", err);
      return { success: false, error: err.message || "Erro de conexão com o servidor ERP" };
    }
  }
}

export const whatsappOrderService = new WhatsAppOrderService();
