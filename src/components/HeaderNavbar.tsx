import React, { useState } from "react";
import {
  Home,
  ShoppingBag,
  Package,
  Users,
  Layers,
  ShieldCheck,
  Sliders,
  Share2,
  ExternalLink,
  ChevronDown,
  Sparkles,
  RefreshCw,
  Zap,
  Bot,
  Lock,
  BookOpen,
  Crown,
  Building2,
  Store,
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
  onOpenShareModal?: () => void;
  onOpenNewSale?: () => void;
  onOpenHelp?: () => void;
}

export const HeaderNavbar: React.FC<HeaderNavbarProps> = ({
  activeTab,
  onTabChange,
  onSelectTab,
  selectedTenant,
  currentTenant,
  branding,
  onOpenShareModal,
  onOpenNewSale,
  onOpenHelp,
}) => {
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const handleTabChange = onTabChange || onSelectTab || (() => {});
  const tenant = selectedTenant || currentTenant || {
    id: "tenant-lumina",
    name: "Lumina Semijoias",
    slug: "lumina-semijoias",
    planTier: "PREMIUM" as const,
    tier: "PREMIUM",
  };

  const storeName = branding?.logoText || tenant.name || "Lumina Semijoias";

  // The 7-8 primary core commercial tabs
  const mainNavTabs = [
    { id: "ownerHome", label: "Início", icon: Home, badge: null },
    { id: "orders", label: "Vendas & Pedidos", icon: ShoppingBag, badge: null },
    { id: "catalog", label: "Produtos", icon: Sparkles, badge: null },
    { id: "customers", label: "Clientes", icon: Users, badge: null },
    { id: "inventory", label: "Estoque", icon: Package, badge: null },
    { id: "storefront", label: "📲 Minha Vitrine", icon: Store, isStore: true },
    { id: "warranties", label: "Garantias", icon: ShieldCheck, badge: null },
    { id: "storeSettings", label: "Minha Loja", icon: Sliders, badge: null },
  ];

  // Secondary/Advanced tools in dropdown (hidden from daily clutter)
  const advancedTabs = [
    { id: "consignments", label: "Consignações & Maletas", icon: RefreshCw },
    { id: "commissions", label: "Comissões & Metas", icon: Zap },
    { id: "customJewelry", label: "Personalizados", icon: Crown },
    { id: "saasBilling", label: "Gestão SaaS & Trial 30d", icon: Building2 },
    { id: "aiGateway", label: "AI Copilot MCP", icon: Bot },
    { id: "security", label: "Segurança & LGPD", icon: Lock },
    { id: "architecture", label: "Plano de Arquitetura", icon: BookOpen },
  ];

  const isAdvancedActive = advancedTabs.some((t) => t.id === activeTab);

  return (
    <header className="bg-white border-b border-stone-200 text-stone-900 sticky top-0 z-40 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Top bar */}
        <div className="flex items-center justify-between h-16">
          {/* Brand & Store Identity */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => handleTabChange("ownerHome")}
              className="text-left flex items-center gap-2.5 group cursor-pointer"
            >
              <div className="w-9 h-9 rounded-xl bg-stone-900 text-amber-300 flex items-center justify-center font-serif italic font-bold text-sm shadow-xs group-hover:scale-105 transition-transform">
                💎
              </div>
              <div>
                <h1 className="text-lg sm:text-xl font-serif font-bold text-stone-900 group-hover:text-amber-800 transition-colors leading-tight">
                  {storeName}
                </h1>
                <span className="text-[10px] font-medium text-emerald-800 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Loja Online Ativa
                </span>
              </div>
            </button>
          </div>

          {/* Right Utility & Quick Actions */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Help / Assistant Button */}
            {onOpenHelp && (
              <button
                onClick={onOpenHelp}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-semibold tracking-wide transition-all cursor-pointer shadow-2xs"
                title="Tire dúvidas sobre como usar o sistema"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                <span className="hidden sm:inline">Precisa de ajuda?</span>
              </button>
            )}

            {/* Quick New Sale button */}
            {onOpenNewSale && (
              <button
                onClick={onOpenNewSale}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold tracking-wide transition-all shadow-xs cursor-pointer active:scale-95"
              >
                <span>➕ Nova Venda</span>
              </button>
            )}

            {/* Share Catalog button */}
            {onOpenShareModal && (
              <button
                onClick={onOpenShareModal}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-50 hover:bg-amber-100/80 border border-amber-200 text-amber-950 text-xs font-bold tracking-wide transition-all shadow-xs cursor-pointer"
                title="Compartilhar catálogo via WhatsApp e Instagram"
              >
                <Share2 className="w-3.5 h-3.5 text-amber-700" />
                <span className="hidden sm:inline">Enviar Link</span>
              </button>
            )}

            {/* Storefront button */}
            <button
              onClick={() => handleTabChange("storefront")}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-stone-900 hover:bg-stone-800 text-amber-300 text-xs font-bold tracking-wide transition-all shadow-xs cursor-pointer"
            >
              <Store className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden sm:inline">Ver Vitrine</span>
              <ExternalLink className="w-3 h-3 text-stone-400" />
            </button>
          </div>
        </div>

        {/* Clean, Humanized Main Navigation Tabs */}
        <div className="flex items-center justify-between border-t border-stone-100 overflow-x-auto py-1 scrollbar-none">
          <div className="flex space-x-1 sm:space-x-2">
            {mainNavTabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id || (tab.id === "catalog" && activeTab === "inventory");
              return (
                <button
                  key={tab.id}
                  onClick={() => handleTabChange(tab.id)}
                  className={`flex items-center gap-1.5 px-3 py-2 text-xs font-semibold tracking-wide whitespace-nowrap transition-all rounded-lg cursor-pointer ${
                    isActive
                      ? "bg-stone-900 text-white font-bold shadow-xs"
                      : "text-stone-600 hover:text-stone-900 hover:bg-stone-100"
                  } ${tab.isStore ? "text-amber-900 font-bold bg-amber-50 hover:bg-amber-100 border border-amber-200/60" : ""}`}
                >
                  <Icon className={`w-3.5 h-3.5 ${isActive ? "text-amber-300" : tab.isStore ? "text-amber-800" : "text-stone-500"}`} />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* Secondary / Advanced Dropdown Menu */}
          <div className="relative shrink-0 pl-2">
            <button
              onClick={() => setShowMoreMenu(!showMoreMenu)}
              className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                isAdvancedActive
                  ? "bg-stone-200 text-stone-900 font-bold"
                  : "text-stone-500 hover:text-stone-800 hover:bg-stone-100"
              }`}
            >
              <span>Mais</span>
              <ChevronDown className={`w-3 h-3 transition-transform ${showMoreMenu ? "rotate-180" : ""}`} />
            </button>

            {showMoreMenu && (
              <>
                <div
                  className="fixed inset-0 z-30"
                  onClick={() => setShowMoreMenu(false)}
                />
                <div className="absolute right-0 mt-1 w-56 bg-white rounded-2xl shadow-xl border border-stone-200 py-2 z-40 space-y-0.5 animate-fadeIn">
                  <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-stone-400 border-b border-stone-100 mb-1">
                    Ferramentas Avançadas
                  </div>
                  {advancedTabs.map((tab) => {
                    const Icon = tab.icon;
                    const isActive = activeTab === tab.id;
                    return (
                      <button
                        key={tab.id}
                        onClick={() => {
                          handleTabChange(tab.id);
                          setShowMoreMenu(false);
                        }}
                        className={`w-full text-left flex items-center gap-2.5 px-3 py-2 text-xs transition-colors cursor-pointer ${
                          isActive
                            ? "bg-amber-50 text-amber-950 font-bold"
                            : "text-stone-700 hover:bg-stone-100"
                        }`}
                      >
                        <Icon className={`w-4 h-4 ${isActive ? "text-amber-700" : "text-stone-500"}`} />
                        <span>{tab.label}</span>
                      </button>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
