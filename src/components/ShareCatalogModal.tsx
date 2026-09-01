import React, { useState } from "react";
import {
  X,
  Share2,
  Copy,
  Check,
  ExternalLink,
  MessageCircle,
  Instagram,
  QrCode,
  Sparkles,
  Smartphone,
  Send,
  Eye,
  Store,
  CheckCircle2,
} from "lucide-react";
import { TenantStore, StoreBrandingConfig } from "../types";

interface ShareCatalogModalProps {
  isOpen: boolean;
  onClose: () => void;
  tenant: TenantStore;
  branding?: StoreBrandingConfig;
  onOpenStorefront: () => void;
}

export const ShareCatalogModal: React.FC<ShareCatalogModalProps> = ({
  isOpen,
  onClose,
  tenant,
  branding,
  onOpenStorefront,
}) => {
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedBio, setCopiedBio] = useState(false);
  const [copiedMsg, setCopiedMsg] = useState(false);

  if (!isOpen) return null;

  const catalogSlug = tenant.slug || "lumina-semijoias";
  const storeName = branding?.logoText || tenant.name || "Lumina Semijoias";
  const storePhone = branding?.contactWhatsapp || tenant.contactWhatsapp || "(19) 99876-5432";
  const cleanPhone = storePhone.replace(/\D/g, "");

  // Base catalog URL
  const catalogUrl = `${window.location.origin}/?loja=${catalogSlug}#catalogo`;

  // Pre-formatted messages for WhatsApp and Instagram
  const whatsappShareText = `Olá! ✨ Dá uma olhadinha no nosso novo Catálogo Online da ${storeName}!\n\n💎 Semijoias finas banhadas a Ouro 18k e Ródio com Garantia de 1 ano.\n🛒 Veja os modelos disponíveis e faça sua encomenda direto pelo link:\n👉 ${catalogUrl}\n\nQualquer dúvida é só me chamar aqui! 💖`;

  const instagramBioText = `💎 Semijoias Finas & Alta Joalheria\n✨ Banho Ouro 18k & Ródio | 1 ano de garantia\n🛒 Catálogo Completo & Pedidos 👇\n${catalogUrl}`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(catalogUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  const handleCopyBio = () => {
    navigator.clipboard.writeText(instagramBioText);
    setCopiedBio(true);
    setTimeout(() => setCopiedBio(false), 2500);
  };

  const handleCopyMsg = () => {
    navigator.clipboard.writeText(whatsappShareText);
    setCopiedMsg(true);
    setTimeout(() => setCopiedMsg(false), 2500);
  };

  const handleDirectWhatsApp = () => {
    const encoded = encodeURIComponent(whatsappShareText);
    window.open(`https://api.whatsapp.com/send?text=${encoded}`, "_blank");
  };

  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(catalogUrl)}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-stone-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="bg-gradient-to-r from-stone-900 via-stone-800 to-stone-900 text-white p-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-400/30 flex items-center justify-center text-amber-400">
              <Share2 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold uppercase tracking-widest text-amber-400 bg-amber-950/80 px-2 py-0.5 rounded-sm">
                  Pronto para Vender
                </span>
              </div>
              <h3 className="text-lg font-serif font-bold text-white tracking-wide">
                Compartilhar Catálogo Online
              </h3>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-stone-400 hover:text-white p-1 rounded-lg hover:bg-stone-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 overflow-y-auto">
          {/* Main Link Box */}
          <div className="bg-stone-50 border border-stone-200 rounded-xl p-4">
            <label className="text-xs font-semibold uppercase tracking-wider text-stone-500 mb-1.5 block">
              Link Direto do seu Catálogo
            </label>
            <div className="flex items-center gap-2">
              <div className="flex-1 bg-white border border-stone-200 rounded-lg px-3.5 py-2 text-xs font-mono text-stone-700 truncate select-all">
                {catalogUrl}
              </div>
              <button
                onClick={handleCopyLink}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-stone-900 text-white rounded-lg text-xs font-semibold hover:bg-stone-800 transition-colors shrink-0 shadow-xs"
              >
                {copiedLink ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Copiado!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copiar Link</span>
                  </>
                )}
              </button>
              <button
                onClick={() => {
                  onClose();
                  onOpenStorefront();
                }}
                className="flex items-center gap-1.5 px-3 py-2 bg-amber-50 text-amber-900 border border-amber-200 rounded-lg text-xs font-semibold hover:bg-amber-100 transition-colors shrink-0"
                title="Ver como o cliente enxerga"
              >
                <Eye className="w-3.5 h-3.5 text-amber-700" />
                <span className="hidden sm:inline">Visualizar Loja</span>
              </button>
            </div>
          </div>

          {/* Quick Channels Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* WhatsApp Card */}
            <div className="border border-emerald-200 bg-emerald-50/40 rounded-xl p-4 flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 text-emerald-800 font-semibold text-sm mb-1.5">
                  <div className="w-6 h-6 rounded-full bg-emerald-600 text-white flex items-center justify-center text-xs">
                    <MessageCircle className="w-3.5 h-3.5" />
                  </div>
                  <span>Enviar para Clientes no WhatsApp</span>
                </div>
                <p className="text-xs text-stone-600 leading-relaxed mb-3">
                  Abre o WhatsApp com mensagem personalizada e link direto pronto para envio individual ou em listas de transmissão.
                </p>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={handleDirectWhatsApp}
                  className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold transition-colors shadow-xs"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Abrir WhatsApp</span>
                </button>
                <button
                  onClick={handleCopyMsg}
                  className="px-3 py-2 bg-white border border-emerald-200 hover:bg-emerald-50 text-emerald-800 rounded-lg text-xs font-semibold transition-colors"
                  title="Copiar texto pronto"
                >
                  {copiedMsg ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            {/* Instagram Bio Card */}
            <div className="border border-rose-200 bg-rose-50/40 rounded-xl p-4 flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 text-rose-800 font-semibold text-sm mb-1.5">
                  <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-amber-500 via-rose-500 to-purple-600 text-white flex items-center justify-center text-xs">
                    <Instagram className="w-3.5 h-3.5" />
                  </div>
                  <span>Colocar na Bio do Instagram</span>
                </div>
                <p className="text-xs text-stone-600 leading-relaxed mb-3">
                  Texto pronto para colar na sua bio do Instagram, facilitando para suas seguidoras verem as peças e pedirem.
                </p>
              </div>

              <button
                onClick={handleCopyBio}
                className="w-full flex items-center justify-center gap-1.5 px-3 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-semibold transition-colors shadow-xs"
              >
                {copiedBio ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-white" />
                    <span>Bio Copiada!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copiar Texto para a Bio</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* QR Code & In-Store Display */}
          <div className="border border-stone-200 rounded-xl p-4 bg-stone-50 flex flex-col sm:flex-row items-center gap-4">
            <div className="w-24 h-24 bg-white p-1.5 rounded-lg border border-stone-200 shadow-xs shrink-0 flex items-center justify-center">
              <img src={qrCodeUrl} alt="QR Code Catálogo" className="w-full h-full object-contain" />
            </div>
            <div className="flex-1 text-center sm:text-left">
              <div className="flex items-center justify-center sm:justify-start gap-1.5 text-stone-900 font-semibold text-sm">
                <QrCode className="w-4 h-4 text-amber-600" />
                <span>QR Code para Balcão e Feiras</span>
              </div>
              <p className="text-xs text-stone-600 mt-1 leading-relaxed">
                Suas clientes apontam a câmera do celular no balcão ou nas caixinhas de envio e abrem o catálogo instantaneamente sem precisar digitar link.
              </p>
              <div className="mt-2.5 flex items-center justify-center sm:justify-start gap-2">
                <a
                  href={qrCodeUrl}
                  target="_blank"
                  rel="noreferrer"
                  download="qr-code-catalogo.png"
                  className="inline-flex items-center gap-1 px-2.5 py-1 bg-white border border-stone-300 hover:bg-stone-100 rounded-md text-[11px] font-medium text-stone-700 transition-colors"
                >
                  <ExternalLink className="w-3 h-3" />
                  <span>Baixar QR Code</span>
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-stone-50 border-t border-stone-200 flex items-center justify-between">
          <div className="text-xs text-stone-500 flex items-center gap-1">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>Catálogo sincronizado com seu estoque em tempo real.</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-stone-900 hover:bg-stone-800 text-white rounded-lg text-xs font-semibold transition-colors"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
