import { query, withTransaction } from "../../db/postgres";
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

function mapRowToProduct(row: any, media: ProductMediaEntity[] = []): ProductEntity {
  const stones = Array.isArray(row.stones)
    ? row.stones
    : typeof row.stones === "string"
    ? JSON.parse(row.stones)
    : [];

  const galleryUrls = media.length > 0 ? media.map((m) => m.url) : [row.image_url];

  return {
    id: row.id,
    organizationId: row.organization_id,
    sku: row.sku,
    name: row.name,
    category: row.category,
    collection: row.collection || "Linha Principal",
    material: row.material || "Liga Nobre Hipoalergênica",
    bath: row.bath,
    stones,
    price: parseFloat(row.price),
    costPrice: parseFloat(row.cost_price),
    promoPrice: row.promo_price ? parseFloat(row.promo_price) : undefined,
    warrantyMonths: parseInt(row.warranty_months, 10) || 12,
    isCustomizable: Boolean(row.is_customizable),
    imageUrl: row.image_url,
    galleryUrls,
    media,
    description: row.description || "",
    status: row.status,
    createdAt: row.created_at instanceof Date ? row.created_at.toISOString() : String(row.created_at),
    updatedAt: row.updated_at instanceof Date ? row.updated_at.toISOString() : String(row.updated_at),
  };
}

function mapRowToMedia(row: any): ProductMediaEntity {
  return {
    id: row.id,
    organizationId: row.organization_id,
    productId: row.product_id,
    storageKey: row.storage_key,
    url: row.url,
    cdnUrl: row.cdn_url || row.url,
    mediaType: row.media_type,
    mimeType: row.mime_type,
    fileSizeBytes: parseInt(row.file_size_bytes, 10) || 0,
    etag: row.etag || undefined,
    isPrimary: Boolean(row.is_primary),
    sortOrder: parseInt(row.sort_order, 10) || 0,
    title: row.title || undefined,
    altText: row.alt_text || undefined,
    createdAt: row.created_at instanceof Date ? row.created_at.toISOString() : String(row.created_at),
    updatedAt: row.updated_at instanceof Date ? row.updated_at.toISOString() : String(row.updated_at),
  };
}

export class ProductRepository implements IProductRepository {
  async findById(orgId: string, id: string): Promise<ProductEntity | null> {
    const prodRes = await query(
      "SELECT * FROM products WHERE organization_id = $1 AND id = $2",
      [orgId, id]
    );
    if (prodRes.rows.length === 0) return null;

    const mediaRes = await query(
      "SELECT * FROM product_media WHERE organization_id = $1 AND product_id = $2 ORDER BY sort_order ASC",
      [orgId, id]
    );
    const media = mediaRes.rows.map(mapRowToMedia);
    return mapRowToProduct(prodRes.rows[0], media);
  }

  async findBySku(orgId: string, sku: string): Promise<ProductEntity | null> {
    const normalized = sku.trim().toUpperCase();
    const prodRes = await query(
      "SELECT * FROM products WHERE organization_id = $1 AND UPPER(sku) = $2",
      [orgId, normalized]
    );
    if (prodRes.rows.length === 0) return null;

    const row = prodRes.rows[0];
    const mediaRes = await query(
      "SELECT * FROM product_media WHERE organization_id = $1 AND product_id = $2 ORDER BY sort_order ASC",
      [orgId, row.id]
    );
    const media = mediaRes.rows.map(mapRowToMedia);
    return mapRowToProduct(row, media);
  }

  async listByOrg(orgId: string, filter?: ProductFilterQuery): Promise<ProductEntity[]> {
    let sql = "SELECT * FROM products WHERE organization_id = $1";
    const params: any[] = [orgId];
    let idx = 2;

    if (filter) {
      if (filter.category && filter.category !== "TODOS") {
        sql += ` AND category = $${idx++}`;
        params.push(filter.category);
      }
      if (filter.bath && filter.bath !== "TODOS") {
        sql += ` AND bath = $${idx++}`;
        params.push(filter.bath);
      }
      if (filter.status && filter.status !== "TODOS") {
        if (filter.status.toUpperCase() === "ACTIVE" || filter.status.toUpperCase() === "ATIVO") {
          sql += ` AND status IN ('ATIVO', 'ACTIVE')`;
        } else if (filter.status.toUpperCase() === "INACTIVE" || filter.status.toUpperCase() === "INATIVO") {
          sql += ` AND status IN ('INATIVO', 'INACTIVE')`;
        } else {
          sql += ` AND status = $${idx++}`;
          params.push(filter.status);
        }
      }
      if (filter.search) {
        const q = `%${filter.search.toLowerCase()}%`;
        sql += ` AND (LOWER(name) LIKE $${idx} OR LOWER(sku) LIKE $${idx} OR LOWER(collection) LIKE $${idx} OR LOWER(material) LIKE $${idx})`;
        params.push(q);
        idx++;
      }
      if (filter.minPrice !== undefined) {
        sql += ` AND price >= $${idx++}`;
        params.push(filter.minPrice);
      }
      if (filter.maxPrice !== undefined) {
        sql += ` AND price <= $${idx++}`;
        params.push(filter.maxPrice);
      }
    }

    sql += " ORDER BY updated_at DESC";

    if (filter?.limit !== undefined) {
      sql += ` LIMIT $${idx++}`;
      params.push(filter.limit);
      if (filter?.offset !== undefined) {
        sql += ` OFFSET $${idx++}`;
        params.push(filter.offset);
      }
    }

    const prodRes = await query(sql, params);
    if (prodRes.rows.length === 0) return [];

    // Fetch all media for these products in batch
    const productIds = prodRes.rows.map((r) => r.id);
    const mediaRes = await query(
      "SELECT * FROM product_media WHERE organization_id = $1 AND product_id = ANY($2) ORDER BY sort_order ASC",
      [orgId, productIds]
    );

    const mediaMap = new Map<string, ProductMediaEntity[]>();
    for (const mRow of mediaRes.rows) {
      const mediaItem = mapRowToMedia(mRow);
      if (!mediaMap.has(mediaItem.productId)) {
        mediaMap.set(mediaItem.productId, []);
      }
      mediaMap.get(mediaItem.productId)!.push(mediaItem);
    }

    return prodRes.rows.map((row) => mapRowToProduct(row, mediaMap.get(row.id) || []));
  }

