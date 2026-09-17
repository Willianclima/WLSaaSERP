import {
  OrganizationEntity,
  UserEntity,
  OrganizationMemberEntity,
  SubscriptionEntity,
  PlanDefinition,
  OrganizationModuleEntity,
  SystemModuleKey,
  SaaSPlanId,
} from "../types/saas";
import { query } from "../db/postgres";
import { TenantContext } from "../db/tenantContext";

// ============================================================================
// REPOSITORIES INTERFACES
// ============================================================================

export interface IOrganizationRepository {
  findById(id: string): Promise<OrganizationEntity | null>;
  findBySlug(slug: string): Promise<OrganizationEntity | null>;
  findByCustomDomain(domain: string): Promise<OrganizationEntity | null>;
  create(org: OrganizationEntity): Promise<OrganizationEntity>;
  update(id: string, partial: Partial<OrganizationEntity>): Promise<OrganizationEntity>;
  listAll(): Promise<OrganizationEntity[]>;
}

export interface IUserRepository {
  findById(id: string): Promise<UserEntity | null>;
  findByEmail(email: string): Promise<UserEntity | null>;
  create(user: UserEntity): Promise<UserEntity>;
  update(id: string, partial: Partial<UserEntity>): Promise<UserEntity>;
  listAll(): Promise<UserEntity[]>;
}

export interface IMembershipRepository {
  findById(id: string): Promise<OrganizationMemberEntity | null>;
  findByOrgAndUser(orgId: string, userId: string): Promise<OrganizationMemberEntity | null>;
  listByUser(userId: string): Promise<OrganizationMemberEntity[]>;
  listByOrg(orgId: string): Promise<OrganizationMemberEntity[]>;
  create(member: OrganizationMemberEntity): Promise<OrganizationMemberEntity>;
  update(id: string, partial: Partial<OrganizationMemberEntity>): Promise<OrganizationMemberEntity>;
}

export interface ISubscriptionRepository {
  findByOrgId(orgId: string): Promise<SubscriptionEntity | null>;
  create(subscription: SubscriptionEntity): Promise<SubscriptionEntity>;
  update(orgId: string, partial: Partial<SubscriptionEntity>): Promise<SubscriptionEntity>;
  listAll(): Promise<SubscriptionEntity[]>;
}

export interface IPlanRepository {
  findById(id: SaaSPlanId): Promise<PlanDefinition | null>;
  listAll(): Promise<PlanDefinition[]>;
  create(plan: PlanDefinition): Promise<PlanDefinition>;
}

export interface IModuleRepository {
  listByOrgId(orgId: string): Promise<OrganizationModuleEntity[]>;
  setModuleStatus(orgId: string, moduleKey: SystemModuleKey, isEnabled: boolean): Promise<OrganizationModuleEntity>;
  bulkInitialize(orgId: string, allowedKeys: SystemModuleKey[]): Promise<OrganizationModuleEntity[]>;
}

// ============================================================================
// ROW MAPPERS
// ============================================================================

function mapRowToOrg(row: any): OrganizationEntity {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    document: row.document,
    segment: row.segment,
    logoUrl: row.logo_url || undefined,
    city: row.city,
    state: row.state,
    contactEmail: row.contact_email,
    contactWhatsapp: row.contact_whatsapp,
    customDomain: row.custom_domain || undefined,
    customDomainStatus: row.custom_domain_status || undefined,
    status: row.status,
    createdAt: row.created_at instanceof Date ? row.created_at.toISOString() : String(row.created_at),
    updatedAt: row.updated_at instanceof Date ? row.updated_at.toISOString() : String(row.updated_at),
  };
}

function mapRowToUser(row: any): UserEntity {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    passwordHash: row.password_hash,
    avatarUrl: row.avatar_url || undefined,
    phone: row.phone || undefined,
    isPlatformSuperAdmin: Boolean(row.is_platform_super_admin),
    status: row.status,
    createdAt: row.created_at instanceof Date ? row.created_at.toISOString() : String(row.created_at),
    lastLoginAt: row.last_login_at instanceof Date ? row.last_login_at.toISOString() : (row.last_login_at ? String(row.last_login_at) : undefined),
  };
}

function mapRowToMember(row: any): OrganizationMemberEntity {
  const customPermissions = Array.isArray(row.custom_permissions)
    ? row.custom_permissions
    : typeof row.custom_permissions === "string"
    ? JSON.parse(row.custom_permissions)
    : [];

  return {
    id: row.id,
    organizationId: row.organization_id,
    userId: row.user_id,
    role: row.role,
    customPermissions,
    status: row.status,
    createdAt: row.created_at instanceof Date ? row.created_at.toISOString() : String(row.created_at),
  };
}

