import React, { useState } from "react";
import {
  X,
  Plus,
  Trash2,
  Sparkles,
  ShoppingBag,
  User,
  Building2,
  CreditCard,
  Truck,
  DollarSign,
  QrCode,
  ShieldCheck,
  CheckCircle2,
  Store,
  MessageSquare,
  Users,
} from "lucide-react";
import {
  ProductItem,
  Customer,
  CreateOrderDTO,
  OrderChannel,
  PaymentMethod,
  CustomJewelryOrderSpec,
} from "../../types";

interface OrderCreationModalProps {
  products: ProductItem[];
  customers: Customer[];
  resellers: Array<{ id: string; name: string; commissionDirectRate: number }>;
  onClose: () => void;
  onSubmit: (dto: CreateOrderDTO) => Promise<void>;
}

export const OrderCreationModal: React.FC<OrderCreationModalProps> = ({
  products,
  customers,
  resellers,
  onClose,
  onSubmit,
}) => {
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>(
    customers[0]?.id || ""
  );
  const [channel, setChannel] = useState<OrderChannel>("PRESENTIAL_POS");
  const [selectedResellerId, setSelectedResellerId] = useState<string>("");

  // Items
  const [items, setItems] = useState<
    Array<{
      productId: string;
      quantity: number;
      unitPrice: number;
      discountAmount: number;
      customizationSpec?: CustomJewelryOrderSpec;
    }>
  >([
    {
      productId: products[0]?.id || "",
      quantity: 1,
      unitPrice: products[0]?.price || 199.9,
      discountAmount: 0,
    },
  ]);

  // Financials
  const [discountAmount, setDiscountAmount] = useState<number>(0);
  const [shippingAmount, setShippingAmount] = useState<number>(0);

  // Payments
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("PIX");
  const [installments, setInstallments] = useState<number>(1);

  // Address
  const selectedCustomer = customers.find((c) => c.id === selectedCustomerId);
  const [shippingAddress, setShippingAddress] = useState({
    recipientName: selectedCustomer?.fullName || selectedCustomer?.name || "Cliente Balcão",
    zipCode: "13480-000",
    street: "Rua do Comércio",
    number: "100",
    complement: "",
    neighborhood: "Centro",
    city: "Limeira",
    state: "SP",
    country: "BRA",
  });

  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Customization drawer toggle
  const [customizingItemIndex, setCustomizingItemIndex] = useState<number | null>(null);
  const [customSpec, setCustomSpec] = useState<CustomJewelryOrderSpec>({
    engravingName: "",
    fontStyle: "CURSIVA",
    gemStone: "ZIRCONIA_CRISTAL",
    bathFinish: "OURO_18K" as any,
    chainLengthCm: 45,
    giftBox: true,
  });

  // Calculate totals
  const subtotal = items.reduce((acc, i) => acc + (i.unitPrice * i.quantity - i.discountAmount), 0);
  const totalAmount = Math.max(0, subtotal + shippingAmount - discountAmount);

  // Update selected customer address if changed
  const handleCustomerChange = (id: string) => {
    setSelectedCustomerId(id);
    const c = customers.find((cust) => cust.id === id);
    if (c) {
      setShippingAddress((prev) => ({
        ...prev,
        recipientName: c.fullName || c.name || "Cliente",
      }));
    }
  };

  const handleAddItem = () => {
    if (products.length === 0) return;
    const firstProd = products[0];
    setItems((prev) => [
      ...prev,
      {
        productId: firstProd.id,
        quantity: 1,
        unitPrice: firstProd.price,
        discountAmount: 0,
      },
    ]);
  };

  const handleRemoveItem = (index: number) => {
    if (items.length <= 1) return;
    setItems((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleItemProductChange = (index: number, productId: string) => {
    const prod = products.find((p) => p.id === productId);
    if (!prod) return;
    setItems((prev) =>
      prev.map((item, idx) =>
        idx === index
          ? {
              ...item,
              productId,
              unitPrice: prod.promoPrice || prod.price,
            }
          : item
      )
    );
  };

  const handleSaveCustomization = () => {
    if (customizingItemIndex !== null) {
      setItems((prev) =>
        prev.map((item, idx) =>
          idx === customizingItemIndex
            ? { ...item, customizationSpec: customSpec.engravingName ? customSpec : undefined }
            : item
        )
      );
      setCustomizingItemIndex(null);
    }
  };

  const handleSubmitOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (items.length === 0) {
      alert("Adicione ao menos 1 item.");
      return;
    }

    setIsSubmitting(true);
    try {
      const orderDto: CreateOrderDTO = {
        customerId: selectedCustomerId,
        channel,
        items: items.map((i) => ({
          productId: i.productId,
          quantity: i.quantity,
          unitPrice: i.unitPrice,
          discountAmount: i.discountAmount,
          customizationSpec: i.customizationSpec,
        })),
        shippingAddress,
        shippingAmount,
        discountAmount,
        resellerId: selectedResellerId || undefined,
        payments: [
          {
            paymentMethod,
            amount: totalAmount,
            installments,
          },
        ],
        notes,
        initialStatus: "INVENTORY_RESERVED",
      };

      await onSubmit(orderDto);
      onClose();
    } catch (err: any) {
      alert(err.message || "Erro ao registrar pedido.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-stone-950/70 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-3xl w-full p-6 shadow-2xl border border-stone-200 text-stone-900 space-y-6 my-8 animate-in fade-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto">
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-4 border-b border-stone-200">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-stone-900 text-white rounded-2xl">
              <ShoppingBag className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-serif font-bold text-stone-900">
                Novo Pedido & Venda Omnichannel
              </h2>
              <p className="text-xs text-stone-500">
                Lançamento centralizado com reserva atômica de estoque e snapshot imutável.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-stone-400 hover:text-stone-700 hover:bg-stone-100 rounded-xl cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmitOrder} className="space-y-6">
          {/* Step 1: Customer & Channel */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Customer Selector */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-stone-500 block">
                Cliente Cadastrado (PF / PJ) *
              </label>
              <select
                value={selectedCustomerId}
                onChange={(e) => handleCustomerChange(e.target.value)}
                className="w-full bg-stone-50 border border-stone-300 rounded-xl px-3 py-2 text-xs text-stone-900 focus:outline-none focus:border-stone-400 font-medium"
              >
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.fullName || c.tradeName || c.companyName || c.name} ({c.personType} - {c.cpf || c.cnpj || "Sem doc"})
                  </option>
                ))}
              </select>
            </div>

            {/* Sales Channel */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-stone-500 block">
                Canal de Origem da Venda *
              </label>
              <select
                value={channel}
                onChange={(e) => setChannel(e.target.value as OrderChannel)}
                className="w-full bg-stone-50 border border-stone-300 rounded-xl px-3 py-2 text-xs text-stone-900 focus:outline-none focus:border-stone-400 font-medium"
              >
                <option value="PRESENTIAL_POS">PDV / Balcão Showroom (Presencial)</option>
                <option value="WHATSAPP">WhatsApp & Atendimento VIP</option>
                <option value="ECOMMERCE">Loja Virtual (E-commerce)</option>
                <option value="B2B_RESELLER">B2B / Atacado Revenda</option>
                <option value="CUSTOM_STUDIO">Studio de Personalização Sob Medida</option>
                <option value="CONSIGNMENT">Consignação Direta</option>
              </select>
            </div>
          </div>

          {/* Reseller Attribution (Optional) */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold uppercase tracking-wider text-stone-500 block">
              Consultora / Revendedora Vinculada (Comissão Automática)
            </label>
            <select
              value={selectedResellerId}
              onChange={(e) => setSelectedResellerId(e.target.value)}
              className="w-full bg-stone-50 border border-stone-300 rounded-xl px-3 py-2 text-xs text-stone-900 focus:outline-none focus:border-stone-400"
            >
              <option value="">Venda Direta da Matriz (Sem comissão externa)</option>
              {resellers.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name} — {r.commissionDirectRate}% de comissão
                </option>
              ))}
            </select>
          </div>

          {/* Step 2: Order Items Table */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-stone-500">
                Itens do Pedido ({items.length})
              </span>
              <button
                type="button"
                onClick={handleAddItem}
                className="px-2.5 py-1 bg-stone-100 hover:bg-stone-200 text-stone-800 rounded-lg text-xs font-semibold flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Adicionar Produto</span>
              </button>
            </div>

            <div className="space-y-2 border border-stone-200 rounded-2xl p-3 bg-stone-50/50">
              {items.map((item, idx) => {
                const prod = products.find((p) => p.id === item.productId);
                return (
                  <div
                    key={idx}
                    className="p-3 bg-white border border-stone-200 rounded-xl space-y-2 text-xs shadow-2xs"
                  >
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
                      <div className="md:col-span-5">
                        <select
                          value={item.productId}
                          onChange={(e) => handleItemProductChange(idx, e.target.value)}
                          className="w-full bg-stone-50 border border-stone-300 rounded-lg px-2.5 py-1.5 text-xs text-stone-900 font-medium"
                        >
                          {products.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.sku} - {p.name} (R$ {p.price.toFixed(2)})
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="md:col-span-2 flex items-center gap-1.5">
                        <span className="text-stone-400 text-[10px] uppercase font-bold">Qtd:</span>
                        <input
                          type="number"
                          min="1"
                          max="1000"
                          value={item.quantity}
                          onChange={(e) =>
                            setItems((prev) =>
                              prev.map((it, i) =>
                                i === idx ? { ...it, quantity: Number(e.target.value) || 1 } : it
                              )
                            )
                          }
                          className="w-16 bg-stone-50 border border-stone-300 rounded-lg px-2 py-1 text-center font-bold text-xs"
                        />
                      </div>

                      <div className="md:col-span-2 flex items-center gap-1.5">
                        <span className="text-stone-400 text-[10px] uppercase font-bold">Unit:</span>
                        <input
                          type="number"
                          step="0.01"
                          value={item.unitPrice}
                          onChange={(e) =>
                            setItems((prev) =>
                              prev.map((it, i) =>
                                i === idx ? { ...it, unitPrice: Number(e.target.value) || 0 } : it
                              )
                            )
                          }
                          className="w-20 bg-stone-50 border border-stone-300 rounded-lg px-2 py-1 text-right font-mono text-xs"
                        />
                      </div>

                      <div className="md:col-span-2 text-right font-serif font-bold text-stone-900 text-sm">
                        R$ {(item.unitPrice * item.quantity - item.discountAmount).toFixed(2)}
                      </div>

                      <div className="md:col-span-1 flex justify-end">
                        <button
                          type="button"
                          onClick={() => handleRemoveItem(idx)}
                          disabled={items.length <= 1}
                          className="text-stone-400 hover:text-rose-600 disabled:opacity-30 p-1 cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Customization Button */}
                    <div className="flex items-center justify-between pt-1 border-t border-stone-100 text-[11px]">
                      {item.customizationSpec ? (
                        <div className="text-amber-800 bg-amber-50 px-2 py-0.5 rounded flex items-center gap-1">
                          <Sparkles className="w-3 h-3" />
                          <span>Gravação: "{item.customizationSpec.engravingName}" ({item.customizationSpec.fontStyle})</span>
                        </div>
                      ) : (
                        <span className="text-stone-400">Peça padrão de catálogo</span>
                      )}

                      <button
                        type="button"
                        onClick={() => {
                          setCustomizingItemIndex(idx);
                          if (item.customizationSpec) setCustomSpec(item.customizationSpec);
                        }}
                        className="text-amber-700 hover:text-amber-800 font-semibold flex items-center gap-1 cursor-pointer"
                      >
                        <Sparkles className="w-3 h-3" />
                        <span>{item.customizationSpec ? "Editar Gravação" : "Personalizar Joia (Gravação)"}</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Customization Drawer / Inline Editor */}
          {customizingItemIndex !== null && (
            <div className="p-4 bg-amber-50/70 border border-amber-300 rounded-2xl space-y-3 animate-in fade-in">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-amber-900 flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-amber-700" />
                  Personalização Sob Medida (Item #{customizingItemIndex + 1})
                </span>
                <button
                  type="button"
                  onClick={() => setCustomizingItemIndex(null)}
                  className="text-amber-700 text-xs font-bold"
                >
                  ✕ Cancelar
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div>
                  <label className="text-[10px] font-bold uppercase text-amber-900 block">Texto da Gravação</label>
                  <input
                    type="text"
                    placeholder="Ex: Maria & João 2026"
                    value={customSpec.engravingName}
                    onChange={(e) => setCustomSpec({ ...customSpec, engravingName: e.target.value })}
                    className="w-full bg-white border border-amber-300 rounded-lg p-2 mt-1 text-xs"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase text-amber-900 block">Estilo de Fonte</label>
                  <select
                    value={customSpec.fontStyle}
                    onChange={(e) => setCustomSpec({ ...customSpec, fontStyle: e.target.value as any })}
                    className="w-full bg-white border border-amber-300 rounded-lg p-2 mt-1 text-xs"
                  >
                    <option value="CURSIVA">Cursiva Caligráfica</option>
                    <option value="CLASSICA">Clássica Serifada</option>
                    <option value="MINIMALISTA">Minimalista Moderna</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase text-amber-900 block">Pedra Cravejada</label>
                  <select
                    value={customSpec.gemStone}
                    onChange={(e) => setCustomSpec({ ...customSpec, gemStone: e.target.value as any })}
                    className="w-full bg-white border border-amber-300 rounded-lg p-2 mt-1 text-xs"
                  >
                    <option value="ZIRCONIA_CRISTAL">Zircônia Cristal 5A</option>
                    <option value="ESMERALDA_FUSION">Esmeralda Fusion</option>
                    <option value="TURMALINA_PARAIBA">Turmalina Paraíba</option>
                    <option value="RUBI_SYNTH">Rubi Synth</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end pt-1">
                <button
                  type="button"
                  onClick={handleSaveCustomization}
                  className="px-3 py-1.5 bg-amber-800 text-white rounded-xl text-xs font-bold uppercase cursor-pointer"
                >
                  Salvar Personalização
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Payment and Discounts */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-stone-500 block">
                Forma de Pagamento *
              </label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                className="w-full bg-stone-50 border border-stone-300 rounded-xl px-3 py-2 text-xs text-stone-900 font-medium"
              >
                <option value="PIX">PIX Instantâneo (QR Code)</option>
                <option value="CREDIT_CARD">Cartão de Crédito</option>
                <option value="DEBIT_CARD">Cartão de Débito</option>
                <option value="BOLETO">Boleto Bancário (Asaas)</option>
                <option value="CASH">Dinheiro em Espécie</option>
                <option value="STORE_CREDIT">Crediário Próprio</option>
              </select>
            </div>

            {paymentMethod === "CREDIT_CARD" && (
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-stone-500 block">
                  Parcelamento
                </label>
                <select
                  value={installments}
                  onChange={(e) => setInstallments(Number(e.target.value))}
                  className="w-full bg-stone-50 border border-stone-300 rounded-xl px-3 py-2 text-xs text-stone-900 font-medium"
                >
                  {[1, 2, 3, 4, 5, 6, 10, 12].map((num) => (
                    <option key={num} value={num}>
                      {num}x de R$ {(totalAmount / num).toFixed(2)} sem juros
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-stone-500 block">
                Desconto Comercial (R$)
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={discountAmount}
                onChange={(e) => setDiscountAmount(Number(e.target.value) || 0)}
                className="w-full bg-stone-50 border border-stone-300 rounded-xl px-3 py-2 text-xs text-stone-900 font-mono"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-stone-500 block">
                Frete / Taxa Entrega (R$)
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={shippingAmount}
                onChange={(e) => setShippingAmount(Number(e.target.value) || 0)}
                className="w-full bg-stone-50 border border-stone-300 rounded-xl px-3 py-2 text-xs text-stone-900 font-mono"
              />
            </div>
          </div>

          {/* Financial Summary Box */}
          <div className="p-4 bg-stone-900 text-white rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <div className="text-[10px] uppercase font-bold text-stone-400 tracking-wider">
                Total Faturado & Garantia de 12 Meses
              </div>
              <div className="text-2xl font-serif font-bold text-white mt-0.5">
                R$ {totalAmount.toFixed(2)}
              </div>
            </div>

            <div className="flex items-center gap-3 w-full sm:w-auto">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 sm:flex-initial px-4 py-2.5 bg-stone-800 hover:bg-stone-700 text-stone-300 rounded-xl text-xs font-bold uppercase tracking-wider cursor-pointer"
              >
                Cancelar
              </button>

              <button
                type="submit"
                disabled={isSubmitting}
                className="flex-1 sm:flex-initial px-6 py-2.5 bg-amber-500 hover:bg-amber-400 text-stone-950 rounded-xl text-xs font-bold uppercase tracking-wider cursor-pointer shadow-lg flex items-center justify-center gap-2"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>{isSubmitting ? "Gravando..." : "Emitir Pedido de Venda"}</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
