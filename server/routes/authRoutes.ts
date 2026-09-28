import { Router } from "express";
import { AuthService } from "../services/authService";
import { authMiddleware, AuthenticatedRequest } from "../middlewares/authMiddleware";
import { subRepo } from "../repositories";

const router = Router();

// POST /api/auth/register - Register new company with instant 30-day Trial
router.post("/register", async (req, res) => {
  try {
    const { userName, email, password, organizationName, segment, document, whatsapp, city, state } = req.body;

    if (!userName || !email || !organizationName) {
      return res.status(400).json({
        success: false,
        error: "Nome do responsável, e-mail e nome da empresa são obrigatórios para iniciar o Trial.",
      });
    }

    const session = await AuthService.registerTrial({
      userName,
      email,
      password: password || "123456",
      organizationName,
      segment,
      document,
      whatsapp,
      city,
      state,
    });

    return res.status(201).json({
      success: true,
      message: `Organização "${organizationName}" criada com sucesso! Seu Trial de 30 dias está ativo.`,
      session,
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/auth/login - Log in and obtain session + tenant context
router.post("/login", async (req, res) => {
  try {
    const { email, password, organizationId } = req.body;
    const isProduction = process.env.NODE_ENV === "production";

    if (isProduction && !email) {
      return res.status(400).json({
        success: false,
        error: "O endereço de e-mail é obrigatório para autenticação em produção.",
      });
    }

    const session = await AuthService.login(
      email || (isProduction ? "" : "willianCLima@gmail.com"),
      password,
      organizationId
    );

    return res.json({
      success: true,
      message: "Autenticação realizada com sucesso.",
      session,
    });
  } catch (error: any) {
    return res.status(401).json({ success: false, error: error.message });
  }
});

// GET /api/auth/me - Get current authenticated user profile and subscription status
router.get("/me", authMiddleware, async (req: AuthenticatedRequest, res) => {
  try {
    const user = req.user!;
    const organization = req.tenant!;
    const session = await AuthService.login(user.email, undefined, organization.id);
    return res.json({
      success: true,
      session,
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/auth/validate-session - Strict RBAC session validation
// Returns verified user credentials, role claims, platform permissions, and subscription lifecycle status
router.get("/validate-session", authMiddleware, async (req: AuthenticatedRequest, res) => {
  try {
    const user = req.user!;
    const tenant = req.tenant;
    const userRole = req.userRole;
    const isSuperAdmin = Boolean(user.isPlatformSuperAdmin || userRole === "SUPER_ADMIN");

    let subscriptionData: any = null;
    if (tenant?.id) {
      try {
        const sub = await subRepo.findByOrgId(tenant.id);
        if (sub) {
          const now = new Date();
          const trialEnd = sub.trialEndsAt ? new Date(sub.trialEndsAt) : null;
          const isTrialExpired =
            sub.status === "TRIALING" && trialEnd !== null && trialEnd.getTime() < now.getTime();
          const isExpired = sub.status === "EXPIRED" || isTrialExpired;
          const msRemaining = trialEnd ? trialEnd.getTime() - now.getTime() : 0;
          const daysRemaining = Math.max(0, Math.ceil(msRemaining / (1000 * 60 * 60 * 24)));

          subscriptionData = {
            id: sub.id,
            status: isExpired ? "EXPIRED" : sub.status,
            planId: sub.planId,
            trialEndsAt: sub.trialEndsAt,
            daysRemaining,
            isExpired,
            isReadOnly: isExpired || sub.status === "READ_ONLY",
          };
        }
      } catch (subErr) {
        console.warn("Could not query subscription for validate-session:", subErr);
      }
    }

    return res.json({
      success: true,
      valid: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: userRole || (isSuperAdmin ? "SUPER_ADMIN" : "OWNER"),
        isPlatformSuperAdmin: isSuperAdmin,
        phone: user.phone,
      },
      organization: tenant
        ? {
            id: tenant.id,
            name: tenant.name,
            slug: tenant.slug,
            status: tenant.status,
          }
        : null,
      subscription: subscriptionData,
      permissions: {
        canAccessPlatformOwner: isSuperAdmin,
        canAccessStoreERP: Boolean(tenant || isSuperAdmin),
        effectiveRole: userRole,
        isSubscriptionExpired: subscriptionData?.isExpired || false,
        isReadOnlyMode: subscriptionData?.isReadOnly || false,
      },
    });
  } catch (error: any) {
    return res.status(401).json({ success: false, valid: false, error: error.message });
  }
});

// POST /api/auth/switch-tenant - Switch active organization context
router.post("/switch-tenant", authMiddleware, async (req: AuthenticatedRequest, res) => {
  try {
    const { targetOrganizationId } = req.body;
    const user = req.user!;

    const session = await AuthService.login(user.email, undefined, targetOrganizationId);
    return res.json({
      success: true,
      message: `Alternado para a empresa ${session.organization.name}`,
      session,
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/auth/generate-expired-token - Gera token JWT propositalmente expirado para validação do TESTE 5
router.post("/generate-expired-token", async (_req, res) => {
  try {
    const { JwtService } = await import("../services/jwtService");
    const expiredToken = JwtService.sign(
      {
        sub: "usr-maria-01",
        userId: "usr-maria-01",
        email: "maria@elegance.com",
        organizationId: "org-lumina-01",
        tenantId: "org-lumina-01",
        role: "OWNER",
      },
      "-1h" // Token expirado há 1 hora
    );

    return res.json({
      success: true,
      token: expiredToken,
      message: "Token sintético expirado gerado com sucesso para teste de segurança.",
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
