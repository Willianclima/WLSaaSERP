import React, { useState, useMemo } from "react";
import {
  ShoppingBag,
  MessageCircle,
  Search,
  X,
  Plus,
  Minus,
  Trash2,
  Check,
  CheckCircle2,
  Sparkles,
  Layers,
  Heart,
  Share2,
  ArrowRight,
  ExternalLink,
  ShieldCheck,
} from "lucide-react";
import {
  ProductItem,
  Reseller,
  UnifiedOrder,
  DigitalWarranty,
  JewelryBath,
  TenantStore,
  StoreBrandingConfig,
  OrganizationPaymentSettings,
} from "../types";
import { clientInventoryService } from "../services/inventoryService";
import {
  whatsappOrderService,
  TraceableWhatsAppOrderPayload,
} from "../services/whatsappOrderService";
import { ShareCatalogModal } from "./ShareCatalogModal";
import confetti from "canvas-confetti";

export interface CartItem {
  product: ProductItem;
  quantity: number;
  selectedBath: string;
  itemTotal: number;
}

interface StorefrontBuyerExperienceProps {
  tenant: TenantStore;
  branding?: StoreBrandingConfig;
  paymentSettings?: OrganizationPaymentSettings;
  products: ProductItem[];
  resellers: Reseller[];
  warranties?: DigitalWarranty[];
  initialCategory?: string;
  initialCoupon?: string;
  onPlaceOrder: (newOrder: UnifiedOrder) => Promise<any> | void;
  onNavigateToERP: (tab?: string) => void;
  onNavigateToHome?: () => void;
}

