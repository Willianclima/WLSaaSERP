import React, { useState } from "react";
import {
  Sparkles,
  ShoppingBag,
  Crown,
  Heart,
  Calendar,
  Clock,
  MapPin,
  Tag,
  Copy,
  Check,
  ArrowRight,
  ExternalLink,
  MessageCircle,
  Instagram,
  Facebook,
  Share2,
  Sliders,
  Palette,
  Phone,
  Gift,
  ShieldCheck,
  Layers,
  ChevronRight,
  QrCode,
  Download,
  Printer,
  X,
} from "lucide-react";
import { StoreBrandingConfig, TenantStore, ProductItem } from "../types";
import confetti from "canvas-confetti";

interface JewelryExpoCollagePosterProps {
  tenant: TenantStore;
  branding: StoreBrandingConfig;
  onOpenStorefront: (category?: string, coupon?: string) => void;
  onOpenAdminSettings: () => void;
}

export interface CollageThemePreset {
  id: string;
  name: string;
  badge: string;
  goldColor: string;
  bgTone: string;
  textColor: string;
  images: {
    topCenter: string; // bouquet/music sheet
    topLeft: string; // champagne/rings
    centerHero: string; // hands with diamond ring
    topRight: string; // elegant suit/model
    bottomLeft: string; // luxury cake/jewelry table
    bottomCenter: string; // couple sunset
    bottomRight: string; // radiant bride with earrings
  };
}

export const COLLAGE_THEME_PRESETS: CollageThemePreset[] = [
  {
    id: "bridal-expo",
    name: "Noivas, Alianças & Gala (Fiel à Referência)",
    badge: "Mostra Noivas 2026",
    goldColor: "#B88E3E", // Rich warm gold from the reference image
    bgTone: "#F7F4EC", // Warm off-white poster canvas
    textColor: "#1F1E1B",
    images: {
      topCenter: "https://images.unsplash.com/photo-1519741497674-611481863552?w=800&auto=format&fit=crop&q=80", // Bouquet with rings & soft green
      topLeft: "https://images.unsplash.com/photo-1511285560929-80b456fea0bc?w=800&auto=format&fit=crop&q=80", // Champagne glasses & wedding lights
      centerHero: "https://images.unsplash.com/photo-1515934751635-c81c6bc9a2d8?w=1000&auto=format&fit=crop&q=80", // Close up hands holding with diamond ring
      topRight: "https://images.unsplash.com/photo-1507679799987-c73779587ccf?w=800&auto=format&fit=crop&q=80", // Elegant model in tailored suit
      bottomLeft: "https://images.unsplash.com/photo-1535141192574-5d4897c13136?w=800&auto=format&fit=crop&q=80", // Luxury floral cake & event tiers
      bottomCenter: "https://images.unsplash.com/photo-1519225421980-715cb0215aed?w=800&auto=format&fit=crop&q=80", // Romantic couple sunset
      bottomRight: "https://images.unsplash.com/photo-1594552072238-b8a33785b261?w=800&auto=format&fit=crop&q=80", // Gorgeous bride with riviera earrings & jewelry
    },
  },
  {
    id: "alta-semijoias-18k",
    name: "Alta Joalheria & Banhos de Ouro 18K",
    badge: "Coleção Nobre Ouro 18K",
    goldColor: "#C59B4B",
    bgTone: "#F9F6F0",
    textColor: "#18181B",
    images: {
      topCenter: "https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?w=800&auto=format&fit=crop&q=80", // Fine gold necklace & pearls
      topLeft: "https://images.unsplash.com/photo-1605100804763-247f67b3557e?w=800&auto=format&fit=crop&q=80", // Diamond solitaire ring on velvet
      centerHero: "https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?w=1000&auto=format&fit=crop&q=80", // Handcrafted gold necklace & gems
      topRight: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=800&auto=format&fit=crop&q=80", // Fashion model wearing gold hoops
      bottomLeft: "https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?w=800&auto=format&fit=crop&q=80", // Goldsmith crafting gold jewellery
      bottomCenter: "https://images.unsplash.com/photo-1611591475152-478311399767?w=800&auto=format&fit=crop&q=80", // Sparkling luxury earrings
      bottomRight: "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=800&auto=format&fit=crop&q=80", // Model portrait with riviera collar
    },
  },
  {
    id: "riviera-festas",
    name: "Rivieras, Cristais & Noite de Gala",
    badge: "Gala & Brilho Intenso",
    goldColor: "#D97706",
    bgTone: "#FAF8F5",
    textColor: "#111827",
    images: {
      topCenter: "https://images.unsplash.com/photo-1573408301185-9146fe634ad0?w=800&auto=format&fit=crop&q=80", // Riviera zirconias sparkle
      topLeft: "https://images.unsplash.com/photo-1544816155-12df9643f363?w=800&auto=format&fit=crop&q=80", // Luxury gift bag & gold accessories
      centerHero: "https://images.unsplash.com/photo-1603561591411-07134e71a2a9?w=1000&auto=format&fit=crop&q=80", // Model hand with luxury cocktail rings
      topRight: "https://images.unsplash.com/photo-1509631179647-0177331693ae?w=800&auto=format&fit=crop&q=80", // High-fashion editorial look
      bottomLeft: "https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=800&auto=format&fit=crop&q=80", // Sparkling gemstone cluster
      bottomCenter: "https://images.unsplash.com/photo-1518895949257-7621c3c786d7?w=800&auto=format&fit=crop&q=80", // Romantic flowers & candle decor
      bottomRight: "https://images.unsplash.com/photo-1502716119720-b23a93e5fe1b?w=800&auto=format&fit=crop&q=80", // Model in champagne dress with jewelry
    },
  },
];

