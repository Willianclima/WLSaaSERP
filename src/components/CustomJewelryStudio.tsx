import React, { useState } from "react";
import {
  Crown,
  Sparkles,
  CheckCircle2,
  Lock,
  Layers,
  ArrowRight,
  ShoppingBag,
} from "lucide-react";
import { CustomJewelryOrderSpec, UnifiedOrder } from "../types";

interface CustomJewelryStudioProps {
  onGenerateCustomOrder: (order: UnifiedOrder) => void;
}

export const CustomJewelryStudio: React.FC<CustomJewelryStudioProps> = ({
  onGenerateCustomOrder,
}) => {
  const [engravingName, setEngravingName] = useState("Helena ♡");
  const [fontStyle, setFontStyle] = useState<CustomJewelryOrderSpec["fontStyle"]>("CURSIVA");
  const [gemStone, setGemStone] = useState<CustomJewelryOrderSpec["gemStone"]>("ZIRCONIA_CRISTAL");
  const [bathFinish, setBathFinish] = useState<CustomJewelryOrderSpec["bathFinish"]>("OURO_18K");
  const [chainLengthCm, setChainLengthCm] = useState<CustomJewelryOrderSpec["chainLengthCm"]>(45);
  const [giftBox, setGiftBox] = useState(true);
  const [specialNotes, setSpecialNotes] = useState("Gravação a laser com coração no final.");

  // Customer info for custom order
  const [customerName, setCustomerName] = useState("Marina Albuquerque");
  const [customerPhone, setCustomerPhone] = useState("(11) 98765-4321");
  const [customerEmail, setCustomerEmail] = useState("marina.a@email.com");

  // Calculate pricing
  const basePrice = 249.0;
  const giftBoxPrice = giftBox ? 30.0 : 0.0;
  const totalPrice = basePrice + giftBoxPrice;

  const handleCreateOrder = (e: React.FormEvent) => {
    e.preventDefault();

    const spec: CustomJewelryOrderSpec = {
      engravingName,
      fontStyle,
      gemStone,
      bathFinish,
      chainLengthCm,
      giftBox,
      specialNotes,
    };

    const orderNumber = `ORD-2026-${Math.floor(1850 + Math.random() * 100)}`;
    const newOrder: UnifiedOrder = {
      id: `order-${Date.now()}`,
      organizationId: "org-lumina-01",
      orderNumber,
      channel: "CUSTOM_STUDIO",
      status: "FULFILLMENT_PENDING",
      customerId: `cust-custom-${Date.now()}`,
      customerSnapshot: {
        id: `cust-custom-${Date.now()}`,
        personType: "PF",
        name: customerName,
        phone: customerPhone,
        email: customerEmail,
        document: "***.***.***-**",
      },
      shippingAddress: {
        recipientName: customerName,
        zipCode: "01426-001",
        street: "Rua Oscar Freire",
        number: "1200",
        neighborhood: "Jardins",
        city: "São Paulo",
        state: "SP",
        country: "BRA",
        phone: customerPhone,
      },
      currency: "BRL",
      subtotalAmount: totalPrice,
      discountAmount: 0,
      shippingAmount: 20.0,
      totalAmount: totalPrice + 20.0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      items: [
        {
          id: `item-${Date.now()}`,
          organizationId: "org-lumina-01",
          orderId: `order-${Date.now()}`,
          productId: "prod-4",
          locationId: "loc-lumina-matriz",
          productSnapshot: {
            productId: "prod-4",
            sku: "PERS-0080",
            name: `Colar Placa Personalizada '${engravingName}'`,
            category: "PERSONALIZADOS",
            material: "Liga Nobre Antialérgica",
            bath: bathFinish,
            stones: [gemStone],
            price: totalPrice,
            costPrice: 55.0,
            warrantyMonths: 12,
            isCustomizable: true,
            imageUrl: "https://images.unsplash.com/photo-1611591475819-79b8b4a7b98f?w=600&auto=format&fit=crop&q=80",
            snapshotTimestamp: new Date().toISOString(),
          },
          unitPrice: totalPrice,
          costPriceSnapshot: 55.0,
          discountAmount: 0,
          totalAmount: totalPrice,
          quantity: 1,
          customizationSpec: spec,
          createdAt: new Date().toISOString(),
        },
      ],
      payments: [
        {
          id: `pay-${Date.now()}`,
          organizationId: "org-lumina-01",
          orderId: `order-${Date.now()}`,
          paymentMethod: "PIX",
          gateway: "MERCADOPAGO",
          status: "PAID",
          amount: totalPrice + 20.0,
          installments: 1,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ],
    };

    onGenerateCustomOrder(newOrder);
  };

  return (
    <div className="space-y-8 text-stone-900">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-4 pb-4 border-b border-stone-200">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-stone-400">
              Domínio #8: Personalizados & Snapshot Imutável
            </span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-serif italic font-bold tracking-wide text-stone-900 mt-1">
            Estúdio de Semijoias Personalizadas Sob Demanda
          </h2>
          <p className="text-xs text-stone-600 mt-1 max-w-2xl font-sans leading-relaxed">
            Configurador de nomes, tipografias e banhos. Ao gerar o pedido, um snapshot criptográfico imutável é gravado para a linha de produção.
          </p>
        </div>

        <div className="flex items-center gap-2 bg-stone-100 px-3 py-1.5 rounded-full border border-stone-200 text-xs font-semibold text-stone-700">
          <Lock className="w-3.5 h-3.5 text-stone-900" />
          <span>Snapshot Imutável Ativo</span>
        </div>
      </div>

      {/* Main Studio Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Form: Customizer Options */}
        <div className="lg:col-span-7 bg-white border border-stone-200 rounded-3xl p-6 shadow-xs space-y-6">
          <div className="flex items-center gap-2 pb-3 border-b border-stone-100">
            <Crown className="w-4 h-4 text-amber-600" />
            <h3 className="text-base font-serif italic font-bold text-stone-900">
              Personalização da Peça
            </h3>
          </div>

          <form onSubmit={handleCreateOrder} className="space-y-4 text-xs">
            <div>
              <label className="block text-stone-500 font-semibold mb-1">
                Nome ou Palavra a Gravar
              </label>
              <input
                type="text"
                required
                maxLength={20}
                value={engravingName}
                onChange={(e) => setEngravingName(e.target.value)}
                className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3.5 py-2 text-stone-900 text-sm font-semibold focus:bg-white"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-stone-500 font-semibold mb-1">Estilo Tipográfico</label>
                <select
                  value={fontStyle}
                  onChange={(e) => setFontStyle(e.target.value as any)}
                  className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 text-stone-900 font-medium focus:bg-white"
                >
                  <option value="CURSIVA">Cursiva Manuscrita Delicada</option>
                  <option value="CLASSICA">Clássica Serifada</option>
                  <option value="MINIMALISTA">Minimalista Linear</option>
                  <option value="MODERNA">Moderna Geométrica</option>
                </select>
              </div>

              <div>
                <label className="block text-stone-500 font-semibold mb-1">Banho Nobre</label>
                <select
                  value={bathFinish}
                  onChange={(e) => setBathFinish(e.target.value as any)}
                  className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 text-stone-900 font-medium focus:bg-white"
                >
                  <option value="OURO_18K">Ouro 18K (10 Milésimos)</option>
                  <option value="RODIO_BRANCO">Ródio Branco Premium</option>
                  <option value="ROSE_GOLD">Rosé Gold</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-stone-500 font-semibold mb-1">Pedra Ponto de Luz</label>
                <select
                  value={gemStone}
                  onChange={(e) => setGemStone(e.target.value as any)}
                  className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 text-stone-900 font-medium focus:bg-white"
                >
                  <option value="ZIRCONIA_CRISTAL">Zircônia Cristal 2mm</option>
                  <option value="ESMERALDA_FUSION">Esmeralda Fusion</option>
                  <option value="RUBI_SYNTH">Rubi Rosa</option>
                  <option value="TURMALINA_PARAIBA">Turmalina Paraíba</option>
                </select>
              </div>

              <div>
                <label className="block text-stone-500 font-semibold mb-1">Comprimento Corrente</label>
                <select
                  value={chainLengthCm}
                  onChange={(e) => setChainLengthCm(Number(e.target.value) as any)}
                  className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 text-stone-900 font-medium focus:bg-white"
                >
                  <option value={40}>40 cm (Choker)</option>
                  <option value={45}>45 cm (Padrão Gargantilha)</option>
                  <option value={50}>50 cm</option>
                  <option value={60}>60 cm (Longa)</option>
                </select>
              </div>
            </div>

            <div>
              <label className="flex items-center gap-2 text-stone-800 font-semibold cursor-pointer">
                <input
                  type="checkbox"
                  checked={giftBox}
                  onChange={(e) => setGiftBox(e.target.checked)}
                  className="rounded accent-stone-900"
                />
                <span>Incluir Embalagem de Presente de Luxo (+ R$ 30,00)</span>
              </label>
            </div>

            {/* Customer Details */}
            <div className="pt-4 border-t border-stone-100 space-y-3">
              <h4 className="font-semibold text-stone-800 text-xs">Dados da Compradora</h4>
              <div className="grid grid-cols-2 gap-3">
                <input
                  type="text"
                  required
                  placeholder="Nome do cliente"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 text-stone-900"
                />
                <input
                  type="text"
                  required
                  placeholder="WhatsApp"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 text-stone-900"
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-3 bg-stone-900 hover:bg-stone-800 text-white rounded-full text-xs font-bold uppercase tracking-wider transition-colors shadow-xs"
            >
              Criar Pedido com Snapshot de Produção
            </button>
          </form>
        </div>

        {/* Right Live Preview Box */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-white border-2 border-stone-200 rounded-3xl p-8 shadow-sm space-y-6">
            <div className="text-center pb-4 border-b border-stone-100">
              <span className="text-[10px] font-bold uppercase tracking-widest text-stone-400">
                Visualização da Peça
              </span>
              <h3 className="text-xl font-serif italic font-bold text-stone-900 mt-1">
                Colar Placa Afetiva
              </h3>
            </div>

            {/* Simulated Pendant */}
            <div className="aspect-4/3 bg-stone-50 border border-stone-200 rounded-2xl flex flex-col items-center justify-center p-6 text-center shadow-inner relative overflow-hidden">
              <div className="w-48 h-20 bg-gradient-to-r from-amber-200 via-yellow-100 to-amber-200 border border-amber-300 rounded-xl shadow-md flex items-center justify-center p-4">
                <span
                  className={`text-stone-900 font-bold text-lg select-none ${
                    fontStyle === "CURSIVA"
                      ? "italic font-serif"
                      : fontStyle === "CLASSICA"
                      ? "font-serif tracking-widest uppercase text-sm"
                      : fontStyle === "MINIMALISTA"
                      ? "font-sans tracking-widest text-xs uppercase"
                      : "font-mono"
                  }`}
                >
                  {engravingName || "Seu Nome"}
                </span>
              </div>
              <span className="text-[10px] text-stone-400 mt-3 font-mono">
                Banho: {bathFinish.replace("_", " ")} • {chainLengthCm}cm
              </span>
            </div>

            {/* Snapshot Summary */}
            <div className="bg-stone-50 border border-stone-200 rounded-2xl p-4 space-y-2 text-xs">
              <div className="flex justify-between text-stone-600">
                <span>Preço da Semijoia:</span>
                <span className="font-serif font-bold text-stone-900">R$ {basePrice.toFixed(2)}</span>
              </div>
              {giftBox && (
                <div className="flex justify-between text-stone-600">
                  <span>Embalagem Presente:</span>
                  <span className="font-serif font-bold text-stone-900">R$ {giftBoxPrice.toFixed(2)}</span>
                </div>
              )}
              <div className="pt-2 border-t border-stone-200 flex justify-between font-bold text-stone-900 text-sm">
                <span>Total do Pedido:</span>
                <span className="font-serif text-base">R$ {totalPrice.toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
