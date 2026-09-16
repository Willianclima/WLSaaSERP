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
  ShoppingBag,
  Info,
  Users,
  X,
  Smartphone,
  Package,
} from "lucide-react";
import { TenantStore, RBACUser, SystemUserRole } from "../../types";

export type ProductMode = "PLATFORM_OWNER" | "TENANT_STORE" | "STORE_CONSUMER";

interface PlatformHeaderProps {
  currentUser: RBACUser;
  currentMode: ProductMode;
  selectedTenant: TenantStore;
  tenants: TenantStore[];
  onSwitchMode: (mode: ProductMode) => void;
  onSelectTenant: (tenant: TenantStore) => void;
  onOpenStorefrontPreview: () => void;
  onSwitchRole?: (role: SystemUserRole) => void;
}

export const PlatformHeader: React.FC<PlatformHeaderProps> = ({
  currentUser,
  currentMode,
  selectedTenant,
  tenants,
  onSwitchMode,
  onSelectTenant,
  onOpenStorefrontPreview,
  onSwitchRole,
}) => {
  const [showTenantDropdown, setShowTenantDropdown] = useState(false);
  const [showRoleDropdown, setShowRoleDropdown] = useState(false);
  const [showArchitectureModal, setShowArchitectureModal] = useState(false);

  // If user is not super admin and not simulating, don't render master switcher
  if (currentUser.role !== "SUPER_ADMIN" && !currentUser.role.includes("ADMIN") && currentMode !== "STORE_CONSUMER") {
    return null;
  }

  const storeRoles: { id: SystemUserRole; label: string; desc: string }[] = [
    { id: "OWNER", label: "OWNER (Dona da Marca)", desc: "Acesso total à loja de semijoias" },
    { id: "LOJA_ADMIN", label: "LOJA_ADMIN (Administradora)", desc: "Gestão operacional e financeira" },
    { id: "GERENTE", label: "GERENTE (Estoque & Vendas)", desc: "Controle de maletas e produtos" },
    { id: "VENDEDOR", label: "VENDEDOR (Balcão & WhatsApp)", desc: "PDV, vendas rápidas e orçamentos" },
    { id: "REVENDEDORA", label: "REVENDEDORA (Consignação)", desc: "Catálogo e conferência de maletas" },
  ];

  return (
    <>
      <header className="bg-stone-950 text-stone-200 border-b border-stone-800 sticky top-0 z-40 px-3 sm:px-6 py-2 shadow-md">
        <div className="max-w-7xl mx-auto flex flex-col lg:flex-row items-center justify-between gap-2.5">
          {/* Left: Brand + Platform Identity */}
          <div className="flex items-center gap-3 w-full lg:w-auto justify-between lg:justify-start">
            <div className="flex items-center gap-2">
              <span className="w-7 h-7 rounded-xl bg-gradient-to-tr from-amber-500 to-amber-300 flex items-center justify-center font-serif font-black text-stone-950 text-xs shadow-sm">
                W
              </span>
              <div>
                <span className="font-bold text-white text-xs tracking-tight">WLSaaSERP</span>
                <span className="ml-2 px-2 py-0.5 rounded-md bg-amber-400/20 text-amber-300 border border-amber-400/40 text-[9px] font-bold uppercase tracking-wider">
                  {currentMode === "PLATFORM_OWNER"
                    ? "Nível 1 · Plataforma"
                    : currentMode === "TENANT_STORE"
                    ? "Nível 2 · Loja"
                    : "Nível 3 · Consumidor"}
                </span>
              </div>
            </div>

            {/* Architecture Explanation Button */}
            <button
              onClick={() => setShowArchitectureModal(true)}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-stone-900 hover:bg-stone-800 text-amber-300 text-[11px] font-semibold border border-stone-800 transition-colors cursor-pointer"
              title="Entenda a distinção entre os 3 Níveis (Willian, Loja e Consumidor)"
            >
              <Info className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden sm:inline">3 Níveis da Arquitetura</span>
            </button>
          </div>

          {/* Center: The Three Levels Switcher */}
          <div className="flex items-center bg-stone-900 border border-stone-800 p-1 rounded-2xl w-full sm:w-auto justify-center overflow-x-auto scrollbar-none">
            {/* Nível 1: Plataforma (Willian / SUPER_ADMIN) */}
            <button
              onClick={() => onSwitchMode("PLATFORM_OWNER")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                currentMode === "PLATFORM_OWNER"
                  ? "bg-amber-400 text-stone-950 shadow-sm"
                  : "text-stone-300 hover:text-white"
              }`}
              title="Nível 1 — Willian: Dono da plataforma, SUPER_ADMIN (organizações, planos, SaaS, auditoria)"
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Nível 1 · Plataforma</span>
            </button>

            {/* Nível 2: Cliente WLSaaSERP (Loja de Semijoias) */}
            <button
              onClick={() => onSwitchMode("TENANT_STORE")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                currentMode === "TENANT_STORE"
                  ? "bg-amber-400 text-stone-950 shadow-sm"
                  : "text-stone-300 hover:text-white"
              }`}
              title="Nível 2 — Cliente WLSaaSERP: Loja de Semijoias (produtos, estoque, vendedores, revendedoras, pedidos)"
            >
              <Building2 className="w-3.5 h-3.5" />
              <span>Nível 2 · Loja</span>
            </button>

            {/* Nível 3: Consumidor da Loja (Comprador Final) */}
            <button
              onClick={() => onSwitchMode("STORE_CONSUMER")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                currentMode === "STORE_CONSUMER"
                  ? "bg-amber-400 text-stone-950 shadow-sm"
                  : "text-stone-300 hover:text-white"
              }`}
              title="Nível 3 — Consumidor da loja: Quem compra a semijoia (Catálogo → Produto → Carrinho → WhatsApp/pagamento)"
            >
              <ShoppingBag className="w-3.5 h-3.5" />
              <span>Nível 3 · Consumidor</span>
            </button>
          </div>

          {/* Right: Tenant Context & Role Simulation */}
          <div className="flex items-center gap-2 w-full lg:w-auto justify-end">
            {/* Tenant Selector Dropdown */}
            <div className="relative">
              <button
                onClick={() => setShowTenantDropdown(!showTenantDropdown)}
                className="flex items-center gap-2 px-3 py-1.5 bg-stone-900 hover:bg-stone-800 border border-stone-800 rounded-xl text-xs text-stone-200 transition-all cursor-pointer"
                title="Trocar loja ativa / Simular acesso de cliente"
              >
                <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-stone-400 text-[11px] hidden sm:inline">Loja:</span>
                <span className="font-bold text-white max-w-[120px] truncate">{selectedTenant.name}</span>
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

            {/* If in Store Mode (Nível 2), show Store User Role simulation */}
            {currentMode === "TENANT_STORE" && onSwitchRole && (
              <div className="relative">
                <button
                  onClick={() => setShowRoleDropdown(!showRoleDropdown)}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 bg-stone-900 hover:bg-stone-800 border border-stone-800 rounded-xl text-xs text-amber-300 transition-all cursor-pointer"
                  title="Simular perfil de usuário da loja (OWNER, GERENTE, VENDEDOR, REVENDEDORA)"
                >
                  <Users className="w-3.5 h-3.5 text-amber-400" />
                  <span className="text-[11px] font-bold hidden sm:inline">
                    {currentUser.role === "SUPER_ADMIN" ? "Papel: OWNER" : currentUser.role}
                  </span>
                  <ChevronDown className="w-3 h-3 text-stone-400" />
                </button>

                {showRoleDropdown && (
                  <>
                    <div
                      className="fixed inset-0 z-30"
                      onClick={() => setShowRoleDropdown(false)}
                    />
                    <div className="absolute right-0 mt-2 w-64 bg-stone-900 border border-stone-800 rounded-2xl shadow-2xl p-2 z-40 space-y-1 text-xs">
                      <div className="px-2.5 py-1.5 text-[10px] font-bold uppercase text-stone-400 tracking-wider">
                        Perfis da Loja (Nível 2):
                      </div>
                      {storeRoles.map((r) => (
                        <button
                          key={r.id}
                          onClick={() => {
                            onSwitchRole(r.id);
                            setShowRoleDropdown(false);
                          }}
                          className="w-full text-left px-2.5 py-2 rounded-xl text-stone-300 hover:bg-stone-800 hover:text-white transition-colors cursor-pointer"
                        >
                          <p className="font-bold text-xs text-amber-300">{r.label}</p>
                          <p className="text-[10px] text-stone-400">{r.desc}</p>
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Architecture Explanation Modal (Os Três Níveis) */}
      {showArchitectureModal && (
        <div className="fixed inset-0 z-50 bg-stone-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-stone-900 border border-stone-800 text-stone-200 rounded-3xl max-w-3xl w-full p-6 sm:p-8 shadow-2xl space-y-6 animate-scaleUp">
            {/* Header */}
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-widest text-amber-400">
                  Fundamento Arquitetural
                </span>
                <h2 className="text-xl sm:text-2xl font-serif italic font-bold text-white mt-1">
                  Os Três Níveis do Ecossistema WLSaaSERP
                </h2>
                <p className="text-xs text-stone-400 mt-1">
                  Separação estrita entre a gestão da infraestrutura SaaS, a operação da marca de semijoias e a experiência de compra do consumidor.
                </p>
              </div>
              <button
                onClick={() => setShowArchitectureModal(false)}
                className="p-2 rounded-full hover:bg-stone-800 text-stone-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Three Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Nível 1 — Willian */}
              <div className="p-4 rounded-2xl bg-stone-950 border border-amber-500/30 flex flex-col justify-between space-y-3">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="px-2 py-0.5 rounded-md bg-amber-400 text-stone-950 text-[10px] font-bold uppercase">
                      Nível 1
                    </span>
                    <ShieldCheck className="w-4 h-4 text-amber-400" />
                  </div>
                  <h3 className="font-bold text-sm text-white">Willian</h3>
                  <p className="text-[11px] font-medium text-amber-300">Dono da Plataforma</p>
                  <div className="mt-2 text-[10px] font-mono text-stone-400 bg-stone-900 px-2 py-1 rounded">
                    SUPER_ADMIN
                  </div>
                  <div className="mt-3 space-y-1 text-xs text-stone-300">
                    <p className="font-semibold text-stone-200">Controla:</p>
                    <ul className="list-disc list-inside text-[11px] text-stone-400 space-y-0.5">
                      <li>Clientes SaaS</li>
                      <li>Organizações</li>
                      <li>Planos e Preços</li>
                      <li>Assinaturas & MRR</li>
                      <li>Módulos & Flags</li>
                      <li>Utilização & Logs</li>
                      <li>Suporte & Chamados</li>
                      <li>Segurança & Auditoria</li>
                    </ul>
                  </div>
                </div>
                <button
                  onClick={() => {
                    onSwitchMode("PLATFORM_OWNER");
                    setShowArchitectureModal(false);
                  }}
                  className="w-full mt-3 py-1.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-stone-950 font-bold text-xs cursor-pointer"
                >
                  Abrir Central SaaS
                </button>
              </div>

              {/* Nível 2 — Cliente do WLSaaSERP */}
              <div className="p-4 rounded-2xl bg-stone-950 border border-stone-800 flex flex-col justify-between space-y-3">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="px-2 py-0.5 rounded-md bg-stone-800 text-stone-300 text-[10px] font-bold uppercase">
                      Nível 2
                    </span>
                    <Building2 className="w-4 h-4 text-emerald-400" />
                  </div>
                  <h3 className="font-bold text-sm text-white">Cliente WLSaaSERP</h3>
                  <p className="text-[11px] font-medium text-emerald-300">Loja de Semijoias</p>
                  <div className="mt-2 text-[10px] font-mono text-stone-400 bg-stone-900 px-2 py-1 rounded truncate">
                    OWNER · GERENTE · VENDEDOR
                  </div>
                  <div className="mt-3 space-y-1 text-xs text-stone-300">
                    <p className="font-semibold text-stone-200">A Loja Possui:</p>
                    <ul className="list-disc list-inside text-[11px] text-stone-400 space-y-0.5">
                      <li>Produtos & Banhos</li>
                      <li>Estoque Duplo (Físico/Maletas)</li>
                      <li>Vendedores de Loja</li>
                      <li>Rede de Revendedoras</li>
                      <li>Clientes & Cadastros</li>
                      <li>Pedidos & Balcão PDV</li>
                      <li>Loja Virtual Própria</li>
                      <li>Configurações Comerciais</li>
                    </ul>
                  </div>
                </div>
                <button
                  onClick={() => {
                    onSwitchMode("TENANT_STORE");
                    setShowArchitectureModal(false);
                  }}
                  className="w-full mt-3 py-1.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-white font-bold text-xs cursor-pointer"
                >
                  Abrir Sistema da Loja
                </button>
              </div>

              {/* Nível 3 — Consumidor da Loja */}
              <div className="p-4 rounded-2xl bg-stone-950 border border-stone-800 flex flex-col justify-between space-y-3">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="px-2 py-0.5 rounded-md bg-stone-800 text-stone-300 text-[10px] font-bold uppercase">
                      Nível 3
                    </span>
                    <ShoppingBag className="w-4 h-4 text-purple-400" />
                  </div>
                  <h3 className="font-bold text-sm text-white">Consumidor da Loja</h3>
                  <p className="text-[11px] font-medium text-purple-300">Comprador Final da Semijoia</p>
                  <div className="mt-2 text-[10px] font-mono text-stone-400 bg-stone-900 px-2 py-1 rounded">
                    Sem acesso administrativo
                  </div>
                  <div className="mt-3 space-y-2 text-xs">
                    <p className="font-semibold text-stone-200">Jornada de Compra:</p>
                    <div className="bg-stone-900 p-2 rounded-xl text-[10px] text-amber-300 font-mono space-y-1">
                      <div>Consumidor</div>
                      <div>&nbsp;&nbsp;↓ Catálogo</div>
                      <div>&nbsp;&nbsp;↓ Produto</div>
                      <div>&nbsp;&nbsp;↓ Carrinho (Sacola)</div>
                      <div>&nbsp;&nbsp;↓ Pedido</div>
                      <div>&nbsp;&nbsp;↓ WhatsApp / Pagamento</div>
                    </div>
                    <p className="text-[10px] text-stone-400 italic">
                      Ele não pertence ao WLSaaSERP como usuário administrativo. Pertence ao ecossistema da loja.
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    onSwitchMode("STORE_CONSUMER");
                    setShowArchitectureModal(false);
                  }}
                  className="w-full mt-3 py-1.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-white font-bold text-xs cursor-pointer"
                >
                  Ver como Consumidor
                </button>
              </div>
            </div>

            {/* Footer Notice */}
            <div className="p-3 rounded-2xl bg-stone-950 border border-stone-800 text-[11px] text-stone-400 flex items-center justify-between">
              <span>Isolamento Multi-Tenant seguro por Row-Level Security (RLS) no PostgreSQL.</span>
              <button
                onClick={() => setShowArchitectureModal(false)}
                className="text-amber-400 hover:underline font-bold"
              >
                Entendido
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

