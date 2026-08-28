import { Router } from "express";
import { AuthService } from "../services/authService";
import { authMiddleware, AuthenticatedRequest } from "../middlewares/authMiddleware";

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
    const session = await AuthService.login(email || "willianCLima@gmail.com", password, organizationId);

    return res.json({
      success: true,
      message: "Autenticação realizada com sucesso.",
      session,
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
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

export default router;
