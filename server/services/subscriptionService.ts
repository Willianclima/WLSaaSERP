import { orgRepo, subRepo, planRepo, moduleRepo } from "../repositories";
import {
  SubscriptionEntity,
  SubscriptionStatus,
  SaaSPlanId,
  SystemModuleKey,
} from "../types/saas";
import { auditService } from "./auditService";

/**
 * Standardized SaaS Commercial Lifecycle State Transitions:
 * TRIALING -> ACTIVE (upon payment)
 * ACTIVE -> PAST_DUE (payment overdue)
 * PAST_DUE -> READ_ONLY (grace period ended, read-only mode)
 * READ_ONLY -> SUSPENDED (prolonged non-payment)
 * SUSPENDED -> CANCELED (canceled)
 * And: TRIALING, PAST_DUE, READ_ONLY, SUSPENDED -> ACTIVE (upon payment approval)
 */
export const ALLOWED_SUBSCRIPTION_TRANSITIONS: Record<SubscriptionStatus, SubscriptionStatus[]> = {
  TRIALING: ["ACTIVE", "PAST_DUE", "READ_ONLY", "EXPIRED", "CANCELED"],
  ACTIVE: ["ACTIVE", "PAST_DUE", "READ_ONLY", "SUSPENDED", "CANCELED"],
  PAST_DUE: ["ACTIVE", "READ_ONLY", "SUSPENDED", "CANCELED"],
  READ_ONLY: ["ACTIVE", "SUSPENDED", "CANCELED"],
  SUSPENDED: ["ACTIVE", "CANCELED"],
  CANCELED: ["ACTIVE"],
  EXPIRED: ["ACTIVE", "READ_ONLY", "CANCELED"],
};

export class SubscriptionService {
  /**
   * Validates whether a state transition is permitted in the SaaS lifecycle state machine.
   */
  static isValidTransition(from: SubscriptionStatus, to: SubscriptionStatus): boolean {
    const allowed = ALLOWED_SUBSCRIPTION_TRANSITIONS[from];
    return allowed ? allowed.includes(to) : false;
  }

  /**
   * Transitions subscription status with strict FSM validation and audit logging.
   */
  static async transitionStatus(
    organizationId: string,
    targetStatus: SubscriptionStatus,
    reason?: string
  ): Promise<SubscriptionEntity> {
    return await auditService.withAudit(
      {
        organizationId,
        action: "SUBSCRIPTION_STATUS_CHANGED",
        entity: "SUBSCRIPTION",
        entityId: organizationId,
        critical: true,
        details: `Transição de status da assinatura para '${targetStatus}'. Motivo: ${reason || "Não especificado"}`,
        captureChanges: true,
      },
      async () => {
        const currentSub = await subRepo.findByOrgId(organizationId);
        if (!currentSub) {
          throw new Error(`Assinatura não encontrada para organização '${organizationId}'`);
        }

        if (!this.isValidTransition(currentSub.status, targetStatus)) {
          throw new Error(
            `Transição inválida no ciclo comercial da assinatura: de '${currentSub.status}' para '${targetStatus}'. Transições permitidas: ${ALLOWED_SUBSCRIPTION_TRANSITIONS[currentSub.status].join(", ")}.`
          );
        }

        const now = new Date();
        const updated = await subRepo.update(organizationId, {
          status: targetStatus,
          updatedAt: now.toISOString().replace("T", " ").substring(0, 16),
        });

        return updated;
      }
    );
  }

