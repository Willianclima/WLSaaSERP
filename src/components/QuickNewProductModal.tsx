import React, { useState, useRef } from "react";
import {
  X,
  Camera,
  UploadCloud,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Plus,
  Minus,
  Check,
  Package,
  Image as ImageIcon,
} from "lucide-react";
import { ProductItem } from "../types";
import { ClientStorageService } from "../services/storageService";
import { toast } from "../utils/toast";

interface QuickNewProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddProduct: (product: Omit<ProductItem, "id">) => Promise<void> | void;
}

export const QuickNewProductModal: React.FC<QuickNewProductModalProps> = ({
  isOpen,
  onClose,
  onAddProduct,
}) => {
  // Etapa 1: Foto
  const [imageUrl, setImageUrl] = useState(
    "https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?w=600&auto=format&fit=crop&q=80"
  );
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Etapa 2: Nome
  const [name, setName] = useState("");

  // Etapa 3: Categoria
  const [category, setCategory] = useState("COLARES");

  // Etapa 4: Preço
  const [price, setPrice] = useState("");

  // Etapa 5: Estoque
  const [stock, setStock] = useState<number>(4);

  // Informações adicionais (opcionais / colapsadas)
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [costPrice, setCostPrice] = useState("");
  const [bath, setBath] = useState("OURO_18K");
  const [warrantyMonths, setWarrantyMonths] = useState(12);
  const [sku, setSku] = useState("");

  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  // Exemplos rápidos de fotos para facilitar o piloto e cadastro
  const photoPresets = [
    {
      label: "Colar",
      url: "https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?w=600&auto=format&fit=crop&q=80",
      cat: "COLARES",
    },
    {
      label: "Anel",
      url: "https://images.unsplash.com/photo-1605100804763-247f67b3557e?w=600&auto=format&fit=crop&q=80",
      cat: "ANEIS",
    },
    {
      label: "Brinco",
      url: "https://images.unsplash.com/photo-1635767798638-3e25273a8236?w=600&auto=format&fit=crop&q=80",
      cat: "BRINCOS",
    },
    {
      label: "Pulseira",
      url: "https://images.unsplash.com/photo-1611591475882-8419616e0766?w=600&auto=format&fit=crop&q=80",
      cat: "PULSEIRAS",
    },
  ];

  const categories = [
    { id: "COLARES", label: "Colares" },
    { id: "ANEIS", label: "Anéis" },
    { id: "BRINCOS", label: "Brincos" },
    { id: "PULSEIRAS", label: "Pulseiras" },
    { id: "CONJUNTOS", label: "Conjuntos" },
  ];

  const handleFileUpload = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      toast.error("Por favor, selecione um arquivo de imagem válido (JPEG, PNG, WebP).");
      return;
    }

    try {
      setIsUploading(true);
      const storageService = ClientStorageService.getInstance();
      const uploadRes = await storageService.uploadFile(file, {
        folder: "catalog-products",
      });
      if (uploadRes && (uploadRes.url || uploadRes.cdnUrl)) {
        setImageUrl(uploadRes.cdnUrl || uploadRes.url);
        toast.success("Foto carregada com sucesso!");
      }
    } catch {
      // Fallback para leitor local seguro
      const reader = new FileReader();
      reader.onload = (e) => {
        if (e.target?.result) {
          setImageUrl(e.target.result as string);
          toast.success("Foto adicionada localmente!");
        }
      };
      reader.readAsDataURL(file);
    } finally {
      setIsUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      toast.error("Por favor, informe o nome da peça.");
      return;
    }

    const numPrice = parseFloat(price.replace(",", "."));
    if (isNaN(numPrice) || numPrice <= 0) {
      toast.error("Por favor, informe um preço de venda válido.");
      return;
    }

    try {
      setIsSubmitting(true);

      const generatedSku =
        sku.trim() ||
        `${category.substring(0, 3)}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;

      const productPayload: Omit<ProductItem, "id"> = {
        name: name.trim(),
        sku: generatedSku,
        category: category as any,
        collection: "Coleção Essencial",
        material: "Liga Metálica Nobre Hipoalergênica",
        stones: ["Zircônia Cúbica"],
        price: numPrice,
        costPrice: costPrice ? parseFloat(costPrice.replace(",", ".")) : numPrice * 0.35,
        bath: bath as any,
        description: `Semijoia ${name.trim()} com acabamento nobre em ${bath.replace("_", " ")} e garantia digital.`,
        stockPhysical: stock,
        stockAvailable: stock,
        stockConsigned: 0,
        warrantyMonths,
        isCustomizable: false,
        publicationStatus: "PUBLISHED",
        status: "ATIVO",
        imageUrl: imageUrl.trim(),
      };

      await onAddProduct(productPayload);
      toast.success(`Peça "${name.trim()}" publicada no catálogo com sucesso!`);
      onClose();
    } catch (err: any) {
      toast.error(err.message || "Erro ao publicar peça.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-fadeIn font-sans">
      <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-stone-200 relative my-6 select-none">
        {/* Botão de Fechar */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-full text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Cabeçalho */}
        <div className="mb-6">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-amber-500"></span>
            <span className="text-[11px] font-extrabold uppercase tracking-widest text-amber-900">
              Minha Loja
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-serif font-bold text-stone-900 mt-0.5">
            Cadastrar Nova Peça
          </h2>
          <p className="text-xs text-stone-500 mt-0.5">
            Preencha os dados essenciais para disponibilizar a peça no catálogo imediatamente.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* ========================================================================= */}
          {/* ETAPA 1: FOTO DA PEÇA                                                     */}
          {/* ========================================================================= */}
          <div>
            <label className="block text-xs font-extrabold uppercase text-stone-700 mb-2">
              1. Foto da Peça
            </label>

            <div className="flex items-center gap-4">
              {/* Preview da Imagem */}
              <div className="w-24 h-24 rounded-2xl border border-stone-200 bg-stone-50 overflow-hidden relative group shrink-0">
                <img
                  src={imageUrl}
                  alt="Preview"
                  className="w-full h-full object-cover"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute inset-0 bg-black/40 text-white flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer text-[10px] font-bold"
                >
                  <Camera className="w-4 h-4 mb-1" />
                  Trocar Foto
                </button>
              </div>

              {/* Botão de Upload e Presets rápidos */}
              <div className="flex-1 space-y-2">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0])}
                  accept="image/*"
                  className="hidden"
                />

                <button
                  type="button"
                  disabled={isUploading}
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full py-2 px-3 rounded-xl border border-dashed border-stone-300 hover:border-amber-500 hover:bg-amber-50/50 text-stone-700 text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer transition-all"
                >
                  <UploadCloud className="w-4 h-4 text-stone-500" />
                  <span>{isUploading ? "Carregando foto..." : "Enviar foto da peça"}</span>
                </button>

                <div className="flex items-center gap-1.5 pt-1">
                  <span className="text-[10px] text-stone-400 font-medium">Ou escolha:</span>
                  {photoPresets.map((preset, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        setImageUrl(preset.url);
                        setCategory(preset.cat);
                      }}
                      className="text-[10px] px-2 py-0.5 rounded-lg bg-stone-100 hover:bg-amber-100 text-stone-700 font-semibold cursor-pointer transition-colors"
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* ========================================================================= */}
          {/* ETAPA 2: NOME DA PEÇA                                                     */}
          {/* ========================================================================= */}
          <div>
            <label className="block text-xs font-extrabold uppercase text-stone-700 mb-1">
              2. Nome da Peça *
            </label>
            <input
              type="text"
              required
              placeholder="Ex: Colar Choker Fita Laminada 18K"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 text-sm focus:ring-2 focus:ring-amber-500 focus:outline-none placeholder:text-stone-400"
            />
          </div>

          {/* ========================================================================= */}
          {/* ETAPA 3: CATEGORIA                                                        */}
          {/* ========================================================================= */}
          <div>
            <label className="block text-xs font-extrabold uppercase text-stone-700 mb-1.5">
              3. Categoria
            </label>
            <div className="flex flex-wrap gap-2">
              {categories.map((c) => {
                const isSelected = category === c.id;
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setCategory(c.id)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      isSelected
                        ? "bg-stone-900 text-white shadow-xs"
                        : "bg-stone-100 hover:bg-stone-200 text-stone-700"
                    }`}
                  >
                    {c.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* ========================================================================= */}
          {/* ETAPA 4 & 5: PREÇO E ESTOQUE                                              */}
          {/* ========================================================================= */}
          <div className="grid grid-cols-2 gap-4">
            {/* Preço de Venda */}
            <div>
              <label className="block text-xs font-extrabold uppercase text-stone-700 mb-1">
                4. Preço de Venda (R$) *
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400 text-sm font-bold">
                  R$
                </span>
                <input
                  type="text"
                  required
                  placeholder="189,90"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-stone-200 text-base font-bold text-stone-900 focus:ring-2 focus:ring-amber-500 focus:outline-none"
                />
              </div>
            </div>

            {/* Estoque Inicial */}
            <div>
              <label className="block text-xs font-extrabold uppercase text-stone-700 mb-1">
                5. Estoque Inicial
              </label>
              <div className="flex items-center rounded-xl border border-stone-200 bg-white overflow-hidden">
                <button
                  type="button"
                  onClick={() => setStock(Math.max(1, stock - 1))}
                  className="p-2.5 hover:bg-stone-100 text-stone-600 transition-colors cursor-pointer"
                >
                  <Minus className="w-4 h-4" />
                </button>
                <input
                  type="number"
                  min="1"
                  value={stock}
                  onChange={(e) => setStock(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-full text-center py-2 text-sm font-bold text-stone-900 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => setStock(stock + 1)}
                  className="p-2.5 hover:bg-stone-100 text-stone-600 transition-colors cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* ========================================================================= */}
          {/* ACCORDION: + INFORMAÇÕES ADICIONAIS (OPCIONAIS)                           */}
          {/* ========================================================================= */}
          <div className="pt-1">
            <button
              type="button"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="text-xs font-bold text-amber-700 hover:text-amber-800 flex items-center gap-1.5 cursor-pointer py-1"
            >
              <span>{showAdvanced ? "− Ocultar informações adicionais" : "+ Informações adicionais"}</span>
              {showAdvanced ? (
                <ChevronUp className="w-3.5 h-3.5" />
              ) : (
                <ChevronDown className="w-3.5 h-3.5" />
              )}
            </button>

            {showAdvanced && (
              <div className="mt-3 p-4 rounded-2xl bg-stone-50 border border-stone-200 space-y-3 animate-fadeIn">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-stone-600 mb-1">
                      Banho Nobre
                    </label>
                    <select
                      value={bath}
                      onChange={(e) => setBath(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-stone-200 bg-white text-xs text-stone-800 focus:outline-none"
                    >
                      <option value="OURO_18K">Ouro 18K (10 Milésimos)</option>
                      <option value="RODIO_BRANCO">Ródio Branco (Prateado)</option>
                      <option value="ROSE_GOLD">Rosé Gold</option>
                      <option value="RODIO_NEGRO">Ródio Negro</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-stone-600 mb-1">
                      Preço de Custo (R$)
                    </label>
                    <input
                      type="text"
                      placeholder="55,00"
                      value={costPrice}
                      onChange={(e) => setCostPrice(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-stone-200 bg-white text-xs text-stone-800 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-stone-600 mb-1">
                      Meses de Garantia
                    </label>
                    <input
                      type="number"
                      value={warrantyMonths}
                      onChange={(e) => setWarrantyMonths(parseInt(e.target.value) || 12)}
                      className="w-full px-3 py-2 rounded-xl border border-stone-200 bg-white text-xs text-stone-800 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-stone-600 mb-1">
                      Código SKU (opcional)
                    </label>
                    <input
                      type="text"
                      placeholder="Auto-gerado"
                      value={sku}
                      onChange={(e) => setSku(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-stone-200 bg-white text-xs text-stone-800 focus:outline-none"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* ========================================================================= */}
          {/* ETAPA 6: PUBLICAR NO CATÁLOGO                                             */}
          {/* ========================================================================= */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3.5 px-4 rounded-2xl bg-amber-500 hover:bg-amber-600 text-stone-950 font-bold text-sm shadow-md hover:shadow-lg transition-all active:scale-98 cursor-pointer flex items-center justify-center gap-2"
            >
              <Sparkles className="w-4 h-4 stroke-[2.5]" />
              <span>{isSubmitting ? "Publicando no catálogo..." : "Publicar Peça no Catálogo"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default QuickNewProductModal;
