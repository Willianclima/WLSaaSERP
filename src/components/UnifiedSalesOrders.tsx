import React, { useState } from "react";
import {
  ShoppingBag,
  Search,
  Filter,
  ShieldCheck,
  Send,
  Users,
  Store,
  RefreshCw,
  Eye,
  CheckCircle2,
  Clock,
  ArrowUpRight,
  Package,
  Plus,
  Truck,
  CreditCard,
  Building2,
  User,
  Check,
  AlertCircle,
  FileSpreadsheet,
  QrCode,
  DollarSign,
} from "lucide-react";
import {
  Order,
  OrderStatus,
  OrderChannel,
  ProductItem,
  Customer,
  Reseller,
  CreateOrderDTO,
  OrderTransitionDTO,
} from "../types";
import { OrderCreationModal } from "./orders/OrderCreationModal";
import { OrderDetailDrawer } from "./orders/OrderDetailDrawer";
import confetti from "canvas-confetti";

interface UnifiedSalesOrdersProps {
  orders: Order[];
  products?: ProductItem[];
  customers?: Customer[];
  resellers?: Reseller[];
  onIssueWarrantyFromOrder: (order: any) => void;
  onRefreshData?: () => Promise<void>;
}

const STATUS_FILTERS: Array<{ key: string; label: string; count?: number }> = [
  { key: "TODOS", label: "Todos os Pedidos" },
  { key: "DRAFT", label: "Rascunhos" },
  { key: "INVENTORY_RESERVED", label: "Estoque Reservado" },
  { key: "AWAITING_PAYMENT", label: "Aguardando Pgto" },
  { key: "PAID", label: "Pagos & Faturados" },
  { key: "FULFILLMENT_PENDING", label: "Em Separação" },
  { key: "FULFILLED", label: "Entregues" },
  { key: "CANCELED", label: "Cancelados" },
  { key: "REFUNDED", label: "Estornados" },
];

const CHANNEL_BADGES: Record<string, { label: string; bg: string; text: string; border: string }> = {
  ECOMMERCE: { label: "Loja Virtual", bg: "bg-amber-50", text: "text-amber-900", border: "border-amber-200" },
  PRESENTIAL_POS: { label: "PDV Showroom", bg: "bg-purple-50", text: "text-purple-900", border: "border-purple-200" },
  WHATSAPP: { label: "WhatsApp VIP", bg: "bg-emerald-50", text: "text-emerald-900", border: "border-emerald-200" },
  B2B_RESELLER: { label: "B2B Atacado", bg: "bg-sky-50", text: "text-sky-900", border: "border-sky-200" },
  CONSIGNMENT: { label: "Consignação", bg: "bg-indigo-50", text: "text-indigo-900", border: "border-indigo-200" },
  CUSTOM_STUDIO: { label: "Studio Custom", bg: "bg-pink-50", text: "text-pink-900", border: "border-pink-200" },
  MARKETPLACE: { label: "Marketplace", bg: "bg-stone-100", text: "text-stone-800", border: "border-stone-200" },
  LOJA_WEB: { label: "Loja Virtual", bg: "bg-amber-50", text: "text-amber-900", border: "border-amber-200" },
  REVENDEDORA: { label: "Revendedora", bg: "bg-sky-50", text: "text-sky-900", border: "border-sky-200" },
};

