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
import { query, withTransaction } from "../db/postgres";
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
import { PasswordService } from "./passwordService";
import bcrypt from "bcryptjs";

export class AuthService {
  private static readonly BCRYPT_SALT_ROUNDS = Math.max(10, Number(process.env.BCRYPT_ROUNDS || 12));
  private static isSettingUpFirstAdmin = false;

  /**
   * Cryptographically hashes a plain-text password using bcrypt with generated salt.
   */
  static async hashPassword(password: string): Promise<string> {
    if (!password || typeof password !== "string") {
      throw new Error("A senha fornecida para hashing é inválida ou vazia.");
    }
    const salt = await bcrypt.genSalt(this.BCRYPT_SALT_ROUNDS);
    return bcrypt.hash(password, salt);
  }

  /**
   * Secure async comparison function using bcryptjs to compare plain-text password with stored hash.
   */
  static async verifyPassword(plainPassword: string, storedHash?: string | null): Promise<boolean> {
    if (!plainPassword || !storedHash || typeof plainPassword !== "string" || typeof storedHash !== "string") {
      return false;
    }

    // Direct asynchronous bcrypt verification
    try {
      if (storedHash.startsWith("$2a$") || storedHash.startsWith("$2b$") || storedHash.startsWith("$2y$")) {
        return await bcrypt.compare(plainPassword, storedHash);
      }
    } catch (err) {
      console.error("[AuthService] Error comparing password hash with bcrypt:", err);
      return false;
    }

    // Fallback for transitional legacy seeds (automatic upgrade to bcrypt occurs on login)
    return PasswordService.verify(plainPassword, storedHash);
  }
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
    const passwordHash = await this.hashPassword(data.password);
    const user: UserEntity = existingUser || {
      id: userId,
      name: data.userName.trim(),
      email: emailNormalized,
      passwordHash,
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
   * Authenticates user via email and password with cryptographic bcrypt validation and returns organization session context.
   */
  static async login(email: string, password?: string, targetOrgId?: string): Promise<AuthSessionResponse> {
    const emailNormalized = (email || "").trim().toLowerCase();
    if (!emailNormalized) {
      throw new Error("Credenciais inválidas: o e-mail de acesso é obrigatório.");
    }

    if (!password || typeof password !== "string") {
      throw new Error("Credenciais inválidas: a senha de acesso é obrigatória.");
    }

    let user: UserEntity | null = await userRepo.findByEmail(emailNormalized);

    if (!user) {
      // Timing attack mitigation: ensure execution time is constant whether user exists or not
      const DUMMY_HASH = "$2a$12$e8r0E3HkC0pL.O2V1j4GTuQj4mS5v7N8x6W1y2Z3A4B5C6D7E8F9G";
      await bcrypt.compare(password, DUMMY_HASH).catch(() => {});
      throw new Error("Credenciais inválidas: e-mail ou senha incorretos.");
    }

    // Cryptographic bcrypt validation against stored password hash
    const isPasswordValid = await this.verifyPassword(password, user.passwordHash);
    if (!isPasswordValid) {
      throw new Error("Credenciais inválidas: e-mail ou senha incorretos.");
    }

    if (user.status !== "ACTIVE") {
      throw new Error("Usuário inativo ou suspenso. Entre em contato com o suporte.");
    }

    // Automatic transparent upgrade if legacy hash is detected
    if (PasswordService.needsRehash(user.passwordHash)) {
      try {
        const upgradedHash = await this.hashPassword(password);
        await userRepo.update(user.id, { passwordHash: upgradedHash });
        user.passwordHash = upgradedHash;
      } catch (upgradeErr) {
        console.warn("[AuthService] Could not upgrade legacy password hash:", upgradeErr);
      }
    }

    // Update lastLoginAt timestamp
    try {
      const nowStr = new Date().toISOString().replace("T", " ").substring(0, 16);
      await userRepo.update(user.id, { lastLoginAt: nowStr });
      user.lastLoginAt = nowStr;
    } catch (loginTimeErr) {
      console.warn("[AuthService] Could not update lastLoginAt:", loginTimeErr);
    }

    return this.getSessionForUser(user, targetOrgId);
  }

  /**
   * Constructs active tenant session context for an already-authenticated identity (e.g., via verified JWT).
   */
  static async getSessionForUser(user: UserEntity, targetOrgId?: string): Promise<AuthSessionResponse> {
    if (user.status !== "ACTIVE") {
      throw new Error("Usuário inativo ou suspenso. Entre em contato com o suporte.");
    }

    // Find memberships across organizations with system admin context for auth
    const userMemberships = await TenantContext.run({ isSuperAdmin: true }, async () => {
      return await memberRepo.listByUser(user.id);
    });
    let selectedMembership: OrganizationMemberEntity | undefined;

    if (userMemberships.length === 0) {
      throw new Error("Acesso negado: o usuário não possui vínculo ativo com nenhuma organização.");
    } else {
      if (targetOrgId) {
        selectedMembership = userMemberships.find((m) => m.organizationId === targetOrgId);
        if (!selectedMembership) {
          if (!user.isPlatformSuperAdmin) {
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
    if (!organization || organization.status !== "ACTIVE") {
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

    const jwtToken = AuthService.generateJwtToken(user, organization.id, membership.role, membership.id);

    return {
      token: jwtToken,
      jwt: jwtToken,
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

  /**
   * Checks whether the system has any users registered in the database.
   * If totalUsers === 0, the system must prompt for the initial Master Admin setup.
   */
  static async checkSystemInitStatus(): Promise<{
    needsFirstAdmin: boolean;
    totalUsers: number;
    hasSuperAdmin: boolean;
  }> {
    const users = await TenantContext.run({ isSuperAdmin: true }, async () => {
      return await userRepo.listAll();
    });
    const totalUsers = users.length;
    const hasSuperAdmin = users.some((u) => Boolean(u.isPlatformSuperAdmin) && u.status === "ACTIVE");
    return {
      needsFirstAdmin: totalUsers === 0,
      totalUsers,
      hasSuperAdmin,
    };
  }

  /**
   * Provisions the first root Administrator of the AURA ecosystem when the database has 0 users.
   * Concurrency-safe: utilizes memory mutex and atomic database verification to prevent race conditions.
   */
  static async setupFirstAdmin(data: {
    name: string;
    email: string;
    password: string;
    phone?: string;
    ecosystemName?: string;
  }): Promise<AuthSessionResponse> {
    if (this.isSettingUpFirstAdmin) {
      throw new Error("A inicialização do administrador mestre já está em andamento. Requisições simultâneas bloqueadas.");
    }

    this.isSettingUpFirstAdmin = true;

    try {
      if (!data.name || !data.name.trim()) {
        throw new Error("O nome completo do administrador mestre é obrigatório.");
      }
      if (!data.email || !data.email.trim() || !data.email.includes("@")) {
        throw new Error("O e-mail do administrador mestre é obrigatório e deve ser válido.");
      }

      // Strict password policy validation for Super Admin:
      // Minimum 12 characters, uppercase, lowercase, numbers, and symbols
      const passwordValidation = PasswordService.validatePasswordStrength(data.password, true);
      if (!passwordValidation.valid) {
        throw new Error(passwordValidation.error);
      }

      // Re-check system init status under superadmin context
      const status = await this.checkSystemInitStatus();
      if (!status.needsFirstAdmin) {
        throw new Error("O ecossistema AURA já possui usuários cadastrados. A inicialização da conta mestre já foi concluída e está permanentemente desativada.");
      }

      // Secondary atomic check to ensure no super admin or user exists
      const existingUsers = await TenantContext.run({ isSuperAdmin: true }, async () => {
        return await userRepo.listAll();
      });
      if (existingUsers.length > 0) {
        throw new Error("O ecossistema AURA já possui usuários registrados no banco de dados.");
      }

      const emailNormalized = data.email.trim().toLowerCase();
      const passwordHash = await this.hashPassword(data.password);

      // 1. Ensure master organization exists
      let masterOrg = await TenantContext.run({ isSuperAdmin: true }, async () => {
        const orgs = await orgRepo.listAll();
        return orgs.find((o) => o.slug.includes("aura") || o.slug.includes("matriz") || o.id === "org-lumina-01") || orgs[0];
      });

      if (!masterOrg) {
        masterOrg = await orgRepo.create({
          id: `org-aura-${Date.now()}`,
          name: data.ecosystemName?.trim() || "AURA Plataforma & Ecossistema",
          slug: "aura-plataforma",
          document: "00.000.000/0001-00",
          segment: "SEMIJOIAS",
          city: "Limeira",
          state: "SP",
          contactEmail: emailNormalized,
          contactWhatsapp: data.phone || "",
          status: "ACTIVE",
          createdAt: new Date().toISOString().replace("T", " ").substring(0, 16),
          updatedAt: new Date().toISOString().replace("T", " ").substring(0, 16),
        });
      }

      // 2. Create the first user as Platform Super Admin
      const userId = `usr-master-${Date.now()}`;
      const masterUser: UserEntity = {
        id: userId,
        name: data.name.trim(),
        email: emailNormalized,
        passwordHash,
        phone: data.phone || "",
        isPlatformSuperAdmin: true,
        status: "ACTIVE",
        createdAt: new Date().toISOString().replace("T", " ").substring(0, 16),
        lastLoginAt: new Date().toISOString().replace("T", " ").substring(0, 16),
      };

      await userRepo.create(masterUser);

      // 3. Create root membership with OWNER role and full wildcard permissions
      return await TenantContext.run({ tenantId: masterOrg.id, isSuperAdmin: true }, async () => {
        const membership: OrganizationMemberEntity = {
          id: `mem-master-${Date.now()}`,
          organizationId: masterOrg.id,
          userId: masterUser.id,
          role: "OWNER",
          customPermissions: ["*"],
          status: "ACTIVE",
          createdAt: new Date().toISOString().replace("T", " ").substring(0, 16),
        };
        await memberRepo.create(membership);

        let subscription = await subRepo.findByOrgId(masterOrg.id);
        if (!subscription) {
          const now = new Date();
          const expirationDate = new Date(now.getTime() + 365 * 86400000);
          subscription = {
            id: `sub-master-${masterOrg.id}`,
            organizationId: masterOrg.id,
            planId: "ENTERPRISE",
            status: "ACTIVE",
            trialStartedAt: now.toISOString().replace("T", " ").substring(0, 16),
            trialEndsAt: expirationDate.toISOString().replace("T", " ").substring(0, 16),
            currentPeriodStart: now.toISOString().replace("T", " ").substring(0, 16),
            currentPeriodEnd: expirationDate.toISOString().replace("T", " ").substring(0, 16),
            autoRenew: true,
            createdAt: now.toISOString().replace("T", " ").substring(0, 16),
            updatedAt: now.toISOString().replace("T", " ").substring(0, 16),
          };
          await subRepo.create(subscription);
        }

        return this.buildAuthSession(masterUser, masterOrg, membership, subscription);
      });
    } finally {
      this.isSettingUpFirstAdmin = false;
    }
  }
}
