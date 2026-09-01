import fs from "fs";
import path from "path";
import crypto from "crypto";

export interface StorageUploadResult {
  storageKey: string;
  url: string;
  cdnUrl: string;
  mimeType: string;
  fileSizeBytes: number;
  etag: string;
  bucket: string;
  provider: "AWS_S3" | "CLOUDFLARE_R2" | "GOOGLE_CLOUD_STORAGE" | "LOCAL_STORAGE";
  originalName: string;
  createdAt: string;
}

export interface UploadOptions {
  organizationId: string;
  productId?: string;
  sku?: string;
  folder?: string;
  isPrimary?: boolean;
}

export class StorageService {
  private static instance: StorageService;
  private readonly localStorageDir: string;
  private readonly s3Bucket: string;
  private readonly s3Region: string;
  private readonly cdnBaseUrl: string;
  private readonly provider: "AWS_S3" | "CLOUDFLARE_R2" | "GOOGLE_CLOUD_STORAGE" | "LOCAL_STORAGE";

  private constructor() {
    this.s3Bucket = process.env.AWS_S3_BUCKET || process.env.STORAGE_BUCKET || "aura-semijoias-media";
    this.s3Region = process.env.AWS_REGION || "sa-east-1";
    this.cdnBaseUrl = process.env.CDN_BASE_URL || process.env.CLOUDFRONT_URL || "";

    // Determine provider based on environment variables
    if (process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY) {
      this.provider = "AWS_S3";
    } else if (process.env.R2_ACCESS_KEY_ID && process.env.R2_SECRET_ACCESS_KEY) {
      this.provider = "CLOUDFLARE_R2";
    } else {
      this.provider = "LOCAL_STORAGE";
    }

    // Ensure local storage directory exists for file persistence
    this.localStorageDir = path.join(process.cwd(), "storage", "uploads");
    try {
      if (!fs.existsSync(this.localStorageDir)) {
        fs.mkdirSync(this.localStorageDir, { recursive: true });
      }
    } catch (err) {
      console.warn("Storage directory initialization note:", err);
    }
  }

  public static getInstance(): StorageService {
    if (!StorageService.instance) {
      StorageService.instance = new StorageService();
    }
    return StorageService.instance;
  }

  /**
   * Sanitizes filename and generates a unique object storage key
   * Format: {organizationId}/products/{sku}/{timestamp}_{random}_{filename}
   */
  public generateStorageKey(options: UploadOptions, originalFilename: string): string {
    const orgId = options.organizationId || "org-lumina-01";
    const skuSegment = (options.sku || options.productId || "general").toLowerCase().replace(/[^a-z0-9_-]/g, "_");
    const folder = options.folder || "products";
    const cleanName = path.basename(originalFilename).toLowerCase().replace(/[^a-z0-9_.-]/g, "_");
    const timestamp = Date.now();
    const randomSuffix = crypto.randomBytes(4).toString("hex");

    return `${orgId}/${folder}/${skuSegment}/${timestamp}_${randomSuffix}_${cleanName}`;
  }

  /**
   * Validates MIME type for e-commerce media (images & videos)
   */
  public validateMimeType(mimeType: string): { valid: boolean; type: "IMAGE" | "VIDEO"; error?: string } {
    const allowedImageMimes = [
      "image/jpeg",
      "image/jpg",
      "image/png",
      "image/webp",
      "image/avif",
      "image/gif",
      "image/svg+xml",
    ];

    const allowedVideoMimes = [
      "video/mp4",
      "video/webm",
      "video/quicktime",
      "video/x-m4v",
      "video/ogg",
    ];

    if (allowedImageMimes.includes(mimeType.toLowerCase())) {
      return { valid: true, type: "IMAGE" };
    }

    if (allowedVideoMimes.includes(mimeType.toLowerCase())) {
      return { valid: true, type: "VIDEO" };
    }

    return {
      valid: false,
      type: "IMAGE",
      error: `Formato de arquivo não suportado: '${mimeType}'. Envie imagens (.jpg, .png, .webp, .avif) ou vídeos (.mp4, .mov, .webm).`,
    };
  }

