import React, { useState } from "react";
import {
  ShoppingBag,
  Package,
  Users,
  AlertTriangle,
  Zap,
  PlusCircle,
  Eye,
  Store,
  UserPlus,
  CheckCircle2,
  Clock,
  ArrowRight,
  ExternalLink,
  Copy,
  Check,
  MessageCircle,
  Sparkles,
} from "lucide-react";
import {
  TenantStore,
  ProductItem,
  UnifiedOrder,
  Customer,
  DigitalWarranty,
  StoreBrandingConfig,
  RBACUser,
} from "../types";

interface OwnerStoreHomeProps {
  tenant: TenantStore;
  branding: StoreBrandingConfig;
  products: ProductItem[];
  orders: UnifiedOrder[];
  customers: Customer[];
  warranties: DigitalWarranty[];
  currentUser?: RBACUser;
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
  products = [],
  orders = [],
  customers = [],
  currentUser,
  onNavigateTab,
  onOpenNewSale,
  onOpenNewProduct,
  onOpenShareModal,
  onOpenNewCustomer,
  onConfirmOrderPayment,
}) => {
  const [copiedLink, setCopiedLink] = useState(false);

  // 1. Saudação personalizada com o primeiro nome da lojista
  const ownerName = currentUser?.name ? currentUser.name.split(" ")[0] : "Maria";

  // 2. Cálculos 100% derivados dos dados reais
  const paidOrders = orders.filter(
    (o) =>
      o.status === "PAID" ||
      o.status === "COMPLETED" ||
      o.paymentStatus === "PAID" ||
      o.paymentStatus === "CONFIRMADO"
  );

  const totalSalesRevenue = paidOrders.reduce(
    (sum, o) => sum + Number(o.totalAmount || 0),
    0
  );

  const formattedSalesRevenue = totalSalesRevenue.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });

  // Total de peças físicas em estoque somando os produtos
  const totalStockPieces = products.reduce((sum, p) => {
    const qty = Number(p.stockAvailable ?? p.stockPhysical ?? (p as any).stock ?? 0);
    return sum + (isNaN(qty) ? 0 : qty);
  }, 0);

  // Pedidos aguardando pagamento
  const pendingPaymentOrders = orders.filter(
    (o) =>
      o.status === "PENDING" ||
      o.status === "AWAITING_PAYMENT" ||
      o.status === "INVENTORY_RESERVED" ||
      o.paymentStatus === "PENDING" ||
      o.paymentStatus === "AGUARDANDO_PAGAMENTO"
  );

  // Produtos com estoque baixo (limiar padrão <= 3 unidades)
  const lowStockProducts = products.filter((p) => {
    const qty = Number(p.stockAvailable ?? p.stockPhysical ?? (p as any).stock ?? 0);
    const minAlert = Number(p.minStockAlert ?? 3);
    return qty > 0 && qty <= minAlert;
  });

  // Produtos esgotados (0 unidades)
  const outOfStockProducts = products.filter((p) => {
    const qty = Number(p.stockAvailable ?? p.stockPhysical ?? (p as any).stock ?? 0);
    return qty <= 0;
  });

  const handleCopyLink = () => {
    const url = `${window.location.origin}/#storefront`;
    navigator.clipboard.writeText(url);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto animate-fadeIn pb-12 font-sans select-none">
      {/* ========================================================================= */}
      {/* 1. TELA INICIAL DA CLIENTE: SAUDAÇÃO E STATUS DA LOJA                     */}
      {/* ========================================================================= */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-stone-200/90 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-serif font-bold text-stone-900 tracking-tight flex items-center gap-2">
            <span>Olá, {ownerName}</span>
            <span>👋</span>
          </h1>
          <div className="flex items-center gap-2 mt-1.5">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
            </span>
            <p className="text-xs sm:text-sm text-stone-600 font-medium">
              Sua loja está funcionando normalmente
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => onNavigateTab("myStore")}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-900 text-xs font-bold border border-amber-200 transition-all cursor-pointer"
          >
            <Store className="w-3.5 h-3.5 text-amber-700" />
            <span>Minha Loja</span>
          </button>

          <button
            onClick={handleCopyLink}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white hover:bg-stone-50 text-stone-700 text-xs font-semibold border border-stone-200 shadow-2xs transition-all cursor-pointer"
            title="Copiar link público do catálogo"
          >
            {copiedLink ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-600" />
                <span className="text-emerald-700 font-bold">Copiado!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5 text-stone-500" />
                <span>Copiar Link</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. OS 3 CARDS ESSENCIAIS: VENDAS, ESTOQUE, CLIENTES                       */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Card 1: 💰 VENDAS */}
        <div
          onClick={() => onNavigateTab("orders")}
          className="bg-white rounded-3xl p-6 border border-stone-200/90 shadow-xs hover:border-amber-300 hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-extrabold uppercase tracking-wider text-stone-500 flex items-center gap-1.5">
              <span>💰</span>
              <span>Vendas</span>
            </span>
            <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
              {paidOrders.length} pedido(s)
            </span>
          </div>
          <div className="mt-4">
            <div className="text-3xl font-extrabold text-stone-900 tracking-tight">
              {paidOrders.length}
            </div>
            <div className="text-xs font-medium text-stone-500 mt-1">
              Total faturado: <span className="font-bold text-stone-900">{formattedSalesRevenue}</span>
            </div>
          </div>
        </div>

        {/* Card 2: 📦 ESTOQUE */}
        <div
          onClick={() => onNavigateTab("inventory")}
          className="bg-white rounded-3xl p-6 border border-stone-200/90 shadow-xs hover:border-amber-300 hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-extrabold uppercase tracking-wider text-stone-500 flex items-center gap-1.5">
              <span>📦</span>
              <span>Estoque</span>
            </span>
            <span className="text-[11px] font-bold text-stone-600 bg-stone-100 px-2 py-0.5 rounded-full">
              {products.length} modelo(s)
            </span>
          </div>
          <div className="mt-4">
            <div className="text-3xl font-extrabold text-stone-900 tracking-tight">
              {totalStockPieces} <span className="text-sm font-normal text-stone-400">peças</span>
            </div>
            <div className="text-xs font-medium text-stone-500 mt-1">
              Prontas para pronta entrega no showroom
            </div>
          </div>
        </div>

        {/* Card 3: 👥 CLIENTES */}
        <div
          onClick={() => onNavigateTab("customers")}
          className="bg-white rounded-3xl p-6 border border-stone-200/90 shadow-xs hover:border-amber-300 hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-extrabold uppercase tracking-wider text-stone-500 flex items-center gap-1.5">
              <span>👥</span>
              <span>Clientes</span>
            </span>
            <span className="text-[11px] font-bold text-stone-600 bg-stone-100 px-2 py-0.5 rounded-full">
              Cadastrados
            </span>
          </div>
          <div className="mt-4">
            <div className="text-3xl font-extrabold text-stone-900 tracking-tight">
              {customers.length || 1}
            </div>
            <div className="text-xs font-medium text-stone-500 mt-1">
              Base de clientes fidelizadas na loja
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 3. ⚡ AÇÕES RÁPIDAS (DIRETAS, GRANDES E SEM FRICÇÃO)                       */}
      {/* ========================================================================= */}
      <div className="bg-white rounded-3xl p-6 sm:p-7 border border-stone-200/90 shadow-xs">
        <h2 className="text-xs font-bold uppercase tracking-wider text-stone-500 mb-4 flex items-center gap-1.5">
          <Zap className="w-4 h-4 text-amber-500" />
          <span>Ações Rápidas</span>
        </h2>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
          {/* Botão 1: [+ Nova peça] */}
          <button
            onClick={onOpenNewProduct}
            className="flex flex-col items-center justify-center p-4 rounded-2xl bg-amber-50/70 hover:bg-amber-100/90 border border-amber-200/80 text-amber-950 font-bold transition-all hover:scale-102 active:scale-98 cursor-pointer shadow-2xs group text-center"
          >
            <div className="w-10 h-10 rounded-xl bg-amber-500 text-stone-950 flex items-center justify-center mb-2 shadow-xs group-hover:scale-110 transition-transform">
              <PlusCircle className="w-5 h-5 stroke-[2.5]" />
            </div>
            <span className="text-xs font-bold">+ Nova peça</span>
            <span className="text-[10px] text-amber-800 font-normal mt-0.5">Cadastrar na vitrine</span>
          </button>

          {/* Botão 2: [Ver pedidos] */}
          <button
            onClick={() => onNavigateTab("orders")}
            className="flex flex-col items-center justify-center p-4 rounded-2xl bg-stone-50 hover:bg-stone-100 border border-stone-200 text-stone-800 font-bold transition-all hover:scale-102 active:scale-98 cursor-pointer shadow-2xs group text-center"
          >
            <div className="w-10 h-10 rounded-xl bg-stone-900 text-white flex items-center justify-center mb-2 shadow-xs group-hover:scale-110 transition-transform">
              <ShoppingBag className="w-5 h-5" />
            </div>
            <span className="text-xs font-bold">Ver pedidos</span>
            <span className="text-[10px] text-stone-500 font-normal mt-0.5">
              {orders.length} pedido(s)
            </span>
          </button>

          {/* Botão 3: [Meu catálogo] */}
          <button
            onClick={() => onNavigateTab("myStore")}
            className="flex flex-col items-center justify-center p-4 rounded-2xl bg-stone-50 hover:bg-stone-100 border border-stone-200 text-stone-800 font-bold transition-all hover:scale-102 active:scale-98 cursor-pointer shadow-2xs group text-center"
          >
            <div className="w-10 h-10 rounded-xl bg-stone-900 text-amber-300 flex items-center justify-center mb-2 shadow-xs group-hover:scale-110 transition-transform">
              <Store className="w-5 h-5" />
            </div>
            <span className="text-xs font-bold">Meu catálogo</span>
            <span className="text-[10px] text-stone-500 font-normal mt-0.5">Link e redes sociais</span>
          </button>

          {/* Botão 4: [Novo cliente] */}
          <button
            onClick={() => (onOpenNewCustomer ? onOpenNewCustomer() : onNavigateTab("customers"))}
            className="flex flex-col items-center justify-center p-4 rounded-2xl bg-stone-50 hover:bg-stone-100 border border-stone-200 text-stone-800 font-bold transition-all hover:scale-102 active:scale-98 cursor-pointer shadow-2xs group text-center"
          >
            <div className="w-10 h-10 rounded-xl bg-stone-900 text-emerald-400 flex items-center justify-center mb-2 shadow-xs group-hover:scale-110 transition-transform">
              <UserPlus className="w-5 h-5" />
            </div>
            <span className="text-xs font-bold">Novo cliente</span>
            <span className="text-[10px] text-stone-500 font-normal mt-0.5">Cadastrar contato</span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 4. 🔔 ATENÇÃO: PEDIDOS AGUARDANDO PAGAMENTO E ESTOQUE BAIXO               */}
      {/* ========================================================================= */}
      <div className="bg-white rounded-3xl p-6 sm:p-7 border border-stone-200/90 shadow-xs">
        <h2 className="text-xs font-bold uppercase tracking-wider text-stone-500 mb-4 flex items-center gap-1.5">
          <AlertTriangle className="w-4 h-4 text-amber-500" />
          <span>Atenção</span>
        </h2>

        <div className="space-y-3">
          {/* Alerta 1: Pedidos aguardando pagamento */}
          {pendingPaymentOrders.length > 0 ? (
            <div className="p-4 rounded-2xl bg-amber-50/80 border border-amber-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-amber-400/20 text-amber-900 flex items-center justify-center shrink-0">
                  <Clock className="w-5 h-5 text-amber-700" />
                </div>
                <div>
                  <div className="text-xs sm:text-sm font-bold text-stone-900">
                    {pendingPaymentOrders.length}{" "}
                    {pendingPaymentOrders.length === 1 ? "pedido aguardando" : "pedidos aguardando"} pagamento
                  </div>
                  <div className="text-[11px] text-stone-600">
                    Peças reservadas com segurança no estoque. Confirme o recebimento para emitir a garantia.
                  </div>
                </div>
              </div>

              <button
                onClick={() => onNavigateTab("orders")}
                className="px-3.5 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shadow-2xs transition-all shrink-0 cursor-pointer self-start sm:self-auto"
              >
                Ver pedidos
              </button>
            </div>
          ) : null}

          {/* Alerta 2: Produtos com estoque baixo */}
          {lowStockProducts.length > 0 ? (
            <div className="p-4 rounded-2xl bg-orange-50/80 border border-orange-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-orange-400/20 text-orange-900 flex items-center justify-center shrink-0">
                  <Package className="w-5 h-5 text-orange-700" />
                </div>
                <div>
                  <div className="text-xs sm:text-sm font-bold text-stone-900">
                    {lowStockProducts.length}{" "}
                    {lowStockProducts.length === 1 ? "produto com estoque baixo" : "produtos com estoque baixo"}
                  </div>
                  <div className="text-[11px] text-stone-600">
                    {lowStockProducts.slice(0, 2).map((p) => p.name).join(", ")}
                    {lowStockProducts.length > 2 ? ` e mais ${lowStockProducts.length - 2}` : ""} (menos de 3 unidades restantes).
                  </div>
                </div>
              </div>

              <button
                onClick={() => onNavigateTab("inventory")}
                className="px-3.5 py-1.5 rounded-xl bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold shadow-2xs transition-all shrink-0 cursor-pointer self-start sm:self-auto"
              >
                Repor estoque
              </button>
            </div>
          ) : null}

          {/* Alerta 3: Se não houver pendências urgentes */}
          {pendingPaymentOrders.length === 0 && lowStockProducts.length === 0 ? (
            <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-200/80 flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div className="text-xs sm:text-sm text-stone-700 font-medium">
                Tudo em dia! Nenhum pedido aguardando pagamento e o estoque está equilibrado. ✨
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
};

export default OwnerStoreHome;
