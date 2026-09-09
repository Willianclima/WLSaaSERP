import React, { useState, useMemo } from "react";
import {
  ShoppingBag,
  Search,
  Plus,
  Minus,
  Trash2,
  Check,
  MessageCircle,
  CheckCircle2,
  User,
  Phone,
  Truck,
  Sparkles,
  QrCode,
  CreditCard,
  DollarSign,
  ArrowRight,
  ShieldCheck,
  Copy,
  Receipt,
  RotateCcw,
  ExternalLink,
  ChevronDown,
  Clock,
  Send,
} from "lucide-react";
import { ProductItem, Customer, UnifiedOrder, TenantStore, StoreBrandingConfig } from "../types";

interface QuickSellScreenProps {
  products: ProductItem[];
  customers: Customer[];
  orders: UnifiedOrder[];
  tenant?: TenantStore;
  branding?: StoreBrandingConfig;
  onCompleteSale: (saleData: {
    customerName: string;
    customerPhone: string;
    items: { productId: string; name: string; quantity: number; unitPrice: number }[];
    totalAmount: number;
    subtotalAmount?: number;
    shippingAmount?: number;
    paymentMethod: "PIX" | "CREDIT_CARD" | "DEBIT_CARD" | "CASH";
    notes?: string;
  }) => Promise<any> | void;
  onNavigateTab: (tab: string) => void;
  onOpenOrderHistory?: () => void;
  initialSelectedProductId?: string;
}

interface CartItem {
  product: ProductItem;
  quantity: number;
  unitPrice: number;
}

