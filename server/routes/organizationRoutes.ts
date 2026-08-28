import { Router } from "express";
import { authMiddleware, AuthenticatedRequest } from "../middlewares/authMiddleware";
import { requireRole } from "../middlewares/rbacMiddleware";
import { orgRepo, memberRepo, subRepo, planRepo, moduleRepo } from "../repositories";

const router = Router();

// GET /api/organizations/current - Fetch current active organization details
router.get("/current", authMiddleware, async (req: AuthenticatedRequest, res) => {
  try {
    const org = req.tenant!;
    const modules = await moduleRepo.listByOrgId(org.id);
    const members = await memberRepo.listByOrg(org.id);

    return res.json({
      success: true,
      organization: org,
      modules,
      stats: {
        totalMembers: members.length,
      },
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// PUT /api/organizations/current - Update organization settings / branding
router.put(
  "/current",
  authMiddleware,
  requireRole(["SUPER_ADMIN", "OWNER", "LOJA_ADMIN"]),
  async (req: AuthenticatedRequest, res) => {
    try {
      const org = req.tenant!;
      const { name, city, state, contactEmail, contactWhatsapp, customDomain, logoUrl } = req.body;

      const updated = await orgRepo.update(org.id, {
        ...(name && { name }),
        ...(city && { city }),
        ...(state && { state }),
        ...(contactEmail && { contactEmail }),
        ...(contactWhatsapp && { contactWhatsapp }),
        ...(customDomain !== undefined && { customDomain }),
        ...(logoUrl && { logoUrl }),
      });

      return res.json({
        success: true,
        message: "Configurações da empresa atualizadas com sucesso.",
        organization: updated,
      });
    } catch (error: any) {
      return res.status(500).json({ success: false, error: error.message });
    }
  }
);

// GET /api/organizations/all - Platform Super Admin list
router.get("/all", authMiddleware, requireRole(["SUPER_ADMIN"]), async (_req, res) => {
  try {
    const orgs = await orgRepo.listAll();
    const result = [];

    for (const org of orgs) {
      const sub = await subRepo.findByOrgId(org.id);
      const plan = sub ? await planRepo.findById(sub.planId) : null;
      result.push({
        ...org,
        subscription: sub,
        planName: plan?.name || "Sem Plano",
      });
    }

    return res.json({
      success: true,
      organizations: result,
      totalCount: result.length,
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
