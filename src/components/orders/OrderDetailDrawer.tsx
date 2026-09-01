import React, { useState } from "react";
import {
  X,
  ShieldCheck,
  Printer,
  Copy,
  Check,
  QrCode,
  Send,
  CreditCard,
  Building2,
  User,
  MapPin,
  Clock,
  CheckCircle2,
  AlertCircle,
  RotateCcw,
  Sparkles,
  ArrowRight,
  PackageCheck,
  Truck,
  FileText,
  DollarSign,
  MessageCircle,
  Hash,
} from "lucide-react";
import {
  Order,
  OrderStatus,
  OrderEvent,
  OrderTransitionDTO,
} from "../../types/order";
import { OrderReceiptPrintModal } from "./OrderReceiptPrintModal";
import { whatsappOrderService } from "../../services/whatsappOrderService";

interface OrderDetailDrawerProps {
  order: Order;
  onClose: () => void;
  onTransition: (orderId: string, dto: OrderTransitionDTO) => Promise<void>;
  onIssueWarranty: (order: Order) => void;
}

const ORDER_STEPS: OrderStatus[] = [
  "DRAFT",
  "INVENTORY_RESERVED",
  "AWAITING_PAYMENT",
  "PAID",
  "FULFILLMENT_PENDING",
  "FULFILLED",
];

const STEP_LABELS: Record<OrderStatus, string> = {
  DRAFT: "Rascunho",
  PENDING_CONFIRMATION: "Confirmação",
  INVENTORY_RESERVED: "Estoque Reservado",
  AWAITING_PAYMENT: "Aguardando Pgto",
  PAYMENT_PROCESSING: "Processando",
  PAID: "Pago & Faturado",
  FULFILLMENT_PENDING: "Em Separação",
  FULFILLED: "Entregue / Concluído",
  CANCELED: "Cancelado",
  EXPIRED: "Expirado",
  REFUNDED: "Estornado",
};

