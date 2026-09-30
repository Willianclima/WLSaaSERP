import React, { useState, useRef, useMemo } from "react";
import {
  X,
  Camera,
  UploadCloud,
  Sparkles,
  Plus,
  Minus,
  Check,
  Package,
  Info,
  DollarSign,
  Layers,
  ShieldCheck,
  CheckCircle2,
} from "lucide-react";
import { ProductItem } from "../types";
import { ClientStorageService } from "../services/storageService";
import { toast } from "../utils/toast";

export const MARIA_PILOT_PRODUCTS: Omit<ProductItem, "id">[] = [
  {
    name: "Colar Riviera Cristal Zircônias 40cm + Extensor",
    sku: "COL-RIV-01",
    category: "COLARES",
    collection: "Coleção Alto Brilho",
    material: "Liga Metálica Nobre Hipoalergênica",
    stones: ["Zircônia Cúbica Cravação Inglesa"],
    price: 189.9,
    costPrice: 58.0,
    bath: "OURO_18K",
    description: "Colar Riviera com zircônias incolores de alta refração, banho de 10 milésimos de Ouro 18k e fecho joalheria de segurança.",
    stockPhysical: 3,
    stockAvailable: 3,
    stockConsigned: 0,
    warrantyMonths: 12,
    isCustomizable: false,
    publicationStatus: "PUBLISHED",
    status: "ATIVO",
    imageUrl: "https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?w=600&auto=format&fit=crop&q=80",
  },
  {
    name: "Anel Solitário Cravejado Zircônia Oval 8x6mm",
    sku: "ANEL-001",
    category: "ANEIS",
    collection: "Clássicos Eternos",
    material: "Liga Metálica Nobre Hipoalergênica",
    stones: ["Zircônia Cristal Oval"],
    price: 129.9,
    costPrice: 38.0,
    bath: "OURO_18K",
    description: "Anel solitário elegante com zircônia central lapidação oval 8x6mm e aro cravejado com microzircônias. Peça única para teste de concorrência.",
    stockPhysical: 1, // Estoque = 1 crucial para o teste de concorrência do usuário!
    stockAvailable: 1,
    stockConsigned: 0,
    warrantyMonths: 12,
    isCustomizable: false,
    publicationStatus: "PUBLISHED",
    status: "ATIVO",
    imageUrl: "https://images.unsplash.com/photo-1605100804763-247f67b3557e?w=600&auto=format&fit=crop&q=80",
  },
  {
    name: "Brinco Gota Madrepérola & Microcravação Zircônias",
    sku: "BR-MAD-01",
    category: "BRINCOS",
    collection: "Organic Luxury",
    material: "Liga Metálica Nobre Hipoalergênica",
    stones: ["Madrepérola Natural", "Microzircônias"],
    price: 98.0,
    costPrice: 32.0,
    bath: "OURO_18K",
    description: "Brinco gota sofisticado com madrepérola natural iridescente e contorno em microzircônias cravejadas manualmente.",
    stockPhysical: 4,
    stockAvailable: 4,
    stockConsigned: 0,
    warrantyMonths: 12,
    isCustomizable: false,
    publicationStatus: "PUBLISHED",
    status: "ATIVO",
    imageUrl: "https://images.unsplash.com/photo-1635767798638-3e25273a8236?w=600&auto=format&fit=crop&q=80",
  },
  {
    name: "Choker Fita Lisa Laminada 35cm + 5cm",
    sku: "CHOK-FIT-01",
    category: "COLARES",
    collection: "Minimalista Chic",
    material: "Liga Metálica Nobre Hipoalergênica",
    stones: [],
    price: 149.0,
    costPrice: 42.0,
    bath: "OURO_18K",
    description: "Gargantilha fita malha alemã laminada e espelhada com acabamento banhado a ouro 18k 10 milésimos antialérgico.",
    stockPhysical: 2,
    stockAvailable: 2,
    stockConsigned: 0,
    warrantyMonths: 12,
    isCustomizable: false,
    publicationStatus: "PUBLISHED",
    status: "ATIVO",
    imageUrl: "https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?w=600&auto=format&fit=crop&q=80",
  },
  {
    name: "Pulseira Elo Português com Fecho Boia 18cm",
    sku: "PULS-PORT-01",
    category: "PULSEIRAS",
    collection: "Alta Joalheria",
    material: "Liga Metálica Nobre Hipoalergênica",
    stones: [],
    price: 169.0,
    costPrice: 48.0,
    bath: "OURO_18K",
    description: "Pulseira elo português 6mm clássica com fecho boia robusto e banho triplo de ouro 18k e verniz nano cerâmico.",
    stockPhysical: 2,
    stockAvailable: 2,
    stockConsigned: 0,
    warrantyMonths: 12,
    isCustomizable: false,
    publicationStatus: "PUBLISHED",
    status: "ATIVO",
    imageUrl: "https://images.unsplash.com/photo-1611591475882-8419616e0766?w=600&auto=format&fit=crop&q=80",
  },
  {
    name: "Brinco Argola Cravejada Dupla Zircônias Ródio",
    sku: "ARG-ROD-01",
    category: "BRINCOS",
    collection: "Diamond Touch",
    material: "Liga Metálica Nobre Hipoalergênica",
    stones: ["Microzircônias Navete"],
    price: 119.0,
    costPrice: 35.0,
    bath: "RODIO_BRANCO",
    description: "Argola articulada clique com duas fileiras paralelas de microzircônias e banho nobre de ródio branco brilhante.",
    stockPhysical: 5,
    stockAvailable: 5,
    stockConsigned: 0,
    warrantyMonths: 12,
    isCustomizable: false,
    publicationStatus: "PUBLISHED",
    status: "ATIVO",
    imageUrl: "https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?w=600&auto=format&fit=crop&q=80",
  },
  {
    name: "Colar Ponto de Luz Zircônia Redonda 6mm",
    sku: "COL-LUZ-01",
    category: "COLARES",
    collection: "Dia a Dia",
    material: "Liga Metálica Nobre Hipoalergênica",
    stones: ["Zircônia Solitária 6mm"],
    price: 79.9,
    costPrice: 22.0,
    bath: "OURO_18K",
    description: "Corrente veneziana 45cm com pingente ponto de luz solitário cravação cálice e banho de ouro 18k 7 milésimos.",
    stockPhysical: 6,
    stockAvailable: 6,
    stockConsigned: 0,
    warrantyMonths: 12,
    isCustomizable: false,
    publicationStatus: "PUBLISHED",
    status: "ATIVO",
    imageUrl: "https://images.unsplash.com/photo-1599643477877-530eb83abc8e?w=600&auto=format&fit=crop&q=80",
  },
  {
    name: "Piercing Fake Duplo Cravejado Orelha",
    sku: "PIERC-DUO-01",
    category: "BRINCOS",
    collection: "Ear Party",
    material: "Liga Metálica Nobre Hipoalergênica",
    stones: ["Microzircônias"],
    price: 59.9,
    costPrice: 16.0,
    bath: "OURO_18K",
    description: "Piercing de pressão anatômico aro duplo com microzircônias incolores. Não necessita de furo.",
    stockPhysical: 8,
    stockAvailable: 8,
    stockConsigned: 0,
    warrantyMonths: 12,
    isCustomizable: false,
    publicationStatus: "PUBLISHED",
    status: "ATIVO",
    imageUrl: "https://images.unsplash.com/photo-1630019852942-f89202989a59?w=600&auto=format&fit=crop&q=80",
  },
  {
    name: "Anel Aparador Meia Aliança Cravejada Zircônias",
    sku: "ANEL-APAR-01",
    category: "ANEIS",
    collection: "Alianças & Aparadores",
    material: "Liga Metálica Nobre Hipoalergênica",
    stones: ["Zircônias Microcravejadas"],
    price: 89.9,
    costPrice: 26.0,
    bath: "RODIO_BRANCO",
    description: "Aparador meia aliança fino delicado em ródio branco, perfeito para compor mix de anéis ou acompanhar aliança.",
    stockPhysical: 3,
    stockAvailable: 3,
    stockConsigned: 0,
    warrantyMonths: 12,
    isCustomizable: false,
    publicationStatus: "PUBLISHED",
    status: "ATIVO",
    imageUrl: "https://images.unsplash.com/photo-1603561591411-07134e71a2a9?w=600&auto=format&fit=crop&q=80",
  },
  {
    name: "Pulseira Riviera Flexível Fecho Joalheria",
    sku: "PULS-RIV-01",
    category: "PULSEIRAS",
    collection: "Riviera Exclusive",
    material: "Liga Metálica Nobre Hipoalergênica",
    stones: ["Zircônias Cúbicas 3mm"],
    price: 199.0,
    costPrice: 62.0,
    bath: "RODIO_BRANCO",
    description: "Pulseira riviera inteiramente articulada e flexível com zircônias 3mm e banho nobre de ródio branco com trava dupla.",
    stockPhysical: 2,
    stockAvailable: 2,
    stockConsigned: 0,
    warrantyMonths: 12,
    isCustomizable: false,
    publicationStatus: "PUBLISHED",
    status: "ATIVO",
    imageUrl: "https://images.unsplash.com/photo-1611591475878-5e839e9f93ec?w=600&auto=format&fit=crop&q=80",
  },
];