function mapRowToSubscription(row: any): SubscriptionEntity {
  return {
    id: row.id,
    organizationId: row.organization_id,
    planId: row.plan_id,
    status: row.status,
    trialStartedAt: row.trial_started_at instanceof Date ? row.trial_started_at.toISOString() : String(row.trial_started_at),
    trialEndsAt: row.trial_ends_at instanceof Date ? row.trial_ends_at.toISOString() : String(row.trial_ends_at),
    currentPeriodStart: row.current_period_start instanceof Date ? row.current_period_start.toISOString() : String(row.current_period_start),
    currentPeriodEnd: row.current_period_end instanceof Date ? row.current_period_end.toISOString() : String(row.current_period_end),
    paymentMethod: row.payment_method,
    autoRenew: Boolean(row.auto_renew),
    createdAt: row.created_at instanceof Date ? row.created_at.toISOString() : String(row.created_at),
    updatedAt: row.updated_at instanceof Date ? row.updated_at.toISOString() : String(row.updated_at),
  };
}

function mapRowToPlan(row: any): PlanDefinition {
  const allowedModules = Array.isArray(row.allowed_modules)
    ? row.allowed_modules
    : typeof row.allowed_modules === "string"
    ? JSON.parse(row.allowed_modules)
    : [];

  return {
    id: row.id,
    name: row.name,
    priceMonthlyBrl: parseFloat(row.price_monthly_brl),
    trialDays: parseInt(row.trial_days, 10),
    maxUsers: parseInt(row.max_users, 10),
    maxProducts: parseInt(row.max_products, 10),
    maxResellers: parseInt(row.max_resellers, 10),
    allowedModules,
    description: row.description || "",
  };
}

function mapRowToModule(row: any): OrganizationModuleEntity {
  return {
    id: row.id,
    organizationId: row.organization_id,
    moduleKey: row.module_key,
    isEnabled: Boolean(row.is_enabled),
    activatedAt: row.activated_at instanceof Date ? row.activated_at.toISOString() : String(row.activated_at),
  };
}

// ============================================================================
// CONCRETE REPOSITORY IMPLEMENTATIONS (POSTGRESQL PERSISTENCE LAYER)
// ============================================================================

export class OrganizationRepository implements IOrganizationRepository {
  async findById(id: string): Promise<OrganizationEntity | null> {
    const res = await query("SELECT * FROM organizations WHERE id = $1", [id]);
    return res.rows.length > 0 ? mapRowToOrg(res.rows[0]) : null;
  }

  async findBySlug(slug: string): Promise<OrganizationEntity | null> {
    const res = await query("SELECT * FROM organizations WHERE LOWER(slug) = LOWER($1)", [slug.trim()]);
    return res.rows.length > 0 ? mapRowToOrg(res.rows[0]) : null;
  }

  async findByCustomDomain(domain: string): Promise<OrganizationEntity | null> {
    const res = await query("SELECT * FROM organizations WHERE LOWER(custom_domain) = LOWER($1)", [domain.trim()]);
    return res.rows.length > 0 ? mapRowToOrg(res.rows[0]) : null;
  }

  async create(org: OrganizationEntity): Promise<OrganizationEntity> {
    const res = await query(
      `INSERT INTO organizations (
        id, name, slug, document, segment, logo_url, city, state,
        contact_email, contact_whatsapp, custom_domain, custom_domain_status, status, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, NOW(), NOW())
      RETURNING *`,
      [
        org.id,
        org.name,
        org.slug,
        org.document,
        org.segment,
        org.logoUrl || null,
        org.city,
        org.state,
        org.contactEmail,
        org.contactWhatsapp,
        org.customDomain || null,
        org.customDomainStatus || null,
        org.status,
      ]
    );
    return mapRowToOrg(res.rows[0]);
  }

