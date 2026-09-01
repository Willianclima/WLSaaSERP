import { productRepo } from "./product.repository";
import { InventoryService } from "../inventory/inventory.service";
import {
  CreateProductDTO,
  UpdateProductDTO,
  ProductFilterQuery,
  ProductWithStock,
  ProductEntity,
} from "./product.types";

export class ProductService {
  /**
   * Creates a new SKU isolated by tenant and triggers initial ledger stock entry if provided.
   */
  static async createProduct(
    orgId: string,
    dto: CreateProductDTO,
    operatorName = "Gestor Matriz"
  ): Promise<ProductWithStock> {
    const skuNormalized = dto.sku.trim().toUpperCase();

    // 1. Check SKU Uniqueness within Organization
    const existingSku = await productRepo.findBySku(orgId, skuNormalized);
    if (existingSku) {
      throw new Error(`O SKU "${skuNormalized}" já está cadastrado para esta organização.`);
    }

    if (!dto.name || !dto.price) {
      throw new Error("Nome do produto e preço de venda são obrigatórios.");
    }

    const now = new Date().toISOString().replace("T", " ").substring(0, 16);
    const productId = `prod-${orgId}-${Date.now()}`;

    const entity: ProductEntity = {
      id: productId,
      organizationId: orgId,
      sku: skuNormalized,
      name: dto.name.trim(),
      category: dto.category,
      collection: dto.collection || "Linha Principal",
      material: dto.material || "Liga Nobre Hipoalergênica",
      bath: dto.bath,
      stones: dto.stones || ["Zircônia Cristal"],
      price: Number(dto.price),
      costPrice: Number(dto.costPrice || 0),
      promoPrice: dto.promoPrice ? Number(dto.promoPrice) : undefined,
      warrantyMonths: dto.warrantyMonths ?? 12,
      isCustomizable: Boolean(dto.isCustomizable),
      imageUrl:
        dto.imageUrl ||
        "https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?w=600&auto=format&fit=crop&q=80",
      description: dto.description || `Semijoia fina em banho ${dto.bath}.`,
      status: dto.status || "ATIVO",
      createdAt: now,
      updatedAt: now,
    };

    const created = await productRepo.create(entity);

    // 2. If Initial Stock > 0, record in Inventory Ledger
    const initialQty = Number(dto.initialStock) || 0;
    if (initialQty > 0) {
      await InventoryService.recordMovement(orgId, {
        productId: created.id,
        type: "PURCHASE",
        quantityChange: initialQty,
        referenceType: "INITIAL_STOCK",
        referenceId: "CADASTRO_INICIAL",
        operatorName,
        notes: `Estoque inicial de ${initialQty} un registrado no cadastro do SKU ${created.sku}.`,
      });
    }

    const stock = await InventoryService.getProductStock(orgId, created.id);

    return {
      ...created,
      stockPhysical: stock.stockPhysical,
      stockConsigned: stock.stockConsigned,
      stockAvailable: stock.stockAvailable,
      totalStock: stock.totalStock,
    };
  }

  /**
   * Lists products with real-time stock balances derived from the immutable ledger.
   */
  static async listProducts(
    orgId: string,
    filter?: ProductFilterQuery
  ): Promise<{ products: ProductWithStock[]; total: number }> {
    const products = await productRepo.listByOrg(orgId, filter);
    const stockMap = await InventoryService.getOrgStockSummaries(orgId);

    const productsWithStock: ProductWithStock[] = products.map((p) => {
      const stock = stockMap.get(p.id) || {
        stockPhysical: 0,
        stockConsigned: 0,
        stockAvailable: 0,
        totalStock: 0,
      };

      return {
        ...p,
        stockPhysical: stock.stockPhysical,
        stockConsigned: stock.stockConsigned,
        stockAvailable: stock.stockAvailable,
        totalStock: stock.totalStock,
      };
    });

    const total = await productRepo.countByOrg(orgId);

    return {
      products: productsWithStock,
      total,
    };
  }

  /**
   * Retrieves single product with current stock calculation.
   */
  static async getProductById(orgId: string, id: string): Promise<ProductWithStock> {
    const product = await productRepo.findById(orgId, id);
    if (!product) {
      throw new Error(`Produto ${id} não encontrado.`);
    }

    const stock = await InventoryService.getProductStock(orgId, product.id);

    return {
      ...product,
      stockPhysical: stock.stockPhysical,
      stockConsigned: stock.stockConsigned,
      stockAvailable: stock.stockAvailable,
      totalStock: stock.totalStock,
    };
  }

  /**
   * Updates product metadata.
   */
  static async updateProduct(
    orgId: string,
    id: string,
    dto: UpdateProductDTO
  ): Promise<ProductWithStock> {
    if (dto.sku) {
      const skuNormalized = dto.sku.trim().toUpperCase();
      const existing = await productRepo.findBySku(orgId, skuNormalized);
      if (existing && existing.id !== id) {
        throw new Error(`O SKU "${skuNormalized}" já está em uso por outro produto.`);
      }
      dto.sku = skuNormalized;
    }

    const updated = await productRepo.update(orgId, id, dto);
    const stock = await InventoryService.getProductStock(orgId, updated.id);

    return {
      ...updated,
      stockPhysical: stock.stockPhysical,
      stockConsigned: stock.stockConsigned,
      stockAvailable: stock.stockAvailable,
      totalStock: stock.totalStock,
    };
  }

  /**
   * Deletes a product.
   */
  static async deleteProduct(orgId: string, id: string): Promise<boolean> {
    return await productRepo.delete(orgId, id);
  }

  // --- Product Media Operations ---

  static async addProductMedia(
    orgId: string,
    productId: string,
    dto: {
      storageKey: string;
      url: string;
      cdnUrl?: string;
      mediaType?: "IMAGE" | "VIDEO";
      mimeType?: string;
      fileSizeBytes?: number;
      etag?: string;
      isPrimary?: boolean;
      sortOrder?: number;
      title?: string;
      altText?: string;
    }
  ) {
    const product = await productRepo.findById(orgId, productId);
    if (!product) {
      throw new Error(`Produto ${productId} não encontrado na organização.`);
    }

    return await productRepo.addMedia(orgId, productId, dto);
  }

  static async listProductMedia(orgId: string, productId: string) {
    return await productRepo.listMediaByProduct(orgId, productId);
  }

  static async deleteProductMedia(orgId: string, productId: string, mediaId: string) {
    return await productRepo.deleteMedia(orgId, productId, mediaId);
  }

  static async setPrimaryProductMedia(orgId: string, productId: string, mediaId: string) {
    return await productRepo.setPrimaryMedia(orgId, productId, mediaId);
  }

  static async reorderProductMedia(orgId: string, productId: string, orderedMediaIds: string[]) {
    return await productRepo.reorderMedia(orgId, productId, orderedMediaIds);
  }
}
