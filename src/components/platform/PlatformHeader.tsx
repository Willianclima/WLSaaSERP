import React, { useState } from "react";
import {
  ShieldCheck,
  Building2,
  Layers,
  ChevronDown,
  ArrowRight,
  ExternalLink,
  Sparkles,
  RefreshCw,
  LogOut,
  Sliders,
  Check,
} from "lucide-react";
import { TenantStore, RBACUser } from "../../types";

export type ProductMode = "PLATFORM_OWNER" | "TENANT_STORE";

interface PlatformHeaderProps {
  currentUser: RBACUser;
  currentMode: ProductMode;
  selectedTenant: TenantStore;
  tenants: TenantStore[];
  onSwitchMode: (mode: ProductMode) => void;
  onSelectTenant: (tenant: TenantStore) => void;
  onOpenStorefrontPreview: () => void;
}

export const PlatformHeader: React.FC<PlatformHeaderProps> = ({
  currentUser,
  currentMode,
  selectedTenant,
  tenants,
  onSwitchMode,
  onSelectTenant,
  onOpenStorefrontPreview,
}) => {
  const [showTenantDropdown, setShowTenantDropdown] = useState(false);

  // If user is not super admin, this master platform header doesn't render
  if (currentUser.role !== "SUPER_ADMIN") {
    return null;
  }

  return (
    <header className="bg-stone-950 text-stone-200 border-b border-stone-800 sticky top-0 z-40 px-3 sm:px-6 py-2.5 shadow-md">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-3">
        {/* Left: Brand + Platform Identity */}
        <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-start">
          <div className="flex items-center gap-2">
            <span className="w-7 h-7 rounded-xl bg-gradient-to-tr from-amber-500 to-amber-300 flex items-center justify-center font-serif font-black text-stone-950 text-xs shadow-sm">
              W
            </span>
            <div>
              <span className="font-bold text-white text-xs tracking-tight">WLSaaSERP</span>
              <span className="hidden sm:inline-block ml-2 px-2 py-0.5 rounded-md bg-amber-400/20 text-amber-300 border border-amber-400/40 text-[9px] font-bold uppercase tracking-wider">
                Platform Owner
              </span>
            </div>
          </div>

          {/* Quick mode indicator on mobile */}
          <span className="md:hidden text-[10px] font-bold text-stone-400">
            {currentMode === "PLATFORM_OWNER" ? "Central SaaS" : selectedTenant.name}
          </span>
        </div>

        {/* Center: The Two Products Switcher */}
        <div className="flex items-center bg-stone-900 border border-stone-800 p-1 rounded-2xl w-full sm:w-auto justify-center">
          <button
            onClick={() => onSwitchMode("PLATFORM_OWNER")}
            className={`flex items-center gap-1.5 px-3 sm:px-4 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              currentMode === "PLATFORM_OWNER"
                ? "bg-amber-400 text-stone-950 shadow-sm"
                : "text-stone-300 hover:text-white"
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Central da Plataforma</span>
            <span className="text-[9px] opacity-70 hidden sm:inline">(Produto 2)</span>
          </button>

          <button
            onClick={() => onSwitchMode("TENANT_STORE")}
            className={`flex items-center gap-1.5 px-3 sm:px-4 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              currentMode === "TENANT_STORE"
                ? "bg-amber-400 text-stone-950 shadow-sm"
                : "text-stone-300 hover:text-white"
            }`}
          >
            <Building2 className="w-3.5 h-3.5" />
            <span>Sistema da Loja</span>
            <span className="text-[9px] opacity-70 hidden sm:inline">(Produto 1)</span>
          </button>
        </div>

        {/* Right: Tenant Context & Actions */}
        <div className="flex items-center gap-2.5 w-full md:w-auto justify-end">
          {/* Tenant Selector Dropdown (When in or switching to Store Mode) */}
          <div className="relative">
            <button
              onClick={() => setShowTenantDropdown(!showTenantDropdown)}
              className="flex items-center gap-2 px-3 py-1.5 bg-stone-900 hover:bg-stone-800 border border-stone-800 rounded-xl text-xs text-stone-200 transition-all cursor-pointer"
              title="Trocar loja ativa / Simular acesso de cliente"
            >
              <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-stone-400 text-[11px] hidden sm:inline">Loja:</span>
              <span className="font-bold text-white max-w-[130px] truncate">{selectedTenant.name}</span>
              <ChevronDown className="w-3.5 h-3.5 text-stone-400" />
            </button>

            {showTenantDropdown && (
              <>
                <div
                  className="fixed inset-0 z-30"
                  onClick={() => setShowTenantDropdown(false)}
                />
                <div className="absolute right-0 mt-2 w-64 bg-stone-900 border border-stone-800 rounded-2xl shadow-2xl p-2 z-40 space-y-1 text-xs animate-scaleUp">
                  <div className="px-2.5 py-1.5 text-[10px] font-bold uppercase text-stone-400 tracking-wider">
                    Alternar Contexto de Loja (RLS):
                  </div>
                  {tenants.map((t) => (
                    <button
                      key={t.id}
                      onClick={() => {
                        onSelectTenant(t);
                        setShowTenantDropdown(false);
                      }}
                      className={`w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-left transition-colors cursor-pointer ${
                        t.id === selectedTenant.id
                          ? "bg-amber-400 text-stone-950 font-bold"
                          : "text-stone-300 hover:bg-stone-800"
                      }`}
                    >
                      <div className="truncate">
                        <p className="truncate font-semibold">{t.name}</p>
                        <p className={`text-[10px] ${t.id === selectedTenant.id ? "text-stone-800" : "text-stone-400"}`}>
                          Plano {t.planTier || "PRO"}
                        </p>
                      </div>
                      {t.id === selectedTenant.id && <Check className="w-3.5 h-3.5 shrink-0" />}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Quick Peek at Consumer Storefront */}
          <button
            onClick={onOpenStorefrontPreview}
            className="p-1.5 sm:px-2.5 sm:py-1.5 bg-stone-800 hover:bg-stone-700 text-stone-300 hover:text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
            title="Abrir Vitrine Pública como Consumidor"
          >
            <ExternalLink className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden lg:inline">Ver Vitrine</span>
          </button>
        </div>
      </div>
    </header>
  );
};
