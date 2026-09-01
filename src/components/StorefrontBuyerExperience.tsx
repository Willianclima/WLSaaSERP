import React, { useState } from "react";
import {
  ShoppingBag,
  Sparkles,
  ShieldCheck,
  QrCode,
  Heart,
  Search,
  Filter,
  ArrowRight,
  Check,
  Copy,
  ChevronRight,
  Star,
  Truck,
  RotateCcw,
  Gift,
  CreditCard,
  MessageCircle,
  Phone,
  MapPin,
  Clock,
  Crown,
  ExternalLink,
  ChevronLeft,
  X,
  Plus,
  Minus,
  CheckCircle2,
  Lock,
  UserCheck,
  Layers,
  ArrowUpRight,
  Share2,
} from "lucide-react";
import { ShareCatalogModal } from "./ShareCatalogModal";
import {
  ProductItem,
  Reseller,
  UnifiedOrder,
  DigitalWarranty,
  CustomJewelryOrderSpec,
  JewelryBath,
  TenantStore,
  StoreBrandingConfig,
  OrganizationPaymentSettings,
} from "../types";
import {
  calculatePixPrice,
  calculateInstallmentOptions,
  getBestInstallmentHighlight,
  DEFAULT_ORGANIZATION_PAYMENT_SETTINGS,
} from "../utils/pricingEngine";
import { clientInventoryService } from "../services/inventoryService";
import { whatsappOrderService, TraceableWhatsAppOrderPayload } from "../services/whatsappOrderService";
import confetti from "canvas-confetti";

interface StorefrontBuyerExperienceProps {
  tenant: TenantStore;
  branding?: StoreBrandingConfig;
  paymentSettings?: OrganizationPaymentSettings;
  products: ProductItem[];
  resellers: Reseller[];
  warranties: DigitalWarranty[];
  initialCategory?: string;
  initialCoupon?: string;
  onPlaceOrder: (newOrder: UnifiedOrder) => void;
  onNavigateToERP: (tab?: string) => void;
  onNavigateToHome?: () => void;
}

