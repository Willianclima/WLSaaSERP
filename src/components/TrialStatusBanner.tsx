import React from "react";
import {
  Crown,
  Sparkles,
  Calendar,
  ShieldCheck,
  ShoppingBag,
  Sliders,
  Share2,
  CheckCircle2,
  Zap,
  AlertTriangle,
  Lock,
  ArrowRight,
  RefreshCw,
  CreditCard,
  Wrench,
} from "lucide-react";

interface TrialStatusBannerProps {
  remainingDays?: number;
  trialEndsAt?: string;
  storeName?: string;
  isExpired?: boolean;
  status?: string;
  isAssistedSupport?: boolean;
  onOpenOnboarding: () => void;
  onOpenStorefront: () => void;
  onOpenShareModal: () => void;
  onOpenSettings: () => void;
  onOpenCriticalPath?: () => void;
  onOpenBilling?: () => void;
  onSimulateExpiry?: () => void;
  onReactivate?: () => void;
  onOpenAudit?: () => void;
}

export const TrialStatusBanner: React.FC<TrialStatusBannerProps> = ({
  remainingDays = 27,
  trialEndsAt = "2026-09-28",
  storeName = "Lumina Semijoias",
  isExpired = false,
  status = "TRIALING",
  isAssistedSupport = false,
  onOpenOnboarding,
  onOpenStorefront,
  onOpenShareModal,
  onOpenSettings,
  onOpenCriticalPath,
  onOpenBilling,
  onSimulateExpiry,
  onReactivate,
  onOpenAudit,
}) => {
  // 1. Cenário: Período de Teste / Assinatura Expirada (TESTE 6 — Ciclo Comercial)
  if (isExpired || status === "EXPIRED" || status === "READ_ONLY") {
    return (
      <div className="bg-gradient-to-r from-stone-950 via-rose-950/80 to-stone-950 border-b border-rose-500/40 text-stone-100 py-3 px-4 sm:px-6 shadow-md animate-fadeIn">
        <div className="max-w-7xl mx-auto flex flex-col lg:flex-row items-center justify-between gap-3 text-xs">
          {/* Left: Expired Warning & Data Safety Guarantee */}
          <div className="flex items-center flex-wrap gap-2.5 justify-center lg:justify-start">
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/50 font-bold uppercase tracking-wider text-[10px]">
              <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
              <span>Período de Teste Finalizado • Modo Somente-Leitura</span>
            </div>

            <div className="flex items-center gap-1.5 text-stone-200 font-medium">
              <Lock className="w-3.5 h-3.5 text-amber-400" />
              <span>
                Novas vendas e cadastros pausados. <strong className="text-emerald-400 font-bold">Todos os seus dados (produtos, estoque, clientes e pedidos) estão 100% seguros e preservados.</strong>
              </span>
            </div>
          </div>

          {/* Right: Plan Activation & Audit Actions */}
          <div className="flex items-center gap-2 flex-wrap justify-center">
            {onOpenBilling && (
              <button
                onClick={onOpenBilling}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-stone-950 font-bold text-xs transition-all shadow-md cursor-pointer animate-pulse"
                title="Ativar plano comercial agora via PIX, Cartão ou Boleto"
              >
                <CreditCard className="w-3.5 h-3.5 text-stone-950" />
                <span>Ativar Meu Plano Agora</span>
                <ArrowRight className="w-3 h-3 text-stone-950 ml-0.5" />
              </button>
            )}

            {onReactivate && (
              <button
                onClick={onReactivate}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-emerald-300 border border-emerald-500/30 text-[11px] font-semibold transition-all cursor-pointer"
                title="Reativar trial para continuar testes e auditoria de funcionalidades"
              >
                <RefreshCw className="w-3 h-3 text-emerald-400" />
                <span>Reativar Trial</span>
              </button>
            )}

            {onOpenAudit && (
              <button
                onClick={onOpenAudit}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[11px] font-semibold transition-all cursor-pointer"
                title="Abrir Console de Auditoria de Acesso e Ciclo Comercial (6 Testes)"
              >
                <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
                <span>Auditoria SaaS (6 Testes)</span>
              </button>
            )}

            <button
              onClick={onOpenStorefront}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-stone-900 hover:bg-stone-800 text-stone-300 border border-stone-800 text-[11px] font-medium transition-all cursor-pointer"
              title="Visualizar a vitrine pública da loja"
            >
              <ShoppingBag className="w-3 h-3 text-amber-400" />
              <span>Ver Catálogo</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 2. Cenário Padrão: Período de Teste Ativo (Com indicador de suporte assistido se for SuperAdmin)
  return (
    <div className="bg-gradient-to-r from-stone-900 via-stone-950 to-stone-900 border-b border-amber-500/30 text-stone-100 py-2.5 px-4 sm:px-6">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-2.5 sm:gap-4 text-xs">
        {/* Left: Status & Days Remaining */}
        <div className="flex items-center flex-wrap gap-2.5 justify-center md:justify-start">
          {isAssistedSupport ? (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-500/20 text-blue-300 border border-blue-400/40 font-bold uppercase tracking-wider text-[10px]">
              <Wrench className="w-3.5 h-3.5 text-blue-400" />
              <span>SuperAdmin • Suporte Assistido Supervisionado</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/20 text-amber-300 border border-amber-400/40 font-bold uppercase tracking-wider text-[10px]">
              <Crown className="w-3.5 h-3.5 text-amber-400" />
              <span>Cliente Piloto 01 • Trial 30 Dias</span>
            </div>
          )}

          <div className="flex items-center gap-1.5 text-stone-300 font-medium">
            <Calendar className="w-3.5 h-3.5 text-amber-400" />
            <span>
              Restam <strong className="text-amber-300 font-bold">{remainingDays} dias</strong> de validação real
            </span>
          </div>

          <span className="hidden lg:inline text-stone-600">•</span>

          <div className="hidden lg:flex items-center gap-1.5 text-stone-400 text-[11px]">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>Persistência PostgreSQL & RLS Ativa</span>
          </div>
        </div>

        {/* Right: Quick Actions */}
        <div className="flex items-center gap-2 flex-wrap justify-center">
          {/* Quick Simulation Button for Testing Expiration Cycle (TESTE 6) */}
          {onSimulateExpiry && (
            <button
              onClick={onSimulateExpiry}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 text-[11px] font-medium transition-all cursor-pointer"
              title="Auditar TESTE 6: Simular expiração de período de teste e bloqueio de novas vendas"
            >
              <AlertTriangle className="w-3 h-3 text-rose-400" />
              <span>Simular Expiração</span>
            </button>
          )}

          {onOpenAudit && (
            <button
              onClick={onOpenAudit}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-stone-800 hover:bg-stone-700 text-amber-300 border border-amber-500/30 text-[11px] font-medium transition-all cursor-pointer"
              title="Abrir Console de Auditoria de Acesso e Ciclo Comercial (6 Testes)"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
              <span>Auditoria SaaS (6 Testes)</span>
            </button>
          )}

          {onOpenBilling && (
            <button
              onClick={onOpenBilling}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 font-bold text-xs transition-all shadow-xs cursor-pointer"
              title="Ver planos e assinar"
            >
              <CreditCard className="w-3 h-3 text-amber-400" />
              <span>Assinatura SaaS</span>
            </button>
          )}

          {onOpenCriticalPath && (
            <button
              onClick={onOpenCriticalPath}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-400/20 hover:bg-amber-400/30 text-amber-300 border border-amber-400/50 font-bold text-xs transition-all shadow-xs cursor-pointer"
              title="Visualizar o Caminho Crítico do Negócio (Fluxo de Venda)"
            >
              <Zap className="w-3 h-3 text-amber-400" />
              <span>Caminho Crítico</span>
            </button>
          )}

          <button
            onClick={onOpenOnboarding}
            className="flex items-center gap-1 px-3 py-1 rounded-lg bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold text-xs transition-all shadow-xs cursor-pointer"
            title="Abrir o assistente passo a passo de configuração da loja"
          >
            <Sparkles className="w-3 h-3" />
            <span>Onboarding</span>
          </button>

          <button
            onClick={onOpenShareModal}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-600/80 hover:bg-emerald-600 text-white font-medium text-xs transition-all cursor-pointer"
            title="Compartilhar catálogo via WhatsApp e Instagram"
          >
            <Share2 className="w-3 h-3" />
            <span>Compartilhar</span>
          </button>

          <button
            onClick={onOpenStorefront}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-stone-800 hover:bg-stone-700 text-amber-300 font-medium text-xs transition-all border border-stone-700 cursor-pointer"
            title="Abrir a vitrine que as clientes acessam"
          >
            <ShoppingBag className="w-3 h-3" />
            <span>Loja do Comprador</span>
          </button>
        </div>
      </div>
    </div>
  );
};
