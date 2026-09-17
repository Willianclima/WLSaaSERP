import crypto from "crypto";
import { getSessionSecret } from "../config/authConfig";
import {
  orgRepo,
  userRepo,
  memberRepo,
  subRepo,
  planRepo,
  moduleRepo,
} from "../repositories";
import { inventoryRepo } from "../modules/inventory/inventory.repository";
import { TenantContext } from "../db/tenantContext";
import {
  UserEntity,
  OrganizationEntity,
  OrganizationMemberEntity,
  SubscriptionEntity,
  AuthSessionResponse,
  SaaSPlanId,
  OrganizationRole,
} from "../types/saas";
import { JwtService } from "./jwtService";

export class AuthService {
  /**
   * Generates a tamper-proof session token signed with HMAC-SHA256 using SESSION_SECRET.
   */
  static generateSessionToken(userId: string, orgId: string): string {
    const timestamp = Date.now();
    const payload = `${userId}_${orgId}_${timestamp}`;
    const secret = getSessionSecret();
    const signature = crypto.createHmac("sha256", secret).update(payload).digest("hex").substring(0, 16);
    return `sess_aura_${payload}_${signature}`;
  }

  /**
   * Generates a standard RFC 7519 JSON Web Token (JWT) with user identity and tenant membership claims.
   */
  static generateJwtToken(user: UserEntity, orgId: string, role: OrganizationRole = "OWNER", membershipId?: string): string {
    return JwtService.sign({
      sub: user.id,
      userId: user.id,
      email: user.email,
      tenantId: orgId,
      organizationId: orgId,
      role,
      membershipId,
      isPlatformSuperAdmin: Boolean(user.isPlatformSuperAdmin),
    });
  }
  /**
   * Registers a new company + admin user and automatically creates a 30-day trial subscription in the persistence layer.
   */
  static async registerTrial(data: {
    userName: string;
    email: string;
    password: string;
    organizationName: string;
    segment?: "SEMIJOIAS" | "MODA" | "COSMETICOS" | "VAREJO_GERAL";
    document?: string;
    whatsapp?: string;
    city?: string;
    state?: string;
  }): Promise<AuthSessionResponse> {
    const emailNormalized = data.email.trim().toLowerCase();

    // 1. Check if user exists
    let existingUser = await userRepo.findByEmail(emailNormalized);
    const userId = existingUser ? existingUser.id : `usr-${Date.now()}`;
    const user: UserEntity = existingUser || {
      id: userId,
      name: data.userName.trim(),
      email: emailNormalized,
      passwordHash: `hash_${data.password}`,
      phone: data.whatsapp || "",
      isPlatformSuperAdmin: false,
      status: "ACTIVE",
      createdAt: new Date().toISOString().replace("T", " ").substring(0, 16),
      lastLoginAt: new Date().toISOString().replace("T", " ").substring(0, 16),
    };

    if (!existingUser) {
      await userRepo.create(user);
    }

    // 2. Generate Organization Slug
    const baseSlug = data.organizationName
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "") || "empresa";

    const orgId = `org-${Date.now()}`;
    const organization: OrganizationEntity = {
      id: orgId,
      name: data.organizationName.trim(),
      slug: `${baseSlug}-${Math.floor(100 + Math.random() * 900)}`,
      document: data.document || "00.000.000/0001-00",
      segment: data.segment || "SEMIJOIAS",
      city: data.city || "Limeira",
      state: data.state || "SP",
      contactEmail: emailNormalized,
      contactWhatsapp: data.whatsapp || "+55 (19) 99999-9999",
      customDomain: `${baseSlug}.aura.com`,
      customDomainStatus: "ACTIVE",
      status: "ACTIVE",
      createdAt: new Date().toISOString().replace("T", " ").substring(0, 16),
      updatedAt: new Date().toISOString().replace("T", " ").substring(0, 16),
    };
    await orgRepo.create(organization);

