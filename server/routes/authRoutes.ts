import { Router } from "express";
import { AuthService } from "../services/authService";
import { PasswordService } from "../services/passwordService";
import { authMiddleware, AuthenticatedRequest } from "../middlewares/authMiddleware";
import {
  loginRateLimitMiddleware,
  recordLoginFailure,
  recordLoginSuccess,
  getClientIp,
} from "../middlewares/loginRateLimitMiddleware";
import { subRepo, userRepo } from "../repositories";
import { query } from "../db/postgres";
import { TenantContext } from "../db/tenantContext";
import { isProduction } from "../config/environment";

const router = Router();

// GET /api/auth/system-init-status - Check if database has users or requires first master admin setup
router.get("/system-init-status", async (_req, res) => {
  try {
    const status = await AuthService.checkSystemInitStatus();
    return res.json({
      success: true,
      ...status,
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/auth/setup-first-admin - Provisions first root Master Administrator of the AURA ecosystem
router.post("/setup-first-admin", async (req, res) => {
  try {
    const { name, email, password, phone, ecosystemName } = req.body;
    const session = await AuthService.setupFirstAdmin({
      name,
      email,
      password,
      phone,
      ecosystemName,
    });

    return res.status(201).json({
      success: true,
      message: "Administrador mestre do ecossistema AURA configurado com sucesso! A conta raiz está ativa.",
      session,
    });
  } catch (error: any) {
    return res.status(400).json({ success: false, error: error.message });
  }
});

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

    if (!password || typeof password !== "string" || password.length < 6) {
      return res.status(400).json({
        success: false,
        error: "A senha de acesso é obrigatória e deve possuir no mínimo 6 caracteres.",
      });
    }

    const session = await AuthService.registerTrial({
      userName,
      email,
      password,
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
router.post("/login", loginRateLimitMiddleware, async (req, res) => {
  const ip = getClientIp(req);
  const rawEmail = typeof req.body?.email === "string" ? req.body.email.trim() : "";

  try {
    const { email, password, organizationId } = req.body;

    if (!email || typeof email !== "string" || !email.trim()) {
      recordLoginFailure(ip, rawEmail);
      return res.status(400).json({
        success: false,
        error: "O endereço de e-mail é obrigatório para autenticação.",
      });
    }

    if (!password || typeof password !== "string") {
      recordLoginFailure(ip, rawEmail);
      return res.status(400).json({
        success: false,
        error: "A senha de acesso é obrigatória.",
      });
    }

    const session = await AuthService.login(
      email.trim(),
      password,
      organizationId
    );

    recordLoginSuccess(ip, rawEmail);

    return res.json({
      success: true,
      message: "Autenticação realizada com sucesso.",
      session,
    });
  } catch (error: any) {
    recordLoginFailure(ip, rawEmail);
    return res.status(401).json({ success: false, error: error.message });
  }
});

// GET /api/auth/me - Get current authenticated user profile and subscription status
router.get("/me", authMiddleware, async (req: AuthenticatedRequest, res) => {
  try {
    const user = req.user!;
    const organization = req.tenant!;
    const session = await AuthService.getSessionForUser(user, organization.id);
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

    const session = await AuthService.getSessionForUser(user, targetOrganizationId);
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
    if (isProduction()) {
      return res.status(403).json({
        success: false,
        error: "Rota de teste desativada em ambiente de produção.",
      });
    }

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

// POST /api/auth/update-password - Atualiza senha do usuário autenticado (incluindo SuperAdmin)
router.post("/update-password", authMiddleware, async (req: AuthenticatedRequest, res) => {
  try {
    const user = req.user!;
    const { newPassword } = req.body;
    const isSuperAdmin = Boolean(user.isPlatformSuperAdmin);

    const validation = PasswordService.validatePasswordStrength(newPassword, isSuperAdmin);
    if (!validation.valid) {
      return res.status(400).json({
        success: false,
        error: validation.error,
      });
    }

    const hashed = await AuthService.hashPassword(newPassword);
    await userRepo.update(user.id, { passwordHash: hashed });

    return res.json({
      success: true,
      message: "Senha atualizada com sucesso!",
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/auth/reset-users-for-init-test - Limpa usuários para teste do fluxo de inicialização mestre
router.post("/reset-users-for-init-test", async (_req, res) => {
  try {
    if (isProduction()) {
      return res.status(403).json({ success: false, error: "Apenas disponível em ambiente de desenvolvimento." });
    }
    await TenantContext.run({ isSuperAdmin: true }, async () => {
      await query("DELETE FROM organization_members");
      await query("DELETE FROM users");
    });
    return res.json({
      success: true,
      message: "Tabela de usuários resetada. O sistema agora detecta 0 usuários e exige a criação do primeiro administrador.",
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/auth/restore-seed-users - Restaura usuários de demonstração padrão (APENAS EM DESENVOLVIMENTO)
router.post("/restore-seed-users", async (_req, res) => {
  try {
    if (isProduction()) {
      return res.status(403).json({
        success: false,
        error: "Rota de demonstração e seed estritamente bloqueada em ambiente de produção.",
      });
    }

    const devAdminPass = process.env.DEV_SEED_ADMIN_PASSWORD || "AuraAdmin2026!#DevSeed";
    const devDemoPass = process.env.DEV_SEED_USER_PASSWORD || "AuraUser2026!#DevSeed";

    const adminPasswordHash = await AuthService.hashPassword(devAdminPass);
    const demoPasswordHash = await AuthService.hashPassword(devDemoPass);

    await TenantContext.run({ tenantId: "org-lumina-01", isSuperAdmin: true }, async () => {
      // 1. Ensure master org exists
      const orgRes = await query("SELECT id FROM organizations WHERE id = $1", ["org-lumina-01"]);
      if (orgRes.rows.length === 0) {
        await query(
          `INSERT INTO organizations (
            id, name, slug, document, segment, city, state, contact_email, contact_whatsapp, status, created_at, updated_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), NOW())`,
          [
            "org-lumina-01",
            "Lumina Semijoias & Alta Joalheria",
            "lumina",
            "48.291.802/0001-94",
            "SEMIJOIAS",
            "Limeira",
            "SP",
            "contato@luminasemijoias.com.br",
            "+55 (19) 98765-4321",
            "ACTIVE",
          ]
        );
      }

      // 2. Insert Super Admin User
      await query(
        `INSERT INTO users (id, name, email, password_hash, phone, is_platform_super_admin, status, created_at, last_login_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
         ON CONFLICT (id) DO UPDATE SET password_hash = EXCLUDED.password_hash, is_platform_super_admin = true`,
        ["usr-admin-01", "Willian C. Lima", "willianCLima@gmail.com", adminPasswordHash, "+55 (19) 99876-5432", true, "ACTIVE"]
      );

      // 3. Insert Member
      await query(
        `INSERT INTO organization_members (id, organization_id, user_id, role, custom_permissions, status, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, NOW())
         ON CONFLICT (id) DO NOTHING`,
        ["mem-01", "org-lumina-01", "usr-admin-01", "OWNER", JSON.stringify(["*"]), "ACTIVE"]
      );

      // 4. Store Owner User
      await query(
        `INSERT INTO users (id, name, email, password_hash, phone, is_platform_super_admin, status, created_at, last_login_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
         ON CONFLICT (id) DO NOTHING`,
        ["usr-lumina-01", "Lumina Gestora", "contato@luminasemijoias.com.br", demoPasswordHash, "+55 (19) 98765-4321", false, "ACTIVE"]
      );

      await query(
        `INSERT INTO organization_members (id, organization_id, user_id, role, custom_permissions, status, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, NOW())
         ON CONFLICT (id) DO NOTHING`,
        ["mem-02", "org-lumina-01", "usr-lumina-01", "OWNER", JSON.stringify(["*"]), "ACTIVE"]
      );
    });

    return res.json({
      success: true,
      message: "Usuários padrão restaurados com sucesso.",
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