export const JewelryExpoCollagePoster: React.FC<JewelryExpoCollagePosterProps> = ({
  tenant,
  branding,
  onOpenStorefront,
  onOpenAdminSettings,
}) => {
  const [selectedThemeId, setSelectedThemeId] = useState<string>("bridal-expo");
  const [copiedCoupon, setCopiedCoupon] = useState<string | null>(null);
  const [socialToast, setSocialToast] = useState<string | null>(null);
  const [showQrModal, setShowQrModal] = useState<boolean>(false);

  const activeTheme =
    COLLAGE_THEME_PRESETS.find((t) => t.id === selectedThemeId) || COLLAGE_THEME_PRESETS[0];

  const posterGold = branding.primaryColor || activeTheme.goldColor;
  const promoCode = branding.posterPromoCode || "EXPO2026";
  const promoDiscount = branding.posterPromoDiscount || "20% OFF";

  const cleanPhone = (branding.contactWhatsapp || "+5519988421100").replace(/\D/g, "");
  const encodedMsg = encodeURIComponent(
    branding.whatsappPrefilledMessage ||
      `Olá! Vi o cartaz da ${branding.logoText || "Lumina Semijoias"} da Expo 2026 e gostaria de atendimento VIP!`
  );
  const whatsappDirectUrl = `https://wa.me/${cleanPhone}?text=${encodedMsg}`;

  const instagramDirectUrl =
    branding.instagramUrl ||
    (branding.instagramHandle
      ? `https://instagram.com/${branding.instagramHandle.replace("@", "")}`
      : "https://instagram.com/luminasemijoias");

  const pinterestDirectUrl =
    branding.pinterestBoardUrl ||
    `https://pinterest.com/${(branding.pinterestHandle || "luminahautejoias").replace("@", "")}`;

  const qrColor = branding.qrCodeColor || posterGold || "#B88E3E";
  const qrCodeApiUrl = `https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${encodeURIComponent(
    whatsappDirectUrl
  )}&color=${qrColor.replace("#", "")}&bgcolor=FFFFFF&margin=1`;

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCoupon(code);
    confetti({
      particleCount: 35,
      spread: 60,
      origin: { y: 0.65 },
    });
    setTimeout(() => setCopiedCoupon(null), 3000);
  };

  const handleSocialClick = (platform: string, handle: string, url: string) => {
    navigator.clipboard.writeText(handle);
    setSocialToast(`Link copiado: ${handle}`);
    setTimeout(() => setSocialToast(null), 3000);
  };

  const openWhatsApp = () => {
    const rawNumber = (branding.contactWhatsapp || "+5519988421100").replace(/\D/g, "");
    const message = encodeURIComponent(
      `Olá! Vi o cartaz da ${branding.logoText || "Lumina Semijoias"} da Expo 2026 e gostaria de atendimento VIP!`
    );
    window.open(`https://wa.me/${rawNumber}?text=${message}`, "_blank");
  };

  return (
    <div className="w-full flex flex-col items-center py-6 sm:py-10 px-3 sm:px-6">
      {/* Quick Collage Theme Switcher & Admin Action Bar */}
      <div className="w-full max-w-4xl flex flex-wrap items-center justify-between gap-3 mb-6 bg-white/90 backdrop-blur-md p-3 sm:p-4 rounded-2xl border border-stone-200 shadow-sm">
        <div className="flex items-center gap-2">
          <span className="p-1.5 rounded-lg bg-amber-100 text-amber-800">
            <Palette className="w-4 h-4" />
          </span>
          <span className="text-xs font-bold uppercase tracking-wider text-stone-700">
            Estilo do Cartaz Expo:
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {COLLAGE_THEME_PRESETS.map((theme) => (
            <button
              key={theme.id}
              onClick={() => setSelectedThemeId(theme.id)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                selectedThemeId === theme.id
                  ? "bg-stone-900 text-white shadow-xs"
                  : "bg-stone-100 hover:bg-stone-200 text-stone-700"
              }`}
            >
              {theme.name}
            </button>
          ))}

          <button
            onClick={onOpenAdminSettings}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-amber-400/20 hover:bg-amber-400/30 text-amber-900 border border-amber-400/40 text-xs font-bold transition-all ml-1 cursor-pointer"
            title="Editar textos, fotos e redes sociais no painel administrativo"
          >
            <Sliders className="w-3.5 h-3.5 text-amber-700" />
            <span>Editar no Admin</span>
          </button>
        </div>
      </div>

      {/* THE PROMO EXPO POSTER COLLAGE (Faithful to Reference Image) */}
      <div
        id="expo-poster-frame"
        className="w-full max-w-3xl rounded-3xl overflow-hidden shadow-2xl border border-stone-300/80 transition-all flex flex-col relative"
        style={{
          backgroundColor: activeTheme.bgTone,
          color: activeTheme.textColor,
        }}
      >
        {/* ========================================================================= */}
        {/* 1. TOP HALF: GEOMETRIC DIAMOND PHOTO COLLAGE WITH CRISP WHITE DIVIDERS     */}
        {/* ========================================================================= */}
        <div className="relative w-full h-[380px] sm:h-[480px] md:h-[540px] bg-stone-950 overflow-hidden select-none">
          {/* Top-Left Dark Triangle background */}
          <div
            className="absolute top-0 left-0 w-1/3 h-1/3 z-0"
            style={{
              clipPath: "polygon(0 0, 100% 0, 0 100%)",
              backgroundColor: "#2B2825",
            }}
          />

          {/* Top Gold Geometric Polygon 1 (Accent Shape from image) */}
          <div
            className="absolute top-0 left-1/4 w-1/2 h-1/3 z-0"
            style={{
              clipPath: "polygon(50% 0, 100% 100%, 0 100%)",
              backgroundColor: posterGold,
              opacity: 0.95,
            }}
          />

          {/* Top-Right Slate Dark Polygon */}
          <div
            className="absolute top-0 right-0 w-2/5 h-2/5 z-0"
            style={{
              clipPath: "polygon(0 0, 100% 0, 100% 100%)",
              backgroundColor: "#1F2937",
            }}
          />

          {/* Bottom-Left Gold Accent Polygon */}
          <div
            className="absolute bottom-0 left-0 w-1/3 h-1/3 z-0"
            style={{
              clipPath: "polygon(0 0, 0 100%, 100% 100%)",
              backgroundColor: posterGold,
              opacity: 0.9,
            }}
          />

          {/* Bottom-Right Gold Accent Polygon */}
          <div
            className="absolute bottom-0 right-0 w-1/4 h-1/4 z-0"
            style={{
              clipPath: "polygon(100% 0, 100% 100%, 0 100%)",
              backgroundColor: posterGold,
              opacity: 0.85,
            }}
          />

          {/* White Dividing Grid Overlay Lines for crisp graphic poster lines */}
          <svg
            className="absolute inset-0 w-full h-full pointer-events-none z-20"
            preserveAspectRatio="none"
            viewBox="0 0 100 100"
          >
            {/* Main diagonal criss-cross separator lines */}
            <line x1="0" y1="50" x2="50" y2="0" stroke="#FFFFFF" strokeWidth="1.2" />
            <line x1="50" y1="0" x2="100" y2="50" stroke="#FFFFFF" strokeWidth="1.2" />
            <line x1="0" y1="50" x2="50" y2="100" stroke="#FFFFFF" strokeWidth="1.2" />
            <line x1="50" y1="100" x2="100" y2="50" stroke="#FFFFFF" strokeWidth="1.2" />

            <line x1="25" y1="25" x2="75" y2="75" stroke="#FFFFFF" strokeWidth="1.2" />
            <line x1="75" y1="25" x2="25" y2="75" stroke="#FFFFFF" strokeWidth="1.2" />
          </svg>

          {/* ------------------------------------------------------------- */}
          {/* PHOTO 1: TOP-LEFT DIAMOND (Champagne & Celebration)            */}
          {/* ------------------------------------------------------------- */}
          <div
            className="absolute top-[-5%] left-[-5%] w-[42%] h-[50%] z-10 overflow-hidden shadow-lg border-2 border-white"
            style={{
              clipPath: "polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)",
            }}
          >
            <img
              src={activeTheme.images.topLeft}
              alt="Champagne & Wedding Celebrations"
              className="w-full h-full object-cover scale-110 hover:scale-125 transition-transform duration-700 cursor-pointer"
              onClick={() => onOpenStorefront("TODOS")}
              title="Ver coleção festas e comemorações"
            />
          </div>

          {/* ------------------------------------------------------------- */}
          {/* PHOTO 2: TOP-CENTER DIAMOND (Bouquet & Sheet Music & Pearls)   */}
          {/* ------------------------------------------------------------- */}
          <div
            className="absolute top-[-6%] left-[30%] w-[48%] h-[54%] z-10 overflow-hidden shadow-lg border-2 border-white"
            style={{
              clipPath: "polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)",
            }}
          >
            <img
              src={activeTheme.images.topCenter}
              alt="Bouquet & Luxury Pearl Jewelry"
              className="w-full h-full object-cover scale-110 hover:scale-125 transition-transform duration-700 cursor-pointer"
              onClick={() => onOpenStorefront("COLARES")}
              title="Ver colares e pérolas nobres"
            />
          </div>

          {/* ------------------------------------------------------------- */}
          {/* PHOTO 3: TOP-RIGHT DIAMOND (Groom / Model in Tailored Suit)    */}
          {/* ------------------------------------------------------------- */}
          <div
            className="absolute top-[-5%] right-[-5%] w-[42%] h-[50%] z-10 overflow-hidden shadow-lg border-2 border-white"
            style={{
              clipPath: "polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)",
            }}
          >
            <img
              src={activeTheme.images.topRight}
              alt="Model in tailored suit with gold accessories"
              className="w-full h-full object-cover scale-110 hover:scale-125 transition-transform duration-700 cursor-pointer"
              onClick={() => onOpenStorefront("PULSEIRAS")}
              title="Ver pulseiras e anéis masculinos & unissex"
            />
          </div>

          {/* ------------------------------------------------------------- */}
          {/* PHOTO 4: CENTER HERO DIAMOND (Holding hands with diamond ring) */}
          {/* ------------------------------------------------------------- */}
          <div
            className="absolute top-[20%] left-[24%] w-[52%] h-[60%] z-15 overflow-hidden shadow-2xl border-4 border-white"
            style={{
              clipPath: "polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)",
            }}
          >
            <img
              src={activeTheme.images.centerHero}
              alt="Hands holding with Solitaire Diamond & Gold Ring"
              className="w-full h-full object-cover scale-115 hover:scale-130 transition-transform duration-700 cursor-pointer"
              onClick={() => onOpenStorefront("ANEIS")}
              title="Ver anéis solitários e alianças banhadas a 10 milésimos Ouro 18K"
            />
          </div>

          {/* ------------------------------------------------------------- */}
          {/* PHOTO 5: BOTTOM-LEFT DIAMOND (Luxury Floral Cake & Display)    */}
          {/* ------------------------------------------------------------- */}
          <div
            className="absolute bottom-[-6%] left-[-4%] w-[42%] h-[52%] z-10 overflow-hidden shadow-lg border-2 border-white"
            style={{
              clipPath: "polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)",
            }}
          >
            <img
              src={activeTheme.images.bottomLeft}
              alt="Luxury Cake & Wedding Showcase"
              className="w-full h-full object-cover scale-110 hover:scale-125 transition-transform duration-700 cursor-pointer"
              onClick={() => onOpenStorefront("PERSONALIZADOS")}
              title="Ver semijoias personalizadas para presentes"
            />
          </div>

          {/* ------------------------------------------------------------- */}
          {/* PHOTO 6: BOTTOM-CENTER DIAMOND (Romantic Couple Sunset)        */}
          {/* ------------------------------------------------------------- */}
          <div
            className="absolute bottom-[-8%] left-[28%] w-[46%] h-[54%] z-10 overflow-hidden shadow-lg border-2 border-white"
            style={{
              clipPath: "polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)",
            }}
          >
            <img
              src={activeTheme.images.bottomCenter}
              alt="Couple sunset with back bridal necklace"
              className="w-full h-full object-cover scale-110 hover:scale-125 transition-transform duration-700 cursor-pointer"
              onClick={() => onOpenStorefront("TODOS")}
              title="Explorar vitrine completa"
            />
          </div>

          {/* ------------------------------------------------------------- */}
          {/* PHOTO 7: BOTTOM-RIGHT DIAMOND (Radiant Bride with Riviera)     */}
          {/* ------------------------------------------------------------- */}
          <div
            className="absolute bottom-[-6%] right-[-4%] w-[44%] h-[54%] z-10 overflow-hidden shadow-lg border-2 border-white"
            style={{
              clipPath: "polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)",
            }}
          >
            <img
              src={activeTheme.images.bottomRight}
              alt="Radiant Bride with Riviera Earrings & Necklace"
              className="w-full h-full object-cover scale-110 hover:scale-125 transition-transform duration-700 cursor-pointer"
              onClick={() => onOpenStorefront("BRINCOS")}
              title="Ver brincos de noiva e rivieras"
            />
          </div>

          {/* Bottom Angled Cut into the poster body */}
          <div
            className="absolute bottom-0 left-0 right-0 h-10 z-20"
            style={{
              background: `linear-gradient(to top, ${activeTheme.bgTone} 0%, transparent 100%)`,
            }}
          />
        </div>

        {/* ========================================================================= */}
        {/* 2. POSTER CENTER: BRAND EMBLEM & EDITORIAL EVENT HEADLINE                  */}
        {/* ========================================================================= */}
        <div className="px-6 sm:px-12 pt-4 pb-8 flex flex-col items-center text-center space-y-4">
          {/* Brand Golden Emblem / Interlocking Hearts / Jewels */}
          <div className="flex flex-col items-center gap-1 group cursor-pointer" onClick={() => onOpenStorefront()}>
            {branding.logoType === "IMAGE" && branding.logoUrl ? (
              <img
                src={branding.logoUrl}
                alt={branding.logoText || "Lumina"}
                className="h-14 w-auto object-contain my-1"
              />
            ) : (
              <div className="flex items-center justify-center gap-1.5">
                {/* Interlocking Golden Double Heart/Jewel Icon (faithful to reference image) */}
                <div className="relative w-12 h-10 flex items-center justify-center">
                  <Heart
                    className="w-9 h-9 fill-current -rotate-12 absolute left-0"
                    style={{ color: posterGold }}
                  />
                  <Heart
                    className="w-6 h-6 fill-current rotate-12 absolute right-0 bottom-0.5"
                    style={{ color: "#FDE68A" }}
                  />
                </div>
              </div>
            )}

            {/* Brand Name Text (e.g. "Bella Brides" -> "Lumina Semijoias") */}
            <span className="font-serif font-bold italic text-xl sm:text-2xl tracking-wide text-stone-800">
              {branding.logoText || "Lumina"}
            </span>
            <span
              className="text-[10px] font-bold tracking-[0.3em] uppercase font-sans -mt-1"
              style={{ color: posterGold }}
            >
              {branding.logoSubtext || "Alta Semijoias"}
            </span>
          </div>

          {/* Big Bold Poster Event Title (e.g. "BRIDAL SHOW" / "EXPO SEMIJOIAS") */}
          <h1 className="text-3xl sm:text-5xl md:text-6xl font-black tracking-tight text-stone-900 uppercase font-sans leading-none pt-1">
            {branding.posterTitle || "EXPO SEMIJOIAS & NOIVAS"}
          </h1>

          {/* Golden Badge Banner (e.g. "SATURDAY, MAY 21, 2026" / Promo dates) */}
          <div
            onClick={() => handleCopyCode(promoCode)}
            className="w-full max-w-xl py-3 px-6 rounded-md shadow-md flex items-center justify-center gap-3 cursor-pointer hover:opacity-95 transition-all group active:scale-[0.99]"
            style={{ backgroundColor: posterGold }}
            title="Clique para copiar cupom promocional da Expo!"
          >
            <Calendar className="w-5 h-5 text-white/90 shrink-0" />
            <span className="text-white font-sans font-bold text-sm sm:text-base md:text-lg tracking-wider uppercase">
              {branding.posterBadgeDate || "SÁBADO, 21 DE MARÇO DE 2026"}
            </span>
            <span className="hidden sm:inline-flex items-center gap-1 text-[11px] bg-white/20 text-white font-mono px-2 py-0.5 rounded font-bold">
              <Tag className="w-3 h-3" />
              {promoCode} ({promoDiscount})
            </span>
          </div>

          {/* Location & Time Subtitle (e.g. "SOMERSET GRAND BANQUET HALL • 10:00AM - 5:00PM") */}
          <p className="text-xs sm:text-sm md:text-base font-sans font-extrabold tracking-wide uppercase text-stone-800 pt-1">
            {branding.posterLocation || "SHOWROOM VIP & ATELIÊ • 10:00 ÀS 19:00 • VITRINE ONLINE"}
          </p>

          {/* Descriptive Hook Paragraph */}
          <p className="text-xs sm:text-sm text-stone-600 font-sans leading-relaxed max-w-2xl px-2">
            {branding.posterDescription ||
              "Uma mostra deslumbrante com semijoias nobres fundidas em ligas antialérgicas, banho de 10 milésimos de Ouro 18K, zircônias suíças, novidades para noivas e passaporte digital de garantia emitido instantaneamente via QR Code."}
          </p>

          {/* Website Link Callout */}
          <p className="text-xs sm:text-sm text-stone-700 font-medium">
            Para mais informações e compras com frete cortesia, visite:{" "}
            <button
              onClick={() => onOpenStorefront()}
              className="font-bold underline text-stone-900 hover:text-amber-800 transition-colors cursor-pointer"
            >
              {branding.websiteUrl || "www.luminasemijoias.com.br"}
            </button>
          </p>

          {/* ========================================================================= */}
          {/* 3. SOCIAL MEDIA FOOTER (Exact Match with Round Dark Badges & Handles)     */}
          {/* ========================================================================= */}
          <div className="w-full pt-4 pb-2 border-t border-stone-300/80">
            <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-6">
              {/* Instagram Handle */}
              <a
                href={instagramDirectUrl}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1.5 text-stone-800 hover:text-stone-950 transition-all cursor-pointer group"
                title="Acessar Instagram Oficial"
              >
                <div className="w-8 h-8 rounded-full bg-stone-900 text-white flex items-center justify-center shadow-sm group-hover:bg-rose-700 group-hover:scale-110 transition-transform">
                  <Instagram className="w-4 h-4" />
                </div>
                <span className="text-xs font-semibold text-stone-700 group-hover:text-stone-900">
                  {branding.instagramHandle || "@luminasemijoias"}
                </span>
              </a>

              {/* WhatsApp Direct Chat Button */}
              <a
                href={whatsappDirectUrl}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1.5 text-stone-800 hover:text-emerald-900 transition-all cursor-pointer group"
                title="Iniciar conversa com Consultora VIP no WhatsApp"
              >
                <div className="w-8 h-8 rounded-full bg-stone-900 text-white flex items-center justify-center shadow-sm group-hover:bg-emerald-600 group-hover:scale-110 transition-transform">
                  <MessageCircle className="w-4 h-4" />
                </div>
                <span className="text-xs font-semibold text-stone-700 group-hover:text-emerald-800">
                  {branding.contactWhatsapp || "+55 (19) 98842-1100"}
                </span>
              </a>

              {/* Pinterest Handle */}
              <a
                href={pinterestDirectUrl}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1.5 text-stone-800 hover:text-red-900 transition-all cursor-pointer group"
                title="Ver Pastas de Inspiração no Pinterest"
              >
                <div className="w-8 h-8 rounded-full bg-stone-900 text-white flex items-center justify-center shadow-sm group-hover:bg-red-600 group-hover:scale-110 transition-transform font-serif font-bold text-xs">
                  P
                </div>
                <span className="text-xs font-semibold text-stone-700 group-hover:text-red-800">
                  {branding.pinterestHandle || "@luminahautejoias"}
                </span>
              </a>

              {/* Facebook Handle */}
              <button
                onClick={() =>
                  handleSocialClick("Facebook", branding.facebookHandle || "@luminasemijoias", "https://facebook.com")
                }
                className="flex items-center gap-1.5 text-stone-800 hover:text-stone-950 transition-all cursor-pointer group"
                title="Copiar / Acessar Facebook"
              >
                <div className="w-8 h-8 rounded-full bg-stone-900 text-white flex items-center justify-center shadow-sm group-hover:bg-blue-800 group-hover:scale-110 transition-transform">
                  <Facebook className="w-4 h-4" />
                </div>
                <span className="text-xs font-semibold text-stone-700 group-hover:text-stone-900 hidden sm:inline">
                  {branding.facebookHandle || "@luminasemijoias"}
                </span>
              </button>

              {/* QR Code Trigger Button */}
              <button
                onClick={() => setShowQrModal(true)}
                className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-stone-900 text-amber-300 hover:bg-stone-800 text-xs font-bold transition-all shadow-xs cursor-pointer hover:scale-105"
                title="Ver QR Code Escaneável para WhatsApp, Instagram e Pinterest"
              >
                <QrCode className="w-3.5 h-3.5" />
                <span>QR Code VIP</span>
              </button>
            </div>

            {/* Toast feedback when clicking handles */}
            {socialToast && (
              <div className="mt-3 inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-stone-900 text-amber-300 text-xs font-semibold animate-in fade-in shadow-md">
                <Check className="w-3.5 h-3.5 text-amber-400" />
                <span>{socialToast}</span>
              </div>
            )}
          </div>

          {/* ========================================================================= */}
          {/* 4. FAST INTERACTIVE CTA BUTTONS                                           */}
          {/* ========================================================================= */}
          <div className="w-full pt-4 flex flex-wrap items-center justify-center gap-3">
            <button
              onClick={() => onOpenStorefront("TODOS", promoCode)}
              className="px-6 py-3.5 rounded-full text-white font-bold text-xs uppercase tracking-widest transition-all shadow-lg hover:scale-105 flex items-center gap-2 cursor-pointer"
              style={{ backgroundColor: posterGold }}
            >
              <ShoppingBag className="w-4 h-4 text-white" />
              <span>Entrar na Vitrine com Cupom ({promoDiscount})</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            <button
              onClick={() => onOpenStorefront("PERSONALIZADOS")}
              className="px-5 py-3.5 rounded-full bg-stone-900 hover:bg-stone-800 text-stone-100 font-bold text-xs uppercase tracking-wider transition-all shadow-md flex items-center gap-2 cursor-pointer"
            >
              <Crown className="w-4 h-4 text-amber-400" />
              <span>Personalizar Meu Colar com Nome</span>
            </button>

            <button
              onClick={() => setShowQrModal(true)}
              className="px-4 py-3.5 rounded-full bg-white border border-amber-400 hover:bg-amber-50 text-amber-900 font-bold text-xs transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
              title="Abrir QR Code Escaneável para Celular"
            >
              <QrCode className="w-4 h-4 text-amber-600" />
              <span>Escanear QR Code</span>
            </button>

            <button
              onClick={() => handleCopyCode(promoCode)}
              className="px-4 py-3.5 rounded-full border border-stone-400 hover:bg-stone-200 text-stone-800 font-bold text-xs transition-all flex items-center gap-1.5 cursor-pointer"
              title="Copiar cupom de desconto"
            >
              {copiedCoupon === promoCode ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Cupom Copiado!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 text-stone-600" />
                  <span>Copiar Cupom ({promoCode})</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 5. MODAL INTERATIVO DE QR CODE E REDES SOCIAIS                            */}
      {/* ========================================================================= */}
      {showQrModal && (
        <div className="fixed inset-0 z-50 bg-stone-950/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-8 text-stone-900 shadow-2xl border-4 border-amber-400/40 relative space-y-5 animate-in zoom-in-95">
            <button
              onClick={() => setShowQrModal(false)}
              className="absolute top-5 right-5 p-2 rounded-full bg-stone-100 hover:bg-stone-200 text-stone-600 transition-all cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="text-center space-y-1">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-100 text-amber-800 text-[11px] font-bold uppercase tracking-wider">
                <Crown className="w-3.5 h-3.5" />
                <span>{branding.logoSubtext || "Alta Semijoias"}</span>
              </div>
              <h3 className="text-2xl font-serif italic font-bold text-stone-900">
                {branding.logoText || "Lumina"} VIP QR Code
              </h3>
              <p className="text-xs text-stone-600">
                Aponte a câmera do celular para atendimento exclusivo ou siga nossas redes oficiais.
              </p>
            </div>

            {/* QR Code Container */}
            <div className="flex flex-col items-center p-4 bg-stone-50 rounded-2xl border-2 border-dashed border-amber-400/60 shadow-inner">
              <img
                src={qrCodeApiUrl}
                alt="QR Code"
                className="w-48 h-48 rounded-xl object-contain bg-white p-2 border border-stone-200"
              />
              <span
                className="mt-3 px-4 py-1 rounded-full text-white text-[10px] font-bold uppercase tracking-wider shadow-sm"
                style={{ backgroundColor: qrColor }}
              >
                Aponte a Câmera
              </span>
            </div>

            {/* Direct Channel Buttons */}
            <div className="grid grid-cols-3 gap-2">
              <a
                href={whatsappDirectUrl}
                target="_blank"
                rel="noreferrer"
                className="p-2.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-900 flex flex-col items-center text-center transition-all cursor-pointer"
              >
                <MessageCircle className="w-5 h-5 text-emerald-600 mb-1" />
                <span className="text-[11px] font-bold">WhatsApp</span>
                <span className="text-[9px] text-emerald-700">Chat Direto</span>
              </a>

              <a
                href={instagramDirectUrl}
                target="_blank"
                rel="noreferrer"
                className="p-2.5 rounded-xl bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-900 flex flex-col items-center text-center transition-all cursor-pointer"
              >
                <Instagram className="w-5 h-5 text-rose-600 mb-1" />
                <span className="text-[11px] font-bold">Instagram</span>
                <span className="text-[9px] text-rose-700">@luminasemijoias</span>
              </a>

              <a
                href={pinterestDirectUrl}
                target="_blank"
                rel="noreferrer"
                className="p-2.5 rounded-xl bg-red-50 hover:bg-red-100 border border-red-200 text-red-900 flex flex-col items-center text-center transition-all cursor-pointer"
              >
                <div className="w-5 h-5 rounded-full bg-red-600 text-white flex items-center justify-center text-[10px] font-bold mb-1">
                  P
                </div>
                <span className="text-[11px] font-bold">Pinterest</span>
                <span className="text-[9px] text-red-700">Lookbook</span>
              </a>
            </div>

            <div className="pt-2 flex items-center justify-between gap-3">
              <button
                onClick={() => {
                  window.print();
                }}
                className="flex-1 py-2.5 rounded-full bg-stone-100 hover:bg-stone-200 text-stone-800 text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5 text-stone-600" />
                <span>Imprimir Display</span>
              </button>

              <button
                onClick={() => {
                  const link = document.createElement("a");
                  link.href = qrCodeApiUrl;
                  link.download = `qrcode-${branding.logoText || "lumina"}.png`;
                  link.target = "_blank";
                  link.click();
                }}
                className="flex-1 py-2.5 rounded-full bg-stone-900 hover:bg-stone-800 text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer"
              >
                <Download className="w-3.5 h-3.5 text-amber-400" />
                <span>Baixar PNG</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
