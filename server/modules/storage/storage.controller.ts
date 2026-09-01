import { Request, Response } from "express";
import { AuthenticatedRequest } from "../../middlewares/authMiddleware";
import { storageService, StorageUploadResult } from "../../services/storageService";
import { dbStore } from "../../db/store";
import { auditService } from "../../services/auditService";

export class StorageController {
  /**
   * POST /api/storage/upload
   * Receives image/video (base64 or multipart payload) and uploads to Object Storage (AWS S3 / Local).
   */
  static async upload(req: AuthenticatedRequest, res: Response) {
    try {
      const orgId = req.organizationId || (req.body && req.body.organizationId) || "org-lumina-01";
      const { fileBase64, fileName, mimeType, sku, productId, folder } = req.body;

      if (!fileBase64 || !fileName) {
        return res.status(400).json({
          success: false,
          error: "Payload incompleto: 'fileBase64' e 'fileName' são obrigatórios.",
        });
      }

      const result: StorageUploadResult = await storageService.uploadBase64(
        fileBase64,
        fileName,
        mimeType || "image/webp",
        {
          organizationId: orgId,
          sku: sku || "general",
          productId: productId,
          folder: folder || "products",
        }
      );

      // Audit Log
      if (req.user) {
        await auditService.logAction(
          orgId,
          req.user.id,
          "MEDIA_UPLOAD",
          "STORAGE",
          result.storageKey,
          (req.headers["x-forwarded-for"] as string) || req.socket.remoteAddress || "127.0.0.1",
          req.headers["user-agent"] || "Aura Web Client",
          `Arquivo ${fileName} enviado para storage (${result.provider}) com chave ${result.storageKey}`,
          {
            storageKey: result.storageKey,
            fileSize: result.fileSizeBytes,
            mimeType: result.mimeType,
            provider: result.provider,
          }
        );
      }

      return res.status(201).json({
        success: true,
        message: "Arquivo enviado para Object Storage com sucesso.",
        data: result,
      });
    } catch (error: any) {
      console.error("Storage upload controller error:", error);
      return res.status(500).json({
        success: false,
        error: error.message || "Falha no envio de arquivo para o Object Storage.",
      });
    }
  }

  /**
   * POST /api/storage/presigned-url
   * Generates S3 Presigned URL for direct client-side S3 uploads
   */
  static async getPresignedUrl(req: AuthenticatedRequest, res: Response) {
    try {
      const orgId = req.organizationId || "org-lumina-01";
      const { fileName, mimeType, sku, productId, folder } = req.body;

      if (!fileName || !mimeType) {
        return res.status(400).json({
          success: false,
          error: "Campos 'fileName' e 'mimeType' são obrigatórios.",
        });
      }

      const presigned = await storageService.generatePresignedUploadUrl(
        fileName,
        mimeType,
        {
          organizationId: orgId,
          sku: sku || "general",
          productId,
          folder: folder || "products",
        }
      );

      return res.json({
        success: true,
        data: presigned,
      });
    } catch (error: any) {
      return res.status(500).json({
        success: false,
        error: error.message || "Erro ao gerar URL pré-assinada do Storage.",
      });
    }
  }

  /**
   * GET /api/storage/files/*
   * Serves file from local storage repository with HTTP cache headers
   */
  static async getFile(req: Request, res: Response) {
    try {
      const storageKey = req.params[0];
      if (!storageKey) {
        return res.status(400).send("Storage key missing");
      }

      const { filePath, exists } = storageService.getFileStream(storageKey);
      if (!exists) {
        return res.status(404).send("Arquivo não encontrado no Object Storage.");
      }

      // Determine content type based on extension
      const ext = filePath.split(".").pop()?.toLowerCase();
      let contentType = "application/octet-stream";
      if (ext === "jpg" || ext === "jpeg") contentType = "image/jpeg";
      else if (ext === "png") contentType = "image/png";
      else if (ext === "webp") contentType = "image/webp";
      else if (ext === "avif") contentType = "image/avif";
      else if (ext === "gif") contentType = "image/gif";
      else if (ext === "svg") contentType = "image/svg+xml";
      else if (ext === "mp4") contentType = "video/mp4";
      else if (ext === "webm") contentType = "video/webm";
      else if (ext === "mov") contentType = "video/quicktime";

      res.setHeader("Content-Type", contentType);
      res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
      return res.sendFile(filePath);
    } catch (error: any) {
      return res.status(500).send("Erro ao recuperar arquivo do Storage.");
    }
  }

  /**
   * DELETE /api/storage/*
   * Deletes object from storage
   */
  static async delete(req: AuthenticatedRequest, res: Response) {
    try {
      const storageKey = req.params[0];
      if (!storageKey) {
        return res.status(400).json({ success: false, error: "Storage key missing" });
      }

      const deleted = await storageService.deleteFile(storageKey);
      return res.json({
        success: true,
        deleted,
        message: deleted ? "Arquivo removido do Storage." : "Arquivo já não existia.",
      });
    } catch (error: any) {
      return res.status(500).json({
        success: false,
        error: error.message || "Erro ao deletar arquivo do Storage.",
      });
    }
  }

  /**
   * GET /api/storage/health
   */
  static async health(_req: Request, res: Response) {
    return res.json({
      success: true,
      service: "Aura Media Object Storage Gateway",
      provider: process.env.AWS_ACCESS_KEY_ID ? "AWS_S3" : "LOCAL_OBJECT_STORAGE",
      bucket: process.env.AWS_S3_BUCKET || "aura-semijoias-media",
      region: process.env.AWS_REGION || "sa-east-1",
      supportedMimeTypes: ["image/jpeg", "image/png", "image/webp", "image/avif", "video/mp4", "video/webm"],
      maxFileSizeBytes: 50 * 1024 * 1024,
    });
  }
}
