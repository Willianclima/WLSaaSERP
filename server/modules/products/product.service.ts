import { productRepo } from "./product.repository";
import { InventoryService } from "../inventory/inventory.service";
import { orgRepo } from "../../repositories";
import { TenantContext } from "../../db/tenantContext";
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

    // Persist media items in product_media table
    if (Array.isArray(dto.media) && dto.media.length > 0) {
      for (let i = 0; i < dto.media.length; i++) {
        const m = dto.media[i];
        if (m.url) {
          try {
            await productRepo.addMedia(orgId, created.id, {
              storageKey: m.storage_key || m.storageKey || `${orgId}/products/${created.id}/${Date.now()}_${i}.webp`,
              url: m.url,
              cdnUrl: m.cdnUrl || m.url,
              mediaType: m.type || m.mediaType || "IMAGE",
              mimeType: m.mime_type || m.mimeType || "image/webp",
              fileSizeBytes: m.file_size_bytes || m.fileSizeBytes || 0,
              isPrimary: m.is_primary !== undefined ? Boolean(m.is_primary) : (i === 0),
              sortOrder: m.sort_order !== undefined ? Number(m.sort_order) : i,
              title: m.title || created.name,
              altText: m.alt_text || m.altText || created.name,
            });
          } catch (mErr) {
            console.warn("Error adding initial media:", mErr);
          }
        }
      }
    } else if (dto.imageUrl) {
      try {
        await productRepo.addMedia(orgId, created.id, {
          storageKey: `${orgId}/products/${created.id}/main.webp`,
          url: dto.imageUrl,
          cdnUrl: dto.imageUrl,
          mediaType: "IMAGE",
          isPrimary: true,
          sortOrder: 0,
          title: created.name,
          altText: created.name,
        });
      } catch (mErr) {
        console.warn("Error adding default media:", mErr);
      }
    }

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

    // Retrieve fresh product entity with its media populated
    const rehydrated = await productRepo.findById(orgId, created.id);
    const productData = rehydrated || created;
    const stock = await InventoryService.getProductStock(orgId, created.id);

    return {
      ...productData,
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

    // Sync media if provided
    if (Array.isArray(dto.media)) {
      try {
        const existingMedia = await productRepo.listMediaByProduct(orgId, id);
        for (const em of existingMedia) {
          await productRepo.deleteMedia(orgId, id, em.id);
        }
        for (let i = 0; i < dto.media.length; i++) {
          const m = dto.media[i];
          if (m.url) {
            await productRepo.addMedia(orgId, id, {
              storageKey: m.storage_key || m.storageKey || `${orgId}/products/${id}/${Date.now()}_${i}.webp`,
              url: m.url,
              cdnUrl: m.cdnUrl || m.url,
              mediaType: m.type || m.mediaType || "IMAGE",
              mimeType: m.mime_type || m.mimeType || "image/webp",
              fileSizeBytes: m.file_size_bytes || m.fileSizeBytes || 0,
              isPrimary: m.is_primary !== undefined ? Boolean(m.is_primary) : (i === 0),
              sortOrder: m.sort_order !== undefined ? Number(m.sort_order) : i,
              title: m.title || updated.name,
              altText: m.alt_text || m.altText || updated.name,
            });
          }
        }
      } catch (syncErr) {
        console.warn("Error syncing media on updateProduct:", syncErr);
      }
    }

    const rehydrated = await productRepo.findById(orgId, id);
    const productData = rehydrated || updated;
    const stock = await InventoryService.getProductStock(orgId, updated.id);

    return {
      ...productData,
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

  /**
   * Lists products for the public storefront by store slug or organization ID.
   * Completely unauthenticated / public access for buyers.
   */
  static async listPublicProducts(storeSlugOrOrgId: string, filter?: ProductFilterQuery) {
    let org = await orgRepo.findById(storeSlugOrOrgId);
    if (!org) {
      org = await orgRepo.findBySlug(storeSlugOrOrgId);
    }
    if (!org) {
      const all = await orgRepo.listAll();
      org = all[0] || null;
    }
    if (!org) {
      throw new Error(`Loja / Catálogo "${storeSlugOrOrgId}" não encontrado.`);
    }

    const effectiveFilter: ProductFilterQuery = {
      ...filter,
      status: "ACTIVE",
    };

    const result = await TenantContext.run(
      { tenantId: org.id, isPublicStorefront: true },
      async () => await ProductService.listProducts(org!.id, effectiveFilter)
    );

    return {
      products: result.products,
      total: result.total,
      organization: {
        id: org.id,
        name: org.name,
        slug: org.slug,
        segment: org.segment,
        contactWhatsapp: org.contactWhatsapp,
        contactEmail: org.contactEmail,
        city: org.city,
        state: org.state,
        logoUrl: org.logoUrl,
      },
    };
  }
}