  async update(id: string, partial: Partial<OrganizationEntity>): Promise<OrganizationEntity> {
    const setClauses: string[] = ["updated_at = NOW()"];
    const params: any[] = [id];
    let idx = 2;

    if (partial.name !== undefined) {
      setClauses.push(`name = $${idx++}`);
      params.push(partial.name);
    }
    if (partial.slug !== undefined) {
      setClauses.push(`slug = $${idx++}`);
      params.push(partial.slug);
    }
    if (partial.document !== undefined) {
      setClauses.push(`document = $${idx++}`);
      params.push(partial.document);
    }
    if (partial.segment !== undefined) {
      setClauses.push(`segment = $${idx++}`);
      params.push(partial.segment);
    }
    if (partial.logoUrl !== undefined) {
      setClauses.push(`logo_url = $${idx++}`);
      params.push(partial.logoUrl);
    }
    if (partial.city !== undefined) {
      setClauses.push(`city = $${idx++}`);
      params.push(partial.city);
    }
    if (partial.state !== undefined) {
      setClauses.push(`state = $${idx++}`);
      params.push(partial.state);
    }
    if (partial.contactEmail !== undefined) {
      setClauses.push(`contact_email = $${idx++}`);
      params.push(partial.contactEmail);
    }
    if (partial.contactWhatsapp !== undefined) {
      setClauses.push(`contact_whatsapp = $${idx++}`);
      params.push(partial.contactWhatsapp);
    }
    if (partial.customDomain !== undefined) {
      setClauses.push(`custom_domain = $${idx++}`);
      params.push(partial.customDomain);
    }
    if (partial.customDomainStatus !== undefined) {
      setClauses.push(`custom_domain_status = $${idx++}`);
      params.push(partial.customDomainStatus);
    }
    if (partial.status !== undefined) {
      setClauses.push(`status = $${idx++}`);
      params.push(partial.status);
    }

    const sql = `UPDATE organizations SET ${setClauses.join(", ")} WHERE id = $1 RETURNING *`;
    const res = await query(sql, params);
    if (res.rows.length === 0) {
      throw new Error(`Organização ${id} não encontrada.`);
    }
    return mapRowToOrg(res.rows[0]);
  }

  async listAll(): Promise<OrganizationEntity[]> {
    const res = await query("SELECT * FROM organizations ORDER BY created_at DESC");
    return res.rows.map(mapRowToOrg);
  }
}

export class UserRepository implements IUserRepository {
  async findById(id: string): Promise<UserEntity | null> {
    const res = await query("SELECT * FROM users WHERE id = $1", [id]);
    return res.rows.length > 0 ? mapRowToUser(res.rows[0]) : null;
  }

  async findByEmail(email: string): Promise<UserEntity | null> {
    const res = await query("SELECT * FROM users WHERE LOWER(email) = LOWER($1)", [email.trim()]);
    return res.rows.length > 0 ? mapRowToUser(res.rows[0]) : null;
  }

  async create(user: UserEntity): Promise<UserEntity> {
    const res = await query(
      `INSERT INTO users (
        id, name, email, password_hash, avatar_url, phone, is_platform_super_admin, status, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
      RETURNING *`,
      [
        user.id,
        user.name,
        user.email,
        user.passwordHash,
        user.avatarUrl || null,
        user.phone || null,
        user.isPlatformSuperAdmin || false,
        user.status,
      ]
    );
    return mapRowToUser(res.rows[0]);
  }

  async update(id: string, partial: Partial<UserEntity>): Promise<UserEntity> {
    const setClauses: string[] = [];
    const params: any[] = [id];
    let idx = 2;

    if (partial.name !== undefined) {
      setClauses.push(`name = $${idx++}`);
      params.push(partial.name);
    }
    if (partial.email !== undefined) {
      setClauses.push(`email = $${idx++}`);
      params.push(partial.email);
    }
    if (partial.passwordHash !== undefined) {
      setClauses.push(`password_hash = $${idx++}`);
      params.push(partial.passwordHash);
    }
    if (partial.avatarUrl !== undefined) {
      setClauses.push(`avatar_url = $${idx++}`);
      params.push(partial.avatarUrl);
    }
    if (partial.phone !== undefined) {
      setClauses.push(`phone = $${idx++}`);
      params.push(partial.phone);
    }
    if (partial.status !== undefined) {
      setClauses.push(`status = $${idx++}`);
      params.push(partial.status);
    }
    if (partial.lastLoginAt !== undefined) {
      setClauses.push(`last_login_at = $${idx++}`);
      params.push(partial.lastLoginAt);
    }

    if (setClauses.length === 0) {
      const existing = await this.findById(id);
      if (!existing) throw new Error(`Usuário ${id} não encontrado.`);
      return existing;
    }

    const sql = `UPDATE users SET ${setClauses.join(", ")} WHERE id = $1 RETURNING *`;
    const res = await query(sql, params);
    if (res.rows.length === 0) throw new Error(`Usuário ${id} não encontrado.`);
    return mapRowToUser(res.rows[0]);
  }

