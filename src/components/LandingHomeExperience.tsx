import React, { useState, useEffect } from "react";
import {
  Sparkles,
  ShoppingBag,
  ShieldCheck,
  Crown,
  Lock,
  ArrowRight,
  Gift,
  Tag,
  Clock,
  Check,
  Copy,
  ChevronRight,
  ChevronLeft,
  Image as ImageIcon,
  Palette,
  Eye,
  Sliders,
  RotateCw,
  QrCode,
  Users,
  Search,
  Star,
  Layers,
  Heart,
  X,
  MessageCircle,
  Instagram,
  Facebook,
  Share2,
  Globe,
} from "lucide-react";
import { ProductItem, Reseller, TenantStore, StoreBrandingConfig } from "../types";
import confetti from "canvas-confetti";
import { JewelryExpoCollagePoster } from "./JewelryExpoCollagePoster";

export interface PromotionOffer {
  id: string;
  badge: string;
  title: string;
  subtitle: string;
  couponCode: string;
  discountText: string;
  categoryTarget?: string;
  highlightSku?: string;
  ctaText: string;
  expiresInHours?: number;
  bgAccent: string;
}

export const defaultPromotions: PromotionOffer[] = [
  {
    id: "promo-riviera",
    badge: "Destaque da Semana",
    title: "Semana da Riviera 10 Milésimos",
    subtitle: "Desconto especial de 15% em todos os colares e pulseiras riviera com banho de ouro 18K nobre e zircônias cravadas à mão.",
    couponCode: "RIVIERA15",
    discountText: "15% OFF",
    categoryTarget: "COLARES",
    ctaText: "Ver Coleção Riviera",
    expiresInHours: 48,
    bgAccent: "from-amber-900/80 via-stone-900/90 to-stone-950/90",
  },
  {
    id: "promo-custom",
    badge: "Exclusividade Lumina",
    title: "Personalizados com Nome & Caixa de Veludo Grátis",
    subtitle: "Grave seu nome ou de quem você ama a laser. Na compra de qualquer joia personalizada, a embalagem rígida com fita de veludo é cortesia.",
    couponCode: "MEUNOMEVIP",
    discountText: "GIFT VELVET BOX",
    categoryTarget: "PERSONALIZADOS",
    ctaText: "Criar Meu Colar com Nome",
    expiresInHours: 72,
    bgAccent: "from-amber-950/80 via-stone-900/90 to-stone-950/90",
  },
  {
    id: "promo-frete",
    badge: "Condição Especial",
    title: "Frete Grátis + Garantia Digital QR de 1 Ano",
    subtitle: "Em compras a partir de R$ 250, receba com frete cortesia e passaporte digital de garantia registrado na hora com QR Code.",
    couponCode: "FRETEVIP",
    discountText: "FRETE GRÁTIS",
    categoryTarget: "TODOS",
    ctaText: "Explorar Loja Completa",
    expiresInHours: 24,
    bgAccent: "from-stone-900/90 via-stone-900/95 to-black/90",
  },
  {
    id: "promo-argolas",
    badge: "Tendência 2026",
    title: "Argolas Tubulares & Brincos Solitários",
    subtitle: "Leveza e presença para o dia a dia. Tecnologia antialérgica níquel-free com acabamento em verniz suíço de alta durabilidade.",
    couponCode: "BRINCOS10",
    discountText: "10% OFF",
    categoryTarget: "BRINCOS",
    ctaText: "Ver Brincos & Argolas",
    expiresInHours: 96,
    bgAccent: "from-amber-900/70 via-stone-900/90 to-stone-950/95",
  },
];

export interface BackgroundPreset {
  id: string;
  name: string;
  description: string;
  url: string;
  themeType: "dark" | "light" | "warm";
}

export const backgroundPresets: BackgroundPreset[] = [
  {
    id: "veludo-ouro",
    name: "Veludo Noturno & Ouro 18K",
    description: "Contraste profundo com brilho dourado e atmosfera de alta joalheria",
    url: "https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?q=80&w=2070&auto=format&fit=crop",
    themeType: "dark",
  },
  {
    id: "seda-champagne",
    name: "Seda Champagne & Riviera",
    description: "Textura fluida e sofisticada em tons neutros quentes e lapidação fina",
    url: "https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?q=80&w=2070&auto=format&fit=crop",
    themeType: "warm",
  },
  {
    id: "marmore-imperial",
    name: "Mármore & Minimalismo",
    description: "Estética limpa, arquitetônica e contemporânea para destaque de peças",
    url: "https://images.unsplash.com/photo-1605100804763-247f67b3557e?q=80&w=2070&auto=format&fit=crop",
    themeType: "light",
  },
  {
    id: "atelie-ourives",
    name: "Ateliê & Luz Dourada",
    description: "Cena autêntica de bancada de ourivesaria artesanal e pedras nobres",
    url: "https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?q=80&w=2070&auto=format&fit=crop",
    themeType: "dark",
  },
  {
    id: "noivas-cristal",
    name: "Noivas & Pedras Nobres",
    description: "Brilho puro de zircônias e lapidação brilhante para momentos memoráveis",
    url: "https://images.unsplash.com/photo-1611591475152-478311399767?q=80&w=2070&auto=format&fit=crop",
    themeType: "dark",
  },
];

interface LandingHomeExperienceProps {
  tenant: TenantStore;
  branding?: StoreBrandingConfig;
  products: ProductItem[];
  resellers: Reseller[];
  onOpenStorefront: (category?: string, coupon?: string) => void;
  onOpenAdminERP: (tab?: string) => void;
}

