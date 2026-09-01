import React, { useState, useEffect } from "react";
import {
  X,
  Sparkles,
  Upload,
  Image as ImageIcon,
  DollarSign,
  Package,
  ShieldCheck,
  Tag,
  Check,
  Layers,
  Percent,
  Plus,
  RefreshCw,
  Eye,
  EyeOff,
  Box,
  MapPin,
  HelpCircle,
  Film,
  PlusCircle,
  Trash2,
} from "lucide-react";
import { ProductItem, JewelryBath, PublicationStatus, ProductVariant, ProductMedia } from "../types";
import { ProductMediaManager, CURATED_JEWELRY_PHOTOS } from "./ProductMediaManager";

interface ProductFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveProduct: (product: ProductItem) => void;
  initialProduct?: ProductItem | null;
}

// Curated high-resolution jewelry photos for quick selection
const PRESET_JEWELRY_PHOTOS = [
  {
    category: "COLARES",
    url: "https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?w=800&auto=format&fit=crop&q=80",
    label: "Gargantilha Fita Ouro 18K",
  },
  {
    category: "COLARES",
    url: "https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?w=800&auto=format&fit=crop&q=80",
    label: "Colar Ponto de Luz",
  },
  {
    category: "BRINCOS",
    url: "https://images.unsplash.com/photo-1630019852942-f89202989a59?w=800&auto=format&fit=crop&q=80",
    label: "Brinco Gota Esmeralda",
  },
  {
    category: "BRINCOS",
    url: "https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?w=800&auto=format&fit=crop&q=80",
    label: "Argola Cravejada Zircônia",
  },
  {
    category: "ANEIS",
    url: "https://images.unsplash.com/photo-1605100804763-247f67b3557e?w=800&auto=format&fit=crop&q=80",
    label: "Solitário Ouro & Zircônia",
  },
  {
    category: "ANEIS",
    url: "https://images.unsplash.com/photo-1603561591411-07134e71a2a9?w=800&auto=format&fit=crop&q=80",
    label: "Anel Aparador Cravejado",
  },
  {
    category: "PULSEIRAS",
    url: "https://images.unsplash.com/photo-1611591475103-4fa1b7765a7f?w=800&auto=format&fit=crop&q=80",
    label: "Riviera de Zircônias",
  },
  {
    category: "CONJUNTOS",
    url: "https://images.unsplash.com/photo-1573408301185-9146fe634ad0?w=800&auto=format&fit=crop&q=80",
    label: "Conjunto Gota Turmalina",
  },
];