const STATUS_BADGES: Record<string, { label: string; bg: string; text: string; border: string }> = {
  DRAFT: { label: "Rascunho", bg: "bg-stone-100", text: "text-stone-700", border: "border-stone-200" },
  INVENTORY_RESERVED: { label: "Estoque Reservado", bg: "bg-amber-50", text: "text-amber-800", border: "border-amber-200" },
  AWAITING_PAYMENT: { label: "Aguardando Pgto", bg: "bg-orange-50", text: "text-orange-800", border: "border-orange-200" },
  PAYMENT_PROCESSING: { label: "Processando", bg: "bg-blue-50", text: "text-blue-800", border: "border-blue-200" },
  PAID: { label: "Pago & Faturado", bg: "bg-emerald-50", text: "text-emerald-800", border: "border-emerald-200" },
  PAGO: { label: "Pago", bg: "bg-emerald-50", text: "text-emerald-800", border: "border-emerald-200" },
  FULFILLMENT_PENDING: { label: "Em Separação", bg: "bg-purple-50", text: "text-purple-800", border: "border-purple-200" },
  EM_PREPARACAO: { label: "Em Separação", bg: "bg-purple-50", text: "text-purple-800", border: "border-purple-200" },
  FULFILLED: { label: "Entregue", bg: "bg-teal-50", text: "text-teal-800", border: "border-teal-200" },
  ENTREGUE: { label: "Entregue", bg: "bg-teal-50", text: "text-teal-800", border: "border-teal-200" },
  CANCELED: { label: "Cancelado", bg: "bg-rose-50", text: "text-rose-800", border: "border-rose-200" },
  CANCELADO: { label: "Cancelado", bg: "bg-rose-50", text: "text-rose-800", border: "border-rose-200" },
  REFUNDED: { label: "Estornado", bg: "bg-red-100", text: "text-red-900", border: "border-red-300" },
  EXPIRED: { label: "TTL Expirado", bg: "bg-stone-200", text: "text-stone-700", border: "border-stone-300" },
};

