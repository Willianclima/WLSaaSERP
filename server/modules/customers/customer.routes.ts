import { Router } from "express";
import { CustomerController } from "./customer.controller";
import { authMiddleware } from "../../middlewares/authMiddleware";
import { requireRole } from "../../middlewares/rbacMiddleware";

const router = Router();

// Protect customer routes with Authentication
router.use(authMiddleware);

// List customers
router.get("/", CustomerController.list);

// Get single customer
router.get("/:id", CustomerController.getById);

// Create customer (Admins, Gerentes, Vendedores, Owners)
router.post(
  "/",
  requireRole(["SUPER_ADMIN", "OWNER", "LOJA_ADMIN", "GERENTE_COMERCIAL", "VENDEDOR"]),
  CustomerController.create
);

// Update customer
router.put(
  "/:id",
  requireRole(["SUPER_ADMIN", "OWNER", "LOJA_ADMIN", "GERENTE_COMERCIAL", "VENDEDOR"]),
  CustomerController.update
);

// Update customer status (Lifecycle: ACTIVE, INACTIVE, BLOCKED, ARCHIVED)
router.patch(
  "/:id/status",
  requireRole(["SUPER_ADMIN", "OWNER", "LOJA_ADMIN", "GERENTE_COMERCIAL", "VENDEDOR"]),
  CustomerController.updateStatus
);

// Delete customer (Soft-delete / Archive)
router.delete(
  "/:id",
  requireRole(["SUPER_ADMIN", "OWNER", "LOJA_ADMIN", "GERENTE_COMERCIAL"]),
  CustomerController.delete
);

export default router;
