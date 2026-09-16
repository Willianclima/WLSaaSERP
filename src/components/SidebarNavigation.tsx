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
  Store,
  MessageCircle,
  Receipt,
  Warehouse,
  BookmarkCheck,
  CheckCircle2,
  History,
  ClipboardList,
  AlertTriangle,
  UserCheck,
  Network,
  Handshake,
  HeartHandshake,
  Share2,
  Palette,
  QrCode,
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
  // Check if current tab is in Vendas or Estoque
  const isVendasActive = [
    "vender",
    "orders",
    "sales",
    "financial",
    "commissions",
    "payments",
    "newSale",
    "myStore",
    "storefront",
  ].includes(activeTab);

  const isEstoqueActive = [
    "catalog",
    "products",
    "inventory",
    "stock",
    "adjustments",
    "consignments",
  ].includes(activeTab);

  // Accordion state: open by default to provide instant visibility
  const [vendasOpen, setVendasOpen] = useState(true);
  const [estoqueOpen, setEstoqueOpen] = useState(true);
  const [clientesOpen, setClientesOpen] = useState(false);
  const [redeComercialOpen, setRedeComercialOpen] = useState(true);
  const [brandOpen, setBrandOpen] = useState(false);
  const [showAdvancedTools, setShowAdvancedTools] = useState(false);

  // Secondary/ERP tools kept tucked away behind the scenes
  const advancedTools = [
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
        {/* 🟦 CAMADA A — PLATAFORMA WLSaaSERP (GOVERNANÇA)                           */}
        {/* ========================================================================= */}
        {currentUser?.role === "SUPER_ADMIN" && onOpenPlatformConsole && (
          <div className="px-3 pb-2.5">
            <div className="px-1 pb-1 flex items-center justify-between text-[10px] font-bold text-amber-900/80 uppercase tracking-wider">
              <span>🟦 CAMADA A — Plataforma</span>
            </div>
            <button
              onClick={onOpenPlatformConsole}
              className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold bg-stone-950 hover:bg-stone-900 text-amber-300 border border-stone-800 transition-all shadow-xs cursor-pointer group"
              title="Acessar a CAMADA A: 🛡️ Central de Comando WLSaaSERP (Governança)"
            >
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-amber-400 group-hover:scale-110 transition-transform" />
                <span className="truncate">🛡️ Central WLSaaSERP</span>
              </div>
              <ArrowRight className="w-3.5 h-3.5 text-amber-400 group-hover:translate-x-0.5 transition-transform shrink-0" />
            </button>
            <div className="mt-1 px-1 flex items-center justify-between text-[9px] text-stone-600">
              <span>Governança Multi-Tenant</span>
              <span className="bg-amber-100/90 text-amber-900 px-1 rounded font-mono font-bold">L1</span>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* 🟩 CAMADA B — OPERAÇÃO DA LOJA (HEADER DA MARCA)                           */}
        {/* ========================================================================= */}
        <div className="px-3 pt-1">
          <div className="px-1 pb-1 flex items-center justify-between text-[10px] font-bold text-emerald-900/90 uppercase tracking-wider">
            <span>🟩 CAMADA B — Operação</span>
            <span className="text-[9px] text-stone-600 font-mono">Loja L2</span>
          </div>
        </div>

        <div
          onClick={() => onTabChange("storeSettings")}
          className="px-4 py-3 mx-2.5 rounded-2xl flex items-center justify-between gap-2.5 cursor-pointer group hover:bg-stone-50 transition-all border border-stone-200/60 bg-stone-50/40"
          title="Clique para configurar o nome e identidade da sua loja"
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
          <div className="p-1 rounded-md text-stone-400 group-hover:text-amber-600 transition-colors shrink-0">
            <Edit2 className="w-3.5 h-3.5" />
          </div>
        </div>

        {/* Separator */}
        <div className="my-2 border-t border-stone-100 mx-4" />

        {/* ========================================================================= */}
        {/* NAVEGAÇÃO DA OPERAÇÃO DA LOJA (CAMADA B)                                   */}
        {/* ========================================================================= */}
        <nav className="px-3 space-y-1">
          {/* 1. 🏠 VISÃO GERAL / INÍCIO */}
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
            <span>Visão Geral</span>
          </button>

          {/* 2. 🛍️ VENDAS (Árvore Completa: PDV, Pedidos, E-commerce, WhatsApp, Pagamento) */}
          <div className="pt-1">
            <button
              onClick={() => {
                setVendasOpen(!vendasOpen);
                if (!isVendasActive) onTabChange("orders");
              }}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                isVendasActive
                  ? "bg-amber-50/80 text-amber-950 font-bold border border-amber-200/70"
                  : "text-stone-700 hover:text-stone-900 hover:bg-stone-50"
              }`}
            >
              <div className="flex items-center gap-3">
                <ShoppingBag
                  className={`w-4 h-4 ${
                    isVendasActive ? "text-amber-700" : "text-stone-500"
                  }`}
                />
                <span>Vendas</span>
              </div>
              <ChevronDown
                className={`w-3.5 h-3.5 text-stone-400 transition-transform duration-200 ${
                  vendasOpen ? "rotate-0" : "-rotate-90"
                }`}
              />
            </button>

            {/* Sub-itens estruturados de Vendas */}
            {vendasOpen && (
              <div className="mt-1 ml-4 pl-3 border-l-2 border-stone-200/90 space-y-0.5 animate-fadeIn text-xs">
                {/* ├── Nova venda */}
                <button
                  onClick={() => {
                    if (onOpenNewSale) {
                      onOpenNewSale();
                    } else {
                      onTabChange("vender");
                    }
                  }}
                  className="w-full text-left flex items-center justify-between px-3 py-1.5 rounded-lg text-emerald-800 hover:bg-emerald-50 hover:text-emerald-950 transition-colors cursor-pointer group font-medium"
                  title="Abrir formulário de nova venda rápida"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-stone-400 text-[10px] font-mono select-none">├──</span>
                    <Plus className="w-3.5 h-3.5 text-emerald-600 group-hover:scale-110 transition-transform" />
                    <span>Nova venda</span>
                  </div>
                  <span className="text-[9px] bg-emerald-100 text-emerald-800 font-bold px-1.5 py-0.2 rounded">
                    +Venda
                  </span>
                </button>

                {/* ├── PDV (Balcão de Caixa) */}
                <button
                  onClick={() => onTabChange("vender")}
                  className={`w-full text-left flex items-center justify-between px-3 py-1.5 rounded-lg font-medium transition-colors cursor-pointer ${
                    activeTab === "vender" || activeTab === "sales"
                      ? "bg-stone-900 text-white font-bold"
                      : "text-stone-700 hover:bg-stone-100 hover:text-stone-900"
                  }`}
                  title="Frente de caixa e PDV balcão"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-stone-400 text-[10px] font-mono select-none">├──</span>
                    <Store className="w-3.5 h-3.5 text-stone-500" />
                    <span>PDV</span>
                  </div>
                  <span className="text-[9px] text-stone-400 font-sans">Balcão</span>
                </button>

                {/* ├── Pedidos */}
                <button
                  onClick={() => onTabChange("orders")}
                  className={`w-full text-left flex items-center justify-between px-3 py-1.5 rounded-lg font-medium transition-colors cursor-pointer ${
                    activeTab === "orders"
                      ? "bg-stone-900 text-white font-bold"
                      : "text-stone-700 hover:bg-stone-100 hover:text-stone-900"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-stone-400 text-[10px] font-mono select-none">├──</span>
                    <ShoppingBag className="w-3.5 h-3.5 text-stone-500" />
                    <span>Pedidos</span>
                  </div>
                  {pendingOrdersCount > 0 && (
                    <span
                      className={`text-[10px] font-bold px-1.5 py-0.2 rounded-full ${
                        activeTab === "orders"
                          ? "bg-amber-400 text-stone-900"
                          : "bg-amber-500 text-white"
                      }`}
                    >
                      {pendingOrdersCount}
                    </span>
                  )}
                </button>

                {/* ├── E-commerce (Vitrine / Loja Virtual) */}
                <button
                  onClick={() => onTabChange("myStore")}
                  className={`w-full text-left flex items-center justify-between px-3 py-1.5 rounded-lg font-medium transition-colors cursor-pointer ${
                    activeTab === "myStore" || activeTab === "storefront"
                      ? "bg-stone-900 text-white font-bold"
                      : "text-stone-700 hover:bg-stone-100 hover:text-stone-900"
                  }`}
                  title="Catálogo virtual para consumidores finais"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-stone-400 text-[10px] font-mono select-none">├──</span>
                    <Globe className="w-3.5 h-3.5 text-stone-500" />
                    <span>E-commerce</span>
                  </div>
                  <span className="text-[9px] text-amber-800 font-semibold">Online</span>
                </button>

                {/* ├── WhatsApp */}
                <button
                  onClick={() => {
                    if (onOpenShareModal) {
                      onOpenShareModal();
                    } else {
                      onTabChange("orders");
                    }
                  }}
                  className="w-full text-left flex items-center justify-between px-3 py-1.5 rounded-lg font-medium text-stone-700 hover:bg-emerald-50/60 hover:text-emerald-900 transition-colors cursor-pointer group"
                  title="Compartilhamento de carrinho, comprovantes e pedidos pelo WhatsApp"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-stone-400 text-[10px] font-mono select-none">├──</span>
                    <MessageCircle className="w-3.5 h-3.5 text-emerald-600" />
                    <span>WhatsApp</span>
                  </div>
                  <span className="text-[9px] bg-emerald-100/80 text-emerald-800 font-bold px-1 rounded">
                    Zap
                  </span>
                </button>

                {/* └── Pagamento */}
                <button
                  onClick={() => onTabChange("financial")}
                  className={`w-full text-left flex items-center gap-2 px-3 py-1.5 rounded-lg font-medium transition-colors cursor-pointer ${
                    activeTab === "financial" || activeTab === "commissions" || activeTab === "payments"
                      ? "bg-stone-900 text-white font-bold"
                      : "text-stone-700 hover:bg-stone-100 hover:text-stone-900"
                  }`}
                  title="Controle de recebimentos, taxas PIX e cartão"
                >
                  <span className="text-stone-400 text-[10px] font-mono select-none">└──</span>
                  <Receipt className="w-3.5 h-3.5 text-stone-500" />
                  <span>Pagamento</span>
                </button>
              </div>
            )}
          </div>

          {/* 3. 📦 ESTOQUE (Árvore Completa: Físico, Reservado, Disponível, Consignado, Movimentações, Inventário, Estoque mínimo) */}
          <div className="pt-1">
            <button
              onClick={() => {
                setEstoqueOpen(!estoqueOpen);
                if (!isEstoqueActive) onTabChange("inventory");
              }}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                isEstoqueActive
                  ? "bg-teal-50/80 text-teal-950 font-bold border border-teal-200/70"
                  : "text-stone-700 hover:text-stone-900 hover:bg-stone-50"
              }`}
            >
              <div className="flex items-center gap-3">
                <Boxes
                  className={`w-4 h-4 ${
                    isEstoqueActive ? "text-teal-700" : "text-stone-500"
                  }`}
                />
                <span>Estoque</span>
              </div>
              <ChevronDown
                className={`w-3.5 h-3.5 text-stone-400 transition-transform duration-200 ${
                  estoqueOpen ? "rotate-0" : "-rotate-90"
                }`}
              />
            </button>

            {/* Sub-itens estruturados de Estoque */}
            {estoqueOpen && (
              <div className="mt-1 ml-4 pl-3 border-l-2 border-stone-200/90 space-y-0.5 animate-fadeIn text-xs">
                {/* ├── Físico */}
                <button
                  onClick={() => onTabChange("inventory")}
                  className={`w-full text-left flex items-center justify-between px-3 py-1.5 rounded-lg font-medium transition-colors cursor-pointer ${
                    activeTab === "inventory" || activeTab === "stock"
                      ? "bg-stone-900 text-white font-bold"
                      : "text-stone-700 hover:bg-stone-100 hover:text-stone-900"
                  }`}
                  title="Estoque físico presente na gaveta e cofre da matriz"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-stone-400 text-[10px] font-mono select-none">├──</span>
                    <Warehouse className="w-3.5 h-3.5 text-stone-500" />
                    <span>Físico</span>
                  </div>
                  <span className="text-[9px] text-stone-400">Total</span>
                </button>

                {/* ├── Reservado */}
                <button
                  onClick={() => onTabChange("orders")}
                  className="w-full text-left flex items-center justify-between px-3 py-1.5 rounded-lg font-medium text-stone-700 hover:bg-stone-100 hover:text-stone-900 transition-colors cursor-pointer"
                  title="Peças reservadas em pedidos aguardando confirmação ou expedição"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-stone-400 text-[10px] font-mono select-none">├──</span>
                    <BookmarkCheck className="w-3.5 h-3.5 text-amber-600" />
                    <span>Reservado</span>
                  </div>
                  <span className="text-[9px] text-amber-800 font-semibold">Pedidos</span>
                </button>

                {/* ├── Disponível */}
                <button
                  onClick={() => onTabChange("catalog")}
                  className={`w-full text-left flex items-center justify-between px-3 py-1.5 rounded-lg font-medium transition-colors cursor-pointer ${
                    activeTab === "catalog" || activeTab === "products"
                      ? "bg-stone-900 text-white font-bold"
                      : "text-stone-700 hover:bg-stone-100 hover:text-stone-900"
                  }`}
                  title="Saldo real apto para venda imediata (Físico - Reservado)"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-stone-400 text-[10px] font-mono select-none">├──</span>
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Disponível</span>
                  </div>
                  <span className="text-[9px] text-emerald-700 font-bold">Venda</span>
                </button>

                {/* ├── Consignado (Maletas) */}
                <button
                  onClick={() => onTabChange("consignments")}
                  className={`w-full text-left flex items-center justify-between px-3 py-1.5 rounded-lg font-medium transition-colors cursor-pointer ${
                    activeTab === "consignments"
                      ? "bg-stone-900 text-white font-bold"
                      : "text-stone-700 hover:bg-stone-100 hover:text-stone-900"
                  }`}
                  title="Peças expedidas para maletas de revendedoras"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-stone-400 text-[10px] font-mono select-none">├──</span>
                    <Briefcase className="w-3.5 h-3.5 text-stone-500" />
                    <span>Consignado</span>
                  </div>
                  <span className="text-[9px] text-stone-400">Maletas</span>
                </button>

                {/* ├── Movimentações (Ledger Imutável) */}
                <button
                  onClick={() => onTabChange("inventory")}
                  className={`w-full text-left flex items-center justify-between px-3 py-1.5 rounded-lg font-medium transition-colors cursor-pointer ${
                    activeTab === "inventory"
                      ? "bg-stone-900 text-white font-bold"
                      : "text-stone-700 hover:bg-stone-100 hover:text-stone-900"
                  }`}
                  title="Histórico de entradas, saídas, transferências e estornos"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-stone-400 text-[10px] font-mono select-none">├──</span>
                    <History className="w-3.5 h-3.5 text-teal-600" />
                    <span>Movimentações</span>
                  </div>
                  <span className="text-[9px] bg-teal-100 text-teal-900 font-mono font-bold px-1 rounded">
                    Ledger
                  </span>
                </button>

                {/* ├── Inventário */}
                <button
                  onClick={() => onTabChange("catalog")}
                  className="w-full text-left flex items-center justify-between px-3 py-1.5 rounded-lg font-medium text-stone-700 hover:bg-stone-100 hover:text-stone-900 transition-colors cursor-pointer"
                  title="Catálogo geral e conferência de inventário físico"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-stone-400 text-[10px] font-mono select-none">├──</span>
                    <ClipboardList className="w-3.5 h-3.5 text-stone-500" />
                    <span>Inventário</span>
                  </div>
                  <span className="text-[9px] text-stone-400">Geral</span>
                </button>

                {/* └── Estoque mínimo */}
                <button
                  onClick={() => onTabChange("adjustments")}
                  className={`w-full text-left flex items-center justify-between px-3 py-1.5 rounded-lg font-medium transition-colors cursor-pointer ${
                    activeTab === "adjustments"
                      ? "bg-stone-900 text-white font-bold"
                      : "text-stone-700 hover:bg-stone-100 hover:text-stone-900"
                  }`}
                  title="Alertas de ponto de reposição e estoque crítico"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-stone-400 text-[10px] font-mono select-none">└──</span>
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                    <span>Estoque mínimo</span>
                  </div>
                  <span className="text-[9px] text-amber-700 font-bold">Alertas</span>
                </button>
              </div>
            )}
          </div>

          {/* 4. 👥 CLIENTES E CRM */}
          <div className="pt-1">
            <button
              onClick={() => {
                onTabChange("customers");
                setClientesOpen(!clientesOpen);
              }}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                activeTab === "customers"
                  ? "bg-stone-900 text-white font-bold shadow-xs"
                  : "text-stone-700 hover:text-stone-900 hover:bg-stone-50"
              }`}
            >
              <div className="flex items-center gap-3">
                <Users
                  className={`w-4 h-4 ${
                    activeTab === "customers" ? "text-amber-300" : "text-stone-500"
                  }`}
                />
                <span>Clientes e CRM</span>
              </div>
              <ChevronDown
                className={`w-3.5 h-3.5 text-stone-400 transition-transform duration-200 ${
                  clientesOpen ? "rotate-0" : "-rotate-90"
                }`}
              />
            </button>

            {/* Sub-itens de Clientes & Segmentação */}
            {clientesOpen && (
              <div className="mt-1 ml-4 pl-3 border-l-2 border-stone-200/90 space-y-0.5 animate-fadeIn text-xs">
                {/* ├── Base de Clientes */}
                <button
                  onClick={() => onTabChange("customers")}
                  className={`w-full text-left flex items-center justify-between px-3 py-1.5 rounded-lg font-medium transition-colors cursor-pointer ${
                    activeTab === "customers"
                      ? "bg-stone-900 text-white font-bold"
                      : "text-stone-700 hover:bg-stone-100 hover:text-stone-900"
                  }`}
                  title="Base unificada de clientes (Pessoa Física e Jurídica)"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-stone-400 text-[10px] font-mono select-none">├──</span>
                    <Users className="w-3.5 h-3.5 text-stone-500" />
                    <span>Clientes</span>
                  </div>
                  <span className="text-[9px] text-stone-400">Unificado</span>
                </button>

                {/* ├── Consumidores (PF) */}
                <button
                  onClick={() => onTabChange("customers")}
                  className="w-full text-left flex items-center justify-between px-3 py-1.5 rounded-lg font-medium text-stone-700 hover:bg-stone-100 hover:text-stone-900 transition-colors cursor-pointer"
                  title="Consumidor final e compras no balcão / vitrine"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-stone-400 text-[10px] font-mono select-none">├──</span>
                    <UserCheck className="w-3.5 h-3.5 text-blue-600" />
                    <span>Consumidores</span>
                  </div>
                  <span className="text-[9px] text-blue-700 font-semibold">B2C</span>
                </button>

                {/* ├── VIP & PJ */}
                <button
                  onClick={() => onTabChange("customers")}
                  className="w-full text-left flex items-center justify-between px-3 py-1.5 rounded-lg font-medium text-stone-700 hover:bg-stone-100 hover:text-stone-900 transition-colors cursor-pointer"
                  title="Clientes VIP e contas jurídicas com atacado"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-stone-400 text-[10px] font-mono select-none">├──</span>
                    <Crown className="w-3.5 h-3.5 text-amber-600" />
                    <span>VIP / PJ</span>
                  </div>
                  <span className="text-[9px] text-amber-700 font-semibold">Tiers</span>
                </button>

                {/* └── Histórico & Relacionamento */}
                <button
                  onClick={() => onTabChange("customers")}
                  className="w-full text-left flex items-center justify-between px-3 py-1.5 rounded-lg font-medium text-stone-700 hover:bg-stone-100 hover:text-stone-900 transition-colors cursor-pointer"
                  title="Histórico de compras e relacionamento por WhatsApp"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-stone-400 text-[10px] font-mono select-none">└──</span>
                    <History className="w-3.5 h-3.5 text-stone-500" />
                    <span>Histórico & CRM</span>
                  </div>
                  <span className="text-[9px] text-stone-400">Timeline</span>
                </button>
              </div>
            )}
          </div>

          {/* 5. 🤝 REDE COMERCIAL (MÓDULO DESACOPLADO) */}
          <div className="pt-1">
            <button
              onClick={() => {
                onTabChange("commercialNetwork");
                setRedeComercialOpen(!redeComercialOpen);
              }}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                activeTab === "commercialNetwork" ||
                activeTab === "resellers" ||
                activeTab === "consignments" ||
                activeTab === "commissions"
                  ? "bg-stone-900 text-white font-bold shadow-xs"
                  : "text-stone-700 hover:text-stone-900 hover:bg-stone-50"
              }`}
              title="Módulo independente de Revenda e Consignação"
            >
              <div className="flex items-center gap-3">
                <Network
                  className={`w-4 h-4 ${
                    activeTab === "commercialNetwork" ||
                    activeTab === "resellers" ||
                    activeTab === "consignments" ||
                    activeTab === "commissions"
                      ? "text-amber-300"
                      : "text-stone-500"
                  }`}
                />
                <div className="flex items-center gap-1.5">
                  <span>Rede Comercial</span>
                  <span className="text-[9px] bg-amber-400/20 text-amber-600 font-mono font-bold px-1.5 py-0.2 rounded border border-amber-400/30">
                    Módulo
                  </span>
                </div>
              </div>
              <ChevronDown
                className={`w-3.5 h-3.5 text-stone-400 transition-transform duration-200 ${
                  redeComercialOpen ? "rotate-0" : "-rotate-90"
                }`}
              />
            </button>

            {/* Sub-itens da Rede Comercial */}
            {redeComercialOpen && (
              <div className="mt-1 ml-4 pl-3 border-l-2 border-stone-200/90 space-y-0.5 animate-fadeIn text-xs">
                {/* ├── Visão Geral do Módulo */}
                <button
                  onClick={() => onTabChange("commercialNetwork")}
                  className={`w-full text-left flex items-center justify-between px-3 py-1.5 rounded-lg font-medium transition-colors cursor-pointer ${
                    activeTab === "commercialNetwork"
                      ? "bg-amber-600 text-white font-bold"
                      : "text-stone-700 hover:bg-stone-100 hover:text-stone-900"
                  }`}
                  title="Painel completo e integrado da Rede Comercial"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-stone-400 text-[10px] font-mono select-none">├──</span>
                    <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                    <span>Painel da Rede</span>
                  </div>
                  <span className="text-[9px] text-amber-600 font-bold">Hub</span>
                </button>

                {/* ├── Revendedoras & Líderes */}
                <button
                  onClick={() => onTabChange("resellers")}
                  className={`w-full text-left flex items-center justify-between px-3 py-1.5 rounded-lg font-medium transition-colors cursor-pointer ${
                    activeTab === "resellers"
                      ? "bg-stone-900 text-white font-bold"
                      : "text-stone-700 hover:bg-stone-100 hover:text-stone-900"
                  }`}
                  title="Consultoras autônomas e hierarquia de liderança"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-stone-400 text-[10px] font-mono select-none">├──</span>
                    <Award className="w-3.5 h-3.5 text-amber-500" />
                    <span>Revendedoras</span>
                  </div>
                  <span className="text-[9px] text-stone-400">Líderes</span>
                </button>

                {/* ├── Consignação & Maletas */}
                <button
                  onClick={() => onTabChange("consignments")}
                  className={`w-full text-left flex items-center justify-between px-3 py-1.5 rounded-lg font-medium transition-colors cursor-pointer ${
                    activeTab === "consignments"
                      ? "bg-stone-900 text-white font-bold"
                      : "text-stone-700 hover:bg-stone-100 hover:text-stone-900"
                  }`}
                  title="Expedição, controle de prazo e devoluções de maletas"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-stone-400 text-[10px] font-mono select-none">├──</span>
                    <Briefcase className="w-3.5 h-3.5 text-stone-500" />
                    <span>Maletas</span>
                  </div>
                  <span className="text-[9px] text-stone-400">Consignado</span>
                </button>

                {/* ├── Acertos de Mercadoria */}
                <button
                  onClick={() => onTabChange("consignments")}
                  className="w-full text-left flex items-center justify-between px-3 py-1.5 rounded-lg font-medium text-stone-700 hover:bg-stone-100 hover:text-stone-900 transition-colors cursor-pointer"
                  title="Prestação de contas das peças vendidas vs devolvidas"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-stone-400 text-[10px] font-mono select-none">├──</span>
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Acertos</span>
                  </div>
                  <span className="text-[9px] text-emerald-700 font-bold">Retorno</span>
                </button>

                {/* └── Comissões & Repasses */}
                <button
                  onClick={() => onTabChange("commissions")}
                  className={`w-full text-left flex items-center justify-between px-3 py-1.5 rounded-lg font-medium transition-colors cursor-pointer ${
                    activeTab === "commissions"
                      ? "bg-stone-900 text-white font-bold"
                      : "text-stone-700 hover:bg-stone-100 hover:text-stone-900"
                  }`}
                  title="Regras de comissionamento progressivo e bônus"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-stone-400 text-[10px] font-mono select-none">└──</span>
                    <Percent className="w-3.5 h-3.5 text-stone-500" />
                    <span>Comissões</span>
                  </div>
                  <span className="text-[9px] text-amber-700 font-bold">Regras</span>
                </button>
              </div>
            )}
          </div>

          {/* 6. 🛡️ GARANTIAS (PASSAPORTE DIGITAL) */}
          <div className="pt-1">
            <button
              onClick={() => onTabChange("warranties")}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                activeTab === "warranties"
                  ? "bg-stone-900 text-white font-bold shadow-xs"
                  : "text-stone-700 hover:text-stone-900 hover:bg-stone-50"
              }`}
              title="Passaporte Digital da Joia & QR Code Público"
            >
              <div className="flex items-center gap-3">
                <ShieldCheck
                  className={`w-4 h-4 ${
                    activeTab === "warranties" ? "text-amber-300" : "text-stone-500"
                  }`}
                />
                <span>6. Garantias</span>
              </div>
              <span className="text-[9px] bg-emerald-500/10 text-emerald-700 font-mono font-bold px-1.5 py-0.2 rounded border border-emerald-500/20">
                QR Code
              </span>
            </button>
          </div>

          {/* 7. 🎨 MARCA E LOJA DIGITAL */}
          <div className="pt-1">
            <button
              onClick={() => {
                onTabChange("storeSettings");
                setBrandOpen(!brandOpen);
              }}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                activeTab === "storeSettings" || activeTab === "settings" || activeTab === "myStore" || activeTab === "storefront"
                  ? "bg-stone-900 text-white font-bold shadow-xs"
                  : "text-stone-700 hover:text-stone-900 hover:bg-stone-50"
              }`}
              title="Identidade visual, vitrine online, catálogo e canais de venda"
            >
              <div className="flex items-center gap-3">
                <Palette
                  className={`w-4 h-4 ${
                    activeTab === "storeSettings" || activeTab === "settings" || activeTab === "myStore" || activeTab === "storefront"
                      ? "text-amber-300"
                      : "text-stone-500"
                  }`}
                />
                <span>7. Marca & Loja</span>
              </div>
              <ChevronDown
                className={`w-3.5 h-3.5 text-stone-400 transition-transform duration-200 ${
                  brandOpen ? "rotate-0" : "-rotate-90"
                }`}
              />
            </button>

            {/* Sub-itens de Marca e Loja Digital */}
            {brandOpen && (
              <div className="mt-1 ml-4 pl-3 border-l-2 border-stone-200/90 space-y-0.5 animate-fadeIn text-xs">
                {/* ├── Logo, Cores & Banner */}
                <button
                  onClick={() => onTabChange("storeSettings")}
                  className={`w-full text-left flex items-center justify-between px-3 py-1.5 rounded-lg font-medium transition-colors cursor-pointer ${
                    activeTab === "storeSettings"
                      ? "bg-stone-900 text-white font-bold"
                      : "text-stone-700 hover:bg-stone-100 hover:text-stone-900"
                  }`}
                  title="Logo, cores da marca, tipografia e banners"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-stone-400 text-[10px] font-mono select-none">├──</span>
                    <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                    <span>Logo & Cores</span>
                  </div>
                  <span className="text-[9px] text-stone-400">Visual</span>
                </button>

                {/* ├── Catálogo & Loja Virtual */}
                <button
                  onClick={() => onTabChange("myStore")}
                  className={`w-full text-left flex items-center justify-between px-3 py-1.5 rounded-lg font-medium transition-colors cursor-pointer ${
                    activeTab === "myStore" || activeTab === "storefront"
                      ? "bg-amber-600 text-white font-bold"
                      : "text-stone-700 hover:bg-stone-100 hover:text-stone-900"
                  }`}
                  title="Catálogo interativo do consumidor final"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-stone-400 text-[10px] font-mono select-none">├──</span>
                    <Globe className="w-3.5 h-3.5 text-amber-500" />
                    <span>Catálogo Web</span>
                  </div>
                  <span className="text-[9px] text-amber-600 font-bold">Online</span>
                </button>

                {/* ├── WhatsApp & Instagram */}
                <button
                  onClick={() => onTabChange("storeSettings")}
                  className="w-full text-left flex items-center justify-between px-3 py-1.5 rounded-lg font-medium text-stone-700 hover:bg-stone-100 hover:text-stone-900 transition-colors cursor-pointer"
                  title="Canais de atendimento, WhatsApp e redes sociais"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-stone-400 text-[10px] font-mono select-none">├──</span>
                    <MessageCircle className="w-3.5 h-3.5 text-emerald-600" />
                    <span>WhatsApp & Insta</span>
                  </div>
                  <span className="text-[9px] text-emerald-700 font-bold">Canais</span>
                </button>

                {/* └── Compartilhamento & SEO */}
                <button
                  onClick={() => {
                    if (onOpenShareModal) onOpenShareModal();
                    else onTabChange("storeSettings");
                  }}
                  className="w-full text-left flex items-center justify-between px-3 py-1.5 rounded-lg font-medium text-stone-700 hover:bg-stone-100 hover:text-stone-900 transition-colors cursor-pointer"
                  title="Compartilhamento de catálogo, QR Code e SEO"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-stone-400 text-[10px] font-mono select-none">└──</span>
                    <Share2 className="w-3.5 h-3.5 text-stone-500" />
                    <span>Compartilhar</span>
                  </div>
                  <span className="text-[9px] text-stone-400">SEO / Link</span>
                </button>
              </div>
            )}
          </div>
        </nav>

        {/* ========================================================================= */}
        {/* SEPARADOR E MINHA LOJA (VITRINE ONLINE)                                  */}
        {/* ========================================================================= */}
        <div className="my-3 border-t border-stone-200/80 mx-4" />

        <div className="px-3">
          <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-stone-500">
            Vitrine do Consumidor
          </div>
          <button
            onClick={() => onTabChange("myStore")}
            className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer group ${
              activeTab === "myStore" || activeTab === "storefront"
                ? "bg-amber-500 text-white shadow-xs"
                : "bg-amber-50/70 hover:bg-amber-100/80 text-amber-950 border border-amber-200/80"
            }`}
            title="Sua loja online com catálogo interativo para clientes comprarem via WhatsApp e PIX"
          >
            <div className="flex items-center gap-2.5">
              <Globe
                className={`w-4 h-4 ${
                  activeTab === "myStore" || activeTab === "storefront" ? "text-white" : "text-amber-700"
                }`}
              />
              <span>Loja Virtual</span>
            </div>
            <div className="flex items-center gap-1 text-[10px] font-semibold opacity-90 group-hover:opacity-100 transition-opacity">
              <span>Nível 3</span>
              <Sparkles className="w-3 h-3" />
            </div>
          </button>
        </div>

        {/* ========================================================================= */}
        {/* CONFIGURAÇÕES E AJUDA                                                    */}
        {/* ========================================================================= */}
        <div className="my-3 border-t border-stone-200/80 mx-4" />

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