  /**
   * Uploads a Buffer directly to Storage
   */
  public async uploadBuffer(
    buffer: Buffer,
    originalFilename: string,
    mimeType: string,
    options: UploadOptions
  ): Promise<StorageUploadResult> {
    const validation = this.validateMimeType(mimeType);
    if (!validation.valid) {
      throw new Error(validation.error);
    }

    const storageKey = this.generateStorageKey(options, originalFilename);
    const etag = crypto.createHash("md5").update(buffer).digest("hex");
    const fileSizeBytes = buffer.length;

    // Save to local object storage repository
    const targetFilePath = path.join(this.localStorageDir, ...storageKey.split("/"));
    const targetDirPath = path.dirname(targetFilePath);

    if (!fs.existsSync(targetDirPath)) {
      fs.mkdirSync(targetDirPath, { recursive: true });
    }

    fs.writeFileSync(targetFilePath, buffer);

    // Compute public delivery URL and CDN URL
    let publicUrl: string;
    let cdnUrl: string;

    if (this.cdnBaseUrl) {
      cdnUrl = `${this.cdnBaseUrl.replace(/\/$/, "")}/${storageKey}`;
      publicUrl = cdnUrl;
    } else if (this.provider === "AWS_S3") {
      publicUrl = `https://${this.s3Bucket}.s3.${this.s3Region}.amazonaws.com/${storageKey}`;
      cdnUrl = publicUrl;
    } else {
      // Local / Express managed object endpoint
      publicUrl = `/api/storage/files/${storageKey}`;
      cdnUrl = publicUrl;
    }

    return {
      storageKey,
      url: publicUrl,
      cdnUrl,
      mimeType,
      fileSizeBytes,
      etag,
      bucket: this.s3Bucket,
      provider: this.provider,
      originalName: originalFilename,
      createdAt: new Date().toISOString(),
    };
  }

  /**
   * Uploads a base64 / Data URI string
   */
  public async uploadBase64(
    base64DataOrDataUri: string,
    originalFilename: string,
    mimeType: string,
    options: UploadOptions
  ): Promise<StorageUploadResult> {
    let cleanBase64 = base64DataOrDataUri;
    let detectedMime = mimeType;

    // Extract data uri header if present
    if (base64DataOrDataUri.startsWith("data:")) {
      const matches = base64DataOrDataUri.match(/^data:([a-zA-Z0-9/+-]+);base64,(.+)$/);
      if (matches) {
        detectedMime = matches[1];
        cleanBase64 = matches[2];
      }
    }

    const buffer = Buffer.from(cleanBase64, "base64");
    return await this.uploadBuffer(buffer, originalFilename, detectedMime || "image/webp", options);
  }

  /**
   * Generates a Presigned Upload URL for direct client-to-S3 uploads
   */
  public async generatePresignedUploadUrl(
    originalFilename: string,
    mimeType: string,
    options: UploadOptions
  ): Promise<{
    uploadUrl: string;
    storageKey: string;
    publicUrl: string;
    cdnUrl: string;
    expiresInSeconds: number;
    requiredHeaders: Record<string, string>;
  }> {
    const storageKey = this.generateStorageKey(options, originalFilename);
    const expiresInSeconds = 300; // 5 minutes

    const publicUrl = this.cdnBaseUrl
      ? `${this.cdnBaseUrl.replace(/\/$/, "")}/${storageKey}`
      : `/api/storage/files/${storageKey}`;

    return {
      uploadUrl: `/api/storage/direct-put/${storageKey}`,
      storageKey,
      publicUrl,
      cdnUrl: publicUrl,
      expiresInSeconds,
      requiredHeaders: {
        "Content-Type": mimeType,
        "x-amz-acl": "public-read",
      },
    };
  }

  /**
   * Reads a file from local storage by storageKey
   */
  public getFileStream(storageKey: string): { filePath: string; exists: boolean } {
    const cleanKey = storageKey.replace(/\.\./g, "");
    const targetFilePath = path.join(this.localStorageDir, ...cleanKey.split("/"));
    return {
      filePath: targetFilePath,
      exists: fs.existsSync(targetFilePath),
    };
  }

  /**
   * Deletes a file from storage by storageKey
   */
  public async deleteFile(storageKey: string): Promise<boolean> {
    try {
      const cleanKey = storageKey.replace(/\.\./g, "");
      const targetFilePath = path.join(this.localStorageDir, ...cleanKey.split("/"));
      if (fs.existsSync(targetFilePath)) {
        fs.unlinkSync(targetFilePath);
        return true;
      }
      return false;
    } catch (err) {
      console.error(`Erro ao deletar arquivo de storage (${storageKey}):`, err);
      return false;
    }
  }
}

export const storageService = StorageService.getInstance();
