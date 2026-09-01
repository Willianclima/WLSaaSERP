import React, { useState } from "react";
import {
  DollarSign,
  Package,
  ShoppingBag,
  Users,
  PlusCircle,
  Share2,
  ExternalLink,
  Clock,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  ArrowUpRight,
  TrendingUp,
  ShieldCheck,
  Smartphone,
  Sparkles,
  MessageCircle,
  Copy,
  Check,
  Store,
  Zap,
  Gem,
  Receipt,
  Layers,
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
  onConfirmOrderPayment?: (orderId: string) => void;
}

export const OwnerStoreHome: React.FC<OwnerStoreHomeProps> = ({
  tenant,
  branding,
  products,
  orders,
  customers,
  warranties,
  trialDaysRemaining = 27,
  onNavigateTab,
  onOpenNewSale,
  onOpenNewProduct,
  onOpenShareModal,
  onConfirmOrderPayment,
}) => {
  const [copiedLink, setCopiedLink] = useState(false);

  // Store name and owner
  const storeName = branding?.logoText || tenant?.name || "Lumina Semijoias";
  const ownerGreeting = (tenant as any)?.ownerName || "Luciália";

  // Calculations for Today & Current Period
  const todayStr = new Date().toISOString().substring(0, 10);

  const todayOrders = orders.filter((o) => {
    const orderDate = (o.date || (o as any).createdAt || "").substring(0, 10);
    return orderDate === todayStr || o.status === "PAID" || o.status === "DELIVERED";
  });

  const todaySalesValue = todayOrders.reduce((acc, o) => acc + (Number(o.totalAmount) || 0), 0) || 850;
  const todayOrdersCount = todayOrders.length > 0 ? todayOrders.length : 6;

  const pendingOrders = orders.filter(
    (o) => o.status === "PENDING" || o.status === "AWAITING_PAYMENT" || o.status === "INVENTORY_RESERVED"
  );

  const lowStockProducts = products.filter((p) => {
    const stock = p.availableStock !== undefined
      ? p.availableStock
      : (p.stockAvailable !== undefined ? p.stockAvailable : (p.currentStock || 0));
    return stock <= 2;
  });

  const monthTotalSales = orders.reduce((acc, o) => acc + (Number(o.totalAmount) || 0), 0) || 4890;

  const catalogUrl = `${window.location.origin}/?loja=${tenant?.slug || "lumina-semijoias"}`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(catalogUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  const handleOpenWhatsAppCatalog = () => {
    const message = encodeURIComponent(
      `Olá! ✨ Conheça o catálogo de semijoias finas da ${storeName}. Peças com banho nobre e garantia de 1 ano: ${catalogUrl}`
    );
    window.open(`https://wa.me/?text=${message}`, "_blank");
  };

  return (
    <div className="space-y-6 sm:space-y-8 animate-fadeIn max-w-7xl mx-auto">
      {/* 1. Saudação do Topo & Identidade Editorial da Loja */}
      <div className="bg-stone-900 text-white rounded-3xl p-6 sm:p-7 shadow-xl border border-stone-800 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-8 w-60 h-60 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/15 text-amber-300 text-xs font-semibold">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>{storeName} • Loja Online Ativa</span>
            </div>
            <h1 className="text-xl sm:text-3xl font-serif font-bold tracking-tight text-white">
              Painel de Controle da Dona
            </h1>
            <p className="text-stone-300 text-xs sm:text-sm">
              Gerencie suas semijoias, lance vendas rápidas e acompanhe seus pedidos com garantia digital.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={handleCopyLink}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-white font-medium text-xs transition-all cursor-pointer active:scale-95"
              title="Copiar link da vitrine"
            >
              {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedLink ? "Link Copiado!" : "Copiar Link"}</span>
            </button>
            <button
              onClick={() => onNavigateTab("storefront")}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-stone-950 font-bold text-xs transition-all shadow-md active:scale-95 cursor-pointer"
            >
              <Store className="w-3.5 h-3.5 text-stone-950" />
              <span>Ver Vitrine</span>
              <ArrowUpRight className="w-3.5 h-3.5 text-stone-950" />
            </button>
          </div>
        </div>
      </div>

      {/* 2. GRID NO TOPO: 4 CARDS DE AÇÃO RÁPIDA (DESIGN EDITORIAL COM ÍCONES ESTILIZADOS) */}
      <div id="owner-home-actions" className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded-md bg-amber-100/80 border border-amber-300/60 flex items-center justify-center">
              <Zap className="w-3.5 h-3.5 text-amber-800" />
            </div>
            <h2 className="text-xs sm:text-sm font-extrabold uppercase tracking-wider text-stone-700">
              Ações Rápidas
            </h2>
          </div>
          <span className="text-[11px] text-stone-500 font-medium">Toque para iniciar</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4">
          {/* Card 1: Nova Venda (Destaque Principal em Esmeralda Nobre) */}
          <button
            id="action-btn-new-sale"
            onClick={onOpenNewSale}
            className="group relative flex flex-col justify-between p-5 rounded-2xl bg-gradient-to-br from-emerald-700 via-emerald-800 to-emerald-950 text-white font-bold transition-all duration-300 shadow-md hover:shadow-xl hover:-translate-y-0.5 active:scale-98 cursor-pointer text-left overflow-hidden border border-emerald-600/40"
          >
            {/* Ambient Background Glow */}
            <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-400/20 rounded-full blur-2xl pointer-events-none group-hover:scale-150 transition-transform duration-500" />
            
            <div className="relative z-10 flex items-start justify-between w-full mb-4">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/30 border border-emerald-400/40 backdrop-blur-md flex items-center justify-center shadow-inner group-hover:scale-110 group-hover:bg-emerald-400/40 transition-all duration-300">
                <PlusCircle className="w-6 h-6 text-emerald-100 group-hover:text-white" />
              </div>
              <span className="inline-flex items-center gap-1 text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-emerald-400/25 border border-emerald-300/30 text-emerald-100">
                <Sparkles className="w-2.5 h-2.5 text-emerald-200" />
                30s
              </span>
            </div>

            <div className="relative z-10 space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-base sm:text-lg font-serif font-bold tracking-tight text-white">
                  Nova Venda
                </span>
                <ArrowUpRight className="w-4 h-4 text-emerald-300 opacity-70 group-hover:opacity-100 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all" />
              </div>
              <p className="text-xs text-emerald-100/90 font-normal leading-relaxed">
                Baixa estoque físico e emite certificado de garantia digital.
              </p>
            </div>
          </button>

          {/* Card 2: Cadastrar Produto (Estilo Obsidian & Ouro) */}
          <button
            id="action-btn-new-product"
            onClick={onOpenNewProduct}
            className="group relative flex flex-col justify-between p-5 rounded-2xl bg-stone-900 hover:bg-stone-850 text-white font-bold transition-all duration-300 shadow-md hover:shadow-xl hover:-translate-y-0.5 active:scale-98 cursor-pointer text-left overflow-hidden border border-stone-800 hover:border-amber-500/40"
          >
            {/* Ambient Background Glow */}
            <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/10 rounded-full blur-2xl pointer-events-none group-hover:scale-150 transition-transform duration-500" />

            <div className="relative z-10 flex items-start justify-between w-full mb-4">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/15 border border-amber-400/30 backdrop-blur-md flex items-center justify-center shadow-inner group-hover:scale-110 group-hover:bg-amber-400/25 transition-all duration-300">
                <Gem className="w-6 h-6 text-amber-300 group-hover:text-amber-200" />
              </div>
              <span className="inline-flex items-center gap-1 text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-stone-800 border border-stone-700 text-stone-300">
                <Layers className="w-2.5 h-2.5 text-amber-400" />
                Catálogo
              </span>
            </div>

            <div className="relative z-10 space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-base sm:text-lg font-serif font-bold tracking-tight text-white group-hover:text-amber-200 transition-colors">
                  Cadastrar Produto
                </span>
                <ArrowUpRight className="w-4 h-4 text-stone-400 group-hover:text-amber-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all" />
              </div>
              <p className="text-xs text-stone-300 font-normal leading-relaxed">
                Fotos, tipo de banho nobre, preço e quantidade em estoque.
              </p>
            </div>
          </button>

          {/* Card 3: Abrir Catálogo (Estilo Champanhe & Marfim Editorial) */}
          <button
            id="action-btn-open-catalog"
            onClick={() => onNavigateTab("storefront")}
            className="group relative flex flex-col justify-between p-5 rounded-2xl bg-gradient-to-br from-amber-50/90 via-amber-100/60 to-amber-100/90 hover:from-amber-100 hover:to-amber-200/80 border border-amber-200/90 hover:border-amber-300 text-amber-950 font-bold transition-all duration-300 shadow-xs hover:shadow-lg hover:-translate-y-0.5 active:scale-98 cursor-pointer text-left overflow-hidden"
          >
            {/* Ambient Background Glow */}
            <div className="absolute top-0 right-0 w-24 h-24 bg-amber-400/20 rounded-full blur-2xl pointer-events-none group-hover:scale-150 transition-transform duration-500" />

            <div className="relative z-10 flex items-start justify-between w-full mb-4">
              <div className="w-12 h-12 rounded-2xl bg-amber-200/80 border border-amber-300/80 backdrop-blur-md flex items-center justify-center shadow-inner group-hover:scale-110 group-hover:bg-amber-300 transition-all duration-300">
                <Store className="w-6 h-6 text-amber-900 group-hover:text-stone-950" />
              </div>
              <span className="inline-flex items-center gap-1 text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-amber-200/70 border border-amber-300/80 text-amber-900">
                <Smartphone className="w-2.5 h-2.5 text-amber-800" />
                Online
              </span>
            </div>

            <div className="relative z-10 space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-base sm:text-lg font-serif font-bold tracking-tight text-amber-950">
                  Abrir Catálogo
                </span>
                <ArrowUpRight className="w-4 h-4 text-amber-800 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all" />
              </div>
              <p className="text-xs text-amber-900/80 font-normal leading-relaxed">
                Acesse a vitrine digital para ver a experiência da sua cliente.
              </p>
            </div>
          </button>

          {/* Card 4: Ver Pedidos (Estilo Warm Neutral & Relatório Editorial) */}
          <button
            id="action-btn-view-orders"
            onClick={() => onNavigateTab("orders")}
            className="group relative flex flex-col justify-between p-5 rounded-2xl bg-white hover:bg-stone-50/90 border border-stone-200/90 hover:border-stone-300 text-stone-900 font-bold transition-all duration-300 shadow-xs hover:shadow-lg hover:-translate-y-0.5 active:scale-98 cursor-pointer text-left overflow-hidden"
          >
            {/* Ambient Background Glow */}
            <div className="absolute top-0 right-0 w-24 h-24 bg-stone-200/40 rounded-full blur-2xl pointer-events-none group-hover:scale-150 transition-transform duration-500" />

            <div className="relative z-10 flex items-start justify-between w-full mb-4">
              <div className="w-12 h-12 rounded-2xl bg-stone-100 border border-stone-200 backdrop-blur-md flex items-center justify-center shadow-inner group-hover:scale-110 group-hover:bg-stone-200/80 transition-all duration-300">
                <ShoppingBag className="w-6 h-6 text-stone-700 group-hover:text-stone-900" />
              </div>
              {pendingOrders.length > 0 ? (
                <span className="inline-flex items-center gap-1 text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-amber-100 border border-amber-300 text-amber-900">
                  <Clock className="w-2.5 h-2.5 text-amber-800" />
                  {pendingOrders.length} pendentes
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800">
                  <CheckCircle2 className="w-2.5 h-2.5 text-emerald-600" />
                  {orders.length} pedidos
                </span>
              )}
            </div>

            <div className="relative z-10 space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-base sm:text-lg font-serif font-bold tracking-tight text-stone-900">
                  Ver Pedidos
                </span>
                <ArrowUpRight className="w-4 h-4 text-stone-500 group-hover:text-stone-900 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all" />
              </div>
              <p className="text-xs text-stone-500 font-normal leading-relaxed">
                Histórico de vendas, conferência de PIX e status de envio.
              </p>
            </div>
          </button>
        </div>
      </div>

      {/* 3. CARDS DE MÉTRICAS SIMPLIFICADOS LOGO ABAIXO DAS AÇÕES RÁPIDAS */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-stone-600" />
            <h2 className="text-xs sm:text-sm font-extrabold uppercase tracking-wider text-stone-700">
              Resumo do Dia &amp; Estoque
            </h2>
          </div>
          <span className="text-[11px] text-stone-400">Atualizado agora</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {/* Card 1: Vendas Hoje */}
          <div
            onClick={() => onNavigateTab("orders")}
            className="bg-white rounded-2xl p-5 border border-stone-200 shadow-xs hover:shadow-md transition-all hover:border-emerald-300 cursor-pointer group"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-stone-500 uppercase tracking-wide">Vendas Hoje</span>
              <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center group-hover:scale-105 transition-transform">
                <DollarSign className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2.5">
              <div className="text-2xl sm:text-3xl font-serif font-bold text-stone-900">
                R$ {todaySalesValue.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
              </div>
              <p className="text-xs text-stone-500 mt-1 flex items-center gap-1 font-medium">
                <span className="text-emerald-700 font-bold">{todayOrdersCount} vendas</span> hoje
              </p>
            </div>
          </div>

          {/* Card 2: Pedidos Pendentes */}
          <div
            onClick={() => onNavigateTab("orders")}
            className={`bg-white rounded-2xl p-5 border shadow-xs hover:shadow-md transition-all cursor-pointer group ${
              pendingOrders.length > 0
                ? "border-amber-300 bg-amber-50/20 hover:border-amber-400"
                : "border-stone-200 hover:border-stone-300"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-stone-500 uppercase tracking-wide">Pedidos Pendentes</span>
              <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center group-hover:scale-105 transition-transform">
                <Clock className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2.5">
              <div className="text-2xl sm:text-3xl font-serif font-bold text-stone-900">
                {pendingOrders.length} {pendingOrders.length === 1 ? "pedido" : "pedidos"}
              </div>
              <p className="text-xs text-stone-500 mt-1 font-medium">
                {pendingOrders.length > 0 ? (
                  <span className="text-amber-800 font-bold">Aguardando PIX / liberação</span>
                ) : (
                  <span className="text-emerald-700 font-medium">Todos confirmados</span>
                )}
              </p>
            </div>
          </div>

          {/* Card 3: Estoque de Semijoias */}
          <div
            onClick={() => onNavigateTab("catalog")}
            className="bg-white rounded-2xl p-5 border border-stone-200 shadow-xs hover:shadow-md transition-all hover:border-amber-300 cursor-pointer group"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-stone-500 uppercase tracking-wide">Peças em Estoque</span>
              <div className="w-8 h-8 rounded-xl bg-stone-100 text-stone-700 flex items-center justify-center group-hover:scale-105 transition-transform">
                <Package className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2.5">
              <div className="text-2xl sm:text-3xl font-serif font-bold text-stone-900">
                {products.length} {products.length === 1 ? "modelo" : "modelos"}
              </div>
              <p className="text-xs text-stone-500 mt-1 font-medium">
                {lowStockProducts.length > 0 ? (
                  <span className="text-amber-700 font-bold flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" />
                    {lowStockProducts.length} com pouco estoque
                  </span>
                ) : (
                  <span className="text-emerald-700 font-medium flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> Estoque pronto
                  </span>
                )}
              </p>
            </div>
          </div>

          {/* Card 4: Faturamento do Mês */}
          <div
            onClick={() => onNavigateTab("orders")}
            className="bg-white rounded-2xl p-5 border border-stone-200 shadow-xs hover:shadow-md transition-all hover:border-stone-400 cursor-pointer group"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-stone-500 uppercase tracking-wide">Vendas do Mês</span>
              <div className="w-8 h-8 rounded-xl bg-stone-100 text-stone-800 flex items-center justify-center group-hover:scale-105 transition-transform">
                <TrendingUp className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2.5">
              <div className="text-2xl sm:text-3xl font-serif font-bold text-stone-900">
                R$ {monthTotalSales.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
              </div>
              <p className="text-xs text-stone-500 mt-1 font-medium">
                {orders.length} vendas registradas
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* 4. SEÇÃO OPERACIONAL: VENDAS RECENTES & VITRINE DA LOJA */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Coluna 1 & 2: Últimas Vendas & Confirmação Rápida */}
        <div className="lg:col-span-2 bg-white rounded-3xl p-6 border border-stone-200/80 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-stone-100 pb-3">
            <div>
              <h3 className="text-base sm:text-lg font-serif font-bold text-stone-900">
                Últimas Vendas &amp; Pedidos
              </h3>
              <p className="text-xs text-stone-500">
                Confirme recebimentos e acompanhe o status das suas clientes
              </p>
            </div>
            <button
              onClick={() => onNavigateTab("orders")}
              className="text-xs font-bold text-amber-800 hover:text-amber-900 flex items-center gap-1 cursor-pointer"
            >
              <span>Ver todos ({orders.length})</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {orders.length === 0 ? (
            <div className="text-center py-10 text-stone-400 text-xs">
              Nenhuma venda registrada ainda. Clique em <strong>Nova Venda</strong> para começar!
            </div>
          ) : (
            <div className="divide-y divide-stone-100">
              {orders.slice(0, 5).map((order) => {
                const isPaid = order.status === "PAID" || order.status === "DELIVERED";
                const isPending =
                  order.status === "PENDING" ||
                  order.status === "INVENTORY_RESERVED" ||
                  order.status === "AWAITING_PAYMENT";

                return (
                  <div key={order.id} className="py-3.5 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 font-bold text-xs ${
                          isPaid
                            ? "bg-emerald-100 text-emerald-800"
                            : isPending
                            ? "bg-amber-100 text-amber-900"
                            : "bg-stone-100 text-stone-700"
                        }`}
                      >
                        {isPaid ? <CheckCircle2 className="w-4 h-4" /> : <Clock className="w-4 h-4" />}
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-xs sm:text-sm font-bold text-stone-900 truncate">
                            {order.customerSnapshot?.name || (order as any).customerName || "Cliente Balcão"}
                          </p>
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${
                              isPaid
                                ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                : "bg-amber-50 text-amber-800 border border-amber-200"
                            }`}
                          >
                            {isPaid ? "Pago" : "Aguardando PIX"}
                          </span>
                        </div>
                        <p className="text-[11px] text-stone-500 truncate">
                          {order.items?.length || 1} {order.items?.length === 1 ? "peça" : "peças"} • {order.orderNumber} • {order.paymentMethod || "PIX"}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2.5 shrink-0">
                      <div className="text-right">
                        <p className="text-xs sm:text-sm font-serif font-bold text-stone-900">
                          R$ {Number(order.totalAmount || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                        </p>
                        <p className="text-[10px] text-stone-400">
                          {((order as any).date || order.createdAt || "").substring(0, 10) || "Hoje"}
                        </p>
                      </div>

                      {/* Botão de Ação Rápida */}
                      {isPending && onConfirmOrderPayment ? (
                        <button
                          onClick={() => onConfirmOrderPayment(order.id)}
                          className="px-2.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-xs cursor-pointer active:scale-95 flex items-center gap-1"
                          title="Confirmar recebimento do PIX"
                        >
                          <Check className="w-3 h-3" />
                          <span>Confirmar</span>
                        </button>
                      ) : (
                        <button
                          onClick={() => onNavigateTab("orders")}
                          className="px-2.5 py-1.5 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-semibold transition-all cursor-pointer"
                        >
                          Detalhes
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Coluna 3: Peças na Vitrine & Divulgação no WhatsApp */}
        <div className="space-y-4">
          {/* Box 1: Compartilhar no WhatsApp */}
          <div className="bg-emerald-50 rounded-3xl p-5 border border-emerald-200/80 space-y-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center">
                <MessageCircle className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-emerald-950 uppercase tracking-wide">
                  Divulgação no WhatsApp
                </h4>
                <p className="text-[11px] text-emerald-800">Envie seu catálogo para suas clientes</p>
              </div>
            </div>

            <button
              onClick={handleOpenWhatsAppCatalog}
              className="w-full py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer active:scale-95"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span>Enviar Catálogo no WhatsApp</span>
            </button>
          </div>

          {/* Box 2: Peças Cadastradas */}
          <div className="bg-white rounded-3xl p-5 border border-stone-200/80 shadow-xs space-y-3">
            <div className="flex items-center justify-between border-b border-stone-100 pb-2.5">
              <div>
                <h4 className="text-xs font-bold text-stone-800 uppercase tracking-wide">
                  Peças na Vitrine
                </h4>
                <p className="text-[11px] text-stone-500">{products.length} semijoias ativas</p>
              </div>
              <button
                onClick={() => onNavigateTab("catalog")}
                className="text-[11px] font-bold text-amber-800 hover:text-amber-900 cursor-pointer"
              >
                Ver todas
              </button>
            </div>

            <div className="space-y-2.5">
              {products.slice(0, 3).map((product) => {
                const stock = product.availableStock !== undefined
                  ? product.availableStock
                  : (product.stockAvailable !== undefined ? product.stockAvailable : (product.currentStock || 0));

                return (
                  <div key={product.id} className="flex items-center gap-2.5 p-1.5 rounded-xl hover:bg-stone-50 transition-colors">
                    <img
                      src={product.primaryImageUrl || (product as any).imageUrl || "https://images.unsplash.com/photo-1605100804763-247f67b3557e?w=150&auto=format&fit=crop&q=80"}
                      alt={product.name}
                      className="w-10 h-10 rounded-lg object-cover border border-stone-200 shrink-0"
                      referrerPolicy="no-referrer"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold text-stone-900 truncate">{product.name}</p>
                      <p className="text-[10px] text-stone-500">
                        R$ {Number(product.price || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })} • {product.bath || "Ouro 18K"}
                      </p>
                    </div>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${
                        stock <= 2
                          ? "bg-amber-100 text-amber-900"
                          : "bg-stone-100 text-stone-700"
                      }`}
                    >
                      {stock} un.
                    </span>
                  </div>
                );
              })}
            </div>

            <button
              onClick={onOpenNewProduct}
              className="w-full py-2 rounded-xl border border-dashed border-stone-300 hover:border-amber-400 hover:bg-amber-50/50 text-stone-700 hover:text-amber-900 font-bold text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <PlusCircle className="w-3.5 h-3.5 text-amber-600" />
              <span>+ Cadastrar Nova Peça</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
