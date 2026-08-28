import React, { useState } from "react";
import {
  RefreshCw,
  Plus,
  Search,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Send,
  DollarSign,
  TrendingUp,
  Package,
  Calendar,
  FileCheck,
} from "lucide-react";
import { ConsignmentMaleta, Reseller, ProductItem } from "../types";
import confetti from "canvas-confetti";

interface ConsignmentsManagerProps {
  consignments: ConsignmentMaleta[];
  resellers: Reseller[];
  products: ProductItem[];
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
}

export const ConsignmentsManager: React.FC<ConsignmentsManagerProps> = ({
  consignments,
  resellers,
  products,
  onSettleConsignment,
  onCreateConsignment,
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("TODAS");

  // Settlement modal
  const [selectedMaleta, setSelectedMaleta] = useState<ConsignmentMaleta | null>(null);
  const [showSettleModal, setShowSettleModal] = useState(false);
  const [settlementSoldMap, setSettlementSoldMap] = useState<Record<string, number>>({});
  const [settlementReturnedMap, setSettlementReturnedMap] = useState<Record<string, number>>({});

  // New Maleta modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedResellerId, setSelectedResellerId] = useState(resellers[0]?.id || "");
  const [consignmentDays, setConsignmentDays] = useState("30");
  const [selectedItemsForShipment, setSelectedItemsForShipment] = useState<Record<string, number>>({});

  const filteredConsignments = consignments.filter((c) => {
    const matchSearch =
      c.resellerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.code.toLowerCase().includes(searchTerm.toLowerCase());
    const matchStatus = statusFilter === "TODAS" || c.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const handleOpenSettle = (maleta: ConsignmentMaleta) => {
    setSelectedMaleta(maleta);
    const initialSold: Record<string, number> = {};
    const initialReturned: Record<string, number> = {};

    maleta.items.forEach((item) => {
      initialSold[item.productId] = item.quantitySold;
      initialReturned[item.productId] = item.quantityReturned;
    });

    setSettlementSoldMap(initialSold);
    setSettlementReturnedMap(initialReturned);
    setShowSettleModal(true);
  };

  const calculateSettleTotals = () => {
    if (!selectedMaleta) return { totalSold: 0, commission: 0, balancePayable: 0 };
    let totalSold = 0;
    selectedMaleta.items.forEach((item) => {
      const soldQty = settlementSoldMap[item.productId] ?? item.quantitySold;
      totalSold += soldQty * item.unitPrice;
    });

    const reseller = resellers.find((r) => r.id === selectedMaleta.resellerId);
    const rate = reseller ? reseller.commissionDirectRate / 100 : 0.25;
    const commission = totalSold * rate;
    const balancePayable = totalSold - commission;

    return { totalSold, commission, balancePayable };
  };

  const handleConfirmSettlement = () => {
    if (!selectedMaleta) return;
    onSettleConsignment(selectedMaleta.id, settlementSoldMap, settlementReturnedMap);
    setShowSettleModal(false);
    confetti({
      particleCount: 80,
      spread: 60,
      origin: { y: 0.7 },
    });
  };

  const handleCreateNewMaleta = (e: React.FormEvent) => {
    e.preventDefault();
    const itemsArray = Object.entries(selectedItemsForShipment)
      .filter(([_, qty]) => Number(qty) > 0)
      .map(([productId, qty]) => ({ productId, qty: Number(qty) }));

    if (itemsArray.length === 0) return;

    onCreateConsignment(selectedResellerId, itemsArray, parseInt(consignmentDays) || 30);
    setShowCreateModal(false);
  };

  const { totalSold, commission, balancePayable } = calculateSettleTotals();

  return (
    <div className="space-y-6 text-stone-900">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-4 pb-4 border-b border-stone-200">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-stone-400">
              Domínio #5: Gestão de Consignação (Diferencial Chave)
            </span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-serif italic font-bold tracking-wide text-stone-900 mt-1">
            Maletas em Consignação & Acerto em 1-Clique
          </h2>
          <p className="text-xs text-stone-600 mt-1 max-w-2xl font-sans leading-relaxed">
            Controle de remessa, controle de prazos por revendedora, devolução automática ao estoque e crédito imediato de comissão na liquidação.
          </p>
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-stone-900 hover:bg-stone-800 text-white font-bold text-xs transition-all shadow-xs uppercase tracking-wider"
        >
          <Plus className="w-4 h-4" />
          <span>Expedir Nova Maleta</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white border border-stone-200 rounded-2xl p-4 flex flex-col md:flex-row gap-4 items-center justify-between shadow-xs">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-3" />
          <input
            type="text"
            placeholder="Buscar por revendedora ou código da maleta (ex: MLT-2026-08)..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-stone-50 border border-stone-200 rounded-xl pl-10 pr-4 py-2 text-xs text-stone-900 placeholder-stone-400 focus:outline-none focus:border-stone-400 focus:bg-white"
          />
        </div>

        <div className="flex items-center gap-2">
          {["TODAS", "EM_ABERTO", "FINALIZADA"].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
                statusFilter === st
                  ? "bg-stone-900 text-white shadow-xs"
                  : "bg-stone-100 text-stone-600 hover:bg-stone-200"
              }`}
            >
              {st === "TODAS" ? "Todas" : st === "EM_ABERTO" ? "Em Aberto" : "Finalizadas"}
            </button>
          ))}
        </div>
      </div>

      {/* Maletas Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredConsignments.map((m) => {
          const isExpiring =
            m.status === "EM_ABERTO" && new Date(m.dueDate) <= new Date("2026-08-30");
          const totalItemsQty = m.items.reduce((acc, i) => acc + i.quantityShipped, 0);
          const soldItemsQty = m.items.reduce((acc, i) => acc + i.quantitySold, 0);

          return (
            <div
              key={m.id}
              className="bg-white border border-stone-200 rounded-3xl p-6 shadow-xs hover:border-stone-300 transition-all flex flex-col justify-between"
            >
              <div className="space-y-4">
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-[10px] font-mono font-bold bg-stone-100 border border-stone-200 text-stone-700 px-2 py-0.5 rounded-full">
                      {m.code}
                    </span>
                    <h3 className="text-lg font-serif font-bold text-stone-900 mt-1">
                      {m.resellerName}
                    </h3>
                    <p className="text-[11px] text-stone-400">{m.resellerPhone}</p>
                  </div>

                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                      m.status === "FINALIZADA"
                        ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                        : isExpiring
                        ? "bg-amber-50 text-amber-800 border border-amber-200"
                        : "bg-stone-100 text-stone-700 border border-stone-200"
                    }`}
                  >
                    {m.status === "FINALIZADA" ? "Liquidada" : isExpiring ? "Vencendo" : "Em Trânsito"}
                  </span>
                </div>

                {/* Progress bar */}
                <div>
                  <div className="flex justify-between text-xs text-stone-500 mb-1">
                    <span>Peças Vendidas</span>
                    <span className="font-semibold text-stone-800">
                      {soldItemsQty} de {totalItemsQty} un
                    </span>
                  </div>
                  <div className="w-full bg-stone-100 h-2 rounded-full overflow-hidden">
                    <div
                      className="bg-stone-900 h-full rounded-full transition-all"
                      style={{
                        width: `${totalItemsQty > 0 ? (soldItemsQty / totalItemsQty) * 100 : 0}%`,
                      }}
                    />
                  </div>
                </div>

                {/* Values grid */}
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="bg-stone-50 p-2.5 rounded-xl border border-stone-100">
                    <span className="text-[10px] text-stone-400 block font-medium">Total Maleta</span>
                    <span className="font-bold font-serif text-stone-900 text-sm">
                      R$ {m.totalValue.toFixed(2)}
                    </span>
                  </div>
                  <div className="bg-emerald-50 p-2.5 rounded-xl border border-emerald-100">
                    <span className="text-[10px] text-emerald-800 block font-medium">Vendido</span>
                    <span className="font-bold font-serif text-emerald-900 text-sm">
                      R$ {m.soldValue.toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Actions Footer */}
              <div className="pt-4 mt-4 border-t border-stone-100 flex items-center justify-between">
                <div className="text-[10px] text-stone-400">
                  Prazo: {new Date(m.dueDate).toLocaleDateString("pt-BR")}
                </div>

                {m.status === "EM_ABERTO" ? (
                  <button
                    onClick={() => handleOpenSettle(m)}
                    className="flex items-center gap-1 px-3.5 py-1.5 rounded-full bg-stone-900 hover:bg-stone-800 text-white text-xs font-bold transition-all uppercase tracking-wider"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Realizar Acerto</span>
                  </button>
                ) : (
                  <span className="text-xs font-medium text-emerald-700 flex items-center gap-1">
                    <FileCheck className="w-3.5 h-3.5" />
                    <span>Acerto Finalizado</span>
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* 1-Click Settlement Modal */}
      {showSettleModal && selectedMaleta && (
        <div className="fixed inset-0 bg-stone-950/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-stone-200 rounded-3xl max-w-2xl w-full p-6 space-y-5 shadow-2xl text-stone-900">
            <div className="flex items-center justify-between pb-3 border-b border-stone-100">
              <div>
                <h3 className="text-lg font-serif italic font-bold text-stone-900">
                  Acerto da Maleta {selectedMaleta.code}
                </h3>
                <p className="text-xs text-stone-500">
                  Revendedora: <span className="font-bold text-stone-900">{selectedMaleta.resellerName}</span>
                </p>
              </div>
              <button
                onClick={() => setShowSettleModal(false)}
                className="text-stone-400 hover:text-stone-700 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            {/* Items Breakdown */}
            <div className="max-h-60 overflow-y-auto space-y-2 pr-1">
              {selectedMaleta.items.map((item) => {
                const sold = settlementSoldMap[item.productId] ?? item.quantitySold;
                const returned = settlementReturnedMap[item.productId] ?? item.quantityReturned;

                return (
                  <div
                    key={item.productId}
                    className="p-3 bg-stone-50 border border-stone-200 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
                  >
                    <div>
                      <div className="font-semibold text-stone-900">{item.productName}</div>
                      <div className="text-[10px] text-stone-400 font-mono">
                        {item.sku} • R$ {item.unitPrice.toFixed(2)} un • Enviado: {item.quantityShipped} un
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <div>
                        <label className="text-[10px] text-emerald-800 font-bold block">Vendidas</label>
                        <input
                          type="number"
                          min={0}
                          max={item.quantityShipped}
                          value={sold}
                          onChange={(e) =>
                            setSettlementSoldMap({
                              ...settlementSoldMap,
                              [item.productId]: parseInt(e.target.value) || 0,
                            })
                          }
                          className="w-16 bg-white border border-stone-300 rounded-lg px-2 py-1 text-xs text-stone-900 text-center font-bold"
                        />
                      </div>

                      <div>
                        <label className="text-[10px] text-stone-500 font-bold block">Devolvidas</label>
                        <input
                          type="number"
                          min={0}
                          max={item.quantityShipped - sold}
                          value={returned}
                          onChange={(e) =>
                            setSettlementReturnedMap({
                              ...settlementReturnedMap,
                              [item.productId]: parseInt(e.target.value) || 0,
                            })
                          }
                          className="w-16 bg-white border border-stone-300 rounded-lg px-2 py-1 text-xs text-stone-900 text-center"
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Calculations Summary */}
            <div className="bg-stone-50 border border-stone-200 rounded-2xl p-4 space-y-2 text-xs">
              <div className="flex justify-between text-stone-600">
                <span>Total Bruto Vendido:</span>
                <span className="font-serif font-bold text-stone-900 text-sm">
                  R$ {totalSold.toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between text-amber-700 font-semibold">
                <span>Comissão da Revendedora:</span>
                <span className="font-serif font-bold text-sm">- R$ {commission.toFixed(2)}</span>
              </div>
              <div className="pt-2 border-t border-stone-200 flex justify-between text-emerald-800 font-bold text-sm">
                <span>Valor Líquido a Repassar para a Empresa:</span>
                <span className="font-serif text-base">R$ {balancePayable.toFixed(2)}</span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowSettleModal(false)}
                className="px-4 py-2 rounded-full bg-stone-100 text-stone-700 font-semibold text-xs"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmSettlement}
                className="px-5 py-2 rounded-full bg-stone-900 hover:bg-stone-800 text-white font-bold text-xs uppercase tracking-wider shadow-xs"
              >
                Confirmar Acerto & Creditar Comissão
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Consignment Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-stone-950/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-stone-200 rounded-3xl max-w-xl w-full p-6 space-y-4 shadow-2xl text-stone-900">
            <div className="flex items-center justify-between pb-3 border-b border-stone-100">
              <h3 className="text-base font-serif italic font-bold text-stone-900">
                Expedição de Nova Maleta de Consignação
              </h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-stone-400 hover:text-stone-700 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateNewMaleta} className="space-y-3 text-xs">
              <div>
                <label className="block text-stone-500 mb-1 font-semibold">
                  Selecione a Revendedora
                </label>
                <select
                  value={selectedResellerId}
                  onChange={(e) => setSelectedResellerId(e.target.value)}
                  className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 text-stone-900 focus:bg-white"
                >
                  {resellers.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name} ({r.level} • {r.commissionDirectRate}% comissão) - {r.city}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-stone-500 mb-1 font-semibold">
                  Prazo de Devolução / Acerto
                </label>
                <select
                  value={consignmentDays}
                  onChange={(e) => setConsignmentDays(e.target.value)}
                  className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 text-stone-900 focus:bg-white"
                >
                  <option value="15">15 dias</option>
                  <option value="30">30 dias (Padrão)</option>
                  <option value="45">45 dias</option>
                  <option value="60">60 dias (Exclusivo Líderes)</option>
                </select>
              </div>

              <div>
                <label className="block text-stone-500 mb-1 font-semibold">
                  Selecione os SKUs e Quantidades para a Maleta
                </label>
                <div className="max-h-48 overflow-y-auto space-y-2 p-2 bg-stone-50 border border-stone-200 rounded-2xl">
                  {products.map((prod) => (
                    <div
                      key={prod.id}
                      className="flex items-center justify-between text-xs bg-white p-2 rounded-xl border border-stone-100"
                    >
                      <div className="truncate max-w-[240px]">
                        <span className="font-semibold text-stone-900">{prod.name}</span>
                        <span className="text-[10px] text-stone-400 block font-mono">
                          {prod.sku} • R$ {prod.price.toFixed(2)} • Estoque Físico: {prod.stockPhysical} un
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] text-stone-400 font-semibold">Qtd:</span>
                        <input
                          type="number"
                          min={0}
                          max={prod.stockPhysical}
                          placeholder="0"
                          value={selectedItemsForShipment[prod.id] || ""}
                          onChange={(e) =>
                            setSelectedItemsForShipment({
                              ...selectedItemsForShipment,
                              [prod.id]: parseInt(e.target.value) || 0,
                            })
                          }
                          className="w-14 bg-stone-50 border border-stone-200 rounded-lg px-2 py-1 text-stone-900 text-center font-bold"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-3 border-t border-stone-100 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 rounded-full bg-stone-100 text-stone-700 font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-full bg-stone-900 hover:bg-stone-800 text-white font-bold uppercase tracking-wider"
                >
                  Gerar e Despachar Maleta
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
