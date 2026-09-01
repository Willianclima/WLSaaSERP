import { Router } from "express";
import { StorageController } from "./storage.controller";
import { authMiddleware } from "../../middlewares/authMiddleware";

const router = Router();

// Public file retrieval / CDN simulation
router.get("/files/*", StorageController.getFile);

// Storage health / provider diagnostics
router.get("/health", StorageController.health);

// Authenticated upload and management routes
router.post("/upload", StorageController.upload);
router.post("/presigned-url", authMiddleware, StorageController.getPresignedUrl);
router.delete("/*", authMiddleware, StorageController.delete);

export default router;
