import React, { useState } from "react";
import {
  Instagram,
  MessageCircle,
  Share2,
  QrCode,
  Download,
  Copy,
  Check,
  ExternalLink,
  Sparkles,
  Printer,
  Smartphone,
  Layers,
  Heart,
  Palette,
  Eye,
  Crown,
  ChevronRight,
  Tag,
  Link as LinkIcon,
  Sliders,
  Send,
  HelpCircle,
  ArrowUpRight,
  Gift,
} from "lucide-react";
import { StoreBrandingConfig, TenantStore } from "../types";
import confetti from "canvas-confetti";

interface SocialQRCodeCollageManagerProps {
  branding: StoreBrandingConfig;
  onUpdateBranding: (updated: StoreBrandingConfig) => void;
  tenant: TenantStore;
}

export const SocialQRCodeCollageManager: React.FC<SocialQRCodeCollageManagerProps> = ({
  branding,
  onUpdateBranding,
  tenant,
}) => {
  const [config, setConfig] = useState<StoreBrandingConfig>({ ...branding });
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [selectedFormat, setSelectedFormat] = useState<"STORY" | "TOTEM_COUNTER" | "PINTEREST_PIN" | "FLYER_PROMO">(
    branding.activeCollageFormat || "STORY"
  );
  const [selectedQrTarget, setSelectedQrTarget] = useState<"WHATSAPP" | "INSTAGRAM" | "PINTEREST" | "STOREFRONT">(
    branding.qrCodeTarget === "POSTER" ? "WHATSAPP" : branding.qrCodeTarget || "WHATSAPP"
  );
  const [qrColor, setQrColor] = useState<string>(branding.qrCodeColor || "#B88E3E");
  const [isSaved, setIsSaved] = useState(false);

  // Compute Destination URLs
  const cleanPhone = (config.contactWhatsapp || "+5519988421100").replace(/\D/g, "");
  const encodedMsg = encodeURIComponent(
    config.whatsappPrefilledMessage ||
      "Olá! Vi a coleção no Cartaz Editorial da Lumina e gostaria de atendimento VIP da consultora!"
  );
  const whatsappUrl = `https://wa.me/${cleanPhone}?text=${encodedMsg}`;

  const instagramUrl =
    config.instagramUrl ||
    (config.instagramHandle
      ? `https://instagram.com/${config.instagramHandle.replace("@", "")}`
      : "https://instagram.com/luminasemijoias");

  const pinterestUrl =
    config.pinterestBoardUrl ||
    `https://pinterest.com/${(config.pinterestHandle || "luminahautejoias").replace("@", "")}`;

  const storefrontUrl = window.location.origin;

  // Active target URL for QR Code
  const getActiveQrUrl = () => {
    switch (selectedQrTarget) {
      case "WHATSAPP":
        return whatsappUrl;
      case "INSTAGRAM":
        return instagramUrl;
      case "PINTEREST":
        return pinterestUrl;
      case "STOREFRONT":
        return storefrontUrl;
      default:
        return whatsappUrl;
    }
  };

  const currentQrUrl = getActiveQrUrl();

  // QR Code Image Generator via high-res API
  const qrCodeApiUrl = `https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${encodeURIComponent(
    currentQrUrl
  )}&color=${qrColor.replace("#", "")}&bgcolor=FFFFFF&margin=1`;

  const handleCopyText = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    confetti({
      particleCount: 25,
      spread: 50,
      origin: { y: 0.7 },
    });
    setTimeout(() => setCopiedKey(null), 2500);
  };

  const handleSaveSettings = () => {
    const updated = {
      ...config,
      qrCodeColor: qrColor,
      qrCodeTarget: selectedQrTarget,
      activeCollageFormat: selectedFormat,
    };
    onUpdateBranding(updated);
    setIsSaved(true);
    confetti({
      particleCount: 40,
      spread: 70,
      origin: { y: 0.6 },
    });
    setTimeout(() => setIsSaved(false), 3000);
  };

  const handlePrintCard = () => {
    window.print();
  };

  const handleDownloadQr = () => {
    const link = document.createElement("a");
    link.href = qrCodeApiUrl;
    link.download = `qrcode-${selectedQrTarget.toLowerCase()}-${config.logoText || "lumina"}.png`;
    link.target = "_blank";
    link.click();
  };

  return (
    <div className="space-y-8">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-stone-900 via-stone-850 to-stone-900 rounded-3xl p-6 sm:p-8 text-white border border-stone-700/60 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-400/20 text-amber-300 text-[11px] font-bold tracking-wider uppercase border border-amber-400/30">
              <QrCode className="w-3.5 h-3.5" />
              <span>Gerenciador de Redes Sociais, QR Codes & Cartões</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-serif italic font-bold text-stone-100">
              Vincule Instagram, WhatsApp e Pinterest à Landing Home
            </h2>
            <p className="text-xs sm:text-sm text-stone-300 font-light leading-relaxed">
              Gere automaticamente cartões editoriais de colagem geométrica de semijoias com QR Codes escaneáveis para stories do Instagram, displays de balcão de showroom, flyers de WhatsApp e boards de inspiração no Pinterest.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={handleSaveSettings}
              className="px-6 py-3 rounded-full bg-amber-400 hover:bg-amber-300 text-stone-950 font-bold text-xs uppercase tracking-wider transition-all shadow-lg flex items-center gap-2 cursor-pointer"
            >
              <Check className="w-4 h-4" />
              <span>Salvar & Sincronizar</span>
            </button>
          </div>
        </div>

        {isSaved && (
          <div className="mt-4 p-3 rounded-2xl bg-emerald-950/80 border border-emerald-500/50 text-emerald-300 text-xs font-semibold flex items-center gap-2 animate-in fade-in">
            <Check className="w-4 h-4 text-emerald-400" />
            <span>Configurações salvas e sincronizadas instantaneamente com a Landing Home e Cartaz Expo!</span>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* ========================================================================= */}
        {/* COLUNA ESQUERDA (5 COLUNAS): CONFIGURAÇÃO DOS CANAIS E QR CODE            */}
        {/* ========================================================================= */}
        <div className="lg:col-span-5 space-y-6">
          {/* 1. CANAIS SOCIAIS PRINCIPAIS (INSTAGRAM, WHATSAPP, PINTEREST) */}
          <div className="bg-white rounded-3xl border border-stone-200 p-6 space-y-5 shadow-xs">
            <div className="flex items-center justify-between pb-3 border-b border-stone-100">
              <div className="flex items-center gap-2">
                <Share2 className="w-4 h-4 text-amber-600" />
                <h3 className="font-serif italic font-bold text-base text-stone-900">
                  1. Canais Sociais Oficiais
                </h3>
              </div>
              <span className="text-[10px] font-bold uppercase text-stone-500 bg-stone-100 px-2.5 py-0.5 rounded-full">
                Sincronizado na Home
              </span>
            </div>

            {/* INSTAGRAM */}
            <div className="p-4 rounded-2xl bg-rose-50/50 border border-rose-100 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-rose-700">
                  <div className="w-7 h-7 rounded-xl bg-gradient-to-tr from-amber-500 via-rose-500 to-purple-600 text-white flex items-center justify-center shadow-xs">
                    <Instagram className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-xs font-bold block">Instagram Oficial</span>
                    <span className="text-[10px] text-stone-500">Perfil e Stories da Coleção</span>
                  </div>
                </div>
                <a
                  href={instagramUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs text-rose-600 hover:text-rose-800 font-bold flex items-center gap-0.5"
                >
                  <span>Testar</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>

              <div className="space-y-2">
                <label className="text-[11px] font-semibold text-stone-700 block">
                  Arroba (@) no Cartaz:
                </label>
                <input
                  type="text"
                  value={config.instagramHandle}
                  onChange={(e) => setConfig((prev) => ({ ...prev, instagramHandle: e.target.value }))}
                  placeholder="@luminasemijoias"
                  className="w-full bg-white border border-stone-300 rounded-xl px-3.5 py-2 text-xs font-mono font-bold text-stone-800 focus:outline-none focus:border-rose-500"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[11px] font-semibold text-stone-700 block">
                  URL Direta do Perfil / Linktree:
                </label>
                <input
                  type="text"
                  value={config.instagramUrl || "https://instagram.com/luminasemijoias"}
                  onChange={(e) => setConfig((prev) => ({ ...prev, instagramUrl: e.target.value }))}
                  placeholder="https://instagram.com/luminasemijoias"
                  className="w-full bg-white border border-stone-300 rounded-xl px-3.5 py-2 text-xs font-mono text-stone-700 focus:outline-none focus:border-rose-500"
                />
              </div>
            </div>

            {/* WHATSAPP VIP */}
            <div className="p-4 rounded-2xl bg-emerald-50/50 border border-emerald-100 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-emerald-800">
                  <div className="w-7 h-7 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-xs">
                    <MessageCircle className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-xs font-bold block">WhatsApp de Atendimento VIP</span>
                    <span className="text-[10px] text-stone-500">Link direto wa.me com mensagem</span>
                  </div>
                </div>
                <a
                  href={whatsappUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs text-emerald-700 hover:text-emerald-900 font-bold flex items-center gap-0.5"
                >
                  <span>Abrir Chat</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>

              <div className="space-y-2">
                <label className="text-[11px] font-semibold text-stone-700 block">
                  Número de Telefone / WhatsApp:
                </label>
                <input
                  type="text"
                  value={config.contactWhatsapp}
                  onChange={(e) => setConfig((prev) => ({ ...prev, contactWhatsapp: e.target.value }))}
                  placeholder="+55 (19) 98842-1100"
                  className="w-full bg-white border border-stone-300 rounded-xl px-3.5 py-2 text-xs font-mono font-bold text-stone-800 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[11px] font-semibold text-stone-700 block">
                  Mensagem Automática Inicial Pré-preenchida:
                </label>
                <textarea
                  rows={2}
                  value={config.whatsappPrefilledMessage || ""}
                  onChange={(e) => setConfig((prev) => ({ ...prev, whatsappPrefilledMessage: e.target.value }))}
                  placeholder="Olá! Vi o Cartaz Editorial da Lumina e gostaria de atendimento VIP!"
                  className="w-full bg-white border border-stone-300 rounded-xl p-3 text-xs text-stone-800 focus:outline-none focus:border-emerald-500 leading-relaxed"
                />
              </div>
            </div>

            {/* PINTEREST */}
            <div className="p-4 rounded-2xl bg-red-50/50 border border-red-100 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-red-800">
                  <div className="w-7 h-7 rounded-xl bg-red-600 text-white flex items-center justify-center shadow-xs font-bold font-serif">
                    P
                  </div>
                  <div>
                    <span className="text-xs font-bold block">Pinterest Editorial & Noivas</span>
                    <span className="text-[10px] text-stone-500">Pastas de inspiração e lookbook</span>
                  </div>
                </div>
                <a
                  href={pinterestUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs text-red-700 hover:text-red-900 font-bold flex items-center gap-0.5"
                >
                  <span>Ver Board</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>

              <div className="space-y-2">
                <label className="text-[11px] font-semibold text-stone-700 block">
                  Perfil / Handle do Pinterest:
                </label>
                <input
                  type="text"
                  value={config.pinterestHandle}
                  onChange={(e) => setConfig((prev) => ({ ...prev, pinterestHandle: e.target.value }))}
                  placeholder="@luminahautejoias"
                  className="w-full bg-white border border-stone-300 rounded-xl px-3.5 py-2 text-xs font-mono font-bold text-stone-800 focus:outline-none focus:border-red-500"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[11px] font-semibold text-stone-700 block">
                  Link do Board de Noivas / Catálogo:
                </label>
                <input
                  type="text"
                  value={config.pinterestBoardUrl || "https://pinterest.com/luminahautejoias/colecao-noivas-e-gala"}
                  onChange={(e) => setConfig((prev) => ({ ...prev, pinterestBoardUrl: e.target.value }))}
                  placeholder="https://pinterest.com/luminahautejoias/colecao-noivas"
                  className="w-full bg-white border border-stone-300 rounded-xl px-3.5 py-2 text-xs font-mono text-stone-700 focus:outline-none focus:border-red-500"
                />
              </div>
            </div>
          </div>

          {/* 2. CONFIGURADOR DO QR CODE */}
          <div className="bg-white rounded-3xl border border-stone-200 p-6 space-y-5 shadow-xs">
            <div className="flex items-center justify-between pb-3 border-b border-stone-100">
              <div className="flex items-center gap-2">
                <QrCode className="w-4 h-4 text-amber-600" />
                <h3 className="font-serif italic font-bold text-base text-stone-900">
                  2. Destino & Cores do QR Code
                </h3>
              </div>
              <span className="text-[10px] font-bold uppercase text-amber-700 bg-amber-100 px-2.5 py-0.5 rounded-full">
                Alta Resolução
              </span>
            </div>

            {/* Target Selector */}
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-stone-600 block">
                Ao escanear a câmera, abrir:
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedQrTarget("WHATSAPP")}
                  className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                    selectedQrTarget === "WHATSAPP"
                      ? "bg-emerald-50 border-emerald-500 text-emerald-950 shadow-xs font-bold"
                      : "bg-stone-50 border-stone-200 text-stone-700 hover:bg-stone-100"
                  }`}
                >
                  <div className="flex items-center gap-1.5 text-xs">
                    <MessageCircle className="w-3.5 h-3.5 text-emerald-600" />
                    <span>WhatsApp VIP</span>
                  </div>
                  <p className="text-[10px] text-stone-500 mt-1">Abre conversa direta com mensagem</p>
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedQrTarget("INSTAGRAM")}
                  className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                    selectedQrTarget === "INSTAGRAM"
                      ? "bg-rose-50 border-rose-500 text-rose-950 shadow-xs font-bold"
                      : "bg-stone-50 border-stone-200 text-stone-700 hover:bg-stone-100"
                  }`}
                >
                  <div className="flex items-center gap-1.5 text-xs">
                    <Instagram className="w-3.5 h-3.5 text-rose-600" />
                    <span>Instagram</span>
                  </div>
                  <p className="text-[10px] text-stone-500 mt-1">Abre o perfil @luminasemijoias</p>
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedQrTarget("PINTEREST")}
                  className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                    selectedQrTarget === "PINTEREST"
                      ? "bg-red-50 border-red-500 text-red-950 shadow-xs font-bold"
                      : "bg-stone-50 border-stone-200 text-stone-700 hover:bg-stone-100"
                  }`}
                >
                  <div className="flex items-center gap-1.5 text-xs">
                    <span className="font-bold text-red-600">P</span>
                    <span>Pinterest Board</span>
                  </div>
                  <p className="text-[10px] text-stone-500 mt-1">Abre pastas de lookbook de noivas</p>
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedQrTarget("STOREFRONT")}
                  className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                    selectedQrTarget === "STOREFRONT"
                      ? "bg-amber-50 border-amber-500 text-amber-950 shadow-xs font-bold"
                      : "bg-stone-50 border-stone-200 text-stone-700 hover:bg-stone-100"
                  }`}
                >
                  <div className="flex items-center gap-1.5 text-xs">
                    <Crown className="w-3.5 h-3.5 text-amber-600" />
                    <span>Loja Virtual</span>
                  </div>
                  <p className="text-[10px] text-stone-500 mt-1">Abre a vitrine com cupom da mostra</p>
                </button>
              </div>
            </div>

            {/* QR Color Palette */}
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-stone-600 block">
                Cor Nobre do QR Code:
              </label>
              <div className="flex items-center gap-2">
                {[
                  { name: "Ouro 18K", color: "#B88E3E" },
                  { name: "Ouro Champagne", color: "#C59B4B" },
                  { name: "Preto Ônix", color: "#18181B" },
                  { name: "Esmeralda", color: "#065F46" },
                  { name: "Bordeaux", color: "#881337" },
                ].map((item) => (
                  <button
                    key={item.color}
                    type="button"
                    onClick={() => setQrColor(item.color)}
                    className={`w-9 h-9 rounded-xl border-2 flex items-center justify-center transition-all cursor-pointer ${
                      qrColor === item.color ? "scale-110 border-stone-900 shadow-md" : "border-white"
                    }`}
                    style={{ backgroundColor: item.color }}
                    title={item.name}
                  >
                    {qrColor === item.color && <Check className="w-4 h-4 text-white" />}
                  </button>
                ))}
              </div>
            </div>

            {/* Quick Actions for QR Code */}
            <div className="pt-3 border-t border-stone-100 flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => handleCopyText(currentQrUrl, "qr_link")}
                className="px-3.5 py-2 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-800 text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
              >
                {copiedKey === "qr_link" ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedKey === "qr_link" ? "Link Copiado!" : "Copiar Link do QR"}</span>
              </button>

              <button
                type="button"
                onClick={handleDownloadQr}
                className="px-3.5 py-2 rounded-xl bg-stone-900 hover:bg-stone-800 text-white text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <Download className="w-3.5 h-3.5 text-amber-400" />
                <span>Baixar Imagem QR (PNG)</span>
              </button>
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* COLUNA DIREITA (7 COLUNAS): GERADOR AUTOMÁTICO DE CARTÕES DE COLAGEM      */}
        {/* ========================================================================= */}
        <div className="lg:col-span-7 space-y-6">
          <div className="bg-white rounded-3xl border border-stone-200 p-6 sm:p-8 space-y-6 shadow-xs">
            <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-stone-100">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-amber-600" />
                <div>
                  <h3 className="font-serif italic font-bold text-lg text-stone-900">
                    Cartões Editoriais de Colagem Prontos para Uso
                  </h3>
                  <p className="text-[11px] text-stone-500">
                    Gerados automaticamente com as fotos geométricas e dados de redes sociais
                  </p>
                </div>
              </div>

              {/* Format Switcher Pills */}
              <div className="flex flex-wrap items-center gap-1.5 bg-stone-100 p-1 rounded-2xl">
                <button
                  type="button"
                  onClick={() => setSelectedFormat("STORY")}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    selectedFormat === "STORY"
                      ? "bg-white text-stone-950 shadow-xs"
                      : "text-stone-600 hover:text-stone-900"
                  }`}
                >
                  📱 Story (9:16)
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedFormat("TOTEM_COUNTER")}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    selectedFormat === "TOTEM_COUNTER"
                      ? "bg-white text-stone-950 shadow-xs"
                      : "text-stone-600 hover:text-stone-900"
                  }`}
                >
                  🏛️ Display Balcão
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedFormat("PINTEREST_PIN")}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    selectedFormat === "PINTEREST_PIN"
                      ? "bg-white text-stone-950 shadow-xs"
                      : "text-stone-600 hover:text-stone-900"
                  }`}
                >
                  📌 Pin (2:3)
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedFormat("FLYER_PROMO")}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    selectedFormat === "FLYER_PROMO"
                      ? "bg-white text-stone-950 shadow-xs"
                      : "text-stone-600 hover:text-stone-900"
                  }`}
                >
                  💬 Flyer WhatsApp
                </button>
              </div>
            </div>

            {/* LIVE EDITORIAL COLLAGE CARD PREVIEW */}
            <div className="flex justify-center p-4 sm:p-6 bg-stone-900 rounded-3xl border border-stone-800 shadow-inner overflow-hidden">
              {/* ------------------------------------------------------------- */}
              {/* FORMAT 1: INSTAGRAM STORIES / REELS CARD (9:16)               */}
              {/* ------------------------------------------------------------- */}
              {selectedFormat === "STORY" && (
                <div
                  id="printable-story-card"
                  className="w-full max-w-sm aspect-[9/16] bg-[#F7F4EC] text-stone-900 rounded-3xl p-6 shadow-2xl flex flex-col justify-between relative overflow-hidden border border-amber-300/40 select-none animate-in zoom-in-95"
                >
                  {/* Top Header */}
                  <div className="flex items-center justify-between z-10">
                    <div className="flex items-center gap-1.5">
                      <Heart className="w-5 h-5 fill-amber-600 text-amber-600" />
                      <span className="font-serif italic font-bold text-lg tracking-wide text-stone-900">
                        {config.logoText || "Lumina"}
                      </span>
                    </div>
                    <span className="text-[9px] font-mono font-bold uppercase tracking-widest bg-stone-900 text-amber-300 px-2.5 py-0.5 rounded-full">
                      {config.posterPromoCode || "EXPO2026"}
                    </span>
                  </div>

                  {/* Collage Diamond Pictures in mini scale */}
                  <div className="relative w-full h-44 my-auto overflow-hidden rounded-2xl bg-stone-950 shadow-md">
                    {/* Diamond 1 */}
                    <div
                      className="absolute -top-2 -left-2 w-28 h-28 overflow-hidden border-2 border-white"
                      style={{ clipPath: "polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)" }}
                    >
                      <img
                        src="https://images.unsplash.com/photo-1519741497674-611481863552?w=500&auto=format&fit=crop&q=80"
                        alt="Bouquet"
                        className="w-full h-full object-cover"
                      />
                    </div>
                    {/* Diamond Center Hero Ring */}
                    <div
                      className="absolute top-4 left-1/4 w-36 h-36 overflow-hidden border-2 border-white z-10"
                      style={{ clipPath: "polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)" }}
                    >
                      <img
                        src="https://images.unsplash.com/photo-1515934751635-c81c6bc9a2d8?w=500&auto=format&fit=crop&q=80"
                        alt="Diamond Ring"
                        className="w-full h-full object-cover"
                      />
                    </div>
                    {/* Diamond 3 */}
                    <div
                      className="absolute -bottom-2 -right-2 w-28 h-28 overflow-hidden border-2 border-white"
                      style={{ clipPath: "polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)" }}
                    >
                      <img
                        src="https://images.unsplash.com/photo-1594552072238-b8a33785b261?w=500&auto=format&fit=crop&q=80"
                        alt="Bride with Riviera"
                        className="w-full h-full object-cover"
                      />
                    </div>
                  </div>

                  {/* Editorial Headline */}
                  <div className="text-center space-y-1 z-10">
                    <h4 className="text-xl font-sans font-black uppercase tracking-tight text-stone-900 leading-none">
                      {config.posterTitle || "EXPO SEMIJOIAS 2026"}
                    </h4>
                    <div
                      className="py-1 px-3 rounded-md text-white font-bold text-[11px] uppercase tracking-wider mx-auto"
                      style={{ backgroundColor: qrColor }}
                    >
                      {config.posterBadgeDate || "LANÇAMENTO VIP • ATÉ 25% OFF"}
                    </div>
                  </div>

                  {/* QR Code Center Box */}
                  <div className="bg-white/95 backdrop-blur-md rounded-2xl p-3.5 border border-stone-300 shadow-md flex items-center gap-3 z-10">
                    <img
                      src={qrCodeApiUrl}
                      alt="QR Code"
                      className="w-20 h-20 rounded-xl object-contain border border-stone-200 shrink-0"
                    />
                    <div className="space-y-1 text-left">
                      <span className="text-[9px] font-bold uppercase tracking-wider text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full inline-block">
                        Aponte a Câmera
                      </span>
                      <p className="text-xs font-extrabold text-stone-900 leading-tight">
                        {selectedQrTarget === "WHATSAPP"
                          ? "Atendimento VIP WhatsApp"
                          : selectedQrTarget === "INSTAGRAM"
                          ? "Siga no Instagram"
                          : selectedQrTarget === "PINTEREST"
                          ? "Inspirações Pinterest"
                          : "Entrar na Vitrine Online"}
                      </p>
                      <p className="text-[10px] text-stone-500 line-clamp-1 font-mono">
                        Cupom: {config.posterPromoCode || "EXPO2026"} ({config.posterPromoDiscount || "20% OFF"})
                      </p>
                    </div>
                  </div>

                  {/* Social Handles Strip */}
                  <div className="pt-2 border-t border-stone-300/80 flex items-center justify-between text-[10px] font-semibold text-stone-700 z-10">
                    <span className="flex items-center gap-1">
                      <Instagram className="w-3.5 h-3.5 text-rose-600" />
                      <span>{config.instagramHandle}</span>
                    </span>
                    <span className="flex items-center gap-1">
                      <MessageCircle className="w-3.5 h-3.5 text-emerald-600" />
                      <span>{config.contactWhatsapp}</span>
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="w-3.5 h-3.5 rounded-full bg-red-600 text-white flex items-center justify-center text-[8px] font-bold">
                        P
                      </span>
                      <span>{config.pinterestHandle}</span>
                    </span>
                  </div>
                </div>
              )}

              {/* ------------------------------------------------------------- */}
              {/* FORMAT 2: DISPLAY DE MESA / TOTEM DE BALCÃO (A5 SHOWROOM)     */}
              {/* ------------------------------------------------------------- */}
              {selectedFormat === "TOTEM_COUNTER" && (
                <div
                  id="printable-totem-card"
                  className="w-full max-w-md bg-white text-stone-900 rounded-3xl p-8 shadow-2xl flex flex-col items-center text-center space-y-5 border-4 border-amber-400/40 select-none animate-in zoom-in-95"
                >
                  <div className="space-y-1">
                    <div className="inline-flex items-center gap-1 text-amber-700 text-xs font-bold uppercase tracking-widest">
                      <Crown className="w-4 h-4" />
                      <span>{config.logoSubtext || "Alta Semijoias"}</span>
                    </div>
                    <h3 className="text-3xl font-serif italic font-bold text-stone-900">
                      {config.logoText || "Lumina"}
                    </h3>
                  </div>

                  <div className="relative p-3 bg-stone-50 rounded-2xl border-2 border-dashed border-amber-400/60 shadow-inner">
                    <img
                      src={qrCodeApiUrl}
                      alt="QR Code Totem"
                      className="w-44 h-44 rounded-xl object-contain"
                    />
                    <div
                      className="absolute -bottom-3 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full text-white text-[10px] font-bold uppercase tracking-wider shadow-md whitespace-nowrap"
                      style={{ backgroundColor: qrColor }}
                    >
                      Aponte a Câmera do Celular
                    </div>
                  </div>

                  <div className="space-y-1 pt-2">
                    <p className="text-sm font-extrabold text-stone-900 uppercase tracking-wide">
                      {config.posterTitle || "EXPO SEMIJOIAS & NOIVAS"}
                    </p>
                    <p className="text-xs text-stone-600 max-w-xs">
                      Acesse nosso catálogo VIP, garantia digital QR e solicite atendimento personalizado com a consultora.
                    </p>
                  </div>

                  {/* 3 Icons Bar */}
                  <div className="w-full pt-4 border-t border-stone-200 grid grid-cols-3 gap-2 text-xs font-bold text-stone-800">
                    <div className="flex flex-col items-center gap-1 p-2 rounded-xl bg-stone-50">
                      <Instagram className="w-4 h-4 text-rose-600" />
                      <span className="text-[10px] font-mono">{config.instagramHandle}</span>
                    </div>
                    <div className="flex flex-col items-center gap-1 p-2 rounded-xl bg-stone-50">
                      <MessageCircle className="w-4 h-4 text-emerald-600" />
                      <span className="text-[10px] font-mono">{config.contactWhatsapp}</span>
                    </div>
                    <div className="flex flex-col items-center gap-1 p-2 rounded-xl bg-stone-50">
                      <span className="w-4 h-4 rounded-full bg-red-600 text-white flex items-center justify-center text-[9px]">
                        P
                      </span>
                      <span className="text-[10px] font-mono">{config.pinterestHandle}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* ------------------------------------------------------------- */}
              {/* FORMAT 3: PINTEREST EDITORIAL PIN (2:3)                        */}
              {/* ------------------------------------------------------------- */}
              {selectedFormat === "PINTEREST_PIN" && (
                <div
                  id="printable-pinterest-pin"
                  className="w-full max-w-sm aspect-[2/3] bg-[#18181B] text-white rounded-3xl p-6 shadow-2xl flex flex-col justify-between border border-stone-700 select-none animate-in zoom-in-95 relative overflow-hidden"
                >
                  <div className="flex items-center justify-between z-10">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-amber-400">
                      Pinterest Inspiration Board
                    </span>
                    <span className="w-6 h-6 rounded-full bg-red-600 text-white flex items-center justify-center text-xs font-bold">
                      P
                    </span>
                  </div>

                  {/* Collage Grid */}
                  <div className="grid grid-cols-2 gap-2 my-auto z-10">
                    <div className="aspect-square rounded-2xl overflow-hidden border border-stone-700">
                      <img
                        src="https://images.unsplash.com/photo-1515934751635-c81c6bc9a2d8?w=500&auto=format&fit=crop&q=80"
                        alt="Solitaire Ring"
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="aspect-square rounded-2xl overflow-hidden border border-stone-700">
                      <img
                        src="https://images.unsplash.com/photo-1594552072238-b8a33785b261?w=500&auto=format&fit=crop&q=80"
                        alt="Bridal Riviera"
                        className="w-full h-full object-cover"
                      />
                    </div>
                  </div>

                  <div className="space-y-3 z-10 text-center">
                    <h4 className="text-2xl font-serif italic text-amber-200">
                      {config.logoText || "Lumina"} Joias de Noiva
                    </h4>
                    <p className="text-xs text-stone-300 font-light">
                      Coleção Banhada a 10 Milésimos Ouro 18K • Salve este Pin
                    </p>

                    <div className="bg-stone-900/90 p-3 rounded-2xl border border-stone-800 flex items-center gap-3">
                      <img src={qrCodeApiUrl} alt="QR" className="w-14 h-14 rounded-lg bg-white p-1" />
                      <div className="text-left text-xs">
                        <p className="font-bold text-white">Escaneie para Ver Catálogo</p>
                        <p className="text-[10px] text-amber-400 font-mono">{config.websiteUrl || "www.luminasemijoias.com.br"}</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* ------------------------------------------------------------- */}
              {/* FORMAT 4: FLYER PROMOCIONAL PARA WHATSAPP / TELEGRAM          */}
              {/* ------------------------------------------------------------- */}
              {selectedFormat === "FLYER_PROMO" && (
                <div
                  id="printable-flyer-card"
                  className="w-full max-w-md bg-gradient-to-b from-[#FAF8F5] to-[#F1ECE1] text-stone-900 rounded-3xl p-6 sm:p-7 shadow-2xl flex flex-col justify-between border border-amber-300 select-none animate-in zoom-in-95 space-y-4"
                >
                  <div className="flex items-center justify-between pb-3 border-b border-stone-300">
                    <div className="text-left">
                      <span className="text-[10px] font-bold tracking-widest text-amber-700 uppercase block">
                        Campanha Oficial
                      </span>
                      <h4 className="font-serif italic font-bold text-2xl text-stone-900">
                        {config.logoText || "Lumina"} Haute Joaillerie
                      </h4>
                    </div>
                    <div className="w-10 h-10 rounded-2xl bg-amber-400 text-stone-950 flex items-center justify-center font-bold">
                      <Gift className="w-5 h-5" />
                    </div>
                  </div>

                  <div className="bg-stone-900 text-white p-4 rounded-2xl space-y-2 text-center">
                    <span className="text-xs font-bold text-amber-400 tracking-wider uppercase block">
                      {config.posterBadgeDate || "EXPO 2026 • CONVITE VIP"}
                    </span>
                    <h5 className="text-xl font-bold uppercase">
                      {config.posterTitle || "EXPO SEMIJOIAS & NOIVAS"}
                    </h5>
                    <div className="inline-flex items-center gap-2 bg-stone-800 px-3 py-1 rounded-xl text-amber-300 text-xs font-mono font-bold border border-amber-400/40">
                      <Tag className="w-3.5 h-3.5" />
                      <span>CUPOM: {config.posterPromoCode || "EXPO2026"} ({config.posterPromoDiscount || "20% OFF"})</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-4 p-3 bg-white rounded-2xl border border-stone-200">
                    <img src={qrCodeApiUrl} alt="QR" className="w-20 h-20 rounded-xl" />
                    <div className="text-left text-xs space-y-1">
                      <p className="font-bold text-stone-900">Atendimento VIP no WhatsApp</p>
                      <p className="text-[11px] text-stone-600 leading-tight">
                        Chame a consultora e garanta frete cortesia na primeira compra.
                      </p>
                      <a
                        href={whatsappUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 hover:text-emerald-900"
                      >
                        <span>Conversar Agora</span>
                        <ArrowUpRight className="w-3 h-3" />
                      </a>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-center text-[10px] font-semibold text-stone-700 pt-2 border-t border-stone-300">
                    <div>📸 {config.instagramHandle}</div>
                    <div>💬 {config.contactWhatsapp}</div>
                    <div>📌 {config.pinterestHandle}</div>
                  </div>
                </div>
              )}
            </div>

            {/* ACTION BUTTONS FOR THE EDITORIAL COLLAGE CARD */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleDownloadQr}
                  className="px-4 py-2.5 rounded-full bg-stone-900 hover:bg-stone-800 text-white text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5 text-amber-400" />
                  <span>Baixar QR Code PNG</span>
                </button>

                <button
                  type="button"
                  onClick={handlePrintCard}
                  className="px-4 py-2.5 rounded-full bg-stone-100 hover:bg-stone-200 text-stone-800 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5 text-stone-600" />
                  <span>Imprimir Cartão / Totem</span>
                </button>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleCopyText(whatsappUrl, "share_wa")}
                  className="px-4 py-2.5 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm cursor-pointer"
                >
                  {copiedKey === "share_wa" ? <Check className="w-3.5 h-3.5" /> : <MessageCircle className="w-3.5 h-3.5" />}
                  <span>{copiedKey === "share_wa" ? "Link WhatsApp Copiado!" : "Copiar Link WhatsApp"}</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleCopyText(instagramUrl, "share_ig")}
                  className="px-4 py-2.5 rounded-full bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm cursor-pointer"
                >
                  {copiedKey === "share_ig" ? <Check className="w-3.5 h-3.5" /> : <Instagram className="w-3.5 h-3.5" />}
                  <span>{copiedKey === "share_ig" ? "Link Instagram Copiado!" : "Copiar Link IG"}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
