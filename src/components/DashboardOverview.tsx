import React from "react";
import {
  TrendingUp,
  Package,
  Users,
  RefreshCw,
  AlertCircle,
  ShieldCheck,
  ShieldAlert,
  Zap,
  ArrowUpRight,
  Sparkles,
  ShoppingBag,
  Send,
  QrCode,
  DollarSign,
  Bot,
  Sliders,
  Percent,
  Clock,
} from "lucide-react";
import {
  ProductItem,
  Reseller,
  ConsignmentMaleta,
  UnifiedOrder,
  DigitalWarranty,
  TenantStore,
} from "../types";

interface DashboardOverviewProps {
  tenant: TenantStore;
  products: ProductItem[];
  resellers: Reseller[];
  consignments: ConsignmentMaleta[];
  orders: UnifiedOrder[] | any[];
  warranties: DigitalWarranty[];
  onNavigateTab: (tab: string) => void;
}

export const DashboardOverview: React.FC<DashboardOverviewProps> = ({
  tenant,
  products,
  resellers,
  consignments,
  orders,
  warranties,
  onNavigateTab,
}) => {
  // Calculations for Summary KPIs
  // 1. Total Sales (YTD)
  const totalSalesYTD = orders.reduce(
    (acc, o: any) => acc + (Number(o.totalAmount) || 0),
    0
  );
  const avgOrderTicket = orders.length > 0 ? totalSalesYTD / orders.length : 0;

  // 2. Active Consignments Value
  const activeConsignmentsList = consignments.filter(
    (c) => c.status === "EM_ABERTO" || c.status === "PARCIALMENTE_ACERTADA"
  );
  const activeConsignmentsValue = activeConsignmentsList.reduce(
    (acc, c) => acc + (Number(c.pendingValue) || Number(c.totalValue) || 0),
    0
  );
  const expiringConsignmentsCount = activeConsignmentsList.filter(
    (c) => new Date(c.dueDate) <= new Date("2026-08-30")
  ).length;

  // 3. Pending Commission
  const pendingCommissionsValue = consignments.reduce(
    (acc, c) => (!c.commissionPaid ? acc + (Number(c.commissionCalculated) || 0) : acc),
    0
  ) || resellers.reduce((acc, r) => acc + (Number(r.pendingCommissionValue) || 0), 0);

  const pendingResellersCount = resellers.filter(
    (r) =>
      (r.pendingCommissionValue || 0) > 0 ||
      consignments.some((c) => c.resellerId === r.id && !c.commissionPaid)
  ).length;

  // 4. Recent Warranty Claims Count
  const recentClaimsCount = warranties.reduce((acc, w) => {
    const logsCount = w.claimLogs ? w.claimLogs.length : 0;
    const directCount = w.claimsCount || 0;
    const isRepairOpen = w.status === "REPARO_SOLICITADO" ? 1 : 0;
    return acc + Math.max(directCount, logsCount, isRepairOpen);
  }, 0);

  const openRepairsCount = warranties.filter(
    (w) => w.status === "REPARO_SOLICITADO"
  ).length;

  const physicalStockValue = products.reduce(
    (acc, p) => acc + p.stockPhysical * p.price,
    0
  );

  const channelCounts = {
    LOJA_WEB: orders.filter((o: any) => o.channel === "LOJA_WEB" || o.channel === "ECOMMERCE").length,
    REVENDEDORA: orders.filter((o: any) => o.channel === "REVENDEDORA" || o.channel === "B2B_RESELLER").length,
    WHATSAPP: orders.filter((o: any) => o.channel === "WHATSAPP").length,
    PRESENCIAL: orders.filter((o: any) => o.channel === "PRESENCIAL" || o.channel === "PRESENTIAL_POS").length,
    MARKETPLACE: orders.filter((o: any) => o.channel === "MARKETPLACE").length,
  };

  return (
    <div className="space-y-8 text-stone-900">
      {/* Editorial Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-4 pb-4 border-b border-stone-200">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-stone-400">
              Painel Executivo • Multi-tenant Ativo
            </span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-serif italic font-bold tracking-wide text-stone-900 mt-1">
            {tenant.name}
          </h2>
          <p className="text-xs text-stone-600 mt-1 max-w-2xl font-sans leading-relaxed">
            Sincronização omnichannel contínua entre e-commerce, maletas em consignação física, regras de comissão escalonada e certificados digitais com QR Code.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            id="btn-dash-settings"
            onClick={() => onNavigateTab("storeSettings")}
            className="flex items-center gap-1.5 px-4 py-2 bg-white border border-stone-300 hover:bg-stone-50 text-stone-800 rounded-full text-xs font-bold transition-all shadow-xs cursor-pointer"
            title="Personalizar Logotipo, Paleta e Textos da Loja"
          >
            <Sliders className="w-3.5 h-3.5 text-amber-600" />
            <span>Configurações da Loja</span>
          </button>
          <button
            id="btn-dash-home"
            onClick={() => onNavigateTab("home")}
            className="flex items-center gap-1.5 px-4 py-2 bg-stone-900 hover:bg-stone-800 text-stone-100 rounded-full text-xs font-bold transition-all shadow-xs cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>Tela Inicial &amp; Promos</span>
          </button>
          <button
            id="btn-dash-storefront"
            onClick={() => onNavigateTab("storefront")}
            className="flex items-center gap-2 px-4 py-2 bg-amber-100 hover:bg-amber-200/80 border border-amber-300 text-stone-900 rounded-full text-xs font-bold transition-all shadow-xs cursor-pointer"
          >
            <ShoppingBag className="w-3.5 h-3.5 text-amber-700" />
            <span>Loja do Comprador</span>
          </button>
          <button
            id="btn-dash-consignments"
            onClick={() => onNavigateTab("consignments")}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-stone-300 rounded-full text-stone-800 text-xs font-semibold hover:bg-stone-50 transition-all shadow-xs cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5 text-stone-600" />
            <span>Gerenciar Maletas</span>
          </button>
          <button
            id="btn-dash-aicopilot"
            onClick={() => onNavigateTab("aiGateway")}
            className="flex items-center gap-2 px-4 py-2 bg-stone-800 text-white rounded-full text-xs font-bold uppercase tracking-wider hover:bg-stone-700 transition-all shadow-xs cursor-pointer"
          >
            <Bot className="w-3.5 h-3.5 text-amber-400" />
            <span>AI Copilot</span>
          </button>
        </div>
      </div>

      {/* Summary KPI Cards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* KPI 1: Total Sales (YTD) */}
        <div
          id="kpi-card-total-sales-ytd"
          onClick={() => onNavigateTab("orders")}
          className="p-6 bg-white border border-stone-200 hover:border-amber-400 hover:shadow-md transition-all rounded-2xl flex flex-col justify-between cursor-pointer group relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 w-16 h-16 bg-amber-50 rounded-bl-full opacity-50 group-hover:scale-110 transition-transform" />
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-amber-50 border border-amber-200/80 rounded-full text-[10px] font-bold uppercase tracking-wider text-amber-900">
                <DollarSign className="w-3 h-3 text-amber-600" />
                Total Sales (YTD)
              </span>
              <ArrowUpRight className="w-4 h-4 text-stone-300 group-hover:text-amber-600 transition-colors" />
            </div>
            <h3 className="text-3xl font-serif font-bold tracking-tight text-stone-900 mt-1">
              R$ {totalSalesYTD.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </h3>
            <p className="text-xs text-stone-500 font-sans mt-1.5">
              Ticket Médio: <strong className="text-stone-700 font-semibold">R$ {avgOrderTicket.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong>
            </p>
          </div>
          <div className="pt-4 mt-3 border-t border-stone-100 flex items-center justify-between text-[11px]">
            <span className="text-emerald-700 font-semibold flex items-center gap-1">
              <TrendingUp className="w-3.5 h-3.5" />
              ↑ 18.4% YTD
            </span>
            <span className="text-stone-400 font-medium">{orders.length} pedidos</span>
          </div>
        </div>

        {/* KPI 2: Active Consignments Value */}
        <div
          id="kpi-card-active-consignments-value"
          onClick={() => onNavigateTab("consignments")}
          className="p-6 bg-white border border-stone-200 hover:border-sky-400 hover:shadow-md transition-all rounded-2xl flex flex-col justify-between cursor-pointer group relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 w-16 h-16 bg-sky-50 rounded-bl-full opacity-50 group-hover:scale-110 transition-transform" />
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-sky-50 border border-sky-200/80 rounded-full text-[10px] font-bold uppercase tracking-wider text-sky-900">
                <RefreshCw className="w-3 h-3 text-sky-600" />
                Active Consignments
              </span>
              <ArrowUpRight className="w-4 h-4 text-stone-300 group-hover:text-sky-600 transition-colors" />
            </div>
            <h3 className="text-3xl font-serif font-bold tracking-tight text-stone-900 mt-1">
              R$ {activeConsignmentsValue.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </h3>
            <p className="text-xs text-stone-500 font-sans mt-1.5">
              Valor em circulação com revendedoras
            </p>
          </div>
          <div className="pt-4 mt-3 border-t border-stone-100 flex items-center justify-between text-[11px]">
            <span className="text-sky-800 font-semibold">
              {activeConsignmentsList.length} maletas ativas
            </span>
            {expiringConsignmentsCount > 0 ? (
              <span className="text-amber-700 font-semibold">
                {expiringConsignmentsCount} a vencer
              </span>
            ) : (
              <span className="text-stone-400 font-medium">100% no prazo</span>
            )}
          </div>
        </div>

        {/* KPI 3: Pending Commission */}
        <div
          id="kpi-card-pending-commission"
          onClick={() => onNavigateTab("resellers")}
          className="p-6 bg-white border border-stone-200 hover:border-purple-400 hover:shadow-md transition-all rounded-2xl flex flex-col justify-between cursor-pointer group relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 w-16 h-16 bg-purple-50 rounded-bl-full opacity-50 group-hover:scale-110 transition-transform" />
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-purple-50 border border-purple-200/80 rounded-full text-[10px] font-bold uppercase tracking-wider text-purple-900">
                <Percent className="w-3 h-3 text-purple-600" />
                Pending Commission
              </span>
              <ArrowUpRight className="w-4 h-4 text-stone-300 group-hover:text-purple-600 transition-colors" />
            </div>
            <h3 className="text-3xl font-serif font-bold tracking-tight text-stone-900 mt-1">
              R$ {pendingCommissionsValue.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </h3>
            <p className="text-xs text-stone-500 font-sans mt-1.5">
              Comissões calculadas a repassar
            </p>
          </div>
          <div className="pt-4 mt-3 border-t border-stone-100 flex items-center justify-between text-[11px]">
            <span className="text-purple-800 font-semibold">
              {pendingResellersCount} revendedoras
            </span>
            <span className="text-stone-400 font-medium">Ciclo mensal</span>
          </div>
        </div>

        {/* KPI 4: Recent Warranty Claims Count */}
        <div
          id="kpi-card-recent-warranty-claims"
          onClick={() => onNavigateTab("warranties")}
          className="p-6 bg-white border border-stone-200 hover:border-emerald-400 hover:shadow-md transition-all rounded-2xl flex flex-col justify-between cursor-pointer group relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 w-16 h-16 bg-emerald-50 rounded-bl-full opacity-50 group-hover:scale-110 transition-transform" />
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 border border-emerald-200/80 rounded-full text-[10px] font-bold uppercase tracking-wider text-emerald-900">
                <ShieldCheck className="w-3 h-3 text-emerald-600" />
                Warranty Claims
              </span>
              <ArrowUpRight className="w-4 h-4 text-stone-300 group-hover:text-emerald-600 transition-colors" />
            </div>
            <div className="flex items-baseline gap-2 mt-1">
              <h3 className="text-3xl font-serif font-bold tracking-tight text-stone-900">
                {recentClaimsCount}
              </h3>
              <span className="text-xs font-semibold text-stone-500">
                {recentClaimsCount === 1 ? "chamado" : "chamados"}
              </span>
            </div>
            <p className="text-xs text-stone-500 font-sans mt-1.5">
              Acionamentos e histórico de reparo
            </p>
          </div>
          <div className="pt-4 mt-3 border-t border-stone-100 flex items-center justify-between text-[11px]">
            {openRepairsCount > 0 ? (
              <span className="text-amber-700 font-semibold flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {openRepairsCount} aguardando banho
              </span>
            ) : (
              <span className="text-emerald-700 font-semibold flex items-center gap-1">
                <ShieldCheck className="w-3 h-3" />
                SLA 100% em dia
              </span>
            )}
            <span className="text-stone-400 font-medium">{warranties.length} certificados</span>
          </div>
        </div>
      </div>

      {/* AI Copilot Proactive Insight Banner */}
      <div
        id="dash-ai-prediction-banner"
        className="p-5 bg-gradient-to-r from-stone-900 via-stone-850 to-stone-900 border border-stone-800 rounded-2xl text-white shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4"
      >
        <div className="flex items-start sm:items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-amber-400/10 border border-amber-400/20 flex items-center justify-center shrink-0">
            <Sparkles className="w-5 h-5 text-amber-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400">
                AI Predictive Intelligence
              </span>
              <span className="text-[10px] text-stone-400">• Confiança 94%</span>
            </div>
            <p className="text-sm font-serif italic text-stone-100 mt-0.5">
              "Próxima coleção Riviera tem projeção de demanda de R$ 18.500 no canal Revendedoras. 12 peças sugeridas para recall de giro."
            </p>
          </div>
        </div>
        <button
          onClick={() => onNavigateTab("aiGateway")}
          className="self-start sm:self-center px-4 py-2 bg-stone-800 hover:bg-stone-700 text-stone-100 rounded-xl text-xs font-bold transition-all shadow-xs shrink-0 cursor-pointer flex items-center gap-1.5"
        >
          <span>Explorar no Copilot</span>
          <ArrowUpRight className="w-3.5 h-3.5 text-amber-400" />
        </button>
      </div>

      {/* Main Content Layout (Monitor de Consignação + Right AI & Warranty Column) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left 2 Cols: Monitor de Consignação Table */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white border border-stone-200 rounded-3xl p-8 flex flex-col overflow-hidden shadow-xs">
            <div className="flex items-center justify-between pb-6 mb-2 border-b border-stone-100">
              <div>
                <h3 className="text-xl font-serif italic text-stone-900 font-bold">
                  Monitor de Consignações Ativas
                </h3>
                <p className="text-xs text-stone-500 mt-0.5">
                  Acompanhamento de saldo e vencimento de maletas com acerto direto
                </p>
              </div>
              <button
                onClick={() => onNavigateTab("consignments")}
                className="text-xs font-bold uppercase tracking-wider border-b border-stone-400 text-stone-800 hover:text-stone-950 pb-0.5"
              >
                Ver Todas ({consignments.length})
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="text-[10px] uppercase tracking-widest text-stone-400 border-b border-stone-100">
                  <tr>
                    <th className="pb-3 font-bold">Revendedora</th>
                    <th className="pb-3 font-bold text-center">Código</th>
                    <th className="pb-3 font-bold">Status / Prazo</th>
                    <th className="pb-3 font-bold text-right">Vendido / Total</th>
                    <th className="pb-3 font-bold text-right">Ação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {consignments.map((maleta) => {
                    const isExpiring =
                      maleta.status === "EM_ABERTO" &&
                      new Date(maleta.dueDate) <= new Date("2026-08-30");

                    return (
                      <tr key={maleta.id} className="hover:bg-stone-50/70 transition-colors">
                        <td className="py-4 font-medium text-stone-900">
                          <div>{maleta.resellerName}</div>
                          <div className="text-[11px] text-stone-400">{maleta.resellerPhone}</div>
                        </td>
                        <td className="py-4 text-center font-mono text-xs text-stone-600">
                          {maleta.code}
                        </td>
                        <td className="py-4">
                          {isExpiring ? (
                            <span className="bg-amber-50 text-amber-800 px-2.5 py-0.5 rounded-full text-[10px] border border-amber-200 font-medium">
                              Vence em {new Date(maleta.dueDate).toLocaleDateString("pt-BR")}
                            </span>
                          ) : maleta.status === "FINALIZADA" ? (
                            <span className="bg-emerald-50 text-emerald-800 px-2.5 py-0.5 rounded-full text-[10px] border border-emerald-200 font-medium">
                              Finalizada
                            </span>
                          ) : (
                            <span className="bg-stone-100 text-stone-700 px-2.5 py-0.5 rounded-full text-[10px] border border-stone-200 font-medium">
                              Ativa
                            </span>
                          )}
                        </td>
                        <td className="py-4 text-right font-serif text-stone-900">
                          <span className="font-semibold text-emerald-700">
                            R$ {maleta.soldValue.toFixed(2)}
                          </span>{" "}
                          <span className="text-stone-400 text-xs font-sans">
                            / R$ {maleta.totalValue.toFixed(2)}
                          </span>
                        </td>
                        <td className="py-4 text-right">
                          <button
                            onClick={() => onNavigateTab("consignments")}
                            className="px-3 py-1 bg-stone-100 hover:bg-stone-200 text-stone-800 rounded-lg text-xs font-medium transition-colors"
                          >
                            Acertar
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Vendas por Canal Omnichannel */}
          <div className="bg-white border border-stone-200 rounded-3xl p-6 shadow-xs">
            <div className="flex items-center justify-between pb-4 border-b border-stone-100 mb-4">
              <h3 className="text-base font-serif italic font-bold text-stone-900">
                Distribuição Omnichannel de Pedidos
              </h3>
              <span className="text-xs text-stone-500 font-medium">
                {orders.length} pedidos unificados
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              {[
                { name: "Loja Virtual", count: channelCounts.LOJA_WEB, icon: ShoppingBag, color: "text-amber-700 bg-amber-50 border-amber-200" },
                { name: "Revendedora", count: channelCounts.REVENDEDORA, icon: Users, color: "text-sky-700 bg-sky-50 border-sky-200" },
                { name: "WhatsApp", count: channelCounts.WHATSAPP, icon: Send, color: "text-emerald-700 bg-emerald-50 border-emerald-200" },
                { name: "Showroom", count: channelCounts.PRESENCIAL, icon: Package, color: "text-stone-700 bg-stone-100 border-stone-200" },
                { name: "Marketplace", count: channelCounts.MARKETPLACE, icon: RefreshCw, color: "text-purple-700 bg-purple-50 border-purple-200" },
              ].map((c) => {
                const Icon = c.icon;
                return (
                  <div
                    key={c.name}
                    className={`p-3.5 rounded-2xl border ${c.color} text-center space-y-1`}
                  >
                    <Icon className="w-4 h-4 mx-auto opacity-80" />
                    <div className="text-[11px] font-semibold text-stone-600">{c.name}</div>
                    <div className="text-xl font-serif font-bold text-stone-900">{c.count}</div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right 1 Col: AI Layer & Digital Warranty */}
        <div className="space-y-6">
          {/* Layer de Agentes AI MCP Card */}
          <div className="bg-stone-100 rounded-3xl p-6 border border-stone-200 flex flex-col gap-4 shadow-xs">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 bg-stone-900 rounded-full flex items-center justify-center text-[10px] text-white font-bold">
                AI
              </div>
              <p className="text-xs font-bold uppercase tracking-wider text-stone-800">
                Layer de Agentes & MCP
              </p>
            </div>
            <div className="bg-white p-4 rounded-xl border border-stone-200 text-xs italic leading-relaxed text-stone-700">
              "Notei que 12 peças da coleção 'Riviera' estão paradas há 45 dias com a revendedora Ana Silva. Sugiro solicitar o recall para abastecer pedidos da Loja Virtual."
            </div>
            <button
              onClick={() => onNavigateTab("aiGateway")}
              className="w-full py-2.5 bg-stone-900 text-white rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-stone-800 transition-colors shadow-xs"
            >
              Consultar AI Copilot
            </button>
          </div>

          {/* Digital Warranty Widget */}
          <div className="bg-white border border-stone-200 rounded-3xl p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-stone-100">
              <p className="text-[10px] font-bold uppercase tracking-widest text-stone-400">
                Garantia Digital QR
              </p>
              <button
                onClick={() => onNavigateTab("warranties")}
                className="text-xs text-stone-700 hover:text-stone-950 font-semibold"
              >
                Ver Todas
              </button>
            </div>

            {warranties.slice(0, 2).map((warr) => (
              <div
                key={warr.id}
                className="flex items-center gap-4 p-3 rounded-2xl bg-stone-50 border border-stone-200"
              >
                <div className="w-14 h-14 bg-white border border-stone-200 rounded-xl flex items-center justify-center text-stone-400 shrink-0 font-bold text-xs">
                  <QrCode className="w-7 h-7 text-stone-800" />
                </div>
                <div className="overflow-hidden">
                  <p className="text-xs font-bold text-stone-900 font-mono">{warr.code}</p>
                  <p className="text-[11px] text-stone-600 truncate">{warr.productName}</p>
                  <p className="text-[10px] text-stone-400 mt-0.5">Cliente: {warr.customerName}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