  async listAll(): Promise<UserEntity[]> {
    const res = await query("SELECT * FROM users ORDER BY created_at DESC");
    return res.rows.map(mapRowToUser);
  }
}

export class MembershipRepository implements IMembershipRepository {
  async findById(id: string): Promise<OrganizationMemberEntity | null> {
    const res = await query("SELECT * FROM organization_members WHERE id = $1", [id]);
    return res.rows.length > 0 ? mapRowToMember(res.rows[0]) : null;
  }

  async findByOrgAndUser(orgId: string, userId: string): Promise<OrganizationMemberEntity | null> {
    const res = await query(
      "SELECT * FROM organization_members WHERE organization_id = $1 AND user_id = $2 AND status = 'ACTIVE'",
      [orgId, userId]
    );
    return res.rows.length > 0 ? mapRowToMember(res.rows[0]) : null;
  }

  async listByUser(userId: string): Promise<OrganizationMemberEntity[]> {
    return TenantContext.run({ isSuperAdmin: true }, async () => {
      const res = await query(
        "SELECT * FROM organization_members WHERE user_id = $1 AND status = 'ACTIVE'",
        [userId]
      );
      return res.rows.map(mapRowToMember);
    });
  }

  async listByOrg(orgId: string): Promise<OrganizationMemberEntity[]> {
    return TenantContext.run({ tenantId: orgId }, async () => {
      const res = await query(
        "SELECT * FROM organization_members WHERE organization_id = $1 AND status = 'ACTIVE'",
        [orgId]
      );
      return res.rows.map(mapRowToMember);
    });
  }

  async create(member: OrganizationMemberEntity): Promise<OrganizationMemberEntity> {
    return TenantContext.run({ tenantId: member.organizationId, isSuperAdmin: true }, async () => {
      const res = await query(
        `INSERT INTO organization_members (
          id, organization_id, user_id, role, custom_permissions, status, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, NOW())
        RETURNING *`,
        [
          member.id,
          member.organizationId,
          member.userId,
          member.role,
          JSON.stringify(member.customPermissions || []),
          member.status,
        ]
      );
      return mapRowToMember(res.rows[0]);
    });
  }

  async update(id: string, partial: Partial<OrganizationMemberEntity>): Promise<OrganizationMemberEntity> {
    const setClauses: string[] = [];
    const params: any[] = [id];
    let idx = 2;

    if (partial.role !== undefined) {
      setClauses.push(`role = $${idx++}`);
      params.push(partial.role);
    }
    if (partial.customPermissions !== undefined) {
      setClauses.push(`custom_permissions = $${idx++}`);
      params.push(JSON.stringify(partial.customPermissions));
    }
    if (partial.status !== undefined) {
      setClauses.push(`status = $${idx++}`);
      params.push(partial.status);
    }

    if (setClauses.length === 0) {
      const existing = await this.findById(id);
      if (!existing) throw new Error(`Membro ${id} não encontrado.`);
      return existing;
    }

    const sql = `UPDATE organization_members SET ${setClauses.join(", ")} WHERE id = $1 RETURNING *`;
    const res = await query(sql, params);
    if (res.rows.length === 0) throw new Error(`Membro ${id} não encontrado.`);
    return mapRowToMember(res.rows[0]);
  }
}

export class SubscriptionRepository implements ISubscriptionRepository {
  async findByOrgId(orgId: string): Promise<SubscriptionEntity | null> {
    const res = await query("SELECT * FROM subscriptions WHERE organization_id = $1", [orgId]);
    return res.rows.length > 0 ? mapRowToSubscription(res.rows[0]) : null;
  }

  async create(sub: SubscriptionEntity): Promise<SubscriptionEntity> {
    const res = await query(
      `INSERT INTO subscriptions (
        id, organization_id, plan_id, status, trial_started_at, trial_ends_at,
        current_period_start, current_period_end, payment_method, auto_renew, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), NOW())
      RETURNING *`,
      [
        sub.id,
        sub.organizationId,
        sub.planId,
        sub.status,
        sub.trialStartedAt,
        sub.trialEndsAt,
        sub.currentPeriodStart,
        sub.currentPeriodEnd,
        sub.paymentMethod,
        sub.autoRenew,
      ]
    );
    return mapRowToSubscription(res.rows[0]);
  }