    // 3, 4 & 5. Create Owner Membership, Trial Subscription, and Activate Modules within tenant RLS context
    return await TenantContext.run({ tenantId: organization.id, isSuperAdmin: true }, async () => {
      const membership: OrganizationMemberEntity = {
        id: `mem-${Date.now()}`,
        organizationId: organization.id,
        userId: user.id,
        role: "OWNER",
        customPermissions: ["*"],
        status: "ACTIVE",
        createdAt: new Date().toISOString().replace("T", " ").substring(0, 16),
      };
      await memberRepo.create(membership);

      const now = new Date();
      const trialEnd = new Date(now.getTime() + 30 * 86400000);
      const subscription: SubscriptionEntity = {
        id: `sub-${Date.now()}`,
        organizationId: organization.id,
        planId: "TRIAL_30D",
        status: "TRIALING",
        trialStartedAt: now.toISOString().replace("T", " ").substring(0, 16),
        trialEndsAt: trialEnd.toISOString().replace("T", " ").substring(0, 16),
        currentPeriodStart: now.toISOString().replace("T", " ").substring(0, 16),
        currentPeriodEnd: trialEnd.toISOString().replace("T", " ").substring(0, 16),
        paymentMethod: "MANUAL_TRIAL",
        autoRenew: true,
        createdAt: now.toISOString().replace("T", " ").substring(0, 16),
        updatedAt: now.toISOString().replace("T", " ").substring(0, 16),
      };
      await subRepo.create(subscription);

      const plan = (await planRepo.findById("TRIAL_30D"))!;
      await moduleRepo.bulkInitialize(organization.id, plan.allowedModules);

      try {
        await inventoryRepo.createLocation({
          id: `loc-hq-${organization.id}`,
          organizationId: organization.id,
          name: "Matriz / Showroom Central",
          type: "HEADQUARTERS",
          code: "MATRIZ",
          description: "Estoque principal da matriz",
          isActive: true,
          createdAt: new Date().toISOString(),
        });
      } catch (lErr) {
        console.warn("Location init during registration:", lErr);
      }

      return this.buildAuthSession(user, organization, membership, subscription);
    });
  }

  /**
   * Authenticates user via email and returns organization context.
   */
  static async login(email: string, _password?: string, targetOrgId?: string): Promise<AuthSessionResponse> {
    const isProduction = process.env.NODE_ENV === "production";
    const allowDevDemoFallback = !isProduction && process.env.ENABLE_DEV_AUTH_DEMO_FALLBACK !== "false";

    const emailNormalized = (email || "").trim().toLowerCase();
    let user: UserEntity | null = null;
    if (emailNormalized) {
      user = await userRepo.findByEmail(emailNormalized);
    }

    if (!user) {
      if (isProduction || !allowDevDemoFallback) {
        throw new Error("Credenciais inválidas: usuário não encontrado.");
      }
      // DEVELOPMENT ONLY: Fallback demo user
      const allUsers = await userRepo.listAll();
      user = allUsers.find((u) => u.status === "ACTIVE") || allUsers[0] || null;
      if (!user) {
        throw new Error("Nenhum usuário cadastrado no sistema.");
      }
    }

    if (user.status !== "ACTIVE") {
      throw new Error("Usuário inativo ou suspenso. Entre em contato com o suporte.");
    }

    // Find memberships across organizations with system admin context for auth
    const userMemberships = await TenantContext.run({ isSuperAdmin: true }, async () => {
      return await memberRepo.listByUser(user.id);
    });
    let selectedMembership: OrganizationMemberEntity | undefined;

    if (userMemberships.length === 0) {
      if (isProduction || !allowDevDemoFallback) {
        throw new Error("Acesso negado: o usuário não possui vínculo ativo com nenhuma organização.");
      }
      // DEVELOPMENT ONLY: Auto-link to default seed tenant
      const allOrgs = await orgRepo.listAll();
      const lumina = allOrgs[0];
      if (!lumina) {
        throw new Error("Nenhuma organização disponível para associação.");
      }
      selectedMembership = {
        id: `mem-fallback-${user.id}`,
        organizationId: lumina.id,
        userId: user.id,
        role: "OWNER",
        status: "ACTIVE",
        createdAt: new Date().toISOString().replace("T", " ").substring(0, 16),
      };
      await memberRepo.create(selectedMembership);
    } else {
      if (targetOrgId) {
        selectedMembership = userMemberships.find((m) => m.organizationId === targetOrgId);
        if (!selectedMembership) {
          if ((isProduction || !allowDevDemoFallback) && !user.isPlatformSuperAdmin) {
            throw new Error(`Acesso não autorizado: o usuário não é membro da organização informada (${targetOrgId}).`);
          }
          selectedMembership = userMemberships[0];
        }
      } else {
        selectedMembership = userMemberships.find((m) => m.status === "ACTIVE") || userMemberships[0];
      }
    }

    if (!selectedMembership || (selectedMembership.status !== "ACTIVE" && !user.isPlatformSuperAdmin)) {
      throw new Error("Vínculo do usuário com a organização está suspenso ou inativo.");
    }

    const organization = await orgRepo.findById(selectedMembership.organizationId);
    if (!organization || (isProduction && organization.status !== "ACTIVE")) {
      throw new Error("Organização vinculada não encontrada ou inativa.");
    }
    let subscription = await subRepo.findByOrgId(organization.id);

    if (!subscription) {
      const now = new Date();
      const trialEnd = new Date(now.getTime() + 30 * 86400000);
      subscription = {
        id: `sub-default-${organization.id}`,
        organizationId: organization.id,
        planId: "TRIAL_30D" as SaaSPlanId,
        status: "TRIALING",
        trialStartedAt: now.toISOString().replace("T", " ").substring(0, 16),
        trialEndsAt: trialEnd.toISOString().replace("T", " ").substring(0, 16),
        currentPeriodStart: now.toISOString().replace("T", " ").substring(0, 16),
        currentPeriodEnd: trialEnd.toISOString().replace("T", " ").substring(0, 16),
        autoRenew: true,
        createdAt: now.toISOString().replace("T", " ").substring(0, 16),
        updatedAt: now.toISOString().replace("T", " ").substring(0, 16),
      };
      await subRepo.create(subscription);
    }

    return this.buildAuthSession(user, organization, selectedMembership, subscription);
  }

  /**
   * Helper to construct unified session response with trial calculations.
   */
  static async buildAuthSession(
    user: UserEntity,
    organization: OrganizationEntity,
    membership: OrganizationMemberEntity,
    subscription: SubscriptionEntity
  ): Promise<AuthSessionResponse> {
    const plan = (await planRepo.findById(subscription.planId)) || (await planRepo.findById("TRIAL_30D"))!;

    // Calculate trial days remaining
    const now = new Date();
    const trialEnd = new Date(subscription.trialEndsAt);
    const msRemaining = trialEnd.getTime() - now.getTime();
    const daysRemaining = Math.max(0, Math.ceil(msRemaining / (1000 * 60 * 60 * 24)));

    // List all available organizations for this user
    const memberships = await memberRepo.listByUser(user.id);
    const availableOrganizations: Array<{ id: string; name: string; slug: string; role: any }> = [];

    for (const m of memberships) {
      const org = await orgRepo.findById(m.organizationId);
      if (org) {
        availableOrganizations.push({
          id: org.id,
          name: org.name,
          slug: org.slug,
          role: m.role,
        });
      }
    }

    return {
      token: AuthService.generateSessionToken(user.id, organization.id),
      jwt: AuthService.generateJwtToken(user, organization.id, membership.role, membership.id),
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        avatarUrl: user.avatarUrl,
        isPlatformSuperAdmin: user.isPlatformSuperAdmin,
      },
      organization,
      membership: {
        role: membership.role,
        permissions: membership.customPermissions || ["*"],
      },
      subscription: {
        planId: subscription.planId,
        planName: plan.name,
        status: subscription.status,
        trialEndsAt: subscription.trialEndsAt,
        daysRemainingInTrial: daysRemaining,
        isTrial: subscription.planId === "TRIAL_30D" || subscription.status === "TRIALING",
        isActive: subscription.status === "ACTIVE" || subscription.status === "TRIALING",
        allowedModules: plan.allowedModules,
      },
      availableOrganizations,
    };
  }
}
