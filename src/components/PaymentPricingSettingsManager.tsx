import React, { useState } from "react";
import {
  CreditCard,
  QrCode,
  Sliders,
  DollarSign,
  Percent,
  Sparkles,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Save,
  RotateCcw,
  Zap,
  Calculator,
  ShoppingBag,
  ArrowRight,
  TrendingUp,
  Clock,
  Layers,
  Info,
} from "lucide-react";
import { OrganizationPaymentSettings, TenantStore } from "../types";
import {
  calculatePixPrice,
  calculateInstallmentOptions,
  getBestInstallmentHighlight,
  DEFAULT_ORGANIZATION_PAYMENT_SETTINGS,
} from "../utils/pricingEngine";
import confetti from "canvas-confetti";

interface PaymentPricingSettingsManagerProps {
  tenant: TenantStore;
  settings: OrganizationPaymentSettings;
  onUpdateSettings: (newSettings: OrganizationPaymentSettings) => void;
}

export const PaymentPricingSettingsManager: React.FC<PaymentPricingSettingsManagerProps> = ({
  tenant,
  settings,
  onUpdateSettings,
}) => {
  const [formState, setFormState] = useState<OrganizationPaymentSettings>({
    ...settings,
    installmentRules: settings.installmentRules || DEFAULT_ORGANIZATION_PAYMENT_SETTINGS.installmentRules,
  });

  const [simulationPrice, setSimulationPrice] = useState<number>(389.9);
  const [savedSuccess, setSavedSuccess] = useState<boolean>(false);

  // Manipulação de regras de taxa por parcela
  const handleRateChange = (installments: number, rate: number) => {
    setFormState((prev) => {
      const existingRules = [...(prev.installmentRules || [])];
      const index = existingRules.findIndex((r) => r.installments === installments);

      if (index >= 0) {
        existingRules[index] = { installments, interestRatePercent: Math.max(0, rate) };
      } else {
        existingRules.push({ installments, interestRatePercent: Math.max(0, rate) });
      }

      // Se a taxa for 0, atualiza contagem de parcelas sem juros se apropriado
      return {
        ...prev,
        installmentRules: existingRules.sort((a, b) => a.installments - b.installments),
      };
    });
  };

  // Presets rápidos de parcelamento
  const applyPreset = (preset: "6X_FREE" | "3X_FREE" | "10X_FREE" | "12X_FREE" | "CUSTOM_PROGRESSIVE") => {
    let maxInst = 12;
    let freeCount = 6;
    let rules = [];

    switch (preset) {
      case "6X_FREE":
        maxInst = 6;
        freeCount = 6;
        rules = [
          { installments: 1, interestRatePercent: 0.0 },
          { installments: 2, interestRatePercent: 0.0 },
          { installments: 3, interestRatePercent: 0.0 },
          { installments: 4, interestRatePercent: 0.0 },
          { installments: 5, interestRatePercent: 0.0 },
          { installments: 6, interestRatePercent: 0.0 },
          { installments: 7, interestRatePercent: 2.5 },
          { installments: 8, interestRatePercent: 3.0 },
          { installments: 9, interestRatePercent: 3.5 },
          { installments: 10, interestRatePercent: 4.0 },
          { installments: 11, interestRatePercent: 4.5 },
          { installments: 12, interestRatePercent: 5.0 },
        ];
        break;

      case "3X_FREE":
        maxInst = 6;
        freeCount = 3;
        rules = [
          { installments: 1, interestRatePercent: 0.0 },
          { installments: 2, interestRatePercent: 0.0 },
          { installments: 3, interestRatePercent: 0.0 },
          { installments: 4, interestRatePercent: 2.0 },
          { installments: 5, interestRatePercent: 3.0 },
          { installments: 6, interestRatePercent: 4.0 },
          { installments: 7, interestRatePercent: 5.0 },
          { installments: 8, interestRatePercent: 6.0 },
          { installments: 9, interestRatePercent: 7.0 },
          { installments: 10, interestRatePercent: 8.0 },
          { installments: 11, interestRatePercent: 9.0 },
          { installments: 12, interestRatePercent: 10.0 },
        ];
        break;

      case "10X_FREE":
        maxInst = 10;
        freeCount = 10;
        rules = [
          { installments: 1, interestRatePercent: 0.0 },
          { installments: 2, interestRatePercent: 0.0 },
          { installments: 3, interestRatePercent: 0.0 },
          { installments: 4, interestRatePercent: 0.0 },
          { installments: 5, interestRatePercent: 0.0 },
          { installments: 6, interestRatePercent: 0.0 },
          { installments: 7, interestRatePercent: 0.0 },
          { installments: 8, interestRatePercent: 0.0 },
          { installments: 9, interestRatePercent: 0.0 },
          { installments: 10, interestRatePercent: 0.0 },
          { installments: 11, interestRatePercent: 3.0 },
          { installments: 12, interestRatePercent: 4.0 },
        ];
        break;

      case "12X_FREE":
        maxInst = 12;
        freeCount = 12;
        rules = Array.from({ length: 12 }, (_, i) => ({
          installments: i + 1,
          interestRatePercent: 0.0,
        }));
        break;

      case "CUSTOM_PROGRESSIVE":
        maxInst = 6;
        freeCount = 2;
        rules = [
          { installments: 1, interestRatePercent: 0.0 },
          { installments: 2, interestRatePercent: 0.0 },
          { installments: 3, interestRatePercent: 2.0 },
          { installments: 4, interestRatePercent: 3.0 },
          { installments: 5, interestRatePercent: 4.0 },
          { installments: 6, interestRatePercent: 5.0 },
          { installments: 7, interestRatePercent: 6.0 },
          { installments: 8, interestRatePercent: 7.0 },
          { installments: 9, interestRatePercent: 8.0 },
          { installments: 10, interestRatePercent: 9.0 },
          { installments: 11, interestRatePercent: 10.0 },
          { installments: 12, interestRatePercent: 11.0 },
        ];
        break;
    }

    setFormState((prev) => ({
      ...prev,
      maxInstallments: maxInst,
      freeInstallmentsCount: freeCount,
      installmentRules: rules,
    }));
  };

  const handleSave = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const updated = {
      ...formState,
      updatedAt: new Date().toISOString(),
    };
    onUpdateSettings(updated);
    setSavedSuccess(true);
    confetti({
      particleCount: 35,
      spread: 60,
      origin: { y: 0.6 },
    });
    setTimeout(() => setSavedSuccess(false), 3500);
  };

  // Cálculos do simulador com base no formulário
  const simulatedPix = calculatePixPrice(simulationPrice, formState);
  const simulatedInstallments = calculateInstallmentOptions(simulationPrice, formState);
  const simulatedBadge = getBestInstallmentHighlight(simulationPrice, formState);

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Header Banner & Multi-Tenant Notification */}
      <div className="bg-stone-900 border border-stone-800 rounded-3xl p-6 sm:p-8 text-white relative overflow-hidden shadow-xl">
        <div className="absolute -right-16 -top-16 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-1 rounded-full bg-amber-400/20 border border-amber-400/40 text-amber-300 text-[10px] font-bold tracking-widest uppercase font-mono">
                ORGANIZATION_PAYMENT_SETTINGS
              </span>
              <span className="text-xs text-stone-400 font-mono">
                Tenant: <strong className="text-stone-200">{tenant.name}</strong> ({tenant.slug})
              </span>
            </div>
            <h3 className="text-2xl sm:text-3xl font-serif italic font-bold text-white">
              Condições de Pagamento & Precificação
            </h3>
            <p className="text-xs sm:text-sm text-stone-300 max-w-2xl leading-relaxed">
              Configure as regras de precificação da sua loja de semijoias: desconto no PIX, quantidade máxima de parcelas, carência sem acréscimo e tabela personalizada de juros por parcela.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => {
                setFormState(DEFAULT_ORGANIZATION_PAYMENT_SETTINGS);
              }}
              className="p-3 rounded-2xl bg-stone-800 hover:bg-stone-700 text-stone-300 hover:text-white transition-all cursor-pointer border border-stone-700"
              title="Restaurar valores de fábrica"
            >
              <RotateCcw className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={handleSave}
              className="flex items-center gap-2 px-6 py-3 bg-amber-400 hover:bg-amber-300 text-stone-950 rounded-2xl font-bold text-xs uppercase tracking-wider transition-all shadow-lg cursor-pointer"
            >
              <Save className="w-4 h-4 text-stone-950" />
              <span>Salvar Condições</span>
            </button>
          </div>
        </div>
      </div>

      {savedSuccess && (
        <div className="bg-emerald-50 border border-emerald-300 text-emerald-900 rounded-2xl p-4 flex items-center gap-3 shadow-xs animate-in fade-in">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <div className="text-xs">
            <p className="font-bold uppercase tracking-wide">Configurações de Pagamento Salvas com Sucesso!</p>
            <p className="text-emerald-700">
              As regras de desconto no PIX e parcelamento no cartão foram atualizadas imediatamente na Vitrine e no Checkout.
            </p>
          </div>
        </div>
      )}

      {/* Main Grid: Settings vs Real-time Simulator */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column (7 cols): Configuration Forms */}
        <div className="lg:col-span-7 space-y-6">
          {/* 1. PIX Configuration Card */}
          <div className="bg-white border border-stone-200 rounded-3xl p-6 sm:p-7 shadow-xs space-y-5">
            <div className="flex items-center justify-between pb-4 border-b border-stone-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center border border-emerald-200">
                  <QrCode className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-bold text-stone-900 text-sm">1. Pagamento via PIX Instantâneo</h4>
                  <p className="text-xs text-stone-500">Desconto à vista para incentivar compras e reduzir taxas</p>
                </div>
              </div>

              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={formState.pixEnabled}
                  onChange={(e) => setFormState((prev) => ({ ...prev, pixEnabled: e.target.checked }))}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-stone-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-stone-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
              </label>
            </div>

            {formState.pixEnabled && (
              <div className="space-y-5 text-xs">
                {/* Desconto PIX Slider & Presets */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="font-bold text-stone-800">
                      Desconto no PIX: <span className="text-emerald-700 text-base">{formState.pixDiscountPercent}% OFF</span>
                    </label>
                    <span className="text-[11px] text-stone-400">0% a 20%</span>
                  </div>

                  <input
                    type="range"
                    min="0"
                    max="20"
                    step="0.5"
                    value={formState.pixDiscountPercent}
                    onChange={(e) =>
                      setFormState((prev) => ({ ...prev, pixDiscountPercent: parseFloat(e.target.value) || 0 }))
                    }
                    className="w-full h-2 bg-stone-200 rounded-lg appearance-none cursor-pointer accent-emerald-600"
                  />

                  {/* Preset quick buttons */}
                  <div className="flex flex-wrap gap-2 mt-3">
                    <span className="text-[10px] text-stone-400 font-semibold self-center">Atalhos rápidos:</span>
                    {[
                      { label: "Sem Desconto (0%)", val: 0 },
                      { label: "3% OFF", val: 3 },
                      { label: "5% OFF (Padrão)", val: 5 },
                      { label: "7% OFF", val: 7 },
                      { label: "10% OFF", val: 10 },
                    ].map((p) => (
                      <button
                        key={p.val}
                        type="button"
                        onClick={() => setFormState((prev) => ({ ...prev, pixDiscountPercent: p.val }))}
                        className={`px-2.5 py-1 rounded-xl text-[11px] font-bold border transition-all cursor-pointer ${
                          formState.pixDiscountPercent === p.val
                            ? "bg-emerald-700 text-white border-emerald-700"
                            : "bg-stone-50 text-stone-700 border-stone-200 hover:bg-stone-100"
                        }`}
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* PIX Key Details */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-3 border-t border-stone-100">
                  <div>
                    <label className="text-stone-600 font-semibold block mb-1">Tipo de Chave PIX</label>
                    <select
                      value={formState.pixKeyType || "CNPJ"}
                      onChange={(e) => setFormState((prev) => ({ ...prev, pixKeyType: e.target.value as any }))}
                      className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 text-stone-800 font-medium"
                    >
                      <option value="CNPJ">CNPJ da Empresa</option>
                      <option value="EMAIL">E-mail Comercial</option>
                      <option value="PHONE">Telefone / Celular</option>
                      <option value="RANDOM">Chave Aleatória (EVP)</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-stone-600 font-semibold block mb-1">Chave PIX da Organização</label>
                    <input
                      type="text"
                      value={formState.pixKey || ""}
                      onChange={(e) => setFormState((prev) => ({ ...prev, pixKey: e.target.value }))}
                      placeholder="48.291.802/0001-94"
                      className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 text-stone-800 font-mono"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* 2. Credit Card & Installments Configuration Card */}
          <div className="bg-white border border-stone-200 rounded-3xl p-6 sm:p-7 shadow-xs space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-stone-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-700 flex items-center justify-center border border-amber-200">
                  <CreditCard className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-bold text-stone-900 text-sm">2. Cartão de Crédito & Parcelamento</h4>
                  <p className="text-xs text-stone-500">Defina quantidade máxima, carência sem juros e taxas por parcela</p>
                </div>
              </div>

              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={formState.creditCardEnabled}
                  onChange={(e) => setFormState((prev) => ({ ...prev, creditCardEnabled: e.target.checked }))}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-stone-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-stone-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-500"></div>
              </label>
            </div>

            {formState.creditCardEnabled && (
              <div className="space-y-6 text-xs">
                {/* Quick Presets */}
                <div>
                  <label className="text-stone-700 font-bold block mb-2">Modelos Comerciais Rápidos (Presets):</label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => applyPreset("6X_FREE")}
                      className="p-2.5 rounded-xl border border-stone-200 hover:border-amber-400 bg-stone-50 text-left transition-all hover:bg-amber-50/50"
                    >
                      <div className="font-bold text-stone-900">Até 6x Sem Juros</div>
                      <div className="text-[10px] text-stone-500">Padrão da joalheria</div>
                    </button>

                    <button
                      type="button"
                      onClick={() => applyPreset("3X_FREE")}
                      className="p-2.5 rounded-xl border border-stone-200 hover:border-amber-400 bg-stone-50 text-left transition-all hover:bg-amber-50/50"
                    >
                      <div className="font-bold text-stone-900">3x Sem Juros + Juros</div>
                      <div className="text-[10px] text-stone-500">4x a 12x com acréscimo</div>
                    </button>

                    <button
                      type="button"
                      onClick={() => applyPreset("CUSTOM_PROGRESSIVE")}
                      className="p-2.5 rounded-xl border border-stone-200 hover:border-amber-400 bg-stone-50 text-left transition-all hover:bg-amber-50/50"
                    >
                      <div className="font-bold text-stone-900">1x-2x 0% / 3x-6x Juros</div>
                      <div className="text-[10px] text-stone-500">Taxas de 2% a 5%</div>
                    </button>

                    <button
                      type="button"
                      onClick={() => applyPreset("10X_FREE")}
                      className="p-2.5 rounded-xl border border-stone-200 hover:border-amber-400 bg-stone-50 text-left transition-all hover:bg-amber-50/50"
                    >
                      <div className="font-bold text-stone-900">Até 10x Sem Juros</div>
                      <div className="text-[10px] text-stone-500">Para ticket médio alto</div>
                    </button>

                    <button
                      type="button"
                      onClick={() => applyPreset("12X_FREE")}
                      className="p-2.5 rounded-xl border border-stone-200 hover:border-amber-400 bg-stone-50 text-left transition-all hover:bg-amber-50/50"
                    >
                      <div className="font-bold text-stone-900">12x Sem Juros (Promo)</div>
                      <div className="text-[10px] text-stone-500">Black Friday / Mães</div>
                    </button>
                  </div>
                </div>

                {/* Primary Installment Controls */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 bg-stone-50 border border-stone-200 rounded-2xl">
                  <div>
                    <label className="text-stone-700 font-bold block mb-1">Máximo de Parcelas Permitidas</label>
                    <select
                      value={formState.maxInstallments}
                      onChange={(e) =>
                        setFormState((prev) => ({ ...prev, maxInstallments: parseInt(e.target.value) || 6 }))
                      }
                      className="w-full bg-white border border-stone-200 rounded-xl px-3 py-2 text-stone-800 font-semibold"
                    >
                      {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((n) => (
                        <option key={n} value={n}>
                          Até {n}x {n === 1 ? "(Somente à vista)" : "no cartão"}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-stone-700 font-bold block mb-1">Valor Mínimo por Parcela</label>
                    <div className="relative">
                      <span className="absolute left-3 top-2.5 text-stone-400 font-bold">R$</span>
                      <input
                        type="number"
                        min="5"
                        step="5"
                        value={formState.minInstallmentAmount}
                        onChange={(e) =>
                          setFormState((prev) => ({ ...prev, minInstallmentAmount: parseFloat(e.target.value) || 0 }))
                        }
                        className="w-full bg-white border border-stone-200 rounded-xl pl-9 pr-3 py-2 text-stone-800 font-semibold"
                      />
                    </div>
                    <p className="text-[10px] text-stone-500 mt-1">Ex: se uma peça for R$ 50, não divide em 6x.</p>
                  </div>
                </div>

                {/* Granular Rate Table per Installment */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-stone-800 font-bold">Tabela Detalhada de Taxas por Parcela (1x a 12x):</label>
                    <span className="text-[11px] text-stone-500">0% = Sem Juros</span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5">
                    {Array.from({ length: formState.maxInstallments }, (_, i) => i + 1).map((n) => {
                      const rule = formState.installmentRules?.find((r) => r.installments === n);
                      const currentRate = rule ? rule.interestRatePercent : 0;
                      const isFree = currentRate === 0;

                      return (
                        <div
                          key={n}
                          className={`p-2.5 rounded-xl border transition-all ${
                            isFree
                              ? "bg-emerald-50/50 border-emerald-200"
                              : "bg-amber-50/50 border-amber-200"
                          }`}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-bold text-stone-900">{n}x</span>
                            <span
                              className={`text-[9px] font-bold px-1.5 py-0.2 rounded-full uppercase ${
                                isFree ? "bg-emerald-200 text-emerald-900" : "bg-amber-200 text-amber-900"
                              }`}
                            >
                              {isFree ? "Sem Juros" : `+${currentRate}%`}
                            </span>
                          </div>

                          <div className="flex items-center gap-1">
                            <input
                              type="number"
                              min="0"
                              max="30"
                              step="0.5"
                              value={currentRate}
                              onChange={(e) => handleRateChange(n, parseFloat(e.target.value) || 0)}
                              className="w-full bg-white border border-stone-300 rounded-lg px-2 py-1 text-xs text-right font-mono font-bold"
                            />
                            <span className="text-stone-500 font-bold">%</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* 3. Shipping & WhatsApp Direct Policy */}
          <div className="bg-white border border-stone-200 rounded-3xl p-6 sm:p-7 shadow-xs space-y-4 text-xs">
            <div className="flex items-center gap-3 pb-3 border-b border-stone-100">
              <div className="w-9 h-9 rounded-xl bg-stone-100 text-stone-700 flex items-center justify-center">
                <ShoppingBag className="w-4 h-4" />
              </div>
              <div>
                <h4 className="font-bold text-stone-900 text-sm">3. Frete & Canal de Fechamento</h4>
                <p className="text-stone-500">Políticas comerciais adicionais da organização</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-stone-600 font-semibold block mb-1">Frete Grátis a partir de (R$)</label>
                <input
                  type="number"
                  min="0"
                  step="10"
                  value={formState.freeShippingMinimumAmount}
                  onChange={(e) =>
                    setFormState((prev) => ({
                      ...prev,
                      freeShippingMinimumAmount: parseFloat(e.target.value) || 0,
                    }))
                  }
                  className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 font-medium"
                />
              </div>

              <div>
                <label className="text-stone-600 font-semibold block mb-1">Custo Padrão Envio Correios (R$)</label>
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={formState.defaultStandardShippingCost}
                  onChange={(e) =>
                    setFormState((prev) => ({
                      ...prev,
                      defaultStandardShippingCost: parseFloat(e.target.value) || 0,
                    }))
                  }
                  className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 font-medium"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Right Column (5 cols): Interactive Live Simulator */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-stone-900 text-white rounded-3xl p-6 sm:p-7 shadow-xl border border-stone-800 sticky top-24 space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-stone-800">
              <div className="flex items-center gap-2">
                <Calculator className="w-5 h-5 text-amber-400" />
                <h4 className="font-serif italic font-bold text-lg text-white">Simulador em Tempo Real</h4>
              </div>
              <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950 px-2 py-0.5 rounded-full border border-emerald-800">
                LIVE PREVIEW
              </span>
            </div>

            {/* Input Simulation Price */}
            <div>
              <label className="text-stone-400 text-xs font-semibold block mb-1.5">
                Digite um valor de semijoia para testar:
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-3 text-stone-400 font-bold">R$</span>
                <input
                  type="number"
                  min="10"
                  step="10"
                  value={simulationPrice}
                  onChange={(e) => setSimulationPrice(parseFloat(e.target.value) || 0)}
                  className="w-full bg-stone-800 border border-stone-700 rounded-2xl pl-10 pr-4 py-2.5 text-white font-mono text-lg font-bold focus:outline-none focus:border-amber-400"
                />
              </div>
            </div>

            {/* Simulated Showcase Product Card Teaser */}
            <div className="p-4 rounded-2xl bg-stone-950 border border-stone-800 space-y-3">
              <div className="flex items-center justify-between text-[10px] text-stone-400 font-mono">
                <span>Como o Comprador Vê na Vitrine:</span>
                <span className="text-amber-400 font-bold">SKU-TEST</span>
              </div>

              <div>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-serif font-bold text-white">
                    R$ {simulationPrice.toFixed(2)}
                  </span>
                  {simulatedPix.isDiscountActive && (
                    <span className="text-xs text-emerald-400 font-bold">
                      R$ {simulatedPix.pixPrice.toFixed(2)} no PIX ({simulatedPix.discountPercent}% OFF)
                    </span>
                  )}
                </div>
                <p className="text-xs text-stone-300 font-medium mt-0.5">
                  {simulatedBadge}
                </p>
              </div>
            </div>

            {/* Installment Breakdown Simulation Table */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs text-stone-300 font-bold">
                <span>Opções de Parcelamento no Cartão</span>
                <span className="text-[10px] text-stone-400">Total com Taxas</span>
              </div>

              <div className="max-h-56 overflow-y-auto space-y-1.5 pr-1">
                {simulatedInstallments.map((opt) => (
                  <div
                    key={opt.installments}
                    className={`flex items-center justify-between p-2 rounded-xl text-xs font-mono transition-colors ${
                      opt.isInterestFree
                        ? "bg-stone-800/80 text-emerald-300 border border-emerald-900/40"
                        : "bg-stone-800/40 text-stone-300 border border-stone-800"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-white">{opt.installments}x</span>
                      <span>de R$ {opt.installmentValue.toFixed(2)}</span>
                      {opt.isInterestFree ? (
                        <span className="text-[9px] bg-emerald-900/60 text-emerald-300 px-1.5 py-0.2 rounded font-sans font-bold">
                          sem juros
                        </span>
                      ) : (
                        <span className="text-[9px] bg-stone-700 text-stone-300 px-1.5 py-0.2 rounded font-sans">
                          +{opt.interestRatePercent}%
                        </span>
                      )}
                    </div>

                    <span className="text-stone-400 font-bold">
                      R$ {opt.totalAmount.toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Action Save inside simulator */}
            <button
              type="button"
              onClick={handleSave}
              className="w-full py-3 bg-amber-400 hover:bg-amber-300 text-stone-950 font-bold rounded-2xl text-xs uppercase tracking-wider transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>Salvar para {tenant.name}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
