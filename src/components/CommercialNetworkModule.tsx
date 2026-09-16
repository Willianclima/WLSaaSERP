import React, { useState } from "react";
import {
  Users,
  Briefcase,
  Percent,
  Crown,
  Sparkles,
  TrendingUp,
  Plus,
  Sliders,
  DollarSign,
  ArrowRight,
  ShieldCheck,
  Award,
} from "lucide-react";
import { Reseller, ConsignmentMaleta, ProductItem, CommissionTier } from "../types";
import { ResellersNetworkManager } from "./ResellersNetworkManager";
import { ConsignmentsManager } from "./ConsignmentsManager";
import { CommissionEngine } from "./CommissionEngine";

interface CommercialNetworkModuleProps {
  resellers: Reseller[];
  consignments: ConsignmentMaleta[];
  products: ProductItem[];
  tiers: CommissionTier[];
  initialSubTab?: "resellers" | "consignments" | "commissions";
  onAddReseller: (reseller: Reseller) => void;
  onSettleConsignment: (
    consignmentId: string,
    soldMap: Record<string, number>,
    returnedMap: Record<string, number>
  ) => void;
  onCreateConsignment: (
    resellerId: string,
    items: Array<{ productId: string; qty: number }>,
    daysDuration: number
  ) => void;
  onUpdateTiers: (tiers: CommissionTier[]) => void;
}

export const CommercialNetworkModule: React.FC<CommercialNetworkModuleProps> = ({
  resellers,
  consignments,
  products,
  tiers,
  initialSubTab = "resellers",
  onAddReseller,
  onSettleConsignment,
  onCreateConsignment,
  onUpdateTiers,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<
    "resellers" | "consignments" | "commissions"
  >(initialSubTab);

  // High-level summary metrics
  const totalResellers = resellers.length;
  const activeLeaders = resellers.filter((r) => r.isLeader).length;
  const activeMaletas = consignments.filter((c) => c.status === "EM_ABERTO" || c.status === "PARCIAL").length;
  const totalInConsignment = consignments.reduce((acc, c) => acc + (c.totalValue || 0), 0);

  return (
    <div className="space-y-6">
      {/* Module Executive Banner: Módulo Plugável de Rede Comercial */}
      <div className="bg-stone-900 text-white rounded-2xl p-6 shadow-sm border border-stone-800 relative overflow-hidden">
        <div className="absolute right-0 top-0 w-80 h-80 bg-amber-500/10 rounded-full blur-3xl pointer-events-none -mr-16 -mt-16" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-400/20 text-amber-300 border border-amber-400/30">
                Módulo Desacoplado
              </span>
              <span className="text-xs text-stone-400 font-mono">
                Rede de Vendas Diretas
              </span>
            </div>
            <h1 className="text-2xl font-serif font-bold text-stone-100 flex items-center gap-2">
              <span>🤝 Rede Comercial & Vendas Diretas</span>
            </h1>
            <p className="text-xs sm:text-sm text-stone-300 max-w-2xl mt-1 leading-relaxed">
              Módulo de expansão para canais de revendedoras autônomas, gestão de maletas em consignação, acertos de mercadoria e comissionamento escalonado com bônus de liderança.
            </p>
          </div>

          {/* Quick Metrics Bar */}
          <div className="flex items-center gap-2 bg-stone-800/80 p-2.5 rounded-xl border border-stone-700 shrink-0">
            <div className="px-3 border-r border-stone-700">
              <div className="text-[10px] text-stone-400 font-semibold uppercase">Consultoras</div>
              <div className="text-lg font-bold text-amber-300">{totalResellers}</div>
            </div>
            <div className="px-3 border-r border-stone-700">
              <div className="text-[10px] text-stone-400 font-semibold uppercase">Líderes</div>
              <div className="text-lg font-bold text-stone-100">{activeLeaders}</div>
            </div>
            <div className="px-3">
              <div className="text-[10px] text-stone-400 font-semibold uppercase">Maletas Ativas</div>
              <div className="text-lg font-bold text-emerald-400">{activeMaletas}</div>
            </div>
          </div>
        </div>

        {/* Sub-Navigation Tabs inside the Module */}
        <div className="flex items-center gap-2 overflow-x-auto scrollbar-none mt-6 pt-4 border-t border-stone-800">
          <button
            onClick={() => setActiveSubTab("resellers")}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeSubTab === "resellers"
                ? "bg-amber-500 text-stone-950 shadow-sm"
                : "bg-stone-800/80 text-stone-300 hover:bg-stone-800 hover:text-white"
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>1. Revendedoras & Líderes</span>
            <span className="ml-1 text-[10px] bg-black/20 px-1.5 py-0.5 rounded-full">
              {resellers.length}
            </span>
          </button>

          <button
            onClick={() => setActiveSubTab("consignments")}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeSubTab === "consignments"
                ? "bg-amber-500 text-stone-950 shadow-sm"
                : "bg-stone-800/80 text-stone-300 hover:bg-stone-800 hover:text-white"
            }`}
          >
            <Briefcase className="w-3.5 h-3.5" />
            <span>2. Consignação, Maletas & Acertos</span>
            <span className="ml-1 text-[10px] bg-black/20 px-1.5 py-0.5 rounded-full">
              {consignments.length}
            </span>
          </button>

          <button
            onClick={() => setActiveSubTab("commissions")}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeSubTab === "commissions"
                ? "bg-amber-500 text-stone-950 shadow-sm"
                : "bg-stone-800/80 text-stone-300 hover:bg-stone-800 hover:text-white"
            }`}
          >
            <Percent className="w-3.5 h-3.5" />
            <span>3. Comissões & Regras de Repasse</span>
          </button>
        </div>
      </div>

      {/* Module Content Switcher */}
      <div className="pt-2">
        {activeSubTab === "resellers" && (
          <ResellersNetworkManager
            resellers={resellers}
            onAddReseller={onAddReseller}
          />
        )}

        {activeSubTab === "consignments" && (
          <ConsignmentsManager
            consignments={consignments}
            resellers={resellers}
            products={products}
            onSettleConsignment={onSettleConsignment}
            onCreateConsignment={onCreateConsignment}
          />
        )}

        {activeSubTab === "commissions" && (
          <CommissionEngine
            tiers={tiers}
            resellers={resellers}
            onUpdateTiers={onUpdateTiers}
          />
        )}
      </div>
    </div>
  );
};
