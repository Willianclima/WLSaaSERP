import { Router } from "express";
import { InventoryController } from "./inventory.controller";
import { InventoryBalancesController } from "./inventoryBalances.controller";
import { authMiddleware } from "../../middlewares/authMiddleware";
import { requireModule, requireRole } from "../../middlewares/rbacMiddleware";

const router = Router();

// Protect with Auth and Catalog Inventory Module
router.use(authMiddleware);
router.use(requireModule("catalog_inventory"));

// Locations
router.get("/locations", InventoryController.listLocations);
router.post(
  "/locations",
  requireRole(["SUPER_ADMIN", "OWNER", "LOJA_ADMIN"]),
  InventoryController.createLocation
);

// Multi-Dimensional Balances (Location Queries & availability calculation: on_hand - reserved)
router.get("/balances/locations/summary", InventoryBalancesController.getLocationsSummary);
router.get("/balances/location/:locationId", InventoryBalancesController.getBalancesByLocation);
router.get("/balances/location/:locationId/product/:productId", InventoryBalancesController.getProductBalanceByLocation);
router.get("/balances/product/:productId", InventoryBalancesController.getProductBalances);
router.get("/balances/:productId", InventoryBalancesController.getProductBalances);
router.get("/balances", InventoryBalancesController.listAllBalances);

// Stock Reservations (Atomic concurrency protection)
router.post(
  "/reserve",
  requireRole(["SUPER_ADMIN", "OWNER", "LOJA_ADMIN", "GERENTE_COMERCIAL", "VENDEDOR", "REVENDEDORA_PORTAL"]),
  InventoryController.reserve
);
router.post(
  "/release-reservation",
  requireRole(["SUPER_ADMIN", "OWNER", "LOJA_ADMIN", "GERENTE_COMERCIAL", "VENDEDOR", "REVENDEDORA_PORTAL"]),
  InventoryController.releaseReservation
);
router.post(
  "/commit-reservation",
  requireRole(["SUPER_ADMIN", "OWNER", "LOJA_ADMIN", "GERENTE_COMERCIAL"]),
  InventoryController.commitReservation
);

// Formal Reservations Lifecycle (Sprint 3 Ready: Idempotency, TTL & Status State Machine)
router.post(
  "/reservations",
  requireRole(["SUPER_ADMIN", "OWNER", "LOJA_ADMIN", "GERENTE_COMERCIAL", "VENDEDOR", "REVENDEDORA_PORTAL"]),
  InventoryController.createFormalReservation
);
router.get(
  "/reservations",
  requireRole(["SUPER_ADMIN", "OWNER", "LOJA_ADMIN", "GERENTE_COMERCIAL", "VENDEDOR"]),
  InventoryController.listActiveReservations
);
router.get(
  "/reservations/:id",
  requireRole(["SUPER_ADMIN", "OWNER", "LOJA_ADMIN", "GERENTE_COMERCIAL", "VENDEDOR", "REVENDEDORA_PORTAL"]),
  InventoryController.getReservationById
);
router.post(
  "/reservations/:id/confirm",
  requireRole(["SUPER_ADMIN", "OWNER", "LOJA_ADMIN", "GERENTE_COMERCIAL"]),
  InventoryController.confirmFormalReservation
);
router.post(
  "/reservations/:id/release",
  requireRole(["SUPER_ADMIN", "OWNER", "LOJA_ADMIN", "GERENTE_COMERCIAL", "VENDEDOR", "REVENDEDORA_PORTAL"]),
  InventoryController.releaseFormalReservation
);
router.post(
  "/reservations/:id/cancel",
  requireRole(["SUPER_ADMIN", "OWNER", "LOJA_ADMIN", "GERENTE_COMERCIAL", "VENDEDOR", "REVENDEDORA_PORTAL"]),
  InventoryController.cancelFormalReservation
);
router.post(
  "/reservations/sweep-expired",
  requireRole(["SUPER_ADMIN", "OWNER", "LOJA_ADMIN"]),
  InventoryController.sweepExpiredReservations
);
router.get(
  "/reservations/worker/status",
  requireRole(["SUPER_ADMIN", "OWNER", "LOJA_ADMIN"]),
  InventoryController.getWorkerStatus
);
router.post(
  "/reservations/worker/trigger",
  requireRole(["SUPER_ADMIN", "OWNER", "LOJA_ADMIN"]),
  InventoryController.triggerWorkerCycle
);
router.put(
  "/reservations/worker/config",
  requireRole(["SUPER_ADMIN", "OWNER"]),
  InventoryController.updateWorkerConfig
);
router.post(
  "/reconcile/reservations",
  requireRole(["SUPER_ADMIN", "OWNER", "LOJA_ADMIN", "GERENTE_COMERCIAL"]),
  InventoryController.reconcileReservations
);

// Controlled Atomic On-Hand Adjustment (Requires Business Metadata & Generates Ledger Movement)
router.post(
  "/on-hand-change",
  requireRole(["SUPER_ADMIN", "OWNER", "LOJA_ADMIN", "GERENTE_COMERCIAL"]),
  InventoryController.executeControlledOnHandChange
);

// List ledger entries
router.get("/ledger", InventoryController.listLedger);

// Get specific product stock summary
router.get("/stock/:productId", InventoryController.getProductStock);

// Audit reconciliation: expected vs current snapshot balance based on ledger stream
router.get(
  "/reconcile/:productId",
  requireRole(["SUPER_ADMIN", "OWNER", "LOJA_ADMIN", "GERENTE_COMERCIAL"]),
  InventoryController.reconcile
);

// Record stock movement (Admins, Gerentes, Estoquistas)
router.post(
  "/movement",
  requireRole(["SUPER_ADMIN", "OWNER", "LOJA_ADMIN", "GERENTE_COMERCIAL"]),
  InventoryController.recordMovement
);

// Reverse / Estorno de movimento anterior (Strictly Immutable: creates a REVERSAL entry, no PUT/DELETE allowed)
router.post(
  "/reverse",
  requireRole(["SUPER_ADMIN", "OWNER", "LOJA_ADMIN", "GERENTE_COMERCIAL"]),
  InventoryController.reverse
);

// Recalculate balances directly from ledger history (Restricted to OWNER / SUPER_ADMIN platform maintenance)
router.post(
  "/recalculate/:productId",
  requireRole(["SUPER_ADMIN", "OWNER"]),
  InventoryController.recalculate
);

// Sprint 2.5 Hardening & Concurrency Test Runner
router.post(
  "/hardening/run-tests",
  requireRole(["SUPER_ADMIN", "OWNER", "LOJA_ADMIN"]),
  InventoryController.runHardeningTests
);

export default router;
