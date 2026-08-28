import { orgRepo, subRepo, planRepo, moduleRepo } from "../repositories";
import {
  SubscriptionEntity,
  SaaSPlanId,
  SystemModuleKey,
  OrganizationModuleEntity,
} from "../types/saas";

export class SubscriptionService {
  /**
   * Returns current subscription details, remaining trial days, and module authorizations for a tenant.
   */
  static async getTenantSubscription(organizationId: string) {
    const org = await orgRepo.findById(organizationId);
    if (!org) {
      throw new Error(`Organização ${organizationId} não encontrada`);
    }

    const subscription = await subRepo.findByOrgId(organizationId);
    if (!subscription) {
      throw new Error(`Assinatura para ${organizationId} não encontrada`);
    }

    const plan = (await planRepo.findById(subscription.planId)) || (await planRepo.findById("TRIAL_30D"))!;

    const now = new Date();
    const trialEnd = new Date(subscription.trialEndsAt);
    const msRemaining = trialEnd.getTime() - now.getTime();
    const daysRemaining = Math.max(0, Math.ceil(msRemaining / (1000 * 60 * 60 * 24)));

    // Active modules for this tenant
    const orgModules = await moduleRepo.listByOrgId(organizationId);
    const enabledModules = orgModules.filter((m) => m.isEnabled).map((m) => m.moduleKey);
    const allPlans = await planRepo.listAll();

    return {
      subscription,
      plan,
      trial: {
        isTrial: subscription.planId === "TRIAL_30D" || subscription.status === "TRIALING",
        daysRemaining,
        trialStartedAt: subscription.trialStartedAt,
        trialEndsAt: subscription.trialEndsAt,
        isExpired: daysRemaining <= 0 && subscription.status === "TRIALING",
      },
      status: subscription.status,
      allowedModules: plan.allowedModules,
      enabledModules,
      allPlans,
    };
  }

  /**
   * Simulates upgrading/subscribing to a paid plan with payment webhook confirmation.
   */
  static async simulateSubscriptionPayment(data: {
    organizationId: string;
    targetPlanId: SaaSPlanId;
    paymentMethod: "PIX" | "CREDIT_CARD" | "BOLETO";
  }) {
    const { organizationId, targetPlanId, paymentMethod } = data;
    const subscription = await subRepo.findByOrgId(organizationId);
    const plan = await planRepo.findById(targetPlanId);

    if (!subscription || !plan) {
      throw new Error("Assinatura ou Plano inválido.");
    }

    const now = new Date();
    const nextPeriod = new Date(now.getTime() + 30 * 86400000);

    const updatedSubscription = await subRepo.update(organizationId, {
      planId: targetPlanId,
      status: "ACTIVE",
      paymentMethod,
      currentPeriodStart: now.toISOString().replace("T", " ").substring(0, 16),
      currentPeriodEnd: nextPeriod.toISOString().replace("T", " ").substring(0, 16),
      updatedAt: now.toISOString().replace("T", " ").substring(0, 16),
    });

    // Sync enabled modules with the newly chosen plan
    await moduleRepo.bulkInitialize(organizationId, plan.allowedModules);

    return {
      success: true,
      message: `Assinatura do plano ${plan.name} ativada com sucesso via ${paymentMethod}!`,
      subscription: updatedSubscription,
      plan,
    };
  }

  /**
   * Toggle a specific module for a tenant (if permitted by current plan).
   */
  static async toggleModule(organizationId: string, moduleKey: SystemModuleKey, enable: boolean) {
    const subInfo = await this.getTenantSubscription(organizationId);
    if (!subInfo.allowedModules.includes(moduleKey)) {
      throw new Error(
        `O módulo ${moduleKey} não é permitido no seu plano atual (${subInfo.plan.name}). Faça upgrade para ativá-lo.`
      );
    }

    const updated = await moduleRepo.setModuleStatus(organizationId, moduleKey, enable);
    return { success: true, moduleKey, isEnabled: updated.isEnabled };
  }
}