  async update(orgId: string, partial: Partial<SubscriptionEntity>): Promise<SubscriptionEntity> {
    const setClauses: string[] = ["updated_at = NOW()"];
    const params: any[] = [orgId];
    let idx = 2;

    if (partial.planId !== undefined) {
      setClauses.push(`plan_id = $${idx++}`);
      params.push(partial.planId);
    }
    if (partial.status !== undefined) {
      setClauses.push(`status = $${idx++}`);
      params.push(partial.status);
    }
    if (partial.currentPeriodStart !== undefined) {
      setClauses.push(`current_period_start = $${idx++}`);
      params.push(partial.currentPeriodStart);
    }
    if (partial.currentPeriodEnd !== undefined) {
      setClauses.push(`current_period_end = $${idx++}`);
      params.push(partial.currentPeriodEnd);
    }
    if (partial.paymentMethod !== undefined) {
      setClauses.push(`payment_method = $${idx++}`);
      params.push(partial.paymentMethod);
    }
    if (partial.autoRenew !== undefined) {
      setClauses.push(`auto_renew = $${idx++}`);
      params.push(partial.autoRenew);
    }

    const sql = `UPDATE subscriptions SET ${setClauses.join(", ")} WHERE organization_id = $1 RETURNING *`;
    const res = await query(sql, params);
    if (res.rows.length === 0) throw new Error(`Assinatura para ${orgId} não encontrada.`);
    return mapRowToSubscription(res.rows[0]);
  }

  async listAll(): Promise<SubscriptionEntity[]> {
    const res = await query("SELECT * FROM subscriptions ORDER BY created_at DESC");
    return res.rows.map(mapRowToSubscription);
  }
}

export class PlanRepository implements IPlanRepository {
  async findById(id: SaaSPlanId): Promise<PlanDefinition | null> {
    const res = await query("SELECT * FROM plans WHERE id = $1", [id]);
    return res.rows.length > 0 ? mapRowToPlan(res.rows[0]) : null;
  }

  async listAll(): Promise<PlanDefinition[]> {
    const res = await query("SELECT * FROM plans ORDER BY price_monthly_brl ASC");
    return res.rows.map(mapRowToPlan);
  }

  async create(plan: PlanDefinition): Promise<PlanDefinition> {
    const res = await query(
      `INSERT INTO plans (
        id, name, price_monthly_brl, trial_days, max_users, max_products, max_resellers, allowed_modules, description
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *`,
      [
        plan.id,
        plan.name,
        plan.priceMonthlyBrl,
        plan.trialDays,
        plan.maxUsers,
        plan.maxProducts,
        plan.maxResellers,
        JSON.stringify(plan.allowedModules),
        plan.description,
      ]
    );
    return mapRowToPlan(res.rows[0]);
  }
}

export class ModuleRepository implements IModuleRepository {
  async listByOrgId(orgId: string): Promise<OrganizationModuleEntity[]> {
    const res = await query(
      "SELECT * FROM organization_modules WHERE organization_id = $1 ORDER BY module_key ASC",
      [orgId]
    );
    return res.rows.map(mapRowToModule);
  }

  async setModuleStatus(
    orgId: string,
    moduleKey: SystemModuleKey,
    isEnabled: boolean
  ): Promise<OrganizationModuleEntity> {
    const modId = `mod-${orgId}-${moduleKey}`;
    const res = await query(
      `INSERT INTO organization_modules (id, organization_id, module_key, is_enabled, activated_at)
       VALUES ($1, $2, $3, $4, NOW())
       ON CONFLICT (organization_id, module_key) DO UPDATE
       SET is_enabled = EXCLUDED.is_enabled
       RETURNING *`,
      [modId, orgId, moduleKey, isEnabled]
    );
    return mapRowToModule(res.rows[0]);
  }

  async bulkInitialize(orgId: string, allowedKeys: SystemModuleKey[]): Promise<OrganizationModuleEntity[]> {
    const results: OrganizationModuleEntity[] = [];
    for (const key of allowedKeys) {
      const res = await this.setModuleStatus(orgId, key, true);
      results.push(res);
    }
    return results;
  }
}

// Single instance export for repositories
export const orgRepo = new OrganizationRepository();
export const userRepo = new UserRepository();
export const memberRepo = new MembershipRepository();
export const subRepo = new SubscriptionRepository();
export const planRepo = new PlanRepository();
export const moduleRepo = new ModuleRepository();
