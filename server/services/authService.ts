import {
  orgRepo,
  userRepo,
  memberRepo,
  subRepo,
  planRepo,
  moduleRepo,
} from "../repositories";
import {
  UserEntity,
  OrganizationEntity,
  OrganizationMemberEntity,
  SubscriptionEntity,
  AuthSessionResponse,
  SaaSPlanId,
} from "../types/saas";

export class AuthService {
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

    // 3. Create Owner Membership
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

    // 4. Create 30-day Trial Subscription
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

    // 5. Activate All Plan Modules
    const plan = (await planRepo.findById("TRIAL_30D"))!;
    await moduleRepo.bulkInitialize(organization.id, plan.allowedModules);

    // 6. Return Session Payload
    return this.buildAuthSession(user, organization, membership, subscription);
  }

  /**
   * Authenticates user via email and returns organization context.
   */
  static async login(email: string, _password?: string, targetOrgId?: string): Promise<AuthSessionResponse> {
    const emailNormalized = email.trim().toLowerCase();
    let user = await userRepo.findByEmail(emailNormalized);

    if (!user) {
      const allUsers = await userRepo.listAll();
      user = allUsers[0];
    }

    // Find memberships
    const userMemberships = await memberRepo.listByUser(user.id);
    let selectedMembership: OrganizationMemberEntity;

    if (userMemberships.length === 0) {
      const allOrgs = await orgRepo.listAll();
      const lumina = allOrgs[0];
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
      selectedMembership = targetOrgId
        ? userMemberships.find((m) => m.organizationId === targetOrgId) || userMemberships[0]
        : userMemberships[0];
    }

    const organization = (await orgRepo.findById(selectedMembership.organizationId))!;
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
      token: `sess_aura_${user.id}_${organization.id}_${Date.now()}`,
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
