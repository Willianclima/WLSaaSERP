import React, { useState, useEffect } from "react";
import {
  Building2,
  Calendar,
  CreditCard,
  CheckCircle2,
  AlertCircle,
  Plus,
  RefreshCw,
  Zap,
  Lock,
  DollarSign,
  QrCode,
  Shield,
  Layers,
  Sparkles,
} from "lucide-react";

interface SaaSControlPanelProps {
  onNotify?: (message: string) => void;
}

export const SaaSControlPanel: React.FC<SaaSControlPanelProps> = ({ onNotify }) => {
  const [loading, setLoading] = useState<boolean>(true);
  const [session, setSession] = useState<any>(null);
  const [plans, setPlans] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<"overview" | "plans" | "new_tenant" | "modules" | "diagnostic">("overview");

  // Diagnostic State
  const [diagnosticRunning, setDiagnosticRunning] = useState(false);
  const [diagnosticResults, setDiagnosticResults] = useState<any>(null);

  // New Tenant Form State
  const [orgName, setOrgName] = useState("");
  const [userName, setUserName] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const [userWhatsapp, setUserWhatsapp] = useState("");
  const [segment, setSegment] = useState<"SEMIJOIAS" | "MODA" | "COSMETICOS" | "VAREJO_GERAL">("SEMIJOIAS");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Upgrade Modal State
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<"PIX" | "CREDIT_CARD" | "BOLETO">("PIX");
  const [paymentSuccess, setPaymentSuccess] = useState(false);

  const fetchSession = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/auth/me");
      const data = await res.json();
      if (data.success && data.session) {
        setSession(data.session);
      }

      const plansRes = await fetch("/api/subscriptions/plans");
      const plansData = await plansRes.json();
      if (plansData.success && plansData.plans) {
        setPlans(plansData.plans);
      }
    } catch (err) {
      console.error("Erro ao carregar sessão SaaS:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSession();
  }, []);

  const handleRegisterTrial = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orgName || !userName || !userEmail) {
      if (onNotify) onNotify("Preencha nome da empresa, responsável e e-mail.");
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          organizationName: orgName,
          userName,
          email: userEmail,
          whatsapp: userWhatsapp,
          segment,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setSession(data.session);
        if (onNotify) onNotify(data.message);
        setOrgName("");
        setUserName("");
        setUserEmail("");
        setUserWhatsapp("");
        setActiveTab("overview");
      } else {
        if (onNotify) onNotify(`Erro: ${data.error}`);
      }
    } catch (err: any) {
      if (onNotify) onNotify(`Falha na requisição: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSwitchTenant = async (targetOrgId: string) => {
    try {
      setLoading(true);
      const res = await fetch("/api/auth/switch-tenant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetOrganizationId: targetOrgId }),
      });
      const data = await res.json();
      if (data.success) {
        setSession(data.session);
        if (onNotify) onNotify(`Contexto alternado para: ${data.session.organization.name}`);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSimulatePayment = async () => {
    if (!selectedPlanId) return;
    try {
      setIsSubmitting(true);
      const res = await fetch("/api/subscriptions/simulate-payment", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-tenant-id": session?.organization?.id,
        },
        body: JSON.stringify({
          targetPlanId: selectedPlanId,
          paymentMethod,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setPaymentSuccess(true);
        if (onNotify) onNotify(data.message);
        setTimeout(() => {
          setSelectedPlanId(null);
          setPaymentSuccess(false);
          fetchSession();
        }, 1800);
      } else {
        if (onNotify) onNotify(`Erro: ${data.error}`);
      }
    } catch (err: any) {
      if (onNotify) onNotify(`Falha: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRunDiagnostic = async () => {
    try {
      setDiagnosticRunning(true);
      const res = await fetch("/api/diagnostics/core-flow", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      const data = await res.json();
      setDiagnosticResults(data);
      if (data.pipelinePassed) {
        if (onNotify) onNotify("✅ Todos os 10 passos do SaaS Core foram validados com sucesso no backend!");
      } else {
        if (onNotify) onNotify("⚠️ Algum passo do diagnóstico encontrou inconsistência.");
      }
    } catch (err: any) {
      if (onNotify) onNotify(`Falha ao executar diagnóstico: ${err.message}`);
    } finally {
      setDiagnosticRunning(false);
    }
  };

  if (loading && !session) {
    return (
      <div className="bg-white border border-stone-200 rounded-3xl p-12 text-center text-stone-500">
        <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-3 text-stone-400" />
        <p className="text-sm font-medium">Carregando painel de gerenciamento SaaS & Multi-tenant...</p>
      </div>
    );
  }

  const currentOrg = session?.organization;
  const currentSub = session?.subscription;
  const daysRemaining = currentSub?.daysRemainingInTrial ?? 30;

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-stone-900 text-white rounded-3xl p-6 sm:p-8 shadow-md border border-stone-800 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold uppercase tracking-[0.25em] text-amber-400 bg-amber-950/60 px-2.5 py-0.5 rounded-full border border-amber-800/60">
              Multi-Tenant Core &amp; Billing
            </span>
            <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400">
              Segmento: {currentOrg?.segment || "SEMIJOIAS"}
            </span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-serif italic font-bold tracking-wide text-white">
            {currentOrg?.name || "Lumina Semijoias"}
          </h2>
          <p className="text-xs text-stone-300 max-w-2xl font-sans leading-relaxed">
            Plataforma SaaS multiempresa com isolamento de tenant, controle de permissões RBAC, máquina de estados do Trial de 30 dias e ativação modular por assinatura.
          </p>
        </div>

        {/* Trial Status Pill Card */}
        <div className="bg-stone-800/80 border border-stone-700/80 rounded-2xl p-4 sm:p-5 flex items-center gap-4 shrink-0">
          <div className="w-12 h-12 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400 font-serif font-bold text-lg">
            {daysRemaining}d
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold uppercase tracking-wide text-stone-200">
                {currentSub?.planName || "Trial 30 Dias"}
              </span>
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            </div>
            <p className="text-[11px] text-stone-400">
              {daysRemaining > 0 ? `${daysRemaining} dias restantes de degustação` : "Trial Concluído"}
            </p>
            <button
              onClick={() => setActiveTab("plans")}
              className="mt-2 text-[11px] font-bold text-amber-300 hover:text-amber-200 underline cursor-pointer"
            >
              Assinar ou Trocar Plano &rarr;
            </button>
          </div>
        </div>
      </div>

      {/* Navigation Subtabs */}
      <div className="flex items-center gap-2 border-b border-stone-200 pb-2 overflow-x-auto">
        <button
          onClick={() => setActiveTab("overview")}
          className={`px-4 py-2 text-xs font-bold rounded-xl transition-all ${
            activeTab === "overview"
              ? "bg-stone-900 text-white shadow-xs"
              : "text-stone-600 hover:bg-stone-100"
          }`}
        >
          Visão Geral &amp; Tenants
        </button>
        <button
          onClick={() => setActiveTab("plans")}
          className={`px-4 py-2 text-xs font-bold rounded-xl transition-all ${
            activeTab === "plans"
              ? "bg-stone-900 text-white shadow-xs"
              : "text-stone-600 hover:bg-stone-100"
          }`}
        >
          Planos &amp; Assinaturas
        </button>
        <button
          onClick={() => setActiveTab("new_tenant")}
          className={`px-4 py-2 text-xs font-bold rounded-xl transition-all ${
            activeTab === "new_tenant"
              ? "bg-stone-900 text-white shadow-xs"
              : "text-stone-600 hover:bg-stone-100"
          }`}
        >
          + Cadastrar Nova Empresa (Trial 30d)
        </button>
        <button
          onClick={() => setActiveTab("modules")}
          className={`px-4 py-2 text-xs font-bold rounded-xl transition-all ${
            activeTab === "modules"
              ? "bg-stone-900 text-white shadow-xs"
              : "text-stone-600 hover:bg-stone-100"
          }`}
        >
          Módulos do Sistema
        </button>
        <button
          onClick={() => {
            setActiveTab("diagnostic");
            if (!diagnosticResults) {
              handleRunDiagnostic();
            }
          }}
          className={`px-4 py-2 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 ${
            activeTab === "diagnostic"
              ? "bg-amber-400 text-stone-950 font-black shadow-xs"
              : "text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-200"
          }`}
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>Validação do Core (10 Passos)</span>
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === "overview" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Tenant Switcher Card */}
          <div className="lg:col-span-2 bg-white border border-stone-200 rounded-3xl p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-serif italic font-bold text-stone-900">
                  Organizações Vinculadas ao seu Usuário
                </h3>
                <p className="text-xs text-stone-500">
                  Como administrador multi-tenant, você pode alternar entre empresas em tempo real.
                </p>
              </div>
              <Building2 className="w-5 h-5 text-stone-400" />
            </div>

            <div className="space-y-3">
              {session?.availableOrganizations?.map((org: any) => {
                const isCurrent = org.id === currentOrg?.id;
                return (
                  <div
                    key={org.id}
                    className={`p-4 rounded-2xl border transition-all flex items-center justify-between ${
                      isCurrent
                        ? "bg-amber-50/50 border-amber-300/80 shadow-xs"
                        : "bg-stone-50 border-stone-200 hover:bg-stone-100/80"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-10 h-10 rounded-xl flex items-center justify-center font-serif font-bold text-sm ${
                          isCurrent
                            ? "bg-stone-900 text-amber-300"
                            : "bg-stone-200 text-stone-700"
                        }`}
                      >
                        {org.name.substring(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-stone-900">{org.name}</h4>
                        <div className="flex items-center gap-2 text-[11px] text-stone-500">
                          <span>Slug: {org.slug}</span>
                          <span>•</span>
                          <span className="font-semibold text-stone-700">Papel: {org.role}</span>
                        </div>
                      </div>
                    </div>

                    {isCurrent ? (
                      <span className="text-xs font-bold text-emerald-700 bg-emerald-100 border border-emerald-200 px-3 py-1 rounded-full flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Ativa
                      </span>
                    ) : (
                      <button
                        onClick={() => handleSwitchTenant(org.id)}
                        className="px-3 py-1.5 rounded-full bg-white border border-stone-300 hover:bg-stone-200 text-stone-800 text-xs font-bold transition-all cursor-pointer"
                      >
                        Alternar
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* SaaS Core Specs */}
          <div className="bg-white border border-stone-200 rounded-3xl p-6 shadow-xs space-y-4">
            <h3 className="text-base font-serif italic font-bold text-stone-900">
              Resumo da Assinatura
            </h3>
            <div className="space-y-3 text-xs">
              <div className="flex justify-between py-2 border-b border-stone-100">
                <span className="text-stone-500">Plano Vigente</span>
                <span className="font-bold text-stone-900">{currentSub?.planName}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-stone-100">
                <span className="text-stone-500">Status</span>
                <span className="font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
                  {currentSub?.status}
                </span>
              </div>
              <div className="flex justify-between py-2 border-b border-stone-100">
                <span className="text-stone-500">Fim do Trial</span>
                <span className="font-mono text-stone-700">{currentSub?.trialEndsAt || "N/A"}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-stone-100">
                <span className="text-stone-500">Domínio da Loja</span>
                <span className="font-mono text-stone-700">{currentOrg?.customDomain || "N/A"}</span>
              </div>
              <div className="flex justify-between py-2">
                <span className="text-stone-500">Módulos Ativos</span>
                <span className="font-bold text-stone-900">
                  {currentSub?.allowedModules?.length || 0} de 11
                </span>
              </div>
            </div>

            <button
              onClick={() => setActiveTab("plans")}
              className="w-full py-2.5 rounded-xl bg-stone-900 hover:bg-stone-800 text-amber-300 text-xs font-bold tracking-wide transition-all shadow-xs"
            >
              Simular Contratação de Plano &rarr;
            </button>
          </div>
        </div>
      )}

      {/* Tab: Plans & Pricing */}
      {activeTab === "plans" && (
        <div className="space-y-6">
          <div className="text-center max-w-2xl mx-auto space-y-1">
            <h3 className="text-2xl font-serif italic font-bold text-stone-900">
              Escolha o Plano Ideal para a Sua Empresa
            </h3>
            <p className="text-xs text-stone-500">
              Todos os planos incluem suporte ao isolamento multi-tenant, integrações e segurança.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {plans.map((plan) => {
              const isCurrent = currentSub?.planId === plan.id;
              return (
                <div
                  key={plan.id}
                  className={`bg-white rounded-3xl p-6 border flex flex-col justify-between transition-all ${
                    isCurrent
                      ? "border-amber-500 shadow-md ring-2 ring-amber-500/20"
                      : "border-stone-200 shadow-xs hover:border-stone-400"
                  }`}
                >
                  <div className="space-y-4">
                    {plan.highlightBadge && (
                      <span className="inline-block text-[10px] font-bold uppercase tracking-wider text-amber-800 bg-amber-100 px-2 py-0.5 rounded-full">
                        {plan.highlightBadge}
                      </span>
                    )}
                    <div>
                      <h4 className="text-base font-bold text-stone-900">{plan.name}</h4>
                      <p className="text-xs text-stone-500 mt-1">{plan.description}</p>
                    </div>

                    <div className="py-2 border-y border-stone-100">
                      <div className="flex items-baseline gap-1">
                        <span className="text-xs text-stone-500">R$</span>
                        <span className="text-3xl font-bold font-serif text-stone-900">
                          {plan.priceMonthlyBrl.toFixed(2).replace(".", ",")}
                        </span>
                        <span className="text-xs text-stone-500">/mês</span>
                      </div>
                    </div>

                    <ul className="space-y-2 text-xs text-stone-600">
                      <li className="flex items-center gap-2">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        <span>Até <strong>{plan.maxUsers}</strong> usuários</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        <span>Até <strong>{plan.maxProducts}</strong> produtos</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        <span>Até <strong>{plan.maxResellers}</strong> revendedoras</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        <span><strong>{plan.allowedModules?.length}</strong> módulos liberados</span>
                      </li>
                    </ul>
                  </div>

                  <div className="mt-6">
                    {isCurrent ? (
                      <button
                        disabled
                        className="w-full py-2.5 rounded-xl bg-stone-100 text-stone-500 text-xs font-bold border border-stone-200 cursor-default"
                      >
                        Plano Atual Ativo
                      </button>
                    ) : (
                      <button
                        onClick={() => setSelectedPlanId(plan.id)}
                        className="w-full py-2.5 rounded-xl bg-stone-900 hover:bg-stone-800 text-amber-300 text-xs font-bold tracking-wide transition-all shadow-xs cursor-pointer"
                      >
                        {plan.priceMonthlyBrl === 0 ? "Testar Grátis" : "Contratar Plano"}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Tab: New Tenant Registration (Trial 30 Days) */}
      {activeTab === "new_tenant" && (
        <div className="bg-white border border-stone-200 rounded-3xl p-6 sm:p-8 shadow-xs max-w-2xl mx-auto space-y-6">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
              Onboarding Automatizado
            </span>
            <h3 className="text-xl font-serif italic font-bold text-stone-900 mt-2">
              Cadastrar Nova Empresa com Trial de 30 Dias
            </h3>
            <p className="text-xs text-stone-500 mt-1">
              O sistema criará automaticamente a Organização independente, o usuário administrador, o vínculo de assinatura e liberará todos os módulos durante 30 dias.
            </p>
          </div>

          <form onSubmit={handleRegisterTrial} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">
                  Nome da Empresa / Loja *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Ateliê D'Oro Semijoias"
                  value={orgName}
                  onChange={(e) => setOrgName(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-stone-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-stone-900"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">
                  Segmento de Negócio
                </label>
                <select
                  value={segment}
                  onChange={(e: any) => setSegment(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-stone-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-stone-900"
                >
                  <option value="SEMIJOIAS">Semijoias &amp; Joias Contemporâneas</option>
                  <option value="MODA">Moda, Roupas &amp; Calçados</option>
                  <option value="COSMETICOS">Cosméticos &amp; Perfumaria</option>
                  <option value="VAREJO_GERAL">Varejo &amp; Distribuição Geral</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">
                  Nome do Administrador *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Carlos Eduardo"
                  value={userName}
                  onChange={(e) => setUserName(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-stone-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-stone-900"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">
                  E-mail Corporativo *
                </label>
                <input
                  type="email"
                  required
                  placeholder="admin@ateliedoro.com.br"
                  value={userEmail}
                  onChange={(e) => setUserEmail(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-stone-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-stone-900"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-stone-700 mb-1">
                WhatsApp Comercial
              </label>
              <input
                type="text"
                placeholder="+55 (11) 98765-4321"
                value={userWhatsapp}
                onChange={(e) => setUserWhatsapp(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-stone-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-stone-900"
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3 rounded-xl bg-stone-900 hover:bg-stone-800 text-amber-300 text-xs font-bold tracking-wide transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
            >
              {isSubmitting ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <Plus className="w-4 h-4" />
              )}
              <span>Criar Empresa &amp; Liberar Trial de 30 Dias</span>
            </button>
          </form>
        </div>
      )}

      {/* Tab: System Modules */}
      {activeTab === "modules" && (
        <div className="bg-white border border-stone-200 rounded-3xl p-6 shadow-xs space-y-4">
          <div>
            <h3 className="text-base font-serif italic font-bold text-stone-900">
              Módulos Ativos para {currentOrg?.name}
            </h3>
            <p className="text-xs text-stone-500">
              Recursos disponíveis sob a assinatura atual ({currentSub?.planName}).
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {[
              { key: "core_erp", name: "Core ERP & Cadastros", desc: "Gestão central de dados e usuários" },
              { key: "catalog_inventory", name: "Catálogo & Ledger de Estoque", desc: "Controle duplo físico + consignado" },
              { key: "consignments", name: "Gestão de Maletas e Consignações", desc: "Acertos automáticos e saldo pendente" },
              { key: "commission_engine", name: "Motor de Comissões Escalonadas", desc: "Cálculo progressivo e bônus de líder" },
              { key: "digital_warranty", name: "Garantia Digital QR Code", desc: "Passaporte digital e histórico de sinistros" },
              { key: "custom_jewelry", name: "Estúdio de Joias Personalizadas", desc: "Gravação a laser e prévia visual" },
              { key: "ecommerce_storefront", name: "Loja do Comprador & Vitrine", desc: "Catálogo B2C com checkout integrado" },
              { key: "custom_domain_ssl", name: "Domínio Próprio & SSL", desc: "CNAME e HTTPS auto-gerenciado" },
              { key: "webhooks_api", name: "Webhooks Externos & Eventos", desc: "Integração HTTP com ERPs e logística" },
              { key: "ai_copilot_mcp", name: "AI Copilot & MCP Gateway", desc: "Inteligência operacional com governança" },
              { key: "security_lgpd", name: "Auditoria & Conformidade LGPD", desc: "Trilha imutável e controle de acessos" },
            ].map((mod) => {
              const isAllowed = currentSub?.allowedModules?.includes(mod.key);
              return (
                <div
                  key={mod.key}
                  className={`p-4 rounded-2xl border transition-all ${
                    isAllowed
                      ? "bg-emerald-50/40 border-emerald-200 text-stone-900"
                      : "bg-stone-50 border-stone-200 opacity-60 text-stone-400"
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold">{mod.name}</span>
                    {isAllowed ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    ) : (
                      <Lock className="w-4 h-4 text-stone-400 shrink-0" />
                    )}
                  </div>
                  <p className="text-[11px] text-stone-500">{mod.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Tab: Core Pipeline Diagnostic (10 Steps) */}
      {activeTab === "diagnostic" && (
        <div className="bg-white border border-stone-200 rounded-3xl p-6 sm:p-8 shadow-xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-stone-100 pb-5">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900 uppercase tracking-wide">
                  Validador de Pipeline Backend
                </span>
                {diagnosticResults?.pipelinePassed && (
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                    10/10 Passos Verificados
                  </span>
                )}
              </div>
              <h3 className="text-xl font-serif italic font-bold text-stone-900">
                Auditoria de Persistência &amp; Fluxo do Core (10 Passos)
              </h3>
              <p className="text-xs text-stone-500 max-w-2xl mt-1 leading-relaxed">
                Executa o ciclo completo de ponta a ponta: do cadastro de uma nova organização, criação de usuário, associação N:N (Membership), inicialização do Trial de 30 dias na máquina de estados, emissão do token e resolução do tenant ativo até a auditoria final de permissões e módulos.
              </p>
            </div>

            <button
              type="button"
              onClick={handleRunDiagnostic}
              disabled={diagnosticRunning}
              className="px-5 py-3 rounded-2xl bg-stone-900 hover:bg-stone-800 text-amber-300 text-xs font-bold tracking-wide transition-all shadow-md flex items-center justify-center gap-2 shrink-0 cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${diagnosticRunning ? "animate-spin" : ""}`} />
              <span>{diagnosticRunning ? "Executando Testes..." : "Reexecutar Validação Real"}</span>
            </button>
          </div>

          {/* Diagnostic Loading State */}
          {diagnosticRunning && (
            <div className="py-12 text-center space-y-3">
              <RefreshCw className="w-8 h-8 animate-spin mx-auto text-amber-600" />
              <p className="text-sm font-bold text-stone-700">Validando persistência e integridade das entidades...</p>
              <p className="text-xs text-stone-400">Testando POST /register, Users, Orgs, Subscriptions e RBAC.</p>
            </div>
          )}

          {/* Diagnostic Output List */}
          {!diagnosticRunning && diagnosticResults && (
            <div className="space-y-4">
              <div className="flex items-center justify-between bg-stone-900 text-white p-4 rounded-2xl">
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold ${
                    diagnosticResults.pipelinePassed ? "bg-emerald-500 text-white" : "bg-rose-500 text-white"
                  }`}>
                    {diagnosticResults.pipelinePassed ? "✓" : "!"}
                  </div>
                  <div>
                    <h4 className="text-sm font-bold">
                      {diagnosticResults.pipelinePassed
                        ? "Pipeline do Core 100% Funcional e Persistido"
                        : "Inconsistência detectada no Pipeline"}
                    </h4>
                    <p className="text-[11px] text-stone-300">
                      Organização de Teste: {diagnosticResults.testedOrganization?.name} ({diagnosticResults.testedOrganization?.slug})
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-xs font-mono text-amber-400 font-bold">
                    {diagnosticResults.passedCount} / {diagnosticResults.totalSteps} aprovados
                  </span>
                  <p className="text-[10px] text-stone-400 font-mono">
                    {new Date(diagnosticResults.timestamp).toLocaleTimeString()}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-2.5">
                {diagnosticResults.steps?.map((step: any) => (
                  <div
                    key={step.step}
                    className={`p-4 rounded-2xl border transition-all ${
                      step.passed
                        ? "bg-stone-50/70 border-stone-200 hover:border-stone-300"
                        : "bg-rose-50 border-rose-200"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3">
                        <div className={`w-6 h-6 rounded-lg text-xs font-bold flex items-center justify-center shrink-0 mt-0.5 ${
                          step.passed ? "bg-emerald-100 text-emerald-800" : "bg-rose-100 text-rose-800"
                        }`}>
                          {step.step}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h5 className="text-xs font-bold text-stone-900">{step.title}</h5>
                            {step.passed ? (
                              <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.2 rounded-full">
                                PASS
                              </span>
                            ) : (
                              <span className="text-[10px] font-bold text-rose-700 bg-rose-50 border border-rose-200 px-2 py-0.2 rounded-full">
                                FAIL
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-stone-600 mt-1 leading-relaxed">{step.details}</p>

                          {step.dataSnippet && (
                            <div className="mt-2 text-[10.5px] font-mono bg-stone-900 text-stone-300 p-2 rounded-xl overflow-x-auto max-h-24">
                              {JSON.stringify(step.dataSnippet, null, 2)}
                            </div>
                          )}
                        </div>
                      </div>
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-1" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Simulated Payment / Upgrade Modal */}
      {selectedPlanId && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl border border-stone-200 space-y-6 animate-in fade-in zoom-in duration-150">
            {paymentSuccess ? (
              <div className="text-center py-6 space-y-3">
                <div className="w-14 h-14 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <h3 className="text-xl font-serif italic font-bold text-stone-900">
                  Assinatura Confirmada!
                </h3>
                <p className="text-xs text-stone-600">
                  O webhook do gateway validou o pagamento e os novos módulos já estão liberados para a sua empresa.
                </p>
              </div>
            ) : (
              <>
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                      Checkout Recorrente
                    </span>
                    <h3 className="text-lg font-serif italic font-bold text-stone-900 mt-1">
                      Confirmar Assinatura: {plans.find((p) => p.id === selectedPlanId)?.name}
                    </h3>
                  </div>
                  <button
                    onClick={() => setSelectedPlanId(null)}
                    className="text-stone-400 hover:text-stone-600 text-sm font-bold"
                  >
                    ✕
                  </button>
                </div>

                <div className="p-4 bg-stone-50 rounded-2xl border border-stone-200 space-y-3 text-xs">
                  <div className="flex justify-between">
                    <span className="text-stone-500">Organização:</span>
                    <span className="font-bold text-stone-900">{currentOrg?.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-stone-500">Valor Mensal:</span>
                    <span className="font-bold font-serif text-sm text-stone-900">
                      R$ {plans.find((p) => p.id === selectedPlanId)?.priceMonthlyBrl?.toFixed(2).replace(".", ",")}
                    </span>
                  </div>
                </div>

                {/* Payment Method Selector */}
                <div className="space-y-2">
                  <label className="block text-xs font-bold text-stone-700">
                    Forma de Pagamento
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => setPaymentMethod("PIX")}
                      className={`p-2.5 rounded-xl border text-xs font-bold flex flex-col items-center gap-1 transition-all ${
                        paymentMethod === "PIX"
                          ? "bg-amber-50 border-amber-400 text-stone-900"
                          : "bg-white border-stone-200 text-stone-600"
                      }`}
                    >
                      <QrCode className="w-4 h-4 text-emerald-600" />
                      <span>PIX Instant</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setPaymentMethod("CREDIT_CARD")}
                      className={`p-2.5 rounded-xl border text-xs font-bold flex flex-col items-center gap-1 transition-all ${
                        paymentMethod === "CREDIT_CARD"
                          ? "bg-amber-50 border-amber-400 text-stone-900"
                          : "bg-white border-stone-200 text-stone-600"
                      }`}
                    >
                      <CreditCard className="w-4 h-4 text-stone-700" />
                      <span>Cartão</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setPaymentMethod("BOLETO")}
                      className={`p-2.5 rounded-xl border text-xs font-bold flex flex-col items-center gap-1 transition-all ${
                        paymentMethod === "BOLETO"
                          ? "bg-amber-50 border-amber-400 text-stone-900"
                          : "bg-white border-stone-200 text-stone-600"
                      }`}
                    >
                      <DollarSign className="w-4 h-4 text-amber-600" />
                      <span>Boleto</span>
                    </button>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleSimulatePayment}
                  disabled={isSubmitting}
                  className="w-full py-3 rounded-xl bg-stone-900 hover:bg-stone-800 text-amber-300 text-xs font-bold tracking-wide transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
                >
                  {isSubmitting ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <CheckCircle2 className="w-4 h-4" />
                  )}
                  <span>Confirmar &amp; Ativar Plano</span>
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
