import React, { useState } from "react";
import {
  Users,
  Plus,
  Search,
  Award,
  Send,
  TrendingUp,
  MapPin,
  Phone,
  Mail,
  Crown,
  ShieldCheck,
} from "lucide-react";
import { Reseller } from "../types";

interface ResellersNetworkManagerProps {
  resellers: Reseller[];
  onAddReseller: (reseller: Reseller) => void;
}

export const ResellersNetworkManager: React.FC<ResellersNetworkManagerProps> = ({
  resellers,
  onAddReseller,
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);

  // New reseller form
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [city, setCity] = useState("Limeira");
  const [state, setState] = useState("SP");
  const [isLeader, setIsLeader] = useState(false);

  const filteredResellers = resellers.filter(
    (r) =>
      r.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.city.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.level.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !phone) return;

    const newReseller: Reseller = {
      id: `res-${Date.now()}`,
      name,
      phone,
      email: `${name.toLowerCase().replace(/\s+/g, ".")}@gmail.com`,
      document: "***.***.***-**",
      city,
      state,
      level: isLeader ? "DIAMANTE" : "PRATA",
      commissionDirectRate: isLeader ? 35 : 25,
      isLeader,
      teamSize: isLeader ? 4 : 0,
      totalSalesAccumulated: 0,
      pendingCommissionValue: 0,
      avatar:
        "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=200&auto=format&fit=crop&q=80",
      status: "ATIVA",
      joinedAt: new Date().toISOString().split("T")[0],
    };

    onAddReseller(newReseller);
    setShowAddModal(false);
    setName("");
    setPhone("");
  };

  return (
    <div className="space-y-8 text-stone-900">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-4 pb-4 border-b border-stone-200">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-stone-400">
              Domínio #3 & #6: Rede de Consultoras & Líderes
            </span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-serif italic font-bold tracking-wide text-stone-900 mt-1">
            Gestão da Força de Vendas Diretas & Líderes de Equipe
          </h2>
          <p className="text-xs text-stone-600 mt-1 max-w-2xl font-sans leading-relaxed">
            Cadastro de consultoras com fotos, comissão direta proporcional, equipes subordinadas por liderança e contato via WhatsApp em 1-clique.
          </p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-stone-900 hover:bg-stone-800 text-white font-bold text-xs transition-all shadow-xs uppercase tracking-wider"
        >
          <Plus className="w-4 h-4" />
          <span>Cadastrar Revendedora</span>
        </button>
      </div>

      {/* Search Bar */}
      <div className="bg-white border border-stone-200 rounded-2xl p-4 flex gap-3 items-center shadow-xs">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-3" />
          <input
            type="text"
            placeholder="Buscar por nome da revendedora, cidade ou nível de carreira..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-stone-50 border border-stone-200 rounded-xl pl-10 pr-4 py-2 text-xs text-stone-900 placeholder-stone-400 focus:outline-none focus:border-stone-400 focus:bg-white"
          />
        </div>
      </div>

      {/* Resellers Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredResellers.map((r) => (
          <div
            key={r.id}
            className="bg-white border border-stone-200 rounded-3xl p-6 shadow-xs hover:border-stone-300 transition-all flex flex-col justify-between"
          >
            <div className="space-y-4">
              {/* Header with Avatar */}
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <img
                    src={r.avatar}
                    alt={r.name}
                    referrerPolicy="no-referrer"
                    className="w-12 h-12 rounded-2xl object-cover border border-stone-200 shadow-xs"
                  />
                  <div>
                    <h3 className="text-base font-serif font-bold text-stone-900 flex items-center gap-1">
                      <span>{r.name}</span>
                      {r.isLeader && <Crown className="w-3.5 h-3.5 text-amber-500" />}
                    </h3>
                    <div className="flex items-center gap-1 text-[11px] text-stone-400">
                      <MapPin className="w-3 h-3 text-stone-400" />
                      <span>
                        {r.city}, {r.state}
                      </span>
                    </div>
                  </div>
                </div>

                <span
                  className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                    r.level === "DIAMANTE"
                      ? "bg-amber-50 text-amber-800 border border-amber-200"
                      : r.level === "OURO"
                      ? "bg-yellow-50 text-yellow-800 border border-yellow-200"
                      : "bg-stone-100 text-stone-700 border border-stone-200"
                  }`}
                >
                  {r.level}
                </span>
              </div>

              {/* Commission and Performance metrics */}
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="bg-stone-50 p-2.5 rounded-xl border border-stone-100">
                  <span className="text-[10px] text-stone-400 block font-medium">Comissão Direta</span>
                  <span className="font-serif font-bold text-stone-900 text-base">{r.commissionDirectRate}%</span>
                </div>
                <div className="bg-stone-50 p-2.5 rounded-xl border border-stone-100">
                  <span className="text-[10px] text-stone-400 block font-medium">Vendas Acumuladas</span>
                  <span className="font-serif font-bold text-stone-900 text-sm">
                    R$ {r.totalSalesAccumulated.toLocaleString("pt-BR", { minimumFractionDigits: 0 })}
                  </span>
                </div>
              </div>

              {r.isLeader && (
                <div className="bg-purple-50 border border-purple-200 p-2.5 rounded-xl text-xs flex items-center justify-between text-purple-900">
                  <span className="text-[11px] font-medium">Liderança de Equipe:</span>
                  <span className="font-bold font-mono">{r.teamSize} consultoras</span>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="pt-4 mt-4 border-t border-stone-100 flex items-center justify-between">
              <span className="text-[10px] text-stone-400">
                Desde {r.joinedAt ? new Date(r.joinedAt).toLocaleDateString("pt-BR") : "2026"}
              </span>

              <a
                href={`https://wa.me/55${r.phone.replace(/\D/g, "")}?text=Olá%20${encodeURIComponent(
                  r.name
                )},%20aqui%20é%20da%20equipe%20Lumina%20Semijoias!`}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-xs font-bold transition-colors"
              >
                <Send className="w-3 h-3" />
                <span>WhatsApp</span>
              </a>
            </div>
          </div>
        ))}
      </div>

      {/* Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-stone-950/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-stone-200 rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl text-stone-900">
            <div className="flex items-center justify-between pb-3 border-b border-stone-100">
              <h3 className="text-base font-serif italic font-bold text-stone-900">
                Cadastrar Nova Revendedora
              </h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-stone-400 hover:text-stone-700 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreate} className="space-y-3 text-xs">
              <div>
                <label className="block text-stone-500 mb-1 font-semibold">Nome Completo</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Vanessa Oliveira"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 text-stone-900 focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-stone-500 mb-1 font-semibold">WhatsApp</label>
                <input
                  type="text"
                  required
                  placeholder="(19) 98765-4321"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 text-stone-900 focus:bg-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-stone-500 mb-1 font-semibold">Cidade</label>
                  <input
                    type="text"
                    required
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 text-stone-900 focus:bg-white"
                  />
                </div>
                <div>
                  <label className="block text-stone-500 mb-1 font-semibold">Estado</label>
                  <input
                    type="text"
                    required
                    maxLength={2}
                    value={state}
                    onChange={(e) => setState(e.target.value.toUpperCase())}
                    className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 text-stone-900 uppercase font-mono focus:bg-white"
                  />
                </div>
              </div>

              <div className="pt-2">
                <label className="flex items-center gap-2 text-stone-800 font-semibold cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isLeader}
                    onChange={(e) => setIsLeader(e.target.checked)}
                    className="rounded accent-stone-900"
                  />
                  <span>Cadastrar como Líder de Equipe (Nível Diamante • 35%)</span>
                </label>
              </div>

              <div className="pt-3 border-t border-stone-100 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-full bg-stone-100 text-stone-700 font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-full bg-stone-900 text-white font-bold uppercase tracking-wider hover:bg-stone-800"
                >
                  Salvar Cadastro
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