export const QuickSellScreen: React.FC<QuickSellScreenProps> = ({
  products,
  customers,
  orders,
  tenant,
  branding,
  onCompleteSale,
  onNavigateTab,
  onOpenOrderHistory,
  initialSelectedProductId,
}) => {
  // ---------------------------------------------------------------------------
  // 1. STATE: CART / PRODUCTS
  // ---------------------------------------------------------------------------
  const [productSearch, setProductSearch] = useState("");
  const [cartItems, setCartItems] = useState<CartItem[]>(() => {
    if (initialSelectedProductId) {
      const prod = products.find((p) => p.id === initialSelectedProductId);
      if (prod) {
        return [{ product: prod, quantity: 1, unitPrice: prod.price || 99.9 }];
      }
    }
    // Default initial demonstration: ANEL-001 or first available product
    const defaultProd =
      products.find((p) => p.sku === "ANEL-001" || p.sku === "AN-00340") ||
      products[2] ||
      products[0];
    if (defaultProd) {
      return [{ product: defaultProd, quantity: 1, unitPrice: defaultProd.price || 99.9 }];
    }
    return [];
  });

  // ---------------------------------------------------------------------------
  // 2. STATE: CLIENTE
  // ---------------------------------------------------------------------------
  const [customerSearch, setCustomerSearch] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(() => {
    // Default to Maria Fernanda as per user wireframe or first customer
    const mf =
      customers.find(
        (c) =>
          c.name.toLowerCase().includes("maria fernanda") ||
          (c.fullName && c.fullName.toLowerCase().includes("maria fernanda"))
      ) || customers[0] || null;
    return mf;
  });
  const [manualCustomerName, setManualCustomerName] = useState("");
  const [manualCustomerPhone, setManualCustomerPhone] = useState("");
  const [isAddingNewCustomer, setIsAddingNewCustomer] = useState(false);

  // ---------------------------------------------------------------------------
  // 3. STATE: FRETE & FORMA DE PAGAMENTO
  // ---------------------------------------------------------------------------
  const [freightOption, setFreightOption] = useState<"standard" | "free" | "express" | "custom">("standard");
  const [customFreightValue, setCustomFreightValue] = useState<number>(18.9);
  const [paymentMethod, setPaymentMethod] = useState<"PIX" | "CREDIT_CARD" | "DEBIT_CARD" | "CASH">("PIX");
  const [saleNotes, setSaleNotes] = useState("");

  // UI Flow States
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [lastCompletedSale, setLastCompletedSale] = useState<{
    orderNumber: string;
    customerName: string;
    totalAmount: number;
    warrantyCode: string;
  } | null>(null);
  const [copiedMessageToast, setCopiedMessageToast] = useState(false);

  // ---------------------------------------------------------------------------
  // 4. CALCULATIONS
  // ---------------------------------------------------------------------------
  const freightValue = useMemo(() => {
    if (freightOption === "free") return 0;
    if (freightOption === "express") return 28.0;
    if (freightOption === "custom") return customFreightValue || 0;
    return 18.9; // Standard wireframe default
  }, [freightOption, customFreightValue]);

  const subtotal = useMemo(() => {
    return cartItems.reduce((acc, item) => acc + item.unitPrice * item.quantity, 0);
  }, [cartItems]);

  const totalAmount = useMemo(() => {
    return subtotal + (cartItems.length > 0 ? freightValue : 0);
  }, [subtotal, freightValue, cartItems.length]);

  // Filtered products for search
  const filteredProducts = useMemo(() => {
    if (!productSearch.trim()) return [];
    const query = productSearch.toLowerCase().trim();
    return products.filter(
      (p) =>
        p.name.toLowerCase().includes(query) ||
        (p.sku && p.sku.toLowerCase().includes(query)) ||
        (p.category && p.category.toLowerCase().includes(query))
    );
  }, [products, productSearch]);

  // Recent / Featured quick-pick products (as requested in wireframe: ANEL-001, COL-002, BR-003)
  const recentQuickPickProducts = useMemo(() => {
    // Look for matching or first few iconic items
    const picks = products.slice(0, 6);
    return picks;
  }, [products]);

  // Filtered customers for search
  const filteredCustomers = useMemo(() => {
    if (!customerSearch.trim()) return [];
    const query = customerSearch.toLowerCase().trim();
    return customers.filter(
      (c) =>
        c.name.toLowerCase().includes(query) ||
        (c.fullName && c.fullName.toLowerCase().includes(query)) ||
        (c.phone && c.phone.toLowerCase().includes(query)) ||
        (c.whatsapp && c.whatsapp.toLowerCase().includes(query))
    );
  }, [customers, customerSearch]);

  // ---------------------------------------------------------------------------
  // 5. CART MUTATIONS
  // ---------------------------------------------------------------------------
  const handleAddToCart = (product: ProductItem) => {
    setCartItems((prev) => {
      const existing = prev.find((item) => item.product.id === product.id);
      if (existing) {
        return prev.map((item) =>
          item.product.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [
        ...prev,
        {
          product,
          quantity: 1,
          unitPrice: product.promoPrice || product.price || 99.9,
        },
      ];
    });
  };

  const handleUpdateQuantity = (productId: string, delta: number) => {
    setCartItems((prev) => {
      return prev
        .map((item) => {
          if (item.product.id === productId) {
            const newQty = item.quantity + delta;
            return newQty > 0 ? { ...item, quantity: newQty } : null;
          }
          return item;
        })
        .filter(Boolean) as CartItem[];
    });
  };

  const handleRemoveFromCart = (productId: string) => {
    setCartItems((prev) => prev.filter((item) => item.product.id !== productId));
  };

  // ---------------------------------------------------------------------------
  // 6. WHATSAPP MESSAGE GENERATOR
  // ---------------------------------------------------------------------------
  const activeCustomerName = selectedCustomer
    ? selectedCustomer.name || selectedCustomer.fullName
    : manualCustomerName || "Cliente";

  const activeCustomerPhone = selectedCustomer
    ? selectedCustomer.whatsapp || selectedCustomer.phone
    : manualCustomerPhone || "";

  const generateWhatsAppMessage = () => {
    const storeName = branding?.logoText || tenant?.name || "Lumina Semijoias";
    let text = `Olá, *${activeCustomerName}*! ✨ Tudo bem?\n\n`;
    text += `Aqui está o resumo do seu pedido na *${storeName}*:\n\n`;

    cartItems.forEach((item) => {
      const skuText = item.product.sku ? ` (${item.product.sku})` : "";
      text += `💎 *${item.product.name}*${skuText}\n`;
      text += `   ${item.quantity}x de ${item.unitPrice.toLocaleString("pt-BR", {
        style: "currency",
        currency: "BRL",
      })} = ${(item.unitPrice * item.quantity).toLocaleString("pt-BR", {
        style: "currency",
        currency: "BRL",
      })}\n\n`;
    });

    if (freightValue > 0) {
      text += `📦 *Frete / Entrega:* ${freightValue.toLocaleString("pt-BR", {
        style: "currency",
        currency: "BRL",
      })}\n`;
    } else {
      text += `📦 *Frete:* Grátis / Retirada em mãos\n`;
    }

    text += `━━━━━━━━━━━━━━━━━━━━\n`;
    text += `💰 *TOTAL:* *${totalAmount.toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    })}*\n\n`;

    if (paymentMethod === "PIX") {
      text += `💳 *Pagamento via PIX:*\n`;
      text += `Chave: \`pix@luminasemijoias.com.br\` (Banco Itaú / Lumina Joias)\n\n`;
    } else if (paymentMethod === "CREDIT_CARD") {
      text += `💳 *Pagamento:* Cartão de Crédito (Link de pagamento seguro ou maquininha presencial)\n\n`;
    }

    text += `🛡️ *Garantia Digital:* Suas peças acompanham Certificado de Garantia de 12 meses direto no seu WhatsApp.\n\n`;
    text += `Podemos confirmar seu pedido? Basta me responder por aqui! 😊💍`;

    return text;
  };

  const handleSendWhatsApp = () => {
    if (cartItems.length === 0) {
      alert("Adicione pelo menos um produto antes de enviar o resumo.");
      return;
    }

    const message = generateWhatsAppMessage();
    // Clean phone number (remove nondigits)
    const cleanPhone = activeCustomerPhone.replace(/\D/g, "");
    const finalPhone = cleanPhone.length >= 10 ? (cleanPhone.startsWith("55") ? cleanPhone : `55${cleanPhone}`) : "";

    const waUrl = finalPhone
      ? `https://api.whatsapp.com/send?phone=${finalPhone}&text=${encodeURIComponent(message)}`
      : `https://api.whatsapp.com/send?text=${encodeURIComponent(message)}`;

    // Copy to clipboard for convenience
    if (navigator.clipboard) {
      navigator.clipboard.writeText(message);
      setCopiedMessageToast(true);
      setTimeout(() => setCopiedMessageToast(false), 3000);
    }

    // Open WhatsApp
    window.open(waUrl, "_blank", "noopener,noreferrer");
  };

  // ---------------------------------------------------------------------------
  // 7. COMPLETE SALE (REGISTRAR VENDA)
  // ---------------------------------------------------------------------------
  const handleRegisterSale = async () => {
    if (cartItems.length === 0) {
      alert("Selecione pelo menos um produto para registrar a venda.");
      return;
    }

    const clientName = activeCustomerName.trim() || "Cliente Balcão";
    const clientPhone = activeCustomerPhone.trim() || "(11) 99999-9999";

    setIsSubmitting(true);
    try {
      const result = await onCompleteSale({
        customerName: clientName,
        customerPhone: clientPhone,
        items: cartItems.map((item) => ({
          productId: item.product.id,
          name: item.product.name,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
        })),
        totalAmount,
        subtotalAmount: subtotal,
        shippingAmount: freightValue,
        paymentMethod,
        notes: saleNotes || `Venda rápida registrada via Balcão de Vendas. Frete: R$ ${freightValue.toFixed(2)}`,
      });

      const orderNumber = result?.orderNumber || `LUM-${Math.floor(1000 + Math.random() * 9000)}`;
      const warrantyCode = result?.warrantyCode || `GRT-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

      setLastCompletedSale({
        orderNumber,
        customerName: clientName,
        totalAmount,
        warrantyCode,
      });

      // Clear cart
      setCartItems([]);
    } catch (e) {
      console.error("Erro ao registrar venda:", e);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Reset after success
  const handleStartNewSale = () => {
    setLastCompletedSale(null);
    setCartItems([]);
    setCustomerSearch("");
    setIsAddingNewCustomer(false);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fadeIn pb-16 font-sans">
      {/* ========================================================================= */}
      {/* HEADER: 🛍️ VENDER + CONTADOR DE PEDIDOS                                   */}
      {/* ========================================================================= */}
      <div className="bg-white rounded-2xl p-5 border border-stone-200/90 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-2xl">🛍️</span>
              <h1 className="text-xl sm:text-2xl font-bold text-stone-900 tracking-tight">
                VENDER
              </h1>
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                Balcão Rápido
              </span>
            </div>
            <p className="text-xs sm:text-sm text-stone-500 mt-1">
              Monte o pedido, envie o resumo formatado no WhatsApp ou registre a venda em uma única tela.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => onNavigateTab("orders")}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-semibold rounded-xl transition-colors cursor-pointer"
            >
              <Clock className="w-3.5 h-3.5 text-stone-500" />
              <span>Ver Pedidos ({orders.length})</span>
            </button>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* SUCCESS MODAL / BANNER APÓS REGISTRAR VENDA                              */}
      {/* ========================================================================= */}
      {lastCompletedSale && (
        <div className="bg-emerald-50 border-2 border-emerald-300 rounded-2xl p-6 shadow-sm animate-scaleUp">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                <Check className="w-6 h-6 stroke-[2.5]" />
              </div>
              <div>
                <h3 className="text-base font-bold text-emerald-950">
                  Venda Registrada com Sucesso! 🎉
                </h3>
                <p className="text-xs text-emerald-800 mt-1">
                  O pedido <strong className="font-mono">{lastCompletedSale.orderNumber}</strong> para{" "}
                  <strong>{lastCompletedSale.customerName}</strong> foi registrado no sistema. Estoque baixado e Certificado de Garantia emitido.
                </p>

                <div className="flex flex-wrap items-center gap-3 mt-3 pt-3 border-t border-emerald-200/80 text-xs">
                  <div className="flex items-center gap-1 font-semibold text-emerald-900">
                    <span>Total pago:</span>
                    <span className="font-bold">
                      {lastCompletedSale.totalAmount.toLocaleString("pt-BR", {
                        style: "currency",
                        currency: "BRL",
                      })}
                    </span>
                  </div>
                  <span className="text-emerald-300">•</span>
                  <div className="flex items-center gap-1 font-semibold text-emerald-900">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-700" />
                    <span>Garantia:</span>
                    <span className="font-mono bg-emerald-100 px-1.5 py-0.5 rounded text-[11px]">
                      {lastCompletedSale.warrantyCode}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <button
              onClick={handleStartNewSale}
              className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold rounded-xl shadow-xs transition-all cursor-pointer shrink-0"
            >
              + Nova Venda
            </button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 1. SEÇÃO PRODUTO: BUSCAR PRODUTO OU SKU + PRODUTOS RECENTES              */}
      {/* ========================================================================= */}
      <div className="bg-white rounded-2xl p-5 sm:p-6 border border-stone-200/90 shadow-2xs space-y-4">
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-stone-500 mb-2">
            1. Escolha o Produto ou Peça
          </label>

          {/* INPUT: ┌────────────────────────────────────┐
                     │ 🔎 Buscar produto ou SKU            │
                     └────────────────────────────────────┘ */}
          <div className="relative">
            <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={productSearch}
              onChange={(e) => setProductSearch(e.target.value)}
              placeholder="🔎 Buscar produto ou SKU (ex: ANEL-001, Colar, Brinco...)"
              className="w-full pl-10 pr-10 py-3 bg-stone-50 hover:bg-stone-100/80 focus:bg-white border border-stone-200 focus:border-amber-500 rounded-xl text-sm font-medium text-stone-900 placeholder:text-stone-400 focus:outline-hidden focus:ring-3 focus:ring-amber-500/10 transition-all"
            />
            {productSearch && (
              <button
                onClick={() => setProductSearch("")}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 text-xs font-bold p-1"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* Dropdown / Search Results if query exists */}
        {productSearch.trim() !== "" && (
          <div className="border border-stone-200 rounded-xl overflow-hidden bg-stone-50/50 divide-y divide-stone-100 max-h-60 overflow-y-auto">
            {filteredProducts.length === 0 ? (
              <div className="p-4 text-center text-xs text-stone-500">
                Nenhuma peça encontrada com "{productSearch}".
              </div>
            ) : (
              filteredProducts.map((p) => {
                const isSelected = cartItems.some((i) => i.product.id === p.id);
                return (
                  <div
                    key={p.id}
                    onClick={() => handleAddToCart(p)}
                    className="p-3 flex items-center justify-between gap-3 hover:bg-amber-50/70 transition-colors cursor-pointer group"
                  >
                    <div className="flex items-center gap-3">
                      <img
                        src={p.imageUrl || "https://images.unsplash.com/photo-1605100804763-247f67b3557e?w=200"}
                        alt={p.name}
                        className="w-10 h-10 rounded-lg object-cover border border-stone-200"
                      />
                      <div>
                        <div className="text-xs font-bold text-stone-900 group-hover:text-amber-900">
                          {p.name}
                        </div>
                        <div className="text-[11px] text-stone-500 flex items-center gap-2">
                          <span className="font-mono font-semibold text-stone-600">{p.sku}</span>
                          <span>•</span>
                          <span>Estoque: {p.stockAvailable ?? 1} un</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="text-xs font-bold text-stone-900">
                        {(p.price || 0).toLocaleString("pt-BR", {
                          style: "currency",
                          currency: "BRL",
                        })}
                      </span>
                      <button
                        type="button"
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                          isSelected
                            ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                            : "bg-stone-900 text-white hover:bg-amber-600"
                        }`}
                      >
                        {isSelected ? "Adicionar +1" : "Selecionar +"}
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* ===================================================================== */}
        {/* PRODUTOS RECENTES: [ FOTO ] [ FOTO ] [ FOTO ]                        */}
        {/*                    ANEL-001     COL-002     BR-003                   */}
        {/*                    R$ 99,90     R$189,90     R$89,90                 */}
        {/* ===================================================================== */}
        <div>
          <div className="flex items-center justify-between mb-2.5">
            <span className="text-xs font-semibold text-stone-600">
              Produtos recentes da maleta
            </span>
            <span className="text-[11px] text-stone-400">
              Clique para adicionar ao pedido
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
            {recentQuickPickProducts.map((prod) => {
              const inCartItem = cartItems.find((i) => i.product.id === prod.id);
              const isSelected = !!inCartItem;

              return (
                <div
                  key={prod.id}
                  onClick={() => handleAddToCart(prod)}
                  className={`group relative rounded-xl border p-2.5 text-center transition-all cursor-pointer flex flex-col justify-between ${
                    isSelected
                      ? "border-emerald-500 bg-emerald-50/50 shadow-xs ring-2 ring-emerald-400/20"
                      : "border-stone-200 bg-stone-50/40 hover:bg-white hover:border-amber-300 hover:shadow-2xs"
                  }`}
                >
                  {/* Badge if selected */}
                  {isSelected && (
                    <span className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-emerald-600 text-white text-[10px] font-bold rounded-full flex items-center justify-center shadow-xs">
                      {inCartItem.quantity}
                    </span>
                  )}

                  {/* FOTO */}
                  <div className="w-full aspect-square rounded-lg overflow-hidden bg-stone-200/80 mb-2 border border-stone-100">
                    <img
                      src={
                        prod.imageUrl ||
                        "https://images.unsplash.com/photo-1605100804763-247f67b3557e?w=300"
                      }
                      alt={prod.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                    />
                  </div>

                  {/* SKU & NAME */}
                  <div>
                    <div className="text-[10px] font-mono font-bold text-stone-500 uppercase tracking-tight">
                      {prod.sku || "PEÇA"}
                    </div>
                    <div className="text-[11px] font-semibold text-stone-800 line-clamp-1 mt-0.5">
                      {prod.name}
                    </div>
                  </div>

                  {/* PRICE */}
                  <div className="mt-1.5 pt-1.5 border-t border-stone-200/60 flex items-center justify-between">
                    <span className="text-xs font-bold text-stone-900">
                      {(prod.promoPrice || prod.price || 99.9).toLocaleString("pt-BR", {
                        style: "currency",
                        currency: "BRL",
                      })}
                    </span>
                    <span className="w-5 h-5 rounded-md bg-stone-200 group-hover:bg-amber-500 group-hover:text-white text-stone-600 flex items-center justify-center text-[10px] font-bold transition-colors">
                      +
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. SEÇÃO CLIENTE: [ 🔎 Buscar cliente ] + Maria Fernanda                */}
      {/* ========================================================================= */}
      <div className="bg-white rounded-2xl p-5 sm:p-6 border border-stone-200/90 shadow-2xs space-y-4">
        <div className="flex items-center justify-between">
          <label className="text-xs font-bold uppercase tracking-wider text-stone-500">
            2. Cliente
          </label>
          <button
            onClick={() => {
              setIsAddingNewCustomer(!isAddingNewCustomer);
              if (!isAddingNewCustomer) setSelectedCustomer(null);
            }}
            className="text-xs font-bold text-amber-700 hover:text-amber-900 transition-colors cursor-pointer"
          >
            {isAddingNewCustomer ? "Buscar cliente existente" : "+ Digitar novo cliente"}
          </button>
        </div>

        {!isAddingNewCustomer ? (
          <div>
            {/* Search Input */}
            <div className="relative">
              <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={customerSearch}
                onChange={(e) => setCustomerSearch(e.target.value)}
                placeholder="🔎 Buscar cliente pelo nome ou WhatsApp..."
                className="w-full pl-10 pr-10 py-2.5 bg-stone-50 hover:bg-stone-100/80 focus:bg-white border border-stone-200 focus:border-amber-500 rounded-xl text-sm font-medium text-stone-900 placeholder:text-stone-400 focus:outline-hidden focus:ring-3 focus:ring-amber-500/10 transition-all"
              />
              {customerSearch && (
                <button
                  onClick={() => setCustomerSearch("")}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 text-xs font-bold p-1"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Dropdown if search query */}
            {customerSearch.trim() !== "" && (
              <div className="mt-2 border border-stone-200 rounded-xl overflow-hidden bg-white shadow-sm divide-y divide-stone-100 max-h-48 overflow-y-auto">
                {filteredCustomers.length === 0 ? (
                  <div className="p-3 text-center text-xs text-stone-500">
                    Nenhum cliente encontrado com esse nome.
                  </div>
                ) : (
                  filteredCustomers.map((cust) => (
                    <div
                      key={cust.id}
                      onClick={() => {
                        setSelectedCustomer(cust);
                        setCustomerSearch("");
                      }}
                      className="p-2.5 flex items-center justify-between hover:bg-amber-50/80 transition-colors cursor-pointer"
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-full bg-stone-200 text-stone-700 flex items-center justify-center font-bold text-xs">
                          {cust.name.charAt(0)}
                        </div>
                        <div>
                          <div className="text-xs font-bold text-stone-900">{cust.name}</div>
                          <div className="text-[11px] text-stone-500">
                            {cust.whatsapp || cust.phone || "Sem WhatsApp"}
                          </div>
                        </div>
                      </div>
                      <span className="text-xs font-bold text-amber-700">Selecionar</span>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* Quick Customer Pills */}
            <div className="flex items-center gap-1.5 flex-wrap mt-2.5">
              <span className="text-[11px] font-semibold text-stone-400 mr-1">
                Frequentes:
              </span>
              {customers.slice(0, 4).map((c) => (
                <button
                  key={c.id}
                  onClick={() => setSelectedCustomer(c)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                    selectedCustomer?.id === c.id
                      ? "bg-stone-900 text-white font-bold"
                      : "bg-stone-100 hover:bg-stone-200 text-stone-700"
                  }`}
                >
                  {c.name.split(" ")[0]}
                </button>
              ))}
            </div>

            {/* CLIENTE SELECIONADO CARD */}
            {selectedCustomer && (
              <div className="mt-3.5 p-3.5 bg-amber-50/60 rounded-xl border border-amber-200/80 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-amber-600 text-white flex items-center justify-center font-bold text-sm shadow-2xs">
                    {selectedCustomer.name.charAt(0)}
                  </div>
                  <div>
                    <div className="text-sm font-bold text-stone-900">
                      {selectedCustomer.name || selectedCustomer.fullName}
                    </div>
                    <div className="text-xs text-stone-600 flex items-center gap-1.5 mt-0.5">
                      <Phone className="w-3 h-3 text-emerald-600" />
                      <span>WhatsApp:</span>
                      <strong className="font-medium text-stone-800">
                        {selectedCustomer.whatsapp || selectedCustomer.phone || "(19) 99876-1234"}
                      </strong>
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => setSelectedCustomer(null)}
                  className="text-xs font-semibold text-stone-500 hover:text-stone-800 px-2 py-1 rounded hover:bg-amber-100 transition-colors cursor-pointer"
                >
                  Trocar
                </button>
              </div>
            )}
          </div>
        ) : (
          /* NOVO CLIENTE RÁPIDO */
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 bg-stone-50 rounded-xl border border-stone-200">
            <div>
              <label className="block text-[11px] font-bold text-stone-600 mb-1">
                Nome da Cliente
              </label>
              <input
                type="text"
                value={manualCustomerName}
                onChange={(e) => setManualCustomerName(e.target.value)}
                placeholder="Ex: Maria Fernanda"
                className="w-full px-3 py-2 bg-white border border-stone-200 rounded-lg text-xs font-medium text-stone-900 focus:outline-hidden focus:ring-2 focus:ring-amber-500/20"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-stone-600 mb-1">
                WhatsApp com DDD
              </label>
              <input
                type="text"
                value={manualCustomerPhone}
                onChange={(e) => setManualCustomerPhone(e.target.value)}
                placeholder="Ex: (19) 99876-1234"
                className="w-full px-3 py-2 bg-white border border-stone-200 rounded-lg text-xs font-medium text-stone-900 focus:outline-hidden focus:ring-2 focus:ring-amber-500/20"
              />
            </div>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* 3. SEÇÃO RESUMO: PRODUTOS SELECIONADOS + FRETE + TOTAL                    */}
      {/* ========================================================================= */}
      <div className="bg-white rounded-2xl p-5 sm:p-6 border border-stone-200/90 shadow-2xs space-y-4">
        <label className="block text-xs font-bold uppercase tracking-wider text-stone-500">
          3. Resumo do Pedido
        </label>

        {/* ITENS DO CARRINHO */}
        {cartItems.length === 0 ? (
          <div className="p-6 text-center border-2 border-dashed border-stone-200 rounded-xl">
            <ShoppingBag className="w-8 h-8 text-stone-300 mx-auto mb-1.5" />
            <p className="text-xs font-semibold text-stone-600">
              Nenhuma peça adicionada ainda
            </p>
            <p className="text-[11px] text-stone-400 mt-0.5">
              Clique em um dos produtos recentes acima ou use o campo de busca.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-stone-100">
            {cartItems.map((item) => (
              <div
                key={item.product.id}
                className="py-3 flex items-center justify-between gap-3"
              >
                {/* Product Info */}
                <div className="flex items-center gap-3 min-w-0">
                  <img
                    src={
                      item.product.imageUrl ||
                      "https://images.unsplash.com/photo-1605100804763-247f67b3557e?w=200"
                    }
                    alt={item.product.name}
                    className="w-10 h-10 rounded-lg object-cover border border-stone-200 shrink-0"
                  />
                  <div className="min-w-0">
                    <div className="text-xs sm:text-sm font-bold text-stone-900 truncate">
                      {item.product.name}
                    </div>
                    <div className="text-[11px] text-stone-500 font-mono">
                      {item.product.sku || "SKU"}
                    </div>
                  </div>
                </div>

                {/* Qty & Price */}
                <div className="flex items-center gap-3 sm:gap-6 shrink-0">
                  {/* Quantity Controls */}
                  <div className="flex items-center border border-stone-200 rounded-lg bg-stone-50 overflow-hidden">
                    <button
                      onClick={() => handleUpdateQuantity(item.product.id, -1)}
                      className="w-7 h-7 flex items-center justify-center text-stone-600 hover:bg-stone-200 transition-colors cursor-pointer"
                    >
                      <Minus className="w-3 h-3" />
                    </button>
                    <span className="w-8 text-center text-xs font-bold text-stone-900 font-mono">
                      {item.quantity}x
                    </span>
                    <button
                      onClick={() => handleUpdateQuantity(item.product.id, 1)}
                      className="w-7 h-7 flex items-center justify-center text-stone-600 hover:bg-stone-200 transition-colors cursor-pointer"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>

                  {/* Subtotal */}
                  <div className="w-20 text-right text-xs sm:text-sm font-bold text-stone-900">
                    {(item.unitPrice * item.quantity).toLocaleString("pt-BR", {
                      style: "currency",
                      currency: "BRL",
                    })}
                  </div>

                  {/* Remove */}
                  <button
                    onClick={() => handleRemoveFromCart(item.product.id)}
                    className="text-stone-300 hover:text-rose-600 transition-colors p-1 cursor-pointer"
                    title="Remover peça"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* FRETE SELECTOR */}
        <div className="pt-3 border-t border-stone-100">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
            <span className="text-xs font-semibold text-stone-700 flex items-center gap-1.5">
              <Truck className="w-3.5 h-3.5 text-stone-500" />
              <span>Frete / Entrega</span>
            </span>

            {/* Freight Options Pills */}
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setFreightOption("standard")}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  freightOption === "standard"
                    ? "bg-amber-100 text-amber-900 border border-amber-300"
                    : "bg-stone-100 text-stone-600 hover:bg-stone-200"
                }`}
              >
                Padrão (R$ 18,90)
              </button>
              <button
                onClick={() => setFreightOption("free")}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  freightOption === "free"
                    ? "bg-emerald-100 text-emerald-900 border border-emerald-300"
                    : "bg-stone-100 text-stone-600 hover:bg-stone-200"
                }`}
              >
                Grátis / Retirada
              </button>
              <button
                onClick={() => setFreightOption("express")}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  freightOption === "express"
                    ? "bg-purple-100 text-purple-900 border border-purple-300"
                    : "bg-stone-100 text-stone-600 hover:bg-stone-200"
                }`}
              >
                Sedex (R$ 28,00)
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between text-xs text-stone-600 py-1">
            <span>Valor do Frete</span>
            <span className="font-semibold text-stone-800">
              {freightValue === 0
                ? "Grátis (R$ 0,00)"
                : freightValue.toLocaleString("pt-BR", {
                    style: "currency",
                    currency: "BRL",
                  })}
            </span>
          </div>
        </div>

        {/* FORMA DE PAGAMENTO */}
        <div className="pt-3 border-t border-stone-100">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-stone-700">
              Forma de Pagamento
            </span>
            <span className="text-[11px] text-stone-400">
              Chave PIX ou Maquininha
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <button
              type="button"
              onClick={() => setPaymentMethod("PIX")}
              className={`p-2.5 rounded-xl border text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                paymentMethod === "PIX"
                  ? "border-emerald-500 bg-emerald-50 text-emerald-900 shadow-2xs"
                  : "border-stone-200 text-stone-700 hover:bg-stone-50"
              }`}
            >
              <QrCode className="w-3.5 h-3.5 text-emerald-600" />
              <span>PIX</span>
            </button>

            <button
              type="button"
              onClick={() => setPaymentMethod("CREDIT_CARD")}
              className={`p-2.5 rounded-xl border text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                paymentMethod === "CREDIT_CARD"
                  ? "border-amber-500 bg-amber-50 text-amber-900 shadow-2xs"
                  : "border-stone-200 text-stone-700 hover:bg-stone-50"
              }`}
            >
              <CreditCard className="w-3.5 h-3.5 text-amber-600" />
              <span>Cartão de Crédito</span>
            </button>

            <button
              type="button"
              onClick={() => setPaymentMethod("DEBIT_CARD")}
              className={`p-2.5 rounded-xl border text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                paymentMethod === "DEBIT_CARD"
                  ? "border-amber-500 bg-amber-50 text-amber-900 shadow-2xs"
                  : "border-stone-200 text-stone-700 hover:bg-stone-50"
              }`}
            >
              <CreditCard className="w-3.5 h-3.5 text-stone-600" />
              <span>Débito</span>
            </button>

            <button
              type="button"
              onClick={() => setPaymentMethod("CASH")}
              className={`p-2.5 rounded-xl border text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                paymentMethod === "CASH"
                  ? "border-amber-500 bg-amber-50 text-amber-900 shadow-2xs"
                  : "border-stone-200 text-stone-700 hover:bg-stone-50"
              }`}
            >
              <DollarSign className="w-3.5 h-3.5 text-stone-600" />
              <span>Dinheiro</span>
            </button>
          </div>
        </div>

        {/* ────────────────────────────────────
            TOTAL                    R$118,80
            ──────────────────────────────────── */}
        <div className="pt-4 border-t-2 border-stone-200">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-stone-400 block">
                Total a Pagar
              </span>
              <span className="text-sm font-bold text-stone-900">
                TOTAL
              </span>
            </div>
            <div className="text-2xl sm:text-3xl font-extrabold text-stone-950 tracking-tight">
              {totalAmount.toLocaleString("pt-BR", {
                style: "currency",
                currency: "BRL",
              })}
            </div>
          </div>
        </div>

        {/* ===================================================================== */}
        {/* BOTÕES DE AÇÃO:                                                       */}
        {/* [ 💬 Enviar pelo WhatsApp ]                                           */}
        {/* [ ✓ Registrar venda ]                                                 */}
        {/* ===================================================================== */}
        <div className="pt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* BOTÃO 1: ENVIAR PELO WHATSAPP */}
          <button
            type="button"
            onClick={handleSendWhatsApp}
            disabled={cartItems.length === 0}
            className="flex items-center justify-center gap-2 px-5 py-3.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-bold rounded-xl shadow-xs transition-all active:scale-98 cursor-pointer group"
          >
            <MessageCircle className="w-4 h-4 fill-white text-white group-hover:scale-110 transition-transform" />
            <span>💬 Enviar pelo WhatsApp</span>
          </button>

          {/* BOTÃO 2: REGISTRAR VENDA */}
          <button
            type="button"
            onClick={handleRegisterSale}
            disabled={cartItems.length === 0 || isSubmitting}
            className="flex items-center justify-center gap-2 px-5 py-3.5 bg-stone-900 hover:bg-stone-850 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-bold rounded-xl shadow-xs transition-all active:scale-98 cursor-pointer group"
          >
            {isSubmitting ? (
              <span>Registrando...</span>
            ) : (
              <>
                <Check className="w-4 h-4 stroke-[3] text-emerald-400 group-hover:scale-110 transition-transform" />
                <span>✓ Registrar venda</span>
              </>
            )}
          </button>
        </div>

        {/* TOAST COPIED FEEDBACK */}
        {copiedMessageToast && (
          <div className="p-2.5 bg-emerald-100 text-emerald-900 text-xs font-semibold rounded-lg flex items-center justify-center gap-2 animate-fadeIn">
            <CheckCircle2 className="w-4 h-4 text-emerald-700" />
            <span>Mensagem formatada copiada para a área de transferência e aberta no WhatsApp!</span>
          </div>
        )}
      </div>
    </div>
  );
};