export const ProductFormModal: React.FC<ProductFormModalProps> = ({
  isOpen,
  onClose,
  onSaveProduct,
  initialProduct,
}) => {
  const isEditing = !!initialProduct;

  // 1. Informações Básicas
  const [name, setName] = useState("");
  const [sku, setSku] = useState("");
  const [brand, setBrand] = useState("Lumina Haute Joaillerie");
  const [category, setCategory] = useState<ProductItem["category"]>("COLARES");
  const [collection, setCollection] = useState("Coleção 2026");

  // 2. Informações Comerciais
  const [price, setPrice] = useState("189.90");
  const [costPrice, setCostPrice] = useState("45.00");
  const [promoPrice, setPromoPrice] = useState("");

  // 3. Características
  const [bath, setBath] = useState<JewelryBath>("OURO_18K");
  const [material, setMaterial] = useState("Liga Nobre Hipoalergênica");
  const [stones, setStones] = useState("Zircônia Cristal 5A");
  const [stoneColor, setStoneColor] = useState("Cristal Translúcido");
  const [weightGrams, setWeightGrams] = useState("8.5");
  const [dimensions, setDimensions] = useState("45cm + 5cm extensor");

  // 4. Mídia & Galeria Estruturada
  const [mediaList, setMediaList] = useState<ProductMedia[]>([]);
  const [videoUrl, setVideoUrl] = useState("");
  const [description, setDescription] = useState(
    "Semijoia nobre banhada com camadas de ouro 18k e verniz protetor antialérgico. Acompanha certificado de garantia digital."
  );

  // 5. Estoque & Localização
  const [stockPhysical, setStockPhysical] = useState("12");
  const [stockReserved, setStockReserved] = useState("0");
  const [stockLocation, setStockLocation] = useState("Gaveteiro Ouro - Gaveta A1");
  const [minStockAlert, setMinStockAlert] = useState("3");
  const [warrantyMonths, setWarrantyMonths] = useState(12);

  // 6. Publicação (ESTOQUE ≠ PUBLICAÇÃO)
  const [publicationStatus, setPublicationStatus] = useState<PublicationStatus>("PUBLISHED");

  // Tab de navegação no formulário para organização impecável
  const [activeFormTab, setActiveFormTab] = useState<"BASIC" | "COMMERCIAL" | "CHARACTERISTICS" | "MEDIA" | "STOCK" | "PUBLISH">("BASIC");

  // Populate form if editing
  useEffect(() => {
    if (initialProduct) {
      setName(initialProduct.name);
      setSku(initialProduct.sku);
      setBrand(initialProduct.brand || "Lumina Haute Joaillerie");
      setCategory(initialProduct.category);
      setCollection(initialProduct.collection || "Coleção 2026");

      setPrice(String(initialProduct.price));
      setCostPrice(String(initialProduct.costPrice || 0));
      setPromoPrice(initialProduct.promoPrice ? String(initialProduct.promoPrice) : "");

      setBath(initialProduct.bath);
      setMaterial(initialProduct.material || "Liga Nobre Hipoalergênica");
      setStones(initialProduct.stones ? initialProduct.stones.join(", ") : "");
      setStoneColor(initialProduct.stoneColor || "Cristal Translúcido");
      setWeightGrams(initialProduct.weightGrams ? String(initialProduct.weightGrams) : "8.5");
      setDimensions(initialProduct.dimensions || "");

      // Normalize media
      if (initialProduct.media && initialProduct.media.length > 0) {
        setMediaList(initialProduct.media);
      } else {
        const initialGallery = initialProduct.galleryUrls || (initialProduct.imageUrl ? [initialProduct.imageUrl] : []);
        const constructedMedia: ProductMedia[] = initialGallery.map((url, idx) => ({
          id: `med-${initialProduct.id}-${idx}`,
          product_id: initialProduct.id,
          type: "IMAGE",
          url,
          sort_order: idx + 1,
          is_primary: idx === 0,
          alt_text: `${initialProduct.name} - Ângulo ${idx + 1}`,
          created_at: new Date().toISOString(),
        }));
        setMediaList(constructedMedia);
      }

      setVideoUrl(initialProduct.videoUrl || "");
      setDescription(initialProduct.description || "");

      setStockPhysical(String(initialProduct.stockPhysical));
      setStockReserved(String(initialProduct.stockReserved || 0));
      setStockLocation(initialProduct.stockLocation || "Gaveteiro Geral");
      setMinStockAlert(String(initialProduct.minStockAlert || 3));
      setWarrantyMonths(initialProduct.warrantyMonths || 12);

      setPublicationStatus(initialProduct.publicationStatus || (initialProduct.status === "ATIVO" ? "PUBLISHED" : "DRAFT"));
    } else {
      // Default reset
      setName("");
      generateAutoSku("COLARES");
      setBrand("Lumina Haute Joaillerie");
      setCategory("COLARES");
      setCollection("Coleção 2026");
      setBath("OURO_18K");
      setPrice("189.90");
      setCostPrice("45.00");
      setPromoPrice("");
      setStockPhysical("12");
      setStockReserved("0");
      setStockLocation("Gaveteiro Ouro - Gaveta A1");
      setMinStockAlert("3");
      setPublicationStatus("PUBLISHED");
      setMediaList([
        {
          id: `med-init-1`,
          product_id: "prod-new",
          type: "IMAGE",
          url: PRESET_JEWELRY_PHOTOS[0].url,
          sort_order: 1,
          is_primary: true,
          alt_text: "Gargantilha Fita Ouro 18K - Frente",
          created_at: new Date().toISOString(),
        },
      ]);
      setDescription(
        "Semijoia nobre banhada com camadas de ouro 18k e verniz protetor antialérgico. Acompanha certificado de garantia digital."
      );
    }
  }, [initialProduct, isOpen]);

  const generateAutoSku = (cat: string) => {
    const prefixMap: Record<string, string> = {
      COLARES: "LUM-COL",
      BRINCOS: "LUM-BRI",
      ANEIS: "LUM-ANE",
      PULSEIRAS: "LUM-PUL",
      CONJUNTOS: "LUM-CNJ",
      PERSONALIZADOS: "LUM-PER",
    };
    const prefix = prefixMap[cat] || "LUM-JOIA";
    const randomNum = Math.floor(100 + Math.random() * 900);
    setSku(`${prefix}-${randomNum}`);
  };

  if (!isOpen) return null;

  // Real-time calculations
  const priceNum = parseFloat(price) || 0;
  const costNum = parseFloat(costPrice) || 0;
  const promoNum = promoPrice ? parseFloat(promoPrice) : null;
  const effectivePrice = promoNum !== null && promoNum > 0 ? promoNum : priceNum;
  const profit = effectivePrice - costNum;
  const marginPercent = effectivePrice > 0 ? Math.round((profit / effectivePrice) * 100) : 0;

  const physicalNum = parseInt(stockPhysical) || 0;
  const reservedNum = parseInt(stockReserved) || 0;
  const availableStock = Math.max(0, physicalNum - reservedNum);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !sku.trim()) return;

    const stonesArray = stones
      ? stones.split(",").map((s) => s.trim()).filter(Boolean)
      : ["Zircônia Cristal"];

    const primaryMediaUrl = mediaList[0]?.url || PRESET_JEWELRY_PHOTOS[0].url;
    const gallery = mediaList.map((m) => m.url);

    const finalProduct: ProductItem = {
      id: initialProduct?.id || `prod-${Date.now()}`,
      sku: sku.trim(),
      name: name.trim(),
      brand: brand.trim() || "Lumina Haute Joaillerie",
      category,
      collection: collection.trim() || "Coleção 2026",

      // Características
      material: material.trim(),
      bath,
      stones: stonesArray,
      stoneColor: stoneColor.trim(),
      weightGrams: parseFloat(weightGrams) || undefined,
      dimensions: dimensions.trim() || undefined,

      // Informações Comerciais
      price: priceNum,
      costPrice: costNum,
      promoPrice: promoNum !== null && promoNum > 0 ? promoNum : undefined,
      marginPercent,

      // Estoque
      stockPhysical: physicalNum,
      stockReserved: reservedNum,
      stockConsigned: initialProduct?.stockConsigned || 0,
      stockAvailable: availableStock,
      stockLocation: stockLocation.trim(),
      minStockAlert: parseInt(minStockAlert) || 3,

      // Mídia & Galeria Estruturada
      imageUrl: primaryMediaUrl,
      galleryUrls: gallery.length > 0 ? gallery : [primaryMediaUrl],
      media: mediaList,
      videoUrl: videoUrl.trim() || undefined,
      description: description.trim(),

      // Publicação vs Estoque
      publicationStatus,
      status: publicationStatus === "PUBLISHED" ? (physicalNum > 0 ? "ATIVO" : "ESGOTADO") : "PAUSADO",

      warrantyMonths,
      isCustomizable: category === "PERSONALIZADOS",
    };

    onSaveProduct(finalProduct);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl bg-white rounded-3xl shadow-2xl border border-stone-200 overflow-hidden flex flex-col max-h-[94vh]">
        {/* Header */}
        <div className="bg-gradient-to-r from-stone-900 via-stone-800 to-stone-900 text-white p-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-amber-500/20 border border-amber-400/30 flex items-center justify-center text-amber-400 font-bold">
              <Package className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold uppercase tracking-widest text-amber-400 bg-amber-950/80 px-2.5 py-0.5 rounded-full border border-amber-500/30">
                  {isEditing ? "Product Readiness Editor" : "Novo Cadastro Completo"}
                </span>
                <span className="text-xs text-stone-400 font-mono">
                  {sku ? `SKU: ${sku}` : "Estrutura Comercial & Catálogo"}
                </span>
              </div>
              <h3 className="text-lg font-serif font-bold text-white tracking-wide mt-0.5">
                {isEditing ? `Gerenciar: ${name || "Semijoia"}` : "Cadastrar Nova Peça no Ecossistema"}
              </h3>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-stone-400 hover:text-white p-2 rounded-xl hover:bg-stone-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs for Clean Readiness Structure */}
        <div className="bg-stone-50 border-b border-stone-200 px-6 py-2 flex items-center gap-2 overflow-x-auto text-xs font-semibold">
          <button
            type="button"
            onClick={() => setActiveFormTab("BASIC")}
            className={`px-3 py-1.5 rounded-xl transition-all flex items-center gap-1.5 ${
              activeFormTab === "BASIC"
                ? "bg-white text-stone-900 shadow-xs border border-stone-200"
                : "text-stone-600 hover:text-stone-900"
            }`}
          >
            <Tag className="w-3.5 h-3.5 text-stone-500" />
            <span>1. Informações Básicas</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveFormTab("COMMERCIAL")}
            className={`px-3 py-1.5 rounded-xl transition-all flex items-center gap-1.5 ${
              activeFormTab === "COMMERCIAL"
                ? "bg-white text-stone-900 shadow-xs border border-stone-200"
                : "text-stone-600 hover:text-stone-900"
            }`}
          >
            <DollarSign className="w-3.5 h-3.5 text-emerald-600" />
            <span>2. Comercial &amp; Margem</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveFormTab("CHARACTERISTICS")}
            className={`px-3 py-1.5 rounded-xl transition-all flex items-center gap-1.5 ${
              activeFormTab === "CHARACTERISTICS"
                ? "bg-white text-stone-900 shadow-xs border border-stone-200"
                : "text-stone-600 hover:text-stone-900"
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            <span>3. Características &amp; Banho</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveFormTab("MEDIA")}
            className={`px-3 py-1.5 rounded-xl transition-all flex items-center gap-1.5 ${
              activeFormTab === "MEDIA"
                ? "bg-white text-stone-900 shadow-xs border border-stone-200"
                : "text-stone-600 hover:text-stone-900"
            }`}
          >
            <ImageIcon className="w-3.5 h-3.5 text-sky-500" />
            <span>4. Fotos &amp; Mídia</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveFormTab("STOCK")}
            className={`px-3 py-1.5 rounded-xl transition-all flex items-center gap-1.5 ${
              activeFormTab === "STOCK"
                ? "bg-white text-stone-900 shadow-xs border border-stone-200"
                : "text-stone-600 hover:text-stone-900"
            }`}
          >
            <Box className="w-3.5 h-3.5 text-indigo-500" />
            <span>5. Estoque &amp; Local</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveFormTab("PUBLISH")}
            className={`px-3 py-1.5 rounded-xl transition-all flex items-center gap-1.5 ${
              activeFormTab === "PUBLISH"
                ? "bg-white text-stone-900 shadow-xs border border-stone-200"
                : "text-stone-600 hover:text-stone-900"
            }`}
          >
            <Eye className="w-3.5 h-3.5 text-amber-600" />
            <span>6. Publicação (Catálogo)</span>
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-6 flex-1">
          {/* TAB 1: Informações Básicas */}
          {activeFormTab === "BASIC" && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <div className="border-b border-stone-100 pb-3">
                <h4 className="text-sm font-bold text-stone-900">Identificação da Semijoia</h4>
                <p className="text-xs text-stone-500">Dados cadastrais fundamentais e hierarquia de produto.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-xs font-semibold text-stone-700 mb-1">
                    Nome Comercial da Peça *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Colar Riviera Cravejado Zircônias 3mm"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3.5 py-2.5 text-xs text-stone-900 focus:bg-white focus:outline-none focus:border-stone-400 font-medium"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-semibold text-stone-700">
                      Código SKU *
                    </label>
                    <button
                      type="button"
                      onClick={() => generateAutoSku(category)}
                      className="text-[10px] text-amber-800 font-semibold hover:underline flex items-center gap-0.5"
                    >
                      <RefreshCw className="w-2.5 h-2.5" />
                      <span>Gerar SKU Automático</span>
                    </button>
                  </div>
                  <input
                    type="text"
                    required
                    value={sku}
                    onChange={(e) => setSku(e.target.value)}
                    className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3.5 py-2 text-xs font-mono text-stone-900 focus:bg-white focus:outline-none focus:border-stone-400"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">
                    Categoria *
                  </label>
                  <select
                    value={category}
                    onChange={(e) => {
                      const newCat = e.target.value as ProductItem["category"];
                      setCategory(newCat);
                      if (!isEditing) generateAutoSku(newCat);
                    }}
                    className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 text-xs text-stone-900 focus:bg-white cursor-pointer"
                  >
                    <option value="COLARES">Colares &amp; Gargantilhas</option>
                    <option value="BRINCOS">Brincos &amp; Argolas</option>
                    <option value="ANEIS">Anéis &amp; Solitários</option>
                    <option value="PULSEIRAS">Pulseiras &amp; Braceletes</option>
                    <option value="CONJUNTOS">Conjuntos Completos</option>
                    <option value="PERSONALIZADOS">Personalizados &amp; Gravação</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">
                    Marca / Linha
                  </label>
                  <input
                    type="text"
                    value={brand}
                    onChange={(e) => setBrand(e.target.value)}
                    placeholder="Ex: Lumina Haute Joaillerie"
                    className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3.5 py-2 text-xs text-stone-900 focus:bg-white focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">
                    Coleção
                  </label>
                  <input
                    type="text"
                    value={collection}
                    onChange={(e) => setCollection(e.target.value)}
                    placeholder="Ex: Coleção Alta Noite 2026"
                    className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3.5 py-2 text-xs text-stone-900 focus:bg-white focus:outline-none"
                  />
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: Informações Comerciais */}
          {activeFormTab === "COMMERCIAL" && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <div className="border-b border-stone-100 pb-3 flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-bold text-stone-900">Precificação &amp; Margens de Lucro</h4>
                  <p className="text-xs text-stone-500">Cálculo dinâmico de retorno unitário e promoções.</p>
                </div>

                {/* Profit Live Pill */}
                <div className="bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-full text-xs font-bold text-emerald-900 flex items-center gap-1.5">
                  <Percent className="w-3.5 h-3.5 text-emerald-700" />
                  <span>Margem Bruta: {marginPercent}% (Lucro: R$ {profit.toFixed(2)} /un)</span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-stone-50 p-4 rounded-2xl border border-stone-200 space-y-1">
                  <label className="block text-xs font-semibold text-stone-700">
                    Preço de Venda Regular (R$) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    className="w-full bg-white border border-stone-200 rounded-xl px-3.5 py-2.5 text-base font-bold text-stone-900 focus:outline-none focus:border-stone-400"
                  />
                  <span className="text-[10px] text-stone-500 block">Preço padrão exibido no catálogo online.</span>
                </div>

                <div className="bg-amber-50/60 p-4 rounded-2xl border border-amber-200 space-y-1">
                  <label className="block text-xs font-semibold text-amber-950">
                    Preço Promocional (R$) - Opcional
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="Ex: 159.90"
                    value={promoPrice}
                    onChange={(e) => setPromoPrice(e.target.value)}
                    className="w-full bg-white border border-amber-300 rounded-xl px-3.5 py-2.5 text-base font-bold text-amber-950 focus:outline-none"
                  />
                  <span className="text-[10px] text-amber-800 block">Se preenchido, ativa a tag de "PROMOÇÃO".</span>
                </div>

                <div className="bg-stone-50 p-4 rounded-2xl border border-stone-200 space-y-1">
                  <label className="block text-xs font-semibold text-stone-700">
                    Custo Bruto Unitário (R$)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={costPrice}
                    onChange={(e) => setCostPrice(e.target.value)}
                    className="w-full bg-white border border-stone-200 rounded-xl px-3.5 py-2.5 text-base font-mono text-stone-700 focus:outline-none"
                  />
                  <span className="text-[10px] text-stone-500 block">Matéria-prima, banho e montagem.</span>
                </div>
              </div>

              {/* Commission Simulation Bar */}
              <div className="p-4 rounded-2xl bg-stone-900 text-white text-xs space-y-2">
                <span className="text-amber-400 font-bold uppercase tracking-wider text-[10px]">
                  Simulação de Distribuição Comercial por Venda (Preço R$ {effectivePrice.toFixed(2)})
                </span>
                <div className="grid grid-cols-3 gap-3 text-stone-300 pt-1">
                  <div>
                    <span className="text-[10px] text-stone-400 block">Custo Fornecedor</span>
                    <span className="font-bold text-white">R$ {costNum.toFixed(2)} ({effectivePrice > 0 ? Math.round((costNum/effectivePrice)*100) : 0}%)</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-stone-400 block">Comissão Revendedora (25%)</span>
                    <span className="font-bold text-amber-300">R$ {(effectivePrice * 0.25).toFixed(2)}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-stone-400 block">Lucro Líquido da Loja</span>
                    <span className="font-bold text-emerald-400">R$ {(profit - (effectivePrice * 0.25)).toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: Características */}
          {activeFormTab === "CHARACTERISTICS" && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <div className="border-b border-stone-100 pb-3">
                <h4 className="text-sm font-bold text-stone-900">Composição &amp; Atributos de Luxo</h4>
                <p className="text-xs text-stone-500">Detalhes técnicos que garantem a conversão e valor percebido.</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">
                    Banho Nobre *
                  </label>
                  <select
                    value={bath}
                    onChange={(e) => setBath(e.target.value as JewelryBath)}
                    className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-2.5 text-xs text-stone-900 focus:bg-white cursor-pointer"
                  >
                    <option value="OURO_18K">✨ Ouro 18K (10 Milésimos Nobre)</option>
                    <option value="RODIO_BRANCO">⚪ Ródio Branco Suíço</option>
                    <option value="RODIO_NEGRO">⚫ Ródio Negro Grafite</option>
                    <option value="PRATA_925">🔘 Prata 925 Legítima</option>
                    <option value="ROSE_GOLD">🌸 Rosé Gold Italiano</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">
                    Material Base Hipoalergênico
                  </label>
                  <input
                    type="text"
                    value={material}
                    onChange={(e) => setMaterial(e.target.value)}
                    placeholder="Ex: Liga Nobre de Latão Isenta de Níquel"
                    className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3.5 py-2 text-xs text-stone-900 focus:bg-white focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">
                    Pedrarias &amp; Cravamento
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: Zircônia Baguete 5A, Esmeralda Fusion"
                    value={stones}
                    onChange={(e) => setStones(e.target.value)}
                    className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3.5 py-2 text-xs text-stone-900 focus:bg-white focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">
                    Tonalidade da Gema / Cor
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: Cristal Translúcido, Verde Esmeralda, Azul Safira"
                    value={stoneColor}
                    onChange={(e) => setStoneColor(e.target.value)}
                    className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3.5 py-2 text-xs text-stone-900 focus:bg-white focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">
                    Dimensões / Comprimento / Aro
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: 45cm + 5cm extensor / Aros 16 ao 22"
                    value={dimensions}
                    onChange={(e) => setDimensions(e.target.value)}
                    className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3.5 py-2 text-xs text-stone-900 focus:bg-white focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">
                    Peso Estimado (gramas)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    placeholder="Ex: 12.5"
                    value={weightGrams}
                    onChange={(e) => setWeightGrams(e.target.value)}
                    className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3.5 py-2 text-xs text-stone-900 focus:bg-white focus:outline-none font-mono"
                  />
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: Fotos & Mídia */}
          {activeFormTab === "MEDIA" && (
            <div className="space-y-5 animate-in fade-in duration-150">
              {/* Product Media Manager with Drag & Drop, Reordering & Primary setting */}
              <ProductMediaManager
                productId={initialProduct?.id || "prod-new"}
                productName={name || "Semijoia"}
                media={mediaList}
                onChange={(updated) => setMediaList(updated)}
              />

              {/* Video Demonstrative link */}
              <div className="bg-stone-50 border border-stone-200 rounded-2xl p-4 space-y-2">
                <label className="block text-xs font-semibold text-stone-800">
                  Link de Vídeo Demonstrativo (Instagram Reels / TikTok / YouTube / MP4)
                </label>
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-white rounded-xl border border-stone-200 text-stone-600">
                    <Film className="w-4 h-4 text-amber-600" />
                  </div>
                  <input
                    type="url"
                    value={videoUrl}
                    onChange={(e) => setVideoUrl(e.target.value)}
                    placeholder="https://instagram.com/reel/... ou https://cdn.lumina.com/video.mp4"
                    className="flex-1 bg-white border border-stone-200 rounded-xl px-3.5 py-2 text-xs text-stone-900 focus:outline-none"
                  />
                </div>
                <span className="text-[11px] text-stone-500 block">
                  Vídeos demonstrando o brilho da peça e o caimento no colo aumentam o ticket médio.
                </span>
              </div>

              {/* Commercial Description */}
              <div className="bg-stone-50 border border-stone-200 rounded-2xl p-4 space-y-2">
                <label className="block text-xs font-semibold text-stone-800">
                  Descrição Comercial para o Catálogo &amp; WhatsApp
                </label>
                <textarea
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Descreva a elegância, conforto, banho nobre e ocasiões ideais..."
                  className="w-full bg-white border border-stone-200 rounded-xl px-3.5 py-2 text-xs text-stone-900 focus:outline-none leading-relaxed"
                />
              </div>
            </div>
          )}

          {/* TAB 5: Estoque & Localização */}
          {activeFormTab === "STOCK" && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <div className="border-b border-stone-100 pb-3 flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-bold text-stone-900">Gestão Física de Estoque &amp; Localização</h4>
                  <p className="text-xs text-stone-500">Saldo no cofre, peças reservadas e localização física na matriz.</p>
                </div>
                <div className="bg-indigo-50 border border-indigo-200 px-3 py-1 rounded-full text-xs font-bold text-indigo-900">
                  Saldo Disponível p/ Venda: {availableStock} un
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-stone-50 p-4 rounded-2xl border border-stone-200 space-y-1">
                  <label className="block text-xs font-semibold text-stone-700">
                    Estoque Físico Total (un) *
                  </label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={stockPhysical}
                    onChange={(e) => setStockPhysical(e.target.value)}
                    className="w-full bg-white border border-stone-200 rounded-xl px-3 py-2 text-sm font-bold text-stone-900 focus:outline-none"
                  />
                  <span className="text-[10px] text-stone-500 block">Total presente no cofre/depósito.</span>
                </div>

                <div className="bg-amber-50/60 p-4 rounded-2xl border border-amber-200 space-y-1">
                  <label className="block text-xs font-semibold text-amber-950">
                    Estoque Reservado (un)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={stockReserved}
                    onChange={(e) => setStockReserved(e.target.value)}
                    className="w-full bg-white border border-amber-300 rounded-xl px-3 py-2 text-sm font-bold text-amber-950 focus:outline-none"
                  />
                  <span className="text-[10px] text-amber-800 block">Em pedidos aguardando pagamento ou separação.</span>
                </div>

                <div className="bg-stone-50 p-4 rounded-2xl border border-stone-200 space-y-1">
                  <label className="block text-xs font-semibold text-stone-700">
                    Alerta de Estoque Mínimo
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={minStockAlert}
                    onChange={(e) => setMinStockAlert(e.target.value)}
                    className="w-full bg-white border border-stone-200 rounded-xl px-3 py-2 text-sm font-bold text-stone-900 focus:outline-none"
                  />
                  <span className="text-[10px] text-stone-500 block">Avisa quando for necessário reposição no banho.</span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">
                    Localização Física / Armazenamento
                  </label>
                  <input
                    type="text"
                    value={stockLocation}
                    onChange={(e) => setStockLocation(e.target.value)}
                    placeholder="Ex: Gaveteiro Ouro - Gaveta A1 / Expositor Central"
                    className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3.5 py-2 text-xs text-stone-900"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">
                    Meses de Garantia do Banho
                  </label>
                  <select
                    value={warrantyMonths}
                    onChange={(e) => setWarrantyMonths(Number(e.target.value))}
                    className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 text-xs text-stone-900"
                  >
                    <option value={6}>6 Meses</option>
                    <option value={12}>12 Meses (1 Ano)</option>
                    <option value={24}>24 Meses (2 Anos)</option>
                    <option value={36}>36 Meses (Garantia Premium)</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* TAB 6: Publicação (ESTOQUE ≠ PUBLICAÇÃO) */}
          {activeFormTab === "PUBLISH" && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <div className="border-b border-stone-100 pb-3">
                <h4 className="text-sm font-bold text-stone-900">Visibilidade &amp; Status de Publicação</h4>
                <p className="text-xs text-stone-500">
                  Separação estrita entre existência física no estoque e presença no catálogo aberto.
                </p>
              </div>

              {/* Status Selector Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <button
                  type="button"
                  onClick={() => setPublicationStatus("PUBLISHED")}
                  className={`p-4 rounded-2xl border text-left transition-all flex flex-col justify-between space-y-2 cursor-pointer ${
                    publicationStatus === "PUBLISHED"
                      ? "bg-emerald-50/80 border-emerald-500 ring-2 ring-emerald-400"
                      : "bg-white border-stone-200 hover:border-stone-300"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-emerald-900 flex items-center gap-1.5">
                      <Eye className="w-4 h-4 text-emerald-700" />
                      <span>🟢 Publicado (Ativo)</span>
                    </span>
                    {publicationStatus === "PUBLISHED" && <Check className="w-4 h-4 text-emerald-600" />}
                  </div>
                  <p className="text-[11px] text-stone-600 leading-relaxed">
                    Visível no catálogo online, sacola de compras e link para clientes do WhatsApp.
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => setPublicationStatus("DRAFT")}
                  className={`p-4 rounded-2xl border text-left transition-all flex flex-col justify-between space-y-2 cursor-pointer ${
                    publicationStatus === "DRAFT"
                      ? "bg-amber-50/80 border-amber-500 ring-2 ring-amber-400"
                      : "bg-white border-stone-200 hover:border-stone-300"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-amber-900 flex items-center gap-1.5">
                      <Tag className="w-4 h-4 text-amber-700" />
                      <span>🟡 Rascunho (DRAFT)</span>
                    </span>
                    {publicationStatus === "DRAFT" && <Check className="w-4 h-4 text-amber-600" />}
                  </div>
                  <p className="text-[11px] text-stone-600 leading-relaxed">
                    Existe no estoque, mas <strong>NÃO aparece</strong> no catálogo público até ser aprovado.
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => setPublicationStatus("HIDDEN")}
                  className={`p-4 rounded-2xl border text-left transition-all flex flex-col justify-between space-y-2 cursor-pointer ${
                    publicationStatus === "HIDDEN"
                      ? "bg-stone-100 border-stone-500 ring-2 ring-stone-400"
                      : "bg-white border-stone-200 hover:border-stone-300"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-stone-900 flex items-center gap-1.5">
                      <EyeOff className="w-4 h-4 text-stone-600" />
                      <span>👁️ Oculto / Privado</span>
                    </span>
                    {publicationStatus === "HIDDEN" && <Check className="w-4 h-4 text-stone-700" />}
                  </div>
                  <p className="text-[11px] text-stone-600 leading-relaxed">
                    Acessível apenas por link exclusivo para clientes VIPs ou consignação direta.
                  </p>
                </button>
              </div>

              {/* Distinction Explainer Box */}
              <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-xs text-amber-950 space-y-1.5">
                <span className="font-bold flex items-center gap-1">
                  <ShieldCheck className="w-4 h-4 text-amber-700" />
                  Comportamento no Catálogo Online para esta peça:
                </span>
                <p className="text-[11px] text-amber-900 leading-relaxed">
                  {publicationStatus === "PUBLISHED" && physicalNum > 0 && (
                    <>✅ Peça com <strong>{physicalNum} un em estoque</strong> e status <strong>PUBLICADO</strong>. Clientes podem comprar normalmente pelo catálogo.</>
                  )}
                  {publicationStatus === "PUBLISHED" && physicalNum === 0 && (
                    <>🔴 Peça com <strong>0 em estoque</strong> mas status <strong>PUBLICADO</strong>. O catálogo exibirá o selo <strong>"ESGOTADO"</strong> e habilitará aviso de reposição.</>
                  )}
                  {publicationStatus === "DRAFT" && (
                    <>⚠️ Peça em <strong>RASCUNHO</strong> com <strong>{physicalNum} un físicas</strong>. Oculta das clientes finais até você mudar para Publicado.</>
                  )}
                  {publicationStatus === "HIDDEN" && (
                    <>🔒 Peça <strong>OCULTA</strong>. Não aparecerá na listagem geral do catálogo.</>
                  )}
                </p>
              </div>
            </div>
          )}

          {/* Footer Actions */}
          <div className="pt-4 border-t border-stone-200 flex items-center justify-between">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 font-semibold text-xs transition-colors"
            >
              Cancelar
            </button>

            <div className="flex items-center gap-2">
              <button
                type="submit"
                className="px-6 py-2.5 rounded-xl bg-stone-900 hover:bg-stone-800 text-white font-bold text-xs uppercase tracking-wider transition-colors shadow-md flex items-center gap-1.5 cursor-pointer"
              >
                <Check className="w-4 h-4 text-emerald-400" />
                <span>{isEditing ? "Salvar Alterações do Produto" : "Concluir Cadastro no Catálogo"}</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
