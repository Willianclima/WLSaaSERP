/**
 * Storefront Module Service
 * Decouples public consumer storefront operations from the internal ERP admin engine.
 * Allows the public catalog to load products, check stock, and place orders independently.
 */

import { ProductItem, StoreBrandingConfig } from "../../types";

export interface PublicStorefrontCatalog {
  storeName: string;
  storeSlug: string;
  slogan: string;
  primaryColor: string;
  secondaryColor: string;
  instagram: string;
  whatsapp: string;
  products: ProductItem[];
  totalProductsCount: number;
  catalogUrl: string;
}

export class StorefrontService {
  private static CART_STORAGE_KEY = "lumina_public_storefront_cart";
  private static STORE_META_KEY = "lumina_storefront_meta";

  /**
   * Generates public store link based on host or current origin
   */
  public static getPublicStoreUrl(tenantSlug?: string): string {
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const cleanSlug = tenantSlug || "lumina";
    return `${origin}/#loja/${cleanSlug}`;
  }

  /**
   * Generates formatted WhatsApp share message
   */
  public static generateWhatsAppShareText(
    storeName: string,
    slogan: string,
    catalogUrl: string
  ): string {
    return (
      `✨ *Novidades Exclusivas da ${storeName}!*\n\n` +
      `${slogan || "Semijoias selecionadas com banho nobre e garantia oficial."}\n\n` +
      `Acesse nosso catálogo online oficial para escolher suas peças favoritas:\n` +
      `👉 ${catalogUrl}\n\n` +
      `É só escolher as peças, adicionar à sacola e falar comigo para combinar a entrega! 💎`
    );
  }

  /**
   * Opens WhatsApp directly with pre-filled message
   */
  public static shareOnWhatsApp(
    phone: string,
    storeName: string,
    slogan: string,
    catalogUrl: string
  ): void {
    const text = this.generateWhatsAppShareText(storeName, slogan, catalogUrl);
    const cleanPhone = (phone || "").replace(/\D/g, "");
    
    // If phone is provided, target direct chat; otherwise open generic share
    const waUrl = cleanPhone.length >= 10
      ? `https://api.whatsapp.com/send?phone=55${cleanPhone.replace(/^55/, "")}&text=${encodeURIComponent(text)}`
      : `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;

    if (typeof window !== "undefined") {
      window.open(waUrl, "_blank", "noopener,noreferrer");
    }
  }

  /**
   * Copies catalog link to clipboard with feedback
   */
  public static async copyCatalogLink(catalogUrl: string): Promise<boolean> {
    try {
      if (typeof navigator !== "undefined" && navigator.clipboard) {
        await navigator.clipboard.writeText(catalogUrl);
        return true;
      }
      return false;
    } catch (err) {
      console.warn("Clipboard copy failed, fallback:", err);
      return false;
    }
  }

  /**
   * Fetches public store catalog independently from ERP
   */
  public static async fetchPublicCatalog(tenantIdOrSlug: string): Promise<ProductItem[]> {
    try {
      const response = await fetch(`/api/products?tenantId=${encodeURIComponent(tenantIdOrSlug)}`, {
        headers: {
          "Accept": "application/json",
          "x-tenant-id": tenantIdOrSlug,
        },
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && Array.isArray(data.data)) {
          return data.data;
        }
      }
    } catch (err) {
      console.warn("Failed to fetch public catalog from API, using cached/fallback:", err);
    }
    return [];
  }

  /**
   * Submits a public order (POST /api/orders/public)
   * Direct pipeline: Storefront -> POST /api/orders/public -> OrderService -> InventoryConcurrencyService -> PostgreSQL
   */
  public static async submitPublicOrder(orderPayload: {
    tenantId: string;
    customer: {
      name: string;
      phone: string;
      email?: string;
      document?: string;
      city?: string;
      address?: string;
    };
    items: Array<{
      productId: string;
      quantity: number;
      unitPrice: number;
      name?: string;
      sku?: string;
    }>;
    paymentMethod?: string;
    notes?: string;
    storeSlug?: string;
    subtotalAmount: number;
    discountAmount?: number;
    shippingAmount?: number;
    totalAmount: number;
  }): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      const response = await fetch("/api/orders/public", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-tenant-id": orderPayload.tenantId,
          ...(orderPayload.storeSlug ? { "x-store-slug": orderPayload.storeSlug } : {}),
        },
        body: JSON.stringify({
          storeSlug: orderPayload.storeSlug,
          organizationId: orderPayload.tenantId,
          channel: "ONLINE_STOREFRONT",
          customer: {
            name: orderPayload.customer.name,
            phone: orderPayload.customer.phone,
            document: orderPayload.customer.document || "",
            email: orderPayload.customer.email || "",
          },
          items: orderPayload.items.map((it) => ({
            productId: it.productId,
            quantity: it.quantity,
            unitPrice: it.unitPrice,
          })),
          subtotalAmount: orderPayload.subtotalAmount,
          discountAmount: orderPayload.discountAmount || 0,
          shippingAmount: orderPayload.shippingAmount || 0,
          totalAmount: orderPayload.totalAmount,
          notes: orderPayload.notes,
        }),
      });

      const result = await response.json();
      return result;
    } catch (err: any) {
      console.error("Storefront public order error:", err);
      return { success: false, error: err.message || "Erro de conexão ao enviar pedido." };
    }
  }
}
