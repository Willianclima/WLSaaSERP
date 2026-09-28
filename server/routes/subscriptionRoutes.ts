import { Router } from "express";
import { authMiddleware, AuthenticatedRequest } from "../middlewares/authMiddleware";
import { requireRole } from "../middlewares/rbacMiddleware";
import { SubscriptionService } from "../services/subscriptionService";
import { planRepo } from "../repositories";
import { SystemModuleKey } from "../types/saas";

const router = Router();

// GET /api/subscriptions/current - Get current subscription, trial days, active modules
router.get("/current", authMiddleware, async (req: AuthenticatedRequest, res) => {
  try {
    const orgId = req.organizationId!;
    const data = await SubscriptionService.getTenantSubscription(orgId);
    return res.json({ success: true, data });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/subscriptions/plans - List all available platform plans
router.get("/plans", async (_req, res) => {
  try {
    const plans = await planRepo.listAll();
    return res.json({ success: true, plans });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/subscriptions/simulate-payment - Simulates choosing a plan and paying via PIX / Cartão / Boleto
router.post(
  "/simulate-payment",
  authMiddleware,
  requireRole(["SUPER_ADMIN", "OWNER", "LOJA_ADMIN"]),
  async (req: AuthenticatedRequest, res) => {
    try {
      const orgId = req.organizationId!;
      const { targetPlanId, paymentMethod } = req.body;

      if (!targetPlanId) {
        return res.status(400).json({
          success: false,
          error: "targetPlanId é obrigatório para assinar.",
        });
      }

      const result = await SubscriptionService.simulateSubscriptionPayment({
        organizationId: orgId,
        targetPlanId,
        paymentMethod: paymentMethod || "PIX",
      });

      return res.json(result);
    } catch (error: any) {
      return res.status(500).json({ success: false, error: error.message });
    }
  }
);

// POST /api/subscriptions/toggle-module - Enable/Disable allowed module for tenant
router.post(
  "/toggle-module",
  authMiddleware,
  requireRole(["SUPER_ADMIN", "OWNER", "LOJA_ADMIN"]),
  async (req: AuthenticatedRequest, res) => {
    try {
      const orgId = req.organizationId!;
      const { moduleKey, enable } = req.body;

      if (!moduleKey) {
        return res.status(400).json({ success: false, error: "moduleKey é obrigatório" });
      }

      const result = await SubscriptionService.toggleModule(orgId, moduleKey as SystemModuleKey, Boolean(enable));
      return res.json(result);
    } catch (error: any) {
      return res.status(500).json({ success: false, error: error.message });
    }
  }
);

// POST /api/subscriptions/simulate-expiry - Simula expiração do trial para validação de ciclo comercial (TESTE 6)
router.post(
  "/simulate-expiry",
  authMiddleware,
  requireRole(["SUPER_ADMIN", "OWNER", "LOJA_ADMIN"]),
  async (req: AuthenticatedRequest, res) => {
    try {
      const orgId = req.organizationId!;
      const result = await SubscriptionService.simulateTrialExpiration(orgId);
      return res.json(result);
    } catch (error: any) {
      return res.status(500).json({ success: false, error: error.message });
    }
  }
);

// POST /api/subscriptions/transition - Realiza transição na máquina de estados finita do ciclo comercial
router.post(
  "/transition",
  authMiddleware,
  requireRole(["SUPER_ADMIN", "OWNER"]),
  async (req: AuthenticatedRequest, res) => {
    try {
      const orgId = req.organizationId!;
      const { targetStatus, reason } = req.body;

      if (!targetStatus) {
        return res.status(400).json({ success: false, error: "targetStatus é obrigatório" });
      }

      const updated = await SubscriptionService.transitionStatus(orgId, targetStatus, reason);
      return res.json({
        success: true,
        message: `Status da assinatura transicionado com sucesso para '${targetStatus}'`,
        subscription: updated,
      });
    } catch (error: any) {
      return res.status(400).json({ success: false, error: error.message });
    }
  }
);

// POST /api/subscriptions/reactivate - Reativa a assinatura da organização
router.post(
  "/reactivate",
  authMiddleware,
  requireRole(["SUPER_ADMIN", "OWNER", "LOJA_ADMIN"]),
  async (req: AuthenticatedRequest, res) => {
    try {
      const orgId = req.organizationId!;
      const result = await SubscriptionService.reactivateSubscription(orgId);
      return res.json(result);
    } catch (error: any) {
      return res.status(500).json({ success: false, error: error.message });
    }
  }
);

export default router;