export const StorefrontBuyerExperience: React.FC<StorefrontBuyerExperienceProps> = ({
  tenant,
  branding,
  paymentSettings,
  products,
  resellers,
  warranties,
  initialCategory = "TODOS",
  initialCoupon = "",
  onPlaceOrder,
  onNavigateToERP,
  onNavigateToHome,
}) => {
  const currentPaymentSettings = paymentSettings || DEFAULT_ORGANIZATION_PAYMENT_SETTINGS;
  const [selectedCardInstallment, setSelectedCardInstallment] = useState<number>(1);
  const [showModalInstallmentTable, setShowModalInstallmentTable] = useState<boolean>(false);

  // Storefront navigation & state
  const [selectedCategory, setSelectedCategory] = useState<string>(initialCategory || "TODOS");
  const [searchTerm, setSearchTerm] = useState("");
  const [likedProducts, setLikedProducts] = useState<Record<string, boolean>>({});
  const [selectedResellerId, setSelectedResellerId] = useState<string>(resellers[0]?.id || "");
  const [cartItems, setCartItems] = useState<
    Array<{
      product: ProductItem;
      quantity: number;
      selectedBath: JewelryBath;
      customization?: CustomJewelryOrderSpec;
      itemTotal: number;
    }>
  >([]);

  const [isCartOpen, setIsCartOpen] = useState(false);
  const [selectedProductForModal, setSelectedProductForModal] = useState<ProductItem | null>(null);
  const [modalActiveImageUrl, setModalActiveImageUrl] = useState<string>("");
  const [copiedModalUrl, setCopiedModalUrl] = useState(false);

  // Customizer modal state for product detail
  const [modalBath, setModalBath] = useState<JewelryBath>("OURO_18K");
  const [modalEngraving, setModalEngraving] = useState("Marina");
  const [modalFont, setModalFont] = useState<CustomJewelryOrderSpec["fontStyle"]>("CURSIVA");
  const [modalStone, setModalStone] = useState<CustomJewelryOrderSpec["gemStone"]>("ZIRCONIA_CRISTAL");
  const [modalGiftBox, setModalGiftBox] = useState(false);

  // Checkout modal
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [checkoutStep, setCheckoutStep] = useState<"CART" | "CUSTOMER" | "PAYMENT" | "SUCCESS">("CUSTOMER");
  const [customerName, setCustomerName] = useState("Juliana Alencar");
  const [customerPhone, setCustomerPhone] = useState("(11) 98765-4321");
  const [customerEmail, setCustomerEmail] = useState("juliana.alencar@email.com");
  const [customerCpf, setCustomerCpf] = useState("329.841.578-92");
  const [customerCep, setCustomerCep] = useState("01414-001");
  const [customerAddress, setCustomerAddress] = useState("Rua Bela Cintra, 1850, Apto 42 - Jardins, São Paulo - SP");
  const [paymentMethod, setPaymentMethod] = useState<"PIX" | "CARTAO_CREDITO" | "WHATSAPP">("WHATSAPP");
  const [couponCode, setCouponCode] = useState(initialCoupon || "");
  const [couponApplied, setCouponApplied] = useState(Boolean(initialCoupon));
  const [shippingMethod, setShippingMethod] = useState<"EXPRESS" | "STANDARD" | "RESELLER_PICKUP">("STANDARD");

  // Success order reference
  const [placedOrder, setPlacedOrder] = useState<UnifiedOrder | null>(null);
  const [copiedPix, setCopiedPix] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [lastWhatsAppUrl, setLastWhatsAppUrl] = useState<string>("");

  // Warranty lookup drawer
  const [isWarrantyLookupOpen, setIsWarrantyLookupOpen] = useState(false);
  const [warrantySearchCode, setWarrantySearchCode] = useState("");
  const [foundWarranty, setFoundWarranty] = useState<DigitalWarranty | null>(null);

  const selectedReseller = resellers.find((r) => r.id === selectedResellerId);

  // Filtering products - Respect PublicationStatus (ESTOQUE ≠ PUBLICAÇÃO)
  const filteredProducts = products.filter((p) => {
    // Only show published items to buyer (or legacy ATIVO if publicationStatus is not set)
    const isPublic = p.publicationStatus ? p.publicationStatus === "PUBLISHED" : p.status !== "PAUSADO";
    if (!isPublic) return false;

    const matchesSearch =
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.collection.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === "TODOS" || p.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const cartSubtotal = cartItems.reduce((acc, item) => acc + item.itemTotal, 0);
  const discountAmount = couponApplied ? cartSubtotal * 0.1 : 0;
  const shippingCost = shippingMethod === "RESELLER_PICKUP" ? 0 : cartSubtotal > 250 ? 0 : 18.9;
  const cartTotal = Math.max(0, cartSubtotal - discountAmount + shippingCost);

  const toggleFavorite = (productId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setLikedProducts((prev) => ({ ...prev, [productId]: !prev[productId] }));
  };

  const handleDirectWhatsAppProduct = (product: ProductItem, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const storePhone = selectedReseller?.phone?.replace(/\D/g, "") || "5519998765432";
    const extRef = whatsappOrderService.generateExternalReference();

    const msg = whatsappOrderService.formatDirectProductInquiry({
      name: product.name,
      sku: product.sku,
      price: product.price,
      bath: product.bath,
      warrantyMonths: product.warrantyMonths || 12,
      externalReference: extRef,
      resellerName: selectedReseller?.name,
    });

    const waUrl = whatsappOrderService.generateWhatsAppUrl(storePhone, msg);

    // Register background draft order in ERP so it enters the pipeline seamlessly
    whatsappOrderService
      .submitOrderToERP({
        organizationId: tenant.id || "org-lumina-01",
        organizationName: tenant.name || "Lumina Semijoias Nobres",
        salesChannel: "WHATSAPP",
        externalReference: extRef,
        resellerId: selectedReseller?.id,
        resellerName: selectedReseller?.name || "Consultora Lumina",
        customerName: customerName || "Cliente Loja Virtual",
        customerPhone: customerPhone,
        items: [
          {
            productId: product.id,
            sku: product.sku,
            name: product.name,
            quantity: 1,
            unitPrice: product.price,
            totalAmount: product.price,
            bath: product.bath,
          },
        ],
        subtotal: product.price,
        totalAmount: product.price,
        status: "DRAFT",
        isInquiryOnly: true,
      })
      .catch((err) => console.warn("Background WA draft error:", err));

    window.open(waUrl, "_blank");
  };

  const handleOpenProduct = (product: ProductItem) => {
    setSelectedProductForModal(product);
    const heroImage = product.media?.[0]?.url || product.imageUrl || "";
    setModalActiveImageUrl(heroImage);
    setModalBath(product.bath);
    setModalGiftBox(false);
    if (product.isCustomizable) {
      setModalEngraving("Marina");
    }
  };

  const handleAddToCartFromModal = () => {
    if (!selectedProductForModal) return;

    const customization: CustomJewelryOrderSpec | undefined = selectedProductForModal.isCustomizable
      ? {
          engravingName: modalEngraving,
          fontStyle: modalFont,
          gemStone: modalStone,
          bathFinish: modalBath,
          chainLengthCm: 45,
          giftBox: modalGiftBox,
          specialNotes: "Embalagem para presente exclusiva Lumina",
        }
      : undefined;

    const extraGift = modalGiftBox ? 25 : 0;
    const itemTotal = selectedProductForModal.price + extraGift;

    setCartItems((prev) => [
      ...prev,
      {
        product: selectedProductForModal,
        quantity: 1,
        selectedBath: modalBath,
        customization,
        itemTotal,
      },
    ]);

    setSelectedProductForModal(null);
    setIsCartOpen(true);
    confetti({
      particleCount: 30,
      spread: 40,
      origin: { y: 0.8 },
    });
  };

  const handleRemoveFromCart = (index: number) => {
    setCartItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleApplyCoupon = (e: React.FormEvent) => {
    e.preventDefault();
    if (couponCode.toUpperCase() === "LUMINA10" || couponCode.toUpperCase() === "VIP10") {
      setCouponApplied(true);
    }
  };

  const handleCompleteOrder = () => {
    if (cartItems.length === 0) return;

    const orderNum = `ORD-2026-${Math.floor(1840 + Math.random() * 100)}`;
    const warrantyCode = `GRT-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
    const isWhatsAppOrder = paymentMethod === "WHATSAPP";
    const externalRef = whatsappOrderService.generateExternalReference(orderNum);

    const newOrder: UnifiedOrder = {
      id: `ord-${Date.now()}`,
      organizationId: tenant.id || "org-lumina-01",
      orderNumber: orderNum,
      customerId: `cust-buyer-${Date.now()}`,
      customerSnapshot: {
        id: `cust-buyer-${Date.now()}`,
        personType: "PF",
        name: customerName || "Cliente Loja Virtual",
        phone: customerPhone || "(19) 99876-5432",
        email: customerEmail || "cliente@lumina.com.br",
        document: customerCpf || "000.000.000-00",
      },
      channel: isWhatsAppOrder ? "WHATSAPP" : selectedReseller ? "B2B_RESELLER" : "ECOMMERCE",
      status: isWhatsAppOrder ? "INVENTORY_RESERVED" : "PAID",
      shippingAddress: {
        recipientName: customerName || "Cliente",
        zipCode: customerCep || "13480-000",
        street: customerAddress || "Endereço do Cliente",
        number: "S/N",
        neighborhood: "Centro",
        city: "Limeira",
        state: "SP",
        country: "BRA",
        phone: customerPhone || "(19) 99876-5432",
      },
      currency: "BRL",
      subtotalAmount: cartSubtotal,
      discountAmount: discountAmount,
      shippingAmount: shippingCost,
      totalAmount: cartTotal,
      resellerId: selectedReseller?.id,
      resellerName: selectedReseller?.name,
      resellerCommissionRate: selectedReseller?.commissionDirectRate || 25,
      resellerCommissionAmount: selectedReseller
        ? (cartSubtotal * (selectedReseller.commissionDirectRate / 100))
        : 0,
      warrantyCode: warrantyCode,
      externalReference: isWhatsAppOrder ? externalRef : undefined,
      notes: isWhatsAppOrder
        ? `Pedido gerado via WhatsApp com payload rastreável Ref: ${externalRef}. Consultora: ${selectedReseller?.name || "Venda Direta"}.`
        : undefined,
      metadata: {
        organization_id: tenant.id || "org-lumina-01",
        sales_channel: isWhatsAppOrder ? "WHATSAPP" : (selectedReseller ? "B2B_RESELLER" : "ECOMMERCE"),
        external_reference: isWhatsAppOrder ? externalRef : undefined,
        consultant_name: selectedReseller?.name,
        customer_name: customerName,
        skus: cartItems.map((i) => i.product.sku),
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      items: cartItems.map((item, idx) => ({
        id: `item-buyer-${Date.now()}-${idx}`,
        organizationId: tenant.id || "org-lumina-01",
        orderId: `ord-${Date.now()}`,
        productId: item.product.id,
        locationId: "loc-lumina-matriz",
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
          isCustomizable: !!item.product.isCustomizable,
          imageUrl: item.product.imageUrl,
          snapshotTimestamp: new Date().toISOString(),
        },
        quantity: item.quantity,
        unitPrice: item.product.price,
        costPriceSnapshot: item.product.costPrice,
        discountAmount: 0,
        totalAmount: item.product.price * item.quantity,
        customizationSpec: item.customization,
        createdAt: new Date().toISOString(),
      })),
      payments: [
        {
          id: `pay-buyer-${Date.now()}`,
          organizationId: tenant.id || "org-lumina-01",
          orderId: `ord-${Date.now()}`,
          paymentMethod:
            paymentMethod === "CARTAO_CREDITO"
              ? "CREDIT_CARD"
              : paymentMethod === "BOLETO"
              ? "BOLETO"
              : "PIX",
          gateway: isWhatsAppOrder ? "MANUAL" : "MERCADOPAGO",
          status: isWhatsAppOrder ? "PENDING" : "PAID",
          amount: cartTotal,
          installments: 1,
          paidAt: isWhatsAppOrder ? undefined : new Date().toISOString(),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ],
    };

    onPlaceOrder(newOrder);
    setPlacedOrder(newOrder);
    setCheckoutStep("SUCCESS");
    setCartItems([]);

    // Format Traceable WhatsApp message with complete ERP Identification
    const storePhone = selectedReseller?.phone?.replace(/\D/g, "") || "5519998765432";
    
    const waPayload: TraceableWhatsAppOrderPayload = {
      organizationId: tenant.id || "org-lumina-01",
      organizationName: tenant.name || "Lumina Semijoias Nobres",
      salesChannel: "WHATSAPP",
      externalReference: externalRef,
      orderNumber: orderNum,
      resellerId: selectedReseller?.id,
      resellerName: selectedReseller?.name || "Consultora Lumina",
      resellerPhone: selectedReseller?.phone,
      customerName: customerName || "Cliente",
      customerPhone: customerPhone,
      customerCity: customerAddress ? customerAddress.split("-")[0] : "Limeira/SP",
      items: newOrder.items.map((it) => ({
        productId: it.productId,
        sku: it.productSnapshot.sku,
        name: it.productSnapshot.name,
        quantity: it.quantity,
        unitPrice: it.unitPrice,
        totalAmount: it.totalAmount,
        bath: it.productSnapshot.bath,
        customizationSpec: it.customizationSpec,
      })),
      subtotal: cartSubtotal,
      shippingAmount: shippingCost,
      discountAmount: discountAmount,
      totalAmount: cartTotal,
      status: "INVENTORY_RESERVED",
      notes: `Garantia 1 ano (${warrantyCode}) já emitida no sistema.`,
    };

    const waText = whatsappOrderService.formatTraceableMessage(waPayload);
    const waUrl = whatsappOrderService.generateWhatsAppUrl(storePhone, waText);
    setLastWhatsAppUrl(waUrl);

    // Register in ERP backend
    if (isWhatsAppOrder) {
      whatsappOrderService.submitOrderToERP(waPayload).catch((err) => console.warn(err));
      window.open(waUrl, "_blank");
    }

    confetti({
      particleCount: 80,
      spread: 70,
      origin: { y: 0.5 },
    });
  };

  const handleLookupWarranty = (e: React.FormEvent) => {
    e.preventDefault();
    if (!warrantySearchCode) return;
    const found = warranties.find(
      (w) =>
        w.code.toUpperCase() === warrantySearchCode.trim().toUpperCase() ||
        w.orderNumber.toUpperCase() === warrantySearchCode.trim().toUpperCase() ||
        w.customerDocument.includes(warrantySearchCode.trim())
    );
    setFoundWarranty(found || null);
  };

  return (
    <div className="min-h-screen bg-[#FAF9F6] text-stone-900 flex flex-col font-sans selection:bg-amber-100 selection:text-amber-900">
      {/* Top Banner: Reseller Attribution & ERP Switch */}
      <div className="bg-stone-900 text-stone-100 text-xs py-2 px-4 border-b border-stone-800">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          {/* Active Consultant Pill */}
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-stone-300 font-medium">Você está comprando com a Consultora Oficial:</span>
            <select
              value={selectedResellerId}
              onChange={(e) => setSelectedResellerId(e.target.value)}
              className="bg-stone-800 text-amber-300 font-semibold px-2.5 py-0.5 rounded-full border border-stone-700 text-xs cursor-pointer focus:outline-none"
            >
              <option value="">✨ Matriz Direta (Lumina Semijoias)</option>
              {resellers.map((r) => (
                <option key={r.id} value={r.id}>
                  💎 {r.name} ({r.city} - {r.state}) • Nível {r.level}
                </option>
              ))}
            </select>
          </div>

          {/* Quick ERP return button & Warranty Lookup & Home */}
          <div className="flex items-center gap-3">
            {onNavigateToHome && (
              <button
                onClick={onNavigateToHome}
                className="flex items-center gap-1 text-stone-300 hover:text-amber-300 transition-colors text-[11px] font-semibold tracking-wide cursor-pointer"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                <span>Tela Inicial & Promos</span>
              </button>
            )}
            {onNavigateToHome && <span className="text-stone-700">|</span>}
            <button
              onClick={() => setIsWarrantyLookupOpen(true)}
              className="flex items-center gap-1 text-stone-300 hover:text-white transition-colors text-[11px] font-semibold tracking-wide"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
              <span>Validar Certificado QR</span>
            </button>
            <span className="text-stone-700">|</span>
            <button
              onClick={() => onNavigateToERP("dashboard")}
              className="flex items-center gap-1 px-2.5 py-1 bg-stone-800 hover:bg-stone-700 text-stone-200 rounded-full font-bold text-[10px] tracking-wider uppercase transition-all"
            >
              <Layers className="w-3 h-3 text-amber-400" />
              <span>Painel ERP</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Luxury Header */}
      <header className="sticky top-0 z-30 bg-[#FAF9F6]/95 backdrop-blur-md border-b border-stone-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between gap-4">
          {/* Brand Logo & Editorial Typography */}
          <div
            onClick={onNavigateToHome}
            className={`flex items-baseline gap-3 ${onNavigateToHome ? "cursor-pointer group" : ""}`}
            title={onNavigateToHome ? "Voltar para a Tela Inicial" : undefined}
          >
            {branding?.logoType === "IMAGE" && branding.logoUrl ? (
              <img
                src={branding.logoUrl}
                alt={branding.logoText || "Lumina"}
                className="h-8 w-auto max-w-[140px] object-contain"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = "none";
                }}
              />
            ) : (
              <h1 className="text-3xl sm:text-4xl font-serif italic font-bold tracking-wide text-stone-900 group-hover:text-amber-700 transition-colors">
                {branding?.logoText || "Lumina"}
              </h1>
            )}
            <span
              className="text-[10px] font-bold tracking-[0.3em] uppercase font-sans hidden sm:inline-block"
              style={{ color: branding?.primaryColor || "#B45309" }}
            >
              {branding?.logoSubtext || "Alta Joalheria Contemporânea"}
            </span>
          </div>

          {/* Search bar */}
          <div className="hidden md:flex flex-1 max-w-md mx-6 relative">
            <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-3" />
            <input
              type="text"
              placeholder="Buscar colares riviera, brincos com banho 18k, anéis..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-white border border-stone-200 rounded-full pl-10 pr-4 py-2 text-xs text-stone-900 placeholder-stone-400 focus:outline-none focus:border-stone-400 shadow-xs"
            />
          </div>

          {/* Right Actions: Cart & Favorites */}
          <div className="flex items-center gap-2 sm:gap-3">
            <button
              onClick={() => setIsShareModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-emerald-900 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-full shadow-xs cursor-pointer transition-colors"
              title="Compartilhar catálogo via WhatsApp e Instagram"
            >
              <Share2 className="w-3.5 h-3.5 text-emerald-700" />
              <span className="hidden sm:inline">Compartilhar</span>
            </button>

            <button
              onClick={() => setIsWarrantyLookupOpen(true)}
              className="hidden lg:flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-stone-700 hover:text-stone-950 border border-stone-200 rounded-full bg-white shadow-xs"
            >
              <QrCode className="w-3.5 h-3.5 text-stone-600" />
              <span>Garantia Digital</span>
            </button>

            {/* Cart Button */}
            <button
              onClick={() => setIsCartOpen(true)}
              className="relative flex items-center gap-2 px-4 py-2 bg-stone-900 text-white rounded-full text-xs font-bold uppercase tracking-wider hover:bg-stone-800 transition-all shadow-md cursor-pointer"
            >
              <ShoppingBag className="w-4 h-4 text-amber-400" />
              <span>Sacola</span>
              {cartItems.length > 0 && (
                <span className="w-5 h-5 bg-amber-400 text-stone-950 font-bold rounded-full text-[11px] flex items-center justify-center -mr-1">
                  {cartItems.length}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Categories Horizontal Navigation Bar */}
        <div className="border-t border-stone-200 bg-white/60">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex space-x-2 overflow-x-auto py-2.5 scrollbar-none text-xs font-semibold">
            {[
              { id: "TODOS", label: "Coleção Completa" },
              { id: "COLARES", label: "Colares & Riviera" },
              { id: "BRINCOS", label: "Brincos & Argolas" },
              { id: "ANEIS", label: "Anéis & Solitários" },
              { id: "PULSEIRAS", label: "Pulseiras & Braceletes" },
              { id: "PERSONALIZADOS", label: "Personalizados com Nome 💎" },
            ].map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-4 py-1.5 rounded-full whitespace-nowrap transition-all ${
                  selectedCategory === cat.id
                    ? "bg-stone-900 text-white shadow-xs"
                    : "text-stone-600 hover:text-stone-900 hover:bg-stone-100"
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* Hero Editorial Showcase Banner */}
      <section className="relative overflow-hidden bg-gradient-to-r from-stone-900 via-stone-800 to-stone-900 text-white py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          <div className="lg:col-span-7 space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-400/10 border border-amber-400/30 text-amber-300 text-xs font-semibold tracking-wider uppercase">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Coleção Riviera & Alta Lapidação 2026</span>
            </div>
            <h2 className="text-3xl sm:text-5xl font-serif italic font-normal tracking-wide text-stone-100 leading-tight">
              A sofisticação do ouro nobre com certificado digital de 1 ano.
            </h2>
            <p className="text-sm text-stone-300 max-w-xl font-sans leading-relaxed">
              Semijoias com camada nobre de 10 milésimos de Ouro 18K, tecnologia hipoalergênica níquel-free e passaporte de garantia digital emitido em blockchain privada com QR Code.
            </p>
            <div className="flex flex-wrap gap-4 pt-2">
              <button
                onClick={() => {
                  const customProd = products.find((p) => p.isCustomizable);
                  if (customProd) handleOpenProduct(customProd);
                }}
                className="px-6 py-3 rounded-full bg-white text-stone-900 font-bold text-xs uppercase tracking-widest hover:bg-amber-50 transition-all shadow-lg flex items-center gap-2 cursor-pointer"
              >
                <Crown className="w-4 h-4 text-amber-600" />
                <span>Personalizar Meu Colar</span>
              </button>

              <button
                onClick={() => setSelectedCategory("COLARES")}
                className="px-6 py-3 rounded-full bg-stone-800 hover:bg-stone-700 text-stone-200 font-semibold text-xs uppercase tracking-wider border border-stone-700 transition-all"
              >
                Explorar Riviera
              </button>
            </div>
          </div>

          {/* Right Hero Highlights Box */}
          <div className="lg:col-span-5 bg-white/10 backdrop-blur-md border border-white/20 p-6 rounded-3xl space-y-4 text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <span className="font-serif italic text-lg text-amber-200">Diferenciais Lumina</span>
              <ShieldCheck className="w-5 h-5 text-emerald-400" />
            </div>

            <div className="space-y-3 text-stone-200">
              <div className="flex items-start gap-3">
                <div className="p-1.5 rounded-lg bg-amber-400/20 text-amber-300 shrink-0">
                  <Crown className="w-4 h-4" />
                </div>
                <div>
                  <p className="font-bold text-white">Banho Nobre 10 Milésimos</p>
                  <p className="text-[11px] text-stone-300">Resistência superior com verniz nanotecnológico suíço.</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="p-1.5 rounded-lg bg-emerald-400/20 text-emerald-300 shrink-0">
                  <QrCode className="w-4 h-4" />
                </div>
                <div>
                  <p className="font-bold text-white">Garantia Digital com QR Code</p>
                  <p className="text-[11px] text-stone-300">Sem papéis perdidos: consulte a autenticidade a qualquer momento.</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="p-1.5 rounded-lg bg-sky-400/20 text-sky-300 shrink-0">
                  <Gift className="w-4 h-4" />
                </div>
                <div>
                  <p className="font-bold text-white">Embalagem de Presente & Velvet Bag</p>
                  <p className="text-[11px] text-stone-300">Caixa rígida com fita de gorgurão e sacola perfumada.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Trust & Guarantee Bar */}
      <section className="bg-white border-b border-stone-200 py-4 px-4 text-xs text-stone-600">
        <div className="max-w-7xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-4 text-center sm:text-left">
          <div className="flex items-center justify-center sm:justify-start gap-3">
            <Truck className="w-5 h-5 text-stone-800 shrink-0" />
            <div>
              <p className="font-bold text-stone-900">Frete Grátis</p>
              <p className="text-[11px] text-stone-500">Em compras acima de R$ 250</p>
            </div>
          </div>

          <div className="flex items-center justify-center sm:justify-start gap-3">
            <CreditCard className="w-5 h-5 text-stone-800 shrink-0" />
            <div>
              <p className="font-bold text-stone-900">Até 6x Sem Juros</p>
              <p className="text-[11px] text-stone-500">Ou 5% de desconto no PIX</p>
            </div>
          </div>

          <div className="flex items-center justify-center sm:justify-start gap-3">
            <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0" />
            <div>
              <p className="font-bold text-stone-900">1 Ano de Garantia</p>
              <p className="text-[11px] text-stone-500">Certificado digital com QR</p>
            </div>
          </div>

          <div className="flex items-center justify-center sm:justify-start gap-3">
            <RotateCcw className="w-5 h-5 text-stone-800 shrink-0" />
            <div>
              <p className="font-bold text-stone-900">Troca Fácil em 7 Dias</p>
              <p className="text-[11px] text-stone-500">Primeira devolução por nossa conta</p>
            </div>
          </div>
        </div>
      </section>

      {/* Main Product Showcase Grid */}
      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 w-full space-y-8">
        <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-4 pb-4 border-b border-stone-200">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-stone-400">
                Vitrine Exclusiva Lumina
              </span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-serif italic font-bold tracking-wide text-stone-900 mt-1">
              Catálogo de Alta Semijoias
            </h2>
            <p className="text-xs text-stone-600 mt-1 max-w-2xl font-sans leading-relaxed">
              Peças fundidas em ligas nobres com acabamento artesanal, cravamento manual de zircônias e banho antialérgico de alta densidade.
            </p>
          </div>

          <div className="text-xs text-stone-500 font-semibold">
            Exibindo {filteredProducts.length} peças exclusivas
          </div>
        </div>

        {/* Product Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {filteredProducts.map((product) => {
            const pixInfo = calculatePixPrice(product.price, currentPaymentSettings);
            const installmentHighlight = getBestInstallmentHighlight(product.price, currentPaymentSettings);
            const availability = clientInventoryService.evaluateProductAvailability(product, branding);
            const isOutOfStock = availability.status === "OUT_OF_STOCK";
            const isLiked = Boolean(likedProducts[product.id]);

            const bathLabel =
              product.bath === "OURO_18K"
                ? "Ouro 18K"
                : product.bath === "RODIO_BRANCO"
                ? "Ródio Branco"
                : product.bath === "ROSE_GOLD"
                ? "Ouro Rosé"
                : product.bath || "Banho Nobre";

            return (
              <div
                key={product.id}
                onClick={() => handleOpenProduct(product)}
                className="group bg-white border border-stone-200/80 rounded-3xl overflow-hidden shadow-xs hover:shadow-xl hover:border-amber-200 transition-all duration-300 flex flex-col justify-between cursor-pointer"
              >
                {/* Product Image Frame */}
                <div className="relative aspect-4/5 overflow-hidden bg-stone-100/80">
                  <img
                    src={product.imageUrl}
                    alt={product.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out"
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

                  {/* Badges */}
                  <div className="absolute top-3 left-3 flex flex-col gap-1.5 z-10 pointer-events-none">
                    <span className="bg-white/95 backdrop-blur-md text-stone-900 text-[10px] font-semibold tracking-wide px-2.5 py-1 rounded-full border border-stone-200/80 shadow-2xs">
                      {bathLabel}
                    </span>

                    {product.isCustomizable && (
                      <span className="bg-amber-900/90 backdrop-blur-md text-amber-200 text-[9px] font-bold tracking-wider uppercase px-2.5 py-0.5 rounded-full border border-amber-700/50 flex items-center gap-1 shadow-2xs">
                        <Crown className="w-3 h-3 text-amber-400" />
                        <span>Personalizável</span>
                      </span>
                    )}

                    {isOutOfStock && (
                      <span className="bg-amber-900/90 backdrop-blur-md text-amber-200 text-[9px] font-bold tracking-wider uppercase px-2 py-0.5 rounded-full border border-amber-700/50">
                        {availability.statusBadgeText}
                      </span>
                    )}
                  </div>

                  {/* Bottom Strip: 1 Year Warranty */}
                  <div className="absolute bottom-2.5 left-3 pointer-events-none">
                    <span className="bg-stone-950/70 backdrop-blur-md text-stone-100 text-[9px] font-medium px-2 py-0.5 rounded-full flex items-center gap-1">
                      <ShieldCheck className="w-3 h-3 text-emerald-400" />
                      <span>Garantia 12 Meses</span>
                    </span>
                  </div>
                </div>

                {/* Info & Conversion Action */}
                <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-[11px] text-amber-900/70 font-medium">
                      <span>{bathLabel}</span>
                      <span className="text-stone-400">• Antialérgico</span>
                    </div>
                    <h3 className="text-base font-serif italic font-bold text-stone-900 group-hover:text-amber-950 transition-colors leading-snug">
                      {product.name}
                    </h3>
                    <p className="text-xs text-stone-500 line-clamp-2 leading-relaxed">
                      {product.description}
                    </p>
                  </div>

                  <div className="pt-3 border-t border-stone-100 space-y-3">
                    <div>
                      <div className="flex items-baseline gap-2">
                        <span className="text-xl font-serif font-bold text-stone-900">
                          R$ {product.price.toFixed(2).replace(".", ",")}
                        </span>
                        {pixInfo.isDiscountActive && (
                          <span className="text-[10px] text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                            R$ {pixInfo.pixPrice.toFixed(2).replace(".", ",")} no PIX
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-stone-500 font-medium mt-0.5">
                        {installmentHighlight}
                      </p>
                    </div>

                    {/* High-Conversion Actions */}
                    <div className="space-y-1.5 pt-1">
                      <button
                        type="button"
                        onClick={(e) => handleDirectWhatsAppProduct(product, e)}
                        className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 active:scale-[0.99] text-white rounded-2xl text-xs font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer shadow-xs hover:shadow-md"
                        title="Pedir direto no WhatsApp sem necessidade de cadastro"
                      >
                        <MessageCircle className="w-4 h-4 fill-white/20" />
                        <span>Quero este 💬</span>
                      </button>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenProduct(product);
                        }}
                        className="w-full py-2 px-3 bg-stone-50 hover:bg-stone-100 text-stone-700 rounded-xl text-[11px] font-semibold transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <ShoppingBag className="w-3.5 h-3.5 text-stone-500" />
                        <span>Ver Detalhes / Sacola</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </main>

      {/* Product Detail & Live Customizer Modal */}
      {selectedProductForModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-stone-200 rounded-3xl max-w-3xl w-full max-h-[90vh] overflow-y-auto shadow-2xl p-6 sm:p-8 space-y-5">
            {/* Modal Top Bar & Clean Public URL Simulator */}
            <div className="space-y-3 pb-3 border-b border-stone-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-stone-400">
                    {selectedProductForModal.sku} • Coleção {selectedProductForModal.collection}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedProductForModal(null)}
                  className="p-1.5 rounded-full text-stone-400 hover:text-stone-800 hover:bg-stone-100 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Public Product Direct URL Bar */}
              <div className="flex items-center justify-between gap-2 bg-stone-50 border border-stone-200 rounded-xl px-3 py-1.5 text-xs text-stone-600">
                <div className="flex items-center gap-2 truncate font-mono text-[11px]">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                  <span className="text-stone-400">URL Pública:</span>
                  <span className="text-stone-900 truncate font-semibold">
                    app.lumina.com/loja/lumina-semijoias/produto/{selectedProductForModal.sku.toLowerCase()}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const prodUrl = `${window.location.origin}/?loja=lumina-semijoias&produto=${encodeURIComponent(
                      selectedProductForModal.sku
                    )}#produto`;
                    navigator.clipboard.writeText(prodUrl);
                    setCopiedModalUrl(true);
                    setTimeout(() => setCopiedModalUrl(false), 2500);
                  }}
                  className="px-2.5 py-1 rounded-lg bg-white border border-stone-300 hover:border-stone-400 text-[11px] font-bold text-stone-800 shrink-0 flex items-center gap-1 cursor-pointer transition-all shadow-xs"
                >
                  {copiedModalUrl ? (
                    <>
                      <Check className="w-3 h-3 text-emerald-600" />
                      <span className="text-emerald-700">Link Copiado!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3 text-stone-500" />
                      <span>Copiar Link</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
              {/* Product Visual & Live Mockup */}
              <div className="space-y-4">
                {(() => {
                  const mediaGallery = (selectedProductForModal.media && selectedProductForModal.media.length > 0)
                    ? [...selectedProductForModal.media].sort((a, b) => a.sort_order - b.sort_order).map((m) => m.url)
                    : (selectedProductForModal.galleryUrls && selectedProductForModal.galleryUrls.length > 0)
                    ? selectedProductForModal.galleryUrls
                    : [selectedProductForModal.imageUrl];

                  const currentImg = modalActiveImageUrl || mediaGallery[0] || selectedProductForModal.imageUrl;

                  return (
                    <div className="space-y-3">
                      <div className="aspect-square rounded-2xl overflow-hidden bg-stone-100 border border-stone-200 relative group">
                        <img
                          src={currentImg}
                          alt={selectedProductForModal.name}
                          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                        />

                        {/* Live Engraving Overlay if Customizable */}
                        {selectedProductForModal.isCustomizable && (
                          <div className="absolute inset-0 bg-black/25 flex flex-col items-center justify-center p-4 text-center">
                            <div className="bg-amber-100/90 border border-amber-300 text-stone-900 px-4 py-3 rounded-xl shadow-lg backdrop-blur-sm">
                              <span className="text-[9px] uppercase tracking-widest text-stone-600 block mb-1 font-bold">
                                Prévia da Gravação a Laser:
                              </span>
                              <span
                                className={`text-xl font-bold tracking-wider ${
                                  modalFont === "CURSIVA"
                                    ? "font-serif italic"
                                    : modalFont === "CLASSICA"
                                    ? "font-serif"
                                    : "font-mono uppercase"
                                }`}
                              >
                                {modalEngraving || "Seu Nome"}
                              </span>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Horizontal Thumbnail Gallery */}
                      {mediaGallery.length > 1 && (
                        <div className="flex items-center gap-2 overflow-x-auto pb-1">
                          {mediaGallery.map((imgUrl, idx) => (
                            <button
                              key={idx}
                              type="button"
                              onClick={() => setModalActiveImageUrl(imgUrl)}
                              className={`w-14 h-14 rounded-xl overflow-hidden border-2 transition-all shrink-0 cursor-pointer ${
                                currentImg === imgUrl
                                  ? "border-amber-500 ring-2 ring-amber-300 scale-105"
                                  : "border-stone-200 opacity-70 hover:opacity-100"
                              }`}
                            >
                              <img src={imgUrl} alt={`Foto ${idx + 1}`} className="w-full h-full object-cover" />
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })()}

                {/* Technical Specifications Card */}
                <div className="p-3.5 bg-stone-50 border border-stone-200 rounded-2xl text-xs space-y-2">
                  <div className="flex items-center justify-between font-bold text-stone-800 pb-1.5 border-b border-stone-200">
                    <span className="flex items-center gap-1.5">
                      <ShieldCheck className="w-4 h-4 text-emerald-600" />
                      <span>Garantia &amp; Especificações</span>
                    </span>
                    <span className="text-[10px] text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full font-bold">
                      {selectedProductForModal.warrantyMonths || 12} Meses
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-[11px] text-stone-600">
                    <div>
                      <span className="text-stone-400 block text-[10px]">Material / Banho</span>
                      <strong className="text-stone-800">
                        {selectedProductForModal.bath?.replace("_", " ")}
                      </strong>
                    </div>
                    <div>
                      <span className="text-stone-400 block text-[10px]">Pedras Cravadas</span>
                      <strong className="text-stone-800">
                        {selectedProductForModal.stones?.join(", ") || "Zircônia 5A"}
                      </strong>
                    </div>
                    <div>
                      <span className="text-stone-400 block text-[10px]">Proteção Antialérgica</span>
                      <strong className="text-stone-800">Verniz Hipoalergênico</strong>
                    </div>
                    <div>
                      <span className="text-stone-400 block text-[10px]">Disponibilidade</span>
                      {(() => {
                        const modalAvail = clientInventoryService.evaluateProductAvailability(selectedProductForModal, branding);
                        return (
                          <div>
                            <strong className={modalAvail.isPurchasable ? "text-emerald-700 font-bold" : "text-rose-700 font-bold"}>
                              {modalAvail.statusBadgeText}
                            </strong>
                            <div className="text-[9px] text-stone-500 font-mono mt-0.5">
                              Disponível: {modalAvail.availableQuantity} un (Físico: {modalAvail.onHandQuantity} | Reservado: {modalAvail.reservedQuantity})
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  </div>
                </div>
              </div>

              {/* Options and Purchase Form */}
              <div className="space-y-5">
                <div>
                  {(() => {
                    const modalAvail = clientInventoryService.evaluateProductAvailability(selectedProductForModal, branding);
                    return (
                      <div className="flex items-center gap-2 mb-1.5">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${
                            modalAvail.isPurchasable
                              ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                              : modalAvail.actionType === "SOB_CONSULTA"
                              ? "bg-amber-50 text-amber-800 border border-amber-200"
                              : "bg-rose-50 text-rose-800 border border-rose-200"
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              modalAvail.isPurchasable ? "bg-emerald-500 animate-pulse" : "bg-rose-500"
                            }`}
                          />
                          {modalAvail.isPurchasable
                            ? `${modalAvail.availableQuantity} un em estoque para pronta entrega`
                            : `Status de Estoque: ${modalAvail.statusBadgeText}`}
                        </span>
                        <span className="text-[11px] text-stone-400">
                          Ref: {selectedProductForModal.sku}
                        </span>
                      </div>
                    );
                  })()}

                  <h3 className="text-2xl font-serif italic font-bold text-stone-900">
                    {selectedProductForModal.name}
                  </h3>
                  {(() => {
                    const modalPixInfo = calculatePixPrice(selectedProductForModal.price, currentPaymentSettings);
                    const modalInstallmentHighlight = getBestInstallmentHighlight(selectedProductForModal.price, currentPaymentSettings);
                    const modalInstallmentOptions = calculateInstallmentOptions(selectedProductForModal.price, currentPaymentSettings);

                    return (
                      <div className="space-y-1.5 mt-2">
                        <div className="flex items-baseline gap-2">
                          <span className="text-2xl font-serif font-bold text-stone-900">
                            R$ {selectedProductForModal.price.toFixed(2)}
                          </span>
                          {modalPixInfo.isDiscountActive && (
                            <span className="text-xs text-emerald-700 font-bold bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                              R$ {modalPixInfo.pixPrice.toFixed(2)} no PIX ({modalPixInfo.discountPercent}% OFF)
                            </span>
                          )}
                        </div>
                        <div className="flex flex-wrap items-center justify-between gap-1 pt-0.5">
                          <p className="text-xs text-stone-600 font-medium">
                            {modalInstallmentHighlight}
                          </p>
                          <button
                            type="button"
                            onClick={() => setShowModalInstallmentTable(!showModalInstallmentTable)}
                            className="text-[11px] text-amber-800 hover:text-amber-900 font-bold underline cursor-pointer"
                          >
                            {showModalInstallmentTable ? "Ocultar parcelas" : "Ver tabela de parcelamento"}
                          </button>
                        </div>

                        {/* Expandable installment table */}
                        {showModalInstallmentTable && (
                          <div className="p-3 bg-stone-50 border border-stone-200 rounded-2xl space-y-1 max-h-36 overflow-y-auto mt-2 text-xs animate-in fade-in">
                            {modalInstallmentOptions.map((opt) => (
                              <div
                                key={opt.installments}
                                className="flex items-center justify-between text-[11px] font-mono text-stone-700 py-1 border-b border-stone-200/60 last:border-0"
                              >
                                <span className="font-bold">
                                  {opt.installments}x de R$ {opt.installmentValue.toFixed(2)}
                                </span>
                                <span
                                  className={
                                    opt.isInterestFree
                                      ? "text-emerald-700 font-sans font-bold text-[10px]"
                                      : "text-stone-500 font-sans text-[10px]"
                                  }
                                >
                                  {opt.isInterestFree
                                    ? "sem acréscimo"
                                    : `total R$ ${opt.totalAmount.toFixed(2)} (+${opt.interestRatePercent}%)`}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </div>

                {/* Bath Selection */}
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-stone-500">
                    Escolha o Banho Nobre
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { id: "OURO_18K", label: "Ouro 18K (10 Milésimos)" },
                      { id: "RODIO_BRANCO", label: "Ródio Branco Nobre" },
                      { id: "ROSE_GOLD", label: "Ouro Rosé" },
                      { id: "RODIO_NEGRO", label: "Ródio Negro" },
                    ].map((b) => (
                      <button
                        key={b.id}
                        onClick={() => setModalBath(b.id as JewelryBath)}
                        className={`p-2.5 rounded-xl border text-xs font-semibold text-left transition-all ${
                          modalBath === b.id
                            ? "bg-stone-900 text-white border-stone-900 shadow-xs"
                            : "bg-white text-stone-700 border-stone-200 hover:bg-stone-50"
                        }`}
                      >
                        {b.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* If Customizable: Input for Name */}
                {selectedProductForModal.isCustomizable && (
                  <div className="space-y-3 p-4 bg-amber-50/60 border border-amber-200/80 rounded-2xl">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-amber-950 uppercase tracking-wider">
                      <Crown className="w-3.5 h-3.5 text-amber-600" />
                      <span>Gravação Personalizada</span>
                    </div>

                    <div>
                      <label className="text-[11px] font-semibold text-stone-600 block mb-1">
                        Nome ou Iniciais a Gravar na Peça:
                      </label>
                      <input
                        type="text"
                        maxLength={18}
                        value={modalEngraving}
                        onChange={(e) => setModalEngraving(e.target.value)}
                        className="w-full bg-white border border-stone-300 rounded-xl px-3 py-2 text-sm font-semibold text-stone-900 focus:outline-none focus:border-stone-800"
                        placeholder="Ex: Marina, Ana Clara, Luiza..."
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-semibold text-stone-600 block mb-1">
                        Estilo Tipográfico da Gravação:
                      </label>
                      <select
                        value={modalFont}
                        onChange={(e) => setModalFont(e.target.value as any)}
                        className="w-full bg-white border border-stone-300 rounded-xl px-3 py-2 text-xs font-medium text-stone-800"
                      >
                        <option value="CURSIVA">Cursiva Caligráfica Elegante</option>
                        <option value="CLASSICA">Serifada Romana Imperial</option>
                        <option value="MINIMALISTA">Minimalista Moderna Sans</option>
                      </select>
                    </div>
                  </div>
                )}

                {/* Gift Box Checkbox */}
                <label className="flex items-center gap-3 p-3 rounded-2xl bg-stone-50 border border-stone-200 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={modalGiftBox}
                    onChange={(e) => setModalGiftBox(e.target.checked)}
                    className="w-4 h-4 rounded text-stone-900 accent-stone-900 cursor-pointer"
                  />
                  <div className="text-xs">
                    <span className="font-bold text-stone-900">Embalagem Especial para Presente (+ R$ 25,00)</span>
                    <p className="text-[10px] text-stone-500">Caixa rígida com laço de veludo e sacola perfumada.</p>
                  </div>
                </label>

                {/* Action Buttons */}
                {(() => {
                  const modalAvail = clientInventoryService.evaluateProductAvailability(selectedProductForModal, branding);
                  const isOutOfStock = !modalAvail.isPurchasable;

                  return (
                    <div className="pt-2 space-y-2">
                      {isOutOfStock ? (
                        <div className="p-3 bg-rose-50 border border-rose-200 rounded-2xl text-center space-y-1">
                          <p className="text-xs font-bold text-rose-800">
                            Indisponível para Compra Direta ({modalAvail.statusBadgeText})
                          </p>
                          <p className="text-[11px] text-rose-600">
                            Esta peça tem {modalAvail.reservedQuantity} un reservada(s) em pedidos e estoque disponível zerado.
                          </p>
                        </div>
                      ) : (
                        <button
                          onClick={handleAddToCartFromModal}
                          className="w-full py-3.5 bg-stone-900 hover:bg-stone-800 text-white rounded-2xl text-xs font-bold uppercase tracking-widest transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
                        >
                          <ShoppingBag className="w-4 h-4 text-amber-400" />
                          <span>Adicionar à Sacola • R$ {(selectedProductForModal.price + (modalGiftBox ? 25 : 0)).toFixed(2)}</span>
                        </button>
                      )}

                      <button
                        onClick={() => {
                          const storePhone = selectedReseller?.phone?.replace(/\D/g, "") || "5519998765432";
                          const extRef = whatsappOrderService.generateExternalReference();
                          
                          const directPayload: TraceableWhatsAppOrderPayload = {
                            organizationId: tenant.id || "org-lumina-01",
                            organizationName: tenant.name || "Lumina Semijoias Nobres",
                            salesChannel: "WHATSAPP",
                            externalReference: extRef,
                            resellerId: selectedReseller?.id,
                            resellerName: selectedReseller?.name || "Maria Silva (Consultora Lumina)",
                            resellerPhone: selectedReseller?.phone,
                            customerName: customerName || "Cliente Loja Virtual",
                            customerPhone: customerPhone,
                            customerCity: customerAddress ? customerAddress.split("-")[0] : "Limeira/SP",
                            items: [
                              {
                                productId: selectedProductForModal.id,
                                sku: selectedProductForModal.sku,
                                name: selectedProductForModal.name,
                                quantity: 1,
                                unitPrice: selectedProductForModal.price,
                                totalAmount: selectedProductForModal.price,
                                bath: modalBath,
                                customizationSpec: selectedProductForModal.isCustomizable
                                  ? { engravingName: modalEngraving, fontStyle: modalFont }
                                  : undefined,
                              },
                            ],
                            subtotal: selectedProductForModal.price,
                            totalAmount: selectedProductForModal.price + (modalGiftBox ? 25 : 0),
                            status: isOutOfStock ? "DRAFT" : "INVENTORY_RESERVED",
                            isInquiryOnly: isOutOfStock,
                            notes: isOutOfStock
                              ? `Consulta de disponibilidade sob demanda para ${selectedProductForModal.sku}`
                              : `Pedido direto do catálogo via WhatsApp. SKU: ${selectedProductForModal.sku}.`,
                          };

                          const msg = whatsappOrderService.formatTraceableMessage(directPayload);
                          const waUrl = whatsappOrderService.generateWhatsAppUrl(storePhone, msg);
                          
                          // Register in ERP in background
                          whatsappOrderService.submitOrderToERP(directPayload).catch((e) => console.warn(e));

                          window.open(waUrl, "_blank");
                        }}
                        className={`w-full py-3 rounded-2xl text-xs font-bold transition-all shadow-sm flex items-center justify-center gap-2 cursor-pointer ${
                          isOutOfStock
                            ? "bg-amber-600 hover:bg-amber-700 text-white font-bold"
                            : "bg-emerald-600 hover:bg-emerald-700 text-white"
                        }`}
                      >
                        <MessageCircle className="w-4 h-4" />
                        <span>
                          {isOutOfStock
                            ? `${modalAvail.actionLabel} no WhatsApp`
                            : "Pedir Imediatamente no WhatsApp (Rastreável)"}
                        </span>
                      </button>
                    </div>
                  );
                })()}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Cart Drawer & Slide-over */}
      {isCartOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex justify-end">
          <div className="bg-white w-full max-w-md h-full flex flex-col justify-between p-6 shadow-2xl overflow-y-auto">
            <div className="space-y-6">
              {/* Header */}
              <div className="flex items-center justify-between pb-4 border-b border-stone-200">
                <div className="flex items-center gap-2">
                  <ShoppingBag className="w-5 h-5 text-stone-900" />
                  <h3 className="text-xl font-serif italic font-bold text-stone-900">
                    Sua Sacola de Joias ({cartItems.length})
                  </h3>
                </div>
                <button
                  onClick={() => setIsCartOpen(false)}
                  className="p-1 rounded-full text-stone-400 hover:text-stone-800"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Items List */}
              {cartItems.length === 0 ? (
                <div className="text-center py-12 space-y-3">
                  <ShoppingBag className="w-12 h-12 text-stone-300 mx-auto" />
                  <p className="font-serif italic text-lg text-stone-600">Sua sacola está vazia.</p>
                  <p className="text-xs text-stone-400">Escolha peças exclusivas do catálogo para adicionar.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {cartItems.map((item, idx) => (
                    <div
                      key={idx}
                      className="p-3.5 bg-stone-50 border border-stone-200 rounded-2xl flex gap-3 items-start justify-between"
                    >
                      <img
                        src={item.product.imageUrl}
                        alt={item.product.name}
                        className="w-16 h-16 rounded-xl object-cover border border-stone-200 shrink-0"
                      />
                      <div className="flex-1 overflow-hidden">
                        <p className="text-xs font-bold text-stone-900 truncate">{item.product.name}</p>
                        <p className="text-[10px] text-stone-500">Banho: {item.selectedBath}</p>
                        {item.customization && (
                          <span className="inline-block mt-0.5 text-[10px] font-semibold text-amber-800 bg-amber-100 px-1.5 py-0.2 rounded">
                            Gravação: "{item.customization.engravingName}"
                          </span>
                        )}
                        <p className="text-xs font-serif font-bold text-stone-900 mt-1">
                          R$ {item.itemTotal.toFixed(2)}
                        </p>
                      </div>

                      <button
                        onClick={() => handleRemoveFromCart(idx)}
                        className="text-stone-400 hover:text-rose-600 p-1"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Subtotal & Proceed to Checkout */}
            {cartItems.length > 0 && (
              <div className="pt-6 border-t border-stone-200 space-y-4">
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between text-stone-600">
                    <span>Subtotal</span>
                    <span className="font-mono font-bold">R$ {cartSubtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-stone-600">
                    <span>Certificado de Garantia QR</span>
                    <span className="text-emerald-700 font-bold">Incluso (Grátis)</span>
                  </div>
                  <div className="flex justify-between text-stone-900 text-sm font-bold pt-2 border-t border-stone-100">
                    <span>Total Estimado</span>
                    <span className="font-serif text-lg">R$ {cartSubtotal.toFixed(2)}</span>
                  </div>
                </div>

                <button
                  onClick={() => {
                    setIsCartOpen(false);
                    setIsCheckoutOpen(true);
                    setCheckoutStep("CUSTOMER");
                  }}
                  className="w-full py-3.5 bg-stone-900 hover:bg-stone-800 text-white rounded-2xl text-xs font-bold uppercase tracking-widest transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
                >
                  <span>Fechar Pedido</span>
                  <ArrowRight className="w-4 h-4 text-amber-400" />
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Complete Checkout Modal */}
      {isCheckoutOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-stone-200 rounded-3xl max-w-2xl w-full max-h-[92vh] overflow-y-auto shadow-2xl p-6 sm:p-8 space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between pb-4 border-b border-stone-200">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-stone-400">
                  Checkout Seguro • Lumina Semijoias
                </span>
                <h3 className="text-2xl font-serif italic font-bold text-stone-900 mt-0.5">
                  Finalização do Pedido
                </h3>
              </div>
              <button
                onClick={() => setIsCheckoutOpen(false)}
                className="p-1 rounded-full text-stone-400 hover:text-stone-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Stepper */}
            {checkoutStep !== "SUCCESS" && (
              <div className="flex items-center justify-between text-xs font-semibold pb-4 border-b border-stone-100">
                <div
                  className={`flex items-center gap-1.5 ${
                    checkoutStep === "CUSTOMER" ? "text-stone-900 font-bold" : "text-stone-400"
                  }`}
                >
                  <span className="w-5 h-5 rounded-full bg-stone-900 text-white flex items-center justify-center text-[10px]">
                    1
                  </span>
                  <span>Identificação & Entrega</span>
                </div>
                <ChevronRight className="w-4 h-4 text-stone-300" />
                <div
                  className={`flex items-center gap-1.5 ${
                    checkoutStep === "PAYMENT" ? "text-stone-900 font-bold" : "text-stone-400"
                  }`}
                >
                  <span className="w-5 h-5 rounded-full bg-stone-200 text-stone-700 flex items-center justify-center text-[10px]">
                    2
                  </span>
                  <span>Pagamento & Garantia</span>
                </div>
              </div>
            )}

            {/* Step 1: Customer Data & Address */}
            {checkoutStep === "CUSTOMER" && (
              <div className="space-y-4 text-xs">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-stone-600 font-semibold block mb-1">Nome Completo</label>
                    <input
                      type="text"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 text-stone-900 font-medium"
                      placeholder="Ex: Juliana Alencar"
                    />
                  </div>
                  <div>
                    <label className="text-stone-600 font-semibold block mb-1">WhatsApp / Telefone</label>
                    <input
                      type="text"
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(e.target.value)}
                      className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 text-stone-900 font-medium"
                      placeholder="(11) 98765-4321"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-stone-600 font-semibold block mb-1">E-mail para Notificações</label>
                    <input
                      type="email"
                      value={customerEmail}
                      onChange={(e) => setCustomerEmail(e.target.value)}
                      className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 text-stone-900 font-medium"
                      placeholder="seuemail@exemplo.com"
                    />
                  </div>
                  <div>
                    <label className="text-stone-600 font-semibold block mb-1">
                      CPF (para Emissão de Garantia Digital)
                    </label>
                    <input
                      type="text"
                      value={customerCpf}
                      onChange={(e) => setCustomerCpf(e.target.value)}
                      className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 text-stone-900 font-medium"
                      placeholder="000.000.000-00"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-stone-600 font-semibold block mb-1">Endereço Completo de Entrega</label>
                  <input
                    type="text"
                    value={customerAddress}
                    onChange={(e) => setCustomerAddress(e.target.value)}
                    className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 text-stone-900 font-medium"
                    placeholder="Rua, Número, Bairro, Cidade - UF"
                  />
                </div>

                {/* Shipping Method */}
                <div className="space-y-2 pt-2">
                  <label className="text-stone-600 font-semibold block">Modalidade de Envio</label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setShippingMethod("STANDARD")}
                      className={`p-3 rounded-xl border text-left transition-all ${
                        shippingMethod === "STANDARD"
                          ? "bg-stone-900 text-white border-stone-900"
                          : "bg-stone-50 text-stone-800 border-stone-200"
                      }`}
                    >
                      <div className="font-bold">Correios / Transportadora</div>
                      <div className="text-[10px] opacity-80">
                        {cartSubtotal > 250 ? "Frete Grátis" : "R$ 18,90 (3 a 5 dias)"}
                      </div>
                    </button>

                    {selectedReseller && (
                      <button
                        type="button"
                        onClick={() => setShippingMethod("RESELLER_PICKUP")}
                        className={`p-3 rounded-xl border text-left transition-all ${
                          shippingMethod === "RESELLER_PICKUP"
                            ? "bg-stone-900 text-white border-stone-900"
                            : "bg-stone-50 text-stone-800 border-stone-200"
                        }`}
                      >
                        <div className="font-bold flex items-center gap-1">
                          <Crown className="w-3.5 h-3.5 text-amber-400" />
                          <span>Entrega VIP com {selectedReseller.name.split(" ")[0]}</span>
                        </div>
                        <div className="text-[10px] opacity-80">Grátis em mãos ({selectedReseller.city})</div>
                      </button>
                    )}
                  </div>
                </div>

                <div className="pt-4 flex justify-end">
                  <button
                    onClick={() => setCheckoutStep("PAYMENT")}
                    className="px-6 py-3 bg-stone-900 text-white rounded-full font-bold uppercase tracking-wider text-xs hover:bg-stone-800 transition-all flex items-center gap-2"
                  >
                    <span>Avançar para Pagamento</span>
                    <ChevronRight className="w-4 h-4 text-amber-400" />
                  </button>
                </div>
              </div>
            )}

            {/* Step 2: Payment Options */}
            {checkoutStep === "PAYMENT" && (
              <div className="space-y-6 text-xs">
                {/* Coupon input */}
                <form onSubmit={handleApplyCoupon} className="flex gap-2">
                  <input
                    type="text"
                    value={couponCode}
                    onChange={(e) => setCouponCode(e.target.value)}
                    placeholder="Cupom de desconto (ex: LUMINA10)"
                    className="flex-1 bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 text-stone-900 uppercase font-semibold"
                  />
                  <button
                    type="submit"
                    className="px-4 py-2 bg-stone-200 text-stone-800 font-bold rounded-xl hover:bg-stone-300"
                  >
                    Aplicar
                  </button>
                </form>
                {couponApplied && (
                  <p className="text-[11px] text-emerald-700 font-bold flex items-center gap-1">
                    <Check className="w-3.5 h-3.5" />
                    <span>Cupom de 10% aplicado com sucesso!</span>
                  </p>
                )}

                {/* Payment Selection Tabs */}
                {(() => {
                  const checkoutPixInfo = calculatePixPrice(cartTotal, currentPaymentSettings);
                  const checkoutInstallmentOptions = calculateInstallmentOptions(cartTotal, currentPaymentSettings);
                  const chosenCardOption =
                    checkoutInstallmentOptions.find((o) => o.installments === selectedCardInstallment) ||
                    checkoutInstallmentOptions[0];
                  const finalPayableTotal =
                    paymentMethod === "PIX" && checkoutPixInfo.isDiscountActive
                      ? checkoutPixInfo.pixPrice
                      : paymentMethod === "CARTAO_CREDITO"
                      ? chosenCardOption.totalAmount
                      : cartTotal;

                  return (
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <label className="text-stone-600 font-semibold block text-xs">
                          Escolha a Forma de Pagamento
                        </label>
                        <div className="grid grid-cols-3 gap-2">
                          {[
                            {
                              id: "PIX",
                              label: "⚡ PIX Instantâneo",
                              desc: currentPaymentSettings.pixDiscountPercent > 0
                                ? `${currentPaymentSettings.pixDiscountPercent}% de Desconto`
                                : "Aprovação Imediata",
                            },
                            {
                              id: "CARTAO_CREDITO",
                              label: "💳 Cartão de Crédito",
                              desc: `Até ${currentPaymentSettings.maxInstallments}x (${currentPaymentSettings.interestFreeInstallments}x sem juros)`,
                            },
                            {
                              id: "WHATSAPP",
                              label: "💬 Fechar no WhatsApp",
                              desc: "Com a Consultora",
                            },
                          ].map((p) => (
                            <button
                              key={p.id}
                              type="button"
                              onClick={() => setPaymentMethod(p.id as any)}
                              className={`p-3 rounded-2xl border text-center transition-all cursor-pointer ${
                                paymentMethod === p.id
                                  ? "bg-stone-900 text-white border-stone-900 shadow-xs"
                                  : "bg-stone-50 text-stone-800 border-stone-200 hover:bg-stone-100"
                              }`}
                            >
                              <p className="font-bold text-xs">{p.label}</p>
                              <p className="text-[10px] opacity-80 mt-0.5">{p.desc}</p>
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Payment Box */}
                      {paymentMethod === "WHATSAPP" && (
                        <div className="p-4 bg-emerald-50/80 border border-emerald-300 rounded-2xl space-y-2.5 text-left">
                          <div className="flex items-center gap-2 text-emerald-950 font-bold">
                            <MessageCircle className="w-5 h-5 text-emerald-700" />
                            <span>Atendimento VIP via WhatsApp & Reserva Imediata</span>
                          </div>
                          <p className="text-[11px] text-emerald-900 leading-relaxed">
                            Ao clicar em confirmar, suas semijoias serão{" "}
                            <strong>automaticamente reservadas no estoque</strong> do sistema e você será
                            direcionada para conversar com nossa consultora para alinhar detalhes de envio, brindes
                            e forma de pagamento favorita ({currentPaymentSettings.pixDiscountPercent > 0 ? `PIX com ${currentPaymentSettings.pixDiscountPercent}% OFF` : "PIX"} ou Cartão em até {currentPaymentSettings.maxInstallments}x).
                          </p>
                          <div className="pt-1 flex items-center gap-2 text-[10px] text-emerald-800 font-semibold">
                            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                            <span>Garantia de 1 ano já gerada e vinculada ao seu número.</span>
                          </div>
                        </div>
                      )}

                      {paymentMethod === "PIX" && (
                        <div className="p-4 bg-emerald-50/80 border border-emerald-200 rounded-2xl space-y-3 text-center">
                          <div className="w-36 h-36 bg-white border border-emerald-300 rounded-2xl mx-auto flex items-center justify-center shadow-xs">
                            <QrCode className="w-28 h-28 text-emerald-950" />
                          </div>
                          <div>
                            <p className="font-bold text-emerald-950">Chave PIX Dinâmica Gerada</p>
                            <p className="text-[11px] text-emerald-800">
                              {currentPaymentSettings.pixDiscountPercent > 0
                                ? `Economize R$ ${checkoutPixInfo.discountAmount.toFixed(2)} pagando no PIX!`
                                : "O pagamento é confirmado em menos de 10 segundos pelo banco."}
                            </p>
                            {currentPaymentSettings.pixKey && (
                              <p className="text-[10px] font-mono text-emerald-900 mt-1">
                                Chave: {currentPaymentSettings.pixKey} ({currentPaymentSettings.pixKeyType})
                              </p>
                            )}
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              navigator.clipboard.writeText(
                                currentPaymentSettings.pixKey || "00020126580014br.gov.bcb.pix0136lumina-semijoias-pix-checkout"
                              );
                              setCopiedPix(true);
                              setTimeout(() => setCopiedPix(false), 2000);
                            }}
                            className="px-4 py-2 bg-emerald-800 hover:bg-emerald-900 text-white rounded-xl font-bold text-[11px] inline-flex items-center gap-1.5 cursor-pointer shadow-xs"
                          >
                            <Copy className="w-3.5 h-3.5" />
                            <span>{copiedPix ? "Código Copiado!" : "Copiar Chave PIX Copia e Cola"}</span>
                          </button>
                        </div>
                      )}

                      {paymentMethod === "CARTAO_CREDITO" && (
                        <div className="p-4 bg-stone-50 border border-stone-200 rounded-2xl space-y-3 text-left">
                          <div className="flex items-center justify-between font-bold text-stone-900">
                            <div className="flex items-center gap-2">
                              <CreditCard className="w-4 h-4 text-stone-700" />
                              <span>Cartão de Crédito</span>
                            </div>
                            <span className="text-xs text-stone-500 font-normal">
                              {currentPaymentSettings.interestFreeInstallments}x sem acréscimo
                            </span>
                          </div>

                          <div className="space-y-1.5">
                            <label className="text-[11px] font-bold text-stone-600">Número de Parcelas</label>
                            <select
                              value={selectedCardInstallment}
                              onChange={(e) => setSelectedCardInstallment(Number(e.target.value))}
                              className="w-full bg-white border border-stone-300 rounded-xl px-3 py-2 text-xs font-semibold text-stone-800 focus:outline-none focus:border-stone-900"
                            >
                              {checkoutInstallmentOptions.map((opt) => (
                                <option key={opt.installments} value={opt.installments}>
                                  {opt.installments}x de R$ {opt.installmentValue.toFixed(2)}{" "}
                                  {opt.isInterestFree
                                    ? "(sem acréscimo)"
                                    : `(total R$ ${opt.totalAmount.toFixed(2)} / +${opt.interestRatePercent}%)`}
                                </option>
                              ))}
                            </select>
                          </div>

                          <p className="text-[11px] text-stone-500">
                            Transação segura processada com criptografia de ponta a ponta e emissão instantânea de certificado de garantia.
                          </p>
                        </div>
                      )}

                      {/* Order Summary Breakdown */}
                      <div className="p-4 bg-stone-50 border border-stone-200 rounded-2xl space-y-2 text-xs">
                        <div className="flex justify-between text-stone-600">
                          <span>Subtotal das Peças</span>
                          <span className="font-mono">R$ {cartSubtotal.toFixed(2)}</span>
                        </div>
                        {discountAmount > 0 && (
                          <div className="flex justify-between text-emerald-700 font-semibold">
                            <span>Cupom de Desconto</span>
                            <span>- R$ {discountAmount.toFixed(2)}</span>
                          </div>
                        )}
                        {paymentMethod === "PIX" && checkoutPixInfo.isDiscountActive && (
                          <div className="flex justify-between text-emerald-700 font-semibold">
                            <span>Desconto PIX ({currentPaymentSettings.pixDiscountPercent}%)</span>
                            <span>- R$ {checkoutPixInfo.discountAmount.toFixed(2)}</span>
                          </div>
                        )}
                        {paymentMethod === "CARTAO_CREDITO" && !chosenCardOption.isInterestFree && (
                          <div className="flex justify-between text-stone-600 font-semibold">
                            <span>Taxa de Parcelamento ({chosenCardOption.interestRatePercent}%)</span>
                            <span>+ R$ {(chosenCardOption.totalAmount - cartTotal).toFixed(2)}</span>
                          </div>
                        )}
                        <div className="flex justify-between text-stone-600">
                          <span>Frete / Entrega</span>
                          <span>{shippingCost === 0 ? "Grátis" : `R$ ${shippingCost.toFixed(2)}`}</span>
                        </div>
                        <div className="flex justify-between items-baseline text-stone-900 font-bold text-base pt-2 border-t border-stone-200">
                          <span>Total Final</span>
                          <div className="text-right">
                            <span className="font-serif">R$ {finalPayableTotal.toFixed(2)}</span>
                            {paymentMethod === "CARTAO_CREDITO" && (
                              <p className="text-[11px] text-stone-500 font-normal">
                                {chosenCardOption.installments}x de R$ {chosenCardOption.installmentValue.toFixed(2)}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })()}

                <div className="flex items-center justify-between pt-2">
                  <button
                    onClick={() => setCheckoutStep("CUSTOMER")}
                    className="text-xs text-stone-500 hover:text-stone-900 font-semibold"
                  >
                    Voltar
                  </button>

                  <button
                    onClick={handleCompleteOrder}
                    className={`px-8 py-3.5 text-white rounded-full font-bold uppercase tracking-wider text-xs transition-all shadow-lg flex items-center gap-2 cursor-pointer ${
                      paymentMethod === "WHATSAPP"
                        ? "bg-emerald-600 hover:bg-emerald-700 ring-2 ring-emerald-300"
                        : "bg-stone-900 hover:bg-stone-800"
                    }`}
                  >
                    {paymentMethod === "WHATSAPP" ? (
                      <>
                        <MessageCircle className="w-4 h-4" />
                        <span>Reservar Estoque & Enviar Pedido via WhatsApp</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                        <span>Confirmar Pagamento & Emitir Garantia</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}

            {/* Step 3: Success & Digital Warranty Pass */}
            {checkoutStep === "SUCCESS" && placedOrder && (
              <div className="text-center space-y-6 py-4">
                <div className="w-16 h-16 rounded-full bg-emerald-100 border border-emerald-300 text-emerald-800 flex items-center justify-center mx-auto shadow-sm">
                  <CheckCircle2 className="w-8 h-8" />
                </div>

                <div>
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 text-emerald-900 text-xs font-bold mb-2">
                    <Check className="w-3.5 h-3.5" />
                    <span>Estoque Reservado no Sistema</span>
                  </div>
                  <h3 className="text-3xl font-serif italic font-bold text-stone-900">
                    Parabéns pelo seu Pedido!
                  </h3>
                  <p className="text-xs text-stone-600 mt-1 max-w-md mx-auto">
                    Seu pedido <strong className="font-mono text-stone-900">{placedOrder.orderNumber}</strong> foi registrado e o estoque já está assegurado para você.
                  </p>
                </div>

                {/* Direct WhatsApp Callout Button */}
                {lastWhatsAppUrl && (
                  <div className="max-w-md mx-auto p-4 bg-emerald-50 border border-emerald-300 rounded-2xl text-center space-y-2">
                    <p className="text-xs font-semibold text-emerald-950">
                      Precisa abrir novamente a conversa ou o navegador bloqueou o pop-up?
                    </p>
                    <a
                      href={lastWhatsAppUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 shadow-sm transition-all inline-flex"
                    >
                      <MessageCircle className="w-4 h-4" />
                      <span>Abrir Conversa no WhatsApp com a Consultora</span>
                    </a>
                  </div>
                )}

                {/* Digital Warranty Pass Ticket */}
                <div className="bg-stone-900 text-white rounded-3xl p-6 border border-stone-800 max-w-md mx-auto shadow-xl text-left space-y-4 relative overflow-hidden">
                  <div className="flex items-center justify-between pb-3 border-b border-stone-800">
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="w-5 h-5 text-emerald-400" />
                      <span className="font-serif italic font-bold text-stone-100">
                        Certificado Digital de Garantia
                      </span>
                    </div>
                    <span className="text-[9px] font-mono bg-stone-800 text-amber-300 px-2 py-0.5 rounded font-bold">
                      {placedOrder.warrantyCode}
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-4 items-center">
                    <div className="col-span-2 space-y-1.5 text-xs text-stone-300">
                      <p>
                        <span className="text-[10px] text-stone-400 uppercase block">Titular:</span>
                        <strong className="text-white">{placedOrder.customerSnapshot?.name || placedOrder.customer?.name}</strong>
                      </p>
                      <p>
                        <span className="text-[10px] text-stone-400 uppercase block">Peça:</span>
                        <span className="text-stone-200">{placedOrder.items[0]?.productSnapshot?.name || placedOrder.items[0]?.productName}</span>
                      </p>
                      <p>
                        <span className="text-[10px] text-stone-400 uppercase block">Validade:</span>
                        <span className="text-emerald-400 font-semibold">12 Meses (Banho e Cravação)</span>
                      </p>
                    </div>

                    <div className="w-20 h-20 bg-white rounded-xl p-1.5 flex items-center justify-center shrink-0">
                      <QrCode className="w-full h-full text-stone-950" />
                    </div>
                  </div>

                  {placedOrder.resellerName && (
                    <div className="pt-2 border-t border-stone-800 text-[10px] text-stone-400 flex items-center gap-1.5">
                      <Crown className="w-3 h-3 text-amber-400" />
                      <span>Comissão registrada para a Consultora: {placedOrder.resellerName}</span>
                    </div>
                  )}
                </div>

                <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
                  <button
                    onClick={() => {
                      setIsCheckoutOpen(false);
                      onNavigateToERP("orders");
                    }}
                    className="px-6 py-3 rounded-full bg-stone-900 hover:bg-stone-800 text-white font-bold text-xs uppercase tracking-wider transition-all shadow-xs"
                  >
                    Ver Pedido no Painel ERP
                  </button>

                  <button
                    onClick={() => {
                      setIsCheckoutOpen(false);
                      onNavigateToERP("warranties");
                    }}
                    className="px-6 py-3 rounded-full bg-stone-100 hover:bg-stone-200 text-stone-800 font-semibold text-xs transition-all"
                  >
                    Ver na Central de Garantias
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Customer Warranty Lookup Modal */}
      {isWarrantyLookupOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-stone-200 rounded-3xl max-w-lg w-full p-6 sm:p-8 space-y-6 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-stone-200">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-emerald-600" />
                <h3 className="text-xl font-serif italic font-bold text-stone-900">
                  Portal de Validação de Garantia
                </h3>
              </div>
              <button
                onClick={() => {
                  setIsWarrantyLookupOpen(false);
                  setFoundWarranty(null);
                }}
                className="p-1 rounded-full text-stone-400 hover:text-stone-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleLookupWarranty} className="space-y-3">
              <label className="text-xs font-semibold text-stone-600 block">
                Digite o Código da Garantia (ex: GRT-8F2A9D), Pedido (#1842) ou CPF:
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  required
                  value={warrantySearchCode}
                  onChange={(e) => setWarrantySearchCode(e.target.value)}
                  placeholder="Ex: GRT-8F2A9D ou #1842"
                  className="flex-1 bg-stone-50 border border-stone-200 rounded-xl px-3.5 py-2 text-xs font-semibold text-stone-900 uppercase focus:bg-white"
                />
                <button
                  type="submit"
                  className="px-4 py-2 bg-stone-900 hover:bg-stone-800 text-white rounded-xl text-xs font-bold transition-colors"
                >
                  Consultar
                </button>
              </div>
            </form>

            {foundWarranty && (
              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl space-y-3 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-emerald-950 font-serif text-sm">
                    Certificado Válido & Ativo
                  </span>
                  <span className="px-2 py-0.5 bg-emerald-200 text-emerald-900 rounded font-bold font-mono text-[10px]">
                    {foundWarranty.code}
                  </span>
                </div>
                <div className="space-y-1 text-emerald-900">
                  <p><strong>Cliente:</strong> {foundWarranty.customerName}</p>
                  <p><strong>Peça:</strong> {foundWarranty.productName}</p>
                  <p><strong>Banho:</strong> {foundWarranty.bathType}</p>
                  <p><strong>Emissão:</strong> {new Date(foundWarranty.issueDate).toLocaleDateString("pt-BR")}</p>
                  <p><strong>Validade até:</strong> {new Date(foundWarranty.expirationDate).toLocaleDateString("pt-BR")}</p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Editorial Storefront Footer */}
      <footer className="border-t border-stone-200 py-8 px-6 bg-white text-xs text-stone-600">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="space-y-2">
            <h4 className="font-serif italic font-bold text-lg text-stone-900">Lumina Semijoias</h4>
            <p className="text-[11px] text-stone-500 leading-relaxed">
              Alta semijoia contemporânea com certificação digital de procedência, banho hipoalergênico e curadoria de luxo.
            </p>
          </div>

          <div className="space-y-2">
            <h5 className="font-bold text-stone-900 uppercase tracking-wider text-[10px]">Atendimento & Consultoria</h5>
            <p className="text-[11px] text-stone-500">Segunda a Sábado, das 09h às 19h</p>
            <p className="text-[11px] text-stone-700 font-semibold">contato@luminasemijoias.com.br</p>
          </div>

          <div className="space-y-2">
            <h5 className="font-bold text-stone-900 uppercase tracking-wider text-[10px]">Segurança & Garantia</h5>
            <p className="text-[11px] text-stone-500">Pagamentos criptografados com validação instantânea.</p>
            <p className="text-[11px] text-emerald-700 font-bold">12 Meses de Garantia com QR Code</p>
          </div>

          <div className="space-y-2">
            <h5 className="font-bold text-stone-900 uppercase tracking-wider text-[10px]">Plataforma SaaS</h5>
            <button
              onClick={() => onNavigateToERP("dashboard")}
              className="text-[11px] font-bold text-stone-900 hover:text-stone-700 flex items-center gap-1"
            >
              <span>Acessar Painel de Controle ERP</span>
              <ArrowUpRight className="w-3 h-3" />
            </button>
          </div>
        </div>
      </footer>

      {/* Share Catalog Modal */}
      <ShareCatalogModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        tenant={tenant}
        totalProducts={products.length}
      />
    </div>
  );
};
