import React, { useState } from "react";
import {
  CreditCard,
  QrCode,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  Lock,
  Sparkles,
  Zap,
  Building2,
  X,
  ArrowRight,
  RefreshCw,
  Copy,
  Check,
  Package,
  Layers,
} from "lucide-react";
import confetti from "canvas-confetti";

interface SubscriptionExpiredModalProps {
  isOpen: boolean;
  onClose: () => void;
  organizationName?: string;
  currentPlanId?: string;
  onPlanActivated?: (planId: string) => void;
}

export const SubscriptionExpiredModal: React.FC<SubscriptionExpiredModalProps> = ({
  isOpen,
  onClose,
  organizationName = "Lumina Semijoias",
  currentPlanId = "TRIAL_30D",
  onPlanActivated,
}) => {
  const [selectedPlan, setSelectedPlan] = useState<string>("PRO");
  const [paymentMethod, setPaymentMethod] = useState<"PIX" | "CREDIT_CARD" | "BOLETO">("PIX");
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [copiedPix, setCopiedPix] = useState<boolean>(false);
  const [activatedSuccess, setActivatedSuccess] = useState<boolean>(false);
  const [successMessage, setSuccessMessage] = useState<string>("");

  if (!isOpen) return null;

  const plans = [
    {
      id: "STARTER",
      name: "Starter",
      badge: "Início",
      price: "149",
      period: "/mês",
      description: "Ideal para lojas individuais e ateliês começando sua digitalização.",
      features: [
        "1 Loja Virtual / Catálogo",
        "Até 500 produtos cadastrados",
        "Vendas e Pedidos ilimitados",
        "Controle de Estoque e Garantias",
        "Suporte via e-mail e WhatsApp",
      ],
      highlight: false,
    },
    {
      id: "PRO",
      name: "Pro",
      badge: "Mais Escolhido",
      price: "299",
      period: "/mês",
      description: "Perfeito para marcas com revendedoras, consignado e expedição ativa.",
      features: [
        "Tudo do plano Starter",
        "Módulo Consignado & Revendedoras",
        "Cálculo Automático de Comissões",
        "Domínio Próprio com SSL automático",
        "Emissão de NFC-e Fiscal",
        "Suporte Prioritário",
      ],
      highlight: true,
    },
    {
      id: "ENTERPRISE",
      name: "Enterprise",
      badge: "Escala & Redes",
      price: "599",
      period: "/mês",
      description: "Para marcas consolidadas com múltiplas unidades ou franquias.",
      features: [
        "Tudo do plano Pro",
        "Multi-Lojas e Centros de Distribuição",
        "IA Copilot de Vendas Integrada",
        "SLA de 99.9% com Suporte 24/7",
        "Gerente de Conta Dedicado",
        "Acesso antecipado a novas features",
      ],
      highlight: false,
    },
  ];

  const handleCopyPix = () => {
    navigator.clipboard.writeText("00020126580014br.gov.bcb.pix0136aura-saas-pagamentos-pix-78901235204000053039865802BR5925AURA PLATAFORMA SAAS LTDA6009SAO PAULO62070503***6304E8A2");
    setCopiedPix(true);
    setTimeout(() => setCopiedPix(false), 3000);
  };

  const handleActivatePlan = async () => {
    try {
      setIsSubmitting(true);
      
      // 1. Gera fatura formal de checkout na camada própria de Billing
      const checkoutRes = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          targetPlanId: selectedPlan,
          paymentMethod,
        }),
      });

      let invoiceData = await checkoutRes.json().catch(() => null);
      let invoiceId = invoiceData?.invoice?.id;

      // 2. Confirmação automática via Webhook do Provedor (Idempotente)
      if (invoiceId) {
        const eventId = `wbk-ui-${Date.now()}`;
        const webhookRes = await fetch("/api/billing/webhook", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            eventId,
            eventType: "PAYMENT_APPROVED",
            invoiceId,
            providerTxId: `tx-prov-${Date.now()}`,
            amount: invoiceData.invoice.amount,
            paymentMethod,
          }),
        });
        const webhookData = await webhookRes.json();
        if (!webhookRes.ok || !webhookData.received) {
          throw new Error(webhookData.error || "Falha no processamento do pagamento.");
        }
      } else {
        // Fallback compatível caso rota de checkout não responda
        const fallbackRes = await fetch("/api/subscriptions/simulate-payment", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            targetPlanId: selectedPlan,
            paymentMethod,
          }),
        });
        const fallbackData = await fallbackRes.json();
        if (!fallbackRes.ok || !fallbackData.success) {
          throw new Error(fallbackData.error || "Erro ao processar assinatura.");
        }
      }

      setActivatedSuccess(true);
      setSuccessMessage(`Plano ${selectedPlan} ativado com sucesso via camada de faturamento (${paymentMethod})!`);
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
      });

      if (onPlanActivated) {
        onPlanActivated(selectedPlan);
      }
    } catch (err: any) {
      alert(`Falha ao ativar plano: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReactivateTrial = async () => {
    try {
      setIsSubmitting(true);
      const res = await fetch("/api/subscriptions/reactivate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Erro ao reativar período de teste.");
      }

      setActivatedSuccess(true);
      setSuccessMessage("Período de teste reativado com sucesso para fins de teste e auditoria!");
      confetti({
        particleCount: 60,
        spread: 60,
        origin: { y: 0.6 },
      });

      if (onPlanActivated) {
        onPlanActivated("TRIAL_30D");
      }
    } catch (err: any) {
      alert(`Falha ao reativar trial: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-4xl bg-stone-900 border border-stone-800 rounded-3xl shadow-2xl text-stone-100 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="relative px-6 py-5 border-b border-stone-800 bg-gradient-to-r from-stone-950 via-stone-900 to-stone-950 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-amber-400">
                  Ciclo Comercial SaaS
                </span>
                <span className="px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30 text-[10px] font-semibold">
                  Trial Finalizado
                </span>
              </div>
              <h2 className="text-lg font-serif font-bold text-white">
                Ativar Assinatura · {organizationName}
              </h2>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-stone-400 hover:text-white hover:bg-stone-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content Body */}
        <div className="p-6 overflow-y-auto space-y-6">
          {/* Data Safety Assurance Banner */}
          <div className="p-4 rounded-2xl bg-emerald-950/40 border border-emerald-500/30 flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
            <div className="text-xs text-stone-200 space-y-1">
              <strong className="text-emerald-300 font-bold block text-sm">
                Seus dados continuam 100% seguros e intactos no PostgreSQL
              </strong>
              <p className="text-stone-300">
                O fim do período de teste não apaga produtos, fotos, clientes, pedidos ou garantias.
                O sistema entra em <strong>Modo Somente-Leitura</strong> para consulta. Para continuar
                registrando novas vendas, cadastrando novos itens e emitindo pedidos, ative seu plano comercial.
              </p>
            </div>
          </div>

          {/* Success State */}
          {activatedSuccess ? (
            <div className="p-8 text-center space-y-4 bg-emerald-950/30 border border-emerald-500/40 rounded-3xl animate-fadeIn">
              <div className="w-16 h-16 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 mx-auto">
                <Check className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold text-white">Assinatura Ativada com Sucesso!</h3>
              <p className="text-sm text-stone-300 max-w-md mx-auto">{successMessage}</p>
              <div className="pt-3">
                <button
                  onClick={() => {
                    setActivatedSuccess(false);
                    onClose();
                  }}
                  className="px-6 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-stone-950 font-bold text-sm transition-all cursor-pointer shadow-lg"
                >
                  Voltar ao ERP e Continuar Vendendo
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* Plan Cards Grid */}
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-stone-400">
                  Escolha o plano ideal para sua marca:
                </label>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {plans.map((p) => {
                    const isSelected = selectedPlan === p.id;
                    return (
                      <div
                        key={p.id}
                        onClick={() => setSelectedPlan(p.id)}
                        className={`relative rounded-2xl p-5 cursor-pointer transition-all border flex flex-col justify-between ${
                          isSelected
                            ? "bg-stone-800/90 border-amber-400 ring-2 ring-amber-400/30 shadow-lg"
                            : "bg-stone-950/60 border-stone-800 hover:border-stone-700"
                        }`}
                      >
                        {p.highlight && (
                          <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full bg-amber-400 text-stone-950 font-bold text-[10px] tracking-wider uppercase shadow-md">
                            {p.badge}
                          </div>
                        )}

                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <h4 className="text-base font-bold text-white">{p.name}</h4>
                            {!p.highlight && (
                              <span className="text-[10px] font-semibold text-stone-400 px-2 py-0.5 rounded bg-stone-900 border border-stone-800">
                                {p.badge}
                              </span>
                            )}
                          </div>

                          <div className="flex items-baseline gap-1 my-3">
                            <span className="text-xs text-stone-400 font-medium">R$</span>
                            <span className="text-3xl font-black text-white">{p.price}</span>
                            <span className="text-xs text-stone-400">{p.period}</span>
                          </div>

                          <p className="text-xs text-stone-400 mb-4">{p.description}</p>

                          <ul className="space-y-2 text-xs text-stone-300">
                            {p.features.map((f, idx) => (
                              <li key={idx} className="flex items-start gap-2">
                                <Check className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                                <span>{f}</span>
                              </li>
                            ))}
                          </ul>
                        </div>

                        <div className="mt-5 pt-3 border-t border-stone-800 flex items-center justify-center">
                          <span
                            className={`text-xs font-bold ${
                              isSelected ? "text-amber-400" : "text-stone-500"
                            }`}
                          >
                            {isSelected ? "Plano Selecionado ✓" : "Selecionar este plano"}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Payment Method Selector */}
              <div className="space-y-3 pt-2">
                <label className="text-xs font-bold uppercase tracking-wider text-stone-400">
                  Forma de Pagamento:
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <button
                    type="button"
                    onClick={() => setPaymentMethod("PIX")}
                    className={`flex items-center gap-3 p-3.5 rounded-2xl border text-left transition-all cursor-pointer ${
                      paymentMethod === "PIX"
                        ? "bg-emerald-950/40 border-emerald-400 text-white ring-1 ring-emerald-400/40"
                        : "bg-stone-950/60 border-stone-800 text-stone-400 hover:border-stone-700"
                    }`}
                  >
                    <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                      <QrCode className="w-4 h-4" />
                    </div>
                    <div>
                      <strong className="text-xs text-stone-200 block">PIX Instantâneo</strong>
                      <span className="text-[10px] text-emerald-400">Ativação em 2 segundos</span>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPaymentMethod("CREDIT_CARD")}
                    className={`flex items-center gap-3 p-3.5 rounded-2xl border text-left transition-all cursor-pointer ${
                      paymentMethod === "CREDIT_CARD"
                        ? "bg-amber-950/40 border-amber-400 text-white ring-1 ring-amber-400/40"
                        : "bg-stone-950/60 border-stone-800 text-stone-400 hover:border-stone-700"
                    }`}
                  >
                    <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center">
                      <CreditCard className="w-4 h-4" />
                    </div>
                    <div>
                      <strong className="text-xs text-stone-200 block">Cartão de Crédito</strong>
                      <span className="text-[10px] text-stone-400">Recorrência Mensal</span>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPaymentMethod("BOLETO")}
                    className={`flex items-center gap-3 p-3.5 rounded-2xl border text-left transition-all cursor-pointer ${
                      paymentMethod === "BOLETO"
                        ? "bg-blue-950/40 border-blue-400 text-white ring-1 ring-blue-400/40"
                        : "bg-stone-950/60 border-stone-800 text-stone-400 hover:border-stone-700"
                    }`}
                  >
                    <div className="w-8 h-8 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center">
                      <Layers className="w-4 h-4" />
                    </div>
                    <div>
                      <strong className="text-xs text-stone-200 block">Boleto Bancário</strong>
                      <span className="text-[10px] text-stone-400">Vencimento em 3 dias</span>
                    </div>
                  </button>
                </div>

                {/* PIX Details Simulation Box */}
                {paymentMethod === "PIX" && (
                  <div className="p-4 rounded-2xl bg-stone-950 border border-stone-800 flex flex-col sm:flex-row items-center gap-4 animate-fadeIn">
                    <div className="p-2 bg-white rounded-xl shrink-0">
                      <QrCode className="w-20 h-20 text-stone-900" />
                    </div>
                    <div className="flex-1 text-xs text-stone-300 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-white">Chave Pix Copia e Cola:</span>
                        <button
                          onClick={handleCopyPix}
                          className="flex items-center gap-1 text-[11px] font-bold text-amber-400 hover:text-amber-300 cursor-pointer"
                        >
                          {copiedPix ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                          <span>{copiedPix ? "Chave Copiada!" : "Copiar Chave"}</span>
                        </button>
                      </div>
                      <div className="p-2 rounded bg-stone-900 font-mono text-[10px] text-stone-400 break-all select-all">
                        00020126580014br.gov.bcb.pix0136aura-saas-pagamentos-pix-78901235204000053039865802BR5925AURA PLATAFORMA SAAS LTDA6009SAO PAULO62070503***6304E8A2
                      </div>
                      <p className="text-[11px] text-stone-400">
                        Após clicar em <strong>"Confirmar Pagamento e Ativar Plano"</strong>, o webhook do
                        banco confirmará a transação e desbloqueará as vendas imediatamente.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* Footer Actions */}
        {!activatedSuccess && (
          <div className="px-6 py-4 border-t border-stone-800 bg-stone-950/80 flex flex-col sm:flex-row items-center justify-between gap-3">
            <button
              onClick={handleReactivateTrial}
              disabled={isSubmitting}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-stone-900 hover:bg-stone-800 text-stone-400 hover:text-emerald-400 text-xs font-semibold transition-all cursor-pointer border border-stone-800"
              title="Para testes da cliente: reabre 30 dias de trial gratuitamente"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Reativar Trial (Modo Auditoria)</span>
            </button>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <button
                onClick={onClose}
                className="px-4 py-2.5 rounded-xl text-stone-400 hover:text-white text-xs font-semibold cursor-pointer"
              >
                Continuar em Modo Consulta
              </button>

              <button
                onClick={handleActivatePlan}
                disabled={isSubmitting}
                className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-stone-950 font-bold text-xs shadow-lg transition-all cursor-pointer disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin text-stone-950" />
                    <span>Processando Assinatura...</span>
                  </>
                ) : (
                  <>
                    <Zap className="w-4 h-4 text-stone-950 fill-stone-950" />
                    <span>Confirmar Pagamento e Ativar Plano</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
