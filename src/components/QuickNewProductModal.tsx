import React, { useState, useRef } from "react";
import {
  X,
  Package,
  Sparkles,
  Camera,
  PlusCircle,
  CheckCircle2,
  UploadCloud,
  Image as ImageIcon,
  Loader2,
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
  const [name, setName] = useState("");
  const [category, setCategory] = useState("ANEIS");
  const [bath, setBath] = useState("OURO_18K");
  const [price, setPrice] = useState("");
  const [costPrice, setCostPrice] = useState("");
  const [stock, setStock] = useState("1");
  const [imageUrl, setImageUrl] = useState("");
  const [warrantyMonths, setWarrantyMonths] = useState(12);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const quickSamples = [
    {
      name: "Anel Solitário Zircônia 18K",
      category: "ANEIS",
      bath: "OURO_18K",
      price: "189.90",
      costPrice: "55.00",
      stock: "4",
      imageUrl: "https://images.unsplash.com/photo-1605100804763-247f67b3557e?w=600&auto=format&fit=crop&q=80",
    },
    {
      name: "Colar Ponto de Luz Ródio Branco",
      category: "COLARES",
      bath: "RODIO_BRANCO",
      price: "149.00",
      costPrice: "42.00",
      stock: "5",
      imageUrl: "https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?w=600&auto=format&fit=crop&q=80",
    },
    {
      name: "Brinco Argola Cravejada Ouro",
      category: "BRINCOS",
      bath: "OURO_18K",
      price: "129.90",
      costPrice: "35.00",
      stock: "6",
      imageUrl: "https://images.unsplash.com/photo-1635767798638-3e25273a8236?w=600&auto=format&fit=crop&q=80",
    },
  ];

  const handleFillSample = (sample: typeof quickSamples[0]) => {
    setName(sample.name);
    setCategory(sample.category);
    setBath(sample.bath);
    setPrice(sample.price);
    setCostPrice(sample.costPrice);
    setStock(sample.stock);
    setImageUrl(sample.imageUrl);
  };

  const handleFileUpload = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      toast.error("Por favor, selecione um arquivo de imagem válido (JPEG, PNG, WebP).");
      return;
    }
    if (file.size > 15 * 1024 * 1024) {
      toast.error("A imagem selecionada excede o limite de 15MB.");
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
        toast.success("Foto da peça carregada com sucesso!");
      }
    } catch (err: any) {
      console.error("Falha no upload da foto:", err);
      toast.warning("Não foi possível carregar a imagem. Você também pode colar o link direto abaixo.");
    } finally {
      setIsUploading(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.warning("Por favor, digite o nome da semijoia.");
      return;
    }
    if (!price || Number(price) <= 0) {
      toast.warning("Por favor, informe o preço de venda da semijoia.");
      return;
    }

    setIsSubmitting(true);
    try {
      const generatedSku = `LUM-${category.substring(0, 3)}-${Math.floor(1000 + Math.random() * 9000)}`;
      const numStock = Number(stock) || 1;
      const numPrice = Number(price);
      const numCost = Number(costPrice) || numPrice * 0.35;

      const productPayload: Omit<ProductItem, "id"> = {
        sku: generatedSku,
        name: name.trim(),
        description: `Semijoia ${name.trim()} banhada com verniz italiano protetor e garantia de ${warrantyMonths} meses.`,
        category: category as any,
        collection: "Coleção 2026",
        bath: bath as any,
        stones: ["Zircônia Cristal"],
        material: "Liga Nobre Antialérgica",
        price: numPrice,
        costPrice: numCost,
        stockPhysical: numStock,
        stockConsigned: 0,
        stockAvailable: numStock,
        warrantyMonths,
        isCustomizable: false,
        publicationStatus: "PUBLISHED",
        status: "ATIVO",
        imageUrl: imageUrl.trim() || "https://images.unsplash.com/photo-1605100804763-247f67b3557e?w=600&auto=format&fit=crop&q=80",
      };

      await onAddProduct(productPayload);
      toast.success(`Peça "${name.trim()}" cadastrada com sucesso no catálogo!`);
      onClose();
      // Reset form
      setName("");
      setPrice("");
      setCostPrice("");
      setStock("1");
      setImageUrl("");
    } catch (err: any) {
      toast.error(err.message || "Erro ao cadastrar produto.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-fadeIn">
      <div className="bg-white rounded-3xl max-w-xl w-full p-6 sm:p-8 shadow-2xl border border-stone-200 relative my-8">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-full text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="w-11 h-11 rounded-2xl bg-amber-100 text-amber-900 flex items-center justify-center font-bold">
            <Package className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl sm:text-2xl font-serif font-bold text-stone-900">
              Cadastrar Nova Peça
            </h2>
            <p className="text-xs text-stone-500">
              Disponibilize imediatamente na sua vitrine e no estoque
            </p>
          </div>
        </div>

        {/* Quick Sample Buttons */}
        <div className="mb-5 p-3 rounded-2xl bg-amber-50/60 border border-amber-200/70">
          <span className="text-[10px] font-extrabold uppercase tracking-wider text-amber-800 block mb-1.5">
            💡 Preencher com modelo de teste rápido:
          </span>
          <div className="flex flex-wrap gap-1.5">
            {quickSamples.map((s, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleFillSample(s)}
                className="text-[11px] font-bold px-2.5 py-1 rounded-xl bg-white hover:bg-amber-100/80 border border-amber-200 text-amber-950 transition-all cursor-pointer shadow-2xs"
              >
                + {s.name.split(" ")[0]} {s.name.split(" ")[1]} (R$ {s.price})
              </button>
            ))}
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase text-stone-700 mb-1">
              Nome da Semijoia *
            </label>
            <input
              type="text"
              required
              placeholder="Ex: Anel Solitário Cravejado Coroa"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 text-xs focus:ring-2 focus:ring-amber-500 focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold uppercase text-stone-700 mb-1">
                Categoria
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 text-xs bg-white focus:ring-2 focus:ring-amber-500 focus:outline-none"
              >
                <option value="ANEIS">Anéis</option>
                <option value="COLARES">Colares</option>
                <option value="BRINCOS">Brincos</option>
                <option value="PULSEIRAS">Pulseiras</option>
                <option value="CONJUNTOS">Conjuntos</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase text-stone-700 mb-1">
                Banho Nobre
              </label>
              <select
                value={bath}
                onChange={(e) => setBath(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 text-xs bg-white focus:ring-2 focus:ring-amber-500 focus:outline-none"
              >
                <option value="OURO_18K">Ouro 18K (10 Milésimos)</option>
                <option value="RODIO_BRANCO">Ródio Branco (Prateado)</option>
                <option value="ROSE_GOLD">Rosé Gold</option>
                <option value="RODIO_NEGRO">Ródio Negro</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-bold uppercase text-stone-700 mb-1">
                Preço Venda (R$) *
              </label>
              <input
                type="number"
                step="0.01"
                required
                placeholder="149.90"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 text-xs focus:ring-2 focus:ring-amber-500 focus:outline-none font-bold"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase text-stone-700 mb-1">
                Preço Custo (R$)
              </label>
              <input
                type="number"
                step="0.01"
                placeholder="45.00"
                value={costPrice}
                onChange={(e) => setCostPrice(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 text-xs focus:ring-2 focus:ring-amber-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase text-stone-700 mb-1">
                Qtd Estoque
              </label>
              <input
                type="number"
                min="1"
                required
                value={stock}
                onChange={(e) => setStock(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 text-xs focus:ring-2 focus:ring-amber-500 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase text-stone-700 mb-1">
              Foto da Peça (Upload ou URL)
            </label>

            {/* Drag and Drop Zone */}
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragOver(true);
              }}
              onDragLeave={() => setIsDragOver(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-2xl p-4 text-center cursor-pointer transition-all ${
                isDragOver
                  ? "border-amber-500 bg-amber-50/80"
                  : imageUrl
                  ? "border-stone-200 bg-stone-50/50"
                  : "border-stone-300 hover:border-amber-400 bg-stone-50/80"
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    handleFileUpload(e.target.files[0]);
                  }
                }}
              />

              {isUploading ? (
                <div className="flex flex-col items-center justify-center py-2 text-amber-700">
                  <Loader2 className="w-7 h-7 animate-spin mb-1.5" />
                  <span className="text-xs font-semibold">Enviando foto para o catálogo...</span>
                </div>
              ) : imageUrl ? (
                <div className="flex items-center gap-3">
                  <img
                    src={imageUrl}
                    alt="Preview"
                    className="w-16 h-16 rounded-xl object-cover border border-stone-200 shadow-2xs"
                    referrerPolicy="no-referrer"
                  />
                  <div className="text-left flex-1 min-w-0">
                    <span className="text-xs font-bold text-stone-900 block truncate">
                      Foto carregada com sucesso
                    </span>
                    <span className="text-[11px] text-stone-500 block truncate">
                      Clique para trocar de foto ou editar o link
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setImageUrl("");
                    }}
                    className="text-xs text-rose-600 hover:underline px-2 py-1 font-semibold"
                  >
                    Remover
                  </button>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-2 text-stone-600">
                  <UploadCloud className="w-8 h-8 text-amber-600 mb-1" />
                  <span className="text-xs font-bold text-stone-800">
                    Clique para selecionar foto ou arraste aqui
                  </span>
                  <span className="text-[10px] text-stone-400 mt-0.5">
                    PNG, JPG ou WebP até 15MB
                  </span>
                </div>
              )}
            </div>

            <div className="mt-2">
              <input
                type="url"
                placeholder="Ou cole aqui o link da imagem (URL direta)..."
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-stone-200 text-xs focus:ring-2 focus:ring-amber-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3.5 rounded-2xl bg-stone-900 hover:bg-stone-800 text-amber-300 font-bold text-sm transition-all shadow-md active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
            >
              {isSubmitting ? (
                <span>Salvando no catálogo...</span>
              ) : (
                <>
                  <CheckCircle2 className="w-5 h-5 text-amber-400" />
                  <span>Salvar &amp; Publicar no Catálogo</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
