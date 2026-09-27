import React from "react";
import {
  ShieldAlert,
  ShieldCheck,
  Building2,
  Lock,
  KeyRound,
  Store,
  Sparkles,
  ArrowRight,
  LogOut,
  ShoppingBag,
  Info,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";
import { RBACUser, TenantStore } from "../../types";
import { ProductMode } from "../platform/PlatformHeader";

interface RBACAuthMiddlewareProps {
  mode: ProductMode;
  currentUser: RBACUser | null;
  isAuthenticated: boolean;
  isValidatingSession: boolean;
  selectedTenant: TenantStore;
  onOpenAuthModal: (defaultTab?: "STORE_LOGIN" | "ADMIN_LOGIN" | "REGISTER_TRIAL" | "EXPLANATION") => void;
  onSwitchMode: (mode: ProductMode) => void;
  onLogout: () => void;
  children: React.ReactNode;
}

export const RBACAuthMiddleware: React.FC<RBACAuthMiddlewareProps> = ({
  mode,
  currentUser,
  isAuthenticated,
  isValidatingSession,
  selectedTenant,
  onOpenAuthModal,
  onSwitchMode,
  onLogout,
  children,
}) => {
  // 1. Camada 3: Loja Pública / Catálogo de Consumidor
  // Acesso 100% público. Não exige login nem token.
  if (mode === "STORE_CONSUMER") {
    return <>{children}</>;
  }

  // 2. Estado de Validação em Andamento (Evita flashes ou falsos bloqueios)
  if (isValidatingSession) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center p-6 text-center animate-fadeIn">
        <div className="relative mb-4">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-500 animate-pulse">
            <Lock className="w-6 h-6 animate-spin" />
          </div>
        </div>
        <h3 className="text-base font-bold text-stone-900 dark:text-stone-100">
          Validando Sessão de Acesso...
        </h3>
        <p className="text-xs text-stone-500 mt-1 max-w-sm">
          Verificando integridade do token JWT e políticas de autorização RBAC com o servidor PostgreSQL.
        </p>
      </div>
    );
  }

  // 3. Usuário NÃO Autenticado (Sem Token Válido)
  // Bloqueia a renderização de componentes críticos e força redirecionamento/tela de login
  if (!isAuthenticated || !currentUser) {
    const isPlatformMode = mode === "PLATFORM_OWNER";

    return (
      <div className="min-h-[75vh] flex items-center justify-center p-4 sm:p-6 animate-fadeIn">
        <div className="max-w-xl w-full bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-3xl p-6 sm:p-8 shadow-xl text-center space-y-6">
          {/* Badge & Icon */}
          <div className="flex flex-col items-center">
            <div
              className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-inner mb-3 ${
                isPlatformMode
                  ? "bg-amber-500/10 text-amber-500 border border-amber-500/30"
                  : "bg-emerald-500/10 text-emerald-600 border border-emerald-500/30"
              }`}
            >
              {isPlatformMode ? <Lock className="w-7 h-7" /> : <Store className="w-7 h-7" />}
            </div>

            <span
              className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                isPlatformMode
                  ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20"
                  : "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20"
              }`}
            >
              {isPlatformMode ? "Camada 1 · Central AURA" : `Camada 2 · ERP da Loja (${selectedTenant.name})`}
            </span>

            <h2 className="text-2xl font-serif font-bold text-stone-900 dark:text-stone-100 mt-2">
              Autenticação Obrigatória
            </h2>

            <p className="text-xs sm:text-sm text-stone-600 dark:text-stone-400 mt-1 max-w-md">
              {isPlatformMode
                ? "O Painel de Governança AURA é restrito ao Administrador Mestre da Plataforma. É necessário fazer login com seu token de SuperAdmin para acessar métricas, base de inquilinos e controle financeiro."
                : `A área administrativa de ${selectedTenant.name} é restrita à proprietária e colaboradoras autorizadas. Faça login com suas credenciais ou crie um cadastro de teste com 30 dias grátis.`}
            </p>
          </div>

          {/* Action CTAs */}
          <div className="space-y-2.5 pt-2">
            {isPlatformMode ? (
              <>
                <button
                  onClick={() => onOpenAuthModal("ADMIN_LOGIN")}
                  className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold rounded-2xl shadow-md transition-all cursor-pointer text-sm"
                >
                  <KeyRound className="w-4 h-4" />
                  <span>Entrar como Administrador da Plataforma (SuperAdmin)</span>
                  <ArrowRight className="w-4 h-4 ml-1" />
                </button>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                  <button
                    onClick={() => {
                      onSwitchMode("TENANT_STORE");
                      onOpenAuthModal("STORE_LOGIN");
                    }}
                    className="flex items-center justify-center gap-1.5 py-2.5 px-3 bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 text-stone-800 dark:text-stone-200 text-xs font-semibold rounded-xl transition-all cursor-pointer"
                  >
                    <Building2 className="w-3.5 h-3.5 text-stone-500" />
                    <span>Sou Lojista (Entrar no ERP)</span>
                  </button>

                  <button
                    onClick={() => onSwitchMode("STORE_CONSUMER")}
                    className="flex items-center justify-center gap-1.5 py-2.5 px-3 bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 text-stone-800 dark:text-stone-200 text-xs font-semibold rounded-xl transition-all cursor-pointer"
                  >
                    <ShoppingBag className="w-3.5 h-3.5 text-amber-500" />
                    <span>Ver Loja Pública (Sem Login)</span>
                  </button>
                </div>
              </>
            ) : (
              <>
                <button
                  onClick={() => onOpenAuthModal("STORE_LOGIN")}
                  className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-stone-950 dark:bg-amber-400 dark:text-stone-950 text-white font-bold rounded-2xl shadow-md transition-all cursor-pointer text-sm"
                >
                  <KeyRound className="w-4 h-4" />
                  <span>Fazer Login na Minha Loja (ERP)</span>
                  <ArrowRight className="w-4 h-4 ml-1" />
                </button>

                <button
                  onClick={() => onOpenAuthModal("REGISTER_TRIAL")}
                  className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/30 font-semibold rounded-2xl transition-all cursor-pointer text-xs"
                >
                  <Sparkles className="w-4 h-4 text-amber-500" />
                  <span>Cadastrar Minha Marca (Trial de 30 Dias Grátis)</span>
                </button>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                  <button
                    onClick={() => onSwitchMode("STORE_CONSUMER")}
                    className="flex items-center justify-center gap-1.5 py-2.5 px-3 bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-300 text-xs font-semibold rounded-xl transition-all cursor-pointer"
                  >
                    <ShoppingBag className="w-3.5 h-3.5 text-amber-500" />
                    <span>Explorar Catálogo Público</span>
                  </button>

                  <button
                    onClick={() => onOpenAuthModal("ADMIN_LOGIN")}
                    className="flex items-center justify-center gap-1.5 py-2.5 px-3 bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-300 text-xs font-semibold rounded-xl transition-all cursor-pointer"
                  >
                    <ShieldCheck className="w-3.5 h-3.5 text-amber-500" />
                    <span>Login Administrador AURA</span>
                  </button>
                </div>
              </>
            )}
          </div>

          {/* Security Guarantee Microcopy */}
          <div className="pt-2 border-t border-stone-200 dark:border-stone-800 flex items-center justify-center gap-2 text-[11px] text-stone-500">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
            <span>Sessão protegida por JWT RFC 7519, RLS no PostgreSQL e autorização RBAC rigorosa</span>
          </div>
        </div>
      </div>
    );
  }

  // 4. Usuário Autenticado tentando acessar Camada 1 (AURA/SuperAdmin) SEM ser SUPER_ADMIN
  // Bloqueio rigoroso de autorização (403 Forbidden): Lojistas e membros de loja não acessam AURA
  if (mode === "PLATFORM_OWNER") {
    const isSuperAdmin = currentUser.role === "SUPER_ADMIN";

    if (!isSuperAdmin) {
      return (
        <div className="min-h-[75vh] flex items-center justify-center p-4 sm:p-6 animate-fadeIn">
          <div className="max-w-xl w-full bg-stone-900 border border-rose-500/30 rounded-3xl p-6 sm:p-8 shadow-2xl text-center space-y-6 text-stone-100">
            {/* Warning Shield */}
            <div className="flex flex-col items-center">
              <div className="w-14 h-14 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400 shadow-inner mb-3">
                <ShieldAlert className="w-7 h-7" />
              </div>

              <span className="px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-rose-500/20 text-rose-300 border border-rose-500/40">
                Acesso Negado · RBAC 403 Forbidden
              </span>

              <h2 className="text-2xl font-serif font-bold text-white mt-2">
                Área Restrita à Governança AURA
              </h2>

              <p className="text-xs sm:text-sm text-stone-300 mt-2 max-w-md">
                Você está autenticada como <strong className="text-amber-400 font-bold">{currentUser.name}</strong> com o papel{" "}
                <span className="px-2 py-0.5 rounded bg-stone-800 border border-stone-700 text-amber-300 font-mono text-xs">
                  {currentUser.role}
                </span>{" "}
                na loja <strong className="text-white">{selectedTenant.name}</strong>.
              </p>

              <div className="bg-stone-950 border border-stone-800 rounded-2xl p-4 text-left text-xs text-stone-400 space-y-1.5 mt-4 w-full">
                <div className="flex items-center gap-2 text-stone-200 font-semibold">
                  <AlertTriangle className="w-4 h-4 text-amber-400" />
                  <span>Por que você está vendo esta tela?</span>
                </div>
                <p>
                  O Painel AURA (Camada 1) é o centro de controle global da infraestrutura SaaS, responsável por gerenciar contratos,
                  faturamento de assinaturas, provisionamento de bancos PostgreSQL e telemetria de todas as organizações.
                </p>
                <p className="text-rose-400">
                  Usuários de lojas (como Proprietárias, Gerentes e Vendedoras) possuem acesso exclusivo ao ERP de sua respectiva marca e não possuem privilégios de SuperAdmin.
                </p>
              </div>
            </div>

            {/* Recovery CTAs */}
            <div className="space-y-2.5 pt-2">
              <button
                onClick={() => onSwitchMode("TENANT_STORE")}
                className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-amber-400 hover:bg-amber-300 text-stone-950 font-bold rounded-2xl shadow-md transition-all cursor-pointer text-sm"
              >
                <Building2 className="w-4 h-4" />
                <span>Voltar ao ERP da Minha Loja ({selectedTenant.name})</span>
                <ArrowRight className="w-4 h-4 ml-1" />
              </button>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                <button
                  onClick={() => onOpenAuthModal("ADMIN_LOGIN")}
                  className="flex items-center justify-center gap-1.5 py-2.5 px-3 bg-stone-800 hover:bg-stone-700 text-amber-300 border border-stone-700 text-xs font-semibold rounded-xl transition-all cursor-pointer"
                >
                  <KeyRound className="w-3.5 h-3.5 text-amber-400" />
                  <span>Entrar com Conta SuperAdmin</span>
                </button>

                <button
                  onClick={onLogout}
                  className="flex items-center justify-center gap-1.5 py-2.5 px-3 bg-stone-800 hover:bg-stone-700 text-stone-300 border border-stone-700 text-xs font-semibold rounded-xl transition-all cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5 text-stone-400" />
                  <span>Trocar de Conta / Sair</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      );
    }
  }

  // 5. Autorização Concedida! Renderiza o componente solicitado
  return <>{children}</>;
};
