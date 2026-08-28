import React, { useState } from "react";
import {
  Zap,
  TrendingUp,
  DollarSign,
  Award,
  Users,
  Sliders,
  CheckCircle2,
  Calendar,
  Layers,
  Crown,
} from "lucide-react";
import { CommissionTier, Reseller } from "../types";

interface CommissionEngineProps {
  tiers: CommissionTier[];
  resellers: Reseller[];
  onUpdateTiers: (tiers: CommissionTier[]) => void;
}

export const CommissionEngine: React.FC<CommissionEngineProps> = ({
  tiers,
  resellers,
  onUpdateTiers,
}) => {
  const [simulationDirectSales, setSimulationDirectSales] = useState<number>(4500);
  const [simulationTeamSales, setSimulationTeamSales] = useState<number>(12000);
  const [isLeaderSim, setIsLeaderSim] = useState<boolean>(true);

  // Dynamic calculation based on current tiers
  const getTierForSales = (sales: number) => {
    return (
      tiers.find((t) => sales >= t.minSales && sales <= t.maxSales) ||
      tiers[tiers.length - 1]
    );
  };

  const currentSimTier = getTierForSales(simulationDirectSales);
  const directCommission = (simulationDirectSales * currentSimTier.ratePercent) / 100;
  const leaderBonus = isLeaderSim
    ? (simulationTeamSales * currentSimTier.leaderBonusPercent) / 100
    : 0;
  const totalCommission = directCommission + leaderBonus;

  return (
    <div className="space-y-8 text-stone-900">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-4 pb-4 border-b border-stone-200">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-stone-400">
              Domínio #6: Motor de Regras & Comissionamento
            </span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-serif italic font-bold tracking-wide text-stone-900 mt-1">
            Motor de Comissões Escalonadas & Bônus de Liderança
          </h2>
          <p className="text-xs text-stone-600 mt-1 max-w-2xl font-sans leading-relaxed">
            Regras de comissão direta progressiva com sobrecomissão de líderes de equipe e simulador interativo.
          </p>
        </div>

        <div className="flex items-center gap-2 bg-stone-100 px-3 py-1.5 rounded-full border border-stone-200 text-xs font-semibold text-stone-700">
          <Award className="w-3.5 h-3.5 text-stone-900" />
          <span>4 Níveis de Carreira Ativos</span>
        </div>
      </div>

      {/* Simulator Section */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Inputs */}
        <div className="lg:col-span-7 bg-white border border-stone-200 rounded-3xl p-6 shadow-xs space-y-6">
          <div className="flex items-center justify-between pb-3 border-b border-stone-100">
            <div className="flex items-center gap-2">
              <Sliders className="w-4 h-4 text-stone-700" />
              <h3 className="text-base font-serif italic font-bold text-stone-900">
                Simulador em Tempo Real de Ganhos
              </h3>
            </div>
            <span className="text-xs text-stone-400 font-medium">Parâmetros Dinâmicos</span>
          </div>

          {/* Slider 1: Vendas Diretas */}
          <div className="space-y-2">
            <div className="flex justify-between text-xs">
              <span className="text-stone-500 font-semibold">Vendas Diretas no Mês:</span>
              <span className="font-serif font-bold text-stone-900 text-sm">
                R$ {simulationDirectSales.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
              </span>
            </div>
            <input
              type="range"
              min="500"
              max="20000"
              step="100"
              value={simulationDirectSales}
              onChange={(e) => setSimulationDirectSales(Number(e.target.value))}
              className="w-full accent-stone-900 cursor-pointer"
            />
          </div>

          {/* Checkbox: É Líder? */}
          <div className="pt-2">
            <label className="flex items-center gap-2 text-xs font-semibold text-stone-800 cursor-pointer">
              <input
                type="checkbox"
                checked={isLeaderSim}
                onChange={(e) => setIsLeaderSim(e.target.checked)}
                className="rounded accent-stone-900 text-stone-900"
              />
              <span>Ativar Bônus de Líder de Equipe (Rede Multinível)</span>
            </label>
          </div>

          {/* Slider 2: Vendas da Equipe */}
          {isLeaderSim && (
            <div className="space-y-2 bg-stone-50 p-4 rounded-2xl border border-stone-200">
              <div className="flex justify-between text-xs">
                <span className="text-stone-600 font-semibold">Volume Total de Vendas da Equipe:</span>
                <span className="font-serif font-bold text-stone-900 text-sm">
                  R$ {simulationTeamSales.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                </span>
              </div>
              <input
                type="range"
                min="1000"
                max="80000"
                step="500"
                value={simulationTeamSales}
                onChange={(e) => setSimulationTeamSales(Number(e.target.value))}
                className="w-full accent-stone-900 cursor-pointer"
              />
            </div>
          )}
        </div>

        {/* Right Result Card */}
        <div className="lg:col-span-5 bg-stone-900 text-white border border-stone-900 rounded-3xl p-6 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-widest text-stone-400">
                Resultado Projetado
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 font-mono">
                {currentSimTier.badge}
              </span>
            </div>

            <div className="mt-4">
              <span className="text-xs text-stone-400 block font-medium">Ganhos Totais no Ciclo</span>
              <div className="text-3xl sm:text-4xl font-serif italic font-bold tracking-tight text-white mt-1">
                R$ {totalCommission.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
              </div>
            </div>

            <div className="space-y-2 mt-6 pt-4 border-t border-stone-800 text-xs">
              <div className="flex justify-between text-stone-300">
                <span>Comissão Direta ({currentSimTier.ratePercent}%):</span>
                <span className="font-serif font-bold text-white">R$ {directCommission.toFixed(2)}</span>
              </div>
              {isLeaderSim && (
                <div className="flex justify-between text-amber-300">
                  <span>Bônus Liderança ({currentSimTier.leaderBonusPercent}% sobre equipe):</span>
                  <span className="font-serif font-bold text-white">+ R$ {leaderBonus.toFixed(2)}</span>
                </div>
              )}
            </div>
          </div>

          <div className="pt-4 mt-6 border-t border-stone-800 text-[11px] text-stone-400">
            Regra executada sem retenção com fechamento automático no último dia útil do mês.
          </div>
        </div>
      </div>

      {/* Tier Breakdown Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {tiers.map((tier) => (
          <div
            key={tier.id}
            className="bg-white border border-stone-200 rounded-2xl p-5 shadow-xs space-y-3"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-stone-900 font-serif">{tier.badge}</span>
              <span className="text-xl font-serif font-bold text-stone-900">
                {tier.ratePercent}%
              </span>
            </div>
            <div className="text-xs text-stone-500">
              Faixa de faturamento: <br />
              <span className="font-bold text-stone-800">
                R$ {tier.minSales.toFixed(0)} até {tier.maxSales > 50000 ? "Ilimitado" : `R$ ${tier.maxSales.toFixed(0)}`}
              </span>
            </div>
            <div className="bg-stone-50 p-2 rounded-xl text-[11px] text-stone-600 border border-stone-100">
              Bônus sobre equipe: <span className="font-bold text-stone-900">{tier.leaderBonusPercent}%</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
