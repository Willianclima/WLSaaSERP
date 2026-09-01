import { dbStore } from "../../db/store";
import {
  ProductEntity,
  ProductFilterQuery,
  ProductMediaEntity,
  AddProductMediaDTO,
} from "./product.types";

export interface IProductRepository {
  findById(orgId: string, id: string): Promise<ProductEntity | null>;
  findBySku(orgId: string, sku: string): Promise<ProductEntity | null>;
  listByOrg(orgId: string, filter?: ProductFilterQuery): Promise<ProductEntity[]>;
  create(product: ProductEntity): Promise<ProductEntity>;
  update(orgId: string, id: string, partial: Partial<ProductEntity>): Promise<ProductEntity>;
  delete(orgId: string, id: string): Promise<boolean>;
  countByOrg(orgId: string): Promise<number>;

  // Product Media
  addMedia(orgId: string, productId: string, dto: AddProductMediaDTO): Promise<ProductMediaEntity>;
  listMediaByProduct(orgId: string, productId: string): Promise<ProductMediaEntity[]>;
  findMediaById(orgId: string, mediaId: string): Promise<ProductMediaEntity | null>;
  deleteMedia(orgId: string, productId: string, mediaId: string): Promise<boolean>;
  setPrimaryMedia(orgId: string, productId: string, mediaId: string): Promise<ProductMediaEntity>;
  reorderMedia(orgId: string, productId: string, orderedMediaIds: string[]): Promise<ProductMediaEntity[]>;
}

export class ProductRepository implements IProductRepository {
  private attachMedia(orgId: string, product: ProductEntity): ProductEntity {
    const mediaList: ProductMediaEntity[] = [];
    for (const m of dbStore.productMedia.values()) {
      if (m.organizationId === orgId && m.productId === product.id) {
        mediaList.push(m);
      }
    }
    mediaList.sort((a, b) => a.sortOrder - b.sortOrder);
    return {
      ...product,
      media: mediaList,
      galleryUrls: mediaList.length > 0 ? mediaList.map((m) => m.url) : product.galleryUrls,
    };
  }

  async findById(orgId: string, id: string): Promise<ProductEntity | null> {
    const product = dbStore.products.get(id);
    if (product && product.organizationId === orgId) {
      return this.attachMedia(orgId, product);
    }
    return null;
  }

  async findBySku(orgId: string, sku: string): Promise<ProductEntity | null> {
    const normalized = sku.trim().toUpperCase();
    for (const prod of dbStore.products.values()) {
      if (prod.organizationId === orgId && prod.sku.toUpperCase() === normalized) {
        return this.attachMedia(orgId, prod);
      }
    }
    return null;
  }

  async listByOrg(orgId: string, filter?: ProductFilterQuery): Promise<ProductEntity[]> {
    let list: ProductEntity[] = [];

    for (const prod of dbStore.products.values()) {
      if (prod.organizationId === orgId) {
        list.push(this.attachMedia(orgId, prod));
      }
    }

    if (filter) {
      if (filter.category && filter.category !== "TODOS") {
        list = list.filter((p) => p.category === filter.category);
      }
      if (filter.bath && filter.bath !== "TODOS") {
        list = list.filter((p) => p.bath === filter.bath);
      }
      if (filter.status && filter.status !== "TODOS") {
        list = list.filter((p) => p.status === filter.status);
      }
      if (filter.search) {
        const q = filter.search.toLowerCase();
        list = list.filter(
          (p) =>
            p.name.toLowerCase().includes(q) ||
            p.sku.toLowerCase().includes(q) ||
            p.collection.toLowerCase().includes(q) ||
            p.material.toLowerCase().includes(q)
        );
      }
      if (filter.minPrice !== undefined) {
        list = list.filter((p) => p.price >= (filter.minPrice || 0));
      }
      if (filter.maxPrice !== undefined) {
        list = list.filter((p) => p.price <= (filter.maxPrice || Infinity));
      }
    }

    // Sort by updatedAt desc
    list.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

    if (filter?.offset !== undefined || filter?.limit !== undefined) {
      const offset = filter.offset || 0;
      const limit = filter.limit || 50;
      return list.slice(offset, offset + limit);
    }

    return list;
  }

  async create(product: ProductEntity): Promise<ProductEntity> {
    dbStore.products.set(product.id, product);
    return product;
  }

  async update(
    orgId: string,
    id: string,
    partial: Partial<ProductEntity>
  ): Promise<ProductEntity> {
    const existing = await this.findById(orgId, id);
    if (!existing) {
      throw new Error(`Produto ${id} não encontrado na organização.`);
    }

    const updated: ProductEntity = {
      ...existing,
      ...partial,
      updatedAt: new Date().toISOString().replace("T", " ").substring(0, 16),
    };

    dbStore.products.set(id, updated);
    return this.attachMedia(orgId, updated);
  }

