import React, { useState } from "react";
import {
  TrendingUp,
  Package,
  Users,
  RefreshCw,
  AlertCircle,
  ShieldCheck,
  Zap,
  ArrowUpRight,
  Sparkles,
  ShoppingBag,
  Send,
  QrCode,
  DollarSign,
  Clock,
  BarChart3,
  Calendar,
  Layers,
  CheckCircle2,
  AlertTriangle,
  ChevronRight,
  Plus,
  Share2,
  ArrowRight,
  Tag,
  Boxes,
  Eye,
  Store,
  ExternalLink,
} from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  Cell,
} from "recharts";
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
  consignments?: ConsignmentMaleta[];
  orders: UnifiedOrder[] | any[];
  warranties: DigitalWarranty[];
  onNavigateTab: (tab: string) => void;
}

export const DashboardOverview: React.FC<DashboardOverviewProps> = ({
  tenant,
  products = [],
  resellers = [],
  consignments = [],
  orders = [],
  warranties = [],
  onNavigateTab,
}) => {
  const [chartViewMode, setChartViewMode] = useState<"channels" | "consolidated" | "target">("channels");
  const [periodFilter, setPeriodFilter] = useState<"hoje" | "semana" | "mes" | "ano">("mes");

  // 1. High-Impact Metrics Calculations: Vendas Totais, Total de Pedidos, Vitrine de Produtos, Status de Estoque
  const totalSalesAmount = orders.reduce(
    (acc, o: any) => acc + (Number(o.totalAmount) || 0),
    0
  );
  const totalOrdersCount = orders.length;
  const avgOrderTicket = totalOrdersCount > 0 ? totalSalesAmount / totalOrdersCount : 0;

  // Orders status counts
  const paidOrdersCount = orders.filter(
    (o: any) => o.status === "PAGO" || o.paymentStatus === "CONFIRMADO"
  ).length;
  const pendingOrdersCount = orders.filter(
    (o: any) => o.status === "PENDENTE" || o.paymentStatus === "AGUARDANDO_PAGAMENTO"
  ).length;
  const deliveredOrdersCount = orders.filter(
    (o: any) => o.status === "ENTREGUE" || o.fulfillmentStatus === "ENTREGUE"
  ).length;

  // Products & Showcase Metrics
  const totalProductsCount = products.length;
  const activeShowcaseProducts = products.filter((p) => p.stockPhysical > 0).length;
  const totalCategoriesCount = new Set(products.map((p) => p.category)).size;

  // Inventory & Stock Health
  const totalStockUnits = products.reduce((acc, p) => acc + (p.stockPhysical || 0), 0);
  const totalStockInventoryValue = products.reduce(
    (acc, p) => acc + (p.stockPhysical || 0) * (p.price || 0),
    0
  );
  const lowStockProducts = products.filter((p) => p.stockPhysical > 0 && p.stockPhysical < 5);
  const outOfStockProducts = products.filter((p) => p.stockPhysical === 0);

  // Active Consignments
  const activeConsignmentsList = consignments.filter(
    (c) => c.status === "EM_ABERTO" || c.status === "PARCIALMENTE_ACERTADA"
  );
  const activeConsignmentsValue = activeConsignmentsList.reduce(
    (acc, c) => acc + (Number(c.pendingValue) || Number(c.totalValue) || 0),
    0
  );

  // Omnichannel Breakdown
  const channelCounts = {
    WHATSAPP: orders.filter((o: any) => o.channel === "WHATSAPP").length,
    LOJA_WEB: orders.filter((o: any) => o.channel === "LOJA_WEB" || o.channel === "ECOMMERCE").length,
    REVENDEDORA: orders.filter((o: any) => o.channel === "REVENDEDORA" || o.channel === "B2B_RESELLER").length,
    PRESENCIAL: orders.filter((o: any) => o.channel === "PRESENCIAL" || o.channel === "PRESENTIAL_POS" || o.channel === "BALCAO").length,
  };

  // 6-Month Evolution Data for Recharts
  const monthlySalesData = [
    {
      monthKey: "2026-03",
      month: "Mar/26",
      fullMonth: "Março 2026",
      directSales: 14250,
      resellerSales: 8600,
      totalSales: 22850,
      target: 20000,
      ordersCount: 48,
    },
    {
      monthKey: "2026-04",
      month: "Abr/26",
      fullMonth: "Abril 2026",
      directSales: 16100,
      resellerSales: 9400,
      totalSales: 25500,
      target: 22000,
      ordersCount: 54,
    },
    {
      monthKey: "2026-05",
      month: "Mai/26",
      fullMonth: "Maio 2026 (Dia das Mães)",
      directSales: 21300,
      resellerSales: 12400,
      totalSales: 33700,
      target: 28000,
      ordersCount: 76,
    },
    {
      monthKey: "2026-06",
      month: "Jun/26",
      fullMonth: "Junho 2026 (Namorados)",
      directSales: 18200,
      resellerSales: 10800,
      totalSales: 29000,
      target: 25000,
      ordersCount: 63,
    },
    {
      monthKey: "2026-07",
      month: "Jul/26",
      fullMonth: "Julho 2026",
      directSales: 16900,
      resellerSales: 10100,
      totalSales: 27000,
      target: 25000,
      ordersCount: 58,
    },
    {
      monthKey: "2026-08",
      month: "Ago/26",
      fullMonth: "Agosto 2026 (Atual)",
      directSales: Math.max(15400, totalSalesAmount * 0.6),
      resellerSales: Math.max(9200, totalSalesAmount * 0.4),
      totalSales: Math.max(24600, totalSalesAmount),
      target: 26000,
      ordersCount: Math.max(52, totalOrdersCount),
    },
  ];

  const totalSemesterSales = monthlySalesData.reduce((acc, m) => acc + m.totalSales, 0);
  const avgMonthlySales = totalSemesterSales / monthlySalesData.length;
  const bestMonth = monthlySalesData.reduce(
    (prev, curr) => (curr.totalSales > prev.totalSales ? curr : prev),
    monthlySalesData[0]
  );
  const currentMonthData = monthlySalesData[monthlySalesData.length - 1];
  const prevMonthData = monthlySalesData[monthlySalesData.length - 2];
  const momGrowth =
    ((currentMonthData.totalSales - prevMonthData.totalSales) / prevMonthData.totalSales) * 100;

  // Custom Chart Tooltip
  const CustomBarTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const dataItem = payload[0]?.payload;
      return (
        <div className="bg-stone-900/95 backdrop-blur-md text-white border border-stone-700 p-3.5 rounded-2xl shadow-xl text-xs space-y-2 min-w-[210px]">
          <div className="flex items-center justify-between border-b border-stone-800 pb-1.5">
            <span className="font-serif font-bold text-amber-400">{dataItem?.fullMonth || label}</span>
            <span className="text-[10px] text-stone-400 font-mono">{dataItem?.ordersCount} pedidos</span>
          </div>
          <div className="space-y-1.5 text-[11px]">
            {chartViewMode === "channels" ? (
              <>
                <div className="flex justify-between items-center text-amber-200">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-amber-500 inline-block" />
                    Venda Direta / E-commerce:
                  </span>
                  <span className="font-semibold font-mono">
                    R$ {Number(dataItem?.directSales || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="flex justify-between items-center text-sky-200">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-sky-500 inline-block" />
                    Revendedoras / Maletas:
                  </span>
                  <span className="font-semibold font-mono">
                    R$ {Number(dataItem?.resellerSales || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </>
            ) : chartViewMode === "target" ? (
              <>
                <div className="flex justify-between items-center text-stone-200">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-amber-500 inline-block" />
                    Realizado:
                  </span>
                  <span className="font-semibold font-mono">
                    R$ {Number(dataItem?.totalSales || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="flex justify-between items-center text-stone-400">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-stone-500 inline-block" />
                    Meta:
                  </span>
                  <span className="font-semibold font-mono">
                    R$ {Number(dataItem?.target || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </>
            ) : null}
            <div className="pt-1.5 border-t border-stone-800 flex justify-between items-center font-bold text-stone-100">
              <span>Total Faturado:</span>
              <span className="text-emerald-400 font-mono text-xs">
                R$ {Number(dataItem?.totalSales || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
              </span>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-8 text-stone-900 pb-16">
      {/* 1. Header & Quick Context Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-stone-200">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full bg-amber-100/80 border border-amber-300 text-[10px] font-bold uppercase tracking-wider text-amber-900">
              Painel de Indicadores • {tenant.name}
            </span>
            <span className="text-xs text-stone-400 font-medium">Tempo Real</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-serif font-bold text-stone-900 tracking-tight mt-1">
            Visão Geral de Desempenho
          </h1>
          <p className="text-xs text-stone-500 mt-0.5">
            Acompanhe métricas essenciais de faturamento, pedidos, catálogo e nível de estoque.
          </p>
        </div>

        {/* Quick Actions & Period Filter */}
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex items-center bg-stone-100 p-1 rounded-xl border border-stone-200 text-xs font-semibold">
            <button
              onClick={() => setPeriodFilter("hoje")}
              className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                periodFilter === "hoje" ? "bg-white text-stone-900 shadow-xs" : "text-stone-500 hover:text-stone-800"
              }`}
            >
              Hoje
            </button>
            <button
              onClick={() => setPeriodFilter("semana")}
              className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                periodFilter === "semana" ? "bg-white text-stone-900 shadow-xs" : "text-stone-500 hover:text-stone-800"
              }`}
            >
              Semana
            </button>
            <button
              onClick={() => setPeriodFilter("mes")}
              className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                periodFilter === "mes" ? "bg-white text-stone-900 shadow-xs" : "text-stone-500 hover:text-stone-800"
              }`}
            >
              Este Mês
            </button>
          </div>

          <button
            id="btn-dash-quick-sale"
            onClick={() => onNavigateTab("orders")}
            className="flex items-center gap-1.5 px-4 py-2 bg-stone-900 hover:bg-stone-800 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5 text-amber-400" />
            <span>Nova Venda</span>
          </button>
          <button
            id="btn-dash-open-storefront"
            onClick={() => onNavigateTab("storefront")}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-white hover:bg-stone-50 border border-stone-300 text-stone-800 rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer"
          >
            <Store className="w-3.5 h-3.5 text-amber-600" />
            <span>Ver Vitrine</span>
          </button>
        </div>
      </div>

      {/* 2. Primary High-Impact Metric Cards Grid (Vendas Totais, Total de Pedidos, Vitrine de Produtos, Status de Estoque) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 sm:gap-6">
        {/* CARD 1: VENDAS TOTAIS */}
        <div
          id="dash-kpi-vendas-totais"
          onClick={() => onNavigateTab("orders")}
          className="group relative bg-white border border-stone-200 hover:border-amber-400 p-6 rounded-2xl shadow-xs hover:shadow-md transition-all cursor-pointer flex flex-col justify-between overflow-hidden"
        >
          <div className="absolute top-0 right-0 w-24 h-24 bg-amber-50 rounded-bl-full -z-0 group-hover:scale-110 transition-transform" />
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-3">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-amber-50 border border-amber-200 rounded-full text-[10px] font-bold uppercase tracking-wider text-amber-900 font-sans">
                <DollarSign className="w-3.5 h-3.5 text-amber-600" />
                Vendas Totais
              </span>
              <ArrowUpRight className="w-4 h-4 text-stone-300 group-hover:text-amber-600 transition-colors" />
            </div>

            <div className="mt-1">
              <div className="text-3xl font-sans font-bold text-stone-900 tracking-tight">
                R$ {totalSalesAmount.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
              <div className="text-xs text-stone-500 mt-1.5 flex items-center gap-1.5 font-sans">
                <span>Ticket Médio:</span>
                <strong className="text-stone-800 font-bold font-sans">
                  R$ {avgOrderTicket.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </strong>
              </div>
            </div>
          </div>

          <div className="relative z-10 pt-4 mt-4 border-t border-stone-100 flex items-center justify-between text-xs font-sans">
            <span className="text-emerald-700 font-bold flex items-center gap-1">
              <TrendingUp className="w-3.5 h-3.5" />
              +18.4% no mês
            </span>
            <span className="text-stone-400 font-medium">Meta 92%</span>
          </div>
        </div>

        {/* CARD 2: TOTAL DE PEDIDOS */}
        <div
          id="dash-kpi-total-pedidos"
          onClick={() => onNavigateTab("orders")}
          className="group relative bg-white border border-stone-200 hover:border-sky-400 p-6 rounded-2xl shadow-xs hover:shadow-md transition-all cursor-pointer flex flex-col justify-between overflow-hidden"
        >
          <div className="absolute top-0 right-0 w-24 h-24 bg-sky-50 rounded-bl-full -z-0 group-hover:scale-110 transition-transform" />
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-3">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-sky-50 border border-sky-200 rounded-full text-[10px] font-bold uppercase tracking-wider text-sky-900 font-sans">
                <ShoppingBag className="w-3.5 h-3.5 text-sky-600" />
                Total de Pedidos
              </span>
              <ArrowUpRight className="w-4 h-4 text-stone-300 group-hover:text-sky-600 transition-colors" />
            </div>

            <div className="mt-1">
              <div className="text-3xl font-sans font-bold text-stone-900 tracking-tight">
                {totalOrdersCount} <span className="text-sm font-sans font-normal text-stone-500">pedidos</span>
              </div>
              <div className="text-xs text-stone-500 mt-1.5 font-sans">
                Conversão omnicanal estimada em <strong className="text-stone-800 font-bold">4.8%</strong>
              </div>
            </div>
          </div>

          <div className="relative z-10 pt-4 mt-4 border-t border-stone-100 flex items-center justify-between text-xs font-sans">
            <span className="text-emerald-700 font-bold flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" />
              {paidOrdersCount} pagos
            </span>
            {pendingOrdersCount > 0 ? (
              <span className="text-amber-700 font-bold">
                {pendingOrdersCount} pendentes
              </span>
            ) : (
              <span className="text-stone-400 font-medium">0 pendentes</span>
            )}
          </div>
        </div>

        {/* CARD 3: VITRINE DE PRODUTOS */}
        <div
          id="dash-kpi-vitrine-produtos"
          onClick={() => onNavigateTab("catalog")}
          className="group relative bg-white border border-stone-200 hover:border-purple-400 p-6 rounded-2xl shadow-xs hover:shadow-md transition-all cursor-pointer flex flex-col justify-between overflow-hidden"
        >
          <div className="absolute top-0 right-0 w-24 h-24 bg-purple-50 rounded-bl-full -z-0 group-hover:scale-110 transition-transform" />
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-3">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-purple-50 border border-purple-200 rounded-full text-[10px] font-bold uppercase tracking-wider text-purple-900 font-sans">
                <Sparkles className="w-3.5 h-3.5 text-purple-600" />
                Vitrine de Produtos
              </span>
              <ArrowUpRight className="w-4 h-4 text-stone-300 group-hover:text-purple-600 transition-colors" />
            </div>

            <div className="mt-1">
              <div className="text-3xl font-sans font-bold text-stone-900 tracking-tight">
                {totalProductsCount} <span className="text-sm font-sans font-normal text-stone-500">modelos</span>
              </div>
              <div className="text-xs text-stone-500 mt-1.5 font-sans">
                {activeShowcaseProducts} disponíveis com foto e especificações
              </div>
            </div>
          </div>

          <div className="relative z-10 pt-4 mt-4 border-t border-stone-100 flex items-center justify-between text-xs font-sans">
            <span className="text-purple-800 font-bold">
              {totalCategoriesCount} categorias ativas
            </span>
            <span className="text-stone-400 font-medium">Ver catálogo &rarr;</span>
          </div>
        </div>

        {/* CARD 4: STATUS DE ESTOQUE */}
        <div
          id="dash-kpi-status-estoque"
          onClick={() => onNavigateTab("inventory")}
          className="group relative bg-white border border-stone-200 hover:border-emerald-400 p-6 rounded-2xl shadow-xs hover:shadow-md transition-all cursor-pointer flex flex-col justify-between overflow-hidden"
        >
          <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-50 rounded-bl-full -z-0 group-hover:scale-110 transition-transform" />
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-3">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 border border-emerald-200 rounded-full text-[10px] font-bold uppercase tracking-wider text-emerald-900 font-sans">
                <Boxes className="w-3.5 h-3.5 text-emerald-600" />
                Status de Estoque
              </span>
              <ArrowUpRight className="w-4 h-4 text-stone-300 group-hover:text-emerald-600 transition-colors" />
            </div>

            <div className="mt-1">
              <div className="text-3xl font-sans font-bold text-stone-900 tracking-tight">
                {totalStockUnits} <span className="text-sm font-sans font-normal text-stone-500">peças</span>
              </div>
              <div className="text-xs text-stone-500 mt-1.5 font-sans">
                Avaliado em <strong className="text-stone-800 font-bold font-sans">R$ {totalStockInventoryValue.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong>
              </div>
            </div>
          </div>

          <div className="relative z-10 pt-4 mt-4 border-t border-stone-100 flex items-center justify-between text-xs font-sans">
            {lowStockProducts.length > 0 ? (
              <span className="text-amber-700 font-bold flex items-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5" />
                {lowStockProducts.length} em estoque crítico
              </span>
            ) : (
              <span className="text-emerald-700 font-bold flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Estoque 100% equilibrado
              </span>
            )}
            <span className="text-stone-400 font-medium">Ver inventário</span>
          </div>
        </div>
      </div>

      {/* 3. AI Predictive Insight Banner */}
      <div
        id="dash-ai-prediction-card"
        className="p-5 bg-gradient-to-r from-stone-900 via-stone-850 to-stone-900 border border-stone-800 rounded-2xl text-white shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4"
      >
        <div className="flex items-start sm:items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-amber-400/10 border border-amber-400/20 flex items-center justify-center shrink-0">
            <Sparkles className="w-5 h-5 text-amber-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400">
                AI Copilot • Insights Preditivos de Giro
              </span>
              <span className="text-[10px] text-stone-400">• Alta Relevância</span>
            </div>
            <p className="text-xs sm:text-sm font-serif italic text-stone-100 mt-0.5 leading-relaxed">
              "Colares banhados a ouro 18k com zircônias apresentaram alta velocidade de venda (giro 3.8x). Recomendamos reforçar o estoque antes da campanha de fim de mês."
            </p>
          </div>
        </div>
        <button
          onClick={() => onNavigateTab("aiGateway")}
          className="self-start sm:self-center px-4 py-2 bg-stone-800 hover:bg-stone-700 text-stone-100 rounded-xl text-xs font-bold transition-all shadow-xs shrink-0 cursor-pointer flex items-center gap-1.5"
        >
          <span>Abrir Copilot</span>
          <ArrowUpRight className="w-3.5 h-3.5 text-amber-400" />
        </button>
      </div>

      {/* 4. Visual Recharts Chart Card (Evolução de Vendas e Canais) */}
      <div
        id="section-monthly-sales-chart"
        className="bg-white border border-stone-200 rounded-3xl p-6 sm:p-8 shadow-xs space-y-6"
      >
        {/* Chart Header & Mode Selector */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 border-b border-stone-100">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="p-1.5 rounded-lg bg-amber-100 text-amber-800">
                <BarChart3 className="w-4 h-4" />
              </span>
              <h2 className="text-xl font-serif font-bold text-stone-900">
                Evolução Mensal de Vendas (Últimos 6 Meses)
              </h2>
            </div>
            <p className="text-xs text-stone-500">
              Desempenho consolidado comparando canais comerciais diretos e maletas de revendedoras.
            </p>
          </div>

          {/* Filter / View Mode Pills */}
          <div className="flex items-center gap-1 bg-stone-100 p-1 rounded-xl border border-stone-200 self-start md:self-auto">
            <button
              id="btn-chart-mode-channels"
              type="button"
              onClick={() => setChartViewMode("channels")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                chartViewMode === "channels"
                  ? "bg-white text-stone-900 shadow-xs border border-stone-200"
                  : "text-stone-600 hover:text-stone-900"
              }`}
            >
              <Layers className="w-3.5 h-3.5 text-amber-600" />
              <span>Por Canal</span>
            </button>
            <button
              id="btn-chart-mode-consolidated"
              type="button"
              onClick={() => setChartViewMode("consolidated")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                chartViewMode === "consolidated"
                  ? "bg-white text-stone-900 shadow-xs border border-stone-200"
                  : "text-stone-600 hover:text-stone-900"
              }`}
            >
              <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
              <span>Consolidado</span>
            </button>
            <button
              id="btn-chart-mode-target"
              type="button"
              onClick={() => setChartViewMode("target")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                chartViewMode === "target"
                  ? "bg-white text-stone-900 shadow-xs border border-stone-200"
                  : "text-stone-600 hover:text-stone-900"
              }`}
            >
              <Calendar className="w-3.5 h-3.5 text-sky-600" />
              <span>Meta vs Real</span>
            </button>
          </div>
        </div>

        {/* Quick Semester Summary Metrics */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-stone-50/80 p-4 rounded-2xl border border-stone-100">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400">
              Acumulado Semestre
            </span>
            <div className="text-base sm:text-lg font-serif font-bold text-stone-900 mt-0.5">
              R$ {totalSemesterSales.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
          </div>
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400">
              Média Mensal
            </span>
            <div className="text-base sm:text-lg font-serif font-bold text-stone-900 mt-0.5">
              R$ {avgMonthlySales.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
          </div>
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400">
              Melhor Mês
            </span>
            <div className="text-base sm:text-lg font-serif font-bold text-amber-900 mt-0.5">
              {bestMonth.month} • R$ {(bestMonth.totalSales / 1000).toFixed(1)}k
            </div>
          </div>
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400">
              Variação MoM
            </span>
            <div className={`text-base sm:text-lg font-serif font-bold mt-0.5 flex items-center gap-1 ${
              momGrowth >= 0 ? "text-emerald-700" : "text-amber-700"
            }`}>
              {momGrowth >= 0 ? `+${momGrowth.toFixed(1)}%` : `${momGrowth.toFixed(1)}%`}
              <span className="text-[10px] font-sans text-stone-500 font-normal">vs Julho</span>
            </div>
          </div>
        </div>

        {/* Recharts Bar Chart */}
        <div className="w-full h-[300px] pt-2">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={monthlySalesData}
              margin={{ top: 15, right: 15, left: -5, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0eeeb" />
              <XAxis
                dataKey="month"
                tickLine={false}
                axisLine={{ stroke: "#e7e5e4" }}
                tick={{ fill: "#78716c", fontSize: 11, fontWeight: 600 }}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                tickFormatter={(val) => `R$ ${(val / 1000).toFixed(0)}k`}
                tick={{ fill: "#a8a29e", fontSize: 10 }}
              />
              <Tooltip content={<CustomBarTooltip />} cursor={{ fill: "#f5f5f4", opacity: 0.6 }} />
              <Legend
                iconType="circle"
                wrapperStyle={{ fontSize: "11px", paddingTop: "12px" }}
              />

              {chartViewMode === "channels" ? (
                <>
                  <Bar
                    dataKey="directSales"
                    name="Venda Direta / E-commerce"
                    fill="#d97706"
                    radius={[6, 6, 0, 0]}
                    maxBarSize={44}
                  />
                  <Bar
                    dataKey="resellerSales"
                    name="Revendedoras / Maletas"
                    fill="#0284c7"
                    radius={[6, 6, 0, 0]}
                    maxBarSize={44}
                  />
                </>
              ) : chartViewMode === "consolidated" ? (
                <Bar
                  dataKey="totalSales"
                  name="Faturamento Total"
                  fill="#1c1917"
                  radius={[6, 6, 0, 0]}
                  maxBarSize={56}
                >
                  {monthlySalesData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={entry.monthKey === "2026-08" ? "#d97706" : "#292524"}
                    />
                  ))}
                </Bar>
              ) : (
                <>
                  <Bar
                    dataKey="totalSales"
                    name="Faturamento Realizado"
                    fill="#d97706"
                    radius={[6, 6, 0, 0]}
                    maxBarSize={44}
                  />
                  <Bar
                    dataKey="target"
                    name="Meta Planejada"
                    fill="#a8a29e"
                    radius={[6, 6, 0, 0]}
                    maxBarSize={44}
                  />
                </>
              )}
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* 5. Visual Grid of High-Impact Operational Cards (100% Zero Tables!) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* CARD A: Alertas de Estoque Crítico (Cards Visuais) */}
        <div className="bg-white border border-stone-200 rounded-3xl p-6 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-4 border-b border-stone-100 mb-4">
              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded-lg bg-rose-50 text-rose-700">
                  <AlertCircle className="w-4 h-4" />
                </span>
                <div>
                  <h3 className="text-base font-serif font-bold text-stone-900">
                    Estoque Crítico
                  </h3>
                  <p className="text-[11px] text-stone-500">Peças com menos de 5 unidades</p>
                </div>
              </div>
              <button
                onClick={() => onNavigateTab("inventory")}
                className="text-xs font-bold text-amber-700 hover:text-amber-900 cursor-pointer"
              >
                Gerenciar
              </button>
            </div>

            {lowStockProducts.length > 0 ? (
              <div className="space-y-3">
                {lowStockProducts.slice(0, 4).map((p) => (
                  <div
                    key={p.id}
                    className="p-3 bg-stone-50 hover:bg-stone-100/80 rounded-2xl border border-stone-200 flex items-center justify-between gap-3 transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-xl bg-white border border-stone-200 overflow-hidden shrink-0 flex items-center justify-center text-xs text-stone-400 font-bold">
                        {p.imageUrl ? (
                          <img
                            src={p.imageUrl}
                            alt={p.name}
                            className="w-full h-full object-cover"
                            referrerPolicy="no-referrer"
                          />
                        ) : (
                          <Package className="w-5 h-5 text-stone-400" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-stone-900 truncate">
                          {p.name}
                        </div>
                        <div className="text-[10px] text-stone-500 font-mono">
                          SKU: {p.sku} • R$ {p.price.toFixed(2)}
                        </div>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        p.stockPhysical === 0
                          ? "bg-rose-100 text-rose-800 border border-rose-200"
                          : "bg-amber-100 text-amber-800 border border-amber-200"
                      }`}>
                        {p.stockPhysical} un.
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-6 text-center text-stone-500 bg-stone-50 rounded-2xl border border-stone-200">
                <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
                <p className="text-xs font-medium">Todas as peças com estoque adequado!</p>
              </div>
            )}
          </div>

          <button
            onClick={() => onNavigateTab("inventory")}
            className="w-full mt-4 py-2.5 bg-stone-100 hover:bg-stone-200 text-stone-800 rounded-xl text-xs font-bold transition-all text-center flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <span>Ver Inventário Completo</span>
            <ChevronRight className="w-3.5 h-3.5 text-stone-500" />
          </button>
        </div>

        {/* CARD B: Canais Omnichannel de Venda (Visual Progress Cards) */}
        <div className="bg-white border border-stone-200 rounded-3xl p-6 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-4 border-b border-stone-100 mb-4">
              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded-lg bg-amber-50 text-amber-700">
                  <ShoppingBag className="w-4 h-4" />
                </span>
                <div>
                  <h3 className="text-base font-serif font-bold text-stone-900">
                    Canais de Venda
                  </h3>
                  <p className="text-[11px] text-stone-500">Distribuição dos pedidos unificados</p>
                </div>
              </div>
              <span className="text-xs font-mono font-bold text-stone-700">
                {totalOrdersCount} pedidos
              </span>
            </div>

            <div className="space-y-3">
              {[
                { name: "WhatsApp & Pedidos Diretos", count: channelCounts.WHATSAPP + channelCounts.PRESENCIAL, icon: Send, barColor: "bg-emerald-500" },
                { name: "Loja Virtual / E-commerce", count: channelCounts.LOJA_WEB, icon: ShoppingBag, barColor: "bg-amber-500" },
                { name: "Revendedoras & Maletas", count: channelCounts.REVENDEDORA, icon: Users, barColor: "bg-sky-500" },
                { name: "Showroom & Presencial", count: channelCounts.PRESENCIAL, icon: Package, barColor: "bg-stone-500" },
              ].map((c) => {
                const Icon = c.icon;
                const percentage = totalOrdersCount > 0 ? Math.round((c.count / totalOrdersCount) * 100) : 0;
                return (
                  <div key={c.name} className="p-3 bg-stone-50 rounded-2xl border border-stone-200 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2 font-bold text-stone-800">
                        <Icon className="w-3.5 h-3.5 text-stone-600" />
                        <span>{c.name}</span>
                      </div>
                      <div className="font-mono font-bold text-stone-900">
                        {c.count} <span className="text-stone-400 font-normal font-sans">({percentage}%)</span>
                      </div>
                    </div>
                    <div className="w-full h-1.5 bg-stone-200 rounded-full overflow-hidden">
                      <div
                        className={`h-full ${c.barColor} rounded-full transition-all duration-500`}
                        style={{ width: `${Math.max(percentage, 8)}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <button
            onClick={() => onNavigateTab("orders")}
            className="w-full mt-4 py-2.5 bg-stone-100 hover:bg-stone-200 text-stone-800 rounded-xl text-xs font-bold transition-all text-center flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <span>Ver Todos os Pedidos</span>
            <ChevronRight className="w-3.5 h-3.5 text-stone-500" />
          </button>
        </div>

        {/* CARD C: Garantias Digitais & Pós-Venda (Visual Cards) */}
        <div className="bg-white border border-stone-200 rounded-3xl p-6 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-4 border-b border-stone-100 mb-4">
              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded-lg bg-emerald-50 text-emerald-700">
                  <ShieldCheck className="w-4 h-4" />
                </span>
                <div>
                  <h3 className="text-base font-serif font-bold text-stone-900">
                    Garantia Digital
                  </h3>
                  <p className="text-[11px] text-stone-500">QR Codes e certificados de autenticidade</p>
                </div>
              </div>
              <button
                onClick={() => onNavigateTab("warranties")}
                className="text-xs font-bold text-amber-700 hover:text-amber-900 cursor-pointer"
              >
                Ver Todas
              </button>
            </div>

            {warranties.length > 0 ? (
              <div className="space-y-3">
                {warranties.slice(0, 3).map((warr) => (
                  <div
                    key={warr.id}
                    className="p-3 bg-stone-50 hover:bg-stone-100/80 rounded-2xl border border-stone-200 flex items-center gap-3 transition-colors"
                  >
                    <div className="w-12 h-12 bg-white border border-stone-200 rounded-xl flex items-center justify-center text-stone-700 shrink-0">
                      <QrCode className="w-6 h-6 text-stone-800" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-1">
                        <span className="text-xs font-mono font-bold text-stone-900 truncate">
                          {warr.code}
                        </span>
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-100 text-emerald-800">
                          1 Ano
                        </span>
                      </div>
                      <div className="text-[11px] text-stone-600 truncate mt-0.5">
                        {warr.productName}
                      </div>
                      <div className="text-[10px] text-stone-400">
                        Cliente: {warr.customerName}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-6 text-center text-stone-500 bg-stone-50 rounded-2xl border border-stone-200">
                <ShieldCheck className="w-8 h-8 text-stone-300 mx-auto mb-2" />
                <p className="text-xs">Nenhum certificado emitido recentemente.</p>
              </div>
            )}
          </div>

          <button
            onClick={() => onNavigateTab("warranties")}
            className="w-full mt-4 py-2.5 bg-stone-100 hover:bg-stone-200 text-stone-800 rounded-xl text-xs font-bold transition-all text-center flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <span>Emitir Nova Garantia</span>
            <ChevronRight className="w-3.5 h-3.5 text-stone-500" />
          </button>
        </div>
      </div>

      {/* 6. Active Consignments Visual Bento Cards (No Tables) */}
      {consignments && consignments.length > 0 && (
        <div className="bg-white border border-stone-200 rounded-3xl p-6 sm:p-8 shadow-xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-stone-100">
            <div>
              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded-lg bg-sky-50 text-sky-700">
                  <RefreshCw className="w-4 h-4" />
                </span>
                <h3 className="text-xl font-serif font-bold text-stone-900">
                  Maletas & Consignações em Andamento
                </h3>
              </div>
              <p className="text-xs text-stone-500 mt-0.5">
                Cartões visuais com status de acerto, saldo vendido e prazos de devolução.
              </p>
            </div>
            <button
              onClick={() => onNavigateTab("consignments")}
              className="text-xs font-bold text-sky-700 hover:text-sky-900 self-start sm:self-auto flex items-center gap-1 cursor-pointer"
            >
              <span>Ver Todas as Maletas ({consignments.length})</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {consignments.slice(0, 6).map((maleta) => {
              const isExpiring =
                maleta.status === "EM_ABERTO" &&
                new Date(maleta.dueDate) <= new Date("2026-08-30");
              const percentageSold = maleta.totalValue > 0
                ? Math.round((maleta.soldValue / maleta.totalValue) * 100)
                : 0;

              return (
                <div
                  key={maleta.id}
                  className="p-5 bg-stone-50 hover:bg-stone-100/90 border border-stone-200 rounded-2xl shadow-xs transition-all flex flex-col justify-between space-y-4"
                >
                  <div className="space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="text-sm font-bold text-stone-900 flex items-center gap-1.5">
                          <Users className="w-3.5 h-3.5 text-stone-500" />
                          <span>{maleta.resellerName}</span>
                        </div>
                        <div className="text-[11px] text-stone-500 mt-0.5">
                          {maleta.resellerPhone}
                        </div>
                      </div>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-stone-200 text-stone-700">
                        {maleta.code}
                      </span>
                    </div>

                    <div className="pt-2">
                      <div className="flex justify-between items-baseline text-xs mb-1">
                        <span className="text-stone-500 font-medium">Vendido / Total:</span>
                        <span className="font-serif font-bold text-stone-900">
                          <strong className="text-emerald-700 font-semibold">R$ {maleta.soldValue.toFixed(2)}</strong>
                          <span className="text-stone-400 text-[10px] font-normal font-sans"> / R$ {maleta.totalValue.toFixed(2)}</span>
                        </span>
                      </div>
                      <div className="w-full h-1.5 bg-stone-200 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-emerald-500 rounded-full transition-all"
                          style={{ width: `${Math.min(percentageSold, 100)}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-stone-200/80 flex items-center justify-between text-xs">
                    <div>
                      {isExpiring ? (
                        <span className="bg-amber-100 text-amber-900 px-2 py-0.5 rounded-full text-[10px] border border-amber-200 font-bold flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          Vence em {new Date(maleta.dueDate).toLocaleDateString("pt-BR")}
                        </span>
                      ) : maleta.status === "FINALIZADA" ? (
                        <span className="bg-emerald-100 text-emerald-900 px-2 py-0.5 rounded-full text-[10px] font-bold">
                          Finalizada
                        </span>
                      ) : (
                        <span className="bg-stone-200 text-stone-800 px-2 py-0.5 rounded-full text-[10px] font-medium">
                          Ativa
                        </span>
                      )}
                    </div>
                    <button
                      onClick={() => onNavigateTab("consignments")}
                      className="px-3 py-1 bg-white hover:bg-stone-200 border border-stone-300 text-stone-800 rounded-lg text-xs font-bold transition-all shadow-2xs cursor-pointer"
                    >
                      Acertar
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
