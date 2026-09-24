import React from "react";
import {
  Home,
  Gem,
  ShoppingBag,
  Users,
  Package,
  Store,
  Settings,
  Plus,
  ExternalLink,
  ShieldCheck,
  ArrowRight,
  LogOut,
  Sparkles,
} from "lucide-react";
import { TenantStore, StoreBrandingConfig, RBACUser } from "../types";
import { mockCurrentUser } from "../data/mockData";

interface SidebarNavigationProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  tenant?: TenantStore;
  branding?: StoreBrandingConfig;
  currentUser?: RBACUser;
  onOpenHelp?: () => void;
  onOpenNewSale?: () => void;
  onOpenNewProduct?: () => void;
  onOpenShareModal?: () => void;
  onOpenPlatformConsole?: () => void;
  pendingOrdersCount?: number;
  isFirebaseAuthed?: boolean;
  onGoogleLogin?: () => void;
  onLogout?: () => void;
}

export const SidebarNavigation: React.FC<SidebarNavigationProps> = ({
  activeTab,
  onTabChange,
  tenant,
  branding,
  currentUser = mockCurrentUser,
  onOpenNewSale,
  onOpenNewProduct,
  onOpenPlatformConsole,
  pendingOrdersCount = 0,
  onLogout,
}) => {
  const storeName = branding?.logoText || tenant?.name || "Lumina Semijoias";
  const storeSubtext = branding?.logoSubtext || "SEMIJOIAS NOBRES";

  // Mapeamento dos 7 menus essenciais da cliente
  const navItems = [
    {
      id: "ownerHome",
      aliasIds: ["dashboard", "home"],
      label: "Início",
      icon: Home,
      badge: null,
    },
    {
      id: "products",
      aliasIds: ["catalog"],
      label: "Produtos",
      icon: Gem,
      badge: null,
    },
    {
      id: "orders",
      aliasIds: ["vender", "sales"],
      label: "Pedidos",
      icon: ShoppingBag,
      badge: pendingOrdersCount > 0 ? `${pendingOrdersCount}` : null,
    },
    {
      id: "customers",
      aliasIds: [],
      label: "Clientes",
      icon: Users,
      badge: null,
    },
    {
      id: "inventory",
      aliasIds: ["stock", "consignments", "adjustments"],
      label: "Estoque",
      icon: Package,
      badge: null,
    },
    {
      id: "myStore",
      aliasIds: ["storefront"],
      label: "Minha Loja",
      icon: Store,
      badge: "Online",
    },
    {
      id: "storeSettings",
      aliasIds: ["profile", "settings"],
      label: "Configurações",
      icon: Settings,
      badge: null,
    },
  ];

  const isCurrentActive = (item: typeof navItems[0]) => {
    return activeTab === item.id || item.aliasIds.includes(activeTab);
  };

  return (
    <aside className="w-64 bg-white border-r border-stone-200/80 flex flex-col justify-between shrink-0 min-h-screen select-none font-sans">
      {/* Top Header & Navigation */}
      <div className="flex flex-col flex-1 p-4 space-y-4">
        {/* Camada 1 Switcher (Apenas para SUPER_ADMIN) */}
        {currentUser?.role === "SUPER_ADMIN" && onOpenPlatformConsole && (
          <div className="pb-3 border-b border-stone-100">
            <button
              onClick={onOpenPlatformConsole}
              className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold bg-stone-950 hover:bg-stone-900 text-amber-300 transition-all shadow-xs cursor-pointer group"
              title="Acessar Camada 1: Central AURA (Plataforma)"
            >
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-amber-400 group-hover:scale-110 transition-transform" />
                <span className="font-medium">Central AURA</span>
              </div>
              <div className="flex items-center gap-1 text-[10px] text-amber-400/90 font-mono">
                <span>Plataforma</span>
                <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
              </div>
            </button>
          </div>
        )}

        {/* Identidade da Loja (Camada 2 - ERP do Cliente) */}
        <div
          onClick={() => onTabChange("storeSettings")}
          className="flex items-center gap-3 p-2.5 rounded-2xl bg-stone-50 hover:bg-stone-100/80 border border-stone-200/60 transition-all cursor-pointer group"
          title="Clique para gerenciar dados da sua loja"
        >
          {branding?.logoType === "IMAGE" && branding?.logoUrl ? (
            <div className="w-10 h-10 rounded-xl bg-stone-950 p-1 flex items-center justify-center shrink-0 shadow-xs overflow-hidden">
              <img
                src={branding.logoUrl}
                alt={storeName}
                className="max-h-full max-w-full object-contain"
              />
            </div>
          ) : (
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500 to-amber-300 text-stone-950 flex items-center justify-center font-bold shrink-0 shadow-xs group-hover:scale-105 transition-transform">
              <Gem className="w-5 h-5" />
            </div>
          )}
          <div className="min-w-0 flex-1">
            <span className="font-serif font-extrabold text-sm tracking-wide text-stone-900 uppercase block truncate leading-tight group-hover:text-amber-700 transition-colors">
              {storeName}
            </span>
            <span className="text-[10px] font-semibold text-emerald-700 uppercase tracking-wider block mt-0.5 truncate flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              {storeSubtext}
            </span>
          </div>
        </div>

        {/* Ação Rápida Comercial: + Nova Venda */}
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => {
              if (onOpenNewSale) onOpenNewSale();
              else onTabChange("orders");
            }}
            className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-amber-500 hover:bg-amber-600 text-stone-950 shadow-xs transition-colors cursor-pointer"
            title="Realizar nova venda rápida no balcão"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Nova Venda</span>
          </button>

          <button
            onClick={() => {
              if (onOpenNewProduct) onOpenNewProduct();
              else onTabChange("products");
            }}
            className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-stone-100 hover:bg-stone-200 text-stone-800 transition-colors cursor-pointer"
            title="Cadastrar nova semijoia"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Produto</span>
          </button>
        </div>

        {/* 7 Menus Essenciais da Cliente */}
        <nav className="space-y-1 pt-1">
          {navItems.map((item) => {
            const active = isCurrentActive(item);
            const Icon = item.icon;

            return (
              <button
                key={item.id}
                onClick={() => onTabChange(item.id)}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-medium transition-all cursor-pointer ${
                  active
                    ? "bg-stone-900 text-white font-bold shadow-xs"
                    : "text-stone-700 hover:text-stone-950 hover:bg-stone-100/70"
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon
                    className={`w-4 h-4 transition-colors ${
                      active ? "text-amber-400" : "text-stone-500"
                    }`}
                  />
                  <span className="text-sm">{item.label}</span>
                </div>

                {item.badge && (
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      active
                        ? "bg-amber-400 text-stone-950"
                        : item.badge === "Online"
                        ? "bg-emerald-100 text-emerald-800"
                        : "bg-rose-100 text-rose-800"
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Footer: Status da Loja & Perfil */}
      <div className="p-4 border-t border-stone-100 space-y-3">
        {/* Link direto para a Loja Pública (Instagram / WhatsApp) */}
        <button
          onClick={() => onTabChange("myStore")}
          className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs bg-emerald-50 hover:bg-emerald-100/70 text-emerald-900 border border-emerald-200/60 font-medium transition-colors cursor-pointer group"
          title="Ver o link compartilhável do catálogo público"
        >
          <div className="flex items-center gap-2">
            <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
            <span>Link da Minha Loja</span>
          </div>
          <ExternalLink className="w-3 h-3 text-emerald-600 group-hover:translate-x-0.5 transition-transform" />
        </button>

        {/* Perfil da Lojista */}
        <div className="flex items-center justify-between pt-1 text-xs text-stone-600">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-7 h-7 rounded-full bg-stone-200 flex items-center justify-center font-bold text-stone-800 text-[11px] shrink-0">
              {currentUser?.name ? currentUser.name.charAt(0).toUpperCase() : "L"}
            </div>
            <div className="min-w-0">
              <span className="font-semibold text-stone-900 block truncate leading-tight">
                {currentUser?.name || "Lojista"}
              </span>
              <span className="text-[10px] text-stone-400 block truncate">
                {currentUser?.role === "SUPER_ADMIN" ? "Administradora" : "Dona da Loja"}
              </span>
            </div>
          </div>

          {onLogout && (
            <button
              onClick={onLogout}
              className="p-1.5 rounded-lg text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition-colors cursor-pointer"
              title="Sair"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
    </aside>
  );
};
export default SidebarNavigation;