  async create(product: ProductEntity): Promise<ProductEntity> {
    const res = await query(
      `INSERT INTO products (
        id, organization_id, sku, name, category, collection, material, bath,
        stones, price, cost_price, promo_price, warranty_months, is_customizable,
        image_url, description, status, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, NOW(), NOW())
      RETURNING *`,
      [
        product.id,
        product.organizationId,
        product.sku,
        product.name,
        product.category,
        product.collection,
        product.material,
        product.bath,
        JSON.stringify(product.stones || []),
        product.price,
        product.costPrice,
        product.promoPrice || null,
        product.warrantyMonths,
        product.isCustomizable,
        product.imageUrl,
        product.description,
        product.status,
      ]
    );

    return mapRowToProduct(res.rows[0], []);
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

    const setClauses: string[] = ["updated_at = NOW()"];
    const params: any[] = [orgId, id];
    let idx = 3;

    if (partial.sku !== undefined) {
      setClauses.push(`sku = $${idx++}`);
      params.push(partial.sku);
    }
    if (partial.name !== undefined) {
      setClauses.push(`name = $${idx++}`);
      params.push(partial.name);
    }
    if (partial.category !== undefined) {
      setClauses.push(`category = $${idx++}`);
      params.push(partial.category);
    }
    if (partial.collection !== undefined) {
      setClauses.push(`collection = $${idx++}`);
      params.push(partial.collection);
    }
    if (partial.material !== undefined) {
      setClauses.push(`material = $${idx++}`);
      params.push(partial.material);
    }
    if (partial.bath !== undefined) {
      setClauses.push(`bath = $${idx++}`);
      params.push(partial.bath);
    }
    if (partial.stones !== undefined) {
      setClauses.push(`stones = $${idx++}`);
      params.push(JSON.stringify(partial.stones));
    }
    if (partial.price !== undefined) {
      setClauses.push(`price = $${idx++}`);
      params.push(partial.price);
    }
    if (partial.costPrice !== undefined) {
      setClauses.push(`cost_price = $${idx++}`);
      params.push(partial.costPrice);
    }
    if (partial.promoPrice !== undefined) {
      setClauses.push(`promo_price = $${idx++}`);
      params.push(partial.promoPrice);
    }
    if (partial.warrantyMonths !== undefined) {
      setClauses.push(`warranty_months = $${idx++}`);
      params.push(partial.warrantyMonths);
    }
    if (partial.isCustomizable !== undefined) {
      setClauses.push(`is_customizable = $${idx++}`);
      params.push(partial.isCustomizable);
    }
    if (partial.imageUrl !== undefined) {
      setClauses.push(`image_url = $${idx++}`);
      params.push(partial.imageUrl);
    }
    if (partial.description !== undefined) {
      setClauses.push(`description = $${idx++}`);
      params.push(partial.description);
    }
    if (partial.status !== undefined) {
      setClauses.push(`status = $${idx++}`);
      params.push(partial.status);
    }

    const sql = `UPDATE products SET ${setClauses.join(", ")} WHERE organization_id = $1 AND id = $2 RETURNING *`;
    const res = await query(sql, params);

    const mediaList = await this.listMediaByProduct(orgId, id);
    return mapRowToProduct(res.rows[0], mediaList);
  }

  async delete(orgId: string, id: string): Promise<boolean> {
    const res = await query(
      "DELETE FROM products WHERE organization_id = $1 AND id = $2",
      [orgId, id]
    );
    return (res.rowCount || 0) > 0;
  }

  async countByOrg(orgId: string): Promise<number> {
    const res = await query(
      "SELECT count(*) as count FROM products WHERE organization_id = $1",
      [orgId]
    );
    return parseInt(res.rows[0]?.count || "0", 10);
  }

  // --- Product Media Implementation ---

