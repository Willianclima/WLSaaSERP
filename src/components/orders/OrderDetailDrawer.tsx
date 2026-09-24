import React, { useState } from "react";
import {
  X,
  Printer,
  Copy,
  Check,
  CreditCard,
  User,
  Truck,
  MessageCircle,
  Gem,
  AlertCircle,
  CheckCircle2,
  Clock,
  ChevronDown,
  ChevronUp,
  ShieldCheck,
  RotateCcw,
} from "lucide-react";
import {
  Order,
  OrderStatus,
  OrderEvent,
  OrderTransitionDTO,
} from "../../types/order";
import { OrderReceiptPrintModal } from "./OrderReceiptPrintModal";
import { whatsappOrderService } from "../../services/whatsappOrderService";
import { toast } from "../../utils/toast";

interface OrderDetailDrawerProps {
  order: Order;
  onClose: () => void;
  onTransition: (orderId: string, dto: OrderTransitionDTO) => Promise<void>;
  onIssueWarranty: (order: Order) => void;
}

export const OrderDetailDrawer: React.FC<OrderDetailDrawerProps> = ({
  order,
  onClose,
  onTransition,
  onIssueWarranty,
}) => {
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [copiedPix, setCopiedPix] = useState(false);
  const [showTechnicalDetails, setShowTechnicalDetails] = useState(false);
  const [selectedPaymentMode, setSelectedPaymentMode] = useState<string>("PIX");

  // Identificação do cliente e contato
  const customerName =
    order.customerSnapshot?.name || (order as any).customer?.name || (order as any).customerName || "Cliente";
  const customerPhone =
    order.customerSnapshot?.phone || (order as any).customer?.phone || (order as any).customerPhone || "";
  const customerDocument =
    order.customerSnapshot?.document || (order as any).customer?.document || "";

  // Status simplificados para a lojista
  const isAwaitingPayment = [
    "DRAFT",
    "PENDING",
    "PENDING_CONFIRMATION",
    "INVENTORY_RESERVED",
    "AWAITING_PAYMENT",
    "PAYMENT_PROCESSING",
  ].includes(order.status) && (order.paymentStatus !== "PAID" && (order as any).paymentStatus !== "CONFIRMADO");

  const isPaid =
    order.status === "PAID" ||
    order.status === "COMPLETED" ||
    order.status === "FULFILLED" ||
    order.status === "FULFILLMENT_PENDING" ||
    order.paymentStatus === "PAID" ||
    (order as any).paymentStatus === "CONFIRMADO";

  const isCancelled = ["CANCELED", "CANCELLED", "EXPIRED"].includes(order.status);

  // Ação 1: Confirmar Pagamento (aciona a FSM no backend, baixa estoque no PostgreSQL e emite garantia)
  const handleConfirmPaidSale = async () => {
    setIsTransitioning(true);
    try {
      await onTransition(order.id, {
        event: "CONFIRM_PAYMENT",
        operatorName: "Lojista (Vendas)",
        reason: `Pagamento recebido via ${selectedPaymentMode}. Estoque baixado e garantia emitida.`,
      });
      toast.success("Pagamento confirmado com sucesso! Peças baixadas do estoque e garantia ativada.");
    } catch (e: any) {
      toast.error(e.message || "Erro ao confirmar pagamento.");
    } finally {
      setIsTransitioning(false);
    }
  };

  // Ação 2: Falar no WhatsApp
  const handleOpenWhatsApp = () => {
    const msg = whatsappOrderService.formatPaymentConfirmationMessage({
      orderNumber: order.orderNumber,
      customerName,
      totalAmount: order.totalAmount,
      warrantyCode: order.warrantyCode,
      items: order.items,
      resellerName: order.resellerName,
    });

    if (customerPhone) {
      const url = whatsappOrderService.generateWhatsAppUrl(customerPhone, msg);
      window.open(url, "_blank");
    } else {
      navigator.clipboard.writeText(msg);
      toast.success("Mensagem do pedido copiada para a área de transferência!");
    }
  };

  // Ação 3: Cancelar Pedido (libera a reserva no backend)
  const handleCancelOrder = async () => {
    if (!window.confirm("Deseja realmente cancelar este pedido? O estoque reservado será liberado.")) {
      return;
    }
    setIsTransitioning(true);
    try {
      await onTransition(order.id, {
        event: "CANCEL",
        operatorName: "Lojista (Vendas)",
        reason: "Pedido cancelado manualmente pela lojista.",
      });
      toast.success("Pedido cancelado e peças liberadas de volta ao estoque.");
    } catch (e: any) {
      toast.error(e.message || "Erro ao cancelar pedido.");
    } finally {
      setIsTransitioning(false);
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex justify-end animate-fadeIn font-sans select-none">
        <div className="bg-white w-full max-w-xl h-full shadow-2xl flex flex-col justify-between overflow-y-auto text-stone-900 border-l border-stone-200">
          {/* Header Superior */}
          <div className="p-6 border-b border-stone-200 bg-stone-50 flex items-center justify-between sticky top-0 z-10">
            <div>
              <span className="text-[10px] font-extrabold uppercase tracking-widest text-amber-800 block">
                Detalhes do Pedido
              </span>
              <h2 className="text-xl sm:text-2xl font-serif font-bold text-stone-900">
                {order.orderNumber?.startsWith("#") ? order.orderNumber : `#${order.orderNumber || order.id.slice(-6)}`}
              </h2>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowPrintModal(true)}
                className="p-2.5 rounded-xl border border-stone-200 bg-white hover:bg-stone-100 text-stone-700 transition-colors cursor-pointer"
                title="Imprimir Comprovante do Pedido"
              >
                <Printer className="w-4 h-4" />
              </button>
              <button
                onClick={onClose}
                className="p-2.5 rounded-xl border border-stone-200 bg-white hover:bg-stone-100 text-stone-700 transition-colors cursor-pointer"
                title="Fechar"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Conteúdo Principal: Responde 3 Perguntas Essenciais */}
          <div className="p-6 space-y-6 flex-1">
            {/* ========================================================================= */}
            {/* PERGUNTA 1: QUEM E O QUÊ (CLIENTE & PEÇAS)                                 */}
            {/* ========================================================================= */}
            <div className="space-y-4">
              {/* Cliente */}
              <div className="p-4 rounded-2xl bg-stone-50 border border-stone-200/80 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-stone-900 text-amber-300 flex items-center justify-center font-bold text-sm shrink-0">
                    <User className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-stone-900">{customerName}</h3>
                    <p className="text-xs text-stone-500">
                      {customerPhone || "Sem telefone informado"}
                      {customerDocument ? ` • CPF: ${customerDocument}` : ""}
                    </p>
                  </div>
                </div>

                {customerPhone && (
                  <button
                    onClick={handleOpenWhatsApp}
                    className="p-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 transition-colors cursor-pointer"
                    title="Conversar com o cliente no WhatsApp"
                  >
                    <MessageCircle className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Peças do Pedido */}
              <div>
                <label className="block text-xs font-extrabold uppercase text-stone-500 mb-2">
                  Peças do Pedido
                </label>
                <div className="space-y-2">
                  {order.items && order.items.length > 0 ? (
                    order.items.map((item, idx) => (
                      <div
                        key={idx}
                        className="p-3.5 rounded-2xl bg-white border border-stone-200 flex items-center justify-between"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-900 flex items-center justify-center font-bold shrink-0">
                            <Gem className="w-5 h-5 text-amber-700" />
                          </div>
                          <div>
                            <h4 className="text-xs font-bold text-stone-900">
                              {item.productSnapshot?.name || item.name || "Semijoia Nobre"}
                            </h4>
                            <p className="text-[11px] text-stone-500">
                              {item.quantity} {item.quantity === 1 ? "unidade" : "unidades"}
                            </p>
                          </div>
                        </div>

                        <div className="text-right">
                          <div className="text-xs font-extrabold text-stone-900">
                            {(item.price * item.quantity).toLocaleString("pt-BR", {
                              style: "currency",
                              currency: "BRL",
                            })}
                          </div>
                          <div className="text-[10px] text-stone-400">
                            {item.price.toLocaleString("pt-BR", {
                              style: "currency",
                              currency: "BRL",
                            })} cada
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="p-3.5 rounded-2xl bg-stone-50 text-xs text-stone-500 text-center">
                      Nenhum item discriminado neste pedido.
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Divisor */}
            <div className="border-t border-stone-100" />

            {/* ========================================================================= */}
            {/* PERGUNTA 2: PAGAMENTO                                                     */}
            {/* ========================================================================= */}
            <div className="space-y-3">
              <label className="block text-xs font-extrabold uppercase text-stone-500">
                Pagamento
              </label>

              <div className="p-4 rounded-2xl bg-stone-50 border border-stone-200/80 flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    {isPaid ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Pagamento confirmado
                      </span>
                    ) : isCancelled ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-100 text-rose-800">
                        <AlertCircle className="w-3.5 h-3.5" />
                        Cancelado
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-900">
                        <Clock className="w-3.5 h-3.5" />
                        Aguardando pagamento
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-stone-500 mt-1">
                    Método: <span className="font-semibold text-stone-800">{order.paymentMethod || "PIX"}</span>
                  </p>
                </div>

                <div className="text-right">
                  <span className="text-[10px] text-stone-400 block uppercase font-bold">Total</span>
                  <span className="text-lg sm:text-xl font-extrabold text-stone-900">
                    {order.totalAmount.toLocaleString("pt-BR", {
                      style: "currency",
                      currency: "BRL",
                    })}
                  </span>
                </div>
              </div>

              {/* Seletor de forma de pagamento ao confirmar */}
              {isAwaitingPayment && (
                <div className="p-3.5 rounded-2xl bg-amber-50/60 border border-amber-200/70">
                  <span className="text-[11px] font-bold text-amber-900 block mb-1.5">
                    Receber via:
                  </span>
                  <div className="flex gap-2">
                    {["PIX", "CARTAO_CREDITO", "DINHEIRO"].map((m) => (
                      <button
                        key={m}
                        type="button"
                        onClick={() => setSelectedPaymentMode(m)}
                        className={`text-xs px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
                          selectedPaymentMode === m
                            ? "bg-stone-900 text-white shadow-xs"
                            : "bg-white text-stone-700 border border-stone-200"
                        }`}
                      >
                        {m === "CARTAO_CREDITO" ? "Cartão" : m}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Divisor */}
            <div className="border-t border-stone-100" />

            {/* ========================================================================= */}
            {/* PERGUNTA 3: ENTREGA                                                       */}
            {/* ========================================================================= */}
            <div className="space-y-3">
              <label className="block text-xs font-extrabold uppercase text-stone-500">
                Entrega
              </label>

              <div className="p-4 rounded-2xl bg-stone-50 border border-stone-200/80 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-stone-200 text-stone-800 flex items-center justify-center shrink-0">
                    <Truck className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-stone-900">
                      {(order as any).shippingMethod || "Motoboy / Retirada no Showroom"}
                    </h4>
                    <p className="text-[11px] text-stone-500">
                      {(order as any).shippingAddress || "Entrega local combinada com o cliente"}
                    </p>
                  </div>
                </div>

                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-stone-200 text-stone-800">
                  {order.fulfillmentStatus === "DELIVERED"
                    ? "Entregue"
                    : order.fulfillmentStatus === "SHIPPED"
                    ? "Em Trânsito"
                    : "Em Separação"}
                </span>
              </div>
            </div>

            {/* Accordion Colapsado: Detalhes Técnicos e Rastreabilidade */}
            <div className="pt-2">
              <button
                type="button"
                onClick={() => setShowTechnicalDetails(!showTechnicalDetails)}
                className="text-xs font-semibold text-stone-400 hover:text-stone-600 flex items-center gap-1.5 cursor-pointer"
              >
                <span>{showTechnicalDetails ? "− Ocultar auditoria técnica" : "+ Detalhes técnicos e auditoria"}</span>
                {showTechnicalDetails ? (
                  <ChevronUp className="w-3.5 h-3.5" />
                ) : (
                  <ChevronDown className="w-3.5 h-3.5" />
                )}
              </button>

              {showTechnicalDetails && (
                <div className="mt-2.5 p-3.5 rounded-2xl bg-stone-100 border border-stone-200 text-[11px] font-mono text-stone-600 space-y-1 animate-fadeIn">
                  <div>ID Interno: {order.id}</div>
                  <div>Garantia: {order.warrantyCode || "Emitida na baixa"}</div>
                  <div>FSM State: {order.status}</div>
                  <div>Criado em: {new Date(order.createdAt).toLocaleString("pt-BR")}</div>
                </div>
              )}
            </div>
          </div>

          {/* ========================================================================= */}
          {/* OS BOTÕES OPERACIONAIS DIRETOS (CONFIRMAR, WHATSAPP, CANCELAR)             */}
          {/* ========================================================================= */}
          <div className="p-6 border-t border-stone-200 bg-white space-y-2.5 sticky bottom-0">
            {isAwaitingPayment && (
              <button
                onClick={handleConfirmPaidSale}
                disabled={isTransitioning}
                className="w-full py-3.5 px-4 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md hover:shadow-lg transition-all active:scale-98 cursor-pointer flex items-center justify-center gap-2"
              >
                <CheckCircle2 className="w-4 h-4 stroke-[2.5]" />
                <span>{isTransitioning ? "Confirmando..." : "CONFIRMAR PAGAMENTO"}</span>
              </button>
            )}

            <button
              onClick={handleOpenWhatsApp}
              className="w-full py-3 px-4 rounded-2xl bg-stone-900 hover:bg-stone-800 text-white font-bold text-xs shadow-xs transition-all active:scale-98 cursor-pointer flex items-center justify-center gap-2"
            >
              <MessageCircle className="w-4 h-4 text-emerald-400" />
              <span>FALAR NO WHATSAPP</span>
            </button>

            {isAwaitingPayment && (
              <button
                onClick={handleCancelOrder}
                disabled={isTransitioning}
                className="w-full py-2.5 px-4 rounded-xl text-rose-600 hover:text-rose-700 hover:bg-rose-50 font-bold text-xs transition-colors cursor-pointer"
              >
                CANCELAR PEDIDO
              </button>
            )}
          </div>
        </div>
      </div>

      {showPrintModal && (
        <OrderReceiptPrintModal
          isOpen={showPrintModal}
          onClose={() => setShowPrintModal(false)}
          order={order}
        />
      )}
    </>
  );
};

export default OrderDetailDrawer;
