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
  Edit3,
  DollarSign,
} from "lucide-react";
import { TenantStore, StoreBrandingConfig, RBACUser } from "../types";

interface HeaderNavbarProps {
  activeTab: string;
  onTabChange?: (tab: string) => void;
  onSelectTab?: (tab: string) => void;
  selectedTenant?: TenantStore;
  currentTenant?: TenantStore;
  branding?: StoreBrandingConfig;
  currentUser?: RBACUser;
  onTenantChange?: (tenant: TenantStore) => void;
  onSelectTenant?: (tenant: TenantStore) => void;
  tenants?: TenantStore[];
  onOpenShareModal?: () => void;
  onOpenNewSale?: () => void;
  onOpenHelp?: () => void;
  isFirebaseAuthed?: boolean;
  onGoogleLogin?: () => void;
  onLogout?: () => void;
}

export const HeaderNavbar: React.FC<HeaderNavbarProps> = ({
  activeTab,
  onTabChange,
  onSelectTab,
  selectedTenant,
  currentTenant,
  branding,
  currentUser,
  onOpenShareModal,
  onOpenNewSale,
  onOpenHelp,
  isFirebaseAuthed,
  onGoogleLogin,
  onLogout,
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

  // Os 7 menus essenciais da cliente
  const mainNavTabs = [
    { id: "ownerHome", label: "Início", icon: Home },
    { id: "products", label: "Produtos", icon: Package },
    { id: "orders", label: "Pedidos", icon: ShoppingBag },
    { id: "customers", label: "Clientes", icon: Users },
    { id: "inventory", label: "Estoque", icon: Layers },
    { id: "myStore", label: "Minha Loja", icon: Store },
    { id: "storeSettings", label: "Configurações", icon: Sliders },
  ];

  // Secondary/Advanced tools in dropdown (hidden from daily clutter)
  const advancedTabs = [
    { id: "warranties", label: "Garantias Digitais", icon: ShieldCheck },
    { id: "customJewelry", label: "Peças Personalizadas", icon: Crown },
    { id: "consignments", label: "Consignações & Maletas", icon: RefreshCw },
    { id: "commissions", label: "Comissões & Metas", icon: Zap },
    { id: "reports", label: "Relatórios & Métricas", icon: BookOpen },
    { id: "saasBilling", label: "Gestão SaaS & Assinatura", icon: Building2 },
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
            <div className="flex items-center gap-2">
              <button
                onClick={() => handleTabChange("ownerHome")}
                className="text-left flex items-center gap-2.5 group cursor-pointer"
                title="Voltar ao início"
              >
                {branding?.logoType === "IMAGE" && branding?.logoUrl ? (
                  <div className="w-9 h-9 rounded-xl bg-stone-900 border border-stone-800 p-1 flex items-center justify-center font-serif italic font-bold text-sm shadow-xs group-hover:scale-105 transition-transform overflow-hidden">
                    <img
                      src={branding.logoUrl}
                      alt={storeName}
                      className="max-h-full max-w-full object-contain"
                    />
                  </div>
                ) : (
                  <div className="w-9 h-9 rounded-xl bg-stone-900 text-amber-300 flex items-center justify-center font-serif italic font-bold text-sm shadow-xs group-hover:scale-105 transition-transform">
                    💎
                  </div>
                )}
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

              <button
                onClick={() => handleTabChange("storeSettings")}
                className="p-1.5 rounded-lg text-stone-400 hover:text-amber-700 hover:bg-amber-50/70 border border-transparent hover:border-amber-200 transition-all cursor-pointer"
                title="Alterar o nome da loja (ex: Lumina para Lilian)"
              >
                <Edit3 className="w-3.5 h-3.5" />
              </button>
            </div>
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
                title="Registrar venda rápida presencial e emitir garantia"
              >
                <span>⚡ Registrar Venda</span>
              </button>
            )}

            {/* Share Catalog button */}
            {onOpenShareModal && (
              <button
                onClick={onOpenShareModal}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-50 hover:bg-amber-100/80 border border-amber-200 text-amber-950 text-xs font-bold tracking-wide transition-all shadow-xs cursor-pointer"
                title="Compartilhar vitrine via WhatsApp e redes sociais"
              >
                <Share2 className="w-3.5 h-3.5 text-amber-700" />
                <span className="hidden sm:inline">📲 Divulgar Vitrine</span>
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

            {/* Google Firebase Auth Action */}
            {isFirebaseAuthed ? (
              <button
                onClick={onLogout}
                className="hidden sm:flex items-center gap-1 px-2 py-1 rounded-md text-[11px] text-stone-500 hover:text-rose-600 hover:bg-stone-100 transition-colors cursor-pointer"
                title="Sair do Firebase"
              >
                <span>Desconectar</span>
              </button>
            ) : (
              <button
                onClick={onGoogleLogin}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-amber-300 bg-amber-50/70 hover:bg-amber-100 text-amber-900 text-xs font-semibold transition-all shadow-2xs cursor-pointer"
                title="Entrar com conta Google / Firebase"
              >
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
                <span className="hidden sm:inline">Entrar com Google</span>
              </button>
            )}

            {/* User Profile Button */}
            {currentUser && (
              <button
                onClick={() => handleTabChange("profile")}
                className="flex items-center gap-1.5 p-1 sm:px-2.5 sm:py-1 rounded-full hover:bg-amber-50/60 border border-stone-200 hover:border-amber-300 transition-all cursor-pointer group"
                title={`Perfil de ${currentUser.name} (clique para alterar foto e dados)`}
              >
                {currentUser.avatar || currentUser.photoUrl ? (
                  <img
                    src={currentUser.avatar || currentUser.photoUrl}
                    alt={currentUser.name}
                    className="w-7 h-7 rounded-full object-cover border border-amber-300"
                  />
                ) : (
                  <div className="w-7 h-7 rounded-full bg-stone-900 text-amber-400 font-bold text-xs flex items-center justify-center border border-stone-800">
                    {currentUser.name ? currentUser.name.charAt(0).toUpperCase() : "U"}
                  </div>
                )}
                <span className="hidden sm:inline text-xs font-semibold text-stone-700 group-hover:text-amber-900 truncate max-w-[100px]">
                  {currentUser.name.split(" ")[0]}
                </span>
              </button>
            )}
          </div>
        </div>

        {/* Clean, Humanized Main Navigation Tabs */}
        <div className="flex items-center justify-between border-t border-stone-100 overflow-x-auto py-1 scrollbar-none">
          <div className="flex space-x-1 sm:space-x-2">
            {mainNavTabs.map((tab) => {
              const Icon = tab.icon;
              const isActive =
                activeTab === tab.id ||
                (tab.id === "ownerHome" && (activeTab === "dashboard" || activeTab === "home")) ||
                (tab.id === "products" && activeTab === "catalog") ||
                (tab.id === "orders" && (activeTab === "vender" || activeTab === "sales")) ||
                (tab.id === "inventory" && (activeTab === "stock" || activeTab === "consignments" || activeTab === "adjustments")) ||
                (tab.id === "myStore" && activeTab === "storefront") ||
                (tab.id === "storeSettings" && activeTab === "profile");
              return (
                <button
                  key={tab.id}
                  onClick={() => handleTabChange(tab.id)}
                  className={`flex items-center gap-1.5 px-3 py-2 text-xs font-semibold tracking-wide whitespace-nowrap transition-all rounded-lg cursor-pointer ${
                    isActive
                      ? "bg-stone-900 text-white font-bold shadow-xs"
                      : "text-stone-600 hover:text-stone-900 hover:bg-stone-100"
                  }`}
                >
                  <Icon className={`w-3.5 h-3.5 ${isActive ? "text-amber-300" : "text-stone-500"}`} />
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