  /**
   * Activates subscription upon verified payment webhook.
   * Architecture: Payment Provider -> Webhook (Idempotent) -> SubscriptionService.activateSubscriptionFromPayment -> ACTIVE
   */
  static async activateSubscriptionFromPayment(data: {
    organizationId: string;
    targetPlanId: SaaSPlanId;
    invoiceId: string;
    paymentMethod: "PIX" | "CREDIT_CARD" | "BOLETO";
  }) {
    const { organizationId, targetPlanId, invoiceId, paymentMethod } = data;

    return await auditService.withAudit(
      {
        organizationId,
        action: "PLAN_ACTIVATED_FROM_PAYMENT",
        entity: "SUBSCRIPTION",
        entityId: organizationId,
        critical: true,
        details: `Assinatura ativada via Fatura ${invoiceId} (Plano: ${targetPlanId}, Método: ${paymentMethod})`,
        captureChanges: true,
      },
      async () => {
        const subscription = await subRepo.findByOrgId(organizationId);
        const plan = await planRepo.findById(targetPlanId);

        if (!subscription || !plan) {
          throw new Error("Assinatura ou Plano inválido para ativação.");
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

        // Sync enabled modules with the newly activated plan
        await moduleRepo.bulkInitialize(organizationId, plan.allowedModules);

        return {
          success: true,
          message: `Plano ${plan.name} ativado com sucesso após confirmação do pagamento (${paymentMethod})!`,
          subscription: updatedSubscription,
          plan,
        };
      }
    );
  }

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
   * Legacy simulation method for backward compatibility.
   */
  static async simulateSubscriptionPayment(data: {
    organizationId: string;
    targetPlanId: SaaSPlanId;
    paymentMethod: "PIX" | "CREDIT_CARD" | "BOLETO";
  }) {
    return this.activateSubscriptionFromPayment({
      organizationId: data.organizationId,
      targetPlanId: data.targetPlanId,
      invoiceId: `sim-inv-${Date.now()}`,
      paymentMethod: data.paymentMethod,
    });
  }

  /**
   * Toggle a specific module for a tenant (if permitted by current plan).
   */
  static async toggleModule(organizationId: string, moduleKey: SystemModuleKey, enable: boolean) {
    return await auditService.withAudit(
      {
        organizationId,
        action: "MODULE_TOGGLED",
        entity: "ORGANIZATION_MODULE",
        entityId: `${organizationId}:${moduleKey}`,
        critical: true,
        details: `Módulo '${moduleKey}' ${enable ? "ativado" : "desativado"} para a organização`,
      },
      async () => {
        const subInfo = await this.getTenantSubscription(organizationId);
        if (!subInfo.allowedModules.includes(moduleKey)) {
          throw new Error(
            `O módulo ${moduleKey} não é permitido no seu plano atual (${subInfo.plan.name}). Faça upgrade para ativá-lo.`
          );
        }

        const updated = await moduleRepo.setModuleStatus(organizationId, moduleKey, enable);
        return { success: true, moduleKey, isEnabled: updated.isEnabled };
      }
    );
  }

  /**
   * Simulates trial expiration for commercial lifecycle validation (TESTE 6).
   */
  static async simulateTrialExpiration(organizationId: string) {
    const yesterday = new Date(Date.now() - 86400000);
    const updated = await subRepo.update(organizationId, {
      status: "READ_ONLY",
      trialEndsAt: yesterday.toISOString().replace("T", " ").substring(0, 16),
      updatedAt: new Date().toISOString().replace("T", " ").substring(0, 16),
    });

    return {
      success: true,
      message: "Período de teste expirado propositalmente: organização em modo READ_ONLY.",
      subscription: updated,
    };
  }

  /**
   * Reativa a assinatura da organização para ACTIVE.
   */
  static async reactivateSubscription(organizationId: string) {
    const now = new Date();
    const future = new Date(now.getTime() + 30 * 86400000);
    const updated = await subRepo.update(organizationId, {
      status: "ACTIVE",
      currentPeriodStart: now.toISOString().replace("T", " ").substring(0, 16),
      currentPeriodEnd: future.toISOString().replace("T", " ").substring(0, 16),
      trialEndsAt: future.toISOString().replace("T", " ").substring(0, 16),
      updatedAt: now.toISOString().replace("T", " ").substring(0, 16),
    });

    return {
      success: true,
      message: "Assinatura reativada com sucesso para status ACTIVE!",
      subscription: updated,
    };
  }
}
