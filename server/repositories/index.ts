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
import { dbStore, INITIAL_PLANS, DEFAULT_SYSTEM_MODULES } from "../db/store";

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
// CONCRETE REPOSITORY IMPLEMENTATIONS (PERSISTENCE LAYER)
// ============================================================================

export class OrganizationRepository implements IOrganizationRepository {
  async findById(id: string): Promise<OrganizationEntity | null> {
    return dbStore.organizations.get(id) || null;
  }

  async findBySlug(slug: string): Promise<OrganizationEntity | null> {
    for (const org of dbStore.organizations.values()) {
      if (org.slug.toLowerCase() === slug.toLowerCase()) return org;
    }
    return null;
  }

  async findByCustomDomain(domain: string): Promise<OrganizationEntity | null> {
    for (const org of dbStore.organizations.values()) {
      if (org.customDomain?.toLowerCase() === domain.toLowerCase()) return org;
    }
    return null;
  }

  async create(org: OrganizationEntity): Promise<OrganizationEntity> {
    dbStore.organizations.set(org.id, org);
    return org;
  }

  async update(id: string, partial: Partial<OrganizationEntity>): Promise<OrganizationEntity> {
    const existing = await this.findById(id);
    if (!existing) throw new Error(`Organização ${id} não encontrada.`);
    const updated = { ...existing, ...partial, updatedAt: new Date().toISOString().replace("T", " ").substring(0, 16) };
    dbStore.organizations.set(id, updated);
    return updated;
  }

  async listAll(): Promise<OrganizationEntity[]> {
    return Array.from(dbStore.organizations.values());
  }
}

export class UserRepository implements IUserRepository {
  async findById(id: string): Promise<UserEntity | null> {
    return dbStore.users.get(id) || null;
  }

  async findByEmail(email: string): Promise<UserEntity | null> {
    const normalized = email.trim().toLowerCase();
    for (const user of dbStore.users.values()) {
      if (user.email.toLowerCase() === normalized) return user;
    }
    return null;
  }

  async create(user: UserEntity): Promise<UserEntity> {
    dbStore.users.set(user.id, user);
    return user;
  }

  async update(id: string, partial: Partial<UserEntity>): Promise<UserEntity> {
    const existing = await this.findById(id);
    if (!existing) throw new Error(`Usuário ${id} não encontrado.`);
    const updated = { ...existing, ...partial };
    dbStore.users.set(id, updated);
    return updated;
  }

  async listAll(): Promise<UserEntity[]> {
    return Array.from(dbStore.users.values());
  }
}

export class MembershipRepository implements IMembershipRepository {
  async findById(id: string): Promise<OrganizationMemberEntity | null> {
    return dbStore.members.get(id) || null;
  }

  async findByOrgAndUser(orgId: string, userId: string): Promise<OrganizationMemberEntity | null> {
    for (const m of dbStore.members.values()) {
      if (m.organizationId === orgId && m.userId === userId && m.status === "ACTIVE") {
        return m;
      }
    }
    return null;
  }

  async listByUser(userId: string): Promise<OrganizationMemberEntity[]> {
    const list: OrganizationMemberEntity[] = [];
    for (const m of dbStore.members.values()) {
      if (m.userId === userId && m.status === "ACTIVE") {
        list.push(m);
      }
    }
    return list;
  }

  async listByOrg(orgId: string): Promise<OrganizationMemberEntity[]> {
    const list: OrganizationMemberEntity[] = [];
    for (const m of dbStore.members.values()) {
      if (m.organizationId === orgId && m.status === "ACTIVE") {
        list.push(m);
      }
    }
    return list;
  }

  async create(member: OrganizationMemberEntity): Promise<OrganizationMemberEntity> {
    dbStore.members.set(member.id, member);
    return member;
  }

  async update(id: string, partial: Partial<OrganizationMemberEntity>): Promise<OrganizationMemberEntity> {
    const existing = await this.findById(id);
    if (!existing) throw new Error(`Membro ${id} não encontrado.`);
    const updated = { ...existing, ...partial };
    dbStore.members.set(id, updated);
    return updated;
  }
}

export class SubscriptionRepository implements ISubscriptionRepository {
  async findByOrgId(orgId: string): Promise<SubscriptionEntity | null> {
    return dbStore.subscriptions.get(orgId) || null;
  }

  async create(subscription: SubscriptionEntity): Promise<SubscriptionEntity> {
    dbStore.subscriptions.set(subscription.organizationId, subscription);
    return subscription;
  }

  async update(orgId: string, partial: Partial<SubscriptionEntity>): Promise<SubscriptionEntity> {
    const existing = await this.findByOrgId(orgId);
    if (!existing) throw new Error(`Assinatura para ${orgId} não encontrada.`);
    const updated = {
      ...existing,
      ...partial,
      updatedAt: new Date().toISOString().replace("T", " ").substring(0, 16),
    };
    dbStore.subscriptions.set(orgId, updated);
    return updated;
  }

  async listAll(): Promise<SubscriptionEntity[]> {
    return Array.from(dbStore.subscriptions.values());
  }
}

export class PlanRepository implements IPlanRepository {
  async findById(id: SaaSPlanId): Promise<PlanDefinition | null> {
    return dbStore.plans.get(id) || null;
  }

  async listAll(): Promise<PlanDefinition[]> {
    return Array.from(dbStore.plans.values());
  }

  async create(plan: PlanDefinition): Promise<PlanDefinition> {
    dbStore.plans.set(plan.id, plan);
    return plan;
  }
}

export class ModuleRepository implements IModuleRepository {
  async listByOrgId(orgId: string): Promise<OrganizationModuleEntity[]> {
    return dbStore.organizationModules.get(orgId) || [];
  }

  async setModuleStatus(
    orgId: string,
    moduleKey: SystemModuleKey,
    isEnabled: boolean
  ): Promise<OrganizationModuleEntity> {
    let modules = dbStore.organizationModules.get(orgId) || [];
    let existing = modules.find((m) => m.moduleKey === moduleKey);

    if (existing) {
      existing.isEnabled = isEnabled;
    } else {
      existing = {
        id: `mod-${orgId}-${moduleKey}`,
        organizationId: orgId,
        moduleKey,
        isEnabled,
        activatedAt: new Date().toISOString().replace("T", " ").substring(0, 16),
      };
      modules.push(existing);
    }
    dbStore.organizationModules.set(orgId, modules);
    return existing;
  }

  async bulkInitialize(orgId: string, allowedKeys: SystemModuleKey[]): Promise<OrganizationModuleEntity[]> {
    const modules: OrganizationModuleEntity[] = allowedKeys.map((key) => ({
      id: `mod-${orgId}-${key}`,
      organizationId: orgId,
      moduleKey: key,
      isEnabled: true,
      activatedAt: new Date().toISOString().replace("T", " ").substring(0, 16),
    }));
    dbStore.organizationModules.set(orgId, modules);
    return modules;
  }
}

// Single instance export for repositories
export const orgRepo = new OrganizationRepository();
export const userRepo = new UserRepository();
export const memberRepo = new MembershipRepository();
export const subRepo = new SubscriptionRepository();
export const planRepo = new PlanRepository();
export const moduleRepo = new ModuleRepository();
