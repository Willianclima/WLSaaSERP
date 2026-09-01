import React, { useState } from "react";
import {
  X,
  Plus,
  Minus,
  Trash2,
  DollarSign,
  User,
  ShoppingBag,
  CreditCard,
  QrCode,
  Banknote,
  CheckCircle2,
  Sparkles,
} from "lucide-react";
import { ProductItem, Customer, UnifiedOrder } from "../types";

interface QuickNewSaleModalProps {
  isOpen: boolean;
  onClose: () => void;
  products: ProductItem[];
  customers: Customer[];
  onCompleteSale: (saleData: {
    customerName: string;
    customerPhone: string;
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
  const [selectedCustomerName, setSelectedCustomerName] = useState("");
  const [selectedCustomerPhone, setSelectedCustomerPhone] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"PIX" | "CREDIT_CARD" | "DEBIT_CARD" | "CASH">("PIX");
  const [selectedItems, setSelectedItems] = useState<{ productId: string; quantity: number }[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  // Filter available products
  const availableProducts = products.filter((p) => {
    const stock = p.availableStock !== undefined ? p.availableStock : (p.currentStock || 0);
    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) || (p.sku || "").toLowerCase().includes(searchQuery.toLowerCase());
    return stock > 0 && matchesSearch;
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

  const calculateTotal = () => {
    return selectedItems.reduce((acc, item) => {
      const prod = products.find((p) => p.id === item.productId);
      return acc + (prod ? (Number(prod.price) || 0) * item.quantity : 0);
    }, 0);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedItems.length === 0) {
      alert("Por favor, selecione pelo menos uma peça para a venda.");
      return;
    }

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
        customerName: selectedCustomerName.trim() || "Cliente Balcão",
        customerPhone: selectedCustomerPhone.trim() || "",
        items: itemsList,
        totalAmount: calculateTotal(),
        paymentMethod,
        notes: "Venda rápida registrada pela Dona da Loja",
      });

      onClose();
      setSelectedItems([]);
      setSelectedCustomerName("");
      setSelectedCustomerPhone("");
    } catch (err: any) {
      alert(err.message || "Erro ao registrar venda.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-fadeIn">
      <div className="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl border border-stone-200 relative my-8">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-full text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Title */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-11 h-11 rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold">
            <ShoppingBag className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl sm:text-2xl font-serif font-bold text-stone-900">
              Registrar Nova Venda
            </h2>
            <p className="text-xs text-stone-500">
              Baixa imediata de estoque e emissão de garantia digital
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Step 1: Select Products */}
          <div className="space-y-3">
            <label className="block text-xs font-extrabold uppercase tracking-wider text-stone-700">
              1. Selecione as Peças Vendidas
            </label>

            <input
              type="text"
              placeholder="🔍 Buscar por nome da semijoia ou SKU..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 text-xs focus:ring-2 focus:ring-amber-500 focus:outline-none"
            />

            {/* Product Quick Picker Grid */}
            <div className="max-h-48 overflow-y-auto border border-stone-200 rounded-2xl p-2 space-y-1.5 divide-y divide-stone-100">
              {availableProducts.length === 0 ? (
                <div className="text-center py-6 text-stone-400 text-xs">
                  Nenhum produto com estoque encontrado.
                </div>
              ) : (
                availableProducts.map((p) => {
                  const selected = selectedItems.find((i) => i.productId === p.id);
                  const stock = p.availableStock !== undefined ? p.availableStock : (p.currentStock || 0);

                  return (
                    <div
                      key={p.id}
                      className="pt-1.5 flex items-center justify-between gap-3 p-1.5 rounded-xl hover:bg-stone-50 transition-colors"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <img
                          src={p.primaryImageUrl || (p as any).imageUrl || "https://images.unsplash.com/photo-1605100804763-247f67b3557e?w=100&auto=format&fit=crop&q=80"}
                          alt={p.name}
                          className="w-9 h-9 rounded-lg object-cover border border-stone-200 shrink-0"
                          referrerPolicy="no-referrer"
                        />
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-stone-900 truncate">{p.name}</p>
                          <p className="text-[10px] text-stone-500">
                            R$ {Number(p.price || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })} • Estoque: {stock}
                          </p>
                        </div>
                      </div>

                      {selected ? (
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleRemoveItem(p.id)}
                            className="w-7 h-7 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-700 flex items-center justify-center font-bold cursor-pointer"
                          >
                            <Minus className="w-3.5 h-3.5" />
                          </button>
                          <span className="text-xs font-bold w-4 text-center">{selected.quantity}</span>
                          <button
                            type="button"
                            onClick={() => handleAddItem(p.id)}
                            disabled={selected.quantity >= stock}
                            className="w-7 h-7 rounded-lg bg-emerald-100 hover:bg-emerald-200 text-emerald-800 flex items-center justify-center font-bold disabled:opacity-40 cursor-pointer"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleAddItem(p.id)}
                          className="px-3 py-1.5 rounded-xl bg-stone-900 hover:bg-stone-800 text-amber-300 text-xs font-bold transition-all cursor-pointer"
                        >
                          + Adicionar
                        </button>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Step 2: Customer Data (Optional/Quick) */}
          <div className="space-y-3">
            <label className="block text-xs font-extrabold uppercase tracking-wider text-stone-700">
              2. Dados da Cliente (Opcional para Garantia)
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <input
                type="text"
                placeholder="Nome da cliente (ex: Fernanda Souza)"
                value={selectedCustomerName}
                onChange={(e) => setSelectedCustomerName(e.target.value)}
                className="px-3.5 py-2.5 rounded-xl border border-stone-200 text-xs focus:ring-2 focus:ring-amber-500 focus:outline-none"
              />
              <input
                type="tel"
                placeholder="WhatsApp (ex: 11 99999-9999)"
                value={selectedCustomerPhone}
                onChange={(e) => setSelectedCustomerPhone(e.target.value)}
                className="px-3.5 py-2.5 rounded-xl border border-stone-200 text-xs focus:ring-2 focus:ring-amber-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Step 3: Payment Method */}
          <div className="space-y-3">
            <label className="block text-xs font-extrabold uppercase tracking-wider text-stone-700">
              3. Forma de Pagamento
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                { id: "PIX", label: "PIX", icon: QrCode },
                { id: "CREDIT_CARD", label: "Cartão Crédito", icon: CreditCard },
                { id: "DEBIT_CARD", label: "Cartão Débito", icon: CreditCard },
                { id: "CASH", label: "Dinheiro", icon: Banknote },
              ].map((m) => {
                const Icon = m.icon;
                const active = paymentMethod === m.id;
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setPaymentMethod(m.id as any)}
                    className={`flex items-center justify-center gap-2 p-3 rounded-2xl border text-xs font-bold transition-all cursor-pointer ${
                      active
                        ? "border-emerald-600 bg-emerald-50 text-emerald-900 shadow-xs"
                        : "border-stone-200 hover:border-stone-300 text-stone-600"
                    }`}
                  >
                    <Icon className={`w-4 h-4 ${active ? "text-emerald-700" : "text-stone-400"}`} />
                    <span>{m.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Summary & Submit */}
          <div className="bg-stone-50 rounded-2xl p-4 border border-stone-200 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <span className="text-[10px] uppercase font-bold text-stone-500">Total a Receber</span>
              <div className="text-2xl font-serif font-bold text-stone-900">
                R$ {calculateTotal().toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
              </div>
              <span className="text-[11px] text-stone-500">
                {selectedItems.reduce((acc, i) => acc + i.quantity, 0)} peça(s) selecionada(s)
              </span>
            </div>

            <button
              type="submit"
              disabled={isSubmitting || selectedItems.length === 0}
              className="w-full sm:w-auto px-6 py-3.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm transition-all shadow-md active:scale-95 disabled:opacity-40 flex items-center justify-center gap-2 cursor-pointer"
            >
              {isSubmitting ? (
                <span>Gravando venda...</span>
              ) : (
                <>
                  <CheckCircle2 className="w-5 h-5" />
                  <span>⚡ Concluir Venda &amp; Baixar Estoque</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
