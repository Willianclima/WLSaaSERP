import { Router } from "express";
import { ProductController } from "./product.controller";
import { authMiddleware } from "../../middlewares/authMiddleware";
import { requireModule, requireRole } from "../../middlewares/rbacMiddleware";

const router = Router();

// Protect all product routes with Authentication & Catalog Module authorization
router.use(authMiddleware);
router.use(requireModule("catalog_inventory"));

// List products (All authenticated store users)
router.get("/", ProductController.list);

// Get single product
router.get("/:id", ProductController.getById);

// Create product (Admins, Gerentes, Owners)
router.post(
  "/",
  requireRole(["SUPER_ADMIN", "OWNER", "LOJA_ADMIN", "GERENTE_COMERCIAL"]),
  ProductController.create
);

// Update product
router.put(
  "/:id",
  requireRole(["SUPER_ADMIN", "OWNER", "LOJA_ADMIN", "GERENTE_COMERCIAL"]),
  ProductController.update
);

// Delete product
router.delete(
  "/:id",
  requireRole(["SUPER_ADMIN", "OWNER", "LOJA_ADMIN"]),
  ProductController.delete
);

export default router;
