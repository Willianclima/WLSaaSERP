import React, { useState } from "react";
import {
  ShieldCheck,
  Building2,
  Sparkles,
  Lock,
  Mail,
  User,
  Store,
  Phone,
  ArrowRight,
  CheckCircle2,
  X,
  KeyRound,
  Info,
  ChevronRight,
  LogOut,
  ShoppingBag,
  ExternalLink,
} from "lucide-react";
import confetti from "canvas-confetti";
import { RBACUser, TenantStore } from "../../types";
import { apiClient } from "../../services/apiClient";
import { toast } from "../../utils/toast";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: RBACUser | null;
  currentTenant: TenantStore;
  tenants: TenantStore[];
  onLoginSuccess: (
    user: RBACUser,
    tenant: TenantStore,
    targetMode: "PLATFORM_OWNER" | "TENANT_STORE",
    isNewRegistration?: boolean
  ) => void;
  initialTab?: "STORE_LOGIN" | "ADMIN_LOGIN" | "REGISTER_TRIAL" | "EXPLANATION";
  onOpenSystemInitModal?: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  currentTenant,
  tenants,
  onLoginSuccess,
  initialTab = "STORE_LOGIN",
  onOpenSystemInitModal,
}) => {
  const [activeTab, setActiveTab] = useState<"STORE_LOGIN" | "ADMIN_LOGIN" | "REGISTER_TRIAL" | "EXPLANATION">(
    initialTab
  );

  React.useEffect(() => {
    if (initialTab && isOpen) {
      setActiveTab(initialTab);
    }
  }, [initialTab, isOpen]);

  // Store Login State
  const [storeEmail, setStoreEmail] = useState<string>("");
  const [storePassword, setStorePassword] = useState<string>("");
  const [selectedTenantId, setSelectedTenantId] = useState<string>(currentTenant?.id || tenants[0]?.id || "");
  const [isStoreLoading, setIsStoreLoading] = useState<boolean>(false);

  // Platform Super Admin Login State
  const [adminEmail, setAdminEmail] = useState<string>("willianCLima@gmail.com");
  const [adminPassword, setAdminPassword] = useState<string>("admin123");
  const [isAdminLoading, setIsAdminLoading] = useState<boolean>(false);

  // New Trial Registration State
  const [regName, setRegName] = useState<string>("");
  const [regStoreName, setRegStoreName] = useState<string>("");
  const [regEmail, setRegEmail] = useState<string>("");
  const [regPassword, setRegPassword] = useState<string>("");
  const [regWhatsapp, setRegWhatsapp] = useState<string>("");
  const [isRegLoading, setIsRegLoading] = useState<boolean>(false);

  if (!isOpen) return null;

  // 1. Handle Store Owner Login (ERP da Lojista)
  const handleStoreLogin = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setIsStoreLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: storeEmail,
          password: storePassword,
          organizationId: selectedTenantId,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || "Credenciais inválidas. Verifique seu e-mail e senha.");
      }

      const session = data.session;
      if (session?.jwt) {
        apiClient.setToken(session.jwt);
      }
      if (session?.organization?.id) {
        apiClient.setTenantId(session.organization.id);
      }

      const mappedUser: RBACUser = {
        id: session.user.id,
        name: session.user.name,
        email: session.user.email,
        role: (session.role || "OWNER") as any,
        tenantId: session.organization.id,
        avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80",
        phone: session.user.phone || "(19) 98765-4321",
        title: "Dona da Loja",
        bio: `Gestora da marca ${session.organization.name}`,
      };

      const matchedTenant: TenantStore = tenants.find((t) => t.id === session.organization.id) || {
        id: session.organization.id,
        name: session.organization.name,
        slug: session.organization.slug || "loja",
        document: session.organization.document || "00.000.000/0001-00",
        planTier: "TRIAL_30D" as any,
        logo: "https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?w=200&auto=format&fit=crop&q=80",
        activeProductsCount: 12,
        activeResellersCount: 4,
        features: {
          unlimitedProducts: true,
          consignments: true,
          commissionEngine: true,
          digitalWarranty: true,
          customJewelry: true,
          whatsappAutomations: true,
          aiGatewayMCP: true,
          marketplaces: true,
          multiUserRBAC: true,
        },
        customDomain: `${session.organization.slug}.aura.com`,
        customDomainStatus: "ACTIVE",
        contactWhatsapp: session.organization.contactWhatsapp || "(19) 98765-4321",
        contactEmail: session.organization.contactEmail || session.user.email,
        city: session.organization.city || "Limeira",
        state: session.organization.state || "SP",
      };

      toast.success(`Bem-vinda de volta! Sessão iniciada como ${mappedUser.name} (${matchedTenant.name}).`);
      onLoginSuccess(mappedUser, matchedTenant, "TENANT_STORE");
      onClose();
    } catch (err: any) {
      toast.error(err.message || "Erro ao conectar com a loja.");
    } finally {
      setIsStoreLoading(false);
    }
  };

  // 2. Handle Platform Super Admin Login (Central AURA)
  const handleAdminLogin = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setIsAdminLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: adminEmail,
          password: adminPassword,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || "Credenciais de administrador inválidas.");
      }

      const session = data.session;
      if (session?.jwt) {
        apiClient.setToken(session.jwt);
      }

      const superUser: RBACUser = {
        id: session.user.id || "usr-admin-01",
        name: session.user.name || "Willian C. Lima",
        email: session.user.email || "willianCLima@gmail.com",
        role: "SUPER_ADMIN",
        tenantId: session.organization?.id || currentTenant.id,
        avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80",
        phone: "(11) 98765-4321",
        title: "Fundador & CEO da Plataforma SaaS",
        bio: "Administrador mestre da infraestrutura SaaS AURA.",
      };

      toast.success("Autenticado com sucesso como Administrador da Plataforma (Central AURA).");
      onLoginSuccess(superUser, currentTenant, "PLATFORM_OWNER");
      onClose();
    } catch (err: any) {
      toast.error(err.message || "Falha ao autenticar administrador.");
    } finally {
      setIsAdminLoading(false);
    }
  };

  // 3. Handle Store Owner Registration (Trial 30 Dias)
  const handleRegisterTrial = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!regName.trim() || !regStoreName.trim() || !regEmail.trim()) {
      toast.error("Por favor, preencha todos os campos obrigatórios.");
      return;
    }

    if (!regPassword || regPassword.length < 6) {
      toast.error("Por favor, informe uma senha com no mínimo 6 caracteres.");
      return;
    }

    setIsRegLoading(true);

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userName: regName.trim(),
          organizationName: regStoreName.trim(),
          email: regEmail.trim(),
          password: regPassword,
          whatsapp: regWhatsapp.trim() || "",
          segment: "SEMIJOIAS",
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || "Erro ao registrar organização.");
      }

      const session = data.session;
      if (session?.jwt) {
        apiClient.setToken(session.jwt);
      }
      if (session?.organization?.id) {
        apiClient.setTenantId(session.organization.id);
      }

      const newUser: RBACUser = {
        id: session.user.id,
        name: session.user.name,
        email: session.user.email,
        role: "OWNER",
        tenantId: session.organization.id,
        avatar: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=200&auto=format&fit=crop&q=80",
        phone: regWhatsapp || "(19) 98765-4321",
        title: "Proprietária da Marca",
        bio: `Fundadora da ${session.organization.name}`,
      };

      const newTenant: TenantStore = {
        id: session.organization.id,
        name: session.organization.name,
        slug: session.organization.slug || "minha-loja",
        document: "00.000.000/0001-00",
        planTier: "TRIAL_30D" as any,
        logo: "https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?w=200&auto=format&fit=crop&q=80",
        activeProductsCount: 0,
        activeResellersCount: 0,
        features: {
          unlimitedProducts: true,
          consignments: true,
          commissionEngine: true,
          digitalWarranty: true,
          customJewelry: true,
          whatsappAutomations: true,
          aiGatewayMCP: true,
          marketplaces: true,
          multiUserRBAC: true,
        },
        customDomain: `${session.organization.slug}.aura.com`,
        customDomainStatus: "ACTIVE",
        contactWhatsapp: regWhatsapp || "(19) 98765-4321",
        contactEmail: regEmail,
        city: "Limeira",
        state: "SP",
      };

      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.6 },
      });

      toast.success(`🎉 Parabéns, ${regName}! Sua loja "${regStoreName}" foi criada com 30 dias de Trial ativo!`);
      onLoginSuccess(newUser, newTenant, "TENANT_STORE", true);
      onClose();
    } catch (err: any) {
      toast.error(err.message || "Erro ao cadastrar loja.");
    } finally {
      setIsRegLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-stone-950/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 animate-fadeIn">
      <div className="bg-stone-900 border border-stone-800 text-stone-100 rounded-3xl max-w-2xl w-full shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Top Header */}
        <div className="px-6 py-4 border-b border-stone-800 flex items-center justify-between bg-stone-950/60">
          <div className="flex items-center gap-3">
            <span className="w-8 h-8 rounded-xl bg-gradient-to-tr from-amber-500 to-amber-300 flex items-center justify-center font-serif font-black text-stone-950 text-sm shadow-sm">
              A
            </span>
            <div>
              <h2 className="font-bold text-white text-base tracking-tight flex items-center gap-2">
                Portal de Autenticação WLSaaSERP
              </h2>
              <p className="text-[11px] text-stone-400">
                Acesso seguro baseado nas 3 camadas: Administrador SaaS, Dona da Loja e Cliente
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-stone-400 hover:text-white hover:bg-stone-800 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-stone-800 bg-stone-950/30 px-4 pt-2 gap-2 overflow-x-auto scrollbar-none">
          <button
            onClick={() => setActiveTab("STORE_LOGIN")}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-t-xl text-xs font-bold transition-all border-b-2 whitespace-nowrap cursor-pointer ${
              activeTab === "STORE_LOGIN"
                ? "bg-stone-800/80 text-amber-400 border-amber-400"
                : "text-stone-400 border-transparent hover:text-stone-200"
            }`}
          >
            <Building2 className="w-4 h-4" />
            <span>Login da Lojista</span>
          </button>

          <button
            onClick={() => setActiveTab("ADMIN_LOGIN")}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-t-xl text-xs font-bold transition-all border-b-2 whitespace-nowrap cursor-pointer ${
              activeTab === "ADMIN_LOGIN"
                ? "bg-stone-800/80 text-amber-400 border-amber-400"
                : "text-stone-400 border-transparent hover:text-stone-200"
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            <span>Login Central AURA (Admin)</span>
          </button>

          <button
            onClick={() => setActiveTab("REGISTER_TRIAL")}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-t-xl text-xs font-bold transition-all border-b-2 whitespace-nowrap cursor-pointer ${
              activeTab === "REGISTER_TRIAL"
                ? "bg-stone-800/80 text-emerald-400 border-emerald-400"
                : "text-stone-400 border-transparent hover:text-stone-200"
            }`}
          >
            <Sparkles className="w-4 h-4" />
            <span>Criar Minha Loja (Trial)</span>
          </button>

          <button
            onClick={() => setActiveTab("EXPLANATION")}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-t-xl text-xs font-bold transition-all border-b-2 whitespace-nowrap cursor-pointer ml-auto ${
              activeTab === "EXPLANATION"
                ? "bg-stone-800/80 text-sky-400 border-sky-400"
                : "text-stone-400 border-transparent hover:text-stone-200"
            }`}
          >
            <Info className="w-4 h-4" />
            <span>Como Funciona o Acesso?</span>
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {/* TAB 1: STORE OWNER LOGIN */}
          {activeTab === "STORE_LOGIN" && (
            <div className="space-y-5">
              <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-4 flex items-start gap-3">
                <Building2 className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                <div className="text-xs text-stone-300 space-y-1">
                  <p className="font-bold text-amber-300">Camada 2 · ERP da Lojista (Dona da Marca)</p>
                  <p className="text-stone-400 leading-relaxed">
                    A dona da loja possui acesso protegido para gerenciar seu catálogo, estoque, pedidos recebidos,
                    faturamento e clientes. O login garante isolamento estrito de dados por loja (RLS).
                  </p>
                </div>
              </div>

              <form onSubmit={handleStoreLogin} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-stone-300 mb-1.5">
                    Loja / Organização
                  </label>
                  <select
                    value={selectedTenantId}
                    onChange={(e) => setSelectedTenantId(e.target.value)}
                    className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-amber-400"
                  >
                    {tenants.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name} (ID: {t.id})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-stone-300 mb-1.5">
                    E-mail da Dona da Loja
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-stone-500 absolute left-3.5 top-3" />
                    <input
                      type="email"
                      value={storeEmail}
                      onChange={(e) => setStoreEmail(e.target.value)}
                      placeholder="seu.email@sualoja.com.br"
                      required
                      className="w-full bg-stone-950 border border-stone-800 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-stone-600 focus:outline-none focus:border-amber-400"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-stone-300 mb-1.5">
                    Senha de Acesso
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-stone-500 absolute left-3.5 top-3" />
                    <input
                      type="password"
                      value={storePassword}
                      onChange={(e) => setStorePassword(e.target.value)}
                      placeholder="••••••••"
                      required
                      className="w-full bg-stone-950 border border-stone-800 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-stone-600 focus:outline-none focus:border-amber-400"
                    />
                  </div>
                </div>

                <div className="pt-2 flex items-center justify-between">
                  <div className="text-[11px] text-stone-500 flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
                    <span>Autenticação Bcrypt + JWT Multi-Tenant</span>
                  </div>
                  <button
                    type="submit"
                    disabled={isStoreLoading}
                    className="flex items-center gap-2 px-5 py-2.5 bg-amber-400 hover:bg-amber-300 text-stone-950 font-bold rounded-xl text-xs transition-colors shadow-md disabled:opacity-50 cursor-pointer"
                  >
                    {isStoreLoading ? (
                      <span>Autenticando...</span>
                    ) : (
                      <>
                        <span>Entrar no ERP da Loja</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </>
                    )}
                  </button>
                </div>
              </form>

              {/* Quick Demo Pre-fill for Development / Evaluation */}
              <div className="border-t border-stone-800 pt-4">
                <p className="text-[11px] font-semibold text-stone-400 mb-2">
                  Atalhos de Demonstração (Sandbox):
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setStoreEmail("contato@luminasemijoias.com.br");
                      setStorePassword("123456");
                      setSelectedTenantId("org-lumina-01");
                    }}
                    className="p-2.5 rounded-xl bg-stone-950 border border-stone-800 hover:border-amber-400/50 text-left transition-colors text-xs cursor-pointer"
                  >
                    <p className="font-bold text-white">Lumina Semijoias (Piloto 01)</p>
                    <p className="text-[10px] text-stone-500">contato@luminasemijoias.com.br</p>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setStoreEmail("maria@elegance.com");
                      setStorePassword("123456");
                      const eleg = tenants.find((t) => t.slug.includes("elegance"))?.id || selectedTenantId;
                      setSelectedTenantId(eleg);
                    }}
                    className="p-2.5 rounded-xl bg-stone-950 border border-stone-800 hover:border-amber-400/50 text-left transition-colors text-xs cursor-pointer"
                  >
                    <p className="font-bold text-white">Maria da Silva (Elegance)</p>
                    <p className="text-[10px] text-stone-500">maria@elegance.com</p>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: PLATFORM SUPER ADMIN LOGIN (CENTRAL AURA) */}
          {activeTab === "ADMIN_LOGIN" && (
            <div className="space-y-5">
              <div className="bg-stone-950 border border-amber-500/30 rounded-2xl p-4 flex items-start gap-3">
                <ShieldCheck className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                <div className="text-xs text-stone-300 space-y-1">
                  <p className="font-bold text-amber-400">Camada 1 · Central AURA (Dono da Plataforma SaaS)</p>
                  <p className="text-stone-400 leading-relaxed">
                    Acesso mestre e confidencial para administrar a empresa SaaS. Você controla as organizações,
                    status de assinaturas, planos, métricas de MRR/ARR, telemetria de banco de dados e auditoria.
                  </p>
                </div>
              </div>

              <form onSubmit={handleAdminLogin} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-stone-300 mb-1.5">
                    E-mail do Administrador Mestre (SaaS CEO)
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-amber-500 absolute left-3.5 top-3" />
                    <input
                      type="email"
                      value={adminEmail}
                      onChange={(e) => setAdminEmail(e.target.value)}
                      placeholder="willianCLima@gmail.com"
                      required
                      className="w-full bg-stone-950 border border-stone-800 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-stone-600 focus:outline-none focus:border-amber-400"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-stone-300 mb-1.5">
                    Chave de Acesso Master
                  </label>
                  <div className="relative">
                    <KeyRound className="w-4 h-4 text-amber-500 absolute left-3.5 top-3" />
                    <input
                      type="password"
                      value={adminPassword}
                      onChange={(e) => setAdminPassword(e.target.value)}
                      placeholder="••••••••"
                      required
                      className="w-full bg-stone-950 border border-stone-800 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-stone-600 focus:outline-none focus:border-amber-400"
                    />
                  </div>
                </div>

                <div className="p-3 bg-stone-950/70 border border-stone-800/80 rounded-xl text-[11px] text-stone-400 space-y-1">
                  <div className="flex items-center gap-1.5 text-amber-400 font-semibold">
                    <Lock className="w-3.5 h-3.5" />
                    <span>Proteção de Segurança:</span>
                  </div>
                  <p>
                    O acesso à Central AURA valida a flag de sistema <code className="text-amber-300 font-mono">isPlatformSuperAdmin</code>.
                    Nenhuma lojista ou cliente externo tem permissão para acessar este painel.
                  </p>
                </div>

                <div className="pt-2 flex items-center justify-between">
                  <div className="text-[11px] text-stone-500 flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
                    <span>Autenticação Master com RBAC & SuperAdmin Guard</span>
                  </div>
                  <button
                    type="submit"
                    disabled={isAdminLoading}
                    className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-stone-950 font-bold rounded-xl text-xs transition-all shadow-lg disabled:opacity-50 cursor-pointer"
                  >
                    {isAdminLoading ? (
                      <span>Autenticando Master...</span>
                    ) : (
                      <>
                        <ShieldCheck className="w-4 h-4" />
                        <span>Acessar Central AURA</span>
                      </>
                    )}
                  </button>
                </div>
              </form>

              {/* Master Admin Shortcut */}
              <div className="border-t border-stone-800 pt-4">
                <p className="text-[11px] font-semibold text-stone-400 mb-2">
                  Atalho de Acesso Master (Fundador & Administrador do Sistema):
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setAdminEmail("willianCLima@gmail.com");
                    setAdminPassword("admin123");
                  }}
                  className="w-full p-2.5 rounded-xl bg-stone-950 border border-amber-500/30 hover:border-amber-400 text-left transition-colors text-xs cursor-pointer flex items-center justify-between"
                >
                  <div>
                    <p className="font-bold text-amber-300">Willian C. Lima (CEO & SuperAdmin)</p>
                    <p className="text-[10px] text-stone-500">willianCLima@gmail.com • Senha: admin123</p>
                  </div>
                  <span className="text-[11px] text-amber-400 font-semibold px-2.5 py-1 rounded-lg bg-amber-500/10 border border-amber-500/20">
                    Preencher Credenciais
                  </span>
                </button>

                {onOpenSystemInitModal && (
                  <div className="mt-3 p-2.5 rounded-xl bg-stone-950/60 border border-stone-800 flex items-center justify-between text-[11px] text-stone-400">
                    <span className="flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                      <span>Inicialização do Ecossistema:</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        onOpenSystemInitModal();
                      }}
                      className="text-amber-400 hover:text-amber-300 font-semibold px-2 py-1 rounded-lg hover:bg-stone-800 transition-colors flex items-center gap-1 cursor-pointer"
                    >
                      <span>Configurar 1º Administrador Raiz</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 3: REGISTER NEW STORE (TRIAL 30 DIAS) */}
          {activeTab === "REGISTER_TRIAL" && (
            <div className="space-y-5">
              <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-4 flex items-start gap-3">
                <Sparkles className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                <div className="text-xs text-stone-300 space-y-1">
                  <p className="font-bold text-emerald-300">Nova Lojista · Cadastro com 30 Dias de Teste Grátis</p>
                  <p className="text-stone-400 leading-relaxed">
                    Ao se cadastrar, a dona da loja é automaticamente autenticada e direcionada para seu próprio ERP.
                    Ela ganha 30 dias de trial assistido para cadastrar produtos, compartilhar no WhatsApp e vender.
                  </p>
                </div>
              </div>

              <form onSubmit={handleRegisterTrial} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-stone-300 mb-1.5">
                      Nome da Responsável *
                    </label>
                    <div className="relative">
                      <User className="w-4 h-4 text-stone-500 absolute left-3.5 top-3" />
                      <input
                        type="text"
                        value={regName}
                        onChange={(e) => setRegName(e.target.value)}
                        placeholder="Ex: Maria Santos"
                        required
                        className="w-full bg-stone-950 border border-stone-800 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-stone-600 focus:outline-none focus:border-emerald-400"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-stone-300 mb-1.5">
                      Nome da Loja de Semijoias *
                    </label>
                    <div className="relative">
                      <Store className="w-4 h-4 text-stone-500 absolute left-3.5 top-3" />
                      <input
                        type="text"
                        value={regStoreName}
                        onChange={(e) => setRegStoreName(e.target.value)}
                        placeholder="Ex: Belle Semijoias Finas"
                        required
                        className="w-full bg-stone-950 border border-stone-800 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-stone-600 focus:outline-none focus:border-emerald-400"
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-stone-300 mb-1.5">
                      E-mail Profissional *
                    </label>
                    <div className="relative">
                      <Mail className="w-4 h-4 text-stone-500 absolute left-3.5 top-3" />
                      <input
                        type="email"
                        value={regEmail}
                        onChange={(e) => setRegEmail(e.target.value)}
                        placeholder="maria@bellesemijoias.com.br"
                        required
                        className="w-full bg-stone-950 border border-stone-800 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-stone-600 focus:outline-none focus:border-emerald-400"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-stone-300 mb-1.5">
                      WhatsApp com DDD
                    </label>
                    <div className="relative">
                      <Phone className="w-4 h-4 text-stone-500 absolute left-3.5 top-3" />
                      <input
                        type="text"
                        value={regWhatsapp}
                        onChange={(e) => setRegWhatsapp(e.target.value)}
                        placeholder="(19) 99876-5432"
                        className="w-full bg-stone-950 border border-stone-800 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-stone-600 focus:outline-none focus:border-emerald-400"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-stone-300 mb-1.5">
                    Criar Senha de Acesso *
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-stone-500 absolute left-3.5 top-3" />
                    <input
                      type="password"
                      value={regPassword}
                      onChange={(e) => setRegPassword(e.target.value)}
                      placeholder="Mínimo 6 dígitos (usará para entrar nos próximos acessos)"
                      required
                      className="w-full bg-stone-950 border border-stone-800 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-stone-600 focus:outline-none focus:border-emerald-400"
                    />
                  </div>
                  <p className="text-[10px] text-stone-500 mt-1">
                    Essa senha será exigida sempre que a lojista fizer login em outros dispositivos ou após logout.
                  </p>
                </div>

                <div className="pt-2 flex items-center justify-between">
                  <span className="text-[11px] text-emerald-400 font-semibold flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Trial de 30 dias incluso • Sem cartão de crédito
                  </span>

                  <button
                    type="submit"
                    disabled={isRegLoading}
                    className="flex items-center gap-2 px-6 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-stone-950 font-bold rounded-xl text-xs transition-colors shadow-md disabled:opacity-50 cursor-pointer"
                  >
                    {isRegLoading ? (
                      <span>Criando Loja...</span>
                    ) : (
                      <>
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>Iniciar Teste Grátis & Entrar</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* TAB 4: EXPLANATION - COMO FUNCIONA O ACESSO NO WLSaaSERP */}
          {activeTab === "EXPLANATION" && (
            <div className="space-y-6">
              <div>
                <h3 className="text-sm font-bold text-white">
                  Entendendo a Autenticação e Exigência de Login nas 3 Camadas
                </h3>
                <p className="text-xs text-stone-400 mt-0.5">
                  Respostas diretas sobre como funciona o login do Administrador, da Dona da Loja e da Consumidora.
                </p>
              </div>

              {/* Section 1: Administrador da Plataforma */}
              <div className="p-4 rounded-2xl bg-stone-950 border border-amber-500/20 space-y-2">
                <div className="flex items-center gap-2 text-amber-400 font-bold text-xs">
                  <ShieldCheck className="w-4 h-4" />
                  <span>1. Como funciona o Login do Administrador da Plataforma (Central AURA)?</span>
                </div>
                <p className="text-xs text-stone-300 leading-relaxed">
                  O painel da Central AURA é o centro de controle do <strong>seu negócio SaaS</strong>.
                  Ele exige autenticação estrita com credenciais que possuem a permissão de{" "}
                  <code className="bg-stone-900 px-1 py-0.5 rounded text-amber-300 font-mono">isPlatformSuperAdmin: true</code>.
                </p>
                <div className="text-[11px] text-stone-400 space-y-1 pl-4 border-l-2 border-amber-500/40">
                  <p>• <strong>Quem acessa:</strong> Você (Willian C. Lima) e sua equipe de suporte técnico.</p>
                  <p>• <strong>O que controla:</strong> Todas as lojas cadastradas, assinaturas, MRR real, isolamento de bancos e ativação de módulos.</p>
                  <p>• <strong>Segurança:</strong> Nenhuma lojista ou cliente externo tem permissão de entrar na AURA.</p>
                </div>
              </div>

              {/* Section 2: Dona da Loja */}
              <div className="p-4 rounded-2xl bg-stone-950 border border-stone-800 space-y-2">
                <div className="flex items-center gap-2 text-white font-bold text-xs">
                  <Building2 className="w-4 h-4 text-amber-400" />
                  <span>2. A dona da loja precisa de login após pedir acesso e se cadastrar?</span>
                </div>
                <div className="text-xs text-stone-300 space-y-2 leading-relaxed">
                  <div className="flex items-start gap-2 bg-stone-900/60 p-3 rounded-xl border border-stone-800">
                    <span className="text-emerald-400 font-bold text-xs shrink-0">① No Cadastro Inicial:</span>
                    <p className="text-stone-300 text-[11px]">
                      Ela ganha <strong>Auto-Login Imediato</strong>. O backend gera seu token JWT e abre o ERP da loja dela na hora.
                      Ela NÃO precisa redigitar a senha na primeira vez, permitindo que ela comece o teste sem barreiras de onboarding.
                    </p>
                  </div>

                  <div className="flex items-start gap-2 bg-stone-900/60 p-3 rounded-xl border border-stone-800">
                    <span className="text-amber-400 font-bold text-xs shrink-0">② Nos Acessos Seguintes:</span>
                    <p className="text-stone-300 text-[11px]">
                      <strong>SIM, EXIGE LOGIN OBRIGATÓRIO!</strong> Quando ela fechar o navegador, trocar de computador,
                      acessar pelo smartphone ou clicar em &quot;Sair&quot;, ela precisará digitar seu <strong>E-mail e Senha</strong>.
                      Isso protege o faturamento, custos de peças e clientes da loja dela.
                    </p>
                  </div>

                  <div className="flex items-start gap-2 bg-stone-900/60 p-3 rounded-xl border border-stone-800">
                    <span className="text-sky-400 font-bold text-xs shrink-0">③ Funcionárias & Vendedoras:</span>
                    <p className="text-stone-300 text-[11px]">
                      Se a lojista convidar sua equipe, cada vendedora ou estoquista terá login individual, vendo apenas o que lhe é permitido (RBAC).
                    </p>
                  </div>
                </div>
              </div>

              {/* Section 3: Consumidora Final */}
              <div className="p-4 rounded-2xl bg-stone-950 border border-stone-800 space-y-2">
                <div className="flex items-center gap-2 text-stone-200 font-bold text-xs">
                  <ShoppingBag className="w-4 h-4 text-emerald-400" />
                  <span>3. E a cliente que vai comprar as semijoias (Consumidor Final)?</span>
                </div>
                <p className="text-xs text-stone-300 leading-relaxed">
                  <strong>NÃO exige login!</strong> O consumidor final clica no link do catálogo recebido pelo WhatsApp ou Instagram Bio
                  (ex: <code className="bg-stone-900 px-1 py-0.5 rounded text-amber-300 font-mono">app.lumina.com/loja/lumina</code>),
                  escolhe as peças, coloca no carrinho e envia o pedido pelo WhatsApp sem precisar criar conta ou memorizar senha.
                  Zero atrito para maximizar a conversão de vendas da sua cliente.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer / Active Session Indicator */}
        <div className="p-4 border-t border-stone-800 bg-stone-950/80 flex items-center justify-between text-xs">
          {currentUser ? (
            <div className="flex items-center gap-2 text-stone-400">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>
                Sessão ativa: <strong className="text-white">{currentUser.name}</strong> ({currentUser.role})
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-stone-500">
              <span className="w-2 h-2 rounded-full bg-amber-400/60" />
              <span>Nenhuma sessão ativa</span>
            </div>
          )}

          <div className="flex items-center gap-2">
            {currentUser && (
              <button
                type="button"
                onClick={() => {
                  apiClient.logout();
                  toast.info("Credenciais e sessão local limpas com sucesso.");
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-stone-900 hover:bg-rose-950/40 text-stone-400 hover:text-rose-300 border border-stone-800 hover:border-rose-800/40 transition-colors text-[11px] cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Limpar Sessão Local</span>
              </button>
            )}

            <button
              onClick={onClose}
              className="px-4 py-1.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-white font-medium text-xs transition-colors cursor-pointer"
            >
              Fechar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
