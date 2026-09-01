import { ProductItem, StoreBrandingConfig } from "../types";

export interface StockAvailabilityResult {
  productId: string;
  sku: string;
  onHandQuantity: number; // Físico Matriz + Depósito
  reservedQuantity: number; // Reservado em pedidos em processamento
  availableQuantity: number; // on_hand - reserved (Disponível real para compra)
  consignedQuantity: number; // Em maletas com revendedoras
  status: "IN_STOCK" | "LOW_STOCK" | "OUT_OF_STOCK";
  statusBadgeText: string;
  badgeVariant: "success" | "warning" | "danger" | "neutral";
  allowDirectPurchase: boolean;
  isPurchasable: boolean;
  actionType: "BUY_NOW" | "SOB_CONSULTA" | "ESGOTADO";
  actionLabel: string;
  whatsappInquiryMessage: string;
}

export class ClientInventoryService {
  private static instance: ClientInventoryService;

  private constructor() {}

  public static getInstance(): ClientInventoryService {
    if (!ClientInventoryService.instance) {
      ClientInventoryService.instance = new ClientInventoryService();
    }
    return ClientInventoryService.instance;
  }

  /**
   * Computes the single source of truth for public catalog availability:
   * PUBLIC CATALOG -> InventoryService -> available_quantity (on_hand - reserved)
   * 
   * Rule:
   * - If on_hand = 1 and reserved = 1 => available_quantity = 0 => OUT_OF_STOCK
   * - Never rely on simple products.stock or ignore active reservations!
   */
  public evaluateProductAvailability(
    product: ProductItem,
    branding?: Partial<StoreBrandingConfig>
  ): StockAvailabilityResult {
    // 1. Double-Ledger Derivation
    const onHand = product.stockPhysical ?? 0;
    const reserved = product.stockReserved ?? 0;
    const consigned = product.stockConsigned ?? 0;
    
    // Explicit formula: available = MAX(0, on_hand - reserved)
    const available = Math.max(0, onHand - reserved);

    const outOfStockPolicy = branding?.outOfStockBehavior || "SOB_CONSULTA";
    const lowStockThreshold = branding?.lowStockThreshold ?? 3;
    const customOutText = branding?.outOfStockCustomText;

    // 2. Determine State
    if (available <= 0) {
      const isSobConsulta = outOfStockPolicy === "SOB_CONSULTA";
      const badgeText = isSobConsulta ? "Sob consulta" : "Esgotado";
      const actionLabel = customOutText 
        ? customOutText 
        : isSobConsulta 
          ? "Encomendar / Consultar" 
          : "Produto Esgotado";

      return {
        productId: product.id,
        sku: product.sku,
        onHandQuantity: onHand,
        reservedQuantity: reserved,
        availableQuantity: 0,
        consignedQuantity: consigned,
        status: "OUT_OF_STOCK",
        statusBadgeText: badgeText,
        badgeVariant: isSobConsulta ? "warning" : "danger",
        allowDirectPurchase: false,
        isPurchasable: false,
        actionType: isSobConsulta ? "SOB_CONSULTA" : "ESGOTADO",
        actionLabel,
        whatsappInquiryMessage: `Olá! Vi o produto *${product.name}* (Ref: ${product.sku}) no catálogo e gostaria de consultar a disponibilidade ou encomendar.`,
      };
    }

    if (available <= lowStockThreshold) {
      return {
        productId: product.id,
        sku: product.sku,
        onHandQuantity: onHand,
        reservedQuantity: reserved,
        availableQuantity: available,
        consignedQuantity: consigned,
        status: "LOW_STOCK",
        statusBadgeText: `Últimas ${available} un`,
        badgeVariant: "warning",
        allowDirectPurchase: true,
        isPurchasable: true,
        actionType: "BUY_NOW",
        actionLabel: "Comprar Agora",
        whatsappInquiryMessage: `Olá! Tenho interesse na peça *${product.name}* (${product.sku}).`,
      };
    }

    return {
      productId: product.id,
      sku: product.sku,
      onHandQuantity: onHand,
      reservedQuantity: reserved,
      availableQuantity: available,
      consignedQuantity: consigned,
      status: "IN_STOCK",
      statusBadgeText: "Disponível",
      badgeVariant: "success",
      allowDirectPurchase: true,
      isPurchasable: true,
      actionType: "BUY_NOW",
      actionLabel: "Comprar Agora",
      whatsappInquiryMessage: `Olá! Gostaria de comprar a peça *${product.name}* (${product.sku}).`,
    };
  }

  /**
   * Batch fetches live stock balances from the backend `/api/inventory/balances`
   */
  public async fetchLiveBalances(orgId = "org-lumina-01"): Promise<Map<string, { onHand: number; reserved: number; available: number }>> {
    const map = new Map<string, { onHand: number; reserved: number; available: number }>();
    try {
      const res = await fetch(`/api/inventory/balances?organizationId=${orgId}`);
      if (res.ok) {
        const json = await res.json();
        if (json.data && Array.isArray(json.data)) {
          for (const item of json.data) {
            map.set(item.productId, {
              onHand: item.onHandQuantity || 0,
              reserved: item.reservedQuantity || 0,
              available: item.availableQuantity ?? Math.max(0, (item.onHandQuantity || 0) - (item.reservedQuantity || 0)),
            });
          }
        }
      }
    } catch (e) {
      console.warn("Could not fetch live inventory balances, using local state:", e);
    }
    return map;
  }
}

export const clientInventoryService = ClientInventoryService.getInstance();