interface QuickNewProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddProduct: (product: Omit<ProductItem, "id">) => Promise<void> | void;
  isPilotTenant?: boolean;
  tenantSlug?: string;
}

export const QuickNewProductModal: React.FC<QuickNewProductModalProps> = ({
  isOpen,
  onClose,
  onAddProduct,
  isPilotTenant,
  tenantSlug,
}) => {
  // Verificação de ambiente controlado para o Piloto 01 vs Loja Comercial Padrão
  const isPilotMode =
    isPilotTenant ||
    tenantSlug?.includes("piloto") ||
    tenantSlug?.includes("elegance") ||
    (typeof window !== "undefined" && window.location.search.includes("pilot=true"));
  // 1. Foto
  const [imageUrl, setImageUrl] = useState(
    "https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?w=600&auto=format&fit=crop&q=80"
  );
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 2. Nome
  const [name, setName] = useState("");

  // 3. Categoria
  const [category, setCategory] = useState("COLARES");

  // 4. Banho & Camadas
  const [bath, setBath] = useState("OURO_18K");

  // 5. Preço de Venda
  const [price, setPrice] = useState("129,90");

  // 6. Custo da Peça
  const [costPrice, setCostPrice] = useState("38,00");

  // 7. Estoque Inicial
  const [stock, setStock] = useState<number>(3);

  // 8. Publicar no Catálogo Online
  const [isPublished, setIsPublished] = useState<boolean>(true);

  // Opcionais
  const [warrantyMonths, setWarrantyMonths] = useState(12);
  const [sku, setSku] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isBatchLoading, setIsBatchLoading] = useState(false);

  // Cálculo didático de Margem de Lucro e Markup
  const financialMetrics = useMemo(() => {
    const numPrice = parseFloat(price.replace(",", ".")) || 0;
    const numCost = parseFloat(costPrice.replace(",", ".")) || 0;
    if (numPrice <= 0) return null;
    const profit = Math.max(0, numPrice - numCost);
    const margin = (profit / numPrice) * 100;
    const markup = numCost > 0 ? (numPrice / numCost) : 0;
    return {
      profit,
      margin: Math.round(margin * 10) / 10,
      markup: Math.round(markup * 10) / 10,
    };
  }, [price, costPrice]);

  if (!isOpen) return null;

  const categories = [
    { id: "COLARES", label: "Colares" },
    { id: "ANEIS", label: "Anéis" },
    { id: "BRINCOS", label: "Brincos" },
    { id: "PULSEIRAS", label: "Pulseiras" },
    { id: "CONJUNTOS", label: "Conjuntos" },
  ];

  const baths = [
    {
      id: "OURO_18K",
      label: "Ouro 18K (10 Milésimos)",
      desc: "Camada nobre alta joalheria, máxima durabilidade",
    },
    {
      id: "RODIO_BRANCO",
      label: "Ródio Branco (Platina)",
      desc: "Brilho espelhado nobre, 100% hipoalergênico",
    },
    {
      id: "ROSE_GOLD",
      label: "Ouro Rosé (18K)",
      desc: "Tom rosado sofisticado com verniz protetor",
    },
    {
      id: "RODIO_NEGRO",
      label: "Ródio Negro (Grafite)",
      desc: "Visual contemporâneo de joalheria moderna",
    },
  ];

  const handleFileUpload = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      toast.error("Por favor, selecione um arquivo de imagem válido.");
      return;
    }

    try {
      setIsUploading(true);
      const storageService = ClientStorageService.getInstance();
      const uploadRes = await storageService.uploadFile(file, { folder: "catalog-products" });
      if (uploadRes && (uploadRes.url || uploadRes.cdnUrl)) {
        setImageUrl(uploadRes.cdnUrl || uploadRes.url);
        toast.success("Foto da peça carregada com sucesso!");
      }
    } catch {
      const reader = new FileReader();
      reader.onload = (e) => {
        if (e.target?.result) {
          setImageUrl(e.target.result as string);
          toast.success("Foto adicionada com sucesso!");
        }
      };
      reader.readAsDataURL(file);
    } finally {
      setIsUploading(false);
    }
  };

  const handleSelectMariaPreset = (p: Omit<ProductItem, "id">) => {
    setName(p.name);
    setCategory(p.category);
    setBath(p.bath);
    setPrice(p.price.toFixed(2).replace(".", ","));
    setCostPrice(p.costPrice ? p.costPrice.toFixed(2).replace(".", ",") : "35,00");
    setStock(p.stockPhysical || 3);
    setSku(p.sku);
    setImageUrl(p.imageUrl);
    setIsPublished(true);
    toast.success(`Dados da peça "${p.name}" pré-carregados!`);
  };

  const handleLoadAll10MariaProducts = async () => {
    setIsBatchLoading(true);
    try {
      let added = 0;
      for (const item of MARIA_PILOT_PRODUCTS) {
        await onAddProduct(item);
        added++;
      }
      toast.success(`🎉 As 10 peças reais da Maria foram cadastradas no catálogo!`);
      onClose();
    } catch (err: any) {
      toast.error(err.message || "Erro ao cadastrar coleção da Maria.");
    } finally {
      setIsBatchLoading(false);
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

    const numCost = parseFloat(costPrice.replace(",", ".")) || numPrice * 0.35;

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
        costPrice: numCost,
        bath: bath as any,
        description: `Semijoia ${name.trim()} banhada a ${bath.replace("_", " ")} com verniz protetor e 1 ano de garantia digital.`,
        stockPhysical: stock,
        stockAvailable: stock,
        stockConsigned: 0,
        warrantyMonths,
        isCustomizable: false,
        publicationStatus: isPublished ? "PUBLISHED" : "DRAFT",
        status: isPublished ? "ATIVO" : "PAUSADO",
        imageUrl: imageUrl.trim(),
      };

      await onAddProduct(productPayload);
      toast.success(`Peça "${name.trim()}" salva com sucesso!`);
      onClose();
    } catch (err: any) {
      toast.error(err.message || "Erro ao salvar peça.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-fadeIn font-sans">
      <div className="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl border border-stone-200 relative my-6 text-stone-900">
        {/* Botão de Fechar */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-full text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Cabeçalho */}
        <div className="mb-4">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-amber-500"></span>
            <span className="text-[11px] font-extrabold uppercase tracking-widest text-amber-900">
              PILOTO COMERCIAL 01 • COLEÇÃO DA MARIA
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-serif font-bold text-stone-900 mt-1">
            Cadastrar Peça Real
          </h2>
          <p className="text-xs text-stone-500 mt-0.5">
            Os 8 campos essenciais para cadastrar e vender sem nenhuma dúvida técnica.
          </p>
        </div>

        {/* Banner de Ação Rápida: Piloto 01 (Maria) ou Catálogo Modelo Geral */}
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-3.5 mb-5 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-200/60 text-amber-800 flex items-center justify-center font-bold text-sm shrink-0">
              {isPilotMode ? "💎" : "📦"}
            </div>
            <div>
              <p className="text-xs font-bold text-amber-950">
                {isPilotMode
                  ? "Coleção Piloto 01 (10 Peças Reais da Maria)"
                  : "Importar Catálogo Modelo de Semijoias Finas"}
              </p>
              <p className="text-[11px] text-amber-800">
                {isPilotMode
                  ? "Colares, Rivieras, Anel Solitário (Estoque=1), Chokers e Brincos já configurados para Maria."
                  : "10 peças completas com fotos, banhos e margens pré-configuradas para começar vendendo agora."}
              </p>
            </div>
          </div>
          <button
            type="button"
            disabled={isBatchLoading}
            onClick={handleLoadAll10MariaProducts}
            className="w-full sm:w-auto px-4 py-2 bg-stone-900 hover:bg-stone-800 text-amber-300 font-bold text-xs rounded-xl transition-all cursor-pointer shadow-xs shrink-0"
          >
            {isBatchLoading
              ? "Importando Peças..."
              : isPilotMode
              ? "Carregar as 10 Peças da Maria"
              : "Importar Catálogo Modelo"}
          </button>
        </div>

        {/* Atalhos para preenchimento de peças reais */}
        <div className="mb-4">
          <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider block mb-1.5">
            {isPilotMode
              ? "Ou escolha um exemplo real da Maria para preencher:"
              : "Ou preencha rapidamente com um modelo de referência:"}
          </span>
          <div className="flex flex-wrap gap-1.5">
            {MARIA_PILOT_PRODUCTS.slice(0, 5).map((p) => (
              <button
                key={p.sku}
                type="button"
                onClick={() => handleSelectMariaPreset(p)}
                className="px-2.5 py-1 rounded-lg bg-stone-100 hover:bg-amber-100 text-stone-700 hover:text-amber-900 text-[11px] font-medium transition-colors cursor-pointer border border-stone-200"
              >
                {p.name.split(" ")[0]} {p.name.split(" ")[1]} ({p.sku})
              </button>
            ))}
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* 1. FOTO DA PEÇA */}
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-stone-700 mb-1.5 flex items-center justify-between">
                <span>1. Foto da Peça</span>
                <span className="text-[11px] text-stone-400 font-normal">Foto real em boa iluminação</span>
              </label>
              <div className="flex items-center gap-3">
                <div className="w-16 h-16 rounded-xl border border-stone-200 bg-stone-50 overflow-hidden relative shrink-0">
                  <img src={imageUrl} alt="Preview" className="w-full h-full object-cover" />
                </div>
                <div className="flex-1 flex gap-2">
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0])}
                    accept="image/*"
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="flex-1 py-2 px-3 rounded-xl border border-stone-300 hover:border-amber-500 hover:bg-amber-50/50 text-stone-700 text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer transition-all"
                  >
                    <UploadCloud className="w-4 h-4 text-stone-500" />
                    <span>{isUploading ? "Enviando..." : "Subir foto do celular"}</span>
                  </button>
                </div>
              </div>
            </div>

            {/* 2. NOME DA PEÇA */}
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-stone-700 mb-1 flex items-center justify-between">
                <span>2. Nome da Peça</span>
                <span className="text-[11px] text-stone-400 font-normal">Como a cliente vai identificar</span>
              </label>
              <input
                type="text"
                required
                placeholder="Ex: Anel Solitário Cravejado Zircônia Oval"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 focus:outline-none text-sm font-semibold text-stone-900"
              />
            </div>

            {/* 3. CATEGORIA */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-stone-700 mb-1">
                3. Categoria
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-stone-300 bg-white text-xs font-bold text-stone-800 focus:outline-none focus:border-amber-500"
              >
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>

            {/* 4. BANHO NOBRE */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-stone-700 mb-1 flex items-center justify-between">
                <span className="flex items-center gap-1">
                  <span>4. Banho Nobre</span>
                  <span className="text-[10px] text-amber-700 font-semibold">(Milésimos)</span>
                </span>
                <span className="text-[10px] text-stone-400 font-normal">Camada de Metal Nobre</span>
              </label>
              <select
                value={bath}
                onChange={(e) => setBath(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-stone-300 bg-white text-xs font-bold text-stone-800 focus:outline-none focus:border-amber-500"
              >
                {baths.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.label}
                  </option>
                ))}
              </select>
              <p className="mt-1 text-[10px] text-stone-500 leading-tight">
                💡 <strong>O que são milésimos?</strong> É a espessura da camada de ouro depositada sobre a peça (ex: 10 milésimos = padrão alta joalheria com 1 ano de garantia; 3 a 5 milésimos = semijoia de linha leve).
              </p>
            </div>

            {/* 5. PREÇO DE VENDA */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-stone-700 mb-1 flex items-center justify-between">
                <span>5. Preço de Venda (R$)</span>
                <span className="text-[10px] text-emerald-600 font-bold">Valor para a cliente</span>
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-stone-400 text-xs font-bold">R$</span>
                <input
                  type="text"
                  required
                  placeholder="129,90"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  className="w-full pl-8 pr-3 py-2.5 rounded-xl border border-stone-300 focus:border-amber-500 focus:outline-none text-sm font-bold text-stone-900"
                />
              </div>
            </div>

            {/* 6. CUSTO DA PEÇA */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-stone-700 mb-1 flex items-center justify-between">
                <span>6. Custo da Peça (R$)</span>
                <span className="text-[10px] text-stone-400">Quanto pagou na fábrica</span>
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-stone-400 text-xs font-bold">R$</span>
                <input
                  type="text"
                  placeholder="38,00"
                  value={costPrice}
                  onChange={(e) => setCostPrice(e.target.value)}
                  className="w-full pl-8 pr-3 py-2.5 rounded-xl border border-stone-300 focus:border-amber-500 focus:outline-none text-sm font-bold text-stone-900"
                />
              </div>
            </div>

            {/* Dica Didática de Lucro & Margem */}
            {financialMetrics && (
              <div className="sm:col-span-2 bg-emerald-50 border border-emerald-200 rounded-xl px-3.5 py-2 flex items-center justify-between text-xs">
                <span className="text-emerald-900 font-medium">
                  💰 Lucro estimado: <strong>R$ {financialMetrics.profit.toFixed(2)}</strong> por peça
                </span>
                <span className="text-emerald-800 font-bold font-mono">
                  Margem: {financialMetrics.margin}% • Markup: {financialMetrics.markup}x
                </span>
              </div>
            )}

            {/* 7. ESTOQUE INICIAL */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-stone-700 mb-1 flex items-center justify-between">
                <span>7. Estoque Inicial</span>
                <span className="text-[10px] text-stone-400">Peças em mãos</span>
              </label>
              <div className="flex items-center border border-stone-300 rounded-xl overflow-hidden bg-white">
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

            {/* 8. PUBLICAR NO CATÁLOGO ONLINE */}
            <div className="flex flex-col justify-end">
              <label className="block text-xs font-bold uppercase tracking-wider text-stone-700 mb-1">
                8. Publicar no Catálogo
              </label>
              <button
                type="button"
                onClick={() => setIsPublished(!isPublished)}
                className={`w-full py-2.5 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                  isPublished
                    ? "bg-emerald-50 border-emerald-300 text-emerald-800"
                    : "bg-stone-50 border-stone-200 text-stone-500"
                }`}
              >
                <CheckCircle2 className={`w-4 h-4 ${isPublished ? "text-emerald-600" : "text-stone-400"}`} />
                <span>{isPublished ? "Publicado na Vitrine Online" : "Salvo apenas no Estoque Interno"}</span>
              </button>
            </div>
          </div>

          {/* Botão de Envio Principal */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3.5 px-4 rounded-2xl bg-amber-500 hover:bg-amber-600 text-stone-950 font-bold text-sm shadow-md hover:shadow-lg transition-all active:scale-98 cursor-pointer flex items-center justify-center gap-2"
            >
              <Sparkles className="w-4 h-4 stroke-[2.5]" />
              <span>{isSubmitting ? "Cadastrando Peça..." : "Publicar Peça no Catálogo da Loja"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default QuickNewProductModal;
