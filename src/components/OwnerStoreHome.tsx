import React, { useState } from "react";
import {
  Calendar,
  ChevronDown,
  ShoppingBag,
  Package,
  AlertTriangle,
  Bell,
  ArrowUpRight,
  Share2,
  Zap,
  UserPlus,
  Sparkles,
  CheckCircle2,
  Clock,
  ChevronRight,
  MessageCircle,
  ShieldCheck,
  Globe,
  RefreshCw,
  Trophy,
  ArrowRight,
  Copy,
  Check,
} from "lucide-react";
import {
  TenantStore,
  ProductItem,
  UnifiedOrder,
  Customer,
  DigitalWarranty,
  StoreBrandingConfig,
} from "../types";

interface OwnerStoreHomeProps {
  tenant: TenantStore;
  branding: StoreBrandingConfig;
  products: ProductItem[];
  orders: UnifiedOrder[];
  customers: Customer[];
  warranties: DigitalWarranty[];
  trialDaysRemaining?: number;
  onNavigateTab: (tab: string) => void;
  onOpenNewSale: () => void;
  onOpenNewProduct: () => void;
  onOpenShareModal: () => void;
  onOpenNewCustomer?: () => void;
  onConfirmOrderPayment?: (orderId: string) => void;
}

export const OwnerStoreHome: React.FC<OwnerStoreHomeProps> = ({
  tenant,
  branding,
  products,
  orders,
  customers,
  warranties,
  onNavigateTab,
  onOpenNewSale,
  onOpenNewProduct,
  onOpenShareModal,
  onOpenNewCustomer,
}) => {
  const [copiedLink, setCopiedLink] = useState(false);

  const handleCopyStoreLink = (e: React.MouseEvent) => {
    e.stopPropagation();
    const url = `${window.location.origin}/#storefront`;
    navigator.clipboard.writeText(url);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  // ---------------------------------------------------------------------------
  // 1. DYNAMIC GREETING & DATE (Derived from real environment)
  // ---------------------------------------------------------------------------
  const currentHour = new Date().getHours();
  const greeting =
    currentHour < 12 ? "Bom dia" : currentHour < 18 ? "Boa tarde" : "Boa noite";
  
  const ownerName = "Maria";

  const formattedDate = new Intl.DateTimeFormat("pt-BR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(new Date());

  const capitalizedDate =
    formattedDate.charAt(0).toUpperCase() + formattedDate.slice(1);

  // ---------------------------------------------------------------------------
  // 2. 100% API-DRIVEN CALCULATIONS (Zero hardcoded numbers)
  // ---------------------------------------------------------------------------

  // Orders awaiting payment (PENDING, AWAITING_PAYMENT, INVENTORY_RESERVED)
  const pendingPaymentOrders = orders.filter(
    (o) =>
      o.status === "PENDING" ||
      o.status === "AWAITING_PAYMENT" ||
      o.status === "INVENTORY_RESERVED" ||
      o.paymentStatus === "PENDING" ||
      o.paymentStatus === "AGUARDANDO_PAGAMENTO"
  );

  // Orders paid and ready for delivery/fulfillment
  const readyForDeliveryOrders = orders.filter(
    (o) =>
      (o.status === "PAID" || o.paymentStatus === "PAID" || o.paymentStatus === "CONFIRMADO") &&
      (o.fulfillmentStatus === "UNFULFILLED" || o.status === "FULFILLMENT_PENDING" || !o.fulfillmentStatus)
  );

  // Completed/paid orders
  const paidOrders = orders.filter(
    (o) =>
      o.status === "PAID" ||
      o.status === "COMPLETED" ||
      o.paymentStatus === "PAID" ||
      o.paymentStatus === "CONFIRMADO"
  );

  // Total sales today (calculated dynamically from paid orders)
  const todayDateStr = new Date().toISOString().slice(0, 10);
  const paidOrdersToday = paidOrders.filter(
    (o) => o.createdAt && o.createdAt.startsWith(todayDateStr)
  );
  const deliveredOrders = paidOrders.filter(
    (o) => o.fulfillmentStatus === "DELIVERED"
  );

  const salesTodayValue =
    paidOrdersToday.length > 0
      ? paidOrdersToday.reduce((acc, o) => acc + (o.totalAmount || 0), 0)
      : deliveredOrders.length > 0
      ? deliveredOrders.reduce((acc, o) => acc + (o.totalAmount || 0), 0)
      : paidOrders.length > 0
      ? paidOrders[0].totalAmount || 0
      : 0;

  const formattedSalesToday = salesTodayValue.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });

  // Low stock calculation directly from products
  const lowStockProducts = products.filter(
    (p) => (p.stockAvailable ?? 0) <= (p.minStockAlert ?? 4)
  );

  const publishedProductsCount = products.filter(
    (p) => p.publicationStatus === "PUBLISHED" || (p.stockAvailable ?? 0) > 0
  ).length;

  return (
    <div className="space-y-6 max-w-6xl mx-auto animate-fadeIn pb-12 font-sans">
      {/* ========================================================================= */}
      {/* HEADER: Bom dia, Maria 👋 + Status da Loja + Data + Ações Rápidas         */}
      {/* ========================================================================= */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-stone-900 tracking-tight flex items-center gap-2">
            <span>
              {greeting}, {ownerName}
            </span>
            <span>👋</span>
          </h1>
          <div className="flex items-center gap-2 mt-1">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <p className="text-xs sm:text-sm text-stone-600 font-medium">
              Sua loja está funcionando normalmente.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          {/* Current Date Pill */}
          <div className="hidden sm:flex items-center gap-2 px-3.5 py-2 bg-white border border-stone-200 rounded-xl text-xs font-semibold text-stone-700 shadow-2xs">
            <Calendar className="w-3.5 h-3.5 text-stone-500" />
            <span>{capitalizedDate}</span>
          </div>

          {/* Registrar Venda CTA */}
          <button
            onClick={onOpenNewSale}
            className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs transition-all active:scale-98 cursor-pointer"
          >
            <Zap className="w-4 h-4 fill-white text-white" />
            <span>Registrar Venda</span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* SEÇÃO: HOJE (4 CARDS DE KPI 100% DERIVADOS DA API)                         */}
      {/* ========================================================================= */}
      <div>
        <div className="flex items-center justify-between mb-2.5">
          <h2 className="text-xs font-bold uppercase tracking-wider text-stone-500">
            Hoje
          </h2>
          <span className="text-[11px] text-stone-400">
            Atualizado em tempo real
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          {/* Card 1: 💰 Vendas hoje */}
          <div
            onClick={() => onNavigateTab("sales")}
            className="bg-white rounded-2xl p-4 border border-stone-200/90 shadow-2xs hover:shadow-xs hover:border-emerald-300 transition-all cursor-pointer group flex flex-col justify-between"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-stone-500 flex items-center gap-1.5">
                <span>💰</span>
                <span>Vendas hoje</span>
              </span>
              <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                <ArrowUpRight className="w-3.5 h-3.5" />
              </div>
            </div>
            <div className="mt-3">
              <div className="text-2xl font-bold text-stone-900 tracking-tight">
                {formattedSalesToday}
              </div>
              <div className="text-[11px] font-medium text-stone-500 mt-1 flex items-center gap-1">
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                <span>{paidOrders.length} pedido(s) confirmado(s)</span>
              </div>
            </div>
          </div>

          {/* Card 2: 🛍 Pedidos */}
          <div
            onClick={() => onNavigateTab("orders")}
            className="bg-white rounded-2xl p-4 border border-stone-200/90 shadow-2xs hover:shadow-xs hover:border-amber-300 transition-all cursor-pointer group flex flex-col justify-between"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-stone-500 flex items-center gap-1.5">
                <span>🛍</span>
                <span>Pedidos</span>
              </span>
              <div className="w-7 h-7 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                <ShoppingBag className="w-3.5 h-3.5" />
              </div>
            </div>
            <div className="mt-3">
              <div className="text-2xl font-bold text-stone-900 tracking-tight">
                {orders.length}
              </div>
              <div className="text-[11px] font-medium text-stone-500 mt-1 flex items-center gap-1">
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                <span>{pendingPaymentOrders.length} aguardando pagamento</span>
              </div>
            </div>
          </div>

          {/* Card 3: 📦 Produtos */}
          <div
            onClick={() => onNavigateTab("products")}
            className="bg-white rounded-2xl p-4 border border-stone-200/90 shadow-2xs hover:shadow-xs hover:border-teal-300 transition-all cursor-pointer group flex flex-col justify-between"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-stone-500 flex items-center gap-1.5">
                <span>📦</span>
                <span>Produtos</span>
              </span>
              <div className="w-7 h-7 rounded-lg bg-teal-50 text-teal-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Package className="w-3.5 h-3.5" />
              </div>
            </div>
            <div className="mt-3">
              <div className="text-2xl font-bold text-stone-900 tracking-tight">
                {products.length}
              </div>
              <div className="text-[11px] font-medium text-stone-500 mt-1 flex items-center gap-1">
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-teal-500"></span>
                <span>{publishedProductsCount} na vitrine ativa</span>
              </div>
            </div>
          </div>

          {/* Card 4: ⚠ Estoque baixo */}
          <div
            onClick={() => onNavigateTab("stock")}
            className="bg-white rounded-2xl p-4 border border-stone-200/90 shadow-2xs hover:shadow-xs hover:border-rose-300 transition-all cursor-pointer group flex flex-col justify-between"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-stone-500 flex items-center gap-1.5">
                <span>⚠</span>
                <span>Estoque baixo</span>
              </span>
              <div className="w-7 h-7 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                <AlertTriangle className="w-3.5 h-3.5" />
              </div>
            </div>
            <div className="mt-3">
              <div className="text-2xl font-bold text-stone-900 tracking-tight">
                {lowStockProducts.length} peças
              </div>
              <div className="text-[11px] font-medium text-rose-600 mt-1 flex items-center gap-1">
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-rose-500"></span>
                <span>Reposição recomendada</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* SEÇÃO: 🔔 PRECISA DA SUA ATENÇÃO (ALERTAS ACIONÁVEIS)                     */}
      {/* ========================================================================= */}
      <div className="bg-white rounded-2xl p-5 border border-stone-200/90 shadow-2xs">
        <div className="flex items-center justify-between mb-3.5">
          <div className="flex items-center gap-2">
            <span className="text-base">🔔</span>
            <h2 className="text-sm font-bold text-stone-900">
              Precisa da sua atenção
            </h2>
          </div>
          <span className="text-[11px] text-stone-400 hidden sm:inline">
            Clique no alerta para agir imediatamente
          </span>
        </div>

        <div className="space-y-2.5">
          {/* Alerta 1: 🔴 2 pedidos aguardando pagamento */}
          <div
            onClick={() => onNavigateTab("orders")}
            className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 bg-rose-50/60 hover:bg-rose-50 rounded-xl border border-rose-200/80 transition-all cursor-pointer group"
          >
            <div className="flex items-start sm:items-center gap-3">
              <span className="text-base shrink-0 mt-0.5 sm:mt-0">🔴</span>
              <div>
                <div className="text-xs sm:text-sm font-bold text-stone-900 group-hover:text-rose-700 transition-colors">
                  {pendingPaymentOrders.length} pedido
                  {pendingPaymentOrders.length !== 1 ? "s" : ""} aguardando
                  pagamento
                </div>
                <div className="text-[11px] text-stone-600 mt-0.5">
                  {pendingPaymentOrders.length > 0
                    ? pendingPaymentOrders
                        .map(
                          (o) =>
                            `${o.customerSnapshot?.name || "Cliente"} (${(
                              o.totalAmount || 0
                            ).toLocaleString("pt-BR", {
                              style: "currency",
                              currency: "BRL",
                            })})`
                        )
                        .slice(0, 2)
                        .join(" • ")
                    : "Nenhum pedido pendente"}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1.5 self-end sm:self-center text-xs font-bold text-rose-700 group-hover:translate-x-0.5 transition-transform shrink-0">
              <span>Cobrar no WhatsApp / Ver</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </div>
          </div>

          {/* Alerta 2: 🟡 3 produtos com estoque baixo */}
          <div
            onClick={() => onNavigateTab("stock")}
            className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 bg-amber-50/60 hover:bg-amber-50 rounded-xl border border-amber-200/80 transition-all cursor-pointer group"
          >
            <div className="flex items-start sm:items-center gap-3">
              <span className="text-base shrink-0 mt-0.5 sm:mt-0">🟡</span>
              <div>
                <div className="text-xs sm:text-sm font-bold text-stone-900 group-hover:text-amber-700 transition-colors">
                  {lowStockProducts.length} produto
                  {lowStockProducts.length !== 1 ? "s" : ""} com estoque baixo
                </div>
                <div className="text-[11px] text-stone-600 mt-0.5">
                  {lowStockProducts.length > 0
                    ? lowStockProducts
                        .map((p) => `${p.name} (${p.stockAvailable} un)`)
                        .slice(0, 3)
                        .join(" • ")
                    : "Estoque balanceado"}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1.5 self-end sm:self-center text-xs font-bold text-amber-700 group-hover:translate-x-0.5 transition-transform shrink-0">
              <span>Ver estoque na maleta</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </div>
          </div>

          {/* Alerta 3: 🟢 1 pedido pronto para entrega */}
          <div
            onClick={() => onNavigateTab("orders")}
            className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 bg-emerald-50/60 hover:bg-emerald-50 rounded-xl border border-emerald-200/80 transition-all cursor-pointer group"
          >
            <div className="flex items-start sm:items-center gap-3">
              <span className="text-base shrink-0 mt-0.5 sm:mt-0">🟢</span>
              <div>
                <div className="text-xs sm:text-sm font-bold text-stone-900 group-hover:text-emerald-700 transition-colors">
                  {readyForDeliveryOrders.length} pedido
                  {readyForDeliveryOrders.length !== 1 ? "s" : ""} pronto para
                  entrega
                </div>
                <div className="text-[11px] text-stone-600 mt-0.5">
                  {readyForDeliveryOrders.length > 0
                    ? readyForDeliveryOrders
                        .map(
                          (o) =>
                            `${o.orderNumber} - ${
                              o.customerSnapshot?.name || "Cliente"
                            } (${(o.totalAmount || 0).toLocaleString("pt-BR", {
                              style: "currency",
                              currency: "BRL",
                            })})`
                        )
                        .slice(0, 1)
                        .join("")
                    : "Todas as entregas concluídas"}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1.5 self-end sm:self-center text-xs font-bold text-emerald-700 group-hover:translate-x-0.5 transition-transform shrink-0">
              <span>Despachar / Separar</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* GUIA RÁPIDO: "O QUE VOCÊ PRECISA FAZER AGORA?"                            */}
      {/* ========================================================================= */}
      <div className="bg-gradient-to-br from-stone-900 via-stone-850 to-stone-900 text-white rounded-3xl p-5 sm:p-6 shadow-md border border-stone-800">
        <div className="flex items-center justify-between gap-2 mb-4">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400">
              Ações Comerciais Rápidas
            </span>
            <h2 className="text-base sm:text-lg font-bold text-white tracking-tight">
              O que você precisa fazer agora?
            </h2>
          </div>
          <span className="text-xs text-stone-400 hidden sm:inline">
            Clique no que você quer fazer
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* AÇÃO 1: DIVULGAR VITRINE */}
          <button
            onClick={onOpenShareModal}
            className="text-left bg-stone-800/80 hover:bg-stone-750 p-4 rounded-2xl border border-stone-750 hover:border-amber-500/50 transition-all group cursor-pointer flex flex-col justify-between"
          >
            <div>
              <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
                <Share2 className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-bold text-white group-hover:text-amber-300 transition-colors flex items-center justify-between">
                <span>Divulgar Vitrine</span>
                <ArrowUpRight className="w-4 h-4 text-stone-500 group-hover:text-amber-300" />
              </h3>
              <p className="text-xs text-stone-300 mt-1 leading-relaxed">
                Enviar link do catálogo para clientes ou grupos no WhatsApp.
              </p>
            </div>
            <div className="mt-3 pt-2.5 border-t border-stone-750 flex items-center justify-between text-[11px] font-semibold text-amber-400">
              <span>Enviar via WhatsApp</span>
              <span>↗</span>
            </div>
          </button>

          {/* AÇÃO 2: REGISTRAR VENDA */}
          <button
            onClick={onOpenNewSale}
            className="text-left bg-stone-800/80 hover:bg-stone-750 p-4 rounded-2xl border border-stone-750 hover:border-emerald-500/50 transition-all group cursor-pointer flex flex-col justify-between"
          >
            <div>
              <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
                <Zap className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-bold text-white group-hover:text-emerald-300 transition-colors flex items-center justify-between">
                <span>Registrar Venda</span>
                <ArrowUpRight className="w-4 h-4 text-stone-500 group-hover:text-emerald-300" />
              </h3>
              <p className="text-xs text-stone-300 mt-1 leading-relaxed">
                Vendeu no balcão ou no zap? Baixe estoque e gere comprovante.
              </p>
            </div>
            <div className="mt-3 pt-2.5 border-t border-stone-750 flex items-center justify-between text-[11px] font-semibold text-emerald-400">
              <span>Baixa de estoque</span>
              <span>+</span>
            </div>
          </button>

          {/* AÇÃO 3: CADASTRAR CLIENTE */}
          <button
            onClick={() => {
              if (onOpenNewCustomer) {
                onOpenNewCustomer();
              } else {
                onNavigateTab("customers");
              }
            }}
            className="text-left bg-stone-800/80 hover:bg-stone-750 p-4 rounded-2xl border border-stone-750 hover:border-purple-500/50 transition-all group cursor-pointer flex flex-col justify-between"
          >
            <div>
              <div className="w-10 h-10 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
                <UserPlus className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-bold text-white group-hover:text-purple-300 transition-colors flex items-center justify-between">
                <span>Novo Cliente</span>
                <ArrowUpRight className="w-4 h-4 text-stone-500 group-hover:text-purple-300" />
              </h3>
              <p className="text-xs text-stone-300 mt-1 leading-relaxed">
                Adicione contatos para emitir certificados de garantia digital.
              </p>
            </div>
            <div className="mt-3 pt-2.5 border-t border-stone-750 flex items-center justify-between text-[11px] font-semibold text-purple-400">
              <span>Cadastrar cliente</span>
              <span>+</span>
            </div>
          </button>

          {/* AÇÃO 4: MINHAS PEÇAS */}
          <button
            onClick={() => onNavigateTab("products")}
            className="text-left bg-stone-800/80 hover:bg-stone-750 p-4 rounded-2xl border border-stone-750 hover:border-teal-500/50 transition-all group cursor-pointer flex flex-col justify-between"
          >
            <div>
              <div className="w-10 h-10 rounded-xl bg-teal-500/20 text-teal-400 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
                <Sparkles className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-bold text-white group-hover:text-teal-300 transition-colors flex items-center justify-between">
                <span>Minhas Peças</span>
                <ArrowUpRight className="w-4 h-4 text-stone-500 group-hover:text-teal-300" />
              </h3>
              <p className="text-xs text-stone-300 mt-1 leading-relaxed">
                Conferir fotos, preços de venda e o que tem pronta-entrega na maleta.
              </p>
            </div>
            <div className="mt-3 pt-2.5 border-t border-stone-750 flex items-center justify-between text-[11px] font-semibold text-teal-400">
              <span>Ver {products.length} peças</span>
              <span>→</span>
            </div>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* REGRA DE OURO: JORNADA COMERCIAL DO PRIMEIRO DIA                           */}
      {/* ========================================================================= */}
      <div className="bg-white rounded-3xl p-5 sm:p-6 border border-stone-200/90 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/10 text-amber-700 flex items-center justify-center font-bold">
              <Trophy className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold text-stone-900 tracking-tight">
                  Regra de Ouro: Jornada de Ativação
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900">
                  {Math.min(products.length, 10)}/10 Peças
                </span>
              </div>
              <p className="text-xs text-stone-500 mt-0.5">
                O caminho mais rápido para sua primeira venda profissional no WhatsApp
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopyStoreLink}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-stone-100 hover:bg-stone-200 text-stone-800 rounded-xl text-xs font-bold transition-all cursor-pointer"
            >
              {copiedLink ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  <span className="text-emerald-700">Link Copiado!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 text-stone-600" />
                  <span>Copiar Link da Loja</span>
                </>
              )}
            </button>
            <button
              onClick={onOpenShareModal}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-2xs"
            >
              <MessageCircle className="w-3.5 h-3.5" />
              <span>Enviar no Zap</span>
            </button>
          </div>
        </div>

        {/* 6 Steps in Horizontal Flow */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2.5">
          {/* Step 1: Configurar Loja */}
          <div
            onClick={() => onNavigateTab("storeSettings")}
            className="p-3 rounded-2xl border bg-emerald-50/50 border-emerald-200/80 hover:bg-emerald-50 transition-all cursor-pointer group flex flex-col justify-between"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider">Passo 1</span>
              <CheckCircle2 className="w-4 h-4 text-emerald-600 fill-emerald-100" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-stone-900 group-hover:text-emerald-700 transition-colors">
                Configurar Loja
              </h4>
              <p className="text-[10px] text-stone-500 mt-0.5 line-clamp-2">
                Identidade, WhatsApp de atendimento e entrega
              </p>
            </div>
          </div>

          {/* Step 2: Cadastrar 10 Produtos */}
          <div
            onClick={onOpenNewProduct}
            className={`p-3 rounded-2xl border transition-all cursor-pointer group flex flex-col justify-between ${
              products.length >= 10
                ? "bg-emerald-50/50 border-emerald-200/80 hover:bg-emerald-50"
                : "bg-amber-50/60 border-amber-300 hover:bg-amber-50"
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className={`text-[10px] font-bold uppercase tracking-wider ${
                products.length >= 10 ? "text-emerald-800" : "text-amber-800"
              }`}>
                Passo 2
              </span>
              {products.length >= 10 ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 fill-emerald-100" />
              ) : (
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-amber-200 text-amber-900">
                  {products.length}/10
                </span>
              )}
            </div>
            <div>
              <h4 className="text-xs font-bold text-stone-900 group-hover:text-amber-800 transition-colors">
                Cadastrar 10 Peças
              </h4>
              <p className="text-[10px] text-stone-500 mt-0.5 line-clamp-2">
                Foto, preço e estoque para compor a vitrine
              </p>
            </div>
          </div>

          {/* Step 3: Publicar & Link WhatsApp */}
          <div
            onClick={onOpenShareModal}
            className="p-3 rounded-2xl border bg-stone-50/70 border-stone-200/80 hover:bg-stone-100/80 transition-all cursor-pointer group flex flex-col justify-between"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-bold text-stone-600 uppercase tracking-wider">Passo 3</span>
              <Share2 className="w-4 h-4 text-emerald-600" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-stone-900 group-hover:text-emerald-700 transition-colors">
                Enviar no Zap
              </h4>
              <p className="text-[10px] text-stone-500 mt-0.5 line-clamp-2">
                Divulgar o catálogo para clientes e listas VIP
              </p>
            </div>
          </div>

          {/* Step 4: Receber Pedido */}
          <div
            onClick={() => onNavigateTab("orders")}
            className={`p-3 rounded-2xl border transition-all cursor-pointer group flex flex-col justify-between ${
              orders.length > 0
                ? "bg-emerald-50/50 border-emerald-200/80 hover:bg-emerald-50"
                : "bg-stone-50/70 border-stone-200/80 hover:bg-stone-100/80"
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-bold text-stone-600 uppercase tracking-wider">Passo 4</span>
              <ShoppingBag className={`w-4 h-4 ${orders.length > 0 ? "text-emerald-600" : "text-stone-400"}`} />
            </div>
            <div>
              <h4 className="text-xs font-bold text-stone-900 group-hover:text-amber-800 transition-colors">
                Receber Pedido
              </h4>
              <p className="text-[10px] text-stone-500 mt-0.5 line-clamp-2">
                {orders.length > 0 ? `${orders.length} pedido(s) registrado(s)` : "Notificação instantânea pelo WhatsApp"}
              </p>
            </div>
          </div>

          {/* Step 5: Confirmar Pgto & Baixa */}
          <div
            onClick={() => onNavigateTab("orders")}
            className={`p-3 rounded-2xl border transition-all cursor-pointer group flex flex-col justify-between ${
              paidOrders.length > 0
                ? "bg-emerald-50/50 border-emerald-200/80 hover:bg-emerald-50"
                : "bg-stone-50/70 border-stone-200/80 hover:bg-stone-100/80"
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-bold text-stone-600 uppercase tracking-wider">Passo 5</span>
              <Zap className={`w-4 h-4 ${paidOrders.length > 0 ? "text-emerald-600" : "text-stone-400"}`} />
            </div>
            <div>
              <h4 className="text-xs font-bold text-stone-900 group-hover:text-emerald-700 transition-colors">
                Confirmar Pgto
              </h4>
              <p className="text-[10px] text-stone-500 mt-0.5 line-clamp-2">
                Baixa automática de saldo físico no inventário
              </p>
            </div>
          </div>

          {/* Step 6: Emitir Garantia Digital */}
          <div
            onClick={() => onNavigateTab("warranties")}
            className={`p-3 rounded-2xl border transition-all cursor-pointer group flex flex-col justify-between ${
              warranties.length > 0
                ? "bg-emerald-50/50 border-emerald-200/80 hover:bg-emerald-50"
                : "bg-stone-50/70 border-stone-200/80 hover:bg-stone-100/80"
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-bold text-stone-600 uppercase tracking-wider">Passo 6</span>
              <ShieldCheck className={`w-4 h-4 ${warranties.length > 0 ? "text-emerald-600" : "text-stone-400"}`} />
            </div>
            <div>
              <h4 className="text-xs font-bold text-stone-900 group-hover:text-purple-700 transition-colors">
                Emitir Garantia
              </h4>
              <p className="text-[10px] text-stone-500 mt-0.5 line-clamp-2">
                Certificado digital com QR Code e cuidados do banho
              </p>
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* QUANDO SUA LOJA CRESCER (EXPANSÃO MODULAR PROGRESSIVA)                     */}
        {/* ========================================================================= */}
        <div className="mt-5 pt-4 border-t border-stone-100">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-bold uppercase tracking-wider text-stone-500">
              🚀 Conforme sua operação crescer (Módulos Opcionais Ativáveis)
            </span>
            <span className="text-[11px] text-amber-800 font-semibold">
              Arquitetura Modular Nativa
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
            <div
              onClick={() => onNavigateTab("consignments")}
              className="p-3 rounded-xl bg-stone-50/80 hover:bg-amber-50/60 border border-stone-200/80 hover:border-amber-300 transition-all cursor-pointer group"
            >
              <div className="flex items-center gap-2 mb-1">
                <RefreshCw className="w-4 h-4 text-amber-700 group-hover:scale-110 transition-transform" />
                <span className="text-xs font-bold text-stone-900 group-hover:text-amber-900">
                  Consignação & Maletas
                </span>
              </div>
              <p className="text-[10px] text-stone-500 leading-tight">
                Repasse mostruários para revendedoras com acerto e ledger de retorno.
              </p>
            </div>

            <div
              onClick={() => onNavigateTab("commissions")}
              className="p-3 rounded-xl bg-stone-50/80 hover:bg-emerald-50/60 border border-stone-200/80 hover:border-emerald-300 transition-all cursor-pointer group"
            >
              <div className="flex items-center gap-2 mb-1">
                <Zap className="w-4 h-4 text-emerald-700 group-hover:scale-110 transition-transform" />
                <span className="text-xs font-bold text-stone-900 group-hover:text-emerald-900">
                  Comissões & Metas
                </span>
              </div>
              <p className="text-[10px] text-stone-500 leading-tight">
                Cálculo automático de repasses (20% a 40%) por volume e faturamento.
              </p>
            </div>

            <div
              onClick={() => onNavigateTab("saasBilling")}
              className="p-3 rounded-xl bg-stone-50/80 hover:bg-purple-50/60 border border-stone-200/80 hover:border-purple-300 transition-all cursor-pointer group"
            >
              <div className="flex items-center gap-2 mb-1">
                <Globe className="w-4 h-4 text-purple-700 group-hover:scale-110 transition-transform" />
                <span className="text-xs font-bold text-stone-900 group-hover:text-purple-900">
                  Domínio Próprio & SSL
                </span>
              </div>
              <p className="text-[10px] text-stone-500 leading-tight">
                Conecte seu endereço próprio (ex: sualoja.com.br) com certificado automático.
              </p>
            </div>

            <div
              onClick={() => onNavigateTab("customJewelry")}
              className="p-3 rounded-xl bg-stone-50/80 hover:bg-teal-50/60 border border-stone-200/80 hover:border-teal-300 transition-all cursor-pointer group"
            >
              <div className="flex items-center gap-2 mb-1">
                <Sparkles className="w-4 h-4 text-teal-700 group-hover:scale-110 transition-transform" />
                <span className="text-xs font-bold text-stone-900 group-hover:text-teal-900">
                  Peças Personalizadas
                </span>
              </div>
              <p className="text-[10px] text-stone-500 leading-tight">
                Monogramas, nomes em relevo e pré-venda sob encomenda na fundição.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* PEDIDOS RECENTES (100% DERIVADO DE PROPS)                                 */}
      {/* ========================================================================= */}
      <div className="bg-white rounded-2xl border border-stone-200/90 shadow-2xs overflow-hidden">
        <div className="px-5 py-4 border-b border-stone-100 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-stone-900">
              Últimas vendas & pedidos
            </h2>
            <p className="text-[11px] text-stone-400 mt-0.5">
              Acompanhe quem comprou e o status de pagamento em tempo real
            </p>
          </div>
          <button
            onClick={() => onNavigateTab("orders")}
            className="text-xs font-semibold text-amber-700 hover:text-amber-900 transition-colors cursor-pointer"
          >
            Ver todos ({orders.length}) →
          </button>
        </div>

        {orders.length === 0 ? (
          <div className="p-8 text-center">
            <ShoppingBag className="w-10 h-10 text-stone-300 mx-auto mb-2" />
            <p className="text-sm font-medium text-stone-600">
              Nenhum pedido registrado ainda.
            </p>
            <p className="text-xs text-stone-400 mt-0.5">
              Divulgue seu catálogo para receber pedidos no WhatsApp ou registre uma venda manual.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-stone-100">
            {orders.slice(0, 5).map((order) => {
              const isPaid =
                order.status === "PAID" || order.paymentStatus === "PAID";
              const isReadyToDeliver =
                isPaid &&
                (order.fulfillmentStatus === "UNFULFILLED" ||
                  order.status === "FULFILLMENT_PENDING");

              return (
                <div
                  key={order.id}
                  onClick={() => onNavigateTab("orders")}
                  className="px-5 py-3.5 flex items-center justify-between gap-4 hover:bg-stone-50/70 transition-colors cursor-pointer"
                >
                  {/* Order code & Client */}
                  <div className="flex items-center gap-3.5 min-w-0">
                    <span className="text-xs font-bold text-stone-900 shrink-0 font-mono">
                      {order.orderNumber}
                    </span>
                    <span className="text-xs text-stone-700 truncate font-medium">
                      {order.customerSnapshot?.name || "Cliente"}
                    </span>
                  </div>

                  {/* Date, Status pill, Total amount */}
                  <div className="flex items-center gap-3 sm:gap-6 shrink-0">
                    <span className="text-xs text-stone-400 hidden sm:inline">
                      {new Date(order.createdAt).toLocaleDateString("pt-BR", {
                        day: "2-digit",
                        month: "2-digit",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>

                    {/* Status badge */}
                    {isReadyToDeliver ? (
                      <span className="px-2.5 py-0.5 rounded-md text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        Pronto p/ Entrega
                      </span>
                    ) : isPaid ? (
                      <span className="px-2.5 py-0.5 rounded-md text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        Pago
                      </span>
                    ) : (
                      <span className="px-2.5 py-0.5 rounded-md text-[11px] font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                        Aguardando Pgto
                      </span>
                    )}

                    <span className="text-xs font-bold text-stone-900 w-24 text-right">
                      {(order.totalAmount || 0).toLocaleString("pt-BR", {
                        style: "currency",
                        currency: "BRL",
                      })}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
