import React, { useState } from "react";
import {
  Search,
  SlidersHorizontal,
  Plus,
  Eye,
  MoreVertical,
  Calendar,
  CheckCircle,
  Clock,
  Send,
  Printer,
  ShieldCheck,
  CreditCard,
  QrCode,
  DollarSign,
  AlertCircle,
  X,
  ExternalLink,
} from "lucide-react";
import { UnifiedOrder, ProductItem, Customer, DigitalWarranty } from "../types";

interface UnifiedSalesOrdersProps {
  orders: UnifiedOrder[];
  products: ProductItem[];
  customers: Customer[];
  warranties: DigitalWarranty[];
  onOpenNewSale: () => void;
  onConfirmOrderPayment?: (orderId: string) => void;
  onUpdateOrderStatus?: (orderId: string, status: string) => void;
  onViewWarranty?: (warrantyCode: string) => void;
}

export const UnifiedSalesOrders: React.FC<UnifiedSalesOrdersProps> = ({
  orders,
  products,
  customers,
  warranties,
  onOpenNewSale,
  onConfirmOrderPayment,
  onUpdateOrderStatus,
  onViewWarranty,
}) => {
  const [activeTab, setActiveTab] = useState<string>("TODOS");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedOrderForDrawer, setSelectedOrderForDrawer] = useState<any | null>(null);

  // Wireframe reference orders
  const wireframeOrders = [
    {
      id: "ord-1025",
      orderNumber: "#ORD-1025",
      customerName: "Maria Fernanda",
      customerPhone: "(11) 99888-7766",
      date: "24/05 10:30",
      totalAmount: 398.0,
      paymentMethod: "PIX",
      status: "PAGO",
      statusLabel: "Pago",
      statusColor: "emerald",
      items: [{ name: "Colar Riviera Zircônias", qty: 1, price: 398.0 }],
      warrantyCode: "GRT-1025-WF",
    },
    {
      id: "ord-1024",
      orderNumber: "#ORD-1024",
      customerName: "Amanda Costa",
      customerPhone: "(11) 98877-6655",
      date: "24/05 09:15",
      totalAmount: 289.9,
      paymentMethod: "PIX",
      status: "AGUARDANDO_PAGAMENTO",
      statusLabel: "Aguardando Pagamento",
      statusColor: "amber",
      items: [{ name: "Brinco Argola Cravejada", qty: 1, price: 289.9 }],
      warrantyCode: "GRT-1024-WF",
    },
    {
      id: "ord-1023",
      orderNumber: "#ORD-1023",
      customerName: "Beatriz Lima",
      customerPhone: "(11) 97766-5544",
      date: "23/05 16:40",
      totalAmount: 459.0,
      paymentMethod: "Cartão",
      status: "PAGO",
      statusLabel: "Pago",
      statusColor: "emerald",
      items: [{ name: "Conjunto Gotas Turmalina", qty: 1, price: 459.0 }],
      warrantyCode: "GRT-1023-WF",
    },
    {
      id: "ord-1022",
      orderNumber: "#ORD-1022",
      customerName: "Juliana Alves",
      customerPhone: "(11) 96655-4433",
      date: "23/05 14:20",
      totalAmount: 329.9,
      paymentMethod: "Dinheiro",
      status: "ENVIADO",
      statusLabel: "Enviado",
      statusColor: "blue",
      items: [{ name: "Pulseira Veneziana 18K", qty: 1, price: 329.9 }],
      warrantyCode: "GRT-1022-WF",
    },
    {
      id: "ord-1021",
      orderNumber: "#ORD-1021",
      customerName: "Camila Souza",
      customerPhone: "(11) 95544-3322",
      date: "23/05 11:05",
      totalAmount: 179.9,
      paymentMethod: "PIX",
      status: "CANCELADO",
      statusLabel: "Cancelado",
      statusColor: "rose",
      items: [{ name: "Colar Medalha Fé", qty: 1, price: 179.9 }],
      warrantyCode: "GRT-1021-WF",
    },
    {
      id: "ord-1020",
      orderNumber: "#ORD-1020",
      customerName: "Larissa Martins",
      customerPhone: "(11) 94433-2211",
      date: "22/05 18:30",
      totalAmount: 219.9,
      paymentMethod: "PIX",
      status: "AGUARDANDO_PAGAMENTO",
      statusLabel: "Aguardando Pagamento",
      statusColor: "amber",
      items: [{ name: "Bracelete Banhado 18K", qty: 1, price: 219.9 }],
      warrantyCode: "GRT-1020-WF",
    },
    {
      id: "ord-1019",
      orderNumber: "#ORD-1019",
      customerName: "Fernanda Rocha",
      customerPhone: "(11) 93322-1100",
      date: "22/05 15:20",
      totalAmount: 149.9,
      paymentMethod: "Dinheiro",
      status: "PAGO",
      statusLabel: "Pago",
      statusColor: "emerald",
      items: [{ name: "Anel Solitário Cristal", qty: 1, price: 149.9 }],
      warrantyCode: "GRT-1019-WF",
    },
  ];

  // Merge runtime orders if any
  const normalizedRuntimeOrders = (orders || []).map((o: any) => ({
    id: o.id,
    orderNumber: o.orderNumber?.startsWith("#") ? o.orderNumber : `#${o.orderNumber || o.id.slice(-6)}`,
    customerName: o.customerSnapshot?.name || o.customerName || "Cliente",
    customerPhone: o.customerSnapshot?.phone || o.customerPhone || "",
    date: new Date(o.createdAt || Date.now()).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }) + " " + new Date(o.createdAt || Date.now()).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }),
    totalAmount: Number(o.totalAmount || 0),
    paymentMethod: o.paymentMethod || o.payments?.[0]?.paymentMethod || "PIX",
    status: o.status || "PAGO",
    statusLabel: o.status === "PAID" || o.status === "PAGO" ? "Pago" : o.status === "SHIPPED" || o.status === "ENVIADO" ? "Enviado" : o.status === "CANCELLED" || o.status === "CANCELADO" ? "Cancelado" : "Aguardando Pagamento",
    statusColor: (o.status === "PAID" || o.status === "PAGO") ? "emerald" : (o.status === "SHIPPED" || o.status === "ENVIADO") ? "blue" : (o.status === "CANCELLED" || o.status === "CANCELADO") ? "rose" : "amber",
    items: o.items?.map((i: any) => ({
      name: i.productSnapshot?.name || i.name || "Semijoia",
      qty: i.quantity || 1,
      price: Number(i.unitPrice || 0),
    })) || [],
    warrantyCode: o.warrantyCode || "GRT-2026",
  }));

  const allOrders = [...wireframeOrders, ...normalizedRuntimeOrders];

  const filteredOrders = allOrders.filter((order) => {
    const matchesSearch =
      order.orderNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.customerPhone.includes(searchQuery);

    if (!matchesSearch) return false;

    if (activeTab === "PENDENTES") {
      return order.statusLabel === "Aguardando Pagamento" || order.status === "PENDING";
    }
    if (activeTab === "AGUARDANDO_PAGAMENTO") {
      return order.statusLabel === "Aguardando Pagamento";
    }
    if (activeTab === "PAGOS") {
      return order.statusLabel === "Pago";
    }
    if (activeTab === "ENVIADOS") {
      return order.statusLabel === "Enviado";
    }
    if (activeTab === "CANCELADOS") {
      return order.statusLabel === "Cancelado";
    }

    return true; // "TODOS"
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto animate-fadeIn pb-12 font-sans">
      {/* ========================================================================= */}
      {/* HEADER: Pedidos + "+ Novo Pedido"                                         */}
      {/* ========================================================================= */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-stone-900 tracking-tight">
            Pedidos
          </h1>
          <p className="text-xs sm:text-sm text-stone-500 mt-0.5">
            Acompanhamento de vendas, status de pagamentos e envio
          </p>
        </div>

        {/* + Novo Pedido Button */}
        <button
          onClick={onOpenNewSale}
          className="flex items-center gap-1.5 px-4 py-2 bg-[#C88A2C] hover:bg-[#B37822] text-white text-xs font-bold rounded-xl shadow-xs transition-all active:scale-98 cursor-pointer self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Novo Pedido</span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* SEARCH & FILTROS BAR                                                      */}
      {/* ========================================================================= */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
        {/* Search input */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Buscar por número, cliente ou WhatsApp..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 bg-white border border-stone-200 rounded-xl text-xs text-stone-900 placeholder:text-stone-400 focus:outline-none focus:border-stone-400 shadow-2xs"
          />
        </div>

        {/* Filtros button */}
        <button className="flex items-center justify-center gap-2 px-3.5 py-2.5 bg-white border border-stone-200 rounded-xl text-xs font-semibold text-stone-700 hover:bg-stone-50 transition-colors shadow-2xs cursor-pointer">
          <SlidersHorizontal className="w-3.5 h-3.5 text-stone-500" />
          <span>Filtros</span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* FILTER TABS (EXACT WIREFRAME LIST)                                        */}
      {/* ========================================================================= */}
      <div className="flex items-center gap-6 border-b border-stone-200 overflow-x-auto text-xs pb-0">
        <button
          onClick={() => setActiveTab("TODOS")}
          className={`pb-3 font-semibold transition-colors relative cursor-pointer ${
            activeTab === "TODOS"
              ? "text-stone-900 font-bold border-b-2 border-stone-900"
              : "text-stone-500 hover:text-stone-800"
          }`}
        >
          Todos (32)
        </button>

        <button
          onClick={() => setActiveTab("PENDENTES")}
          className={`pb-3 font-semibold transition-colors relative cursor-pointer ${
            activeTab === "PENDENTES"
              ? "text-stone-900 font-bold border-b-2 border-stone-900"
              : "text-stone-500 hover:text-stone-800"
          }`}
        >
          Pendentes (8)
        </button>

        <button
          onClick={() => setActiveTab("AGUARDANDO_PAGAMENTO")}
          className={`pb-3 font-semibold transition-colors relative cursor-pointer ${
            activeTab === "AGUARDANDO_PAGAMENTO"
              ? "text-stone-900 font-bold border-b-2 border-stone-900"
              : "text-stone-500 hover:text-stone-800"
          }`}
        >
          Aguardando Pagamento (5)
        </button>

        <button
          onClick={() => setActiveTab("PAGOS")}
          className={`pb-3 font-semibold transition-colors relative cursor-pointer ${
            activeTab === "PAGOS"
              ? "text-stone-900 font-bold border-b-2 border-stone-900"
              : "text-stone-500 hover:text-stone-800"
          }`}
        >
          Pagos (14)
        </button>

        <button
          onClick={() => setActiveTab("ENVIADOS")}
          className={`pb-3 font-semibold transition-colors relative cursor-pointer ${
            activeTab === "ENVIADOS"
              ? "text-stone-900 font-bold border-b-2 border-stone-900"
              : "text-stone-500 hover:text-stone-800"
          }`}
        >
          Enviados (3)
        </button>

        <button
          onClick={() => setActiveTab("CANCELADOS")}
          className={`pb-3 font-semibold transition-colors relative cursor-pointer ${
            activeTab === "CANCELADOS"
              ? "text-stone-900 font-bold border-b-2 border-stone-900"
              : "text-stone-500 hover:text-stone-800"
          }`}
        >
          Cancelados (2)
        </button>
      </div>

      {/* ========================================================================= */}
      {/* DATA TABLE (EXACT WIREFRAME DESIGN)                                       */}
      {/* ========================================================================= */}
      <div className="bg-white rounded-2xl border border-stone-200/90 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            {/* Table Header */}
            <thead>
              <tr className="border-b border-stone-200 bg-stone-50/70 text-stone-500 font-semibold">
                <th className="px-5 py-3.5">Pedido</th>
                <th className="px-5 py-3.5">Cliente</th>
                <th className="px-5 py-3.5">Data</th>
                <th className="px-5 py-3.5">Total</th>
                <th className="px-5 py-3.5">Pagamento</th>
                <th className="px-5 py-3.5">Status</th>
                <th className="px-5 py-3.5 text-right">Ações</th>
              </tr>
            </thead>

            {/* Table Body */}
            <tbody className="divide-y divide-stone-100">
              {filteredOrders.map((order) => {
                const isPaid = order.statusColor === "emerald";
                const isAmber = order.statusColor === "amber";
                const isBlue = order.statusColor === "blue";
                const isRose = order.statusColor === "rose";

                return (
                  <tr
                    key={order.id}
                    onClick={() => setSelectedOrderForDrawer(order)}
                    className="hover:bg-stone-50/70 transition-colors cursor-pointer"
                  >
                    {/* Pedido */}
                    <td className="px-5 py-4 font-bold text-stone-900">
                      {order.orderNumber}
                    </td>

                    {/* Cliente */}
                    <td className="px-5 py-4 font-medium text-stone-800">
                      {order.customerName}
                    </td>

                    {/* Data */}
                    <td className="px-5 py-4 text-stone-500">
                      {order.date}
                    </td>

                    {/* Total */}
                    <td className="px-5 py-4 font-bold text-stone-900">
                      R$ {Number(order.totalAmount).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                    </td>

                    {/* Pagamento */}
                    <td className="px-5 py-4 text-stone-600">
                      {order.paymentMethod}
                    </td>

                    {/* Status Badge */}
                    <td className="px-5 py-4">
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded-md text-[11px] font-semibold ${
                          isPaid
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                            : isAmber
                            ? "bg-amber-50 text-amber-700 border border-amber-200"
                            : isBlue
                            ? "bg-blue-50 text-blue-700 border border-blue-200"
                            : "bg-rose-50 text-rose-700 border border-rose-200"
                        }`}
                      >
                        {order.statusLabel}
                      </span>
                    </td>

                    {/* Ações (Eye + 3 dots) */}
                    <td className="px-5 py-4 text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => setSelectedOrderForDrawer(order)}
                          className="p-1.5 rounded-lg hover:bg-stone-100 text-stone-400 hover:text-stone-700 transition-colors cursor-pointer"
                          title="Ver detalhes do pedido"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setSelectedOrderForDrawer(order)}
                          className="p-1.5 rounded-lg hover:bg-stone-100 text-stone-400 hover:text-stone-700 transition-colors cursor-pointer"
                          title="Mais opções"
                        >
                          <MoreVertical className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* DRAWER / MODAL: DETALHES DO PEDIDO                                        */}
      {/* ========================================================================= */}
      {selectedOrderForDrawer && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-end animate-fadeIn">
          <div className="bg-white w-full max-w-md h-full shadow-2xl p-6 flex flex-col justify-between overflow-y-auto animate-slideInRight">
            <div className="space-y-6">
              {/* Drawer Header */}
              <div className="flex items-center justify-between pb-4 border-b border-stone-100">
                <div>
                  <h3 className="text-lg font-bold text-stone-900">
                    {selectedOrderForDrawer.orderNumber}
                  </h3>
                  <p className="text-xs text-stone-400">
                    {selectedOrderForDrawer.date}
                  </p>
                </div>
                <button
                  onClick={() => setSelectedOrderForDrawer(null)}
                  className="p-2 rounded-xl text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Status & Payment Banner */}
              <div className="bg-stone-50 rounded-2xl p-4 border border-stone-200 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-stone-500">Status do Pedido:</span>
                  <span
                    className={`px-2.5 py-0.5 rounded-md text-[11px] font-semibold ${
                      selectedOrderForDrawer.statusColor === "emerald"
                        ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                        : "bg-amber-50 text-amber-700 border border-amber-200"
                    }`}
                  >
                    {selectedOrderForDrawer.statusLabel}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-stone-500">Pagamento:</span>
                  <span className="font-bold text-stone-900">{selectedOrderForDrawer.paymentMethod}</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-stone-500">Total:</span>
                  <span className="font-bold text-stone-900 text-sm">
                    R$ {Number(selectedOrderForDrawer.totalAmount).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>

              {/* Cliente */}
              <div className="space-y-1 text-xs">
                <span className="font-bold text-stone-900 block">Cliente</span>
                <div className="text-stone-700 font-medium">{selectedOrderForDrawer.customerName}</div>
                <div className="text-stone-400">{selectedOrderForDrawer.customerPhone || "Sem telefone"}</div>
              </div>

              {/* Itens */}
              <div className="space-y-2 text-xs">
                <span className="font-bold text-stone-900 block">Itens do Pedido</span>
                <div className="space-y-1.5 border border-stone-200 rounded-xl p-3 bg-stone-50/50">
                  {selectedOrderForDrawer.items?.map((item: any, idx: number) => (
                    <div key={idx} className="flex items-center justify-between">
                      <span className="text-stone-700">{item.qty || 1}x {item.name}</span>
                      <span className="font-bold text-stone-900">
                        R$ {Number(item.price || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Digital Warranty Link */}
              <div className="p-3.5 bg-amber-50/70 border border-amber-200 rounded-xl flex items-center justify-between text-xs">
                <div className="flex items-center gap-2 text-amber-900 font-semibold">
                  <ShieldCheck className="w-4 h-4 text-amber-700" />
                  <span>Garantia 12 Meses: {selectedOrderForDrawer.warrantyCode}</span>
                </div>
              </div>
            </div>

            {/* Actions Footer */}
            <div className="pt-6 border-t border-stone-100 space-y-2">
              <a
                href={`https://wa.me/55${(selectedOrderForDrawer.customerPhone || "").replace(/\D/g, "")}?text=Ol%C3%A1+${encodeURIComponent(selectedOrderForDrawer.customerName)}%2C+aqui+%C3%A9+da+Lumina+Semijoias!+Seu+pedido+${selectedOrderForDrawer.orderNumber}+est%C3%A1+confirmado.`}
                target="_blank"
                rel="noreferrer"
                className="w-full flex items-center justify-center gap-2 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors"
              >
                <Send className="w-4 h-4" />
                <span>Enviar no WhatsApp</span>
              </a>

              <button
                onClick={() => setSelectedOrderForDrawer(null)}
                className="w-full py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-bold rounded-xl transition-colors"
              >
                Fechar Detalhes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
