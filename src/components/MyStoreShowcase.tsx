import React, { useState } from "react";
import {
  Globe,
  Eye,
  MessageCircle,
  Copy,
  Check,
  Instagram,
  Sparkles,
  ShoppingBag,
  ExternalLink,
  QrCode,
  Share2,
  CheckCircle2,
  Heart,
  Store,
  ShieldCheck,
  Smartphone,
  ChevronRight,
  ArrowUpRight,
  Award,
  Zap,
} from "lucide-react";
import { TenantStore, ProductItem, StoreBrandingConfig } from "../types";
import { StorefrontService } from "../modules/storefront/storefrontService";

interface MyStoreShowcaseProps {
  tenant: TenantStore;
  branding: StoreBrandingConfig;
  products: ProductItem[];
  onOpenStorefront: () => void;
  onNavigateTab: (tab: string) => void;
  onOpenShareModal: () => void;
  onUpdateInstagram?: (newHandle: string) => void;
}

export const MyStoreShowcase: React.FC<MyStoreShowcaseProps> = ({
  tenant,
  branding,
  products,
  onOpenStorefront,
  onNavigateTab,
  onOpenShareModal,
  onUpdateInstagram,
}) => {
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedBio, setCopiedBio] = useState(false);
  const [instagramHandle, setInstagramHandle] = useState(
    branding?.instagramHandle || "@minhaloja"
  );
  const [isEditingInstagram, setIsEditingInstagram] = useState(false);
  const [instagramSaved, setInstagramSaved] = useState(false);
  const [showQrModal, setShowQrModal] = useState(false);

  const storeName = branding?.logoText || tenant?.name || "Minha Loja";
  const slogan = branding?.logoSubtext || "Semijoias que encantam";
  const primaryColor = branding?.primaryColor || "#B45309";
  const secondaryColor = branding?.secondaryColor || "#1C1917";

  const publicStoreUrl = StorefrontService.getPublicStoreUrl(tenant?.slug || "lumina");
  const activeProductsCount = products.filter(
    (p) => (p.stockPhysical > 0 || (p.availableStock ?? 1) > 0) && p.status !== "INATIVO"
  ).length;

  const handleCopyLink = async () => {
    const success = await StorefrontService.copyCatalogLink(publicStoreUrl);
    if (success) {
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    }
  };

  const handleCopyBioText = async () => {
    const bioText = `✨ Peças exclusivas em Ouro 18K & Prata 925\n🛍️ Veja o catálogo completo e faça seu pedido:\n👉 ${publicStoreUrl}`;
    const success = await StorefrontService.copyCatalogLink(bioText);
    if (success) {
      setCopiedBio(true);
      setTimeout(() => setCopiedBio(false), 2500);
    }
  };

  const handleWhatsAppShare = () => {
    StorefrontService.shareOnWhatsApp(
      branding?.whatsappNumber || tenant?.phone || "",
      storeName,
      slogan,
      publicStoreUrl
    );
  };

  const handleSaveInstagram = () => {
    let clean = instagramHandle.trim();
    if (clean && !clean.startsWith("@")) {
      clean = `@${clean}`;
    }
    setInstagramHandle(clean);
    setIsEditingInstagram(false);
    setInstagramSaved(true);
    setTimeout(() => setInstagramSaved(false), 2500);
    if (onUpdateInstagram) {
      onUpdateInstagram(clean);
    }
    try {
      localStorage.setItem("lumina_store_instagram", clean);
    } catch (e) {}
  };

  return (
    <div className="space-y-8 animate-fadeIn max-w-4xl mx-auto pb-16">
      {/* ========================================================================= */}
      {/* HEADER: A CELEBRAÇÃO DO MOMENTO "MINHA LOJA ESTÁ PRONTA!"                 */}
      {/* ========================================================================= */}
      <div className="bg-gradient-to-br from-amber-50 via-white to-stone-50 border border-amber-200/80 rounded-3xl p-6 sm:p-8 shadow-xs relative overflow-hidden">
        {/* Glow ambient background element */}
        <div
          className="absolute -top-12 -right-12 w-48 h-48 rounded-full blur-3xl opacity-20 pointer-events-none"
          style={{ backgroundColor: primaryColor }}
        />

        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-100/90 text-emerald-900 border border-emerald-300/80 text-[11px] font-bold tracking-wide shadow-2xs">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
              <span>LOJA ONLINE PUBLICADA E PRONTA</span>
            </div>

            <div className="flex items-center gap-3 pt-1">
              <div
                className="w-11 h-11 rounded-2xl flex items-center justify-center text-white shadow-sm"
                style={{ backgroundColor: secondaryColor }}
              >
                <Globe className="w-6 h-6 text-amber-300" />
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-serif italic font-extrabold text-stone-900 tracking-tight flex items-center gap-2.5">
                  <span>Minha Loja</span>
                  <span className="text-amber-500 font-sans not-italic text-xl">✨</span>
                </h1>
                <p className="text-stone-600 text-sm font-medium">
                  Sua loja está pronta! <span className="font-bold text-stone-900">🎉</span>
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 self-stretch sm:self-auto">
            <button
              onClick={onOpenStorefront}
              className="flex-1 sm:flex-none px-5 py-3 rounded-2xl font-bold text-xs uppercase tracking-wider text-stone-950 shadow-md transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer flex items-center justify-center gap-2"
              style={{ backgroundColor: primaryColor }}
            >
              <Eye className="w-4 h-4" />
              <span>Ver Minha Loja</span>
            </button>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* O CARD VITRINE / BANNER DE IMPACTO VISUAL (A "FOTO / BANNER")            */}
      {/* ========================================================================= */}
      <div className="bg-white rounded-3xl border-2 border-stone-200/90 overflow-hidden shadow-sm transition-all hover:shadow-md">
        {/* Banner Fotográfico da Marca */}
        <div className="relative h-48 sm:h-64 bg-stone-950 overflow-hidden flex items-center justify-center">
          {branding?.bannerUrl ? (
            <img
              src={branding.bannerUrl}
              alt={storeName}
              className="w-full h-full object-cover opacity-85"
            />
          ) : (
            <img
              src="https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?auto=format&fit=crop&w=1200&q=80"
              alt="Banner Semijoias"
              className="w-full h-full object-cover opacity-80"
            />
          )}

          {/* Luxury Overlay Gradient */}
          <div className="absolute inset-0 bg-gradient-to-t from-stone-950 via-stone-950/50 to-transparent" />

          {/* Badges de Status no Banner */}
          <div className="absolute top-4 left-4 right-4 flex items-center justify-between">
            <span className="px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-black/60 backdrop-blur-md text-amber-300 border border-white/10 flex items-center gap-1.5 shadow-sm">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              <span>Vitrine Oficial 18K</span>
            </span>

            <span className="px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-white/90 backdrop-blur-md text-stone-900 shadow-sm">
              {activeProductsCount} peças no catálogo
            </span>
          </div>

          {/* Brand Center / Identity inside Banner */}
          <div className="absolute bottom-6 left-6 right-6 flex flex-col sm:flex-row items-start sm:items-end justify-between gap-4">
            <div className="flex items-center gap-4">
              {branding?.logoType === "IMAGE" && branding.logoUrl ? (
                <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-stone-900 border-2 border-white/20 p-2 flex items-center justify-center shadow-xl backdrop-blur-md shrink-0">
                  <img
                    src={branding.logoUrl}
                    alt={storeName}
                    className="max-h-full max-w-full object-contain"
                  />
                </div>
              ) : (
                <div
                  className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl border-2 border-white/30 flex items-center justify-center text-stone-950 font-serif font-extrabold text-2xl shadow-xl shrink-0"
                  style={{ backgroundColor: primaryColor }}
                >
                  💎
                </div>
              )}

              <div className="text-white space-y-0.5 drop-shadow-md">
                <h2 className="text-2xl sm:text-3xl font-serif italic font-bold tracking-tight leading-tight">
                  {storeName}
                </h2>
                <p className="text-amber-200 text-xs sm:text-sm font-medium tracking-wide">
                  {slogan}
                </p>
                <div className="flex items-center gap-2 pt-1">
                  <span className="text-[10px] font-bold tracking-wider uppercase text-stone-300 flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
                    Banho Antialérgico & Garantia 12 Meses
                  </span>
                </div>
              </div>
            </div>

            <div className="hidden sm:block">
              <div className="bg-white/10 backdrop-blur-md border border-white/20 px-3.5 py-1.5 rounded-xl text-right">
                <span className="text-[10px] uppercase font-bold text-stone-300 block">Link Direto</span>
                <span className="text-xs font-mono text-white font-semibold">
                  loja.aura.app/{tenant?.slug || "lumina"}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* OS 3 BOTÕES DE AÇÃO IMEDIATA (VER LOJA, WHATSAPP, COPIAR LINK)            */}
        {/* ========================================================================= */}
        <div className="p-6 sm:p-8 bg-white space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
            {/* 1. [ 👁 Ver minha loja ] */}
            <button
              onClick={onOpenStorefront}
              className="w-full py-4 px-4 rounded-2xl font-bold text-xs uppercase tracking-wider text-stone-950 shadow-sm transition-all hover:scale-[1.01] active:scale-[0.99] cursor-pointer flex items-center justify-center gap-2.5 group"
              style={{ backgroundColor: primaryColor }}
            >
              <Eye className="w-4 h-4 group-hover:scale-110 transition-transform" />
              <span>Ver Minha Loja</span>
            </button>

            {/* 2. [ 📲 Compartilhar no WhatsApp ] */}
            <button
              onClick={handleWhatsAppShare}
              className="w-full py-4 px-4 rounded-2xl font-bold text-xs uppercase tracking-wider text-white shadow-sm transition-all hover:scale-[1.01] active:scale-[0.99] cursor-pointer flex items-center justify-center gap-2.5 group bg-[#25D366] hover:bg-[#20bd5a]"
            >
              <MessageCircle className="w-4 h-4 fill-white group-hover:scale-110 transition-transform" />
              <span>Compartilhar no WhatsApp</span>
            </button>

            {/* 3. [ 📋 Copiar link ] */}
            <button
              onClick={handleCopyLink}
              className={`w-full py-4 px-4 rounded-2xl font-bold text-xs uppercase tracking-wider transition-all hover:scale-[1.01] active:scale-[0.99] cursor-pointer flex items-center justify-center gap-2.5 border ${
                copiedLink
                  ? "bg-emerald-50 text-emerald-800 border-emerald-300"
                  : "bg-stone-50 hover:bg-stone-100 text-stone-800 border-stone-300"
              }`}
            >
              {copiedLink ? (
                <>
                  <Check className="w-4 h-4 text-emerald-600" />
                  <span>Link Copiado!</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4 text-stone-600" />
                  <span>Copiar Link</span>
                </>
              )}
            </button>
          </div>

          {/* ========================================================================= */}
          {/* INSTAGRAM DA LOJA: [ @minhaloja ]                                         */}
          {/* ========================================================================= */}
          <div className="pt-4 border-t border-stone-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-stone-50/70 p-4 rounded-2xl border">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500 via-rose-500 to-purple-600 flex items-center justify-center text-white shadow-xs shrink-0">
                <Instagram className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-stone-500 block">
                  Instagram da sua marca
                </span>
                {isEditingInstagram ? (
                  <div className="flex items-center gap-2 mt-1">
                    <input
                      type="text"
                      value={instagramHandle}
                      onChange={(e) => setInstagramHandle(e.target.value)}
                      placeholder="@sualoja"
                      className="bg-white border border-stone-300 rounded-xl px-3 py-1 text-xs font-bold text-stone-900 focus:outline-none focus:ring-2 focus:ring-stone-900 w-44"
                      autoFocus
                    />
                    <button
                      onClick={handleSaveInstagram}
                      className="px-3 py-1 bg-stone-900 text-amber-300 rounded-xl text-xs font-bold cursor-pointer hover:bg-stone-800"
                    >
                      Salvar
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-stone-900 font-mono">
                      {instagramHandle}
                    </span>
                    <button
                      onClick={() => setIsEditingInstagram(true)}
                      className="text-[11px] text-amber-800 hover:text-amber-950 font-bold underline cursor-pointer"
                    >
                      Alterar @
                    </button>
                    {instagramSaved && (
                      <span className="text-[10px] text-emerald-600 font-bold flex items-center gap-0.5">
                        <Check className="w-3 h-3" /> Salvo
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleCopyBioText}
                className="px-3.5 py-2 rounded-xl bg-white border border-stone-200 hover:bg-stone-100 text-stone-700 text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shadow-2xs"
                title="Copia texto ideal para a bio do seu Instagram"
              >
                {copiedBio ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Texto Copiado!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5 text-stone-500" />
                    <span>Copiar Texto da Bio</span>
                  </>
                )}
              </button>

              <button
                onClick={() => setShowQrModal(!showQrModal)}
                className="px-3.5 py-2 rounded-xl bg-stone-900 hover:bg-stone-800 text-amber-300 text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shadow-2xs"
                title="Ver QR Code do seu catálogo"
              >
                <QrCode className="w-3.5 h-3.5" />
                <span>QR Code</span>
              </button>
            </div>
          </div>

          {/* QR Code Quick Drawer */}
          {showQrModal && (
            <div className="p-5 rounded-2xl bg-amber-50/70 border border-amber-200 flex flex-col sm:flex-row items-center gap-5 animate-fadeIn">
              <div className="bg-white p-3 rounded-2xl border border-stone-200 shadow-sm shrink-0">
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=140x140&data=${encodeURIComponent(
                    publicStoreUrl
                  )}`}
                  alt="QR Code da Loja"
                  className="w-28 h-28"
                />
              </div>
              <div className="space-y-1 text-center sm:text-left">
                <h4 className="font-serif italic font-bold text-stone-900 text-base">
                  QR Code da sua Vitrine Online
                </h4>
                <p className="text-xs text-stone-600 max-w-md">
                  Aponte a câmera do celular para testar agora mesmo ou imprima para colocar nos seus cartões de visita e saquinhos de joias.
                </p>
                <div className="pt-2 flex items-center justify-center sm:justify-start gap-2">
                  <button
                    onClick={() => window.print()}
                    className="px-3 py-1.5 rounded-lg bg-stone-900 text-white text-[11px] font-bold cursor-pointer"
                  >
                    Imprimir QR Code
                  </button>
                  <button
                    onClick={() => setShowQrModal(false)}
                    className="px-3 py-1.5 rounded-lg border border-stone-300 text-stone-600 text-[11px] font-semibold cursor-pointer"
                  >
                    Fechar
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* SEÇÃO: COMO SUA CLIENTE COMPRA? (1, 2, 3)                                 */}
      {/* ========================================================================= */}
      <div className="bg-white rounded-3xl border border-stone-200/90 p-6 sm:p-8 space-y-6 shadow-2xs">
        <div className="flex items-center gap-3 pb-2 border-b border-stone-100">
          <div
            className="w-8 h-8 rounded-xl flex items-center justify-center text-stone-900 font-bold text-sm"
            style={{ backgroundColor: primaryColor }}
          >
            🛒
          </div>
          <div>
            <h3 className="font-serif italic font-bold text-lg text-stone-900">
              Como sua cliente compra?
            </h3>
            <p className="text-xs text-stone-500">
              O fluxo mais simples e vendedor do mercado de semijoias:
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Passo 1 */}
          <div className="p-5 rounded-2xl bg-stone-50/80 border border-stone-200/80 space-y-3 relative group hover:bg-white hover:border-amber-300 hover:shadow-sm transition-all">
            <div className="flex items-center justify-between">
              <span className="w-8 h-8 rounded-xl bg-stone-900 text-amber-300 font-extrabold text-sm flex items-center justify-center shadow-2xs">
                1
              </span>
              <span className="text-xl">💍</span>
            </div>
            <div>
              <h4 className="font-bold text-sm text-stone-900 mb-1">
                Escolhe a peça
              </h4>
              <p className="text-xs text-stone-600 leading-relaxed">
                Ela navega pelas fotos com zoom, confere o tipo de banho (Ouro 18K / Prata 925), valores e a garantia oficial.
              </p>
            </div>
          </div>

          {/* Passo 2 */}
          <div className="p-5 rounded-2xl bg-stone-50/80 border border-stone-200/80 space-y-3 relative group hover:bg-white hover:border-amber-300 hover:shadow-sm transition-all">
            <div className="flex items-center justify-between">
              <span className="w-8 h-8 rounded-xl bg-stone-900 text-amber-300 font-extrabold text-sm flex items-center justify-center shadow-2xs">
                2
              </span>
              <span className="text-xl">🛍️</span>
            </div>
            <div>
              <h4 className="font-bold text-sm text-stone-900 mb-1">
                Adiciona ao pedido
              </h4>
              <p className="text-xs text-stone-600 leading-relaxed">
                Coloca as semijoias desejadas na sacola com 1 clique, sem precisar preencher cadastros longos ou lembrar senhas.
              </p>
            </div>
          </div>

          {/* Passo 3 */}
          <div className="p-5 rounded-2xl bg-stone-50/80 border border-stone-200/80 space-y-3 relative group hover:bg-white hover:border-emerald-300 hover:shadow-sm transition-all">
            <div className="flex items-center justify-between">
              <span className="w-8 h-8 rounded-xl bg-emerald-600 text-white font-extrabold text-sm flex items-center justify-center shadow-2xs">
                3
              </span>
              <span className="text-xl">💬</span>
            </div>
            <div>
              <h4 className="font-bold text-sm text-stone-900 mb-1">
                Fala com você pelo WhatsApp
              </h4>
              <p className="text-xs text-stone-600 leading-relaxed">
                O pedido chega pronto no seu WhatsApp com a lista de peças, valores somados e chave PIX para fechar a venda na hora!
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* O MOMENTO "CARAMBA, EU TENHO UMA LOJA ONLINE" (PERCEPÇÃO DE VALOR)         */}
      {/* ========================================================================= */}
      <div className="rounded-3xl p-6 sm:p-8 border border-stone-800 text-white relative overflow-hidden shadow-lg" style={{ backgroundColor: secondaryColor }}>
        {/* Luxury subtle pattern */}
        <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none font-serif text-8xl italic">
          Lumina
        </div>

        <div className="relative z-10 space-y-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-amber-400/20 border border-amber-400/40 text-amber-300">
              <Sparkles className="w-5 h-5" />
            </div>
            <span className="text-xs font-bold uppercase tracking-widest text-amber-300">
              Momento de Percepção de Valor
            </span>
          </div>

          <h3 className="text-xl sm:text-2xl font-serif italic font-bold leading-tight">
            "Caramba, eu tenho uma loja online."
          </h3>

          <p className="text-stone-300 text-xs sm:text-sm max-w-2xl leading-relaxed">
            Esqueça PDFs pesados que ninguém abre ou prints perdidos na galeria. Sua cliente entra num link elegante e rápido, visualiza seu acervo e compra direto com você.
          </p>

          <div className="pt-2 flex flex-wrap gap-3">
            <button
              onClick={onOpenStorefront}
              className="px-5 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider text-stone-950 shadow-md transition-all hover:scale-[1.02] cursor-pointer flex items-center gap-2"
              style={{ backgroundColor: primaryColor }}
            >
              <Eye className="w-4 h-4" />
              <span>Experimentar a Loja como Cliente</span>
            </button>

            <button
              onClick={onOpenShareModal}
              className="px-5 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-white font-bold text-xs uppercase tracking-wider transition-all cursor-pointer flex items-center gap-2"
            >
              <Share2 className="w-4 h-4" />
              <span>Criar Cartão / Encarte de Divulgação</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