export const LandingHomeExperience: React.FC<LandingHomeExperienceProps> = ({
  tenant,
  branding,
  products,
  resellers,
  onOpenStorefront,
  onOpenAdminERP,
}) => {
  const brand: StoreBrandingConfig = branding || {
    logoType: "TEXT",
    logoUrl: "https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?w=180&auto=format&fit=crop&q=80",
    logoText: "Lumina",
    logoSubtext: "Alta Semijoias",
    paletteId: "GOLD_18K",
    primaryColor: "#F59E0B",
    accentColor: "#FEF3C7",
    fontPairing: "CLASSIC_SERIF",
    heroPillBadge: "Exclusividade & Garantia Digital QR",
    heroHeadline: "A elegância atemporal da alta joalheria, ao alcance dos seus momentos.",
    heroSubtitle: "Semijoias nobres fundidas em ligas antialérgicas com camada de 10 milésimos de Ouro 18K, zircônias de lapidação suíça e passaporte digital de garantia emitido instantaneamente para você.",
    announcementBarText: "Coleção 2026 • Semijoias Banhadas a Ouro 18K & Ródio Nobre",
    ctaPrimaryText: "Comprar na Vitrine Exclusiva",
    ctaSecondaryText: "Personalizar Meu Colar",
    footerSlogan: "Lumina Haute Joaillerie • Alta Semijoias com Garantia Registrada",
    instagramHandle: "@luminasemijoias",
    contactWhatsapp: "+55 (19) 98842-1100",
    contactEmail: "contato@luminasemijoias.com.br",
    showConsultantBadge: true,
    showPillarsOfTrust: true,
  };

  // View Mode: Cartaz Expo Collage (Faithful to uploaded image) vs Immersive Carousel
  const [viewMode, setViewMode] = useState<"POSTER_COLLAGE" | "IMMERSIVE_CAROUSEL">("POSTER_COLLAGE");

  // Background customizer state
  const initialBg =
    brand.customBackgroundUrl ||
    backgroundPresets.find((p) => p.id === brand.backgroundPresetId)?.url ||
    backgroundPresets[0].url;
  const [currentBg, setCurrentBg] = useState<string>(initialBg);

  useEffect(() => {
    if (brand.customBackgroundUrl) {
      setCurrentBg(brand.customBackgroundUrl);
    } else if (brand.backgroundPresetId) {
      const found = backgroundPresets.find((p) => p.id === brand.backgroundPresetId);
      if (found) setCurrentBg(found.url);
    }
  }, [brand.customBackgroundUrl, brand.backgroundPresetId]);
  const [bgOverlayOpacity, setBgOverlayOpacity] = useState<number>(65); // 0 to 100
  const [customBgInput, setCustomBgInput] = useState<string>("");
  const [isBgSelectorOpen, setIsBgSelectorOpen] = useState(false);

  // Promotions state & carousel
  const [activePromoIndex, setActivePromoIndex] = useState(0);
  const [copiedCoupon, setCopiedCoupon] = useState<string | null>(null);

  // Discreet admin login modal state
  const [isAdminModalOpen, setIsAdminModalOpen] = useState(false);
  const [targetAdminTab, setTargetAdminTab] = useState<string>("dashboard");
  const [adminPin, setAdminPin] = useState("");
  const [adminError, setAdminError] = useState(false);

  // Auto rotate promotions every 6 seconds
  useEffect(() => {
    const timer = setInterval(() => {
      setActivePromoIndex((prev) => (prev + 1) % defaultPromotions.length);
    }, 6000);
    return () => clearInterval(timer);
  }, []);

  const activePromo = defaultPromotions[activePromoIndex];

  const handleCopyCoupon = (code: string, e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(code);
    setCopiedCoupon(code);
    setTimeout(() => setCopiedCoupon(null), 3000);
    confetti({
      particleCount: 25,
      spread: 40,
      origin: { y: 0.7 },
    });
  };

  const handleApplyCustomBg = (e: React.FormEvent) => {
    e.preventDefault();
    if (customBgInput.trim()) {
      setCurrentBg(customBgInput.trim());
      setIsBgSelectorOpen(false);
    }
  };

  const handleAdminLogin = (e: React.FormEvent) => {
    e.preventDefault();
    // Default master PIN is 1234 or direct unlock
    if (adminPin === "1234" || adminPin === "" || adminPin === "admin") {
      setIsAdminModalOpen(false);
      onOpenAdminERP(targetAdminTab);
    } else {
      setAdminError(true);
      setTimeout(() => setAdminError(false), 3000);
    }
  };

  const openAdminWithTab = (tab: string) => {
    setTargetAdminTab(tab);
    setIsAdminModalOpen(true);
  };

  return (
    <div className="relative min-h-screen w-full flex flex-col font-sans selection:bg-amber-100 selection:text-amber-950 overflow-x-hidden text-stone-900">
      {/* Background Image Frame with dynamic opacity overlay */}
      <div className="fixed inset-0 -z-10 bg-stone-950 overflow-hidden">
        <img
          src={currentBg}
          alt="Lumina Background Art"
          className="w-full h-full object-cover object-center transition-all duration-1000 scale-105"
        />
        {/* Dark luxury gradient overlay controlled by user slider */}
        <div
          className="absolute inset-0 bg-stone-950 transition-opacity duration-300 pointer-events-none"
          style={{ opacity: bgOverlayOpacity / 100 }}
        />
        {/* Soft Vignette and radial highlight for jewelry glow */}
        <div className="absolute inset-0 bg-radial-[circle_at_center,transparent_30%,rgba(0,0,0,0.6)_100%] pointer-events-none" />
      </div>

      {/* Top Banner: Quick Highlights & Background Art Switcher Button */}
      <div className="w-full bg-stone-950/80 backdrop-blur-md border-b border-stone-800/80 text-stone-200 text-xs py-2.5 px-4 sm:px-6">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span
              className="w-2 h-2 rounded-full animate-pulse"
              style={{ backgroundColor: brand.primaryColor }}
            />
            <span
              className="text-[11px] sm:text-xs font-semibold uppercase tracking-wider"
              style={{ color: brand.primaryColor }}
            >
              {brand.announcementBarText || "Coleção 2026 • Semijoias Banhadas a Ouro 18K & Ródio Nobre"}
            </span>
          </div>

          <div className="flex items-center gap-3">
            {/* View Mode Toggle Switcher: Cartaz Expo vs Vitrine Imersiva */}
            <div className="flex items-center bg-stone-900/90 p-0.5 rounded-full border border-stone-700/80">
              <button
                onClick={() => setViewMode("POSTER_COLLAGE")}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold transition-all cursor-pointer ${
                  viewMode === "POSTER_COLLAGE"
                    ? "bg-amber-400 text-stone-950 shadow-xs"
                    : "text-stone-300 hover:text-white"
                }`}
                title="Ver no formato Cartaz Promoções Expo Collage"
              >
                <Sparkles className="w-3 h-3" />
                <span>Cartaz Expo</span>
              </button>

              <button
                onClick={() => setViewMode("IMMERSIVE_CAROUSEL")}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold transition-all cursor-pointer ${
                  viewMode === "IMMERSIVE_CAROUSEL"
                    ? "bg-amber-400 text-stone-950 shadow-xs"
                    : "text-stone-300 hover:text-white"
                }`}
                title="Ver no formato Vitrine Imersiva"
              >
                <Eye className="w-3 h-3" />
                <span>Vitrine Imersiva</span>
              </button>
            </div>

            {/* Store Settings direct trigger button */}
            <button
              onClick={() => openAdminWithTab("storeSettings")}
              className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-stone-800/90 hover:bg-stone-700 text-stone-200 hover:text-white border border-stone-700/80 text-[11px] font-semibold tracking-wide transition-all shadow-xs cursor-pointer"
              title="Personalizar Logotipo, Cores, Cartaz e Redes Sociais da Loja"
            >
              <Sliders className="w-3.5 h-3.5" style={{ color: brand.primaryColor }} />
              <span className="hidden sm:inline">Configurações & Branding</span>
              <span className="sm:hidden">Branding</span>
            </button>

            {/* Background customization trigger button */}
            <button
              onClick={() => setIsBgSelectorOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-stone-800/90 hover:bg-stone-700 text-stone-200 hover:text-white border border-stone-700/80 text-[11px] font-semibold tracking-wide transition-all shadow-xs cursor-pointer"
              title="Personalizar imagem de fundo da tela inicial"
            >
              <Palette className="w-3.5 h-3.5 text-stone-400" />
              <span className="hidden sm:inline">Mudar Fundo</span>
              <span className="sm:hidden">Arte</span>
            </button>

            <span className="text-stone-700">|</span>

            {/* Discreet Admin Link in header */}
            <button
              onClick={() => openAdminWithTab("dashboard")}
              className="group flex items-center gap-1 text-stone-400 hover:text-stone-200 text-[11px] transition-colors cursor-pointer"
              title="Acesso reservado ao proprietário da loja"
            >
              <Lock className="w-3 h-3 text-stone-500 group-hover:text-amber-400 transition-colors" />
              <span className="hidden md:inline font-medium">Acesso Lojista</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Luxury Navigation Bar */}
      <header className="sticky top-0 z-30 bg-stone-950/70 backdrop-blur-lg border-b border-stone-800/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between gap-4">
          {/* Brand Logo & Editorial Typography */}
          <div
            onClick={() => onOpenStorefront()}
            className="cursor-pointer flex items-baseline gap-3 group"
          >
            {brand.logoType === "IMAGE" && brand.logoUrl ? (
              <img
                src={brand.logoUrl}
                alt={brand.logoText || "Lumina"}
                className="h-9 w-auto max-w-[150px] object-contain"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = "none";
                }}
              />
            ) : (
              <h1 className="text-3xl sm:text-4xl font-serif italic font-bold tracking-wide text-stone-100 group-hover:text-amber-200 transition-colors">
                {brand.logoText || "Lumina"}
              </h1>
            )}
            <span
              className="text-[10px] font-bold tracking-[0.3em] uppercase font-sans hidden sm:inline-block"
              style={{ color: brand.primaryColor }}
            >
              {brand.logoSubtext || "Alta Semijoias"}
            </span>
          </div>

          {/* Quick Nav categories */}
          <nav className="hidden lg:flex items-center space-x-6 text-xs font-semibold uppercase tracking-wider text-stone-300">
            <button
              onClick={() => onOpenStorefront("COLARES")}
              className="hover:text-amber-300 transition-colors cursor-pointer"
            >
              Colares & Riviera
            </button>
            <button
              onClick={() => onOpenStorefront("BRINCOS")}
              className="hover:text-amber-300 transition-colors cursor-pointer"
            >
              Brincos & Argolas
            </button>
            <button
              onClick={() => onOpenStorefront("PERSONALIZADOS")}
              className="hover:text-amber-300 transition-colors flex items-center gap-1 cursor-pointer"
              style={{ color: brand.primaryColor }}
            >
              <Crown className="w-3.5 h-3.5" />
              <span>Personalizados com Nome</span>
            </button>
            <button
              onClick={() => onOpenStorefront("ANEIS")}
              className="hover:text-amber-300 transition-colors cursor-pointer"
            >
              Anéis
            </button>
          </nav>

          {/* Consumer Store CTA */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => onOpenStorefront()}
              className="px-5 py-2.5 rounded-full font-bold text-xs uppercase tracking-wider transition-all shadow-lg hover:scale-105 flex items-center gap-2 cursor-pointer"
              style={{
                backgroundColor: brand.primaryColor,
                color: "#0c0a09",
              }}
            >
              <ShoppingBag className="w-4 h-4 text-stone-950" />
              <span>Entrar na Loja</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </header>

      {/* MAIN VIEW CONTENT AREA */}
      {viewMode === "POSTER_COLLAGE" ? (
        <main className="flex-1 w-full flex flex-col items-center py-6">
          {/* THE EXPO COLLAGE PROMOTIONAL POSTER (Faithful to User Reference) */}
          <JewelryExpoCollagePoster
            tenant={tenant}
            branding={brand}
            onOpenStorefront={onOpenStorefront}
            onOpenAdminSettings={() => openAdminWithTab("storeSettings")}
          />

          {/* Quick Category Showcase Under the Poster */}
          <div className="w-full max-w-5xl px-4 sm:px-6 pt-6 pb-12 space-y-10">
            {/* Active Promotions Carousel / Quick Coupons Grid */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Tag className="w-4 h-4 text-amber-400" />
                  <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-stone-200">
                    Cupons & Ofertas da Mostra
                  </h3>
                </div>
                <span className="text-[11px] text-amber-300 font-medium">
                  Clique no cupom para aplicar no carrinho
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {defaultPromotions.map((promo) => (
                  <div
                    key={promo.id}
                    onClick={() => onOpenStorefront(promo.categoryTarget, promo.couponCode)}
                    className="p-5 rounded-3xl bg-stone-900/90 hover:bg-stone-900 border border-stone-800 hover:border-amber-400/60 backdrop-blur-xl transition-all cursor-pointer space-y-3 group shadow-lg"
                  >
                    <div className="flex items-center justify-between text-[10px] font-bold text-amber-400 uppercase tracking-wider">
                      <span>{promo.badge}</span>
                      <span className="font-mono text-white bg-stone-800 px-2 py-0.5 rounded font-bold">
                        {promo.discountText}
                      </span>
                    </div>

                    <h4 className="text-base font-serif italic font-bold text-stone-100 group-hover:text-amber-200 transition-colors">
                      {promo.title}
                    </h4>

                    <p className="text-xs text-stone-300 line-clamp-2 leading-relaxed font-light">
                      {promo.subtitle}
                    </p>

                    <div className="pt-2 flex items-center justify-between">
                      <div
                        onClick={(e) => handleCopyCoupon(promo.couponCode, e)}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-stone-950 border border-dashed border-amber-400/50 hover:border-amber-400 text-amber-300 text-[11px] font-mono font-bold"
                        title="Copiar cupom"
                      >
                        <span>{promo.couponCode}</span>
                        {copiedCoupon === promo.couponCode ? (
                          <Check className="w-3 h-3 text-emerald-400" />
                        ) : (
                          <Copy className="w-3 h-3 text-amber-400" />
                        )}
                      </div>

                      <span className="text-xs font-bold text-amber-400 group-hover:translate-x-1 transition-transform flex items-center gap-0.5">
                        Ver Peças <ChevronRight className="w-3.5 h-3.5" />
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Quick Collections Strip */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-amber-400" />
                  <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-stone-200">
                    Navegar por Coleções & Joias
                  </h3>
                </div>
                <button
                  onClick={() => onOpenStorefront()}
                  className="text-xs font-bold text-amber-300 hover:text-amber-200 transition-colors flex items-center gap-1 cursor-pointer"
                >
                  <span>Ver Catálogo Completo</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <button
                  onClick={() => onOpenStorefront("COLARES")}
                  className="p-5 rounded-3xl bg-stone-900/80 hover:bg-stone-800/90 border border-stone-800 hover:border-amber-400/40 text-left transition-all space-y-2 group cursor-pointer"
                >
                  <div className="w-10 h-10 rounded-2xl bg-amber-400/10 text-amber-300 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Sparkles className="w-5 h-5" />
                  </div>
                  <h4 className="font-serif italic font-bold text-base text-stone-100 group-hover:text-amber-200">
                    Colares & Riviera
                  </h4>
                  <p className="text-[11px] text-stone-400">
                    Banhos nobres de ouro 18K e zircônias lapidadas
                  </p>
                </button>

                <button
                  onClick={() => onOpenStorefront("PERSONALIZADOS")}
                  className="p-5 rounded-3xl bg-stone-900/80 hover:bg-stone-800/90 border border-amber-400/30 hover:border-amber-400/70 text-left transition-all space-y-2 group cursor-pointer"
                >
                  <div className="w-10 h-10 rounded-2xl bg-amber-400/20 text-amber-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Crown className="w-5 h-5" />
                  </div>
                  <h4 className="font-serif italic font-bold text-base text-amber-300">
                    Personalizados com Nome
                  </h4>
                  <p className="text-[11px] text-stone-400">
                    Gravação a laser + Velvet Box de presente
                  </p>
                </button>

                <button
                  onClick={() => onOpenStorefront("BRINCOS")}
                  className="p-5 rounded-3xl bg-stone-900/80 hover:bg-stone-800/90 border border-stone-800 hover:border-amber-400/40 text-left transition-all space-y-2 group cursor-pointer"
                >
                  <div className="w-10 h-10 rounded-2xl bg-amber-400/10 text-amber-300 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Heart className="w-5 h-5" />
                  </div>
                  <h4 className="font-serif italic font-bold text-base text-stone-100 group-hover:text-amber-200">
                    Brincos & Argolas
                  </h4>
                  <p className="text-[11px] text-stone-400">
                    Argolas tubulares, solitários e ear cuffs
                  </p>
                </button>

                <button
                  onClick={() => onOpenStorefront("ANEIS")}
                  className="p-5 rounded-3xl bg-stone-900/80 hover:bg-stone-800/90 border border-stone-800 hover:border-amber-400/40 text-left transition-all space-y-2 group cursor-pointer"
                >
                  <div className="w-10 h-10 rounded-2xl bg-amber-400/10 text-amber-300 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Star className="w-5 h-5" />
                  </div>
                  <h4 className="font-serif italic font-bold text-base text-stone-100 group-hover:text-amber-200">
                    Anéis & Alianças
                  </h4>
                  <p className="text-[11px] text-stone-400">
                    Solitários nobres, aparadores e alianças
                  </p>
                </button>
              </div>
            </div>

            {/* Pillars of Trust */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t border-stone-800/80 text-xs">
              <div className="flex items-center gap-3 p-4 rounded-2xl bg-stone-950/60 backdrop-blur-md border border-stone-800/60">
                <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0" />
                <div>
                  <p className="font-bold text-stone-100">1 Ano de Garantia</p>
                  <p className="text-[11px] text-stone-400">Passaporte Digital com QR</p>
                </div>
              </div>

              <div className="flex items-center gap-3 p-4 rounded-2xl bg-stone-950/60 backdrop-blur-md border border-stone-800/60">
                <Crown className="w-5 h-5 text-amber-400 shrink-0" />
                <div>
                  <p className="font-bold text-stone-100">10 Milésimos Ouro 18K</p>
                  <p className="text-[11px] text-stone-400">Hipoalergênico Níquel-Free</p>
                </div>
              </div>

              <div className="flex items-center gap-3 p-4 rounded-2xl bg-stone-950/60 backdrop-blur-md border border-stone-800/60">
                <Gift className="w-5 h-5 text-sky-400 shrink-0" />
                <div>
                  <p className="font-bold text-stone-100">Embalagem Velvet Box</p>
                  <p className="text-[11px] text-stone-400">Pronta para presentear</p>
                </div>
              </div>

              <div className="flex items-center gap-3 p-4 rounded-2xl bg-stone-950/60 backdrop-blur-md border border-stone-800/60">
                <Users className="w-5 h-5 text-rose-400 shrink-0" />
                <div>
                  <p className="font-bold text-stone-100">Consultora Oficial</p>
                  <p className="text-[11px] text-stone-400">Atendimento VIP personalizado</p>
                </div>
              </div>
            </div>
          </div>
        </main>
      ) : (
        /* IMMERSIVE FULL-BLEED CAROUSEL VIEW */
        <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-16 w-full flex flex-col justify-between gap-12 text-white">
          {/* Main Headline & Value Proposition */}
          <div className="max-w-3xl space-y-6">
            <div
              className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-stone-900/80 border backdrop-blur-md text-xs font-semibold tracking-wider uppercase shadow-md"
              style={{
                borderColor: `${brand.primaryColor}50`,
                color: brand.primaryColor,
              }}
            >
              <Sparkles className="w-3.5 h-3.5" style={{ color: brand.primaryColor }} />
              <span>{brand.heroPillBadge || "Exclusividade & Garantia Digital QR"}</span>
            </div>

            <h2 className="text-4xl sm:text-6xl font-serif italic font-normal tracking-wide text-stone-100 leading-[1.15]">
              {brand.heroHeadline || "A elegância atemporal da alta joalheria, ao alcance dos seus momentos."}
            </h2>

            <p className="text-base sm:text-lg text-stone-300 font-sans leading-relaxed max-w-2xl font-light">
              {brand.heroSubtitle || "Semijoias nobres fundidas em ligas antialérgicas com camada de 10 milésimos de Ouro 18K, zircônias de lapidação suíça e passaporte digital de garantia emitido instantaneamente para você."}
            </p>

            {/* Primary Action Buttons */}
            <div className="flex flex-wrap items-center gap-4 pt-2">
              <button
                onClick={() => onOpenStorefront()}
                className="px-8 py-4 rounded-full font-bold text-xs uppercase tracking-widest transition-all shadow-xl hover:scale-[1.02] flex items-center gap-2.5 cursor-pointer"
                style={{
                  backgroundColor: brand.primaryColor,
                  color: "#0c0a09",
                }}
              >
                <ShoppingBag className="w-4 h-4 text-stone-950" />
                <span>{brand.ctaPrimaryText || "Comprar na Vitrine Exclusiva"}</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <button
                onClick={() => onOpenStorefront("PERSONALIZADOS")}
                className="px-6 py-4 rounded-full bg-stone-900/80 hover:bg-stone-800/90 text-stone-100 font-bold text-xs uppercase tracking-wider border border-stone-700/80 backdrop-blur-md transition-all flex items-center gap-2 cursor-pointer"
              >
                <Crown className="w-4 h-4" style={{ color: brand.primaryColor }} />
                <span>{brand.ctaSecondaryText || "Personalizar Meu Colar"}</span>
              </button>
            </div>
          </div>

          {/* PROMOTIONS SHOWCASE & INTERACTIVE CAROUSEL */}
          <div className="space-y-4 pt-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Tag className="w-4 h-4 text-amber-400" />
                <h3 className="text-sm font-bold uppercase tracking-[0.2em] text-stone-300">
                  Promoções & Ofertas Ativas
                </h3>
              </div>

              {/* Carousel indicators & navigation */}
              <div className="flex items-center gap-2">
                {defaultPromotions.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setActivePromoIndex(i)}
                    className={`w-2.5 h-2.5 rounded-full transition-all cursor-pointer ${
                      activePromoIndex === i ? "bg-amber-400 w-6" : "bg-stone-600 hover:bg-stone-500"
                    }`}
                    title={`Ver promoção ${i + 1}`}
                  />
                ))}

                <div className="ml-2 flex items-center gap-1">
                  <button
                    onClick={() =>
                      setActivePromoIndex((prev) =>
                        prev === 0 ? defaultPromotions.length - 1 : prev - 1
                      )
                    }
                    className="p-1 rounded-full bg-stone-900/80 hover:bg-stone-800 text-stone-300 border border-stone-700"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() =>
                      setActivePromoIndex((prev) => (prev + 1) % defaultPromotions.length)
                    }
                    className="p-1 rounded-full bg-stone-900/80 hover:bg-stone-800 text-stone-300 border border-stone-700"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>

            {/* Featured Active Promotion Card Banner */}
            <div
              onClick={() => onOpenStorefront(activePromo.categoryTarget, activePromo.couponCode)}
              className="group relative bg-gradient-to-r from-stone-900/90 via-stone-900/95 to-black/90 border border-amber-400/30 hover:border-amber-400/70 rounded-3xl p-6 sm:p-8 backdrop-blur-xl shadow-2xl transition-all hover:scale-[1.005] cursor-pointer overflow-hidden"
            >
              {/* Background Glow */}
              <div className="absolute -right-20 -bottom-20 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl pointer-events-none group-hover:bg-amber-500/20 transition-all" />

              <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
                <div className="lg:col-span-8 space-y-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="px-3 py-1 rounded-full bg-amber-400/20 border border-amber-400/40 text-amber-300 text-[10px] font-bold tracking-wider uppercase">
                      {activePromo.badge}
                    </span>
                    <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-bold tracking-wider uppercase flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      <span>Tempo Limitado</span>
                    </span>
                  </div>

                  <h4 className="text-2xl sm:text-3xl font-serif italic font-bold text-stone-100 group-hover:text-amber-200 transition-colors">
                    {activePromo.title}
                  </h4>

                  <p className="text-xs sm:text-sm text-stone-300 font-sans leading-relaxed max-w-2xl font-light">
                    {activePromo.subtitle}
                  </p>

                  {/* Coupon Copy Pill */}
                  <div className="flex items-center gap-3 pt-2">
                    <div
                      onClick={(e) => handleCopyCoupon(activePromo.couponCode, e)}
                      className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-stone-950/80 border border-dashed border-amber-400/60 hover:border-amber-400 text-amber-300 text-xs font-mono font-bold transition-all shadow-inner"
                      title="Clique para copiar cupom"
                    >
                      <span>Cupom: {activePromo.couponCode}</span>
                      {copiedCoupon === activePromo.couponCode ? (
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                      ) : (
                        <Copy className="w-3.5 h-3.5 text-amber-400" />
                      )}
                    </div>
                    {copiedCoupon === activePromo.couponCode && (
                      <span className="text-[11px] text-emerald-400 font-semibold animate-pulse">
                        Copiado para o Checkout!
                      </span>
                    )}
                  </div>
                </div>

                {/* Promo CTA Box */}
                <div className="lg:col-span-4 flex flex-col items-start lg:items-end justify-center space-y-3">
                  <div className="text-left lg:text-right">
                    <span className="text-3xl sm:text-4xl font-serif font-bold text-amber-300 block">
                      {activePromo.discountText}
                    </span>
                    <span className="text-[11px] text-stone-400 font-medium">
                      Aplicado direto ao clicar
                    </span>
                  </div>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onOpenStorefront(activePromo.categoryTarget, activePromo.couponCode);
                    }}
                    className="w-full sm:w-auto px-6 py-3 rounded-full bg-amber-400 hover:bg-amber-300 text-stone-950 font-bold text-xs uppercase tracking-wider transition-all shadow-lg flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <span>{activePromo.ctaText}</span>
                    <ArrowRight className="w-4 h-4 text-stone-950" />
                  </button>
                </div>
              </div>
            </div>

            {/* Quick 3 Mini Promo Banners */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
              {defaultPromotions.filter((_, idx) => idx !== activePromoIndex).slice(0, 3).map((promo) => (
                <div
                  key={promo.id}
                  onClick={() => onOpenStorefront(promo.categoryTarget, promo.couponCode)}
                  className="p-4 rounded-2xl bg-stone-950/70 hover:bg-stone-900/90 border border-stone-800 hover:border-amber-400/50 backdrop-blur-md transition-all cursor-pointer space-y-2 group"
                >
                  <div className="flex items-center justify-between text-[10px] font-bold text-amber-400 uppercase tracking-wider">
                    <span>{promo.badge}</span>
                    <span className="font-mono text-white bg-stone-800 px-2 py-0.5 rounded">
                      {promo.discountText}
                    </span>
                  </div>
                  <h5 className="text-sm font-serif italic font-bold text-stone-200 group-hover:text-amber-200 transition-colors">
                    {promo.title}
                  </h5>
                  <p className="text-[11px] text-stone-400 line-clamp-2 leading-relaxed">
                    {promo.subtitle}
                  </p>
                  <div className="pt-1 flex items-center gap-1 text-[11px] text-amber-300 font-bold">
                    <span>Aproveitar</span>
                    <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Pillars of Trust Bar */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-6 border-t border-stone-800/80 text-xs">
            <div className="flex items-center gap-3 p-3 rounded-2xl bg-stone-950/40 backdrop-blur-md border border-stone-800/60">
              <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0" />
              <div>
                <p className="font-bold text-stone-100">1 Ano de Garantia</p>
                <p className="text-[11px] text-stone-400">Passaporte Digital com QR</p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 rounded-2xl bg-stone-950/40 backdrop-blur-md border border-stone-800/60">
              <Crown className="w-5 h-5 text-amber-400 shrink-0" />
              <div>
                <p className="font-bold text-stone-100">10 Milésimos Ouro 18K</p>
                <p className="text-[11px] text-stone-400">Hipoalergênico Níquel-Free</p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 rounded-2xl bg-stone-950/40 backdrop-blur-md border border-stone-800/60">
              <Gift className="w-5 h-5 text-sky-400 shrink-0" />
              <div>
                <p className="font-bold text-stone-100">Embalagem Velvet Box</p>
                <p className="text-[11px] text-stone-400">Pronta para presentear</p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 rounded-2xl bg-stone-950/40 backdrop-blur-md border border-stone-800/60">
              <Users className="w-5 h-5 text-rose-400 shrink-0" />
              <div>
                <p className="font-bold text-stone-100">Consultora Oficial</p>
                <p className="text-[11px] text-stone-400">Atendimento personalizado</p>
              </div>
            </div>
          </div>
        </main>
      )}

      {/* Discreet Luxury Footer with Admin Access Point */}
      <footer className="w-full bg-stone-950/95 border-t border-stone-900 text-stone-400 text-xs py-8 px-4 sm:px-6 lg:px-8 mt-auto">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex flex-col sm:flex-row items-center gap-3 text-center sm:text-left">
            <span className="font-serif italic text-lg text-stone-200">
              {brand.logoText || "Lumina Semijoias"}
            </span>
            {brand.customDomain && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-stone-900 border border-stone-800 text-[10px] font-mono text-emerald-400">
                <Globe className="w-3 h-3 text-emerald-500" />
                <span>{brand.customDomain}</span>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              </span>
            )}
            <span className="text-stone-600 hidden sm:inline">|</span>
            <span className="text-[11px] text-stone-500">
              {brand.footerSlogan || "© 2026 Lumina Haute Joaillerie. Todos os direitos reservados."}
            </span>
          </div>

          {/* Social Channels Bar (Instagram, WhatsApp, Pinterest) */}
          <div className="flex items-center gap-3 text-xs">
            <a
              href={brand.instagramUrl || `https://instagram.com/${(brand.instagramHandle || "@luminasemijoias").replace("@", "")}`}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1 text-stone-400 hover:text-rose-400 transition-colors"
              title="Instagram Oficial"
            >
              <Instagram className="w-3.5 h-3.5 text-rose-500" />
              <span className="text-[11px] font-mono">{brand.instagramHandle || "@luminasemijoias"}</span>
            </a>

            <span className="text-stone-700">•</span>

            <a
              href={`https://wa.me/${(brand.contactWhatsapp || "+5519988421100").replace(/\D/g, "")}?text=${encodeURIComponent(brand.whatsappPrefilledMessage || "Olá! Gostaria de atendimento VIP da Lumina!")}`}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1 text-stone-400 hover:text-emerald-400 transition-colors"
              title="WhatsApp VIP"
            >
              <MessageCircle className="w-3.5 h-3.5 text-emerald-500" />
              <span className="text-[11px] font-mono">{brand.contactWhatsapp || "+55 (19) 98842-1100"}</span>
            </a>

            <span className="text-stone-700">•</span>

            <a
              href={brand.pinterestBoardUrl || `https://pinterest.com/${(brand.pinterestHandle || "luminahautejoias").replace("@", "")}`}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1 text-stone-400 hover:text-red-400 transition-colors"
              title="Pinterest Lookbook"
            >
              <span className="w-3.5 h-3.5 rounded-full bg-red-600 text-white flex items-center justify-center text-[8px] font-bold">
                P
              </span>
              <span className="text-[11px] font-mono">{brand.pinterestHandle || "@luminahautejoias"}</span>
            </a>
          </div>

          {/* Discreet Admin Entrance for the Store Owner */}
          <div className="flex flex-wrap items-center justify-center gap-4 text-[11px]">
            <button
              onClick={() => onOpenStorefront()}
              className="text-stone-300 hover:text-amber-300 font-semibold transition-colors cursor-pointer"
            >
              Vitrine de Peças
            </button>
            <span className="text-stone-700">•</span>
            <button
              onClick={() => openAdminWithTab("storeSettings")}
              className="text-stone-400 hover:text-stone-200 transition-colors cursor-pointer flex items-center gap-1"
            >
              <Sliders className="w-3 h-3" style={{ color: brand.primaryColor }} />
              <span>Redes Sociais & QR Codes</span>
            </button>
            <span className="text-stone-700">•</span>
            <button
              onClick={() => setIsBgSelectorOpen(true)}
              className="text-stone-400 hover:text-stone-200 transition-colors cursor-pointer flex items-center gap-1"
            >
              <Palette className="w-3 h-3 text-stone-400" />
              <span>Arte de Fundo</span>
            </button>
            <span className="text-stone-700">•</span>
            {/* Very discreet owner login */}
            <button
              onClick={() => openAdminWithTab("dashboard")}
              className="text-stone-500 hover:text-amber-400 transition-colors flex items-center gap-1.5 px-2.5 py-1 rounded-full hover:bg-stone-900 border border-transparent hover:border-stone-800 cursor-pointer"
            >
              <Lock className="w-3 h-3 text-stone-500" />
              <span className="font-mono text-[10px]">Gestão do Dono (ERP)</span>
            </button>
          </div>
        </div>
      </footer>

      {/* MODAL: Background Art Customizer (Mudar a Arte de Fundo) */}
      {isBgSelectorOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-stone-900 border border-stone-800 text-stone-100 rounded-3xl max-w-2xl w-full p-6 sm:p-8 space-y-6 shadow-2xl">
            <div className="flex items-center justify-between pb-4 border-b border-stone-800">
              <div className="flex items-center gap-2">
                <Palette className="w-5 h-5 text-amber-400" />
                <h3 className="text-xl font-serif italic font-bold text-stone-100">
                  Personalizar Arte de Fundo da Tela Inicial
                </h3>
              </div>
              <button
                onClick={() => setIsBgSelectorOpen(false)}
                className="p-1 rounded-full text-stone-400 hover:text-white hover:bg-stone-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Presets Gallery */}
            <div className="space-y-3">
              <label className="text-xs font-bold uppercase tracking-wider text-stone-400">
                Temas de Alta Joalheria Pré-Configurados
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {backgroundPresets.map((preset) => (
                  <button
                    key={preset.id}
                    onClick={() => {
                      setCurrentBg(preset.url);
                    }}
                    className={`p-3 rounded-2xl border text-left transition-all flex gap-3 items-center group ${
                      currentBg === preset.url
                        ? "bg-stone-800 border-amber-400 shadow-md"
                        : "bg-stone-950/60 border-stone-800 hover:bg-stone-800/80 hover:border-stone-700"
                    }`}
                  >
                    <img
                      src={preset.url}
                      alt={preset.name}
                      className="w-14 h-14 rounded-xl object-cover shrink-0 border border-stone-700"
                    />
                    <div className="overflow-hidden">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-stone-200 group-hover:text-amber-200">
                          {preset.name}
                        </span>
                        {currentBg === preset.url && (
                          <Check className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                        )}
                      </div>
                      <p className="text-[10px] text-stone-400 truncate mt-0.5">
                        {preset.description}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Custom Image URL Form */}
            <form onSubmit={handleApplyCustomBg} className="space-y-2 pt-2 border-t border-stone-800">
              <label className="text-xs font-bold uppercase tracking-wider text-stone-400 block">
                Ou insira a URL da sua própria imagem de fundo:
              </label>
              <div className="flex gap-2">
                <input
                  type="url"
                  value={customBgInput}
                  onChange={(e) => setCustomBgInput(e.target.value)}
                  placeholder="https://exemplo.com/minha-foto-joalheria.jpg"
                  className="flex-1 bg-stone-950 border border-stone-700 rounded-xl px-3 py-2 text-xs text-stone-200 focus:outline-none focus:border-amber-400"
                />
                <button
                  type="submit"
                  className="px-4 py-2 bg-amber-400 hover:bg-amber-300 text-stone-950 font-bold text-xs rounded-xl transition-all"
                >
                  Aplicar URL
                </button>
              </div>
            </form>

            {/* Opacity slider */}
            <div className="space-y-2 pt-2 border-t border-stone-800">
              <div className="flex justify-between text-xs font-semibold text-stone-300">
                <span className="flex items-center gap-1.5">
                  <Sliders className="w-3.5 h-3.5 text-amber-400" />
                  <span>Escurecimento do Fundo (Contraste):</span>
                </span>
                <span className="font-mono text-amber-400">{bgOverlayOpacity}%</span>
              </div>
              <input
                type="range"
                min="20"
                max="90"
                value={bgOverlayOpacity}
                onChange={(e) => setBgOverlayOpacity(Number(e.target.value))}
                className="w-full accent-amber-400 cursor-pointer"
              />
              <p className="text-[10px] text-stone-400">
                Ajuste para dar mais destaque às fotos de fundo ou maximizar a legibilidade dos textos.
              </p>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setIsBgSelectorOpen(false)}
                className="px-6 py-2.5 bg-stone-800 hover:bg-stone-700 text-stone-200 font-bold text-xs rounded-full uppercase tracking-wider"
              >
                Concluir & Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Discreet Store Owner / Admin Authentication */}
      {isAdminModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-stone-900 border border-stone-800 text-stone-100 rounded-3xl max-w-md w-full p-6 sm:p-8 space-y-6 shadow-2xl">
            <div className="flex items-center justify-between pb-4 border-b border-stone-800">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-amber-400/20 text-amber-400">
                  <Lock className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-xl font-serif italic font-bold text-stone-100">
                    Acesso do Dono da Loja
                  </h3>
                  <span className="text-[10px] uppercase tracking-widest text-stone-400">
                    Painel Administrativo & ERP
                  </span>
                </div>
              </div>
              <button
                onClick={() => setIsAdminModalOpen(false)}
                className="p-1 rounded-full text-stone-400 hover:text-white hover:bg-stone-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-stone-300 leading-relaxed font-sans">
              Área restrita para a gestão de estoque com Ledger, acerto de maletas de consignação, comissões de consultoras, pedidos omnichannel, gateway MCP e auditoria LGPD.
            </p>

            <form onSubmit={handleAdminLogin} className="space-y-4">
              <div>
                <label className="text-[11px] font-semibold text-stone-300 block mb-1">
                  Senha / PIN do Administrador Master:
                </label>
                <input
                  type="password"
                  value={adminPin}
                  onChange={(e) => setAdminPin(e.target.value)}
                  placeholder="PIN Master (ou clique direto em Entrar)"
                  className="w-full bg-stone-950 border border-stone-700 rounded-xl px-3.5 py-2.5 text-sm text-stone-100 focus:outline-none focus:border-amber-400 font-mono tracking-widest"
                />
                <span className="text-[10px] text-stone-500 block mt-1">
                  💡 Acesso rápido autorizado para Willian C. Lima (Dono & Matriz)
                </span>
              </div>

              {adminError && (
                <div className="p-2.5 rounded-xl bg-rose-950/80 border border-rose-800 text-rose-300 text-xs">
                  PIN incorreto. Tente novamente ou use o login rápido de demonstração.
                </div>
              )}

              <div className="pt-2 flex flex-col gap-2">
                <button
                  type="submit"
                  className="w-full py-3 bg-amber-400 hover:bg-amber-300 text-stone-950 rounded-2xl text-xs font-bold uppercase tracking-wider transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Layers className="w-4 h-4 text-stone-950" />
                  <span>Acessar Painel ERP Completo</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setIsAdminModalOpen(false);
                    onOpenStorefront();
                  }}
                  className="w-full py-2.5 bg-stone-800 hover:bg-stone-700 text-stone-300 rounded-2xl text-xs font-semibold transition-all"
                >
                  Continuar como Comprador B2C
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
