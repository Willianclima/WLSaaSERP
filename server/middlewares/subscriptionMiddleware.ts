import { Response, NextFunction } from "express";
import { AuthenticatedRequest } from "./authMiddleware";
import { subRepo } from "../repositories";
import { SubscriptionEntity } from "../types/saas";

/**
 * Middleware de Governança Comercial e Ciclo de Vida da Assinatura (SaaS Commercial Guard).
 *
 * Regras Estritas de Negócio:
 * 1. Identidade e Autenticação permanecem válidas mesmo após a expiração (o lojista consegue logar).
 * 2. Operações de Leitura (GET) são SEMPRE PERMITIDAS em modo somente-leitura (READ_ONLY):
 *    - O lojista pode consultar produtos, estoque, histórico de pedidos, clientes e garantias.
 *    - NENHUM dado é apagado ou retido.
 * 3. Operações Comerciais de Escrita (POST, PUT, PATCH, DELETE) são BLOQUEADAS quando:
 *    - status === 'EXPIRED'
 *    - status === 'READ_ONLY'
 *    - status === 'SUSPENDED'
 *    - status === 'CANCELED'
 *    - status === 'TRIALING' e a data atual ultrapassou trialEndsAt (expiração automática do trial).
 * 4. Super Admin em suporte assistido possui autorização para diagnosticar e atuar em nome da governança.
 */
export function enforceSubscriptionCommercialAccess() {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const isSuperAdmin = Boolean(req.user?.isPlatformSuperAdmin || req.userRole === "SUPER_ADMIN");
      const orgId = req.organizationId;

      // SuperAdmin em governança ou rotas sem escopo de organização passam direto
      if (isSuperAdmin || !orgId) {
        return next();
      }

      // Operações de leitura (GET, HEAD) são 100% liberadas mesmo para contas expiradas (Modo Consulta)
      if (req.method === "GET" || req.method === "HEAD") {
        return next();
      }

      // Rotas de pagamento, checkout de faturas e reativação da assinatura nunca podem ser bloqueadas pelo guard comercial!
      if (
        req.path.includes("/simulate-payment") ||
        req.path.includes("/billing") ||
        req.path.includes("/checkout") ||
        req.path.includes("/reactivate") ||
        req.path.includes("/simulate-expiry")
      ) {
        return next();
      }

      // Consulta a assinatura ativa no PostgreSQL
      const subscription = await subRepo.findByOrgId(orgId);

      if (!subscription) {
        return next();
      }

      const now = new Date();
      const trialEndsAt = subscription.trialEndsAt ? new Date(subscription.trialEndsAt) : null;
      const isTrialExpired =
        subscription.status === "TRIALING" && trialEndsAt !== null && trialEndsAt.getTime() < now.getTime();

      // Se o trial de 30 dias expirou, atualiza automaticamente o status no PostgreSQL para 'READ_ONLY'
      if (isTrialExpired && subscription.status === "TRIALING") {
        await subRepo.update(orgId, {
          status: "READ_ONLY",
          updatedAt: now.toISOString().replace("T", " ").substring(0, 16),
        });
        subscription.status = "READ_ONLY";
      }

      const isCommercialWriteBlocked =
        subscription.status === "EXPIRED" ||
        subscription.status === "READ_ONLY" ||
        subscription.status === "PAST_DUE" ||
        subscription.status === "SUSPENDED" ||
        subscription.status === "CANCELED";

      if (isCommercialWriteBlocked) {
        const errorMessages: Record<string, string> = {
          EXPIRED:
            "Seu período de teste terminou ou a assinatura expirou. O sistema está em modo somente-leitura para consulta de dados (produtos, pedidos, clientes e estoque preservados). Ative seu plano para registrar novas vendas e realizar cadastros.",
          READ_ONLY:
            "Sua conta está em modo Somente-Leitura (READ_ONLY). A visualização de catálogo, estoque, pedidos e clientes está 100% preservada. Ative seu plano para registrar novas vendas.",
          PAST_DUE:
            "Existe uma fatura em aberto com prazo expirado (PAST_DUE). O sistema limitou operações de escrita comercial até a regularização do pagamento via PIX, Boleto ou Cartão.",
          SUSPENDED:
            "Esta organização está suspensa comercialmente (SUSPENDED). Entre em contato com a Central de Atendimento ou efetue o pagamento para reativar o acesso integral.",
          CANCELED:
            "A assinatura desta organização foi cancelada (CANCELED). Seus dados continuam armazenados com segurança. Contrate um novo plano para reativar suas operações.",
        };

        const errorCode =
          subscription.status === "EXPIRED" || subscription.status === "READ_ONLY"
            ? "SUBSCRIPTION_EXPIRED"
            : `SUBSCRIPTION_${subscription.status}`;

        return res.status(403).json({
          success: false,
          code: errorCode,
          error: errorMessages[subscription.status] || errorMessages.READ_ONLY,
          subscriptionStatus: subscription.status,
          planId: subscription.planId,
          trialEndsAt: subscription.trialEndsAt,
          canRead: true,
          canWrite: false,
          requiredAction: "UPGRADE_PLAN",
        });
      }

      next();
    } catch (err: any) {
      console.error("[SubscriptionCommercialGuard Error]:", err);
      // Em caso de falha transitória na verificação, não trava a requisição
      next();
    }
  };
}