export const UnifiedSalesOrders: React.FC<UnifiedSalesOrdersProps> = ({
  orders,
  products = [],
  customers = [],
  resellers = [],
  onIssueWarrantyFromOrder,
  onRefreshData,
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("TODOS");
  const [channelFilter, setChannelFilter] = useState<string>("TODOS");
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  // Normalize order list structure (supports both new Order and legacy UnifiedOrder)
  const normalizedOrders: Order[] = orders.map((o: any) => {
    // If it's legacy structure
    if (o.customer && !o.customerSnapshot) {
      return {
        id: o.id,
        organizationId: "org-lumina-01",
        orderNumber: o.orderNumber.startsWith("ORD-") ? o.orderNumber : `ORD-2026-${o.orderNumber.replace("#", "")}`,
        customerId: `cust-${o.id}`,
        customerSnapshot: {
          id: `cust-${o.id}`,
          personType: "PF" as const,
          name: o.customer.name,
          document: o.customer.document,
          email: o.customer.email,
          phone: o.customer.phone,
        },
        channel: o.channel === "LOJA_WEB" ? "ECOMMERCE" : o.channel === "REVENDEDORA" ? "B2B_RESELLER" : o.channel === "PRESENCIAL" ? "PRESENTIAL_POS" : o.channel,
        status: o.status === "PAGO" ? "PAID" : o.status === "EM_PREPARACAO" ? "FULFILLMENT_PENDING" : o.status === "CANCELADO" ? "CANCELED" : o.status === "ENTREGUE" ? "FULFILLED" : o.status,
        shippingAddress: {
          recipientName: o.customer.name,
          zipCode: "13480-000",
          street: o.customer.address || "Endereço Principal",
          number: "S/N",
          neighborhood: "Centro",
          city: "Limeira",
          state: "SP",
          country: "BRA",
          phone: o.customer.phone,
        },
        currency: "BRL",
        subtotalAmount: o.subtotal || o.totalAmount,
        discountAmount: o.discount || 0,
        shippingAmount: o.shipping || 0,
        totalAmount: o.totalAmount,
        resellerId: o.resellerId,
        resellerName: o.resellerName,
        resellerCommissionAmount: o.resellerCommissionAmount || o.resellerCommission,
        warrantyCode: o.warrantyCode,
        createdAt: o.createdAt,
        updatedAt: o.updatedAt || o.createdAt,
        items: o.items?.map((item: any, idx: number) => ({
          id: `item-${o.id}-${idx}`,
          organizationId: "org-lumina-01",
          orderId: o.id,
          productId: item.productId,
          locationId: "loc-lumina-matriz",
          productSnapshot: {
            productId: item.productId,
            sku: item.sku,
            name: item.productName || "Semijoia",
            category: "COLARES",
            material: "Liga Nobre",
            bath: "OURO_18K",
            stones: [],
            price: item.unitPrice,
            costPrice: item.unitPrice * 0.3,
            warrantyMonths: 12,
            isCustomizable: Boolean(item.customization),
            imageUrl: "https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?w=600&auto=format&fit=crop&q=80",
            snapshotTimestamp: o.createdAt,
          },
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          costPriceSnapshot: item.unitPrice * 0.3,
          discountAmount: 0,
          totalAmount: item.unitPrice * item.quantity,
          customizationSpec: item.customization || o.customizationSnapshot,
          createdAt: o.createdAt,
        })),
        payments: [
          {
            id: `pay-${o.id}`,
            organizationId: "org-lumina-01",
            orderId: o.id,
            paymentMethod: (o.paymentMethod === "CARTAO_CREDITO" ? "CREDIT_CARD" : o.paymentMethod === "DINHEIRO" ? "CASH" : o.paymentMethod) as any,
            gateway: "MERCADOPAGO",
            status: o.status === "PAGO" ? "PAID" : "PENDING",
            amount: o.totalAmount,
            installments: 1,
            paidAt: o.status === "PAGO" ? o.updatedAt : undefined,
            createdAt: o.createdAt,
            updatedAt: o.updatedAt || o.createdAt,
          },
        ],
      };
    }
    return o;
  });

  // Calculate Pipeline Metrics
  const totalGrossRevenue = normalizedOrders
    .filter((o) => o.status !== "CANCELED" && o.status !== "REFUNDED")
    .reduce((acc, o) => acc + o.totalAmount, 0);

  const totalPaidRevenue = normalizedOrders
    .filter((o) => o.status === "PAID" || o.status === "FULFILLED" || o.status === "FULFILLMENT_PENDING")
    .reduce((acc, o) => acc + o.totalAmount, 0);

  const awaitingPaymentCount = normalizedOrders.filter(
    (o) => o.status === "AWAITING_PAYMENT" || o.status === "INVENTORY_RESERVED" || o.status === "PAYMENT_PROCESSING"
  ).length;

  const fulfillmentPendingCount = normalizedOrders.filter(
    (o) => o.status === "FULFILLMENT_PENDING" || o.status === "PAID"
  ).length;

  const warrantiesIssuedCount = normalizedOrders.filter((o) => Boolean(o.warrantyCode)).length;

  // Filter Orders
  const filteredOrders = normalizedOrders.filter((o) => {
    const q = searchTerm.toLowerCase().trim();
    const matchSearch =
      !q ||
      o.orderNumber.toLowerCase().includes(q) ||
      o.customerSnapshot?.name.toLowerCase().includes(q) ||
      (o.customerSnapshot?.document && o.customerSnapshot.document.includes(q)) ||
      (o.resellerName && o.resellerName.toLowerCase().includes(q)) ||
      (o.warrantyCode && o.warrantyCode.toLowerCase().includes(q));

    const matchStatus = statusFilter === "TODOS" || o.status === statusFilter;
    const matchChannel = channelFilter === "TODOS" || o.channel === channelFilter;

    return matchSearch && matchStatus && matchChannel;
  });

  // State Machine Transition Handler
  const handleTransitionOrder = async (orderId: string, dto: OrderTransitionDTO) => {
    try {
      const res = await fetch(`/api/orders/${orderId}/transition`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-tenant-id": "org-lumina-01",
        },
        body: JSON.stringify(dto),
      });

      const data = await res.json();
      if (data.success && data.data) {
        if (onRefreshData) {
          await onRefreshData();
        }
        setSelectedOrder(data.data);
      } else {
        throw new Error(data.error || "Erro ao transicionar.");
      }
    } catch (e: any) {
      console.warn("Falling back to local state transition:", e);
      // Local state fallback
      const updated = normalizedOrders.map((ord) => {
        if (ord.id === orderId) {
          let nextStatus: OrderStatus = ord.status;
          if (dto.event === "SUBMIT_ORDER" || dto.event === "RESERVE_INVENTORY") nextStatus = "INVENTORY_RESERVED";
          if (dto.event === "REQUEST_PAYMENT") nextStatus = "AWAITING_PAYMENT";
          if (dto.event === "CONFIRM_PAYMENT") nextStatus = "PAID";
          if (dto.event === "START_FULFILLMENT") nextStatus = "FULFILLMENT_PENDING";
          if (dto.event === "COMPLETE_FULFILLMENT") nextStatus = "FULFILLED";
          if (dto.event === "CANCEL_ORDER") nextStatus = "CANCELED";
          if (dto.event === "REFUND_ORDER") nextStatus = "REFUNDED";
          if (dto.event === "REOPEN_DRAFT") nextStatus = "DRAFT";

          const newOrder = {
            ...ord,
            status: nextStatus,
            warrantyCode: nextStatus === "PAID" && !ord.warrantyCode ? `GRT-${Math.random().toString(36).substring(2, 8).toUpperCase()}` : ord.warrantyCode,
            updatedAt: new Date().toISOString(),
          };
          if (selectedOrder?.id === orderId) {
            setSelectedOrder(newOrder);
          }
          return newOrder;
        }
        return ord;
      });
      if (onRefreshData) onRefreshData();
    }
  };

  // Create Order Handler
  const handleCreateOrder = async (dto: CreateOrderDTO) => {
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-tenant-id": "org-lumina-01",
        },
        body: JSON.stringify(dto),
      });

      const data = await res.json();
      if (data.success && data.data) {
        if (onRefreshData) {
          await onRefreshData();
        }
        confetti({ particleCount: 50, spread: 60, origin: { y: 0.6 } });
        setSelectedOrder(data.data);
        return;
      }
    } catch (e) {
      console.warn("Backend creation fallback:", e);
    }
  };

  const handleRefresh = async () => {
    if (onRefreshData) {
      setIsSyncing(true);
      await onRefreshData();
      setTimeout(() => setIsSyncing(false), 500);
    }
  };

  return (
    <div className="space-y-8 text-stone-900">
      {/* Header & Primary Actions */}
      <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-4 pb-4 border-b border-stone-200">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
              SPRINT 4 — ORDERS & SALES ENGINE
            </span>
            <span className="text-[10px] text-stone-400 font-mono">FSM State Machine • RLS • Ledger</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-serif italic font-bold tracking-wide text-stone-900 mt-1">
            Motor de Vendas & Pedidos Omnichannel
          </h2>
          <p className="text-xs text-stone-600 mt-1 max-w-2xl font-sans leading-relaxed">
            Conexão centralizada de <strong>Cliente → Pedido → Itens com Snapshot → Pagamentos → Estoque com Row-Lock</strong>.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleRefresh}
            className="p-2 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 transition-all cursor-pointer"
            title="Sincronizar com PostgreSQL"
          >
            <RefreshCw className={`w-4 h-4 ${isSyncing ? "animate-spin text-amber-600" : ""}`} />
          </button>

          <button
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2.5 bg-stone-900 hover:bg-stone-800 text-white rounded-2xl text-xs font-bold uppercase tracking-wider flex items-center gap-2 cursor-pointer shadow-md"
          >
            <Plus className="w-4 h-4 text-amber-400" />
            <span>Novo Pedido / Venda PDV</span>
          </button>
        </div>
      </div>

      {/* KPI Cards / Pipeline Highlights */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-stone-200 rounded-2xl p-4 shadow-2xs space-y-1">
          <div className="text-[10px] uppercase font-bold text-stone-400 flex items-center justify-between">
            <span>Faturamento Bruto</span>
            <DollarSign className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-2xl font-serif font-bold text-stone-900">
            R$ {totalGrossRevenue.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
          </div>
          <div className="text-[11px] text-stone-500">
            Liquidado: <strong className="text-emerald-700">R$ {totalPaidRevenue.toFixed(2)}</strong>
          </div>
        </div>

        <div className="bg-white border border-stone-200 rounded-2xl p-4 shadow-2xs space-y-1">
          <div className="text-[10px] uppercase font-bold text-stone-400 flex items-center justify-between">
            <span>Aguardando Pagamento</span>
            <CreditCard className="w-4 h-4 text-orange-600" />
          </div>
          <div className="text-2xl font-serif font-bold text-orange-700">
            {awaitingPaymentCount} pedidos
          </div>
          <div className="text-[11px] text-stone-500">
            Com reserva de estoque ativa no Ledger
          </div>
        </div>

        <div className="bg-white border border-stone-200 rounded-2xl p-4 shadow-2xs space-y-1">
          <div className="text-[10px] uppercase font-bold text-stone-400 flex items-center justify-between">
            <span>Em Separação / Expedição</span>
            <Truck className="w-4 h-4 text-purple-600" />
          </div>
          <div className="text-2xl font-serif font-bold text-purple-800">
            {fulfillmentPendingCount} pedidos
          </div>
          <div className="text-[11px] text-stone-500">
            Prontos para embalagem e envio
          </div>
        </div>

        <div className="bg-white border border-stone-200 rounded-2xl p-4 shadow-2xs space-y-1">
          <div className="text-[10px] uppercase font-bold text-stone-400 flex items-center justify-between">
            <span>Garantias Digitais</span>
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-serif font-bold text-emerald-700">
            {warrantiesIssuedCount} emitidas
          </div>
          <div className="text-[11px] text-stone-500">
            Cobertura oficial de 12 meses ativa
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white border border-stone-200 rounded-3xl p-4 space-y-4 shadow-xs">
        <div className="flex flex-col md:flex-row gap-3 items-center justify-between">
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-3" />
            <input
              type="text"
              placeholder="Buscar por nº do pedido (ORD-2026-1842), cliente, CPF/CNPJ, revendedora ou garantia..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-stone-50 border border-stone-200 rounded-xl pl-10 pr-4 py-2 text-xs text-stone-900 placeholder-stone-400 focus:outline-none focus:border-stone-400 focus:bg-white"
            />
          </div>

          <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
            <span className="text-[10px] uppercase font-bold text-stone-400 shrink-0">Canal:</span>
            {["TODOS", "ECOMMERCE", "PRESENTIAL_POS", "WHATSAPP", "B2B_RESELLER", "CUSTOM_STUDIO"].map((ch) => (
              <button
                key={ch}
                onClick={() => setChannelFilter(ch)}
                className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                  channelFilter === ch
                    ? "bg-stone-900 text-white shadow-xs"
                    : "bg-stone-100 text-stone-600 hover:bg-stone-200"
                }`}
              >
                {ch === "TODOS" ? "Todos" : ch.replace("_", " ")}
              </button>
            ))}
          </div>
        </div>

        {/* FSM Status Pipeline Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pt-2 border-t border-stone-100">
          {STATUS_FILTERS.map((s) => {
            const count = s.key === "TODOS" ? normalizedOrders.length : normalizedOrders.filter((o) => o.status === s.key).length;
            return (
              <button
                key={s.key}
                onClick={() => setStatusFilter(s.key)}
                className={`px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition-all flex items-center gap-1.5 cursor-pointer ${
                  statusFilter === s.key
                    ? "bg-amber-100 text-amber-950 font-bold border border-amber-300"
                    : "bg-stone-50 text-stone-600 hover:bg-stone-100 border border-stone-200"
                }`}
              >
                <span>{s.label}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                    statusFilter === s.key ? "bg-amber-300 text-amber-950 font-mono font-bold" : "bg-stone-200 text-stone-700 font-mono"
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Orders Table */}
      <div className="bg-white border border-stone-200 rounded-3xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-stone-50 text-[10px] uppercase tracking-widest text-stone-400 border-b border-stone-200">
              <tr>
                <th className="py-3.5 px-6 font-bold">Pedido / Data</th>
                <th className="py-3.5 px-4 font-bold">Canal / Origem</th>
                <th className="py-3.5 px-4 font-bold">Cliente Snapshot</th>
                <th className="py-3.5 px-4 font-bold">Estado FSM</th>
                <th className="py-3.5 px-4 font-bold">Pagamento</th>
                <th className="py-3.5 px-4 font-bold text-right">Total Faturado</th>
                <th className="py-3.5 px-6 font-bold text-right">Ações Rápidas</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-stone-400 text-xs">
                    Nenhum pedido localizado para os filtros selecionados.
                  </td>
                </tr>
              ) : (
                filteredOrders.map((order) => {
                  const channelInfo = CHANNEL_BADGES[order.channel] || {
                    label: order.channel,
                    bg: "bg-stone-100",
                    text: "text-stone-700",
                    border: "border-stone-200",
                  };
                  const statusInfo = STATUS_BADGES[order.status] || {
                    label: order.status,
                    bg: "bg-stone-100",
                    text: "text-stone-700",
                    border: "border-stone-200",
                  };
                  const primaryPayment = order.payments?.[0];

                  return (
                    <tr key={order.id} className="hover:bg-stone-50/70 transition-colors">
                      {/* Order Number and Date */}
                      <td className="py-4 px-6">
                        <div className="font-mono font-bold text-stone-900">{order.orderNumber}</div>
                        <div className="text-[10px] text-stone-400">
                          {new Date(order.createdAt).toLocaleDateString("pt-BR")}{" "}
                          {new Date(order.createdAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                        </div>
                      </td>

                      {/* Sales Channel */}
                      <td className="py-4 px-4">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${channelInfo.bg} ${channelInfo.text} ${channelInfo.border}`}
                        >
                          {channelInfo.label}
                        </span>
                        {order.resellerName && (
                          <div className="text-[10px] text-stone-500 mt-1 truncate max-w-[120px]" title={order.resellerName}>
                            Consultora: {order.resellerName}
                          </div>
                        )}
                      </td>

                      {/* Customer Snapshot */}
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-1.5">
                          <span className="font-semibold text-xs text-stone-900 truncate max-w-[150px]">
                            {order.customerSnapshot?.name}
                          </span>
                          <span className="px-1 py-0.2 rounded text-[9px] font-bold font-mono bg-stone-100 text-stone-600">
                            {order.customerSnapshot?.personType || "PF"}
                          </span>
                        </div>
                        <div className="text-[11px] text-stone-400 font-mono">
                          {order.customerSnapshot?.document || order.customerSnapshot?.phone || "Sem doc"}
                        </div>
                      </td>

                      {/* FSM Status Badge */}
                      <td className="py-4 px-4">
                        <span
                          className={`px-2.5 py-1 rounded-full text-[10px] font-bold border ${statusInfo.bg} ${statusInfo.text} ${statusInfo.border} inline-flex items-center gap-1`}
                        >
                          {order.status === "PAID" || (order.status as any) === "PAGO" || order.status === "FULFILLED" ? (
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          ) : order.status === "INVENTORY_RESERVED" || order.status === "AWAITING_PAYMENT" ? (
                            <Clock className="w-3 h-3 text-amber-600" />
                          ) : (
                            <span className="w-1.5 h-1.5 rounded-full bg-current" />
                          )}
                          {statusInfo.label}
                        </span>
                      </td>

                      {/* Payment Method */}
                      <td className="py-4 px-4">
                        <div className="text-xs font-semibold text-stone-800">
                          {primaryPayment ? primaryPayment.paymentMethod : "A combinar"}
                        </div>
                        <div className="text-[10px] text-stone-400">
                          {primaryPayment?.status === "PAID" ? "Liquidado" : "Pendente"}
                        </div>
                      </td>

                      {/* Total Amount */}
                      <td className="py-4 px-4 text-right font-serif font-bold text-stone-900 text-base">
                        R$ {order.totalAmount.toFixed(2)}
                      </td>

                      {/* Actions */}
                      <td className="py-4 px-6 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => setSelectedOrder(order)}
                            className="px-2.5 py-1.5 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-800 text-xs font-bold transition-all cursor-pointer flex items-center gap-1"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>Inspecionar</span>
                          </button>

                          <button
                            onClick={() => onIssueWarrantyFromOrder(order)}
                            className="px-3 py-1.5 rounded-xl bg-stone-900 hover:bg-stone-800 text-white text-xs font-bold uppercase tracking-wider flex items-center gap-1 cursor-pointer shadow-2xs"
                          >
                            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                            <span>Garantia</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* New Order Modal */}
      {showCreateModal && (
        <OrderCreationModal
          products={products}
          customers={customers}
          resellers={resellers.map((r) => ({
            id: r.id,
            name: r.name,
            commissionDirectRate: r.commissionDirectRate,
          }))}
          onClose={() => setShowCreateModal(false)}
          onSubmit={handleCreateOrder}
        />
      )}

      {/* Order Inspector Drawer */}
      {selectedOrder && (
        <OrderDetailDrawer
          order={selectedOrder}
          onClose={() => setSelectedOrder(null)}
          onTransition={handleTransitionOrder}
          onIssueWarranty={onIssueWarrantyFromOrder}
        />
      )}
    </div>
  );
};
