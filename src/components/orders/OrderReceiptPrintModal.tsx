import React from "react";
import { Printer, X, ShieldCheck, QrCode, CheckCircle2 } from "lucide-react";
import { Order } from "../../types/order";

interface OrderReceiptPrintModalProps {
  order: Order;
  onClose: () => void;
}

export const OrderReceiptPrintModal: React.FC<OrderReceiptPrintModalProps> = ({
  order,
  onClose,
}) => {
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 bg-stone-950/70 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-stone-200 text-stone-900 space-y-6 animate-in fade-in zoom-in-95 duration-150">
        {/* Header Action Bar */}
        <div className="flex items-center justify-between pb-3 border-b border-stone-200">
          <div className="flex items-center gap-2">
            <Printer className="w-5 h-5 text-amber-700" />
            <h3 className="text-base font-serif italic font-bold text-stone-900">
              Comprovante de Venda / Pedido
            </h3>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="px-3 py-1.5 bg-stone-900 hover:bg-stone-800 text-white rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Imprimir</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-stone-400 hover:text-stone-700 rounded-lg hover:bg-stone-100 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Ticket Area */}
        <div className="p-6 bg-stone-50 border border-stone-300 rounded-2xl font-mono text-xs text-stone-800 space-y-4 shadow-inner print:p-0 print:border-none print:shadow-none">
          {/* Header Ticket */}
          <div className="text-center pb-3 border-b border-dashed border-stone-300 space-y-1">
            <div className="font-serif font-bold text-lg text-stone-900 tracking-wider">
              LUMINA SEMIJOIAS
            </div>
            <div className="text-[10px] text-stone-500 uppercase">
              Showroom Matriz & Atacado Limeira - SP
            </div>
            <div className="text-[10px] text-stone-500">
              CNPJ: 12.345.678/0001-90 • IE: 417.890.123.456
            </div>
            <div className="text-[10px] text-stone-500">
              WhatsApp: +55 (19) 98765-4321 • www.luminasemijoias.com.br
            </div>
          </div>

          {/* Order Details */}
          <div className="space-y-1 text-[11px] pb-3 border-b border-dashed border-stone-300">
            <div className="flex justify-between font-bold text-stone-900">
              <span>PEDIDO: {order.orderNumber}</span>
              <span>CANAL: {order.channel}</span>
            </div>
            <div className="flex justify-between text-stone-600">
              <span>DATA: {new Date(order.createdAt).toLocaleString("pt-BR")}</span>
              <span className="uppercase font-semibold text-emerald-700">STATUS: {order.status}</span>
            </div>
            {order.operatorName && (
              <div className="text-stone-500">OPERADOR: {order.operatorName}</div>
            )}
            {order.resellerName && (
              <div className="text-stone-500">CONSULTORA / REVENDEDORA: {order.resellerName}</div>
            )}
          </div>

          {/* Customer */}
          <div className="space-y-1 text-[11px] pb-3 border-b border-dashed border-stone-300">
            <div className="font-bold text-stone-900 uppercase">DADOS DO CLIENTE</div>
            <div>NOME: {order.customerSnapshot.name}</div>
            <div>DOC: {order.customerSnapshot.document}</div>
            <div>FONE: {order.customerSnapshot.phone}</div>
            <div>CIDADE: {order.shippingAddress.city} - {order.shippingAddress.state}</div>
          </div>

          {/* Items */}
          <div className="space-y-2 pb-3 border-b border-dashed border-stone-300">
            <div className="font-bold text-stone-900 uppercase text-[11px]">ITENS DO PEDIDO</div>
            <div className="space-y-1.5">
              {order.items?.map((item, idx) => (
                <div key={idx} className="space-y-0.5">
                  <div className="flex justify-between font-semibold text-stone-900">
                    <span className="truncate max-w-[240px]">
                      {item.quantity}x {item.productSnapshot.name}
                    </span>
                    <span>R$ {(item.unitPrice * item.quantity).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-[10px] text-stone-500">
                    <span>SKU: {item.productSnapshot.sku} ({item.productSnapshot.bath})</span>
                    <span>Un: R$ {item.unitPrice.toFixed(2)}</span>
                  </div>
                  {item.customizationSpec && (
                    <div className="text-[10px] text-amber-800 bg-amber-50/70 px-1 py-0.5 rounded">
                      Gravação: "{item.customizationSpec.engravingName}" ({item.customizationSpec.fontStyle})
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Totals */}
          <div className="space-y-1 text-[11px] pb-3 border-b border-dashed border-stone-300">
            <div className="flex justify-between text-stone-600">
              <span>Subtotal Itens:</span>
              <span>R$ {order.subtotalAmount.toFixed(2)}</span>
            </div>
            {order.discountAmount > 0 && (
              <div className="flex justify-between text-emerald-700">
                <span>Desconto Aplicado:</span>
                <span>- R$ {order.discountAmount.toFixed(2)}</span>
              </div>
            )}
            {order.shippingAmount > 0 && (
              <div className="flex justify-between text-stone-600">
                <span>Frete / Entrega:</span>
                <span>+ R$ {order.shippingAmount.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between font-bold text-stone-900 text-sm pt-1 border-t border-stone-200">
              <span>TOTAL A PAGAR:</span>
              <span>R$ {order.totalAmount.toFixed(2)}</span>
            </div>
          </div>

          {/* Payments */}
          <div className="space-y-1 text-[11px] pb-3 border-b border-dashed border-stone-300">
            <div className="font-bold text-stone-900 uppercase">FORMA DE PAGAMENTO</div>
            {order.payments && order.payments.length > 0 ? (
              order.payments.map((p, idx) => (
                <div key={idx} className="flex justify-between">
                  <span>{p.paymentMethod} {p.installments > 1 ? `(${p.installments}x)` : ""}:</span>
                  <span className="font-semibold">{p.status === "PAID" ? "LIQUIDADO" : "PENDENTE"} - R$ {p.amount.toFixed(2)}</span>
                </div>
              ))
            ) : (
              <div className="text-stone-500">Pagamento a combinar / no ato da entrega</div>
            )}
          </div>

          {/* Digital Warranty QR Stamp */}
          <div className="text-center pt-2 space-y-2">
            {order.warrantyCode ? (
              <div className="p-3 bg-white border border-stone-300 rounded-xl space-y-1">
                <div className="flex items-center justify-center gap-1 font-bold text-xs text-stone-900">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  <span>GARANTIA DIGITAL VÁLIDA: {order.warrantyCode}</span>
                </div>
                <p className="text-[9px] text-stone-500">
                  Semijoia com cobertura oficial de 12 meses para banho nobre e reposição de pedras.
                </p>
              </div>
            ) : (
              <div className="text-[10px] text-stone-500">
                Garantia digital será emitida automaticamente após confirmação de pagamento.
              </div>
            )}
            <div className="text-[9px] text-stone-400">
              Obrigado por escolher a Lumina Semijoias!
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex justify-end gap-3 pt-2">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-xl text-xs font-bold uppercase tracking-wider cursor-pointer"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
