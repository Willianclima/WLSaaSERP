import React, { useState } from "react";
import {
  Home,
  Store,
  Gem,
  ShoppingBag,
  Users,
  Package,
  UserCheck,
  ShieldCheck,
  Settings,
  Plus,
  ArrowRight,
  LogOut,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  Award,
  Palette,
  Eye,
} from "lucide-react";
import { TenantStore, StoreBrandingConfig, RBACUser } from "../types";
import { mockCurrentUser } from "../data/mockData";

export interface SidebarNavigationProps {
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

  // Estados de expansão para os sub-menus
  const isMyStoreActive = ["myStore", "storefront", "products", "catalog"].includes(activeTab);
  const isSalesActive = ["orders", "vender", "sales", "customers"].includes(activeTab);

  const [expandedMyStore, setExpandedMyStore] = useState(true);
  const [expandedSales, setExpandedSales] = useState(true);

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

        {/* Ação Rápida Comercial: + Nova Venda & + Peça */}
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
            <span>Nova Peça</span>
          </button>
        </div>

        {/* ========================================================================= */}
        {/* NAVEGAÇÃO REORGANIZADA CONFORME SPRINT 1.4                                 */}
        {/* ========================================================================= */}
        <nav className="space-y-1 pt-1">
          {/* 1. INÍCIO */}
          <button
            onClick={() => onTabChange("ownerHome")}
            className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-medium transition-all cursor-pointer ${
              activeTab === "ownerHome" || activeTab === "dashboard" || activeTab === "home"
                ? "bg-stone-900 text-white font-bold shadow-xs"
                : "text-stone-700 hover:text-stone-950 hover:bg-stone-100/70"
            }`}
          >
            <div className="flex items-center gap-3">
              <Home
                className={`w-4 h-4 ${
                  activeTab === "ownerHome" || activeTab === "dashboard" || activeTab === "home"
                    ? "text-amber-400"
                    : "text-stone-500"
                }`}
              />
              <span className="text-sm">Início</span>
            </div>
          </button>

          {/* 2. MINHA LOJA (COM SUBMENUS: Catálogo, Produtos, Personalizar loja) */}
          <div className="pt-1">
            <button
              onClick={() => {
                onTabChange("myStore");
                setExpandedMyStore(!expandedMyStore);
              }}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-medium transition-all cursor-pointer ${
                activeTab === "myStore"
                  ? "bg-stone-900 text-white font-bold shadow-xs"
                  : isMyStoreActive
                  ? "bg-stone-100 text-stone-900 font-bold"
                  : "text-stone-700 hover:text-stone-950 hover:bg-stone-100/70"
              }`}
            >
              <div className="flex items-center gap-3">
                <Store
                  className={`w-4 h-4 ${
                    activeTab === "myStore" ? "text-amber-400" : "text-stone-500"
                  }`}
                />
                <span className="text-sm">Minha Loja</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                  Online
                </span>
                {expandedMyStore ? (
                  <ChevronDown className="w-3.5 h-3.5 text-stone-400" />
                ) : (
                  <ChevronRight className="w-3.5 h-3.5 text-stone-400" />
                )}
              </div>
            </button>

            {/* Sub-itens Minha Loja */}
            {expandedMyStore && (
              <div className="pl-7 pr-2 py-1 space-y-0.5 border-l-2 border-stone-100 ml-4 mt-1">
                <button
                  onClick={() => onTabChange("storefront")}
                  className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs transition-colors cursor-pointer ${
                    activeTab === "storefront"
                      ? "text-amber-700 font-bold bg-amber-50"
                      : "text-stone-600 hover:text-stone-900 hover:bg-stone-100"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Eye className="w-3.5 h-3.5 text-stone-400" />
                    <span>Catálogo Público</span>
                  </div>
                  <ExternalLink className="w-3 h-3 text-stone-400" />
                </button>

                <button
                  onClick={() => onTabChange("products")}
                  className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs transition-colors cursor-pointer ${
                    activeTab === "products" || activeTab === "catalog"
                      ? "text-amber-700 font-bold bg-amber-50"
                      : "text-stone-600 hover:text-stone-900 hover:bg-stone-100"
                  }`}
                >
                  <Gem className="w-3.5 h-3.5 text-stone-400" />
                  <span>Produtos</span>
                </button>

                <button
                  onClick={() => onTabChange("storeSettings")}
                  className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs transition-colors cursor-pointer ${
                    activeTab === "storeSettings"
                      ? "text-amber-700 font-bold bg-amber-50"
                      : "text-stone-600 hover:text-stone-900 hover:bg-stone-100"
                  }`}
                >
                  <Palette className="w-3.5 h-3.5 text-stone-400" />
                  <span>Personalizar Loja</span>
                </button>
              </div>
            )}
          </div>

          {/* 3. VENDAS (COM SUBMENUS: Pedidos, Clientes) */}
          <div className="pt-1">
            <button
              onClick={() => {
                onTabChange("orders");
                setExpandedSales(!expandedSales);
              }}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-medium transition-all cursor-pointer ${
                activeTab === "orders" || activeTab === "vender" || activeTab === "sales"
                  ? "bg-stone-900 text-white font-bold shadow-xs"
                  : isSalesActive
                  ? "bg-stone-100 text-stone-900 font-bold"
                  : "text-stone-700 hover:text-stone-950 hover:bg-stone-100/70"
              }`}
            >
              <div className="flex items-center gap-3">
                <ShoppingBag
                  className={`w-4 h-4 ${
                    activeTab === "orders" || activeTab === "vender" || activeTab === "sales"
                      ? "text-amber-400"
                      : "text-stone-500"
                  }`}
                />
                <span className="text-sm">Vendas</span>
              </div>
              <div className="flex items-center gap-1.5">
                {pendingOrdersCount > 0 && (
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-amber-400 text-stone-950">
                    {pendingOrdersCount}
                  </span>
                )}
                {expandedSales ? (
                  <ChevronDown className="w-3.5 h-3.5 text-stone-400" />
                ) : (
                  <ChevronRight className="w-3.5 h-3.5 text-stone-400" />
                )}
              </div>
            </button>

            {/* Sub-itens Vendas */}
            {expandedSales && (
              <div className="pl-7 pr-2 py-1 space-y-0.5 border-l-2 border-stone-100 ml-4 mt-1">
                <button
                  onClick={() => onTabChange("orders")}
                  className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs transition-colors cursor-pointer ${
                    activeTab === "orders" || activeTab === "vender" || activeTab === "sales"
                      ? "text-amber-700 font-bold bg-amber-50"
                      : "text-stone-600 hover:text-stone-900 hover:bg-stone-100"
                  }`}
                >
                  <span>Pedidos</span>
                  {pendingOrdersCount > 0 && (
                    <span className="text-[10px] font-bold px-1 rounded-full bg-amber-200 text-amber-900">
                      {pendingOrdersCount}
                    </span>
                  )}
                </button>

                <button
                  onClick={() => onTabChange("customers")}
                  className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs transition-colors cursor-pointer ${
                    activeTab === "customers"
                      ? "text-amber-700 font-bold bg-amber-50"
                      : "text-stone-600 hover:text-stone-900 hover:bg-stone-100"
                  }`}
                >
                  <Users className="w-3.5 h-3.5 text-stone-400" />
                  <span>Clientes</span>
                </button>
              </div>
            )}
          </div>

          {/* 4. ESTOQUE */}
          <button
            onClick={() => onTabChange("inventory")}
            className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-medium transition-all cursor-pointer ${
              activeTab === "inventory" || activeTab === "stock" || activeTab === "adjustments"
                ? "bg-stone-900 text-white font-bold shadow-xs"
                : "text-stone-700 hover:text-stone-950 hover:bg-stone-100/70"
            }`}
          >
            <div className="flex items-center gap-3">
              <Package
                className={`w-4 h-4 ${
                  activeTab === "inventory" || activeTab === "stock"
                    ? "text-amber-400"
                    : "text-stone-500"
                }`}
              />
              <span className="text-sm">Estoque</span>
            </div>
          </button>

          {/* 5. REVENDEDORAS */}
          <button
            onClick={() => onTabChange("resellers")}
            className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-medium transition-all cursor-pointer ${
              activeTab === "resellers" || activeTab === "commercialNetwork"
                ? "bg-stone-900 text-white font-bold shadow-xs"
                : "text-stone-700 hover:text-stone-950 hover:bg-stone-100/70"
            }`}
          >
            <div className="flex items-center gap-3">
              <UserCheck
                className={`w-4 h-4 ${
                  activeTab === "resellers" || activeTab === "commercialNetwork"
                    ? "text-amber-400"
                    : "text-stone-500"
                }`}
              />
              <span className="text-sm">Revendedoras</span>
            </div>
          </button>

          {/* 6. GARANTIAS */}
          <button
            onClick={() => onTabChange("warranties")}
            className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-medium transition-all cursor-pointer ${
              activeTab === "warranties"
                ? "bg-stone-900 text-white font-bold shadow-xs"
                : "text-stone-700 hover:text-stone-950 hover:bg-stone-100/70"
            }`}
          >
            <div className="flex items-center gap-3">
              <Award
                className={`w-4 h-4 ${
                  activeTab === "warranties" ? "text-amber-400" : "text-stone-500"
                }`}
              />
              <span className="text-sm">Garantias</span>
            </div>
          </button>

          {/* 7. CONFIGURAÇÕES */}
          <button
            onClick={() => onTabChange("storeSettings")}
            className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-medium transition-all cursor-pointer ${
              activeTab === "storeSettings" || activeTab === "profile" || activeTab === "settings"
                ? "bg-stone-900 text-white font-bold shadow-xs"
                : "text-stone-700 hover:text-stone-950 hover:bg-stone-100/70"
            }`}
          >
            <div className="flex items-center gap-3">
              <Settings
                className={`w-4 h-4 ${
                  activeTab === "storeSettings" ? "text-amber-400" : "text-stone-500"
                }`}
              />
              <span className="text-sm">Configurações</span>
            </div>
          </button>
        </nav>
      </div>

      {/* Footer: Perfil & Sair */}
      <div className="p-4 border-t border-stone-100 space-y-3">
        <div className="flex items-center justify-between p-2 rounded-xl bg-stone-50 border border-stone-200/50 text-xs">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-full bg-stone-900 text-amber-300 font-bold flex items-center justify-center text-xs shrink-0">
              {currentUser?.name ? currentUser.name.charAt(0).toUpperCase() : "M"}
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
