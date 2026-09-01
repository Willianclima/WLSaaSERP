export type ProductCategory =
  | "COLARES"
  | "BRINCOS"
  | "ANEIS"
  | "PULSEIRAS"
  | "CONJUNTOS"
  | "PERSONALIZADOS";

export type ProductBath =
  | "OURO_18K"
  | "RODIO_BRANCO"
  | "RODIO_NEGRO"
  | "PRATA_925"
  | "ROSE_GOLD";

export type ProductStatus = "ATIVO" | "PAUSADO" | "ESGOTADO";

export interface ProductMediaEntity {
  id: string;
  organizationId: string;
  productId: string;
  storageKey: string;
  url: string;
  cdnUrl?: string;
  mediaType: "IMAGE" | "VIDEO";
  mimeType: string;
  fileSizeBytes: number;
  etag?: string;
  isPrimary: boolean;
  sortOrder: number;
  title?: string;
  altText?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AddProductMediaDTO {
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

export interface ProductEntity {
  id: string;
  organizationId: string;
  sku: string;
  name: string;
  category: ProductCategory;
  collection: string;
  material: string;
  bath: ProductBath;
  stones: string[];
  price: number;
  costPrice: number;
  promoPrice?: number;
  warrantyMonths: number;
  isCustomizable: boolean;
  imageUrl: string;
  galleryUrls?: string[];
  media?: ProductMediaEntity[];
  description: string;
  status: ProductStatus;
  createdAt: string;
  updatedAt: string;
}

export interface ProductWithStock extends ProductEntity {
  stockPhysical: number;
  stockConsigned: number;
  stockAvailable: number;
  totalStock: number;
}

export interface CreateProductDTO {
  sku: string;
  name: string;
  category: ProductCategory;
  collection?: string;
  material?: string;
  bath: ProductBath;
  stones?: string[];
  price: number;
  costPrice: number;
  promoPrice?: number;
  initialStock?: number;
  warrantyMonths?: number;
  isCustomizable?: boolean;
  imageUrl?: string;
  description?: string;
  status?: ProductStatus;
}

export interface UpdateProductDTO {
  sku?: string;
  name?: string;
  category?: ProductCategory;
  collection?: string;
  material?: string;
  bath?: ProductBath;
  stones?: string[];
  price?: number;
  costPrice?: number;
  promoPrice?: number;
  warrantyMonths?: number;
  isCustomizable?: boolean;
  imageUrl?: string;
  description?: string;
  status?: ProductStatus;
}

export interface ProductFilterQuery {
  category?: string;
  bath?: string;
  status?: string;
  search?: string;
  minPrice?: number;
  maxPrice?: number;
  limit?: number;
  offset?: number;
}
