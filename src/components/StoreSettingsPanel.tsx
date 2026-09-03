import React, { useState, useEffect } from "react";
import {
  Sliders,
  Palette,
  Type,
  Image as ImageIcon,
  Sparkles,
  Save,
  RotateCcw,
  Eye,
  Check,
  Crown,
  Smartphone,
  Mail,
  Instagram,
  Facebook,
  ShieldCheck,
  Tag,
  ShoppingBag,
  ArrowRight,
  ExternalLink,
  Layers,
  Sparkle,
  Globe,
  Lock,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Server,
  Radio,
  Copy,
  Shield,
  CreditCard,
} from "lucide-react";
import { StoreBrandingConfig, TenantStore, OrganizationPaymentSettings } from "../types";
import { DEFAULT_BRANDING_CONFIG, DEFAULT_PAYMENT_SETTINGS } from "../data/mockData";
import { SocialQRCodeCollageManager } from "./SocialQRCodeCollageManager";
import { CustomDomainSSLManager } from "./CustomDomainSSLManager";
import { PaymentPricingSettingsManager } from "./PaymentPricingSettingsManager";
import confetti from "canvas-confetti";

interface StoreSettingsPanelProps {
  tenant: TenantStore;
  branding: StoreBrandingConfig;
  paymentSettings?: OrganizationPaymentSettings;
  onUpdateBranding: (newBranding: StoreBrandingConfig) => void;
  onUpdatePaymentSettings?: (newSettings: OrganizationPaymentSettings) => void;
  onNavigateTab: (tab: string) => void;
}


export const BRANDING_PALETTES = [
  {
    id: "GOLD_18K" as const,
    name: "Dourado Ouro 18K Nobre",
    description: "Paleta clássica de alta joalheria, tons âmbar e dourado quente",
    primary: "#F59E0B",
    accent: "#FEF3C7",
    badgeBg: "bg-amber-400/20 text-amber-300 border-amber-400/40",
    buttonBg: "bg-amber-400 hover:bg-amber-300 text-stone-950",
    buttonSecondary: "border-stone-700 text-stone-100",
    borderHighlight: "border-amber-400/50",
    glowColor: "rgba(245, 158, 11, 0.25)",
  },
  {
    id: "ROSE_GOLD" as const,
    name: "Rosé Gold & Champanhe",
    description: "Atmosfera romântica, delicada e contemporânea para semijoias",
    primary: "#FB7185",
    accent: "#FFE4E6",
    badgeBg: "bg-rose-400/20 text-rose-300 border-rose-400/40",
    buttonBg: "bg-rose-400 hover:bg-rose-300 text-stone-950",
    buttonSecondary: "border-rose-900/60 text-stone-100",
    borderHighlight: "border-rose-400/50",
    glowColor: "rgba(251, 113, 133, 0.25)",
  },
  {
    id: "RHODIUM_SILVER" as const,
    name: "Ródio Branco & Platina",
    description: "Brilho puro, visual radiante e minimalista em tons gélidos de safira e platina",
    primary: "#38BDF8",
    accent: "#E0F2FE",
    badgeBg: "bg-sky-400/20 text-sky-300 border-sky-400/40",
    buttonBg: "bg-sky-400 hover:bg-sky-300 text-stone-950",
    buttonSecondary: "border-sky-900/60 text-stone-100",
    borderHighlight: "border-sky-400/50",
    glowColor: "rgba(56, 189, 248, 0.25)",
  },
  {
    id: "EMERALD_NOBLE" as const,
    name: "Esmeralda Nobre & Luxo Verde",
    description: "Sensação de raridade, alta joalheria botânica e sofisticação atemporal",
    primary: "#10B981",
    accent: "#D1FAE5",
    badgeBg: "bg-emerald-400/20 text-emerald-300 border-emerald-400/40",
    buttonBg: "bg-emerald-400 hover:bg-emerald-300 text-stone-950",
    buttonSecondary: "border-emerald-900/60 text-stone-100",
    borderHighlight: "border-emerald-400/50",
    glowColor: "rgba(16, 185, 129, 0.25)",
  },
  {
    id: "RUBY_ROYAL" as const,
    name: "Rubi Imperial & Borgonha",
    description: "Presença marcante, elegância régia e forte apelo emocional em presentes",
    primary: "#E11D48",
    accent: "#FFE4E6",
    badgeBg: "bg-rose-500/20 text-rose-300 border-rose-500/40",
    buttonBg: "bg-rose-500 hover:bg-rose-400 text-white",
    buttonSecondary: "border-rose-900/60 text-stone-100",
    borderHighlight: "border-rose-500/50",
    glowColor: "rgba(225, 29, 72, 0.25)",
  },
  {
    id: "ONYX_NOIR" as const,
    name: "Ônix Noir & Ouro Velho",
    description: "Contraste dramático, estética de passarela internacional e ateliê exclusivo",
    primary: "#FBBF24",
    accent: "#FEF3C7",
    badgeBg: "bg-amber-500/20 text-amber-200 border-amber-500/40",
    buttonBg: "bg-amber-300 hover:bg-amber-200 text-stone-950",
    buttonSecondary: "border-stone-800 text-stone-100",
    borderHighlight: "border-amber-400/40",
    glowColor: "rgba(251, 191, 36, 0.25)",
  },
];

export const SAMPLE_LOGO_PRESETS = [
  {
    name: "Lumina",
    subtext: "Alta Semijoias",
    font: "font-serif italic font-bold",
    style: "Lumina",
  },
  {
    name: "Aura Privé",
    subtext: "Haute Joaillerie & Banhos Nobres",
    font: "font-serif font-light tracking-widest uppercase",
    style: "AURA PRIVÉ",
  },
  {
    name: "Maison Dorée",
    subtext: "Semijoias 18K • Limeira & SP",
    font: "font-serif italic font-medium",
    style: "Maison Dorée",
  },
  {
    name: "Vênus Joias",
    subtext: "Design & Personalizados",
    font: "font-sans font-extrabold tracking-wider uppercase",
    style: "VÊNUS",
  },
];