  async addMedia(orgId: string, productId: string, dto: AddProductMediaDTO): Promise<ProductMediaEntity> {
    const existingMedia = await this.listMediaByProduct(orgId, productId);
    const isFirst = existingMedia.length === 0;
    const isPrimary = dto.isPrimary !== undefined ? dto.isPrimary : isFirst;
    const sortOrder = dto.sortOrder !== undefined ? dto.sortOrder : existingMedia.length;

    return await withTransaction(async (client) => {
      if (isPrimary) {
        await client.query(
          "UPDATE product_media SET is_primary = FALSE, updated_at = NOW() WHERE organization_id = $1 AND product_id = $2",
          [orgId, productId]
        );
      }

      const mediaId = `media-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
      const res = await client.query(
        `INSERT INTO product_media (
          id, organization_id, product_id, storage_key, url, cdn_url,
          media_type, mime_type, file_size_bytes, etag, is_primary,
          sort_order, title, alt_text, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, NOW(), NOW())
        RETURNING *`,
        [
          mediaId,
          orgId,
          productId,
          dto.storageKey,
          dto.url,
          dto.cdnUrl || dto.url,
          dto.mediaType || "IMAGE",
          dto.mimeType || "image/webp",
          dto.fileSizeBytes || 0,
          dto.etag || null,
          isPrimary,
          sortOrder,
          dto.title || null,
          dto.altText || null,
        ]
      );

      if (isPrimary) {
        await client.query(
          "UPDATE products SET image_url = $1, updated_at = NOW() WHERE organization_id = $2 AND id = $3",
          [dto.url, orgId, productId]
        );
      }

      return mapRowToMedia(res.rows[0]);
    });
  }

  async listMediaByProduct(orgId: string, productId: string): Promise<ProductMediaEntity[]> {
    const res = await query(
      "SELECT * FROM product_media WHERE organization_id = $1 AND product_id = $2 ORDER BY sort_order ASC",
      [orgId, productId]
    );
    return res.rows.map(mapRowToMedia);
  }

  async findMediaById(orgId: string, mediaId: string): Promise<ProductMediaEntity | null> {
    const res = await query(
      "SELECT * FROM product_media WHERE organization_id = $1 AND id = $2",
      [orgId, mediaId]
    );
    if (res.rows.length === 0) return null;
    return mapRowToMedia(res.rows[0]);
  }

  async deleteMedia(orgId: string, productId: string, mediaId: string): Promise<boolean> {
    const target = await this.findMediaById(orgId, mediaId);
    if (!target) return false;

    await withTransaction(async (client) => {
      await client.query(
        "DELETE FROM product_media WHERE organization_id = $1 AND id = $2",
        [orgId, mediaId]
      );

      if (target.isPrimary) {
        const remaining = await client.query(
          "SELECT * FROM product_media WHERE organization_id = $1 AND product_id = $2 ORDER BY sort_order ASC LIMIT 1",
          [orgId, productId]
        );
        if (remaining.rows.length > 0) {
          const nextPrimary = remaining.rows[0];
          await client.query(
            "UPDATE product_media SET is_primary = TRUE, updated_at = NOW() WHERE id = $1",
            [nextPrimary.id]
          );
          await client.query(
            "UPDATE products SET image_url = $1, updated_at = NOW() WHERE organization_id = $2 AND id = $3",
            [nextPrimary.url, orgId, productId]
          );
        }
      }
    });

    return true;
  }

  async setPrimaryMedia(orgId: string, productId: string, mediaId: string): Promise<ProductMediaEntity> {
    return await withTransaction(async (client) => {
      await client.query(
        "UPDATE product_media SET is_primary = FALSE, updated_at = NOW() WHERE organization_id = $1 AND product_id = $2",
        [orgId, productId]
      );

      const res = await client.query(
        "UPDATE product_media SET is_primary = TRUE, updated_at = NOW() WHERE organization_id = $1 AND id = $2 RETURNING *",
        [orgId, mediaId]
      );

      if (res.rows.length === 0) {
        throw new Error(`Mídia ${mediaId} não encontrada.`);
      }

      const media = mapRowToMedia(res.rows[0]);
      await client.query(
        "UPDATE products SET image_url = $1, updated_at = NOW() WHERE organization_id = $2 AND id = $3",
        [media.url, orgId, productId]
      );

      return media;
    });
  }

  async reorderMedia(orgId: string, productId: string, orderedMediaIds: string[]): Promise<ProductMediaEntity[]> {
    return await withTransaction(async (client) => {
      for (let i = 0; i < orderedMediaIds.length; i++) {
        await client.query(
          "UPDATE product_media SET sort_order = $1, updated_at = NOW() WHERE organization_id = $2 AND product_id = $3 AND id = $4",
          [i, orgId, productId, orderedMediaIds[i]]
        );
      }

      const res = await client.query(
        "SELECT * FROM product_media WHERE organization_id = $1 AND product_id = $2 ORDER BY sort_order ASC",
        [orgId, productId]
      );
      return res.rows.map(mapRowToMedia);
    });
  }
}

export const productRepo = new ProductRepository();
