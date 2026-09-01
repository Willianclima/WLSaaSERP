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
} from "lucide-react";

interface TrialStatusBannerProps {
  remainingDays?: number;
  trialEndsAt?: string;
  storeName?: string;
  onOpenOnboarding: () => void;
  onOpenStorefront: () => void;
  onOpenShareModal: () => void;
  onOpenSettings: () => void;
}

export const TrialStatusBanner: React.FC<TrialStatusBannerProps> = ({
  remainingDays = 27,
  trialEndsAt = "2026-09-28",
  storeName = "Lumina Semijoias",
  onOpenOnboarding,
  onOpenStorefront,
  onOpenShareModal,
  onOpenSettings,
}) => {
  return (
    <div className="bg-gradient-to-r from-stone-900 via-stone-950 to-stone-900 border-b border-amber-500/30 text-stone-100 py-2.5 px-4 sm:px-6">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-2.5 sm:gap-4 text-xs">
        {/* Left: Status & Days Remaining */}
        <div className="flex items-center flex-wrap gap-2.5 justify-center md:justify-start">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/20 text-amber-300 border border-amber-400/40 font-bold uppercase tracking-wider text-[10px]">
            <Crown className="w-3.5 h-3.5 text-amber-400" />
            <span>Cliente Piloto 01 • Trial Assistido</span>
          </div>

          <div className="flex items-center gap-1.5 text-stone-300 font-medium">
            <Calendar className="w-3.5 h-3.5 text-amber-400" />
            <span>
              Restam <strong className="text-amber-300 font-bold">{remainingDays} dias</strong> de validação real
            </span>
          </div>

          <span className="hidden lg:inline text-stone-600">•</span>

          <div className="hidden lg:flex items-center gap-1.5 text-stone-400 text-[11px]">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>Persistência Real em Nuvem Ativa</span>
          </div>
        </div>

        {/* Right: Quick Actions */}
        <div className="flex items-center gap-2 flex-wrap justify-center">
          <button
            onClick={onOpenOnboarding}
            className="flex items-center gap-1 px-3 py-1 rounded-lg bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold text-xs transition-all shadow-xs cursor-pointer"
            title="Abrir o assistente passo a passo de configuração da loja"
          >
            <Sparkles className="w-3 h-3" />
            <span>Assistente de Onboarding</span>
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
