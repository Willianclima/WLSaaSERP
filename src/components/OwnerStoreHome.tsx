import React from "react";
import {
  Calendar,
  ChevronDown,
  Plus,
  ShoppingBag,
  Package,
  Gem,
  AlertCircle,
  Tag,
  BookOpen,
  MessageCircle,
  ChevronRight,
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
}) => {
  // Recent orders matching wireframe #ORD-1025 to #ORD-1022
  const recentOrders = [
    {
      id: "ord-1025",
      orderCode: "#ORD-1025",
      customer: "Maria Fernanda",
      date: "24/05 10:30",
      status: "Pago",
      statusVariant: "pago",
      total: "R$ 398,00",
      phone: "11998887766",
    },
    {
      id: "ord-1024",
      orderCode: "#ORD-1024",
      customer: "Amanda Costa",
      date: "24/05 09:15",
      status: "Pendente",
      statusVariant: "pendente",
      total: "R$ 289,90",
      phone: "11988776655",
    },
    {
      id: "ord-1023",
      orderCode: "#ORD-1023",
      customer: "Beatriz Lima",
      date: "23/05 16:40",
      status: "Pago",
      statusVariant: "pago",
      total: "R$ 459,00",
      phone: "11977665544",
    },
    {
      id: "ord-1022",
      orderCode: "#ORD-1022",
      customer: "Juliana Alves",
      date: "23/05 14:20",
      status: "Pago",
      statusVariant: "pago",
      total: "R$ 329,90",
      phone: "11966554433",
    },
  ];

  return (
    <div className="space-y-6 max-w-6xl mx-auto animate-fadeIn pb-12 font-sans">
      {/* ========================================================================= */}
      {/* HEADER: Olá, Juliana! 👋 + Date Selector + "+ Novo Pedido" Button        */}
      {/* ========================================================================= */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-stone-900 tracking-tight flex items-center gap-2">
            <span>Olá, Juliana!</span>
            <span>👋</span>
          </h1>
          <p className="text-xs sm:text-sm text-stone-500 mt-0.5">
            Resumo geral da sua loja
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          {/* Date Picker Pill */}
          <button className="flex items-center gap-2 px-3.5 py-2 bg-white border border-stone-200 rounded-xl text-xs font-semibold text-stone-700 hover:bg-stone-50 transition-colors shadow-2xs cursor-pointer">
            <Calendar className="w-3.5 h-3.5 text-stone-500" />
            <span>Hoje, 24 de Maio</span>
            <ChevronDown className="w-3 h-3 text-stone-400 ml-1" />
          </button>

          {/* + Novo Pedido (Gold/Amber CTA) */}
          <button
            onClick={onOpenNewSale}
            className="flex items-center gap-1.5 px-4 py-2 bg-[#C88A2C] hover:bg-[#B37822] text-white text-xs font-bold rounded-xl shadow-xs transition-all active:scale-98 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Novo Pedido</span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 4 STAT METRIC CARDS (2x2 GRID)                                            */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: 12 Pedidos hoje / R$ 4.680,00 */}
        <div
          onClick={() => onNavigateTab("orders")}
          className="bg-white rounded-2xl p-4.5 border border-stone-200/90 shadow-2xs hover:shadow-xs hover:border-emerald-300 transition-all cursor-pointer group"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
              <ShoppingBag className="w-5 h-5" />
            </div>
            <div>
              <div className="text-2xl font-bold text-stone-900 leading-tight">
                12
              </div>
              <div className="text-xs text-stone-500 font-medium">
                Pedidos hoje
              </div>
            </div>
          </div>
          <div className="mt-2.5 text-xs font-bold text-stone-700">
            R$ 4.680,00
          </div>
        </div>

        {/* Card 2: 8 Pedidos pendentes / R$ 2.350,00 */}
        <div
          onClick={() => onNavigateTab("orders")}
          className="bg-white rounded-2xl p-4.5 border border-stone-200/90 shadow-2xs hover:shadow-xs hover:border-purple-300 transition-all cursor-pointer group"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
              <ShoppingBag className="w-5 h-5" />
            </div>
            <div>
              <div className="text-2xl font-bold text-stone-900 leading-tight">
                8
              </div>
              <div className="text-xs text-stone-500 font-medium">
                Pedidos pendentes
              </div>
            </div>
          </div>
          <div className="mt-2.5 text-xs font-bold text-stone-700">
            R$ 2.350,00
          </div>
        </div>

        {/* Card 3: 24 Produtos ativos / Ver catálogo */}
        <div
          onClick={() => onNavigateTab("catalog")}
          className="bg-white rounded-2xl p-4.5 border border-stone-200/90 shadow-2xs hover:shadow-xs hover:border-teal-300 transition-all cursor-pointer group"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center shrink-0">
              <Gem className="w-5 h-5" />
            </div>
            <div>
              <div className="text-2xl font-bold text-stone-900 leading-tight">
                24
              </div>
              <div className="text-xs text-stone-500 font-medium">
                Produtos ativos
              </div>
            </div>
          </div>
          <div className="mt-2.5 text-xs font-semibold text-teal-700 group-hover:underline">
            Ver catálogo
          </div>
        </div>

        {/* Card 4: 3 Estoque baixo / Ver alertas */}
        <div
          onClick={() => onNavigateTab("inventory")}
          className="bg-white rounded-2xl p-4.5 border border-stone-200/90 shadow-2xs hover:shadow-xs hover:border-amber-300 transition-all cursor-pointer group"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
              <AlertCircle className="w-5 h-5" />
            </div>
            <div>
              <div className="text-2xl font-bold text-stone-900 leading-tight">
                3
              </div>
              <div className="text-xs text-stone-500 font-medium">
                Estoque baixo
              </div>
            </div>
          </div>
          <div className="mt-2.5 text-xs font-semibold text-amber-700 group-hover:underline">
            Ver alertas
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* PEDIDOS RECENTES                                                          */}
      {/* ========================================================================= */}
      <div className="bg-white rounded-2xl border border-stone-200/90 shadow-2xs overflow-hidden">
        <div className="px-5 py-4 border-b border-stone-100 flex items-center justify-between">
          <h2 className="text-sm font-bold text-stone-900">
            Pedidos recentes
          </h2>
          <button
            onClick={() => onNavigateTab("orders")}
            className="text-xs font-semibold text-stone-500 hover:text-stone-900 transition-colors cursor-pointer"
          >
            Ver todos
          </button>
        </div>

        <div className="divide-y divide-stone-100">
          {recentOrders.map((order) => (
            <div
              key={order.id}
              className="px-5 py-3.5 flex items-center justify-between gap-4 hover:bg-stone-50/70 transition-colors"
            >
              {/* Order code & Client */}
              <div className="flex items-center gap-4 min-w-0">
                <span className="text-xs font-bold text-stone-900 shrink-0">
                  {order.orderCode}
                </span>
                <span className="text-xs text-stone-700 truncate">
                  {order.customer}
                </span>
              </div>

              {/* Date, Status pill, Total amount */}
              <div className="flex items-center gap-4 sm:gap-6 shrink-0">
                <span className="text-xs text-stone-400 hidden sm:inline">
                  {order.date}
                </span>

                {/* Status badge */}
                <span
                  className={`px-2.5 py-0.5 rounded-md text-[11px] font-semibold ${
                    order.statusVariant === "pago"
                      ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                      : "bg-amber-50 text-amber-700 border border-amber-200"
                  }`}
                >
                  {order.status}
                </span>

                <span className="text-xs font-bold text-stone-900 w-20 text-right">
                  {order.total}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* AÇÕES RÁPIDAS (4 CARDS)                                                   */}
      {/* ========================================================================= */}
      <div className="space-y-3">
        <h2 className="text-sm font-bold text-stone-900">
          Ações rápidas
        </h2>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {/* Card 1: Novo Pedido */}
          <button
            onClick={onOpenNewSale}
            className="bg-white p-4 rounded-2xl border border-stone-200/90 shadow-2xs hover:shadow-xs hover:border-stone-400 transition-all flex flex-col items-center justify-center gap-2 cursor-pointer group"
          >
            <div className="w-9 h-9 rounded-xl bg-stone-50 text-stone-700 group-hover:bg-amber-50 group-hover:text-amber-700 flex items-center justify-center transition-colors">
              <ShoppingBag className="w-4.5 h-4.5" />
            </div>
            <span className="text-xs font-bold text-stone-800">
              Novo Pedido
            </span>
          </button>

          {/* Card 2: Novo Produto */}
          <button
            onClick={onOpenNewProduct}
            className="bg-white p-4 rounded-2xl border border-stone-200/90 shadow-2xs hover:shadow-xs hover:border-stone-400 transition-all flex flex-col items-center justify-center gap-2 cursor-pointer group"
          >
            <div className="w-9 h-9 rounded-xl bg-stone-50 text-stone-700 group-hover:bg-amber-50 group-hover:text-amber-700 flex items-center justify-center transition-colors">
              <Tag className="w-4.5 h-4.5" />
            </div>
            <span className="text-xs font-bold text-stone-800">
              Novo Produto
            </span>
          </button>

          {/* Card 3: Catálogo Online */}
          <button
            onClick={() => onNavigateTab("storefront")}
            className="bg-white p-4 rounded-2xl border border-stone-200/90 shadow-2xs hover:shadow-xs hover:border-stone-400 transition-all flex flex-col items-center justify-center gap-2 cursor-pointer group"
          >
            <div className="w-9 h-9 rounded-xl bg-stone-50 text-stone-700 group-hover:bg-amber-50 group-hover:text-amber-700 flex items-center justify-center transition-colors">
              <BookOpen className="w-4.5 h-4.5" />
            </div>
            <span className="text-xs font-bold text-stone-800">
              Catálogo Online
            </span>
          </button>

          {/* Card 4: Enviar Mensagem */}
          <button
            onClick={onOpenShareModal}
            className="bg-white p-4 rounded-2xl border border-stone-200/90 shadow-2xs hover:shadow-xs hover:border-stone-400 transition-all flex flex-col items-center justify-center gap-2 cursor-pointer group"
          >
            <div className="w-9 h-9 rounded-xl bg-stone-50 text-stone-700 group-hover:bg-emerald-50 group-hover:text-emerald-700 flex items-center justify-center transition-colors">
              <MessageCircle className="w-4.5 h-4.5" />
            </div>
            <span className="text-xs font-bold text-stone-800">
              Enviar Mensagem
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};
