import React, { useState } from "react";
import {
  Sparkles,
  Store,
  Smartphone,
  Package,
  Share2,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  Upload,
  Plus,
  Trash2,
  ShoppingBag,
  ExternalLink,
  Crown,
  Clock,
  Truck,
  ShieldCheck,
  Building2,
  Instagram,
  Mail,
  MapPin,
  FileText,
  Palette,
  X,
} from "lucide-react";
import confetti from "canvas-confetti";
import { TenantStore, StoreBrandingConfig } from "../types";

interface OnboardingWizardModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentTenant: TenantStore;
  currentBranding: StoreBrandingConfig;
  onComplete: (data: any) => Promise<void>;
  onNavigateToTab: (tab: string) => void;
}

export const OnboardingWizardModal: React.FC<OnboardingWizardModalProps> = ({
  isOpen,
  onClose,
  currentTenant,
  currentBranding,
  onComplete,
  onNavigateToTab,
}) => {
  const [step, setStep] = useState<number>(1);
  const [isSaving, setIsSaving] = useState<boolean>(false);

  // Step 1: Identificação da Loja
  const [storeName, setStoreName] = useState<string>(currentTenant?.name || "Lumina Semijoias");
  const [ownerName, setOwnerName] = useState<string>("Maria Fernanda Silva");
  const [documentNumber, setDocumentNumber] = useState<string>("48.291.802/0001-94");
  const [whatsapp, setWhatsapp] = useState<string>("(19) 98765-4321");
  const [instagram, setInstagram] = useState<string>("@luminasemijoias_oficial");
  const [city, setCity] = useState<string>("Limeira");
  const [stateUf, setStateUf] = useState<string>("SP");
  const [email, setEmail] = useState<string>("contato@luminasemijoias.com.br");

  // Step 2: Vitrine & Catálogo
  const [storefrontName, setStorefrontName] = useState<string>(currentTenant?.name || "Lumina Semijoias");
  const [bio, setBio] = useState<string>("Semijoias finas banhadas a ouro 18K e ródio com verniz de proteção e 1 ano de garantia digital.");
  const [logoUrl, setLogoUrl] = useState<string>(
    currentBranding?.logoUrl || "https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?w=200&auto=format&fit=crop&q=80"
  );
  const [bannerUrl, setBannerUrl] = useState<string>(
    "https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?w=1200&auto=format&fit=crop&q=80"
  );
  const [primaryColor, setPrimaryColor] = useState<string>(currentBranding?.primaryColor || "#D97706");
  const [secondaryColor, setSecondaryColor] = useState<string>(currentBranding?.secondaryColor || "#1C1917");

  // Step 3: Atendimento & Entrega
  const [orderWhatsapp, setOrderWhatsapp] = useState<string>("(19) 98765-4321");
  const [businessHours, setBusinessHours] = useState<string>("Seg a Sex das 09h às 18h • Sáb das 09h às 13h");
  const [deliveryPickup, setDeliveryPickup] = useState<boolean>(true);
  const [deliveryLocal, setDeliveryLocal] = useState<boolean>(true);
  const [deliveryShipping, setDeliveryShipping] = useState<boolean>(true);
  const [deliveryCustom, setDeliveryCustom] = useState<boolean>(true);

  // Step 4: Cadastro das Primeiras Peças (Planilha)
  const [initialProducts, setInitialProducts] = useState<Array<{
    id: string;
    sku: string;
    name: string;
    category: string;
    bath: string;
    costPrice: number;
    price: number;
    stock: number;
    warrantyMonths: number;
    imageUrl: string;
  }>>([
    {
      id: "1",
      sku: "ANEL-001",
      name: "Anel Solitário Coroa Imperial Zircônia 6mm",
      category: "ANEIS",
      bath: "OURO_18K",
      costPrice: 32.0,
      price: 99.9,
      stock: 4,
      warrantyMonths: 12,
      imageUrl: "https://images.unsplash.com/photo-1605100804763-247f67b3557e?w=600&auto=format&fit=crop&q=80",
    },
    {
      id: "2",
      sku: "COL-001",
      name: "Colar Riviera Cristal Cravação Francesa 45cm",
      category: "COLARES",
      bath: "OURO_18K",
      costPrice: 58.0,
      price: 189.9,
      stock: 3,
      warrantyMonths: 12,
      imageUrl: "https://images.unsplash.com/photo-1599643477877-530eb83abc8e?w=600&auto=format&fit=crop&q=80",
    },
    {
      id: "3",
      sku: "BR-001",
      name: "Brinco Gota Pérola Barroca & Zircônias",
      category: "BRINCOS",
      bath: "RODIO_BRANCO",
      costPrice: 28.0,
      price: 89.9,
      stock: 5,
      warrantyMonths: 12,
      imageUrl: "https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?w=600&auto=format&fit=crop&q=80",
    },
  ]);

  if (!isOpen) return null;

  const handleAddProductRow = () => {
    const nextIndex = initialProducts.length + 1;
    setInitialProducts([
      ...initialProducts,
      {
        id: String(Date.now()),
        sku: `PECA-${String(nextIndex).padStart(3, "0")}`,
        name: `Nova Semijoia ${nextIndex}`,
        category: "ANEIS",
        bath: "OURO_18K",
        costPrice: 30.0,
        price: 99.0,
        stock: 2,
        warrantyMonths: 12,
        imageUrl: "https://images.unsplash.com/photo-1605100804763-247f67b3557e?w=600&auto=format&fit=crop&q=80",
      },
    ]);
  };

  const handleRemoveProductRow = (id: string) => {
    if (initialProducts.length <= 1) return;
    setInitialProducts(initialProducts.filter((p) => p.id !== id));
  };

  const handleUpdateProductRow = (id: string, field: string, value: any) => {
    setInitialProducts(
      initialProducts.map((p) => (p.id === id ? { ...p, [field]: value } : p))
    );
  };

  const handleLoadSampleCatalog = () => {
    setInitialProducts([
      {
        id: "1",
        sku: "ANEL-001",
        name: "Anel Solitário Coroa Imperial Zircônia 6mm",
        category: "ANEIS",
        bath: "OURO_18K",
        costPrice: 32.0,
        price: 99.9,
        stock: 4,
        warrantyMonths: 12,
        imageUrl: "https://images.unsplash.com/photo-1605100804763-247f67b3557e?w=600&auto=format&fit=crop&q=80",
      },
      {
        id: "2",
        sku: "COL-001",
        name: "Colar Riviera Cristal Cravação Francesa 45cm",
        category: "COLARES",
        bath: "OURO_18K",
        costPrice: 58.0,
        price: 189.9,
        stock: 3,
        warrantyMonths: 12,
        imageUrl: "https://images.unsplash.com/photo-1599643477877-530eb83abc8e?w=600&auto=format&fit=crop&q=80",
      },
      {
        id: "3",
        sku: "BR-001",
        name: "Brinco Gota Pérola Barroca & Zircônias",
        category: "BRINCOS",
        bath: "RODIO_BRANCO",
        costPrice: 28.0,
        price: 89.9,
        stock: 5,
        warrantyMonths: 12,
        imageUrl: "https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?w=600&auto=format&fit=crop&q=80",
      },
      {
        id: "4",
        sku: "PULS-001",
        name: "Pulseira Elos Cartier com Fecho Boia 18cm",
        category: "PULSEIRAS",
        bath: "OURO_18K",
        costPrice: 45.0,
        price: 149.9,
        stock: 3,
        warrantyMonths: 12,
        imageUrl: "https://images.unsplash.com/photo-1611591475878-5e839e9f93ec?w=600&auto=format&fit=crop&q=80",
      },
    ]);
  };

  const handleFinishWizard = async () => {
    setIsSaving(true);
    try {
      const payload = {
        storeIdentity: {
          name: storeName,
          ownerName,
          document: documentNumber,
          whatsapp,
          instagram,
          city,
          state: stateUf,
          email,
        },
        catalogSettings: {
          storefrontName,
          bio,
          logoUrl,
          bannerUrl,
          primaryColor,
          secondaryColor,
        },
        serviceDelivery: {
          orderWhatsapp,
          businessHours,
          deliveryOptions: {
            pickup: deliveryPickup,
            localDelivery: deliveryLocal,
            shipping: deliveryShipping,
            custom: deliveryCustom,
          },
        },
        initialProducts,
      };

      await onComplete(payload);
      setStep(5);
      confetti({
        particleCount: 80,
        spread: 80,
        origin: { y: 0.6 },
      });
    } catch (err: any) {
      alert(err.message || "Erro ao salvar dados de Onboarding");
    } finally {
      setIsSaving(false);
    }
  };

  const progressPercentage = Math.round((step / 5) * 100);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-950/80 backdrop-blur-md overflow-y-auto">
      <div className="bg-stone-900 border border-amber-500/30 rounded-3xl w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden text-stone-100 animate-in fade-in zoom-in-95 duration-200">
        {/* Header with Progress */}
        <div className="p-6 border-b border-stone-800 bg-stone-950/70 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 font-bold">
                <Crown className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-serif font-bold text-stone-100">
                    Assistente de Configuração da Loja
                  </h2>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-400/20 text-amber-300 border border-amber-400/30">
                    Cliente Piloto 01 • Trial 30d
                  </span>
                </div>
                <p className="text-xs text-stone-400">
                  Configure seus dados, vitrine online e primeiras peças em poucos minutos.
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-2 rounded-xl text-stone-400 hover:text-white hover:bg-stone-800 transition-all cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Progress bar */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs font-bold">
              <span className="text-amber-400">
                Passo {step} de 5:{" "}
                {step === 1 && "Dados da Loja"}
                {step === 2 && "Vitrine & Marca"}
                {step === 3 && "Atendimento & Entrega"}
                {step === 4 && "Cadastro de Peças"}
                {step === 5 && "Loja Publicada!"}
              </span>
              <span className="text-stone-400">{progressPercentage}%</span>
            </div>
            <div className="w-full bg-stone-800 rounded-full h-2 overflow-hidden border border-stone-700/50">
              <div
                className="bg-gradient-to-r from-amber-500 to-amber-300 h-full rounded-full transition-all duration-300"
                style={{ width: `${progressPercentage}%` }}
              />
            </div>
          </div>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* STEP 1: DADOS DA LOJA */}
          {step === 1 && (
            <div className="space-y-5 animate-in fade-in duration-200">
              <div className="flex items-center gap-2 text-amber-400">
                <Building2 className="w-5 h-5" />
                <h3 className="text-sm font-bold uppercase tracking-wider">
                  1. Identificação Comercial da Loja
                </h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-stone-300 block mb-1">
                    Nome da Loja / Marca *
                  </label>
                  <input
                    type="text"
                    value={storeName}
                    onChange={(e) => setStoreName(e.target.value)}
                    placeholder="Ex: Lumina Semijoias"
                    className="w-full bg-stone-950 border border-stone-700 rounded-xl px-3.5 py-2.5 text-sm text-stone-100 focus:outline-none focus:border-amber-400"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-stone-300 block mb-1">
                    Nome da Responsável / Consultora *
                  </label>
                  <input
                    type="text"
                    value={ownerName}
                    onChange={(e) => setOwnerName(e.target.value)}
                    placeholder="Ex: Maria Silva"
                    className="w-full bg-stone-950 border border-stone-700 rounded-xl px-3.5 py-2.5 text-sm text-stone-100 focus:outline-none focus:border-amber-400"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-stone-300 block mb-1">
                    CPF ou CNPJ (Opcional)
                  </label>
                  <input
                    type="text"
                    value={documentNumber}
                    onChange={(e) => setDocumentNumber(e.target.value)}
                    placeholder="00.000.000/0001-00"
                    className="w-full bg-stone-950 border border-stone-700 rounded-xl px-3.5 py-2.5 text-sm text-stone-100 focus:outline-none focus:border-amber-400"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-stone-300 block mb-1">
                    WhatsApp Comercial Principal *
                  </label>
                  <input
                    type="text"
                    value={whatsapp}
                    onChange={(e) => setWhatsapp(e.target.value)}
                    placeholder="(00) 90000-0000"
                    className="w-full bg-stone-950 border border-stone-700 rounded-xl px-3.5 py-2.5 text-sm text-stone-100 focus:outline-none focus:border-amber-400"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-stone-300 block mb-1">
                    Instagram Oficial
                  </label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-2.5 text-stone-500 text-sm">@</span>
                    <input
                      type="text"
                      value={instagram.replace("@", "")}
                      onChange={(e) => setInstagram(`@${e.target.value.replace("@", "")}`)}
                      placeholder="minhaloja"
                      className="w-full bg-stone-950 border border-stone-700 rounded-xl pl-8 pr-3.5 py-2.5 text-sm text-stone-100 focus:outline-none focus:border-amber-400"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-stone-300 block mb-1">
                    E-mail de Contato
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="contato@minhaloja.com.br"
                    className="w-full bg-stone-950 border border-stone-700 rounded-xl px-3.5 py-2.5 text-sm text-stone-100 focus:outline-none focus:border-amber-400"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-stone-300 block mb-1">
                    Cidade
                  </label>
                  <input
                    type="text"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder="Ex: Limeira"
                    className="w-full bg-stone-950 border border-stone-700 rounded-xl px-3.5 py-2.5 text-sm text-stone-100 focus:outline-none focus:border-amber-400"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-stone-300 block mb-1">
                    Estado (UF)
                  </label>
                  <input
                    type="text"
                    value={stateUf}
                    onChange={(e) => setStateUf(e.target.value.toUpperCase())}
                    placeholder="SP"
                    maxLength={2}
                    className="w-full bg-stone-950 border border-stone-700 rounded-xl px-3.5 py-2.5 text-sm text-stone-100 focus:outline-none focus:border-amber-400"
                  />
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: VITRINE & MARCA */}
          {step === 2 && (
            <div className="space-y-5 animate-in fade-in duration-200">
              <div className="flex items-center gap-2 text-amber-400">
                <Palette className="w-5 h-5" />
                <h3 className="text-sm font-bold uppercase tracking-wider">
                  2. Personalização da Vitrine &amp; Catálogo
                </h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="text-xs font-bold text-stone-300 block mb-1">
                    Título que aparecerá no Topo do Catálogo
                  </label>
                  <input
                    type="text"
                    value={storefrontName}
                    onChange={(e) => setStorefrontName(e.target.value)}
                    placeholder="Ex: Lumina Semijoias Finas"
                    className="w-full bg-stone-950 border border-stone-700 rounded-xl px-3.5 py-2.5 text-sm text-stone-100 focus:outline-none focus:border-amber-400"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="text-xs font-bold text-stone-300 block mb-1">
                    Bio / Descrição Curta da Loja (Apresentação às Clientes)
                  </label>
                  <textarea
                    rows={2}
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    placeholder="Conte um pouco sobre suas peças, qualidade do banho e garantia..."
                    className="w-full bg-stone-950 border border-stone-700 rounded-xl p-3 text-sm text-stone-100 focus:outline-none focus:border-amber-400"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-stone-300 block mb-1">
                    URL da Logomarca (ou Ícone)
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={logoUrl}
                      onChange={(e) => setLogoUrl(e.target.value)}
                      placeholder="https://..."
                      className="flex-1 bg-stone-950 border border-stone-700 rounded-xl px-3 py-2 text-xs text-stone-100 focus:outline-none focus:border-amber-400"
                    />
                    <img
                      src={logoUrl}
                      alt="Logo preview"
                      className="w-9 h-9 rounded-xl object-cover border border-stone-700 bg-stone-950"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-stone-300 block mb-1">
                    URL do Banner Superior
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={bannerUrl}
                      onChange={(e) => setBannerUrl(e.target.value)}
                      placeholder="https://..."
                      className="flex-1 bg-stone-950 border border-stone-700 rounded-xl px-3 py-2 text-xs text-stone-100 focus:outline-none focus:border-amber-400"
                    />
                    <img
                      src={bannerUrl}
                      alt="Banner preview"
                      className="w-9 h-9 rounded-xl object-cover border border-stone-700 bg-stone-950"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-stone-300 block mb-1">
                    Cor Principal de Destaque
                  </label>
                  <div className="flex items-center gap-3">
                    <input
                      type="color"
                      value={primaryColor}
                      onChange={(e) => setPrimaryColor(e.target.value)}
                      className="w-10 h-10 rounded-xl border border-stone-700 cursor-pointer bg-transparent"
                    />
                    <span className="text-xs font-mono text-stone-300">{primaryColor}</span>
                    <div className="flex gap-1.5 ml-auto">
                      {["#F59E0B", "#FB7185", "#38BDF8", "#10B981"].map((c) => (
                        <button
                          key={c}
                          onClick={() => setPrimaryColor(c)}
                          className="w-6 h-6 rounded-full border border-stone-600 cursor-pointer transition-transform hover:scale-110"
                          style={{ backgroundColor: c }}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: ATENDIMENTO & ENTREGA */}
          {step === 3 && (
            <div className="space-y-5 animate-in fade-in duration-200">
              <div className="flex items-center gap-2 text-amber-400">
                <Truck className="w-5 h-5" />
                <h3 className="text-sm font-bold uppercase tracking-wider">
                  3. Atendimento Comercial &amp; Formas de Entrega
                </h3>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-xs font-bold text-stone-300 block mb-1">
                    WhatsApp para Receber os Pedidos das Clientes *
                  </label>
                  <input
                    type="text"
                    value={orderWhatsapp}
                    onChange={(e) => setOrderWhatsapp(e.target.value)}
                    placeholder="(19) 98765-4321"
                    className="w-full bg-stone-950 border border-stone-700 rounded-xl px-3.5 py-2.5 text-sm text-stone-100 focus:outline-none focus:border-amber-400"
                  />
                  <span className="text-[11px] text-stone-400 mt-1 block">
                    Quando a cliente clicar em "Comprar" no catálogo, a mensagem será enviada para este número.
                  </span>
                </div>

                <div>
                  <label className="text-xs font-bold text-stone-300 block mb-1">
                    Horário de Atendimento
                  </label>
                  <input
                    type="text"
                    value={businessHours}
                    onChange={(e) => setBusinessHours(e.target.value)}
                    placeholder="Seg a Sex 9h às 18h"
                    className="w-full bg-stone-950 border border-stone-700 rounded-xl px-3.5 py-2.5 text-sm text-stone-100 focus:outline-none focus:border-amber-400"
                  />
                </div>

                <div className="space-y-2 pt-2">
                  <label className="text-xs font-bold text-stone-300 block">
                    Formas de Entrega Disponíveis para suas Clientes:
                  </label>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <label className="flex items-center gap-3 p-3 bg-stone-950 border border-stone-800 rounded-2xl cursor-pointer hover:border-stone-700">
                      <input
                        type="checkbox"
                        checked={deliveryPickup}
                        onChange={(e) => setDeliveryPickup(e.target.checked)}
                        className="w-4 h-4 rounded text-amber-500 focus:ring-amber-400"
                      />
                      <div>
                        <span className="text-xs font-bold text-stone-200 block">Retirada Pessoalmente</span>
                        <span className="text-[10px] text-stone-400">Cliente retira no seu espaço / showroom</span>
                      </div>
                    </label>

                    <label className="flex items-center gap-3 p-3 bg-stone-950 border border-stone-800 rounded-2xl cursor-pointer hover:border-stone-700">
                      <input
                        type="checkbox"
                        checked={deliveryLocal}
                        onChange={(e) => setDeliveryLocal(e.target.checked)}
                        className="w-4 h-4 rounded text-amber-500 focus:ring-amber-400"
                      />
                      <div>
                        <span className="text-xs font-bold text-stone-200 block">Entrega Local (Motoboy)</span>
                        <span className="text-[10px] text-stone-400">Entrega rápida na sua cidade</span>
                      </div>
                    </label>

                    <label className="flex items-center gap-3 p-3 bg-stone-950 border border-stone-800 rounded-2xl cursor-pointer hover:border-stone-700">
                      <input
                        type="checkbox"
                        checked={deliveryShipping}
                        onChange={(e) => setDeliveryShipping(e.target.checked)}
                        className="w-4 h-4 rounded text-amber-500 focus:ring-amber-400"
                      />
                      <div>
                        <span className="text-xs font-bold text-stone-200 block">Correios / Transportadora</span>
                        <span className="text-[10px] text-stone-400">Envio para todo o Brasil (PAC/Sedex)</span>
                      </div>
                    </label>

                    <label className="flex items-center gap-3 p-3 bg-stone-950 border border-stone-800 rounded-2xl cursor-pointer hover:border-stone-700">
                      <input
                        type="checkbox"
                        checked={deliveryCustom}
                        onChange={(e) => setDeliveryCustom(e.target.checked)}
                        className="w-4 h-4 rounded text-amber-500 focus:ring-amber-400"
                      />
                      <div>
                        <span className="text-xs font-bold text-stone-200 block">Combinar no WhatsApp</span>
                        <span className="text-[10px] text-stone-400">Alinhamento flexível no fechamento</span>
                      </div>
                    </label>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* STEP 4: CADASTRO DAS PRIMEIRAS PEÇAS (PLANILHA) */}
          {step === 4 && (
            <div className="space-y-5 animate-in fade-in duration-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-amber-400">
                  <Package className="w-5 h-5" />
                  <h3 className="text-sm font-bold uppercase tracking-wider">
                    4. Cadastro das Primeiras Peças (Planilha Rápida)
                  </h3>
                </div>

                <button
                  onClick={handleLoadSampleCatalog}
                  className="px-3 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-400/40 text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-all"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Carregar 4 Peças Modelo</span>
                </button>
              </div>

              <p className="text-xs text-stone-400">
                Cadastre de 1 a 10 peças que você já tem prontas para venda. Você poderá adicionar mais peças e fotos detalhadas a qualquer momento pelo Painel de Catálogo.
              </p>

              {/* Table / Fast Grid */}
              <div className="space-y-3">
                {initialProducts.map((p, idx) => (
                  <div
                    key={p.id}
                    className="p-3.5 bg-stone-950 border border-stone-800 rounded-2xl flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-mono font-bold text-stone-500 w-4">
                        #{idx + 1}
                      </span>
                      <img
                        src={p.imageUrl}
                        alt={p.name}
                        className="w-12 h-12 rounded-xl object-cover border border-stone-700 bg-stone-900 shrink-0"
                      />
                      <div className="space-y-1 flex-1">
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={p.sku}
                            onChange={(e) => handleUpdateProductRow(p.id, "sku", e.target.value.toUpperCase())}
                            placeholder="SKU"
                            className="w-24 bg-stone-900 border border-stone-700 rounded-lg px-2 py-1 text-xs font-mono font-bold text-amber-300"
                          />
                          <input
                            type="text"
                            value={p.name}
                            onChange={(e) => handleUpdateProductRow(p.id, "name", e.target.value)}
                            placeholder="Nome da Peça"
                            className="flex-1 bg-stone-900 border border-stone-700 rounded-lg px-2.5 py-1 text-xs font-bold text-stone-100"
                          />
                        </div>

                        <div className="flex flex-wrap gap-2 text-[11px]">
                          <select
                            value={p.category}
                            onChange={(e) => handleUpdateProductRow(p.id, "category", e.target.value)}
                            className="bg-stone-900 border border-stone-700 rounded-lg px-2 py-0.5 text-stone-300"
                          >
                            <option value="ANEIS">Anéis</option>
                            <option value="COLARES">Colares</option>
                            <option value="BRINCOS">Brincos</option>
                            <option value="PULSEIRAS">Pulseiras</option>
                            <option value="CONJUNTOS">Conjuntos</option>
                          </select>

                          <select
                            value={p.bath}
                            onChange={(e) => handleUpdateProductRow(p.id, "bath", e.target.value)}
                            className="bg-stone-900 border border-stone-700 rounded-lg px-2 py-0.5 text-stone-300"
                          >
                            <option value="OURO_18K">Ouro 18K</option>
                            <option value="RODIO_BRANCO">Ródio Branco</option>
                            <option value="ROSE_GOLD">Rosé Gold</option>
                            <option value="PRATA_925">Prata 925</option>
                          </select>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 justify-between md:justify-end border-t md:border-t-0 border-stone-800 pt-2 md:pt-0">
                      <div className="space-y-0.5">
                        <span className="text-[10px] text-stone-500 block uppercase font-bold">Custo (R$)</span>
                        <input
                          type="number"
                          step="0.01"
                          value={p.costPrice}
                          onChange={(e) => handleUpdateProductRow(p.id, "costPrice", Number(e.target.value))}
                          className="w-20 bg-stone-900 border border-stone-700 rounded-lg px-2 py-1 text-xs text-stone-300"
                        />
                      </div>

                      <div className="space-y-0.5">
                        <span className="text-[10px] text-stone-500 block uppercase font-bold">Venda (R$)</span>
                        <input
                          type="number"
                          step="0.01"
                          value={p.price}
                          onChange={(e) => handleUpdateProductRow(p.id, "price", Number(e.target.value))}
                          className="w-20 bg-stone-900 border border-stone-700 rounded-lg px-2 py-1 text-xs font-bold text-emerald-400"
                        />
                      </div>

                      <div className="space-y-0.5">
                        <span className="text-[10px] text-stone-500 block uppercase font-bold">Estoque</span>
                        <input
                          type="number"
                          value={p.stock}
                          onChange={(e) => handleUpdateProductRow(p.id, "stock", Number(e.target.value))}
                          className="w-14 bg-stone-900 border border-stone-700 rounded-lg px-2 py-1 text-xs text-stone-100"
                        />
                      </div>

                      <button
                        onClick={() => handleRemoveProductRow(p.id)}
                        className="p-1.5 text-stone-600 hover:text-rose-400 transition-colors cursor-pointer self-end"
                        title="Remover linha"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <button
                onClick={handleAddProductRow}
                className="w-full py-3 bg-stone-950 border border-dashed border-stone-700 hover:border-amber-400/60 rounded-2xl text-xs font-bold text-stone-300 hover:text-amber-300 flex items-center justify-center gap-2 cursor-pointer transition-all"
              >
                <Plus className="w-4 h-4" />
                <span>Adicionar Mais uma Peça</span>
              </button>
            </div>
          )}

          {/* STEP 5: CONCLUSÃO & PUBLICAÇÃO */}
          {step === 5 && (
            <div className="space-y-6 text-center py-4 animate-in fade-in zoom-in-95 duration-200">
              <div className="w-16 h-16 rounded-3xl bg-emerald-500/20 border border-emerald-400/40 text-emerald-400 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-8 h-8" />
              </div>

              <div className="space-y-2 max-w-lg mx-auto">
                <h3 className="text-2xl font-serif font-bold text-stone-100">
                  Parabéns! Sua Loja está Publicada 🎉
                </h3>
                <p className="text-sm text-stone-400">
                  O catálogo digital de <strong>{storeName}</strong> já está ativo com {initialProducts.length} peças cadastradas e cálculo automático de estoque.
                </p>
              </div>

              {/* Share Box */}
              <div className="bg-stone-950 border border-amber-500/30 rounded-3xl p-5 max-w-lg mx-auto space-y-4 text-left">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-amber-400 uppercase tracking-wider">
                    Link Oficial do seu Catálogo
                  </span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-bold">
                    ONLINE • PRONTO PARA VENDER
                  </span>
                </div>

                <div className="bg-stone-900 border border-stone-800 rounded-2xl p-3 flex items-center justify-between gap-2">
                  <span className="text-xs font-mono text-stone-300 truncate">
                    {window.location.origin}/?loja={storeName.toLowerCase().replace(/\s+/g, "-")}
                  </span>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(`${window.location.origin}/?loja=${storeName.toLowerCase().replace(/\s+/g, "-")}`);
                      alert("Link do catálogo copiado com sucesso!");
                    }}
                    className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 text-xs font-bold transition-all cursor-pointer shrink-0"
                  >
                    Copiar Link
                  </button>
                </div>

                <div className="flex flex-col sm:flex-row gap-3">
                  <button
                    onClick={() => {
                      const link = `${window.location.origin}/?loja=${storeName.toLowerCase().replace(/\s+/g, "-")}`;
                      const msg = `✨ Olá! Conheça o catálogo de semijoias exclusivas da *${storeName}* com garantia de 12 meses:\n\n👉 ${link}\n\nEscolha suas peças favoritas e me chame por aqui para fechar seu pedido! 💎`;
                      const cleanPhone = orderWhatsapp.replace(/\D/g, "");
                      window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, "_blank");
                    }}
                    className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl text-xs font-bold flex items-center justify-center gap-2 cursor-pointer shadow-md transition-all"
                  >
                    <Smartphone className="w-4 h-4" />
                    <span>Testar no WhatsApp</span>
                  </button>

                  <button
                    onClick={() => {
                      onClose();
                      onNavigateToTab("storefront");
                    }}
                    className="flex-1 py-3 bg-stone-800 hover:bg-stone-700 text-stone-100 rounded-2xl text-xs font-bold flex items-center justify-center gap-2 cursor-pointer transition-all border border-stone-700"
                  >
                    <ShoppingBag className="w-4 h-4" />
                    <span>Ver Catálogo B2C</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer Controls */}
        <div className="p-5 border-t border-stone-800 bg-stone-950/80 flex items-center justify-between">
          {step > 1 && step < 5 ? (
            <button
              onClick={() => setStep(step - 1)}
              className="px-4 py-2.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 text-xs font-bold flex items-center gap-2 cursor-pointer transition-all"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Voltar</span>
            </button>
          ) : <div />}

          <div className="flex items-center gap-3">
            {step < 4 && (
              <button
                onClick={() => setStep(step + 1)}
                className="px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 text-xs font-bold uppercase tracking-wider flex items-center gap-2 cursor-pointer shadow-md transition-all"
              >
                <span>Avançar</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            )}

            {step === 4 && (
              <button
                disabled={isSaving}
                onClick={handleFinishWizard}
                className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white text-xs font-bold uppercase tracking-wider flex items-center gap-2 cursor-pointer shadow-md transition-all"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>{isSaving ? "Salvando Loja..." : "Publicar Minha Loja"}</span>
              </button>
            )}

            {step === 5 && (
              <button
                onClick={() => {
                  onClose();
                  onNavigateToTab("orders");
                }}
                className="px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 text-xs font-bold uppercase tracking-wider flex items-center gap-2 cursor-pointer shadow-md transition-all"
              >
                <span>Acessar Meu Painel de Vendas ERP</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
