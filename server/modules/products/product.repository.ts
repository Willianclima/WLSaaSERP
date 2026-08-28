import { dbStore } from "../../db/store";
import {
  ProductEntity,
  ProductFilterQuery,
} from "./product.types";

export interface IProductRepository {
  findById(orgId: string, id: string): Promise<ProductEntity | null>;
  findBySku(orgId: string, sku: string): Promise<ProductEntity | null>;
  listByOrg(orgId: string, filter?: ProductFilterQuery): Promise<ProductEntity[]>;
  create(product: ProductEntity): Promise<ProductEntity>;
  update(orgId: string, id: string, partial: Partial<ProductEntity>): Promise<ProductEntity>;
  delete(orgId: string, id: string): Promise<boolean>;
  countByOrg(orgId: string): Promise<number>;
}

export class ProductRepository implements IProductRepository {
  async findById(orgId: string, id: string): Promise<ProductEntity | null> {
    const product = dbStore.products.get(id);
    if (product && product.organizationId === orgId) {
      return product;
    }
    return null;
  }

  async findBySku(orgId: string, sku: string): Promise<ProductEntity | null> {
    const normalized = sku.trim().toUpperCase();
    for (const prod of dbStore.products.values()) {
      if (prod.organizationId === orgId && prod.sku.toUpperCase() === normalized) {
        return prod;
      }
    }
    return null;
  }

  async listByOrg(orgId: string, filter?: ProductFilterQuery): Promise<ProductEntity[]> {
    let list: ProductEntity[] = [];

    for (const prod of dbStore.products.values()) {
      if (prod.organizationId === orgId) {
        list.push(prod);
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
    return updated;
  }

  async delete(orgId: string, id: string): Promise<boolean> {
    const existing = await this.findById(orgId, id);
    if (!existing) return false;
    return dbStore.products.delete(id);
  }

  async countByOrg(orgId: string): Promise<number> {
    let count = 0;
    for (const prod of dbStore.products.values()) {
      if (prod.organizationId === orgId) count++;
    }
    return count;
  }
}

export const productRepo = new ProductRepository();