export const StorefrontBuyerExperience: React.FC<StorefrontBuyerExperienceProps> = ({
  tenant,
  branding,
  products,
  resellers,
  initialCategory = "TODOS",
  onPlaceOrder,
  onNavigateToERP,
  onNavigateToHome,
}) => {
  // Search & Category state
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState(initialCategory);

  // Bag / Cart state
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [isBagOpen, setIsBagOpen] = useState(false);
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerCity, setCustomerCity] = useState("");
  const [isSubmittingOrder, setIsSubmittingOrder] = useState(false);
  const [isOrderSuccess, setIsOrderSuccess] = useState(false);
  const [lastWhatsAppUrl, setLastWhatsAppUrl] = useState("");

  // Product Preview Modal state
  const [selectedProduct, setSelectedProduct] = useState<ProductItem | null>(null);
  const [selectedBathForModal, setSelectedBathForModal] = useState<string>("");

  // Favorites & Share
  const [likedProducts, setLikedProducts] = useState<Record<string, boolean>>({});
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);

  // Reseller selection (defaults to first or matrix)
  const defaultReseller = resellers.length > 0 ? resellers[0] : null;
  const storePhone =
    branding?.contactWhatsapp?.replace(/\D/g, "") ||
    tenant?.contactWhatsapp?.replace(/\D/g, "") ||
    defaultReseller?.phone?.replace(/\D/g, "") ||
    "";

  // Filter products: Published and matching search/category
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const isPublic = p.publicationStatus
        ? p.publicationStatus === "PUBLISHED"
        : p.status !== "PAUSADO";
      if (!isPublic) return false;

      const matchesSearch =
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (p.collection && p.collection.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchesCategory =
        selectedCategory === "TODOS" || p.category === selectedCategory;

      return matchesSearch && matchesCategory;
    });
  }, [products, searchTerm, selectedCategory]);

  // Cart subtotal & total
  const cartSubtotal = useMemo(() => {
    return cartItems.reduce((acc, item) => acc + item.itemTotal, 0);
  }, [cartItems]);

  const totalItemCount = useMemo(() => {
    return cartItems.reduce((acc, item) => acc + item.quantity, 0);
  }, [cartItems]);

  // Helper to format bath labels
  const getBathLabel = (bath?: string): string => {
    switch (bath) {
      case "OURO_18K":
        return "Ouro 18K";
      case "RODIO_BRANCO":
        return "Ródio Branco";
      case "ROSE_GOLD":
        return "Ouro Rosé";
      case "RODIO_NEGRO":
        return "Ródio Negro";
      case "PRATA_925":
        return "Prata 925";
      default:
        return bath?.replace("_", " ") || "Banho Nobre";
    }
  };

  // Helper for availability label
  const getAvailabilityInfo = (product: ProductItem) => {
    const avail = clientInventoryService.evaluateProductAvailability(product, branding);
    const stock = product.stockAvailable ?? product.stockPhysical ?? 1;
    
    if (!avail.isPurchasable || stock <= 0) {
      return {
        label: "Sob Encomenda",
        badgeClass: "bg-stone-100 text-stone-700 border-stone-300",
        isReady: false,
      };
    }
    if (stock <= 2) {
      return {
        label: `Últimas ${stock} unidades`,
        badgeClass: "bg-amber-50 text-amber-800 border-amber-200",
        isReady: true,
      };
    }
    return {
      label: "Pronta Entrega",
      badgeClass: "bg-emerald-50 text-emerald-800 border-emerald-200",
      isReady: true,
    };
  };

  // Action: [ Quero comprar ] -> Adds to bag & immediately opens 🛍 Minha sacola
  const handleQuickBuy = (product: ProductItem, chosenBath?: string) => {
    const bath = chosenBath || product.bath || "OURO_18K";

    setCartItems((prev) => {
      const existingIdx = prev.findIndex(
        (item) => item.product.id === product.id && item.selectedBath === bath
      );

      if (existingIdx >= 0) {
        const updated = [...prev];
        const current = updated[existingIdx];
        const newQty = current.quantity + 1;
        updated[existingIdx] = {
          ...current,
          quantity: newQty,
          itemTotal: current.product.price * newQty,
        };
        return updated;
      }

      return [
        ...prev,
        {
          product,
          quantity: 1,
          selectedBath: bath,
          itemTotal: product.price,
        },
      ];
    });

    setIsBagOpen(true);
    setIsOrderSuccess(false);

    confetti({
      particleCount: 35,
      spread: 45,
      origin: { y: 0.7 },
    });
  };

  // Update item quantity
  const handleUpdateQuantity = (index: number, delta: number) => {
    setCartItems((prev) => {
      const target = prev[index];
      if (!target) return prev;

      const newQty = target.quantity + delta;
      if (newQty <= 0) {
        return prev.filter((_, i) => i !== index);
      }

      const updated = [...prev];
      updated[index] = {
        ...target,
        quantity: newQty,
        itemTotal: target.product.price * newQty,
      };
      return updated;
    });
  };

  // Remove single item
  const handleRemoveItem = (index: number) => {
    setCartItems((prev) => prev.filter((_, i) => i !== index));
  };

  // Action: [ Finalizar pelo WhatsApp ]
  const handleFinalizeWhatsApp = async () => {
    if (cartItems.length === 0 || isSubmittingOrder) return;
    setIsSubmittingOrder(true);

    const extRef = whatsappOrderService.generateExternalReference();

    const tenantSlug = tenant?.slug || tenant?.id?.toLowerCase().replace(/[^a-z0-9]/g, "-") || "loja";
    const storeDisplayName = branding?.logoText || tenant?.name || "Loja de Semijoias";
    const storeCity = tenant?.city || "São Paulo";
    const storeState = tenant?.state || "SP";

    // Prepare ERP order intent
    const orderIntent: any = {
      organizationId: tenant.id,
      customerSnapshot: {
        personType: "PF",
        name: customerName?.trim() || "Cliente Loja Virtual",
        phone: customerPhone?.trim() || "",
        email: customerPhone ? `${customerPhone.replace(/\D/g, "")}@cliente.${tenantSlug}.com.br` : `cliente@${tenantSlug}.com.br`,
        document: "",
      },
      channel: "WHATSAPP",
      status: "INVENTORY_RESERVED",
      shippingAddress: {
        recipientName: customerName?.trim() || "Cliente",
        zipCode: "",
        street: customerCity?.trim() || "Entrega via WhatsApp",
        number: "S/N",
        neighborhood: "Centro",
        city: customerCity ? customerCity.split(/[-/]/)[0].trim() : storeCity,
        state: storeState,
        country: "BRA",
      },
      currency: "BRL",
      subtotalAmount: cartSubtotal,
      discountAmount: 0,
      shippingAmount: 0,
      totalAmount: cartSubtotal,
      resellerId: defaultReseller?.id,
      resellerName: defaultReseller?.name,
      resellerCommissionRate: defaultReseller?.commissionDirectRate || 25,
      resellerCommissionAmount: defaultReseller
        ? cartSubtotal * (defaultReseller.commissionDirectRate / 100)
        : 0,
      notes: `Pedido da sacola via WhatsApp no catálogo. Ref: ${extRef}.`,
      metadata: {
        organization_id: tenant.id,
        sales_channel: "WHATSAPP",
        external_reference: extRef,
        consultant_name: defaultReseller?.name,
        customer_name: customerName,
        skus: cartItems.map((i) => i.product.sku),
      },
      items: cartItems.map((item, idx) => ({
        id: `intent-item-${idx}`,
        organizationId: tenant.id,
        productId: item.product.id,
        locationId: item.product.locationId || "loc-matriz",
        productSnapshot: {
          productId: item.product.id,
          sku: item.product.sku,
          name: item.product.name,
          category: item.product.category,
          collection: item.product.collection,
          material: item.product.material,
          bath: item.selectedBath || item.product.bath,
          stones: item.product.stones || [],
          price: item.product.price,
          costPrice: item.product.costPrice,
          warrantyMonths: item.product.warrantyMonths || 12,
          imageUrl: item.product.imageUrl,
        },
        quantity: item.quantity,
        unitPrice: item.product.price,
        costPriceSnapshot: item.product.costPrice,
        discountAmount: 0,
        totalAmount: item.product.price * item.quantity,
      })),
      payments: [
        {
          paymentMethod: "PIX",
          gateway: "MANUAL",
          status: "PENDING",
          amount: cartSubtotal,
          installments: 1,
        },
      ],
    };

    try {
      let officialOrderNum = "";
      if (onPlaceOrder) {
        const res = await onPlaceOrder(orderIntent);
        if (res && res.orderNumber) {
          officialOrderNum = res.orderNumber;
        }
      }

      const waPayload: TraceableWhatsAppOrderPayload = {
        organizationId: tenant.id,
        organizationName: storeDisplayName,
        salesChannel: "WHATSAPP",
        externalReference: extRef,
        orderNumber: officialOrderNum,
        resellerId: defaultReseller?.id,
        resellerName: defaultReseller?.name || storeDisplayName,
        resellerPhone: defaultReseller?.phone || storePhone,
        customerName: customerName?.trim() || "Cliente",
        customerCity: customerCity?.trim() || `${storeCity}/${storeState}`,
        items: cartItems.map((it) => ({
          productId: it.product.id,
          sku: it.product.sku,
          name: it.product.name,
          quantity: it.quantity,
          unitPrice: it.product.price,
          totalAmount: it.product.price * it.quantity,
          bath: it.selectedBath,
        })),
        subtotal: cartSubtotal,
        totalAmount: cartSubtotal,
        status: "INVENTORY_RESERVED",
        notes: "Pedido gerado a partir da sacola de compras do catálogo.",
      };

      const waText = whatsappOrderService.formatTraceableMessage(waPayload);
      const waUrl = whatsappOrderService.generateWhatsAppUrl(storePhone, waText);
      setLastWhatsAppUrl(waUrl);

      // Background submission
      whatsappOrderService.submitOrderToERP(waPayload).catch((e) => console.warn(e));

      // Open WhatsApp window
      window.open(waUrl, "_blank");

      confetti({
        particleCount: 60,
        spread: 60,
        origin: { y: 0.6 },
      });

      setIsOrderSuccess(true);
    } catch (err: any) {
      console.error("Erro ao registrar pedido no ERP:", err);
      // Fallback: Generate the WhatsApp link regardless so the sale is never blocked
      const waPayload: TraceableWhatsAppOrderPayload = {
        organizationId: tenant.id,
        organizationName: storeDisplayName,
        salesChannel: "WHATSAPP",
        externalReference: extRef,
        customerName: customerName?.trim() || "Cliente",
        items: cartItems.map((it) => ({
          productId: it.product.id,
          sku: it.product.sku,
          name: it.product.name,
          quantity: it.quantity,
          unitPrice: it.product.price,
          totalAmount: it.product.price * it.quantity,
          bath: it.selectedBath,
        })),
        subtotal: cartSubtotal,
        totalAmount: cartSubtotal,
        status: "DRAFT",
      };
      const waText = whatsappOrderService.formatTraceableMessage(waPayload);
      const waUrl = whatsappOrderService.generateWhatsAppUrl(storePhone, waText);
      setLastWhatsAppUrl(waUrl);
      window.open(waUrl, "_blank");
      setIsOrderSuccess(true);
    } finally {
      setIsSubmittingOrder(false);
    }
  };

  // Toggle favorite
  const toggleFavorite = (productId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setLikedProducts((prev) => ({ ...prev, [productId]: !prev[productId] }));
  };

  return (
    <div className="min-h-screen bg-[#FAF9F6] text-stone-900 flex flex-col font-sans selection:bg-amber-100 selection:text-amber-900">
      {/* Top Header */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-stone-200/80 shadow-2xs">
        <div className={`max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-18 flex items-center justify-between gap-4 ${
          branding?.logoPlacement === "CENTER" ? "relative" : ""
        }`}>
          {/* Brand Identity */}
          <div className={`flex items-center gap-3 ${
            branding?.logoPlacement === "CENTER"
              ? "sm:absolute sm:left-1/2 sm:-translate-x-1/2"
              : branding?.logoPlacement === "RIGHT"
              ? "order-last"
              : ""
          }`}>
            <div
              onClick={onNavigateToHome}
              className={`flex cursor-pointer group ${
                branding?.logoPlacement === "CENTER" ? "items-center text-center flex-col" : "flex-col"
              }`}
            >
              {branding?.logoType === "IMAGE" && branding.logoUrl ? (
                <img
                  src={branding.logoUrl}
                  alt={branding?.logoText || tenant?.name || "Lumina"}
                  className="h-10 max-w-[170px] object-contain group-hover:scale-105 transition-transform"
                />
              ) : (
                <>
                  <h1
                    className="text-xl sm:text-2xl font-serif italic font-bold tracking-tight text-stone-900 group-hover:text-amber-800 transition-colors leading-tight"
                    style={{ color: branding?.secondaryColor || undefined }}
                  >
                    {branding?.logoText || tenant?.name || "Lumina"}
                  </h1>
                  <span
                    className="text-[9px] font-bold tracking-[0.25em] uppercase"
                    style={{ color: branding?.primaryColor || "#B45309" }}
                  >
                    {branding?.logoSubtext || "Semijoias Nobres"}
                  </span>
                </>
              )}
            </div>
          </div>

          {/* Center / Left: Search input */}
          <div className={`flex-1 max-w-md relative hidden sm:block ${
            branding?.logoPlacement === "CENTER" ? "max-w-xs" : ""
          }`}>
            <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="Buscar colares, brincos, anéis..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-stone-100/90 focus:bg-white border border-stone-200/80 focus:border-stone-400 rounded-full pl-9 pr-8 py-2 text-xs text-stone-900 placeholder-stone-400 focus:outline-none transition-all shadow-2xs"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-700 p-0.5 cursor-pointer"
                title="Limpar busca"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Right / Actions */}
          <div className={`flex items-center gap-2.5 ${
            branding?.logoPlacement === "RIGHT" ? "order-first" : ""
          }`}>
            {/* Share Catalog button */}
            <button
              onClick={() => setIsShareModalOpen(true)}
              className="p-2 sm:px-3 sm:py-2 text-xs font-semibold text-stone-700 hover:text-stone-950 border border-stone-200/80 rounded-full bg-white hover:bg-stone-50 transition-colors shadow-2xs cursor-pointer flex items-center gap-1.5"
              title="Compartilhar catálogo"
            >
              <Share2 className="w-3.5 h-3.5 text-stone-600" />
              <span className="hidden md:inline">Compartilhar</span>
            </button>

            {/* Quick ERP / Painel do Dono link */}
            <button
              onClick={() => onNavigateToERP("ownerHome")}
              className="flex items-center gap-1.5 px-3 py-2 bg-stone-900 hover:bg-stone-800 text-amber-300 border border-stone-800 rounded-full text-xs font-bold transition-all cursor-pointer shadow-xs"
              title="Retornar à Central de Gestão do Dono"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden sm:inline">Painel do Dono</span>
              <span className="sm:hidden">Dono</span>
            </button>

            {/* 🛍 Minha sacola Button */}
            <button
              onClick={() => {
                setIsBagOpen(true);
                setIsOrderSuccess(false);
              }}
              className="relative flex items-center gap-2 px-4 py-2 bg-stone-900 hover:bg-stone-800 text-white rounded-full text-xs font-bold uppercase tracking-wider transition-all shadow-xs cursor-pointer shrink-0"
              title="Abrir Minha sacola"
            >
              <ShoppingBag
                className="w-4 h-4"
                style={{ color: branding?.primaryColor || "#FBBF24" }}
              />
              <span>Minha sacola</span>
              {totalItemCount > 0 && (
                <span
                  className="w-5 h-5 text-stone-950 font-extrabold rounded-full text-[11px] flex items-center justify-center -mr-1 shadow-xs"
                  style={{ backgroundColor: branding?.primaryColor || "#FBBF24" }}
                >
                  {totalItemCount}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Mobile Search input */}
        <div className="sm:hidden px-4 pb-3">
          <div className="relative">
            <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="Buscar colares, brincos, anéis..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-stone-100 focus:bg-white border border-stone-200 rounded-full pl-9 pr-8 py-2 text-xs text-stone-900 placeholder-stone-400 focus:outline-none"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-400 p-0.5"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Catalog View */}
      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 w-full space-y-6">
        {/* Category Selection Filter Pills */}
        <div className="bg-white border border-stone-200/80 rounded-2xl p-3 sm:p-4 shadow-xs flex items-center justify-between gap-3 overflow-x-auto">
          <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none text-xs font-semibold">
            {[
              { id: "TODOS", label: "Todas as Peças" },
              { id: "COLARES", label: "Colares & Riviera" },
              { id: "BRINCOS", label: "Brincos & Argolas" },
              { id: "ANEIS", label: "Anéis & Solitários" },
              { id: "PULSEIRAS", label: "Pulseiras" },
              { id: "PERSONALIZADOS", label: "Personalizados" },
            ].map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-3.5 py-1.5 rounded-full whitespace-nowrap transition-all duration-200 cursor-pointer text-xs ${
                  selectedCategory === cat.id
                    ? "bg-stone-900 text-white font-bold shadow-xs"
                    : "bg-stone-50 hover:bg-stone-100 text-stone-600 hover:text-stone-900 border border-stone-200/60"
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          <span className="text-[11px] font-bold text-stone-500 uppercase tracking-wider hidden sm:inline-block shrink-0">
            {filteredProducts.length} {filteredProducts.length === 1 ? "peça" : "peças"}
          </span>
        </div>

        {/* Product Cards Grid: Foto, Nome, Preço, Banho, Disponibilidade, [ Quero comprar ] */}
        {filteredProducts.length === 0 ? (
          <div className="bg-white border border-stone-200 rounded-3xl p-12 text-center space-y-4 max-w-lg mx-auto shadow-xs">
            <div className="w-14 h-14 mx-auto rounded-full bg-stone-100 flex items-center justify-center text-stone-400">
              <Search className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-serif italic font-bold text-stone-900">
              Nenhuma peça encontrada
            </h3>
            <p className="text-xs text-stone-500 leading-relaxed font-sans">
              Não encontramos semijoias com o filtro selecionado. Tente buscar por outro termo.
            </p>
            <button
              onClick={() => {
                setSelectedCategory("TODOS");
                setSearchTerm("");
              }}
              className="px-5 py-2.5 bg-stone-900 hover:bg-stone-800 text-white rounded-2xl text-xs font-bold transition-all cursor-pointer"
            >
              Ver Todas as Peças
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {filteredProducts.map((product) => {
              const bathLabel = getBathLabel(product.bath);
              const availability = getAvailabilityInfo(product);
              const isLiked = Boolean(likedProducts[product.id]);

              return (
                <div
                  key={product.id}
                  className="bg-white border border-stone-200/90 rounded-3xl overflow-hidden shadow-xs hover:shadow-md transition-all duration-300 flex flex-col justify-between group"
                >
                  {/* 1. FOTO */}
                  <div
                    onClick={() => {
                      setSelectedProduct(product);
                      setSelectedBathForModal(product.bath || "OURO_18K");
                    }}
                    className="relative aspect-4/5 overflow-hidden bg-stone-100 cursor-pointer"
                  >
                    <img
                      src={product.imageUrl}
                      alt={product.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ease-out"
                    />

                    {/* Favorite Heart Button */}
                    <button
                      type="button"
                      onClick={(e) => toggleFavorite(product.id, e)}
                      className={`absolute top-3 right-3 w-8 h-8 rounded-full flex items-center justify-center backdrop-blur-md transition-all shadow-xs cursor-pointer z-10 ${
                        isLiked
                          ? "bg-rose-500 text-white scale-105"
                          : "bg-white/80 hover:bg-white text-stone-600 hover:text-rose-500"
                      }`}
                      title={isLiked ? "Remover dos favoritos" : "Salvar nos favoritos"}
                    >
                      <Heart className={`w-4 h-4 ${isLiked ? "fill-white" : ""}`} />
                    </button>
                  </div>

                  {/* Card Body: Nome, Preço, Banho, Disponibilidade & [ Quero comprar ] */}
                  <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                    <div className="space-y-2">
                      {/* Tags: Banho & Disponibilidade */}
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {/* BANHO */}
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-900 border border-amber-200">
                          {bathLabel}
                        </span>

                        {/* DISPONIBILIDADE */}
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${availability.badgeClass}`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              availability.isReady ? "bg-emerald-500" : "bg-stone-400"
                            }`}
                          />
                          <span>{availability.label}</span>
                        </span>
                      </div>

                      {/* NOME */}
                      <h3
                        onClick={() => {
                          setSelectedProduct(product);
                          setSelectedBathForModal(product.bath || "OURO_18K");
                        }}
                        className="text-lg font-serif italic font-bold text-stone-900 leading-snug line-clamp-1 hover:text-amber-900 transition-colors cursor-pointer"
                      >
                        {product.name}
                      </h3>

                      {/* PREÇO */}
                      <div className="pt-1">
                        <span className="text-2xl font-sans font-bold text-stone-900 tracking-tight">
                          R$ {product.price.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                      </div>
                    </div>

                    {/* BOTÃO PRINCIPAL: [ Quero comprar ] */}
                    <div className="pt-2">
                      <button
                        type="button"
                        onClick={() => handleQuickBuy(product)}
                        className="w-full py-3 px-4 bg-stone-900 hover:bg-stone-800 active:scale-[0.98] text-white rounded-2xl text-xs font-bold uppercase tracking-wider transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer shadow-xs hover:shadow-md"
                      >
                        <ShoppingBag className="w-4 h-4 text-amber-400" />
                        <span>Quero comprar</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* ========================================================= */}
      {/* 🛍 MINHA SACOLA (Slide-over Drawer) -> [Finalizar pelo WhatsApp] */}
      {/* ========================================================= */}
      {isBagOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex justify-end">
          <div className="bg-white w-full max-w-md h-full flex flex-col justify-between p-6 shadow-2xl overflow-y-auto animate-in slide-in-from-right duration-300">
            {/* Top Bar */}
            <div className="space-y-5">
              <div className="flex items-center justify-between pb-4 border-b border-stone-200">
                <div className="flex items-center gap-2">
                  <ShoppingBag className="w-5 h-5 text-stone-900" />
                  <h3 className="text-xl font-serif italic font-bold text-stone-900">
                    🛍 Minha sacola ({totalItemCount})
                  </h3>
                </div>
                <button
                  onClick={() => setIsBagOpen(false)}
                  className="p-1.5 rounded-full text-stone-400 hover:text-stone-800 hover:bg-stone-100 transition-colors cursor-pointer"
                  title="Fechar sacola"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Order Success State */}
              {isOrderSuccess ? (
                <div className="py-8 text-center space-y-5">
                  <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center mx-auto shadow-xs">
                    <CheckCircle2 className="w-8 h-8" />
                  </div>

                  <div className="space-y-1">
                    <h4 className="text-2xl font-serif italic font-bold text-stone-900">
                      Pedido Enviado para o WhatsApp!
                    </h4>
                    <p className="text-xs text-stone-600 max-w-xs mx-auto">
                      Sua mensagem com a lista de peças foi encaminhada para nossa consultora. O atendimento continuará na sua conversa.
                    </p>
                  </div>

                  {lastWhatsAppUrl && (
                    <a
                      href={lastWhatsAppUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 shadow-sm transition-all inline-flex cursor-pointer"
                    >
                      <MessageCircle className="w-4 h-4" />
                      <span>Reabrir Conversa no WhatsApp</span>
                    </a>
                  )}

                  <button
                    onClick={() => {
                      setCartItems([]);
                      setIsOrderSuccess(false);
                      setIsBagOpen(false);
                    }}
                    className="w-full py-3 bg-stone-100 hover:bg-stone-200 text-stone-800 rounded-2xl text-xs font-semibold transition-all cursor-pointer"
                  >
                    Continuar Comprando
                  </button>
                </div>
              ) : cartItems.length === 0 ? (
                /* Empty State */
                <div className="text-center py-16 space-y-4">
                  <div className="w-16 h-16 mx-auto rounded-full bg-stone-100 flex items-center justify-center text-stone-300">
                    <ShoppingBag className="w-8 h-8" />
                  </div>
                  <div className="space-y-1">
                    <p className="font-serif italic text-lg text-stone-700">
                      Sua sacola está vazia
                    </p>
                    <p className="text-xs text-stone-400">
                      Escolha uma semijoia no catálogo e clique em [ Quero comprar ].
                    </p>
                  </div>
                  <button
                    onClick={() => setIsBagOpen(false)}
                    className="px-5 py-2.5 bg-stone-900 hover:bg-stone-800 text-white rounded-2xl text-xs font-bold transition-all cursor-pointer"
                  >
                    Ver Catálogo
                  </button>
                </div>
              ) : (
                /* Items List */
                <div className="space-y-3 max-h-[48vh] overflow-y-auto pr-1">
                  {cartItems.map((item, idx) => (
                    <div
                      key={idx}
                      className="p-3.5 bg-stone-50 border border-stone-200 rounded-2xl flex gap-3 items-center justify-between"
                    >
                      <img
                        src={item.product.imageUrl}
                        alt={item.product.name}
                        className="w-14 h-14 rounded-xl object-cover border border-stone-200 shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-stone-900 truncate font-serif italic">
                          {item.product.name}
                        </p>
                        <p className="text-[10px] text-amber-900 font-semibold mt-0.5">
                          Banho: {getBathLabel(item.selectedBath)}
                        </p>
                        <p className="text-xs font-bold text-stone-900 mt-1">
                          R$ {item.itemTotal.toFixed(2).replace(".", ",")}
                        </p>
                      </div>

                      {/* Quantity Controls */}
                      <div className="flex items-center gap-1.5 bg-white border border-stone-200 rounded-xl px-2 py-1 shrink-0">
                        <button
                          onClick={() => handleUpdateQuantity(idx, -1)}
                          className="text-stone-500 hover:text-stone-900 p-0.5 cursor-pointer"
                          title="Diminuir"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="text-xs font-bold text-stone-900 w-4 text-center">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() => handleUpdateQuantity(idx, 1)}
                          className="text-stone-500 hover:text-stone-900 p-0.5 cursor-pointer"
                          title="Aumentar"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>

                      {/* Delete Button */}
                      <button
                        onClick={() => handleRemoveItem(idx)}
                        className="text-stone-400 hover:text-rose-600 p-1 cursor-pointer transition-colors"
                        title="Remover da sacola"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Bottom Actions & [Finalizar pelo WhatsApp] */}
            {!isOrderSuccess && cartItems.length > 0 && (
              <div className="pt-4 border-t border-stone-200 space-y-4">
                {/* Total */}
                <div className="flex items-baseline justify-between">
                  <span className="text-xs font-semibold text-stone-500 uppercase tracking-wider">
                    Total da Sacola:
                  </span>
                  <span className="text-2xl font-bold font-sans text-stone-900">
                    R$ {cartSubtotal.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>

                {/* Quick Customer Info (Name, WhatsApp, City) */}
                <div className="space-y-2">
                  <input
                    type="text"
                    placeholder="Seu nome (opcional)"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 text-xs text-stone-900 placeholder-stone-400 focus:bg-white focus:outline-none focus:border-stone-400"
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="tel"
                      placeholder="Seu WhatsApp (ex: 19 99999-0000)"
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(e.target.value)}
                      className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 text-xs text-stone-900 placeholder-stone-400 focus:bg-white focus:outline-none focus:border-stone-400"
                    />
                    <input
                      type="text"
                      placeholder="Sua cidade / bairro"
                      value={customerCity}
                      onChange={(e) => setCustomerCity(e.target.value)}
                      className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 text-xs text-stone-900 placeholder-stone-400 focus:bg-white focus:outline-none focus:border-stone-400"
                    />
                  </div>
                </div>

                {/* BOTÃO PRINCIPAL: [ Finalizar pelo WhatsApp ] */}
                <button
                  type="button"
                  onClick={handleFinalizeWhatsApp}
                  disabled={isSubmittingOrder}
                  className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 active:scale-[0.99] text-white rounded-2xl text-sm font-bold uppercase tracking-wider transition-all duration-200 shadow-md flex items-center justify-center gap-2.5 cursor-pointer disabled:opacity-60"
                >
                  <MessageCircle className="w-5 h-5 fill-white/20" />
                  <span>
                    {isSubmittingOrder
                      ? "Enviando Pedido..."
                      : "Finalizar pelo WhatsApp"}
                  </span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* Product Quick View Modal */}
      {/* ========================================================= */}
      {selectedProduct && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-stone-200 rounded-3xl max-w-lg w-full p-6 space-y-5 shadow-2xl animate-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="flex items-center justify-between pb-2 border-b border-stone-200">
              <span className="text-[10px] font-bold uppercase tracking-widest text-stone-400">
                {selectedProduct.sku} • {selectedProduct.category}
              </span>
              <button
                onClick={() => setSelectedProduct(null)}
                className="p-1 rounded-full text-stone-400 hover:text-stone-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Photo */}
            <div className="aspect-square rounded-2xl overflow-hidden bg-stone-100 border border-stone-200">
              <img
                src={selectedProduct.imageUrl}
                alt={selectedProduct.name}
                className="w-full h-full object-cover"
              />
            </div>

            {/* Info */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-900 border border-amber-200">
                  {getBathLabel(selectedProduct.bath)}
                </span>
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                  {getAvailabilityInfo(selectedProduct).label}
                </span>
              </div>

              <h3 className="text-xl font-serif italic font-bold text-stone-900">
                {selectedProduct.name}
              </h3>

              <p className="text-2xl font-bold text-stone-900">
                R$ {selectedProduct.price.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
            </div>

            {/* Bath Option Selector if needed */}
            <div className="space-y-1.5 pt-1">
              <label className="text-[11px] font-bold text-stone-500 uppercase tracking-wider">
                Opção de Banho:
              </label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: "OURO_18K", label: "Ouro 18K" },
                  { id: "RODIO_BRANCO", label: "Ródio Branco" },
                ].map((b) => (
                  <button
                    key={b.id}
                    type="button"
                    onClick={() => setSelectedBathForModal(b.id)}
                    className={`p-2 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                      selectedBathForModal === b.id
                        ? "bg-stone-900 text-white border-stone-900"
                        : "bg-white text-stone-700 border-stone-200 hover:bg-stone-50"
                    }`}
                  >
                    {b.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Actions: [ Quero comprar ] & [ Pedir pelo WhatsApp ] */}
            <div className="space-y-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  handleQuickBuy(selectedProduct, selectedBathForModal);
                  setSelectedProduct(null);
                }}
                className="w-full py-3.5 bg-stone-900 hover:bg-stone-800 text-white rounded-2xl text-xs font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer shadow-xs"
              >
                <ShoppingBag className="w-4 h-4 text-amber-400" />
                <span>Quero comprar</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Share Catalog Modal */}
      <ShareCatalogModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        tenant={tenant}
        totalProducts={products.length}
      />

      {/* Simple Footer */}
      <footer className="border-t border-stone-200 py-6 px-4 bg-white text-xs text-stone-500 text-center">
        <p className="font-serif italic font-bold text-stone-800 text-sm">
          {tenant.name || "Lumina Semijoias Nobres"}
        </p>
        <p className="text-[11px] text-stone-400 mt-1">
          Alta semijoia contemporânea com certificação de procedência e banho nobre.
        </p>
      </footer>
    </div>
  );
};
