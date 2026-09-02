import React from "react";
import {
  LayoutDashboard,
  ShoppingBag,
  Sparkles,
  Users,
  Package,
  Globe,
  DollarSign,
  BarChart3,
  Settings,
  HelpCircle,
  Gem,
  ExternalLink,
} from "lucide-react";
import { TenantStore, StoreBrandingConfig } from "../types";

interface SidebarNavigationProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  tenant?: TenantStore;
  branding?: StoreBrandingConfig;
  onOpenHelp?: () => void;
}

export const SidebarNavigation: React.FC<SidebarNavigationProps> = ({
  activeTab,
  onTabChange,
  tenant,
  branding,
  onOpenHelp,
}) => {
  const storeName = branding?.logoText || tenant?.name || "LUMINA SEMIJOIAS";

  const navItems = [
    {
      id: "ownerHome",
      aliasIds: ["dashboard", "home"],
      label: "Dashboard",
      icon: LayoutDashboard,
    },
    {
      id: "orders",
      aliasIds: ["sales"],
      label: "Pedidos",
      icon: ShoppingBag,
    },
    {
      id: "catalog",
      aliasIds: ["products"],
      label: "Produtos",
      icon: Sparkles,
    },
    {
      id: "customers",
      aliasIds: ["clients"],
      label: "Clientes",
      icon: Users,
    },
    {
      id: "inventory",
      aliasIds: ["stock"],
      label: "Estoque",
      icon: Package,
    },
    {
      id: "storefront",
      aliasIds: ["onlineCatalog", "vitrine"],
      label: "Catálogo Online",
      icon: Globe,
    },
    {
      id: "financial",
      aliasIds: ["commissions", "saasBilling"],
      label: "Financeiro",
      icon: DollarSign,
    },
    {
      id: "reports",
      aliasIds: ["analytics"],
      label: "Relatórios",
      icon: BarChart3,
    },
    {
      id: "storeSettings",
      aliasIds: ["settings", "config"],
      label: "Configurações",
      icon: Settings,
    },
  ];

  const isItemActive = (item: typeof navItems[0]) => {
    if (activeTab === item.id) return true;
    if (item.aliasIds && item.aliasIds.includes(activeTab)) return true;
    return false;
  };

  return (
    <aside className="w-64 bg-white border-r border-stone-200/80 flex flex-col justify-between shrink-0 min-h-screen select-none">
      {/* Brand Header */}
      <div>
        <div className="p-6 pb-5 flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-amber-500/15 text-amber-700 flex items-center justify-center font-bold">
            <Gem className="w-5 h-5 text-amber-600" />
          </div>
          <div>
            <span className="font-serif font-extrabold text-sm tracking-widest text-stone-900 uppercase block leading-none">
              LUMINA
            </span>
            <span className="text-[9px] font-semibold text-stone-400 uppercase tracking-widest block mt-0.5">
              SEMIJOIAS
            </span>
          </div>
        </div>

        {/* Navigation List */}
        <nav className="px-3 space-y-1 mt-2">
          {navItems.map((item) => {
            const active = isItemActive(item);
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                onClick={() => onTabChange(item.id)}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                  active
                    ? "bg-amber-50 text-amber-900 font-bold shadow-2xs"
                    : "text-stone-600 hover:text-stone-900 hover:bg-stone-50"
                }`}
              >
                <Icon
                  className={`w-4 h-4 ${
                    active ? "text-amber-700" : "text-stone-400"
                  }`}
                />
                <span>{item.label}</span>
              </button>
            );
          })}

          {/* Ajuda */}
          <button
            onClick={() => {
              if (onOpenHelp) onOpenHelp();
            }}
            className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold text-stone-600 hover:text-stone-900 hover:bg-stone-50 transition-all cursor-pointer"
          >
            <HelpCircle className="w-4 h-4 text-stone-400" />
            <span>Ajuda</span>
          </button>
        </nav>
      </div>

      {/* Consultora Profile Footer */}
      <div className="p-4 m-3 rounded-2xl bg-stone-50/80 border border-stone-100 flex items-center gap-3">
        <img
          src="https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=120&auto=format&fit=crop&q=80"
          alt="Juliana Silva"
          className="w-9 h-9 rounded-full object-cover border border-stone-200"
          referrerPolicy="no-referrer"
        />
        <div className="min-w-0 flex-1">
          <div className="text-xs font-bold text-stone-900 truncate">
            Juliana Silva
          </div>
          <div className="text-[10px] text-stone-400 truncate">
            Consultora
          </div>
        </div>
      </div>
    </aside>
  );
};