export const StoreSettingsPanel: React.FC<StoreSettingsPanelProps> = ({
  tenant,
  branding,
  paymentSettings = DEFAULT_PAYMENT_SETTINGS,
  onUpdateBranding,
  onUpdatePaymentSettings,
  onNavigateTab,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<
    "branding" | "payment_settings" | "domain" | "social_qr" | "poster" | "welcome" | "contact" | "preview"
  >("branding");
  const [formConfig, setFormConfig] = useState<StoreBrandingConfig>({ ...branding });
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [isAutoValidatingDNS, setIsAutoValidatingDNS] = useState<boolean>(false);

  const [dnsAutoValidationResult, setDnsAutoValidationResult] = useState<{
    valid: boolean;
    domain: string;
    cnameValid: boolean;
    ipValid: boolean;
    sslActive: boolean;
    tlsVersion: string;
    cipher: string;
    latencyMs: number;
    testedAt: string;
    message: string;
    details: { label: string; status: "SUCCESS" | "WARNING" | "INFO"; text: string }[];
  } | null>(null);

  const runAutomaticDNSAndSSLValidation = (domainToTest?: string) => {
    const raw = (domainToTest !== undefined ? domainToTest : (formConfig.customDomain || "")).trim();
    if (!raw) {
      setDnsAutoValidationResult(null);
      return;
    }

    const cleanDomain = raw.toLowerCase().replace(/^https?:\/\//, "").replace(/\/+$/, "");
    setIsAutoValidatingDNS(true);

    setTimeout(() => {
      const isFormatValid = cleanDomain.includes(".") && cleanDomain.length > 3 && !cleanDomain.includes(" ");
      if (isFormatValid) {
        setDnsAutoValidationResult({
          valid: true,
          domain: cleanDomain,
          cnameValid: true,
          ipValid: true,
          sslActive: true,
          tlsVersion: "TLS 1.3 (ECDSA P-256)",
          cipher: "AEAD ChaCha20-Poly1305 / AES-256-GCM",
          latencyMs: 16,
          testedAt: new Date().toLocaleTimeString("pt-BR"),
          message: `DNS apontando perfeitamente para o cluster Aura! Certificado SSL Let's Encrypt TLS 1.3 integrado com sucesso e ativo.`,
          details: [
            { label: "Apontamento CNAME", status: "SUCCESS", text: `CNAME -> cname.aura.com (Resolvido em 12ms)` },
            { label: "Endereço Anycast", status: "SUCCESS", text: `IPv4 Anycast 199.36.158.100 (Borda Brasil/SP)` },
            { label: "Certificado SSL / TLS", status: "SUCCESS", text: `Let's Encrypt Authority X3 • TLS 1.3 • Válido 90 dias` },
            { label: "Proteções HTTP", status: "SUCCESS", text: `Redirecionamento 301 Forçado + HSTS (max-age=31536000)` },
          ],
        });
      } else {
        setDnsAutoValidationResult({
          valid: false,
          domain: cleanDomain,
          cnameValid: false,
          ipValid: false,
          sslActive: false,
          tlsVersion: "N/A",
          cipher: "N/A",
          latencyMs: 0,
          testedAt: new Date().toLocaleTimeString("pt-BR"),
          message: `Formato de domínio inválido. Insira um domínio ou subdomínio válido (ex: loja.aura.com ou semijoias.suamarca.com.br).`,
          details: [
            { label: "Formato", status: "WARNING", text: `Domínio incompleto ou contém caracteres inválidos` },
          ],
        });
      }
      setIsAutoValidatingDNS(false);
    }, 1100);
  };

  const activePalette = BRANDING_PALETTES.find((p) => p.id === formConfig.paletteId) || BRANDING_PALETTES[0];

  const handlePaletteSelect = (paletteId: StoreBrandingConfig["paletteId"]) => {
    const pal = BRANDING_PALETTES.find((p) => p.id === paletteId);
    if (pal) {
      setFormConfig((prev) => ({
        ...prev,
        paletteId,
        primaryColor: pal.primary,
        accentColor: pal.accent,
      }));
    }
  };

  const handleSave = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    onUpdateBranding(formConfig);
    setSavedSuccess(true);
    confetti({
      particleCount: 40,
      spread: 50,
      origin: { y: 0.6 },
    });
    setTimeout(() => setSavedSuccess(false), 3500);
  };

  const handleResetToDefaults = () => {
    if (window.confirm("Deseja restaurar as configurações visuais de fábrica da Lumina?")) {
      const defaultConfig: StoreBrandingConfig = { ...DEFAULT_BRANDING_CONFIG };
      setFormConfig(defaultConfig);
      onUpdateBranding(defaultConfig);
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3000);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Top Header Card with Action Controls */}
      <div className="bg-white rounded-3xl border border-stone-200 p-6 sm:p-8 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-xl bg-amber-100 text-amber-800">
              <Sliders className="w-5 h-5" />
            </span>
            <span className="text-xs font-bold uppercase tracking-wider text-stone-500">
              Personalização & Identidade Visual
            </span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-serif italic font-bold text-stone-900">
            Configurações da Loja & Branding
          </h2>
          <p className="text-xs sm:text-sm text-stone-600 max-w-2xl">
            Personalize o domínio customizado (com SSL gerenciado), o logotipo, a paleta de cores e os textos de boas-vindas da Landing Home.
          </p>
          <div className="pt-1 flex items-center gap-2">
            <button
              onClick={() => setActiveSubTab("domain")}
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 text-emerald-800 text-[11px] font-mono font-bold transition-all cursor-pointer"
              title="Gerenciar Domínio Customizado & Certificado SSL"
            >
              <Globe className="w-3.5 h-3.5 text-emerald-600" />
              <span>https://{formConfig.customDomain || "loja.aura.com"}</span>
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse ml-1" />
              <span className="text-[10px] text-emerald-700 font-sans">SSL Ativo</span>
            </button>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          <button
            type="button"
            onClick={() => onNavigateTab("home")}
            className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2.5 rounded-full border border-stone-300 hover:bg-stone-50 text-stone-700 text-xs font-semibold transition-all cursor-pointer shadow-xs"
            title="Ver como a Landing Home está agora"
          >
            <Eye className="w-4 h-4 text-stone-500" />
            <span>Ver Landing Home</span>
          </button>

          <button
            type="button"
            onClick={handleResetToDefaults}
            className="p-2.5 rounded-full border border-stone-200 hover:bg-stone-100 text-stone-500 hover:text-stone-800 transition-all cursor-pointer"
            title="Restaurar padrões de fábrica"
          >
            <RotateCcw className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={() => handleSave()}
            className="flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-2.5 rounded-full bg-stone-900 hover:bg-stone-800 text-amber-300 hover:text-amber-200 font-bold text-xs uppercase tracking-wider transition-all shadow-md cursor-pointer"
          >
            <Save className="w-4 h-4 text-amber-400" />
            <span>Salvar Alterações</span>
          </button>
        </div>
      </div>

      {/* Success Notification Banner */}
      {savedSuccess && (
        <div className="bg-emerald-50 border border-emerald-300 text-emerald-900 rounded-2xl p-4 flex items-center justify-between shadow-xs animate-in fade-in duration-300">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-emerald-500 text-white flex items-center justify-center font-bold">
              <Check className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-emerald-800">
                Configurações Salvas com Sucesso!
              </p>
              <p className="text-xs text-emerald-700">
                O logotipo, as cores e as mensagens de boas-vindas foram atualizados na Landing Home e na Loja do Comprador.
              </p>
            </div>
          </div>
          <button
            onClick={() => onNavigateTab("home")}
            className="flex items-center gap-1 px-4 py-1.5 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-xs"
          >
            <span>Ver Resultado</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Sub-Navigation Tabs */}
      <div className="flex space-x-2 border-b border-stone-200 pb-2 overflow-x-auto">
        <button
          onClick={() => setActiveSubTab("branding")}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-full text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
            activeSubTab === "branding"
              ? "bg-stone-900 text-amber-300 shadow-md border border-amber-400/50 ring-2 ring-amber-400/20"
              : "bg-white text-stone-700 hover:bg-stone-100 border border-stone-200"
          }`}
        >
          <Sparkles className="w-3.5 h-3.5 text-amber-400" />
          <span>✨ 1. Nome da Loja & Logotipo</span>
        </button>

        <button
          onClick={() => setActiveSubTab("payment_settings")}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-full text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
            activeSubTab === "payment_settings"
              ? "bg-amber-400 text-stone-950 shadow-md"
              : "bg-white text-stone-700 hover:bg-stone-100 border border-stone-200"
          }`}
        >
          <CreditCard className="w-3.5 h-3.5" />
          <span>💳 2. Preços, PIX & Parcelamento</span>
        </button>

        <button
          onClick={() => setActiveSubTab("domain")}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-full text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
            activeSubTab === "domain"
              ? "bg-stone-900 text-amber-300 shadow-xs border border-amber-400/40"
              : "bg-white text-stone-700 hover:bg-stone-100 border border-stone-200"
          }`}
        >
          <Globe className="w-3.5 h-3.5 text-amber-400" />
          <span>🌐 3. Domínio & SSL</span>
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse ml-0.5" />
        </button>

        <button
          onClick={() => setActiveSubTab("social_qr")}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-full text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
            activeSubTab === "social_qr"
              ? "bg-amber-400 text-stone-950 shadow-xs"
              : "bg-white text-stone-600 hover:bg-stone-100 border border-stone-200"
          }`}
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>📱 4. Redes Sociais & QR Codes</span>
        </button>

        <button
          onClick={() => setActiveSubTab("poster")}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-full text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
            activeSubTab === "poster"
              ? "bg-stone-900 text-white shadow-xs"
              : "bg-white text-stone-600 hover:bg-stone-100 border border-stone-200"
          }`}
        >
          <Sparkles className="w-3.5 h-3.5 text-amber-400" />
          <span>✨ 5. Cartaz Expo</span>
        </button>

        <button
          onClick={() => setActiveSubTab("welcome")}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-full text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
            activeSubTab === "welcome"
              ? "bg-stone-900 text-white shadow-xs"
              : "bg-white text-stone-600 hover:bg-stone-100 border border-stone-200"
          }`}
        >
          <Type className="w-3.5 h-3.5 text-amber-400" />
          <span>📝 6. Textos & Headlines</span>
        </button>

        <button
          onClick={() => setActiveSubTab("contact")}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-full text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
            activeSubTab === "contact"
              ? "bg-stone-900 text-white shadow-xs"
              : "bg-white text-stone-600 hover:bg-stone-100 border border-stone-200"
          }`}
        >
          <Smartphone className="w-3.5 h-3.5 text-amber-400" />
          <span>📞 7. Contatos & WhatsApp</span>
        </button>

        <button
          onClick={() => setActiveSubTab("preview")}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-full text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
            activeSubTab === "preview"
              ? "bg-stone-900 text-white shadow-xs"
              : "bg-white text-stone-600 hover:bg-stone-100 border border-stone-200"
          }`}
        >
          <Eye className="w-3.5 h-3.5 text-amber-400" />
          <span>4. Pré-visualização</span>
        </button>
      </div>

      {/* TAB CONDIÇÕES DE PAGAMENTO & PRECIFICAÇÃO (NOVO MÓDULO ORGANIZACIONAL) */}
      {activeSubTab === "payment_settings" && (
        <PaymentPricingSettingsManager
          tenant={tenant}
          settings={paymentSettings}
          onUpdateSettings={(newSettings) => {
            if (onUpdatePaymentSettings) {
              onUpdatePaymentSettings(newSettings);
            }
          }}
        />
      )}

      {/* TAB DOMÍNIO CUSTOMIZADO & SSL GERENCIADO (SOLICITADO PELO USUÁRIO) */}
      {activeSubTab === "domain" && (
        <CustomDomainSSLManager
          branding={formConfig}
          onUpdateBranding={(updated) => {
            setFormConfig(updated);
            onUpdateBranding(updated);
          }}
          tenant={tenant}
        />
      )}

      {/* TAB SOCIAL & QR CODE MANAGER */}
      {activeSubTab === "social_qr" && (
        <SocialQRCodeCollageManager
          branding={formConfig}
          onUpdateBranding={(updated) => {
            setFormConfig(updated);
            onUpdateBranding(updated);
          }}
          tenant={tenant}
        />
      )}

      {/* TAB 0: CARTAZ EXPO COLLAGE DE PROMOÇÕES (FIEL À REFERÊNCIA DO USUÁRIO) */}
      {activeSubTab === "poster" && (
        <div className="space-y-6">
          <div className="bg-white rounded-3xl border border-stone-200 p-6 sm:p-8 space-y-6 shadow-xs">
            <div className="flex items-center justify-between pb-3 border-b border-stone-100">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-amber-600" />
                <h3 className="font-serif italic font-bold text-lg text-stone-900">
                  Cartaz de Promoções Expo Collage & Redes Sociais
                </h3>
              </div>
              <span className="text-[10px] font-bold tracking-wider uppercase text-amber-700 bg-amber-100 px-3 py-1 rounded-full">
                Design Fiel à Imagem de Referência
              </span>
            </div>

            <p className="text-xs text-stone-600">
              Personalize o título editorial, a barra de data e promoção com cupom, os dados de localização do showroom e todos os links de redes sociais que aparecem no rodapé do cartaz.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Poster Title */}
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-stone-600 block">
                  1. Título do Evento / Mostra (Headline Grande):
                </label>
                <input
                  type="text"
                  value={formConfig.posterTitle}
                  onChange={(e) => setFormConfig((prev) => ({ ...prev, posterTitle: e.target.value }))}
                  placeholder="Ex: EXPO SEMIJOIAS & NOIVAS 2026"
                  className="w-full bg-stone-50 border border-stone-300 rounded-2xl px-4 py-2.5 text-xs text-stone-900 font-extrabold focus:outline-none focus:border-stone-900 focus:bg-white transition-all uppercase"
                />
              </div>

              {/* Poster Golden Date Badge */}
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-stone-600 block">
                  2. Barra Dourada de Data & Destaque (Faixa Central):
                </label>
                <input
                  type="text"
                  value={formConfig.posterBadgeDate}
                  onChange={(e) => setFormConfig((prev) => ({ ...prev, posterBadgeDate: e.target.value }))}
                  placeholder="Ex: SÁBADO, 21 DE MARÇO DE 2026 • ATÉ 25% OFF"
                  className="w-full bg-stone-50 border border-stone-300 rounded-2xl px-4 py-2.5 text-xs text-stone-900 font-bold focus:outline-none focus:border-stone-900 focus:bg-white transition-all uppercase"
                />
              </div>

              {/* Location & Time */}
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-stone-600 block">
                  3. Local, Horário & Canal de Atendimento:
                </label>
                <input
                  type="text"
                  value={formConfig.posterLocation}
                  onChange={(e) => setFormConfig((prev) => ({ ...prev, posterLocation: e.target.value }))}
                  placeholder="Ex: SHOWROOM VIP & ATELIÊ • 10:00 ÀS 19:00 • VITRINE ONLINE"
                  className="w-full bg-stone-50 border border-stone-300 rounded-2xl px-4 py-2.5 text-xs text-stone-900 font-bold focus:outline-none focus:border-stone-900 focus:bg-white transition-all uppercase"
                />
              </div>

              {/* Website URL */}
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-stone-600 block">
                  4. Link do Website em Destaque:
                </label>
                <input
                  type="text"
                  value={formConfig.websiteUrl || "www.luminasemijoias.com.br"}
                  onChange={(e) => setFormConfig((prev) => ({ ...prev, websiteUrl: e.target.value }))}
                  placeholder="Ex: www.luminasemijoias.com.br"
                  className="w-full bg-stone-50 border border-stone-300 rounded-2xl px-4 py-2.5 text-xs font-mono text-stone-900 font-semibold focus:outline-none focus:border-stone-900 focus:bg-white transition-all"
                />
              </div>

              {/* Promo Cupom Code & Discount */}
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-stone-600 block">
                  5. Cupom do Cartaz (Copiável no Clique):
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <input
                    type="text"
                    value={formConfig.posterPromoCode || "EXPO2026"}
                    onChange={(e) => setFormConfig((prev) => ({ ...prev, posterPromoCode: e.target.value }))}
                    placeholder="EXPO2026"
                    className="w-full bg-stone-50 border border-stone-300 rounded-2xl px-4 py-2.5 text-xs font-mono font-bold text-stone-900 uppercase"
                  />
                  <input
                    type="text"
                    value={formConfig.posterPromoDiscount || "20% OFF"}
                    onChange={(e) => setFormConfig((prev) => ({ ...prev, posterPromoDiscount: e.target.value }))}
                    placeholder="20% OFF"
                    className="w-full bg-stone-50 border border-stone-300 rounded-2xl px-4 py-2.5 text-xs font-mono font-bold text-amber-700 uppercase"
                  />
                </div>
              </div>

              {/* Poster Description */}
              <div className="md:col-span-2 space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-stone-600 block">
                  6. Texto Descritivo do Cartaz:
                </label>
                <textarea
                  rows={3}
                  value={formConfig.posterDescription}
                  onChange={(e) => setFormConfig((prev) => ({ ...prev, posterDescription: e.target.value }))}
                  placeholder="Ex: Uma mostra deslumbrante de semijoias nobres fundidas em ligas antialérgicas, banho de 10 milésimos de Ouro 18K..."
                  className="w-full bg-stone-50 border border-stone-300 rounded-2xl p-4 text-xs text-stone-800 leading-relaxed focus:outline-none focus:border-stone-900 focus:bg-white transition-all"
                />
              </div>
            </div>

            {/* Social Media Handles Grid */}
            <div className="pt-4 border-t border-stone-100 space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-stone-700">
                7. Redes Sociais Oficiais no Rodapé do Cartaz:
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                <div className="space-y-1">
                  <span className="text-[11px] font-semibold text-stone-600 flex items-center gap-1.5">
                    <span className="w-5 h-5 rounded-full bg-stone-900 text-white flex items-center justify-center text-[10px] font-bold">𝕏</span>
                    <span>Twitter / 𝕏:</span>
                  </span>
                  <input
                    type="text"
                    defaultValue="@luminasemijoias"
                    className="w-full bg-stone-50 border border-stone-300 rounded-xl px-3 py-2 text-xs font-mono text-stone-800"
                  />
                </div>

                <div className="space-y-1">
                  <span className="text-[11px] font-semibold text-stone-600 flex items-center gap-1.5">
                    <Instagram className="w-4 h-4 text-rose-600" />
                    <span>Instagram:</span>
                  </span>
                  <input
                    type="text"
                    value={formConfig.instagramHandle}
                    onChange={(e) => setFormConfig((prev) => ({ ...prev, instagramHandle: e.target.value }))}
                    placeholder="@luminasemijoias"
                    className="w-full bg-stone-50 border border-stone-300 rounded-xl px-3 py-2 text-xs font-mono text-stone-800 font-bold"
                  />
                </div>

                <div className="space-y-1">
                  <span className="text-[11px] font-semibold text-stone-600 flex items-center gap-1.5">
                    <Facebook className="w-4 h-4 text-blue-700" />
                    <span>Facebook:</span>
                  </span>
                  <input
                    type="text"
                    value={formConfig.facebookHandle || "@luminasemijoiasoficial"}
                    onChange={(e) => setFormConfig((prev) => ({ ...prev, facebookHandle: e.target.value }))}
                    placeholder="@luminasemijoiasoficial"
                    className="w-full bg-stone-50 border border-stone-300 rounded-xl px-3 py-2 text-xs font-mono text-stone-800"
                  />
                </div>

                <div className="space-y-1">
                  <span className="text-[11px] font-semibold text-stone-600 flex items-center gap-1.5">
                    <Smartphone className="w-4 h-4 text-emerald-600" />
                    <span>WhatsApp VIP:</span>
                  </span>
                  <input
                    type="text"
                    value={formConfig.contactWhatsapp}
                    onChange={(e) => setFormConfig((prev) => ({ ...prev, contactWhatsapp: e.target.value }))}
                    placeholder="+55 (19) 98842-1100"
                    className="w-full bg-stone-50 border border-stone-300 rounded-xl px-3 py-2 text-xs font-mono text-stone-800 font-bold"
                  />
                </div>

                <div className="space-y-1">
                  <span className="text-[11px] font-semibold text-stone-600 flex items-center gap-1.5">
                    <span className="w-4 h-4 rounded-full bg-stone-900 text-white flex items-center justify-center text-[10px] font-bold">d</span>
                    <span>TikTok Joias:</span>
                  </span>
                  <input
                    type="text"
                    value={formConfig.tiktokHandle || "@luminajoias"}
                    onChange={(e) => setFormConfig((prev) => ({ ...prev, tiktokHandle: e.target.value }))}
                    placeholder="@luminajoias"
                    className="w-full bg-stone-50 border border-stone-300 rounded-xl px-3 py-2 text-xs font-mono text-stone-800"
                  />
                </div>

                <div className="space-y-1">
                  <span className="text-[11px] font-semibold text-stone-600 flex items-center gap-1.5">
                    <span className="w-4 h-4 rounded-full bg-red-700 text-white flex items-center justify-center text-[10px] font-bold">P</span>
                    <span>Pinterest Editorial:</span>
                  </span>
                  <input
                    type="text"
                    value={formConfig.pinterestHandle || "@luminahautejoias"}
                    onChange={(e) => setFormConfig((prev) => ({ ...prev, pinterestHandle: e.target.value }))}
                    placeholder="@luminahautejoias"
                    className="w-full bg-stone-50 border border-stone-300 rounded-xl px-3 py-2 text-xs font-mono text-stone-800"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 1: LOGOTIPO & CORES DA MARCA */}
      {activeSubTab === "branding" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Main Store Name & Brand Identity Hero Card */}
          <div className="lg:col-span-12 bg-gradient-to-br from-amber-500/10 via-white to-stone-50 rounded-3xl border-2 border-amber-300/80 p-6 sm:p-8 space-y-6 shadow-sm">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-amber-200/60">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-amber-500 text-stone-950 flex items-center justify-center font-serif italic font-bold text-xl shadow-md">
                  💎
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-serif italic font-bold text-xl sm:text-2xl text-stone-900">
                      Nome da Loja & Identidade da Marca
                    </h3>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-amber-900 bg-amber-100 border border-amber-300 px-2.5 py-0.5 rounded-full">
                      Edição Instantânea
                    </span>
                  </div>
                  <p className="text-xs sm:text-sm text-stone-600">
                    Altere o nome da sua loja (ex: de <span className="font-bold text-stone-800">Lumina</span> para <span className="font-bold text-amber-700">Lilian</span>) a qualquer momento. A mudança atualiza imediatamente a barra superior, o menu lateral, o catálogo online para clientes e as mensagens de WhatsApp.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => handleSave()}
                className="flex items-center justify-center gap-2 px-6 py-3 rounded-2xl bg-stone-900 hover:bg-stone-800 text-amber-300 hover:text-amber-200 font-bold text-xs uppercase tracking-wider transition-all shadow-md cursor-pointer shrink-0"
              >
                <Save className="w-4 h-4 text-amber-400" />
                <span>Salvar Nome da Loja</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
              <div className="md:col-span-7 space-y-4">
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-stone-700 block mb-1.5 flex items-center justify-between">
                    <span>Nome Principal da Sua Loja:</span>
                    <span className="text-[11px] text-stone-500 font-normal lowercase">
                      (exibido em destaque em todo o sistema)
                    </span>
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={formConfig.logoText}
                      onChange={(e) => setFormConfig((prev) => ({ ...prev, logoText: e.target.value }))}
                      placeholder="Ex: Lilian Semijoias"
                      className="w-full bg-white border-2 border-amber-300/80 rounded-2xl px-4 py-3 text-base font-serif italic font-bold text-stone-900 focus:outline-none focus:border-stone-900 focus:ring-2 focus:ring-amber-200 transition-all shadow-xs"
                    />
                    {formConfig.logoText && (
                      <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                        Ativo
                      </span>
                    )}
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-stone-700 block mb-1.5 flex items-center justify-between">
                    <span>Subtítulo / Especialidade da Marca:</span>
                    <span className="text-[11px] text-stone-500 font-normal lowercase">
                      (aparece abaixo do nome da loja)
                    </span>
                  </label>
                  <input
                    type="text"
                    value={formConfig.logoSubtext}
                    onChange={(e) => setFormConfig((prev) => ({ ...prev, logoSubtext: e.target.value }))}
                    placeholder="Ex: Alta Semijoias & Banho Ouro 18k"
                    className="w-full bg-white border border-stone-300 rounded-2xl px-4 py-2.5 text-xs tracking-[0.15em] uppercase font-bold text-stone-700 focus:outline-none focus:border-stone-900 focus:bg-white transition-all shadow-xs"
                  />
                </div>

                {/* Quick 1-Click Suggestions */}
                <div className="pt-1">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-stone-500 block mb-1.5">
                    Sugestões rápidas de 1 clique:
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {[
                      { name: "Lilian Semijoias", sub: "Alta Semijoias & Banho Ouro 18k" },
                      { name: "Lilian Joias Finas", sub: "Peças Exclusivas & Garantia 1 Ano" },
                      { name: "Ateliê Lilian", sub: "Semijoias Nobres & Noivas" },
                      { name: "Lumina Semijoias", sub: "Alta Semijoias & Curadoria Fina" },
                    ].map((preset, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() =>
                          setFormConfig((prev) => ({
                            ...prev,
                            logoText: preset.name,
                            logoSubtext: preset.sub,
                          }))
                        }
                        className="px-3 py-1.5 rounded-xl bg-white hover:bg-amber-100/60 text-stone-800 text-xs font-medium border border-stone-300 hover:border-amber-400 transition-all cursor-pointer shadow-2xs"
                      >
                        💎 {preset.name}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Live Preview Card */}
              <div className="md:col-span-5 bg-stone-950 text-white rounded-2xl p-5 border border-stone-800 flex flex-col justify-between space-y-4 shadow-md">
                <div className="space-y-3">
                  <div className="flex items-center justify-between pb-2 border-b border-stone-800 text-[10px] uppercase font-bold tracking-wider text-stone-400">
                    <span>Pré-Visualização em Tempo Real</span>
                    <span className="text-emerald-400 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      Ao Vivo
                    </span>
                  </div>

                  <div className="p-3.5 rounded-xl bg-stone-900/90 border border-stone-800 space-y-1.5">
                    <span className="text-[9px] uppercase tracking-wider text-amber-400 font-bold block">
                      Barra Superior & Menu:
                    </span>
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-stone-800 text-amber-300 flex items-center justify-center text-xs font-bold">
                        💎
                      </div>
                      <div>
                        <div className="font-serif italic font-bold text-base text-white leading-tight">
                          {formConfig.logoText || "Lumina Semijoias"}
                        </div>
                        <div className="text-[9px] uppercase tracking-wider text-stone-400">
                          {formConfig.logoSubtext || "Alta Semijoias"}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-stone-900/70 border border-stone-800/80 space-y-1 text-xs">
                    <span className="text-[9px] uppercase tracking-wider text-emerald-400 font-bold block">
                      Link do Catálogo de Compras:
                    </span>
                    <span className="font-mono text-[11px] text-stone-300 break-all">
                      https://loja.aura.com/?loja={(formConfig.logoText || "lumina").toLowerCase().replace(/\s+/g, "-")}
                    </span>
                  </div>
                </div>

                <div className="text-[11px] text-stone-400 flex items-center gap-1.5 pt-2 border-t border-stone-800/60">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span>Clique em <strong>Salvar Nome da Loja</strong> acima para atualizar instantaneamente.</span>
                </div>
              </div>
            </div>
          </div>

          {/* Logo Customizer */}
          <div className="lg:col-span-6 bg-white rounded-3xl border border-stone-200 p-6 sm:p-8 space-y-6 shadow-xs">
            <div className="flex items-center justify-between pb-3 border-b border-stone-100">
              <div className="flex items-center gap-2">
                <Crown className="w-5 h-5 text-amber-600" />
                <h3 className="font-serif italic font-bold text-lg text-stone-900">
                  Logotipo & Monograma da Marca
                </h3>
              </div>
              <span className="text-[10px] font-bold tracking-wider uppercase text-stone-400">
                Visual da Barra Superior
              </span>
            </div>

            {/* Logo Format Selector: Text/Monogram vs Image */}
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-stone-600 block">
                Formato de Exibição do Logotipo:
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setFormConfig((prev) => ({ ...prev, logoType: "TEXT" }))}
                  className={`p-3.5 rounded-2xl border text-left flex flex-col gap-1 transition-all cursor-pointer ${
                    formConfig.logoType === "TEXT"
                      ? "border-stone-900 bg-stone-900 text-white shadow-xs"
                      : "border-stone-200 bg-stone-50 hover:bg-stone-100 text-stone-800"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold flex items-center gap-1.5">
                      <Type className="w-3.5 h-3.5" />
                      <span>Logotipo Tipográfico</span>
                    </span>
                    {formConfig.logoType === "TEXT" && <Check className="w-3.5 h-3.5 text-amber-400" />}
                  </div>
                  <span className={`text-[11px] ${formConfig.logoType === "TEXT" ? "text-stone-300" : "text-stone-500"}`}>
                    Elegância editorial com fontes serifadas e subtexto
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setFormConfig((prev) => ({ ...prev, logoType: "IMAGE" }))}
                  className={`p-3.5 rounded-2xl border text-left flex flex-col gap-1 transition-all cursor-pointer ${
                    formConfig.logoType === "IMAGE"
                      ? "border-stone-900 bg-stone-900 text-white shadow-xs"
                      : "border-stone-200 bg-stone-50 hover:bg-stone-100 text-stone-800"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold flex items-center gap-1.5">
                      <ImageIcon className="w-3.5 h-3.5" />
                      <span>Imagem / Emblema URL</span>
                    </span>
                    {formConfig.logoType === "IMAGE" && <Check className="w-3.5 h-3.5 text-amber-400" />}
                  </div>
                  <span className={`text-[11px] ${formConfig.logoType === "IMAGE" ? "text-stone-300" : "text-stone-500"}`}>
                    Exibe a imagem do logo ou brasão de sua marca
                  </span>
                </button>
              </div>
            </div>

            {/* Inputs based on format */}
            {formConfig.logoType === "TEXT" ? (
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-stone-600 block mb-1">
                    Nome Principal da Marca:
                  </label>
                  <input
                    type="text"
                    value={formConfig.logoText}
                    onChange={(e) => setFormConfig((prev) => ({ ...prev, logoText: e.target.value }))}
                    placeholder="Ex: Lumina"
                    className="w-full bg-stone-50 border border-stone-300 rounded-2xl px-4 py-2.5 text-sm font-serif italic font-bold text-stone-900 focus:outline-none focus:border-stone-900 focus:bg-white transition-all"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-stone-600 block mb-1">
                    Subtítulo / Slogan Curto (Tagline):
                  </label>
                  <input
                    type="text"
                    value={formConfig.logoSubtext}
                    onChange={(e) => setFormConfig((prev) => ({ ...prev, logoSubtext: e.target.value }))}
                    placeholder="Ex: Alta Semijoias"
                    className="w-full bg-stone-50 border border-stone-300 rounded-2xl px-4 py-2.5 text-xs tracking-[0.2em] uppercase font-bold text-stone-700 focus:outline-none focus:border-stone-900 focus:bg-white transition-all"
                  />
                </div>

                {/* Quick Presets for Text Logo */}
                <div className="space-y-2 pt-2">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-stone-400 block">
                    Inspirações Prontas de Nome:
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {SAMPLE_LOGO_PRESETS.map((preset, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() =>
                          setFormConfig((prev) => ({
                            ...prev,
                            logoText: preset.name,
                            logoSubtext: preset.subtext,
                          }))
                        }
                        className="px-3 py-1.5 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-medium border border-stone-200 transition-colors"
                      >
                        {preset.name} • <span className="text-[10px] text-stone-500">{preset.subtext}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-stone-600 block mb-1">
                    URL da Imagem do Logotipo:
                  </label>
                  <input
                    type="url"
                    value={formConfig.logoUrl}
                    onChange={(e) => setFormConfig((prev) => ({ ...prev, logoUrl: e.target.value }))}
                    placeholder="https://exemplo.com/logo-joalheria.png"
                    className="w-full bg-stone-50 border border-stone-300 rounded-2xl px-4 py-2.5 text-xs text-stone-900 focus:outline-none focus:border-stone-900 focus:bg-white font-mono transition-all"
                  />
                </div>

                {/* Image Preview Box */}
                <div className="p-4 rounded-2xl bg-stone-950 flex items-center justify-between border border-stone-800">
                  <div className="flex items-center gap-3">
                    <img
                      src={formConfig.logoUrl}
                      alt="Logo Preview"
                      className="h-10 w-auto max-w-[140px] object-contain rounded"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src =
                          "https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?w=150&auto=format&fit=crop&q=80";
                      }}
                    />
                    <div>
                      <p className="text-xs font-bold text-white">Visualização em Fundo Escuro</p>
                      <p className="text-[10px] text-stone-400">Recomendado PNG com fundo transparente</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Real-time Header Box Preview */}
            <div className="p-4 rounded-2xl bg-stone-950 border border-stone-800 space-y-2">
              <span className="text-[10px] uppercase font-bold tracking-wider text-stone-400 block">
                Visualização no Topo da Landing Home:
              </span>
              <div className="flex items-baseline gap-3">
                {formConfig.logoType === "IMAGE" ? (
                  <img
                    src={formConfig.logoUrl}
                    alt="Logo"
                    className="h-9 w-auto object-contain"
                  />
                ) : (
                  <h4 className="text-2xl font-serif italic font-bold text-stone-100">
                    {formConfig.logoText || "Lumina"}
                  </h4>
                )}
                <span
                  className="text-[10px] font-bold tracking-[0.25em] uppercase"
                  style={{ color: formConfig.primaryColor }}
                >
                  {formConfig.logoSubtext || "Alta Semijoias"}
                </span>
              </div>
            </div>
          </div>

          {/* Brand Color Palettes */}
          <div className="lg:col-span-6 bg-white rounded-3xl border border-stone-200 p-6 sm:p-8 space-y-6 shadow-xs">
            <div className="flex items-center justify-between pb-3 border-b border-stone-100">
              <div className="flex items-center gap-2">
                <Palette className="w-5 h-5 text-amber-600" />
                <h3 className="font-serif italic font-bold text-lg text-stone-900">
                  Cores da Marca & Paleta de Destaques
                </h3>
              </div>
              <span className="text-[10px] font-bold tracking-wider uppercase text-stone-400">
                Botões, Badges & Brilho
              </span>
            </div>

            <div className="space-y-3">
              <label className="text-xs font-bold uppercase tracking-wider text-stone-600 block">
                Escolha a Paleta Nobre da sua Coleção:
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {BRANDING_PALETTES.map((palette) => {
                  const isSelected = formConfig.paletteId === palette.id;
                  return (
                    <button
                      key={palette.id}
                      type="button"
                      onClick={() => handlePaletteSelect(palette.id)}
                      className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between gap-3 ${
                        isSelected
                          ? "border-stone-900 bg-stone-900 text-white shadow-md ring-2 ring-stone-900/20"
                          : "border-stone-200 bg-stone-50 hover:bg-stone-100 text-stone-800"
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-bold flex items-center gap-1.5">
                            <span
                              className="w-3.5 h-3.5 rounded-full shadow-xs"
                              style={{ backgroundColor: palette.primary }}
                            />
                            <span>{palette.name}</span>
                          </span>
                          {isSelected && <Check className="w-3.5 h-3.5 text-amber-400" />}
                        </div>
                        <p className={`text-[11px] line-clamp-2 ${isSelected ? "text-stone-300" : "text-stone-500"}`}>
                          {palette.description}
                        </p>
                      </div>

                      {/* Swatch chips */}
                      <div className="flex items-center gap-1.5 pt-1">
                        <span
                          className="px-2 py-0.5 rounded text-[10px] font-mono font-bold"
                          style={{
                            backgroundColor: palette.primary,
                            color: "#0c0a09",
                          }}
                        >
                          {palette.primary}
                        </span>
                        <span className={`text-[9px] uppercase tracking-wider ${isSelected ? "text-stone-400" : "text-stone-500"}`}>
                          {palette.id}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Custom Color Override */}
            <div className="pt-4 border-t border-stone-100 space-y-3">
              <label className="text-xs font-bold uppercase tracking-wider text-stone-600 block">
                Ou selecione uma Cor Primária personalizada (Hex):
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={formConfig.primaryColor}
                  onChange={(e) =>
                    setFormConfig((prev) => ({
                      ...prev,
                      primaryColor: e.target.value,
                    }))
                  }
                  className="w-12 h-10 rounded-xl cursor-pointer border border-stone-300 p-1 bg-white"
                />
                <input
                  type="text"
                  value={formConfig.primaryColor}
                  onChange={(e) =>
                    setFormConfig((prev) => ({
                      ...prev,
                      primaryColor: e.target.value,
                    }))
                  }
                  className="flex-1 bg-stone-50 border border-stone-300 rounded-xl px-3.5 py-2 text-xs font-mono font-bold text-stone-900 uppercase"
                />
              </div>
            </div>

            {/* Color preview buttons */}
            <div className="p-4 rounded-2xl bg-stone-950 border border-stone-800 space-y-3">
              <span className="text-[10px] uppercase font-bold tracking-wider text-stone-400 block">
                Exemplo de Botões com a Paleta Atual:
              </span>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  className="px-4 py-2 rounded-full font-bold text-xs uppercase tracking-wider shadow-sm flex items-center gap-1.5"
                  style={{
                    backgroundColor: formConfig.primaryColor,
                    color: "#0c0a09",
                  }}
                >
                  <ShoppingBag className="w-3.5 h-3.5" />
                  <span>{formConfig.ctaPrimaryText || "Comprar na Vitrine"}</span>
                </button>

                <button
                  type="button"
                  className="px-4 py-2 rounded-full font-bold text-xs uppercase tracking-wider border border-stone-700 bg-stone-900 text-stone-200"
                >
                  <Crown className="w-3.5 h-3.5" style={{ color: formConfig.primaryColor }} />
                  <span>Personalizados</span>
                </button>
              </div>
            </div>
          </div>

          {/* Background Wallpaper & Store Photography Manager */}
          <div className="lg:col-span-12 bg-white rounded-3xl border border-stone-200 p-6 sm:p-8 space-y-6 shadow-xs">
            <div className="flex items-center justify-between pb-3 border-b border-stone-100">
              <div className="flex items-center gap-2">
                <ImageIcon className="w-5 h-5 text-amber-600" />
                <h3 className="font-serif italic font-bold text-lg text-stone-900">
                  Foto de Fundo da Landing Home & Papel de Parede da Marca
                </h3>
              </div>
              <span className="text-[10px] font-bold tracking-wider uppercase text-emerald-700 bg-emerald-100 px-3 py-1 rounded-full">
                100% Personalizável
              </span>
            </div>

            <p className="text-xs text-stone-600 max-w-3xl">
              Escolha uma atmosfera fotográfica de alta joalheria para a tela inicial ou insira a URL da foto do ensaio profissional da sua loja.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-4">
              {[
                {
                  id: "veludo-ouro",
                  name: "Veludo & Ouro 18K",
                  desc: "Contraste profundo",
                  url: "https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?q=80&w=2070&auto=format&fit=crop",
                },
                {
                  id: "seda-champagne",
                  name: "Seda Champagne",
                  desc: "Riviera & Delicadeza",
                  url: "https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?q=80&w=2070&auto=format&fit=crop",
                },
                {
                  id: "marmore-imperial",
                  name: "Mármore & Minimalismo",
                  desc: "Estética contemporânea",
                  url: "https://images.unsplash.com/photo-1605100804763-247f67b3557e?q=80&w=2070&auto=format&fit=crop",
                },
                {
                  id: "atelie-ourives",
                  name: "Ateliê Ourivesaria",
                  desc: "Bancada artesanal",
                  url: "https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?q=80&w=2070&auto=format&fit=crop",
                },
                {
                  id: "noivas-cristal",
                  name: "Noivas & Pedras Nobres",
                  desc: "Zircônias brilhantes",
                  url: "https://images.unsplash.com/photo-1611591475152-478311399767?q=80&w=2070&auto=format&fit=crop",
                },
              ].map((preset) => {
                const isSelected =
                  (!formConfig.customBackgroundUrl && (formConfig.backgroundPresetId === preset.id || (!formConfig.backgroundPresetId && preset.id === "veludo-ouro"))) ||
                  formConfig.customBackgroundUrl === preset.url;
                return (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() =>
                      setFormConfig((prev) => ({
                        ...prev,
                        backgroundPresetId: preset.id,
                        customBackgroundUrl: preset.url,
                      }))
                    }
                    className={`relative rounded-2xl overflow-hidden border-2 text-left p-3 flex flex-col justify-end min-h-[140px] group transition-all cursor-pointer ${
                      isSelected
                        ? "border-amber-500 ring-2 ring-amber-400/40 shadow-md"
                        : "border-stone-200 hover:border-stone-400 opacity-80 hover:opacity-100"
                    }`}
                  >
                    <img
                      src={preset.url}
                      alt={preset.name}
                      className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-stone-950 via-stone-950/60 to-transparent" />

                    <div className="relative z-10">
                      <div className="flex items-center justify-between mb-0.5">
                        <span className="text-xs font-bold text-white leading-tight">{preset.name}</span>
                        {isSelected && <Check className="w-3.5 h-3.5 text-amber-400 shrink-0" />}
                      </div>
                      <span className="text-[10px] text-stone-300 block">{preset.desc}</span>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Custom Photo URL Input */}
            <div className="pt-3 border-t border-stone-100 space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-stone-600 block">
                Ou insira a URL da Foto do Ensaio da sua Loja (Alta Resolução):
              </label>
              <div className="flex flex-col sm:flex-row gap-3">
                <input
                  type="url"
                  value={formConfig.customBackgroundUrl || ""}
                  onChange={(e) =>
                    setFormConfig((prev) => ({
                      ...prev,
                      customBackgroundUrl: e.target.value,
                    }))
                  }
                  placeholder="https://sua-empresa.com/fotos/banner-principal.jpg"
                  className="flex-1 bg-stone-50 border border-stone-300 rounded-2xl px-4 py-2.5 text-xs text-stone-900 font-mono focus:outline-none focus:border-stone-900 focus:bg-white transition-all"
                />
                {formConfig.customBackgroundUrl && (
                  <button
                    type="button"
                    onClick={() =>
                      setFormConfig((prev) => ({
                        ...prev,
                        customBackgroundUrl: "",
                        backgroundPresetId: "veludo-ouro",
                      }))
                    }
                    className="px-4 py-2.5 rounded-2xl border border-stone-300 text-stone-600 hover:bg-stone-100 text-xs font-semibold cursor-pointer"
                  >
                    Restaurar Padrão
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: TEXTOS DE BOAS-VINDAS DA LANDING HOME */}
      {activeSubTab === "welcome" && (
        <div className="bg-white rounded-3xl border border-stone-200 p-6 sm:p-8 space-y-6 shadow-xs">
          <div className="flex items-center justify-between pb-3 border-b border-stone-100">
            <div className="flex items-center gap-2">
              <Type className="w-5 h-5 text-amber-600" />
              <h3 className="font-serif italic font-bold text-lg text-stone-900">
                Textos de Boas-Vindas & Mensagens da Landing Home
              </h3>
            </div>
            <span className="text-[10px] font-bold tracking-wider uppercase text-stone-400">
              Hero & Anúncios
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Announcement Topbar */}
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-stone-600 block">
                1. Faixa Superior de Anúncio (Topbar Ticker):
              </label>
              <input
                type="text"
                value={formConfig.announcementBarText}
                onChange={(e) => setFormConfig((prev) => ({ ...prev, announcementBarText: e.target.value }))}
                placeholder="Ex: Coleção 2026 • Semijoias Banhadas a Ouro 18K & Ródio Nobre"
                className="w-full bg-stone-50 border border-stone-300 rounded-2xl px-4 py-2.5 text-xs text-stone-800 focus:outline-none focus:border-stone-900 focus:bg-white transition-all font-medium"
              />
              <p className="text-[11px] text-stone-500">
                Frase que fica piscando com ponto luminoso no topo da página inicial.
              </p>
            </div>

            {/* Hero Pill Badge */}
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-stone-600 block">
                2. Selo / Badge Flutuante da Hero:
              </label>
              <input
                type="text"
                value={formConfig.heroPillBadge}
                onChange={(e) => setFormConfig((prev) => ({ ...prev, heroPillBadge: e.target.value }))}
                placeholder="Ex: Exclusividade & Garantia Digital QR"
                className="w-full bg-stone-50 border border-stone-300 rounded-2xl px-4 py-2.5 text-xs text-stone-800 focus:outline-none focus:border-stone-900 focus:bg-white transition-all font-medium"
              />
              <p className="text-[11px] text-stone-500">
                Destaque principal antes do título (ex.: "Nova Coleção de Inverno", "Garantia 1 Ano").
              </p>
            </div>

            {/* Main Headline */}
            <div className="md:col-span-2 space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-stone-600 block">
                3. Título Principal de Boas-Vindas (Headline Hero):
              </label>
              <textarea
                rows={2}
                value={formConfig.heroHeadline}
                onChange={(e) => setFormConfig((prev) => ({ ...prev, heroHeadline: e.target.value }))}
                placeholder="Ex: A elegância atemporal da alta joalheria, ao alcance dos seus momentos."
                className="w-full bg-stone-50 border border-stone-300 rounded-2xl p-4 text-base font-serif italic font-bold text-stone-900 focus:outline-none focus:border-stone-900 focus:bg-white transition-all"
              />
              <p className="text-[11px] text-stone-500">
                O grande título editorial de abertura que encanta os visitantes e compradores.
              </p>
            </div>

            {/* Subtitle / Bio */}
            <div className="md:col-span-2 space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-stone-600 block">
                4. Subtítulo & Proposta de Valor da Marca (Bio):
              </label>
              <textarea
                rows={3}
                value={formConfig.heroSubtitle}
                onChange={(e) => setFormConfig((prev) => ({ ...prev, heroSubtitle: e.target.value }))}
                placeholder="Ex: Semijoias nobres fundidas em ligas antialérgicas com camada de 10 milésimos de Ouro 18K, zircônias de lapidação suíça e passaporte digital de garantia emitido instantaneamente para você."
                className="w-full bg-stone-50 border border-stone-300 rounded-2xl p-4 text-xs text-stone-700 focus:outline-none focus:border-stone-900 focus:bg-white transition-all leading-relaxed"
              />
              <p className="text-[11px] text-stone-500">
                Explique o diferencial técnico de suas peças (banho em milésimos, níquel-free, garantia, embalagens).
              </p>
            </div>

            {/* Primary CTA button label */}
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-stone-600 block">
                5. Texto do Botão Principal (CTA Loja):
              </label>
              <input
                type="text"
                value={formConfig.ctaPrimaryText}
                onChange={(e) => setFormConfig((prev) => ({ ...prev, ctaPrimaryText: e.target.value }))}
                placeholder="Ex: Comprar na Vitrine Exclusiva"
                className="w-full bg-stone-50 border border-stone-300 rounded-2xl px-4 py-2.5 text-xs text-stone-800 focus:outline-none focus:border-stone-900 focus:bg-white transition-all font-bold uppercase"
              />
            </div>

            {/* Secondary CTA button label */}
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-stone-600 block">
                6. Texto do Botão Secundário (CTA Personalizados):
              </label>
              <input
                type="text"
                value={formConfig.ctaSecondaryText}
                onChange={(e) => setFormConfig((prev) => ({ ...prev, ctaSecondaryText: e.target.value }))}
                placeholder="Ex: Personalizar Meu Colar"
                className="w-full bg-stone-50 border border-stone-300 rounded-2xl px-4 py-2.5 text-xs text-stone-800 focus:outline-none focus:border-stone-900 focus:bg-white transition-all font-bold uppercase"
              />
            </div>

            {/* Footer Slogan */}
            <div className="md:col-span-2 space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-stone-600 block">
                7. Slogan de Direitos Autorais do Rodapé:
              </label>
              <input
                type="text"
                value={formConfig.footerSlogan}
                onChange={(e) => setFormConfig((prev) => ({ ...prev, footerSlogan: e.target.value }))}
                placeholder="Ex: Lumina Haute Joaillerie • Alta Semijoias com Garantia Registrada"
                className="w-full bg-stone-50 border border-stone-300 rounded-2xl px-4 py-2.5 text-xs text-stone-800 focus:outline-none focus:border-stone-900 focus:bg-white transition-all"
              />
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: CONTATOS & REDES SOCIAIS */}
      {activeSubTab === "contact" && (
        <div className="bg-white rounded-3xl border border-stone-200 p-6 sm:p-8 space-y-6 shadow-xs">
          <div className="flex items-center justify-between pb-3 border-b border-stone-100">
            <div className="flex items-center gap-2">
              <Smartphone className="w-5 h-5 text-amber-600" />
              <h3 className="font-serif italic font-bold text-lg text-stone-900">
                Informações de Atendimento & Redes
              </h3>
            </div>
            <span className="text-[10px] font-bold tracking-wider uppercase text-stone-400">
              Canais Oficiais
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-stone-600 flex items-center gap-1.5">
                <Smartphone className="w-3.5 h-3.5 text-emerald-600" />
                <span>WhatsApp Oficial da Loja:</span>
              </label>
              <input
                type="text"
                value={formConfig.contactWhatsapp}
                onChange={(e) => setFormConfig((prev) => ({ ...prev, contactWhatsapp: e.target.value }))}
                placeholder="+55 (19) 98842-1100"
                className="w-full bg-stone-50 border border-stone-300 rounded-2xl px-4 py-2.5 text-xs font-mono text-stone-800 focus:outline-none focus:border-stone-900 focus:bg-white transition-all"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-stone-600 flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-sky-600" />
                <span>E-mail de Atendimento:</span>
              </label>
              <input
                type="email"
                value={formConfig.contactEmail}
                onChange={(e) => setFormConfig((prev) => ({ ...prev, contactEmail: e.target.value }))}
                placeholder="contato@luminasemijoias.com.br"
                className="w-full bg-stone-50 border border-stone-300 rounded-2xl px-4 py-2.5 text-xs text-stone-800 focus:outline-none focus:border-stone-900 focus:bg-white transition-all"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-stone-600 flex items-center gap-1.5">
                <Instagram className="w-3.5 h-3.5 text-rose-600" />
                <span>Instagram Oficial:</span>
              </label>
              <input
                type="text"
                value={formConfig.instagramHandle}
                onChange={(e) => setFormConfig((prev) => ({ ...prev, instagramHandle: e.target.value }))}
                placeholder="@luminasemijoias"
                className="w-full bg-stone-50 border border-stone-300 rounded-2xl px-4 py-2.5 text-xs text-stone-800 focus:outline-none focus:border-stone-900 focus:bg-white transition-all font-semibold"
              />
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-stone-50 border border-stone-200 text-xs text-stone-600 flex items-center gap-3">
            <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0" />
            <div>
              <p className="font-bold text-stone-800">Conformidade com Vendas Omnichannel</p>
              <p className="text-[11px] text-stone-500">
                Esses contatos são anexados automaticamente nas mensagens de confirmação de pedido via WhatsApp e nos Certificados Digitais de Garantia QR.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: PRÉ-VISUALIZAÇÃO INTERATIVA EM TEMPO REAL */}
      {(activeSubTab === "preview" || true) && (
        <div className="bg-stone-950 rounded-3xl border border-stone-800 p-6 sm:p-8 text-white space-y-6 shadow-xl relative overflow-hidden">
          {/* Subtle glow with active primary color */}
          <div
            className="absolute top-0 right-0 w-96 h-96 rounded-full blur-3xl pointer-events-none opacity-20"
            style={{ backgroundColor: formConfig.primaryColor }}
          />

          <div className="relative z-10 flex items-center justify-between pb-4 border-b border-stone-800">
            <div className="flex items-center gap-2">
              <Eye className="w-5 h-5" style={{ color: formConfig.primaryColor }} />
              <h3 className="font-serif italic font-bold text-lg text-stone-100">
                Pré-visualização Interativa da Landing Home
              </h3>
            </div>
            <span
              className="text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded-full border"
              style={{
                borderColor: `${formConfig.primaryColor}60`,
                color: formConfig.primaryColor,
                backgroundColor: `${formConfig.primaryColor}15`,
              }}
            >
              Em Tempo Real
            </span>
          </div>

          {/* Mock Topbar */}
          <div className="p-2.5 rounded-xl bg-stone-900/90 border border-stone-800 text-[11px] flex items-center justify-between text-stone-300">
            <div className="flex items-center gap-2">
              <span
                className="w-2 h-2 rounded-full animate-pulse"
                style={{ backgroundColor: formConfig.primaryColor }}
              />
              <span className="font-semibold uppercase tracking-wider" style={{ color: formConfig.primaryColor }}>
                {formConfig.announcementBarText || "Coleção 2026 • Semijoias Banhadas a Ouro 18K & Ródio Nobre"}
              </span>
            </div>
            <span className="text-stone-500 font-mono text-[10px] hidden sm:inline">
              WhatsApp: {formConfig.contactWhatsapp}
            </span>
          </div>

          {/* Mock Navigation */}
          <div className="p-4 rounded-2xl bg-stone-900/60 border border-stone-800 flex items-center justify-between">
            <div className="flex items-baseline gap-3">
              {formConfig.logoType === "IMAGE" ? (
                <img
                  src={formConfig.logoUrl}
                  alt="Logo"
                  className="h-8 w-auto object-contain"
                />
              ) : (
                <h4 className="text-2xl font-serif italic font-bold text-stone-100">
                  {formConfig.logoText || "Lumina"}
                </h4>
              )}
              <span
                className="text-[10px] font-bold tracking-[0.25em] uppercase"
                style={{ color: formConfig.primaryColor }}
              >
                {formConfig.logoSubtext || "Alta Semijoias"}
              </span>
            </div>

            <button
              type="button"
              className="px-4 py-2 rounded-full font-bold text-[11px] uppercase tracking-wider shadow-sm flex items-center gap-1.5"
              style={{
                backgroundColor: formConfig.primaryColor,
                color: "#0c0a09",
              }}
            >
              <ShoppingBag className="w-3.5 h-3.5" />
              <span>{formConfig.ctaPrimaryText || "Entrar na Loja"}</span>
            </button>
          </div>

          {/* Mock Hero Area */}
          <div className="p-6 sm:p-8 rounded-3xl bg-stone-900/40 border border-stone-800 space-y-4">
            <div
              className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider border shadow-xs"
              style={{
                borderColor: `${formConfig.primaryColor}50`,
                color: formConfig.primaryColor,
                backgroundColor: `${formConfig.primaryColor}15`,
              }}
            >
              <Sparkles className="w-3.5 h-3.5" style={{ color: formConfig.primaryColor }} />
              <span>{formConfig.heroPillBadge || "Exclusividade & Garantia Digital QR"}</span>
            </div>

            <h2 className="text-2xl sm:text-4xl font-serif italic text-stone-100 leading-tight">
              {formConfig.heroHeadline || "A elegância atemporal da alta joalheria, ao alcance dos seus momentos."}
            </h2>

            <p className="text-xs sm:text-sm text-stone-300 font-light leading-relaxed max-w-2xl">
              {formConfig.heroSubtitle || "Semijoias nobres fundidas em ligas antialérgicas com camada de 10 milésimos de Ouro 18K..."}
            </p>

            <div className="flex flex-wrap gap-3 pt-2">
              <button
                type="button"
                className="px-6 py-3 rounded-full font-bold text-xs uppercase tracking-wider flex items-center gap-2 shadow-md"
                style={{
                  backgroundColor: formConfig.primaryColor,
                  color: "#0c0a09",
                }}
              >
                <ShoppingBag className="w-4 h-4" />
                <span>{formConfig.ctaPrimaryText || "Comprar na Vitrine Exclusiva"}</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <button
                type="button"
                className="px-5 py-3 rounded-full font-bold text-xs uppercase tracking-wider border border-stone-700 bg-stone-900/80 text-stone-200 flex items-center gap-2"
              >
                <Crown className="w-4 h-4" style={{ color: formConfig.primaryColor }} />
                <span>{formConfig.ctaSecondaryText || "Personalizar Meu Colar"}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Sticky Bottom Save Action Bar */}
      <div className="bg-white rounded-2xl border border-stone-200 p-4 shadow-md flex items-center justify-between gap-4 sticky bottom-4 z-30">
        <div className="flex items-center gap-2">
          <span
            className="w-3 h-3 rounded-full shadow-xs"
            style={{ backgroundColor: formConfig.primaryColor }}
          />
          <span className="text-xs font-semibold text-stone-700">
            Paleta Ativa: <strong>{activePalette.name}</strong> ({formConfig.primaryColor})
          </span>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => onNavigateTab("home")}
            className="px-4 py-2 rounded-full border border-stone-300 hover:bg-stone-50 text-stone-700 text-xs font-semibold transition-all"
          >
            Visualizar Home
          </button>

          <button
            type="button"
            onClick={() => handleSave()}
            className="px-6 py-2.5 rounded-full bg-stone-900 hover:bg-stone-800 text-amber-300 hover:text-amber-200 font-bold text-xs uppercase tracking-wider transition-all shadow-md flex items-center gap-2 cursor-pointer"
          >
            <Save className="w-4 h-4 text-amber-400" />
            <span>Salvar Configurações da Loja</span>
          </button>
        </div>
      </div>
    </div>
  );
};
