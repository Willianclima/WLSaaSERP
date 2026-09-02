import React, { useState } from "react";
import {
  ArrowLeft,
  Search,
  Plus,
  Minus,
  Check,
  CreditCard,
  QrCode,
  DollarSign,
  Package,
  ShoppingBag,
  Sparkles,
  User,
  ShieldCheck,
  Send,
  X,
} from "lucide-react";
import { ProductItem, Customer } from "../types";

interface QuickNewSaleModalProps {
  isOpen: boolean;
  onClose: () => void;
  products: ProductItem[];
  customers: Customer[];
  onCompleteSale: (saleData: {
    customerName: string;
    customerPhone: string;
    deliveryMethod: string;
    deliveryAddress: string;
    items: { productId: string; name: string; quantity: number; unitPrice: number }[];
    totalAmount: number;
    paymentMethod: "PIX" | "CREDIT_CARD" | "DEBIT_CARD" | "CASH";
    notes?: string;
  }) => Promise<void>;
}

export const QuickNewSaleModal: React.FC<QuickNewSaleModalProps> = ({
  isOpen,
  onClose,
  products,
  customers,
  onCompleteSale,
}) => {
  const [currentStep, setCurrentStep] = useState<number>(1);

  // Step 1: Cliente & Entrega
  const [customerSearchQuery, setCustomerSearchQuery] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [deliveryMethod, setDeliveryMethod] = useState<string>("CORREIOS");
  const [deliveryAddress, setDeliveryAddress] = useState("");

  // Step 2: Produtos
  const [selectedItems, setSelectedItems] = useState<{ productId: string; quantity: number }[]>([]);
  const [productSearchQuery, setProductSearchQuery] = useState("");

  // Step 3: Pagamento
  const [paymentMethod, setPaymentMethod] = useState<"PIX" | "CREDIT_CARD" | "DEBIT_CARD" | "CASH">("PIX");
  const [installments, setInstallments] = useState(1);
  const [notes, setNotes] = useState("");

  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  // Products available
  const availableProducts = products.filter((p) => {
    const stock = p.availableStock !== undefined ? p.availableStock : (p.currentStock || 0);
    const matches =
      p.name.toLowerCase().includes(productSearchQuery.toLowerCase()) ||
      (p.sku || "").toLowerCase().includes(productSearchQuery.toLowerCase());
    return matches;
  });

  const handleAddItem = (productId: string) => {
    setSelectedItems((prev) => {
      const existing = prev.find((i) => i.productId === productId);
      if (existing) {
        return prev.map((i) => (i.productId === productId ? { ...i, quantity: i.quantity + 1 } : i));
      }
      return [...prev, { productId, quantity: 1 }];
    });
  };

  const handleRemoveItem = (productId: string) => {
    setSelectedItems((prev) => {
      const existing = prev.find((i) => i.productId === productId);
      if (existing && existing.quantity > 1) {
        return prev.map((i) => (i.productId === productId ? { ...i, quantity: i.quantity - 1 } : i));
      }
      return prev.filter((i) => i.productId !== productId);
    });
  };

  const calculateSubtotal = () => {
    return selectedItems.reduce((acc, item) => {
      const prod = products.find((p) => p.id === item.productId);
      return acc + (prod ? Number(prod.price || 0) * item.quantity : 0);
    }, 0);
  };

  const totalAmount = calculateSubtotal();

  const handleSelectExistingCustomer = (cust: Customer) => {
    setCustomerName(cust.name);
    setCustomerPhone(cust.phone || "");
    if (cust.address) {
      setDeliveryAddress(`${cust.address.street || ""}, ${cust.address.number || ""} - ${cust.address.neighborhood || ""}, ${cust.address.city || ""}/${cust.address.state || ""}`);
    }
    setCustomerSearchQuery("");
  };

  const handleNextStep = () => {
    if (currentStep === 1) {
      if (!customerName.trim()) {
        alert("Por favor, preencha o nome do cliente.");
        return;
      }
      setCurrentStep(2);
    } else if (currentStep === 2) {
      if (selectedItems.length === 0) {
        alert("Por favor, selecione ao menos uma peça.");
        return;
      }
      setCurrentStep(3);
    } else if (currentStep === 3) {
      setCurrentStep(4);
    }
  };

  const handlePrevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    } else {
      onClose();
    }
  };

  const handleConfirmOrder = async () => {
    setIsSubmitting(true);
    try {
      const itemsList = selectedItems.map((item) => {
        const prod = products.find((p) => p.id === item.productId)!;
        return {
          productId: prod.id,
          name: prod.name,
          quantity: item.quantity,
          unitPrice: Number(prod.price) || 0,
        };
      });

      await onCompleteSale({
        customerName: customerName.trim() || "Cliente",
        customerPhone: customerPhone.trim(),
        deliveryMethod,
        deliveryAddress: deliveryAddress.trim(),
        items: itemsList,
        totalAmount,
        paymentMethod,
        notes,
      });

      onClose();
      // Reset
      setCurrentStep(1);
      setSelectedItems([]);
      setCustomerName("");
      setCustomerPhone("");
      setDeliveryAddress("");
    } catch (err: any) {
      alert(err.message || "Erro ao criar pedido.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-fadeIn font-sans">
      <div className="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl border border-stone-200 relative my-6">
        {/* Header with Back Arrow + "Novo Pedido" */}
        <div className="flex items-center justify-between pb-5 border-b border-stone-100">
          <div className="flex items-center gap-3">
            <button
              onClick={handlePrevStep}
              className="p-2 rounded-xl text-stone-600 hover:bg-stone-100 transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h2 className="text-xl font-bold text-stone-900 tracking-tight">
              Novo Pedido
            </h2>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Stepper Navigation (1 Cliente, 2 Produtos, 3 Pagamento, 4 Resumo) */}
        <div className="py-5 border-b border-stone-100">
          <div className="flex items-center justify-between max-w-lg mx-auto">
            {/* Step 1 */}
            <div className="flex flex-col items-center gap-1.5">
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                  currentStep === 1
                    ? "bg-[#C88A2C] text-white shadow-xs"
                    : currentStep > 1
                    ? "bg-emerald-600 text-white"
                    : "bg-stone-100 text-stone-400"
                }`}
              >
                {currentStep > 1 ? <Check className="w-3.5 h-3.5" /> : "1"}
              </div>
              <span
                className={`text-[11px] font-semibold ${
                  currentStep === 1 ? "text-stone-900 font-bold" : "text-stone-400"
                }`}
              >
                Cliente
              </span>
            </div>

            <div className={`flex-1 h-0.5 mx-2 ${currentStep > 1 ? "bg-emerald-500" : "bg-stone-200"}`} />

            {/* Step 2 */}
            <div className="flex flex-col items-center gap-1.5">
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                  currentStep === 2
                    ? "bg-[#C88A2C] text-white shadow-xs"
                    : currentStep > 2
                    ? "bg-emerald-600 text-white"
                    : "bg-stone-100 text-stone-400"
                }`}
              >
                {currentStep > 2 ? <Check className="w-3.5 h-3.5" /> : "2"}
              </div>
              <span
                className={`text-[11px] font-semibold ${
                  currentStep === 2 ? "text-stone-900 font-bold" : "text-stone-400"
                }`}
              >
                Produtos
              </span>
            </div>

            <div className={`flex-1 h-0.5 mx-2 ${currentStep > 2 ? "bg-emerald-500" : "bg-stone-200"}`} />

            {/* Step 3 */}
            <div className="flex flex-col items-center gap-1.5">
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                  currentStep === 3
                    ? "bg-[#C88A2C] text-white shadow-xs"
                    : currentStep > 3
                    ? "bg-emerald-600 text-white"
                    : "bg-stone-100 text-stone-400"
                }`}
              >
                {currentStep > 3 ? <Check className="w-3.5 h-3.5" /> : "3"}
              </div>
              <span
                className={`text-[11px] font-semibold ${
                  currentStep === 3 ? "text-stone-900 font-bold" : "text-stone-400"
                }`}
              >
                Pagamento
              </span>
            </div>

            <div className={`flex-1 h-0.5 mx-2 ${currentStep > 3 ? "bg-emerald-500" : "bg-stone-200"}`} />

            {/* Step 4 */}
            <div className="flex flex-col items-center gap-1.5">
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                  currentStep === 4
                    ? "bg-[#C88A2C] text-white shadow-xs"
                    : "bg-stone-100 text-stone-400"
                }`}
              >
                4
              </div>
              <span
                className={`text-[11px] font-semibold ${
                  currentStep === 4 ? "text-stone-900 font-bold" : "text-stone-400"
                }`}
              >
                Resumo
              </span>
            </div>
          </div>
        </div>

        {/* STEP CONTENT */}
        <div className="py-6">
          {/* ========================================================================= */}
          {/* STEP 1: CLIENTE (EXACT WIREFRAME DESIGN)                                  */}
          {/* ========================================================================= */}
          {currentStep === 1 && (
            <div className="space-y-5 animate-fadeIn">
              <h3 className="text-sm font-bold text-stone-900">
                Cliente
              </h3>

              {/* Buscar cliente cadastrado (opcional) */}
              <div>
                <label className="text-xs font-semibold text-stone-600 block mb-1.5">
                  Buscar cliente cadastrado (opcional)
                </label>
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="Buscar por nome ou WhatsApp..."
                      value={customerSearchQuery}
                      onChange={(e) => setCustomerSearchQuery(e.target.value)}
                      className="w-full pl-9 pr-4 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs text-stone-900 focus:outline-none focus:border-stone-400"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setCustomerName("");
                      setCustomerPhone("");
                    }}
                    className="px-3 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-bold rounded-xl border border-stone-200 transition-colors flex items-center gap-1 cursor-pointer shrink-0"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Novo Cliente</span>
                  </button>
                </div>

                {/* Autocomplete list */}
                {customerSearchQuery && (
                  <div className="mt-2 bg-white border border-stone-200 rounded-xl p-2 shadow-lg max-h-36 overflow-y-auto space-y-1">
                    {customers
                      .filter(
                        (c) =>
                          c.name.toLowerCase().includes(customerSearchQuery.toLowerCase()) ||
                          (c.phone || "").includes(customerSearchQuery)
                      )
                      .slice(0, 4)
                      .map((c) => (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => handleSelectExistingCustomer(c)}
                          className="w-full text-left px-3 py-2 text-xs rounded-lg hover:bg-stone-50 flex items-center justify-between"
                        >
                          <span className="font-bold text-stone-800">{c.name}</span>
                          <span className="text-stone-400 font-mono">{c.phone}</span>
                        </button>
                      ))}
                  </div>
                )}
              </div>

              {/* Form Grid: Nome completo & WhatsApp */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="text-xs font-semibold text-stone-600 block mb-1.5">
                    Nome completo
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: Maria Fernandes"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-white border border-stone-200 rounded-xl text-xs text-stone-900 focus:outline-none focus:border-stone-400 shadow-2xs"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-stone-600 block mb-1.5">
                    WhatsApp
                  </label>
                  <input
                    type="text"
                    placeholder="(11) 99999-9999"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-white border border-stone-200 rounded-xl text-xs text-stone-900 focus:outline-none focus:border-stone-400 shadow-2xs"
                  />
                </div>
              </div>

              {/* Entrega (Radio buttons) */}
              <div className="space-y-2 pt-2">
                <label className="text-xs font-bold text-stone-900 block">
                  Entrega
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <label className="flex items-center gap-2.5 p-3 rounded-xl border border-stone-200 bg-white hover:bg-stone-50 text-xs font-medium text-stone-800 cursor-pointer">
                    <input
                      type="radio"
                      name="delivery"
                      checked={deliveryMethod === "SHOWROOM"}
                      onChange={() => setDeliveryMethod("SHOWROOM")}
                      className="text-amber-600 focus:ring-amber-500"
                    />
                    <span>Retirar no showroom</span>
                  </label>

                  <label className="flex items-center gap-2.5 p-3 rounded-xl border border-stone-200 bg-white hover:bg-stone-50 text-xs font-medium text-stone-800 cursor-pointer">
                    <input
                      type="radio"
                      name="delivery"
                      checked={deliveryMethod === "CORREIOS"}
                      onChange={() => setDeliveryMethod("CORREIOS")}
                      className="text-amber-600 focus:ring-amber-500"
                    />
                    <span>Correios / Sedex</span>
                  </label>

                  <label className="flex items-center gap-2.5 p-3 rounded-xl border border-stone-200 bg-white hover:bg-stone-50 text-xs font-medium text-stone-800 cursor-pointer">
                    <input
                      type="radio"
                      name="delivery"
                      checked={deliveryMethod === "MOTOBOY"}
                      onChange={() => setDeliveryMethod("MOTOBOY")}
                      className="text-amber-600 focus:ring-amber-500"
                    />
                    <span>Motoboy local</span>
                  </label>

                  <label className="flex items-center gap-2.5 p-3 rounded-xl border border-stone-200 bg-white hover:bg-stone-50 text-xs font-medium text-stone-800 cursor-pointer">
                    <input
                      type="radio"
                      name="delivery"
                      checked={deliveryMethod === "WHATSAPP"}
                      onChange={() => setDeliveryMethod("WHATSAPP")}
                      className="text-amber-600 focus:ring-amber-500"
                    />
                    <span>A combinar no WhatsApp</span>
                  </label>
                </div>
              </div>

              {/* Endereço de entrega */}
              <div>
                <label className="text-xs font-semibold text-stone-600 block mb-1.5">
                  Endereço de entrega
                </label>
                <textarea
                  rows={2}
                  placeholder="CEP, Rua, Número, Bairro, Cidade, UF"
                  value={deliveryAddress}
                  onChange={(e) => setDeliveryAddress(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-white border border-stone-200 rounded-xl text-xs text-stone-900 focus:outline-none focus:border-stone-400 shadow-2xs resize-none"
                />
              </div>

              {/* Continuar Button */}
              <div className="flex justify-end pt-3">
                <button
                  type="button"
                  onClick={handleNextStep}
                  className="flex items-center gap-2 px-6 py-2.5 bg-[#C88A2C] hover:bg-[#B37822] text-white text-xs font-bold rounded-xl shadow-xs transition-all active:scale-98 cursor-pointer"
                >
                  <span>Continuar</span>
                  <span>→</span>
                </button>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* STEP 2: PRODUTOS                                                          */}
          {/* ========================================================================= */}
          {currentStep === 2 && (
            <div className="space-y-4 animate-fadeIn">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-stone-900">
                  Selecionar Peças do Pedido
                </h3>
                <span className="text-xs text-stone-500">
                  {selectedItems.length} peça(s) no carrinho
                </span>
              </div>

              {/* Search product */}
              <div className="relative">
                <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Buscar peça por nome ou SKU..."
                  value={productSearchQuery}
                  onChange={(e) => setProductSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs text-stone-900 focus:outline-none focus:border-stone-400"
                />
              </div>

              {/* Product selection list */}
              <div className="max-h-60 overflow-y-auto space-y-2 border border-stone-200 rounded-2xl p-2 bg-stone-50/50">
                {availableProducts.slice(0, 10).map((prod) => {
                  const inCart = selectedItems.find((i) => i.productId === prod.id);
                  const qty = inCart ? inCart.quantity : 0;
                  return (
                    <div
                      key={prod.id}
                      className="p-2.5 bg-white rounded-xl border border-stone-200 flex items-center justify-between gap-3 shadow-2xs"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <img
                          src={prod.imageUrl}
                          alt={prod.name}
                          className="w-10 h-10 rounded-lg object-contain bg-stone-100 p-0.5 shrink-0"
                          referrerPolicy="no-referrer"
                        />
                        <div className="min-w-0">
                          <div className="text-xs font-bold text-stone-900 truncate">
                            {prod.name}
                          </div>
                          <div className="text-[10px] text-stone-400 font-mono">
                            {prod.sku} • R$ {Number(prod.price).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {qty > 0 && (
                          <div className="flex items-center gap-1.5 bg-stone-100 rounded-lg p-0.5">
                            <button
                              type="button"
                              onClick={() => handleRemoveItem(prod.id)}
                              className="p-1 rounded-md hover:bg-stone-200 text-stone-700"
                            >
                              <Minus className="w-3 h-3" />
                            </button>
                            <span className="text-xs font-bold px-1.5">{qty}</span>
                            <button
                              type="button"
                              onClick={() => handleAddItem(prod.id)}
                              className="p-1 rounded-md hover:bg-stone-200 text-stone-700"
                            >
                              <Plus className="w-3 h-3" />
                            </button>
                          </div>
                        )}

                        {qty === 0 && (
                          <button
                            type="button"
                            onClick={() => handleAddItem(prod.id)}
                            className="px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-900 text-xs font-bold rounded-lg border border-amber-200 transition-colors"
                          >
                            ＋ Adicionar
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Subtotal & Buttons */}
              <div className="flex items-center justify-between pt-3 border-t border-stone-100">
                <div>
                  <span className="text-xs text-stone-400 block">Subtotal</span>
                  <span className="text-lg font-bold text-stone-900">
                    R$ {totalAmount.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setCurrentStep(1)}
                    className="px-4 py-2 rounded-xl border border-stone-200 text-xs font-semibold text-stone-600 hover:bg-stone-50"
                  >
                    ← Voltar
                  </button>
                  <button
                    type="button"
                    onClick={handleNextStep}
                    className="px-6 py-2 bg-[#C88A2C] hover:bg-[#B37822] text-white text-xs font-bold rounded-xl shadow-xs transition-all active:scale-98"
                  >
                    Continuar →
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* STEP 3: PAGAMENTO                                                         */}
          {/* ========================================================================= */}
          {currentStep === 3 && (
            <div className="space-y-4 animate-fadeIn">
              <h3 className="text-sm font-bold text-stone-900">
                Forma de Pagamento
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setPaymentMethod("PIX")}
                  className={`p-3.5 rounded-2xl border text-left flex items-center gap-3 transition-all cursor-pointer ${
                    paymentMethod === "PIX"
                      ? "border-emerald-500 bg-emerald-50/50 ring-2 ring-emerald-200 text-emerald-950 font-bold"
                      : "border-stone-200 bg-white hover:bg-stone-50 text-stone-800"
                  }`}
                >
                  <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold">
                    <QrCode className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-xs font-bold">PIX (Instantâneo)</div>
                    <div className="text-[10px] text-emerald-700">5% de desconto automático</div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setPaymentMethod("CREDIT_CARD")}
                  className={`p-3.5 rounded-2xl border text-left flex items-center gap-3 transition-all cursor-pointer ${
                    paymentMethod === "CREDIT_CARD"
                      ? "border-amber-500 bg-amber-50/50 ring-2 ring-amber-200 text-amber-950 font-bold"
                      : "border-stone-200 bg-white hover:bg-stone-50 text-stone-800"
                  }`}
                >
                  <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center font-bold">
                    <CreditCard className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-xs font-bold">Cartão de Crédito</div>
                    <div className="text-[10px] text-stone-500">Até 6x sem juros</div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setPaymentMethod("CASH")}
                  className={`p-3.5 rounded-2xl border text-left flex items-center gap-3 transition-all cursor-pointer ${
                    paymentMethod === "CASH"
                      ? "border-stone-800 bg-stone-100 ring-2 ring-stone-300 text-stone-900 font-bold"
                      : "border-stone-200 bg-white hover:bg-stone-50 text-stone-800"
                  }`}
                >
                  <div className="w-9 h-9 rounded-xl bg-stone-200 text-stone-800 flex items-center justify-center font-bold">
                    <DollarSign className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-xs font-bold">Dinheiro / Presencial</div>
                    <div className="text-[10px] text-stone-500">Recebido no ato da entrega</div>
                  </div>
                </button>
              </div>

              {/* Notes */}
              <div>
                <label className="text-xs font-semibold text-stone-600 block mb-1.5">
                  Observações do Pedido (opcional)
                </label>
                <input
                  type="text"
                  placeholder="Ex: Embalagem para presente, laço dourado..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-white border border-stone-200 rounded-xl text-xs text-stone-900 focus:outline-none focus:border-stone-400 shadow-2xs"
                />
              </div>

              {/* Navigation buttons */}
              <div className="flex items-center justify-between pt-3 border-t border-stone-100">
                <button
                  type="button"
                  onClick={() => setCurrentStep(2)}
                  className="px-4 py-2 rounded-xl border border-stone-200 text-xs font-semibold text-stone-600 hover:bg-stone-50"
                >
                  ← Voltar
                </button>
                <button
                  type="button"
                  onClick={handleNextStep}
                  className="px-6 py-2 bg-[#C88A2C] hover:bg-[#B37822] text-white text-xs font-bold rounded-xl shadow-xs transition-all active:scale-98"
                >
                  Continuar →
                </button>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* STEP 4: RESUMO & CONFIRMAÇÃO                                              */}
          {/* ========================================================================= */}
          {currentStep === 4 && (
            <div className="space-y-4 animate-fadeIn">
              <h3 className="text-sm font-bold text-stone-900">
                Resumo do Pedido
              </h3>

              <div className="bg-stone-50 rounded-2xl p-4 border border-stone-200 space-y-3 text-xs">
                <div className="flex items-center justify-between pb-2 border-b border-stone-200">
                  <span className="text-stone-500">Cliente:</span>
                  <span className="font-bold text-stone-900">{customerName} ({customerPhone || "Sem WhatsApp"})</span>
                </div>

                <div className="flex items-center justify-between pb-2 border-b border-stone-200">
                  <span className="text-stone-500">Entrega:</span>
                  <span className="font-medium text-stone-800">{deliveryMethod} {deliveryAddress ? `• ${deliveryAddress}` : ""}</span>
                </div>

                <div className="flex items-center justify-between pb-2 border-b border-stone-200">
                  <span className="text-stone-500">Pagamento:</span>
                  <span className="font-bold text-stone-900">{paymentMethod}</span>
                </div>

                {/* Items List */}
                <div className="space-y-1 pt-1">
                  <span className="text-stone-400 text-[11px] block">Peças selecionadas:</span>
                  {selectedItems.map((item) => {
                    const prod = products.find((p) => p.id === item.productId);
                    return (
                      <div key={item.productId} className="flex items-center justify-between">
                        <span className="text-stone-700">{item.quantity}x {prod?.name}</span>
                        <span className="font-bold text-stone-900">
                          R$ {(Number(prod?.price || 0) * item.quantity).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                    );
                  })}
                </div>

                <div className="pt-2 border-t border-stone-200 flex items-center justify-between text-sm">
                  <span className="font-bold text-stone-900">Total a Pagar:</span>
                  <span className="text-lg font-bold text-emerald-800">
                    R$ {totalAmount.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>

              {/* Warranty Guarantee notice */}
              <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-xl flex items-center gap-2.5 text-xs text-amber-900">
                <ShieldCheck className="w-4 h-4 text-amber-700 shrink-0" />
                <span>
                  Certificado de Garantia Digital de 12 meses será gerado e enviado automaticamente via WhatsApp.
                </span>
              </div>

              {/* Confirmation Button */}
              <div className="flex items-center justify-between pt-3 border-t border-stone-100">
                <button
                  type="button"
                  onClick={() => setCurrentStep(3)}
                  className="px-4 py-2 rounded-xl border border-stone-200 text-xs font-semibold text-stone-600 hover:bg-stone-50"
                >
                  ← Voltar
                </button>
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={handleConfirmOrder}
                  className="flex items-center gap-2 px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs transition-all active:scale-98 cursor-pointer disabled:opacity-50"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>{isSubmitting ? "Gravando..." : "Confirmar Pedido & Gerar Garantia"}</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