export const OrderDetailDrawer: React.FC<OrderDetailDrawerProps> = ({
  order,
  onClose,
  onTransition,
  onIssueWarranty,
}) => {
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [copiedPix, setCopiedPix] = useState(false);
  const [copiedTrace, setCopiedTrace] = useState(false);
  const [copiedPaymentWaMsg, setCopiedPaymentWaMsg] = useState(false);
  const [showPixQr, setShowPixQr] = useState(false);
  const [selectedPaymentMode, setSelectedPaymentMode] = useState<string>("PIX");

  const handleCopyTrace = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedTrace(true);
    setTimeout(() => setCopiedTrace(false), 3000);
  };

  const handleAction = async (event: OrderEvent, reason?: string) => {
    setIsTransitioning(true);
    try {
      await onTransition(order.id, {
        event,
        operatorName: order.resellerName ? `Vendedora (${order.resellerName})` : "Gestor Comercial (Admin)",
        reason,
      });
    } catch (e: any) {
      alert(e.message || "Erro ao transicionar pedido.");
    } finally {
      setIsTransitioning(false);
    }
  };

  const handleConfirmPaidSale = async () => {
    setIsTransitioning(true);
    try {
      await onTransition(order.id, {
        event: "CONFIRM_PAYMENT",
        operatorName: order.resellerName ? `Vendedora (${order.resellerName})` : "Gestor Comercial (Admin)",
        reason: `Pagamento recebido via ${selectedPaymentMode}. Estoque baixado para SALE no ERP e Garantia Digital ativada.`,
      });
    } catch (e: any) {
      alert(e.message || "Erro ao confirmar pagamento.");
    } finally {
      setIsTransitioning(false);
    }
  };

  const handleSendPaymentConfirmationWhatsApp = () => {
    const custPhone = order.customerSnapshot?.phone || (order as any).customer?.phone;
    const msg = whatsappOrderService.formatPaymentConfirmationMessage({
      orderNumber: order.orderNumber,
      customerName: order.customerSnapshot?.name || "Cliente",
      totalAmount: order.totalAmount,
      warrantyCode: order.warrantyCode,
      items: order.items,
      resellerName: order.resellerName,
    });

    if (custPhone) {
      const url = whatsappOrderService.generateWhatsAppUrl(custPhone, msg);
      window.open(url, "_blank");
    } else {
      navigator.clipboard.writeText(msg);
      setCopiedPaymentWaMsg(true);
      setTimeout(() => setCopiedPaymentWaMsg(false), 3000);
    }
  };

  const handleCopyPix = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedPix(true);
    setTimeout(() => setCopiedPix(false), 3000);
  };

  // Determine current step index in standard flow
  const currentStepIndex = ORDER_STEPS.indexOf(order.status);
  const isTerminalNegative = ["CANCELED", "EXPIRED", "REFUNDED"].includes(order.status);

  return (
    <>
      <div className="fixed inset-0 z-50 bg-stone-950/60 backdrop-blur-xs flex justify-end animate-in fade-in duration-200">
        <div className="bg-white w-full max-w-3xl h-full shadow-2xl flex flex-col overflow-hidden text-stone-900 border-l border-stone-200">
          {/* Header */}
          <div className="p-6 border-b border-stone-200 bg-stone-50 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-stone-900 text-white rounded-2xl">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-serif font-bold text-stone-900">
                    {order.orderNumber}
                  </h2>
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                      order.channel === "ECOMMERCE"
                        ? "bg-amber-100 text-amber-900 border border-amber-200"
                        : order.channel === "PRESENTIAL_POS"
                        ? "bg-purple-100 text-purple-900 border border-purple-200"
                        : order.channel === "WHATSAPP"
                        ? "bg-emerald-100 text-emerald-900 border border-emerald-200"
                        : order.channel === "B2B_RESELLER"
                        ? "bg-sky-100 text-sky-900 border border-sky-200"
                        : "bg-stone-200 text-stone-800"
                    }`}
                  >
                    {order.channel.replace("_", " ")}
                  </span>
                </div>
                <div className="text-xs text-stone-500 mt-0.5">
                  Criado em {new Date(order.createdAt).toLocaleString("pt-BR")}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowPrintModal(true)}
                className="px-3 py-1.5 bg-white border border-stone-300 hover:bg-stone-100 text-stone-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-2xs"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Imprimir</span>
              </button>
              <button
                onClick={onClose}
                className="p-2 text-stone-400 hover:text-stone-700 hover:bg-stone-200/60 rounded-xl cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Stepper / Timeline Progress */}
          <div className="bg-stone-900 text-white px-6 py-4 border-b border-stone-800">
            <div className="text-[10px] uppercase font-bold tracking-[0.2em] text-stone-400 mb-3 flex items-center justify-between">
              <span>Pipeline & Máquina de Estados (FSM)</span>
              <span className="font-mono text-amber-400">
                Estado Atual: {STEP_LABELS[order.status] || order.status}
              </span>
            </div>

            {isTerminalNegative ? (
              <div className="p-3 bg-rose-950/70 border border-rose-800 rounded-2xl flex items-center gap-3 text-xs text-rose-200">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                <div>
                  <span className="font-bold uppercase tracking-wider block text-[10px]">
                    Fluxo Encerrado: {STEP_LABELS[order.status]}
                  </span>
                  <span>
                    {order.status === "CANCELED"
                      ? "O pedido foi cancelado e as reservas de estoque foram liberadas."
                      : order.status === "REFUNDED"
                      ? "O pagamento foi estornado e as peças foram devolvidas ao inventário matriz."
                      : "O tempo limite de pagamento (TTL) expirou e a reserva de estoque expirou."}
                  </span>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between relative">
                {ORDER_STEPS.map((step, idx) => {
                  const isDone = currentStepIndex > idx || order.status === "FULFILLED";
                  const isCurrent = order.status === step;
                  return (
                    <div key={step} className="flex flex-col items-center relative z-10">
                      <div
                        className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                          isDone
                            ? "bg-emerald-500 text-white shadow-xs"
                            : isCurrent
                            ? "bg-amber-400 text-stone-950 ring-4 ring-amber-400/30"
                            : "bg-stone-800 text-stone-500 border border-stone-700"
                        }`}
                      >
                        {isDone ? <Check className="w-4 h-4" /> : idx + 1}
                      </div>
                      <span
                        className={`text-[10px] mt-1.5 text-center font-medium max-w-[80px] leading-tight ${
                          isCurrent
                            ? "text-amber-300 font-bold"
                            : isDone
                            ? "text-stone-300"
                            : "text-stone-500"
                        }`}
                      >
                        {STEP_LABELS[step]}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Drawer Body Scrollable */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {/* Commercial Action Pipeline Callout for Reseller / Sales Rep */}
            {(order.status === "INVENTORY_RESERVED" || order.status === "AWAITING_PAYMENT" || order.status === "DRAFT") && (
              <div className="bg-amber-50/90 border-2 border-amber-300 rounded-3xl p-5 space-y-3.5 shadow-sm">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="p-1.5 bg-amber-500 text-stone-950 rounded-xl">
                      <Clock className="w-4 h-4" />
                    </span>
                    <div>
                      <h4 className="text-xs font-bold uppercase tracking-wider text-amber-950">
                        Fluxo Comercial: Aguardando Pagamento
                      </h4>
                      <p className="text-[11px] text-amber-800">
                        Peças com <strong>reserva ativa no estoque</strong>. Confirme o recebimento para liquidar a venda.
                      </p>
                    </div>
                  </div>
                  <span className="font-serif font-bold text-amber-950 text-base">
                    R$ {order.totalAmount.toFixed(2)}
                  </span>
                </div>

                <div className="bg-white/80 border border-amber-200 rounded-2xl p-3.5 flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
                  <div className="space-y-1">
                    <label className="text-[10px] uppercase font-bold text-stone-500 block">
                      Forma de Pagamento Recebida
                    </label>
                    <select
                      value={selectedPaymentMode}
                      onChange={(e) => setSelectedPaymentMode(e.target.value)}
                      className="bg-white border border-stone-300 rounded-xl px-3 py-1.5 text-xs font-bold text-stone-800 focus:outline-none focus:border-stone-900"
                    >
                      <option value="PIX">⚡ PIX Instantâneo Recebido</option>
                      <option value="DINHEIRO">💵 Dinheiro em Espécie</option>
                      <option value="CARTAO_MAQUININHA">💳 Cartão Maquininha (Débito/Crédito)</option>
                      <option value="TRANSFERENCIA">🏦 Transferência Bancária / TED</option>
                    </select>
                  </div>

                  <button
                    disabled={isTransitioning}
                    onClick={handleConfirmPaidSale}
                    className="px-5 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold uppercase tracking-wider transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer ring-2 ring-emerald-300 shrink-0"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Confirmar Pagamento & Baixar Estoque (SALE)</span>
                  </button>
                </div>
              </div>
            )}

            {/* Post-Payment Success & WhatsApp Notification Banner */}
            {(order.status === "PAID" || order.status === "FULFILLMENT_PENDING" || order.status === "FULFILLED") && (
              <div className="bg-emerald-50/90 border border-emerald-300 rounded-3xl p-5 space-y-3 shadow-xs">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-emerald-600 text-white rounded-xl">
                      <Check className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-950">
                        Venda Liquidada & Estoque Baixado (SALE)
                      </h4>
                      <p className="text-[11px] text-emerald-800">
                        Garantia Digital: <strong className="font-mono">{order.warrantyCode || "Emitida"}</strong> • Total: R$ {order.totalAmount.toFixed(2)}
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={handleSendPaymentConfirmationWhatsApp}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-2 cursor-pointer shadow-xs transition-all"
                  >
                    <MessageCircle className="w-4 h-4" />
                    <span>{copiedPaymentWaMsg ? "Mensagem Copiada!" : "Notificar Cliente no WhatsApp"}</span>
                  </button>
                </div>
              </div>
            )}

            {/* Customer & Delivery Card */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Customer */}
              <div className="bg-stone-50 border border-stone-200 rounded-2xl p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400 flex items-center gap-1.5">
                    {order.customerSnapshot.personType === "PJ" ? (
                      <Building2 className="w-3.5 h-3.5 text-stone-600" />
                    ) : (
                      <User className="w-3.5 h-3.5 text-stone-600" />
                    )}
                    Cliente ({order.customerSnapshot.personType})
                  </span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-stone-200 text-stone-700">
                    {order.customerSnapshot.document || "Sem Documento"}
                  </span>
                </div>
                <div className="font-semibold text-sm text-stone-900">
                  {order.customerSnapshot.name}
                </div>
                <div className="text-xs text-stone-500 space-y-0.5">
                  <div>Email: {order.customerSnapshot.email || "Não informado"}</div>
                  <div>Fone: {order.customerSnapshot.phone || "Não informado"}</div>
                  {order.customerSnapshot.stateRegistration && (
                    <div>Inscrição Estadual: {order.customerSnapshot.stateRegistration}</div>
                  )}
                </div>

                {order.customerSnapshot.phone && (
                  <a
                    href={`https://wa.me/${order.customerSnapshot.phone.replace(/\D/g, "")}?text=Olá%20${encodeURIComponent(order.customerSnapshot.name)},%20seu%20pedido%20${order.orderNumber}%20na%20Lumina%20Semijoias%20está%20no%20status%20${STEP_LABELS[order.status]}!`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 hover:text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200 mt-1 cursor-pointer"
                  >
                    <Send className="w-3 h-3" />
                    <span>Abrir WhatsApp do Cliente</span>
                  </a>
                )}
              </div>

              {/* Delivery Address */}
              <div className="bg-stone-50 border border-stone-200 rounded-2xl p-4 space-y-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400 flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-stone-600" />
                  Endereço de Entrega
                </span>
                <div className="font-medium text-xs text-stone-900">
                  {order.shippingAddress.street}, {order.shippingAddress.number}
                  {order.shippingAddress.complement ? ` - ${order.shippingAddress.complement}` : ""}
                </div>
                <div className="text-xs text-stone-500">
                  {order.shippingAddress.neighborhood} • {order.shippingAddress.city}/{order.shippingAddress.state}
                </div>
                <div className="text-xs text-stone-500 font-mono">
                  CEP: {order.shippingAddress.zipCode}
                </div>
                {order.resellerName && (
                  <div className="pt-1 text-[11px] text-amber-800 font-semibold bg-amber-50/60 p-1.5 rounded-lg">
                    Atendido por: {order.resellerName} (Comissão: R$ {(order.resellerCommissionAmount || 0).toFixed(2)})
                  </div>
                )}
              </div>
            </div>

            {/* ERP Traceability & Identification Panel (Always available, with special highlights for WhatsApp) */}
            <div className={`rounded-2xl p-4 border ${order.channel === "WHATSAPP" ? "bg-emerald-50/60 border-emerald-200" : "bg-stone-50 border-stone-200"}`}>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className={`p-1.5 rounded-lg ${order.channel === "WHATSAPP" ? "bg-emerald-600 text-white" : "bg-stone-800 text-white"}`}>
                    {order.channel === "WHATSAPP" ? <MessageCircle className="w-4 h-4" /> : <Hash className="w-4 h-4" />}
                  </div>
                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-stone-900 flex items-center gap-1.5">
                      Rastreabilidade & Metadados ERP
                      {order.channel === "WHATSAPP" && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-900 border border-emerald-300">
                          Origem WhatsApp
                        </span>
                      )}
                    </h3>
                    <p className="text-[11px] text-stone-500">
                      Identificação estruturada para conciliação contábil, estoque e comissões.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    const traceText = `PEDIDO ${order.orderNumber}\nOrigem: ${order.channel}\nRef Externa: ${order.externalReference || "N/A"}\nOrganization ID: ${order.organizationId || "org-lumina-01"}\nProduto(s): ${order.items?.map(i => i.productSnapshot.sku).join(", ") || "N/A"}\nConsultora: ${order.resellerName || "Direto Loja"}\nCliente: ${order.customerSnapshot.name}`;
                    handleCopyTrace(traceText);
                  }}
                  className="px-2.5 py-1 text-xs font-semibold bg-white border border-stone-300 hover:bg-stone-100 text-stone-700 rounded-lg flex items-center gap-1 cursor-pointer transition-colors shadow-2xs"
                >
                  {copiedTrace ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedTrace ? "Copiado!" : "Copiar ERP Payload"}</span>
                </button>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 text-xs">
                <div className="bg-white/80 border border-stone-200/80 rounded-xl p-2.5">
                  <span className="text-[10px] uppercase font-bold text-stone-400 block">Organization ID</span>
                  <span className="font-mono font-semibold text-stone-900 text-[11px] truncate block" title={order.organizationId || "org-lumina-01"}>
                    {order.organizationId || "org-lumina-01"}
                  </span>
                </div>

                <div className="bg-white/80 border border-stone-200/80 rounded-xl p-2.5">
                  <span className="text-[10px] uppercase font-bold text-stone-400 block">Canal Origem</span>
                  <span className="font-mono font-semibold text-stone-900 text-[11px] block">
                    {order.channel}
                  </span>
                </div>

                <div className="bg-white/80 border border-stone-200/80 rounded-xl p-2.5">
                  <span className="text-[10px] uppercase font-bold text-stone-400 block">Ref. Externa</span>
                  <span className="font-mono font-bold text-emerald-700 text-[11px] block">
                    {order.externalReference || `WA-${new Date().getFullYear()}-${order.orderNumber.replace(/\D/g, "") || "1042"}`}
                  </span>
                </div>

                <div className="bg-white/80 border border-stone-200/80 rounded-xl p-2.5">
                  <span className="text-[10px] uppercase font-bold text-stone-400 block">SKU Principal</span>
                  <span className="font-mono font-bold text-stone-900 text-[11px] block truncate" title={order.items?.[0]?.productSnapshot?.sku || "N/A"}>
                    {order.items?.[0]?.productSnapshot?.sku || "ANEL-001"}
                  </span>
                </div>

                <div className="bg-white/80 border border-stone-200/80 rounded-xl p-2.5">
                  <span className="text-[10px] uppercase font-bold text-stone-400 block">Consultora</span>
                  <span className="font-medium text-stone-900 text-[11px] truncate block" title={order.resellerName || "Venda Direta"}>
                    {order.resellerName || "Maria Silva"}
                  </span>
                </div>

                <div className="bg-white/80 border border-stone-200/80 rounded-xl p-2.5">
                  <span className="text-[10px] uppercase font-bold text-stone-400 block">Cliente</span>
                  <span className="font-medium text-stone-900 text-[11px] truncate block" title={order.customerSnapshot?.name || "Cliente"}>
                    {order.customerSnapshot?.name || "João Santos"}
                  </span>
                </div>
              </div>

              {order.notes && (
                <div className="mt-2.5 pt-2 border-t border-stone-200/60 text-xs text-stone-600 flex items-start gap-1.5">
                  <span className="font-bold text-stone-700 shrink-0">Notas / Origem:</span>
                  <span>{order.notes}</span>
                </div>
              )}
            </div>

            {/* Items & Immutable Snapshots */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400">
                  Itens do Pedido ({order.items?.length || 0} produtos)
                </span>
                <span className="text-[10px] text-stone-500 font-mono">
                  Snapshot Histórico Imutável
                </span>
              </div>

              <div className="divide-y divide-stone-200 border border-stone-200 rounded-2xl overflow-hidden bg-white">
                {order.items?.map((item) => (
                  <div key={item.id} className="p-4 flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
                    <div className="flex items-center gap-3">
                      {item.productSnapshot.imageUrl && (
                        <img
                          src={item.productSnapshot.imageUrl}
                          alt={item.productSnapshot.name}
                          referrerPolicy="no-referrer"
                          className="w-12 h-12 rounded-xl object-cover border border-stone-200 shrink-0"
                        />
                      )}
                      <div>
                        <div className="font-semibold text-sm text-stone-900">
                          {item.productSnapshot.name}
                        </div>
                        <div className="text-xs text-stone-500 flex items-center gap-2">
                          <span className="font-mono font-bold text-stone-600">{item.productSnapshot.sku}</span>
                          <span>•</span>
                          <span>Banho: {item.productSnapshot.bath}</span>
                          <span>•</span>
                          <span>Garantia: {item.productSnapshot.warrantyMonths}m</span>
                        </div>

                        {item.customizationSpec && (
                          <div className="mt-1.5 text-xs text-amber-900 bg-amber-50 border border-amber-200 rounded-lg px-2.5 py-1 flex items-center gap-1.5">
                            <Sparkles className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                            <span>
                              Gravação: <strong>"{item.customizationSpec.engravingName}"</strong> ({item.customizationSpec.fontStyle}) • Corrente: {item.customizationSpec.chainLengthCm}cm
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="text-right sm:self-center">
                      <div className="text-xs text-stone-500">
                        {item.quantity} un x R$ {item.unitPrice.toFixed(2)}
                      </div>
                      <div className="font-serif font-bold text-stone-900 text-sm">
                        R$ {item.totalAmount.toFixed(2)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Financial Totals & Payments */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Payment Methods */}
              <div className="bg-stone-50 border border-stone-200 rounded-2xl p-4 space-y-3">
                <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400 flex items-center gap-1.5">
                  <CreditCard className="w-3.5 h-3.5 text-stone-600" />
                  Pagamentos & Cobranças
                </span>

                {order.payments && order.payments.length > 0 ? (
                  <div className="space-y-2">
                    {order.payments.map((p) => (
                      <div
                        key={p.id}
                        className="bg-white border border-stone-200 rounded-xl p-3 space-y-2 text-xs"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-stone-900">
                            {p.paymentMethod} {p.installments > 1 ? `(${p.installments}x)` : ""}
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              p.status === "PAID"
                                ? "bg-emerald-100 text-emerald-800"
                                : p.status === "FAILED"
                                ? "bg-rose-100 text-rose-800"
                                : "bg-amber-100 text-amber-800"
                            }`}
                          >
                            {p.status}
                          </span>
                        </div>
                        <div className="flex justify-between text-stone-500">
                          <span>Gateway: {p.gateway}</span>
                          <span className="font-serif font-bold text-stone-900">
                            R$ {p.amount.toFixed(2)}
                          </span>
                        </div>

                        {/* PIX Quick QR / Copy */}
                        {p.paymentMethod === "PIX" && p.pixCopyPaste && (
                          <div className="pt-2 border-t border-stone-100 space-y-2">
                            <div className="flex gap-2">
                              <button
                                onClick={() => handleCopyPix(p.pixCopyPaste!)}
                                className="flex-1 py-1.5 px-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[11px] font-bold flex items-center justify-center gap-1 cursor-pointer shadow-2xs"
                              >
                                {copiedPix ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                                <span>{copiedPix ? "PIX Copiado!" : "Copiar Código PIX"}</span>
                              </button>
                              {p.pixQrCodeUrl && (
                                <button
                                  onClick={() => setShowPixQr(!showPixQr)}
                                  className="py-1.5 px-2.5 bg-stone-900 hover:bg-stone-800 text-white rounded-lg text-[11px] font-bold flex items-center justify-center gap-1 cursor-pointer"
                                >
                                  <QrCode className="w-3.5 h-3.5" />
                                  <span>QR Code</span>
                                </button>
                              )}
                            </div>

                            {showPixQr && p.pixQrCodeUrl && (
                              <div className="text-center p-3 bg-white border border-stone-200 rounded-xl space-y-1">
                                <img
                                  src={p.pixQrCodeUrl}
                                  alt="PIX QR Code"
                                  className="w-36 h-36 mx-auto rounded-lg border border-stone-100"
                                />
                                <div className="text-[10px] text-stone-500 font-mono">
                                  Escaneie no app do seu banco
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-xs text-stone-500">Nenhum pagamento registrado ainda.</div>
                )}
              </div>

              {/* Order Financial Summary */}
              <div className="bg-stone-50 border border-stone-200 rounded-2xl p-4 space-y-2 text-xs">
                <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400 flex items-center gap-1.5">
                  <DollarSign className="w-3.5 h-3.5 text-stone-600" />
                  Resumo Financeiro
                </span>

                <div className="space-y-1.5 pt-1">
                  <div className="flex justify-between text-stone-600">
                    <span>Subtotal:</span>
                    <span>R$ {order.subtotalAmount.toFixed(2)}</span>
                  </div>
                  {order.discountAmount > 0 && (
                    <div className="flex justify-between text-emerald-700">
                      <span>Desconto Promocional:</span>
                      <span>- R$ {order.discountAmount.toFixed(2)}</span>
                    </div>
                  )}
                  {order.shippingAmount > 0 && (
                    <div className="flex justify-between text-stone-600">
                      <span>Frete / Entrega:</span>
                      <span>+ R$ {order.shippingAmount.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between font-bold text-stone-900 text-base pt-2 border-t border-stone-200">
                    <span>Total Final:</span>
                    <span className="font-serif">R$ {order.totalAmount.toFixed(2)}</span>
                  </div>
                </div>

                {order.warrantyCode && (
                  <div className="mt-3 p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4 text-emerald-600" />
                      <div>
                        <div className="text-[10px] uppercase font-bold text-emerald-900">
                          Garantia Digital Emitida
                        </div>
                        <div className="font-mono text-xs font-bold text-emerald-700">
                          {order.warrantyCode}
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => onIssueWarranty(order)}
                      className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-bold uppercase rounded-lg cursor-pointer"
                    >
                      Ver Certificado
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Audit & State Transitions History */}
            <div className="space-y-3">
              <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-stone-600" />
                Auditoria de Transições de Estado (FSM History)
              </span>

              <div className="bg-stone-50 border border-stone-200 rounded-2xl p-4 space-y-3 text-xs">
                {order.transitions && order.transitions.length > 0 ? (
                  order.transitions.map((t, idx) => (
                    <div
                      key={t.id || idx}
                      className="flex items-start gap-3 pb-3 border-b border-stone-200 last:border-none last:pb-0"
                    >
                      <div className="w-2 h-2 rounded-full bg-amber-500 mt-1.5 shrink-0" />
                      <div className="flex-1 space-y-0.5">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-stone-900">
                            {t.event} ({t.fromStatus} → {t.toStatus})
                          </span>
                          <span className="text-[10px] text-stone-400 font-mono">
                            {new Date(t.createdAt).toLocaleString("pt-BR")}
                          </span>
                        </div>
                        <div className="text-stone-600 text-[11px]">{t.reason}</div>
                        {t.operatorName && (
                          <div className="text-[10px] text-stone-400">
                            Por: {t.operatorName}
                          </div>
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-stone-400">Nenhuma transição registrada.</div>
                )}
              </div>
            </div>
          </div>

          {/* Action Control Bar (FSM Actions) */}
          <div className="p-4 border-t border-stone-200 bg-stone-50 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              {/* Negative Actions */}
              {!isTerminalNegative && order.status !== "FULFILLED" && (
                <button
                  disabled={isTransitioning}
                  onClick={() => handleAction("CANCEL_ORDER", "Cancelamento solicitado pelo gestor.")}
                  className="px-3 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-xs font-bold uppercase tracking-wider cursor-pointer"
                >
                  Cancelar Pedido
                </button>
              )}

              {(order.status === "PAID" || order.status === "FULFILLED") && (
                <button
                  disabled={isTransitioning}
                  onClick={() => handleAction("REFUND_ORDER", "Estorno total aprovado no painel.")}
                  className="px-3 py-2 bg-rose-100 hover:bg-rose-200 text-rose-900 border border-rose-300 rounded-xl text-xs font-bold uppercase tracking-wider cursor-pointer"
                >
                  Estornar Pagamento
                </button>
              )}

              {isTerminalNegative && (
                <button
                  disabled={isTransitioning}
                  onClick={() => handleAction("REOPEN_DRAFT", "Pedido reaberto para edição.")}
                  className="px-3 py-2 bg-stone-200 hover:bg-stone-300 text-stone-800 rounded-xl text-xs font-bold uppercase tracking-wider cursor-pointer flex items-center gap-1"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Reabrir Rascunho</span>
                </button>
              )}
            </div>

            {/* Positive Progressive Actions */}
            <div className="flex items-center gap-2">
              {order.status === "DRAFT" && (
                <button
                  disabled={isTransitioning}
                  onClick={() => handleAction("RESERVE_INVENTORY")}
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold uppercase tracking-wider cursor-pointer shadow-xs flex items-center gap-1.5"
                >
                  <PackageCheck className="w-4 h-4" />
                  <span>Reservar Estoque</span>
                </button>
              )}

              {(order.status === "INVENTORY_RESERVED" || order.status === "DRAFT") && (
                <button
                  disabled={isTransitioning}
                  onClick={() => handleAction("REQUEST_PAYMENT")}
                  className="px-4 py-2 bg-stone-900 hover:bg-stone-800 text-white rounded-xl text-xs font-bold uppercase tracking-wider cursor-pointer shadow-xs flex items-center gap-1.5"
                >
                  <CreditCard className="w-4 h-4" />
                  <span>Gerar Cobrança</span>
                </button>
              )}

              {(order.status === "AWAITING_PAYMENT" || order.status === "PAYMENT_PROCESSING" || order.status === "INVENTORY_RESERVED") && (
                <button
                  disabled={isTransitioning}
                  onClick={() => handleAction("CONFIRM_PAYMENT", "Pagamento liquidado no sistema.")}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold uppercase tracking-wider cursor-pointer shadow-xs flex items-center gap-1.5"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Confirmar Pagamento</span>
                </button>
              )}

              {order.status === "PAID" && (
                <button
                  disabled={isTransitioning}
                  onClick={() => handleAction("START_FULFILLMENT", "Pedido enviado para separação e embalagem.")}
                  className="px-4 py-2 bg-purple-700 hover:bg-purple-800 text-white rounded-xl text-xs font-bold uppercase tracking-wider cursor-pointer shadow-xs flex items-center gap-1.5"
                >
                  <Truck className="w-4 h-4" />
                  <span>Iniciar Separação</span>
                </button>
              )}

              {order.status === "FULFILLMENT_PENDING" && (
                <button
                  disabled={isTransitioning}
                  onClick={() => handleAction("COMPLETE_FULFILLMENT", "Pedido entregue ao destinatário final.")}
                  className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold uppercase tracking-wider cursor-pointer shadow-xs flex items-center gap-1.5"
                >
                  <Check className="w-4 h-4" />
                  <span>Concluir Entrega</span>
                </button>
              )}

              {order.status === "FULFILLED" && !order.warrantyCode && (
                <button
                  onClick={() => onIssueWarranty(order)}
                  className="px-4 py-2 bg-stone-900 hover:bg-stone-800 text-white rounded-xl text-xs font-bold uppercase tracking-wider cursor-pointer shadow-xs flex items-center gap-1.5"
                >
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  <span>Emitir Garantia QR</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {showPrintModal && (
        <OrderReceiptPrintModal
          order={order}
          onClose={() => setShowPrintModal(false)}
        />
      )}
    </>
  );
};
