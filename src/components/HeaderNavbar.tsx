import React from "react";
import {
  Home,
  Sparkles,
  Layers,
  Crown,
  Store,
  ShieldCheck,
  Zap,
  Bot,
  RefreshCw,
  BookOpen,
  Users,
  Lock,
  ShoppingBag,
  Sliders,
  Palette,
  Building2,
  UserCheck,
} from "lucide-react";
import { TenantStore, StoreBrandingConfig } from "../types";

interface HeaderNavbarProps {
  activeTab: string;
  onTabChange?: (tab: string) => void;
  onSelectTab?: (tab: string) => void;
  selectedTenant?: TenantStore;
  currentTenant?: TenantStore;
  branding?: StoreBrandingConfig;
  onTenantChange?: (tenant: TenantStore) => void;
  onSelectTenant?: (tenant: TenantStore) => void;
  tenants?: TenantStore[];
  onOpenArchitectureModal?: () => void;
}

export const HeaderNavbar: React.FC<HeaderNavbarProps> = ({
  activeTab,
  onTabChange,
  onSelectTab,
  selectedTenant,
  currentTenant,
  branding,
  onTenantChange,
  onSelectTenant,
  tenants = [],
  onOpenArchitectureModal,
}) => {
  const handleTabChange = onTabChange || onSelectTab || (() => {});
  const handleTenantChange = onTenantChange || onSelectTenant || (() => {});
  const tenant = selectedTenant || currentTenant || {
    id: "tenant-lumina",
    name: "Lumina Semijoias",
    slug: "lumina-semijoias",
    planTier: "PREMIUM" as const,
    tier: "PREMIUM",
  };

  const navTabs = [
    { id: "home", label: "Tela Inicial & Promos", icon: Home, isHome: true },
    { id: "dashboard", label: "Dashboard", icon: Layers },
    { id: "saasBilling", label: "SaaS Core & Trial 30d", icon: Building2, badge: "Multi-tenant" },
    { id: "storeSettings", label: "Configurações da Loja", icon: Sliders, badge: "Branding" },
    { id: "storefront", label: "✨ Loja do Comprador (B2C)", icon: ShoppingBag, isStore: true },
    { id: "catalog", label: "Catálogo & Ledger", icon: Sparkles },
    { id: "consignments", label: "Consignações", icon: RefreshCw, badge: "Maletas" },
    { id: "commissions", label: "Comissões & Metas", icon: Zap },
    { id: "orders", label: "Vendas Omnichannel", icon: Store },
    { id: "customers", label: "Clientes (PF/PJ)", icon: UserCheck, badge: "Sprint 3" },
    { id: "warranties", label: "Garantia Digital QR", icon: ShieldCheck },
    { id: "customJewelry", label: "Personalizados", icon: Crown },
    { id: "resellers", label: "Revendedoras", icon: Users },
    { id: "aiGateway", label: "AI Gateway MCP", icon: Bot, isMcp: true },
    { id: "security", label: "Segurança & LGPD", icon: Lock },
    { id: "architecture", label: "Arquitetura SaaS", icon: BookOpen },
  ];

  return (
    <header className="bg-white border-b border-stone-200 text-stone-900 sticky top-0 z-40 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Top bar */}
        <div className="flex items-center justify-between h-16">
          {/* Brand */}
          <div className="flex items-center gap-4">
            <button
              onClick={() => handleTabChange("dashboard")}
              className="text-left flex items-baseline gap-2.5 group cursor-pointer"
            >
              <h1 className="text-2xl sm:text-3xl tracking-wide font-serif italic font-bold text-stone-900 group-hover:text-stone-700 transition-colors">
                Lumina
              </h1>
              <span className="font-sans not-italic text-[10px] font-bold tracking-[0.25em] uppercase text-stone-400">
                ERP &amp; SaaS
              </span>
            </button>
          </div>

          {/* Right utility items */}
          <div className="flex items-center gap-3">
            {/* Storefront pill button */}
            <button
              onClick={() => handleTabChange("storefront")}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-stone-900 hover:bg-stone-800 text-amber-300 text-xs font-bold tracking-wide transition-all shadow-xs cursor-pointer"
            >
              <ShoppingBag className="w-3.5 h-3.5 text-amber-400" />
              <span>Ver Loja do Comprador</span>
            </button>

            {/* Architecture pill */}
            <button
              onClick={() => handleTabChange("architecture")}
              className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-stone-100 hover:bg-stone-200/80 border border-stone-200 text-stone-700 text-xs font-semibold tracking-wide transition-all"
            >
              <BookOpen className="w-3.5 h-3.5 text-stone-600" />
              <span>Plano de Arquitetura</span>
            </button>

            {/* Multi-tenant indicator */}
            <div className="hidden sm:flex items-center gap-2 bg-stone-100 px-3.5 py-1.5 rounded-full border border-stone-200">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[10px] font-bold uppercase tracking-wider text-stone-600">
                Tenant: {tenant.name}
              </span>
              <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-stone-200 text-stone-700 font-bold uppercase">
                {tenant.planTier || "PREMIUM"}
              </span>
            </div>

            {/* User Avatar */}
            <div className="w-8 h-8 rounded-full bg-stone-900 text-white flex items-center justify-center font-serif italic font-bold text-xs shadow-xs">
              LM
            </div>
          </div>
        </div>

        {/* Editorial Navigation Tabs */}
        <div className="flex space-x-1 overflow-x-auto py-1 scrollbar-none border-t border-stone-100">
          {navTabs.map((tab: any) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => handleTabChange(tab.id)}
                className={`flex items-center gap-1.5 px-3 py-2 text-xs font-semibold tracking-wide whitespace-nowrap transition-all border-b-2 ${
                  isActive
                    ? "border-stone-900 text-stone-900 font-bold"
                    : "border-transparent text-stone-500 hover:text-stone-800 hover:border-stone-300"
                } ${tab.isStore ? "text-amber-900 bg-amber-50/50 rounded-t-lg" : ""}`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? "text-stone-900" : tab.isStore ? "text-amber-700" : "text-stone-400"}`} />
                <span>{tab.label}</span>
                {tab.badge && (
                  <span className="text-[9px] bg-stone-100 border border-stone-200 text-stone-600 px-1.5 py-0.2 rounded-full font-medium">
                    {tab.badge}
                  </span>
                )}
                {tab.isMcp && (
                  <span className="text-[9px] bg-amber-100 border border-amber-200 text-amber-800 px-1.5 py-0.2 rounded-full font-bold uppercase">
                    AI
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </header>
  );
};