  async delete(orgId: string, id: string): Promise<boolean> {
    const existing = await this.findById(orgId, id);
    if (!existing) return false;

    // Delete associated media records from database
    for (const [mId, m] of dbStore.productMedia.entries()) {
      if (m.organizationId === orgId && m.productId === id) {
        dbStore.productMedia.delete(mId);
      }
    }

    return dbStore.products.delete(id);
  }

  async countByOrg(orgId: string): Promise<number> {
    let count = 0;
    for (const prod of dbStore.products.values()) {
      if (prod.organizationId === orgId) count++;
    }
    return count;
  }

  // --- Product Media Implementation ---

  async addMedia(orgId: string, productId: string, dto: AddProductMediaDTO): Promise<ProductMediaEntity> {
    const existingMedia = await this.listMediaByProduct(orgId, productId);
    const isFirst = existingMedia.length === 0;
    const isPrimary = dto.isPrimary !== undefined ? dto.isPrimary : isFirst;
    const sortOrder = dto.sortOrder !== undefined ? dto.sortOrder : existingMedia.length;

    // If marked as primary, demote other primary media for this product
    if (isPrimary) {
      for (const m of existingMedia) {
        if (m.isPrimary) {
          m.isPrimary = false;
          m.updatedAt = new Date().toISOString();
          dbStore.productMedia.set(m.id, m);
        }
      }
    }

    const mediaId = `media-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const newMedia: ProductMediaEntity = {
      id: mediaId,
      organizationId: orgId,
      productId,
      storageKey: dto.storageKey,
      url: dto.url,
      cdnUrl: dto.cdnUrl || dto.url,
      mediaType: dto.mediaType || "IMAGE",
      mimeType: dto.mimeType || "image/webp",
      fileSizeBytes: dto.fileSizeBytes || 0,
      etag: dto.etag,
      isPrimary,
      sortOrder,
      title: dto.title,
      altText: dto.altText,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    dbStore.productMedia.set(mediaId, newMedia);

    // If primary, also update product's main imageUrl in catalog
    if (isPrimary) {
      const prod = dbStore.products.get(productId);
      if (prod && prod.organizationId === orgId) {
        prod.imageUrl = dto.url;
        prod.updatedAt = new Date().toISOString();
        dbStore.products.set(productId, prod);
      }
    }

    return newMedia;
  }

  async listMediaByProduct(orgId: string, productId: string): Promise<ProductMediaEntity[]> {
    const list: ProductMediaEntity[] = [];
    for (const m of dbStore.productMedia.values()) {
      if (m.organizationId === orgId && m.productId === productId) {
        list.push(m);
      }
    }
    return list.sort((a, b) => a.sortOrder - b.sortOrder);
  }

  async findMediaById(orgId: string, mediaId: string): Promise<ProductMediaEntity | null> {
    const m = dbStore.productMedia.get(mediaId);
    if (m && m.organizationId === orgId) return m;
    return null;
  }

  async deleteMedia(orgId: string, productId: string, mediaId: string): Promise<boolean> {
    const m = await this.findMediaById(orgId, mediaId);
    if (!m || m.productId !== productId) return false;

    dbStore.productMedia.delete(mediaId);

    // If deleted media was primary, promote next available media to primary
    if (m.isPrimary) {
      const remaining = await this.listMediaByProduct(orgId, productId);
      if (remaining.length > 0) {
        remaining[0].isPrimary = true;
        remaining[0].updatedAt = new Date().toISOString();
        dbStore.productMedia.set(remaining[0].id, remaining[0]);

        const prod = dbStore.products.get(productId);
        if (prod && prod.organizationId === orgId) {
          prod.imageUrl = remaining[0].url;
          prod.updatedAt = new Date().toISOString();
          dbStore.products.set(productId, prod);
        }
      }
    }

    return true;
  }

  async setPrimaryMedia(orgId: string, productId: string, mediaId: string): Promise<ProductMediaEntity> {
    const media = await this.listMediaByProduct(orgId, productId);
    const target = media.find((m) => m.id === mediaId);
    if (!target) {
      throw new Error("Mídia não encontrada para este produto.");
    }

    for (const m of media) {
      m.isPrimary = m.id === mediaId;
      m.updatedAt = new Date().toISOString();
      dbStore.productMedia.set(m.id, m);
    }

    // Update product's main image URL
    const prod = dbStore.products.get(productId);
    if (prod && prod.organizationId === orgId) {
      prod.imageUrl = target.url;
      prod.updatedAt = new Date().toISOString();
      dbStore.products.set(productId, prod);
    }

    return target;
  }

  async reorderMedia(orgId: string, productId: string, orderedMediaIds: string[]): Promise<ProductMediaEntity[]> {
    const media = await this.listMediaByProduct(orgId, productId);
    const updatedList: ProductMediaEntity[] = [];

    orderedMediaIds.forEach((id, index) => {
      const item = media.find((m) => m.id === id);
      if (item) {
        item.sortOrder = index;
        item.updatedAt = new Date().toISOString();
        dbStore.productMedia.set(item.id, item);
        updatedList.push(item);
      }
    });

    return updatedList.sort((a, b) => a.sortOrder - b.sortOrder);
  }
}

export const productRepo = new ProductRepository();

