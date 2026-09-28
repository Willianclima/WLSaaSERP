import { Router } from "express";
import { ConsignmentController } from "./consignment.controller";
import { authMiddleware } from "../../middlewares/authMiddleware";
import { requireModule, requireRole } from "../../middlewares/rbacMiddleware";
import { enforceSubscriptionCommercialAccess } from "../../middlewares/subscriptionMiddleware";

const router = Router();

// ============================================================================
// PIPELINE P0: JWT -> IDENTIDADE -> RBAC -> ORGANIZAÇÃO -> ASSINATURA -> MÓDULOS -> AÇÃO
// ============================================================================
router.use(authMiddleware);
router.use(requireModule("consignments"));
router.use(enforceSubscriptionCommercialAccess());

// List consignments (All authorized store operators if plan includes consignments)
router.get("/", ConsignmentController.list);

// Get single consignment
router.get("/:id", ConsignmentController.getById);

// Create consignment kit / maleta (Only store managers, owners, admins)
router.post(
  "/",
  requireRole(["SUPER_ADMIN", "OWNER", "LOJA_ADMIN", "GERENTE_COMERCIAL"]),
  ConsignmentController.create
);

export default router;
