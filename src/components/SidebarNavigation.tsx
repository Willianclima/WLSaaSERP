import React, { useState } from "react";
import {
  Home,
  ShoppingBag,
  Package,
  Users,
  Globe,
  Settings,
  HelpCircle,
  Gem,
  Edit2,
  Plus,
  CreditCard,
  BookOpen,
  Boxes,
  Sliders,
  ChevronDown,
  ExternalLink,
  ChevronRight,
  ShieldCheck,
  Crown,
  Sparkles,
  BarChart3,
  Building2,
  Bot,
  Lock,
  Award,
  ArrowRight,
  Percent,
  Briefcase,
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
}

export const SidebarNavigation: React.FC<SidebarNavigationProps> = ({
  activeTab,
  onTabChange,
  tenant,
  branding,
  currentUser = mockCurrentUser,
  onOpenHelp,
  onOpenNewSale,
  onOpenNewProduct,
  onOpenShareModal,
  onOpenPlatformConsole,
  pendingOrdersCount = 0,
}) => {
  // Check if current tab is in Vender or Produtos
  const isVenderActive = [
    "vender",
    "orders",
    "sales",
    "financial",
    "commissions",
    "payments",
    "newSale",
  ].includes(activeTab);

  const isProdutosActive = [
    "catalog",
    "products",
    "inventory",
    "stock",
    "adjustments",
    "consignments",
  ].includes(activeTab);

  // Accordion state: both open by default to give clear overview of the tree
  const [venderOpen, setVenderOpen] = useState(true);
  const [produtosOpen, setProdutosOpen] = useState(true);
  const [showAdvancedTools, setShowAdvancedTools] = useState(false);

  // Secondary/ERP tools kept tucked away behind the scenes
  const advancedTools = [
    { id: "warranties", label: "Garantias Digitais", icon: ShieldCheck },
    { id: "customJewelry", label: "Peças Personalizadas", icon: Crown },
    { id: "consignments", label: "Maletas & Consignação", icon: Sliders },
    { id: "reports", label: "Relatórios de Desempenho", icon: BarChart3 },
    { id: "saasBilling", label: "Gestão SaaS & Assinatura", icon: Building2 },
    { id: "aiGateway", label: "AI Copilot MCP", icon: Bot },
    { id: "security", label: "Segurança & LGPD", icon: Lock },
    { id: "architecture", label: "Plano de Arquitetura", icon: BookOpen },
  ];

  const isAdvancedActive = advancedTools.some((t) => t.id === activeTab);

  const storeName = branding?.logoText || tenant?.name || "LUMINA";

  return (
    <aside className="w-64 bg-white border-r border-stone-200/90 flex flex-col justify-between shrink-0 min-h-screen select-none font-sans">
      {/* Scrollable Navigation Area */}
      <div className="flex flex-col flex-1 overflow-y-auto scrollbar-none py-3">
        {/* ========================================================================= */}
        {/* PLATFORM OWNER MASTER ENTRY (FOR SUPER_ADMIN / WILLIAN)                  */}
        {/* ========================================================================= */}
        {currentUser?.role === "SUPER_ADMIN" && onOpenPlatformConsole && (
          <div className="px-3 pb-2">
            <button
              onClick={onOpenPlatformConsole}
              className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold bg-stone-950 hover:bg-stone-900 text-amber-300 border border-stone-800 transition-all shadow-xs cursor-pointer group"
              title="Acessar o Produto 2: Central da Plataforma WLSaaSERP"
            >
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-amber-400" />
                <span>Central da Plataforma</span>
              </div>
              <ArrowRight className="w-3.5 h-3.5 text-amber-400 group-hover:translate-x-0.5 transition-transform" />
            </button>
          </div>
        )}

        {/* ========================================================================= */}
        {/* HEADER: STORE BRAND & EDIT                                                */}
        {/* ========================================================================= */}
        <div
          onClick={() => onTabChange("storeSettings")}
          className="px-4 py-3 mx-2.5 rounded-2xl flex items-center justify-between gap-2.5 cursor-pointer group hover:bg-stone-50 transition-all border border-transparent hover:border-stone-200/70"
          title="Clique para configurar o nome e logotipo da sua loja"
        >
          <div className="flex items-center gap-3 min-w-0">
            {branding?.logoType === "IMAGE" && branding?.logoUrl ? (
              <div className="w-9 h-9 rounded-xl bg-stone-900 border border-stone-800 p-1 flex items-center justify-center shrink-0 shadow-2xs group-hover:scale-105 transition-transform overflow-hidden">
                <img
                  src={branding.logoUrl}
                  alt={storeName}
                  className="max-h-full max-w-full object-contain"
                />
              </div>
            ) : (
              <div className="w-9 h-9 rounded-xl bg-stone-900 text-amber-300 flex items-center justify-center font-bold shrink-0 shadow-2xs group-hover:scale-105 transition-transform">
                <Gem className="w-4.5 h-4.5 text-amber-400" />
              </div>
            )}
            <div className="min-w-0">
              <span className="font-serif font-extrabold text-sm tracking-widest text-stone-900 uppercase block leading-tight truncate group-hover:text-amber-800 transition-colors">
                {storeName}
              </span>
              <span className="text-[9px] font-semibold text-emerald-800 uppercase tracking-wider block mt-0.5 truncate flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                {branding?.logoSubtext || "SEMIJOIAS NOBRES"}
              </span>
            </div>
          </div>
          <div className="p-1 rounded-md text-stone-300 group-hover:text-amber-600 transition-colors shrink-0 opacity-40 group-hover:opacity-100">
            <Edit2 className="w-3.5 h-3.5" />
          </div>
        </div>

        {/* Separator */}
        <div className="my-2 border-t border-stone-100 mx-4" />

        {/* ========================================================================= */}
        {/* AS 5 ÁREAS PRINCIPAIS:                                                   */}
        {/* 1. Início                                                                */}
        {/* 2. Vender (Novo pedido, Pedidos, Pagamentos)                             */}
        {/* 3. Produtos (Catálogo, Estoque, Entrada de peças, Ajustes)                */}
        {/* 4. Clientes                                                              */}
        {/* ───────────────────────────────                                          */}
        {/* 5. Minha Loja                                                            */}
        {/* ========================================================================= */}
        <nav className="px-3 space-y-1">
          {/* 1. 🏠 INÍCIO */}
          <button
            onClick={() => onTabChange("ownerHome")}
            className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              activeTab === "ownerHome" || activeTab === "dashboard" || activeTab === "home"
                ? "bg-stone-900 text-white font-bold shadow-xs"
                : "text-stone-700 hover:text-stone-900 hover:bg-stone-50"
            }`}
          >
            <Home
              className={`w-4 h-4 ${
                activeTab === "ownerHome" || activeTab === "dashboard" || activeTab === "home"
                  ? "text-amber-300"
                  : "text-stone-500"
              }`}
            />
            <span>Início</span>
          </button>

          {/* 2. 🛍️ VENDER (Com Sub-Itens) */}
          <div className="pt-1">
            <button
              onClick={() => {
                setVenderOpen(true);
                onTabChange("vender");
              }}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                isVenderActive
                  ? "bg-amber-50/80 text-amber-950 font-bold border border-amber-200/70"
                  : "text-stone-700 hover:text-stone-900 hover:bg-stone-50"
              }`}
            >
              <div className="flex items-center gap-3">
                <ShoppingBag
                  className={`w-4 h-4 ${
                    isVenderActive ? "text-amber-700" : "text-stone-500"
                  }`}
                />
                <span>Vender</span>
              </div>
              <ChevronDown
                className={`w-3.5 h-3.5 text-stone-400 transition-transform duration-200 ${
                  venderOpen ? "rotate-0" : "-rotate-90"
                }`}
              />
            </button>

            {/* Tree Branch: Sub-itens de Vender */}
            {venderOpen && (
              <div className="mt-1 ml-4 pl-3 border-l-2 border-stone-200/90 space-y-0.5 animate-fadeIn">
                {/* ├── Vender agora / Balcão */}
                <button
                  onClick={() => onTabChange("vender")}
                  className={`w-full text-left flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-colors cursor-pointer group ${
                    activeTab === "vender" || activeTab === "sales"
                      ? "bg-stone-900 text-white font-bold"
                      : "text-emerald-700 hover:bg-emerald-50/80 hover:text-emerald-900"
                  }`}
                  title="Balcão de venda rápida e envio pelo WhatsApp"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-stone-400 text-[10px] font-mono select-none">
                      ├──
                    </span>
                    <Plus className="w-3.5 h-3.5 text-emerald-600 group-hover:scale-110 transition-transform" />
                    <span>Vender agora</span>
                  </div>
                  <span className="text-[9px] bg-emerald-100 text-emerald-800 font-bold px-1.5 py-0.5 rounded">
                    Balcão
                  </span>
                </button>

                {/* ├── Pedidos */}
                <button
                  onClick={() => onTabChange("orders")}
                  className={`w-full text-left flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                    activeTab === "orders"
                      ? "bg-stone-900 text-white font-bold"
                      : "text-stone-700 hover:bg-stone-100 hover:text-stone-900"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-stone-400 text-[10px] font-mono select-none">
                      ├──
                    </span>
                    <ShoppingBag className="w-3.5 h-3.5" />
                    <span>Pedidos</span>
                  </div>
                  {pendingOrdersCount > 0 && (
                    <span
                      className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                        activeTab === "orders"
                          ? "bg-amber-400 text-stone-900"
                          : "bg-amber-500 text-white"
                      }`}
                    >
                      {pendingOrdersCount}
                    </span>
                  )}
                </button>

                {/* └── Pagamentos */}
                <button
                  onClick={() => onTabChange("financial")}
                  className={`w-full text-left flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                    activeTab === "financial" || activeTab === "commissions" || activeTab === "payments"
                      ? "bg-stone-900 text-white font-bold"
                      : "text-stone-700 hover:bg-stone-100 hover:text-stone-900"
                  }`}
                >
                  <span
                    className={`text-[10px] font-mono select-none ${
                      activeTab === "financial" || activeTab === "commissions" || activeTab === "payments"
                        ? "text-stone-400"
                        : "text-stone-400"
                    }`}
                  >
                    └──
                  </span>
                  <CreditCard className="w-3.5 h-3.5" />
                  <span>Pagamentos</span>
                </button>
              </div>
            )}
          </div>

          {/* 3. 📦 PRODUTOS (Com Sub-Itens) */}
          <div className="pt-1">
            <button
              onClick={() => {
                setProdutosOpen(!produtosOpen);
                if (!isProdutosActive) onTabChange("catalog");
              }}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                isProdutosActive
                  ? "bg-teal-50/80 text-teal-950 font-bold border border-teal-200/70"
                  : "text-stone-700 hover:text-stone-900 hover:bg-stone-50"
              }`}
            >
              <div className="flex items-center gap-3">
                <Package
                  className={`w-4 h-4 ${
                    isProdutosActive ? "text-teal-700" : "text-stone-500"
                  }`}
                />
                <span>Produtos</span>
              </div>
              <ChevronDown
                className={`w-3.5 h-3.5 text-stone-400 transition-transform duration-200 ${
                  produtosOpen ? "rotate-0" : "-rotate-90"
                }`}
              />
            </button>

            {/* Tree Branch: Sub-itens de Produtos */}
            {produtosOpen && (
              <div className="mt-1 ml-4 pl-3 border-l-2 border-stone-200/90 space-y-0.5 animate-fadeIn">
                {/* ├── Catálogo */}
                <button
                  onClick={() => onTabChange("catalog")}
                  className={`w-full text-left flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                    activeTab === "catalog" || activeTab === "products"
                      ? "bg-stone-900 text-white font-bold"
                      : "text-stone-700 hover:bg-stone-100 hover:text-stone-900"
                  }`}
                >
                  <span className="text-stone-400 text-[10px] font-mono select-none">
                    ├──
                  </span>
                  <BookOpen className="w-3.5 h-3.5" />
                  <span>Catálogo</span>
                </button>

                {/* ├── Estoque */}
                <button
                  onClick={() => onTabChange("inventory")}
                  className={`w-full text-left flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                    activeTab === "inventory" || activeTab === "stock"
                      ? "bg-stone-900 text-white font-bold"
                      : "text-stone-700 hover:bg-stone-100 hover:text-stone-900"
                  }`}
                >
                  <span className="text-stone-400 text-[10px] font-mono select-none">
                    ├──
                  </span>
                  <Boxes className="w-3.5 h-3.5" />
                  <span>Estoque</span>
                </button>

                {/* ├── Entrada de peças */}
                <button
                  onClick={() => {
                    if (onOpenNewProduct) {
                      onOpenNewProduct();
                    } else {
                      onTabChange("catalog");
                    }
                  }}
                  className="w-full text-left flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium text-teal-800 hover:bg-teal-50 hover:text-teal-950 transition-colors cursor-pointer group"
                  title="Cadastrar nova semijoia com foto, banho e preço"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-stone-400 text-[10px] font-mono select-none">
                      ├──
                    </span>
                    <Plus className="w-3.5 h-3.5 text-teal-600 group-hover:scale-110 transition-transform" />
                    <span>Entrada de peças</span>
                  </div>
                  <span className="text-[9px] bg-teal-100 text-teal-800 font-bold px-1.5 py-0.5 rounded">
                    +Peça
                  </span>
                </button>

                {/* └── Ajustes */}
                <button
                  onClick={() => onTabChange("adjustments")}
                  className={`w-full text-left flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                    activeTab === "adjustments" || activeTab === "consignments"
                      ? "bg-stone-900 text-white font-bold"
                      : "text-stone-700 hover:bg-stone-100 hover:text-stone-900"
                  }`}
                  title="Ajustes de inventário, perdas e maletas consignadas"
                >
                  <span className="text-stone-400 text-[10px] font-mono select-none">
                    └──
                  </span>
                  <Sliders className="w-3.5 h-3.5" />
                  <span>Ajustes</span>
                </button>
              </div>
            )}
          </div>

          {/* 4. 👥 CLIENTES */}
          <div className="pt-1">
            <button
              onClick={() => onTabChange("customers")}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                activeTab === "customers"
                  ? "bg-stone-900 text-white font-bold shadow-xs"
                  : "text-stone-700 hover:text-stone-900 hover:bg-stone-50"
              }`}
            >
              <Users
                className={`w-4 h-4 ${
                  activeTab === "customers" ? "text-amber-300" : "text-stone-500"
                }`}
              />
              <span>Clientes</span>
            </button>
          </div>

          {/* 5. 🤝 REVENDEDORAS */}
          <div className="pt-1">
            <button
              onClick={() => onTabChange("resellers")}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                activeTab === "resellers"
                  ? "bg-stone-900 text-white font-bold shadow-xs"
                  : "text-stone-700 hover:text-stone-900 hover:bg-stone-50"
              }`}
            >
              <Award
                className={`w-4 h-4 ${
                  activeTab === "resellers" ? "text-amber-300" : "text-stone-500"
                }`}
              />
              <span>Revendedoras</span>
            </button>
          </div>

          {/* 6. 💼 CONSIGNAÇÃO & MALETAS */}
          <div className="pt-1">
            <button
              onClick={() => onTabChange("consignments")}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                activeTab === "consignments"
                  ? "bg-stone-900 text-white font-bold shadow-xs"
                  : "text-stone-700 hover:text-stone-900 hover:bg-stone-50"
              }`}
            >
              <Briefcase
                className={`w-4 h-4 ${
                  activeTab === "consignments" ? "text-amber-300" : "text-stone-500"
                }`}
              />
              <span>Consignação (Maletas)</span>
            </button>
          </div>

          {/* 7. 📈 COMISSÕES */}
          <div className="pt-1">
            <button
              onClick={() => onTabChange("commissions")}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                activeTab === "commissions"
                  ? "bg-stone-900 text-white font-bold shadow-xs"
                  : "text-stone-700 hover:text-stone-900 hover:bg-stone-50"
              }`}
            >
              <Percent
                className={`w-4 h-4 ${
                  activeTab === "commissions" ? "text-amber-300" : "text-stone-500"
                }`}
              />
              <span>Comissões</span>
            </button>
          </div>

          {/* 8. 🛡️ GARANTIAS DIGITAIS */}
          <div className="pt-1">
            <button
              onClick={() => onTabChange("warranties")}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                activeTab === "warranties"
                  ? "bg-stone-900 text-white font-bold shadow-xs"
                  : "text-stone-700 hover:text-stone-900 hover:bg-stone-50"
              }`}
            >
              <ShieldCheck
                className={`w-4 h-4 ${
                  activeTab === "warranties" ? "text-amber-300" : "text-stone-500"
                }`}
              />
              <span>Garantias</span>
            </button>
          </div>
        </nav>

        {/* ========================================================================= */}
        {/* SEPARADOR E MINHA LOJA (VITRINE ONLINE)                                  */}
        {/* ========================================================================= */}
        <div className="my-3 border-t border-stone-200/80 mx-4" />

        <div className="px-3">
          <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-stone-400">
            Canal de Vendas
          </div>
          <button
            onClick={() => onTabChange("myStore")}
            className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer group ${
              activeTab === "myStore" || activeTab === "storefront"
                ? "bg-amber-500 text-white shadow-xs"
                : "bg-amber-50/70 hover:bg-amber-100/80 text-amber-950 border border-amber-200/80"
            }`}
            title="Sua loja está pronta! Veja o link, compartilhe no WhatsApp e venda"
          >
            <div className="flex items-center gap-2.5">
              <Globe
                className={`w-4 h-4 ${
                  activeTab === "myStore" || activeTab === "storefront" ? "text-white" : "text-amber-700"
                }`}
              />
              <span>Minha Loja</span>
            </div>
            <div className="flex items-center gap-1 text-[10px] font-semibold opacity-90 group-hover:opacity-100 transition-opacity">
              <span>Pronta!</span>
              <Sparkles className="w-3 h-3" />
            </div>
          </button>
        </div>

        {/* ========================================================================= */}
        {/* SEPARADOR                                                                 */}
        {/* ========================================================================= */}
        <div className="my-3 border-t border-stone-200/80 mx-4" />

        {/* ========================================================================= */}
        {/* CONFIGURAÇÕES E AJUDA                                                    */}
        {/* ========================================================================= */}
        <div className="px-3 space-y-1">
          {/* ⚙ Configurações */}
          <button
            onClick={() => onTabChange("storeSettings")}
            className={`w-full flex items-center gap-3 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              activeTab === "storeSettings" || activeTab === "settings"
                ? "bg-stone-900 text-white font-bold shadow-xs"
                : "text-stone-700 hover:text-stone-900 hover:bg-stone-50"
            }`}
          >
            <Settings
              className={`w-4 h-4 ${
                activeTab === "storeSettings" || activeTab === "settings"
                  ? "text-amber-300"
                  : "text-stone-500"
              }`}
            />
            <span>Configurações</span>
          </button>

          {/* ❓ Ajuda */}
          <button
            onClick={() => {
              if (onOpenHelp) onOpenHelp();
            }}
            className="w-full flex items-center gap-3 px-3.5 py-2 rounded-xl text-xs font-semibold text-stone-700 hover:text-stone-900 hover:bg-stone-50 transition-all cursor-pointer"
          >
            <HelpCircle className="w-4 h-4 text-stone-500" />
            <span>Ajuda</span>
          </button>
        </div>

        {/* ========================================================================= */}
        {/* ERP MODULAR POR TRÁS DOS PANOS (RECOLHIDO / SEM POLUIR O CLIENTE)        */}
        {/* ========================================================================= */}
        <div className="px-3 pt-3 mt-2">
          <button
            onClick={() => setShowAdvancedTools(!showAdvancedTools)}
            className="w-full flex items-center justify-between px-3 py-1.5 text-[10px] font-semibold text-stone-400 hover:text-stone-600 transition-colors cursor-pointer rounded-lg hover:bg-stone-50"
            title="Acessar módulos avançados da arquitetura ERP"
          >
            <span className="uppercase tracking-wider">
              {showAdvancedTools ? "Arquitetura ERP" : "Mais Módulos ERP"}
            </span>
            <ChevronRight
              className={`w-3 h-3 transition-transform ${
                showAdvancedTools ? "rotate-90" : ""
              }`}
            />
          </button>

          {(showAdvancedTools || isAdvancedActive) && (
            <div className="mt-1 space-y-0.5 pt-1 border-t border-stone-100 animate-fadeIn">
              {advancedTools.map((tool) => {
                const Icon = tool.icon;
                const isActive = activeTab === tool.id;
                return (
                  <button
                    key={tool.id}
                    onClick={() => onTabChange(tool.id)}
                    className={`w-full flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-[11px] font-medium transition-colors cursor-pointer ${
                      isActive
                        ? "bg-amber-100 text-amber-950 font-bold"
                        : "text-stone-600 hover:text-stone-900 hover:bg-stone-50"
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5 text-stone-400" />
                    <span className="truncate">{tool.label}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Footer Profile */}
      <div className="p-3 border-t border-stone-100 bg-stone-50/50">
        <button
          onClick={() => onTabChange("profile")}
          className="w-full text-left p-2 rounded-xl bg-white hover:bg-amber-50/60 border border-stone-200/80 hover:border-amber-300/80 flex items-center gap-2.5 shadow-2xs transition-all cursor-pointer group"
          title="Clique para editar seu perfil e foto"
        >
          {currentUser?.avatar || currentUser?.photoUrl ? (
            <img
              src={currentUser.avatar || currentUser.photoUrl}
              alt={currentUser.name}
              className="w-8 h-8 rounded-full object-cover border border-amber-300 shrink-0 shadow-2xs"
            />
          ) : (
            <div className="w-8 h-8 rounded-full bg-stone-900 text-amber-400 font-bold text-xs flex items-center justify-center shrink-0 border border-stone-800">
              {currentUser?.name ? currentUser.name.charAt(0).toUpperCase() : "U"}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <div className="text-xs font-bold text-stone-900 truncate leading-tight group-hover:text-amber-900 transition-colors">
              {currentUser?.name || "Minha Conta"}
            </div>
            <div className="text-[10px] text-stone-500 truncate flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              <span>{currentUser?.title || "Administradora"}</span>
            </div>
          </div>
          <span className="text-[10px] text-stone-400 group-hover:text-amber-600 font-bold">⚙️</span>
        </button>
      </div>
    </aside>
  );
};
