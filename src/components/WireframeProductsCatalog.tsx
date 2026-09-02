import React, { useState, useMemo } from "react";
import {
  Search,
  SlidersHorizontal,
  ChevronDown,
  Plus,
  Heart,
  MoreVertical,
  Edit2,
  Package,
  Eye,
  CheckCircle,
  Share2,
  ArrowUp,
  ArrowDown,
  Sparkles,
  TrendingUp,
  ShieldCheck,
  Tag,
  Gem,
  ArrowUpDown,
  Filter,
  Layers,
  ShoppingBag,
  ExternalLink,
  Zap,
  AlertTriangle,
  AlertCircle,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import { ProductItem } from "../types";

interface WireframeProductsCatalogProps {
  products: ProductItem[];
  onOpenNewProduct: () => void;
  onEditProduct?: (product: ProductItem) => void;
  onOpenStockModal?: (product: ProductItem) => void;
}

export const WireframeProductsCatalog: React.FC<WireframeProductsCatalogProps> = ({
  products,
  onOpenNewProduct,
  onEditProduct,
  onOpenStockModal,
}) => {
  const [activeTab, setActiveTab] = useState<string>("TODOS");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("TODOS");
  const [sortBy, setSortBy] = useState<"featured" | "price-asc" | "price-desc" | "stock-desc" | "stock-asc" | "name">("featured");
  const [favorites, setFavorites] = useState<Record<string, boolean>>({});

  // Default wireframe jewelry items if products list is empty
  const defaultWireframeProducts: Partial<ProductItem>[] = [
    {
      id: "wf-1",
      name: "Colar Riviera Zircônias 4mm",
      sku: "COL-RIV-18K",
      price: 398.0,
      costPrice: 120.0,
      stockPhysical: 8,
      stockAvailable: 8,
      stockConsigned: 2,
      status: "ATIVO" as any,
      publicationStatus: "PUBLISHED",
      category: "COLARES",
      collection: "Riviera Luxo",
      material: "Liga Nobre Hipoalergênica",
      bath: "OURO_18K",
      stones: ["Zircônia Cristal 4mm"],
      imageUrl: "https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?w=600&auto=format&fit=crop&q=80",
    },
    {
      id: "wf-2",
      name: "Brinco Solitário Ponto de Luz",
      sku: "BR-PL-6MM",
      price: 129.9,
      costPrice: 38.0,
      stockPhysical: 12,
      stockAvailable: 12,
      stockConsigned: 4,
      status: "ATIVO" as any,
      publicationStatus: "PUBLISHED",
      category: "BRINCOS",
      collection: "Clássicos Atemporais",
      material: "Liga Nobre Hipoalergênica",
      bath: "OURO_18K",
      stones: ["Zircônia Suíça"],
      imageUrl: "https://images.unsplash.com/photo-1630019852942-f89202989a59?w=600&auto=format&fit=crop&q=80",
    },
    {
      id: "wf-3",
      name: "Anel Solitário Cravação Pavé",
      sku: "AN-SOL-01",
      price: 149.9,
      costPrice: 45.0,
      stockPhysical: 3,
      stockAvailable: 3,
      stockConsigned: 1,
      status: "ATIVO" as any,
      publicationStatus: "PUBLISHED",
      category: "ANEIS",
      collection: "Noivas & Solitários",
      material: "Liga Nobre Hipoalergênica",
      bath: "RODIO_BRANCO",
      stones: ["Zircônias Micro-Pavé"],
      imageUrl: "https://images.unsplash.com/photo-1605100804763-247f67b3557e?w=600&auto=format&fit=crop&q=80",
    },
    {
      id: "wf-4",
      name: "Pulseira Veneziana com Pingente",
      sku: "PU-VEN-18K",
      price: 189.9,
      costPrice: 55.0,
      stockPhysical: 6,
      stockAvailable: 6,
      stockConsigned: 3,
      status: "ATIVO" as any,
      publicationStatus: "PUBLISHED",
      category: "PULSEIRAS",
      collection: "Linha Veneziana",
      material: "Liga Nobre Hipoalergênica",
      bath: "OURO_18K",
      stones: ["Zircônias"],
      imageUrl: "https://images.unsplash.com/photo-1611591475155-42864299616f?w=600&auto=format&fit=crop&q=80",
    },
    {
      id: "wf-5",
      name: "Conjunto Amor Eterno Coração",
      sku: "CJ-COR-01",
      price: 259.9,
      costPrice: 78.0,
      stockPhysical: 10,
      stockAvailable: 10,
      stockConsigned: 2,
      status: "ATIVO" as any,
      publicationStatus: "PUBLISHED",
      category: "CONJUNTOS",
      collection: "Corações & Afetos",
      material: "Liga Nobre Hipoalergênica",
      bath: "OURO_18K",
      stones: ["Cristal Fusion Esmeralda"],
      imageUrl: "https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?w=600&auto=format&fit=crop&q=80",
    },
    {
      id: "wf-6",
      name: "Bracelete Rígido Minimalista",
      sku: "BRACE-18K-01",
      price: 219.9,
      costPrice: 65.0,
      stockPhysical: 5,
      stockAvailable: 5,
      stockConsigned: 2,
      status: "ATIVO" as any,
      publicationStatus: "PUBLISHED",
      category: "PULSEIRAS",
      collection: "Modernist Bangle",
      material: "Liga Nobre Hipoalergênica",
      bath: "OURO_18K",
      stones: ["Liso Polido"],
      imageUrl: "https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?w=600&auto=format&fit=crop&q=80",
    },
    {
      id: "wf-7",
      name: "Colar Gravata Medalha Fé",
      sku: "COL-MED-FE",
      price: 179.9,
      costPrice: 52.0,
      stockPhysical: 7,
      stockAvailable: 7,
      stockConsigned: 1,
      status: "ATIVO" as any,
      publicationStatus: "PUBLISHED",
      category: "COLARES",
      collection: "Religiosos & Proteção",
      material: "Liga Nobre Hipoalergênica",
      bath: "OURO_18K",
      stones: ["Microzircônias"],
      imageUrl: "https://images.unsplash.com/photo-1598560917505-59a3ad559071?w=600&auto=format&fit=crop&q=80",
    },
    {
      id: "wf-8",
      name: "Brinco Argola Tubo Fecho Italiano",
      sku: "BR-ARG-MED",
      price: 159.9,
      costPrice: 48.0,
      stockPhysical: 9,
      stockAvailable: 9,
      stockConsigned: 3,
      status: "ATIVO" as any,
      publicationStatus: "PUBLISHED",
      category: "BRINCOS",
      collection: "Argolas Elegance",
      material: "Liga Nobre Hipoalergênica",
      bath: "OURO_18K",
      stones: ["Liso Alto Brilho"],
      imageUrl: "https://images.unsplash.com/photo-1635767798638-3e25273a8236?w=600&auto=format&fit=crop&q=80",
    },
  ];

  // Merge runtime products or fallback
  const displayItems = (products && products.length > 0 ? products : defaultWireframeProducts) as ProductItem[];

  // Dynamic counts for tabs & KPIs
  const allCount = displayItems.length;
  const ativosCount = displayItems.filter((i: any) => {
    const s = i.availableStock ?? i.stockAvailable ?? i.stockPhysical ?? i.currentStock ?? 0;
    return i.publicationStatus !== "DRAFT" && i.status !== "PAUSADO" && s > 0;
  }).length;
  const rascunhosCount = displayItems.filter((i: any) => i.publicationStatus === "DRAFT" || i.status === "PAUSADO").length;
  const esgotadosCount = displayItems.filter((i: any) => {
    const s = i.availableStock ?? i.stockAvailable ?? i.stockPhysical ?? i.currentStock ?? 0;
    return s <= 0;
  }).length;
  const baixoCount = displayItems.filter((i: any) => {
    const s = i.availableStock ?? i.stockAvailable ?? i.stockPhysical ?? i.currentStock ?? 0;
    return s > 0 && s <= 4;
  }).length;

  const totalCatalogValue = displayItems.reduce((acc: number, item: any) => acc + (Number(item.price) || 0), 0);
  const totalStockUnits = displayItems.reduce((acc: number, item: any) => {
    const s = item.stockPhysical ?? item.stockAvailable ?? item.availableStock ?? 0;
    return acc + Number(s);
  }, 0);
  const avgPrice = displayItems.length > 0 ? totalCatalogValue / displayItems.length : 0;

  // Filter & Sort items
  const filteredAndSortedItems = useMemo(() => {
    let result = displayItems.filter((item: any) => {
      const stock = item.availableStock !== undefined
        ? item.availableStock
        : (item.stockAvailable !== undefined
            ? item.stockAvailable
            : (item.stockPhysical !== undefined ? item.stockPhysical : (item.currentStock || 0)));

      const matchesSearch =
        (item.name || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.sku || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.collection || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.material || "").toLowerCase().includes(searchQuery.toLowerCase());

      const matchesCategory =
        selectedCategory === "TODOS" || item.category === selectedCategory;

      if (!matchesSearch || !matchesCategory) return false;

      if (activeTab === "ATIVOS") {
        return item.publicationStatus !== "DRAFT" && item.status !== "PAUSADO" && stock > 0;
      }
      if (activeTab === "RASCUNHOS") {
        return item.publicationStatus === "DRAFT" || item.status === "PAUSADO";
      }
      if (activeTab === "ESGOTADOS") {
        return stock <= 0;
      }
      if (activeTab === "ESTOQUE_BAIXO") {
        return stock > 0 && stock <= 4;
      }

      return true; // "TODOS"
    });

    // Sorting
    result = [...result].sort((a: any, b: any) => {
      const stockA = a.stockAvailable ?? a.stockPhysical ?? a.availableStock ?? 0;
      const stockB = b.stockAvailable ?? b.stockPhysical ?? b.availableStock ?? 0;
      const priceA = Number(a.price) || 0;
      const priceB = Number(b.price) || 0;

      if (sortBy === "price-asc") return priceA - priceB;
      if (sortBy === "price-desc") return priceB - priceA;
      if (sortBy === "stock-desc") return stockB - stockA;
      if (sortBy === "stock-asc") return stockA - stockB;
      if (sortBy === "name") return (a.name || "").localeCompare(b.name || "");
      return 0; // featured
    });

    return result;
  }, [displayItems, searchQuery, selectedCategory, activeTab, sortBy]);

  const toggleFavorite = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setFavorites((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const getBathLabel = (bath?: string) => {
    switch (bath) {
      case "OURO_18K":
        return "Ouro 18K";
      case "RODIO_BRANCO":
        return "Ródio Branco";
      case "RODIO_NEGRO":
        return "Ródio Negro";
      case "PRATA_925":
        return "Prata 925";
      case "ROSE_GOLD":
        return "Rosé Gold";
      default:
        return "Banho Nobre";
    }
  };

  // Helper for stock status visualization (Disponível / Baixo / Sem estoque)
  const getStockBadgeInfo = (stock: number) => {
    if (stock <= 0) {
      return {
        status: "OUT_OF_STOCK" as const,
        label: "Sem estoque",
        badgeText: "Sem estoque",
        badgeClass: "bg-rose-50/95 text-rose-800 border-rose-200/90 shadow-2xs",
        dotClass: "bg-rose-500",
        icon: XCircle,
        salesAdvice: "Esgotado • Sob encomenda",
        statusColor: "text-rose-700",
        pillBg: "bg-rose-100/70 text-rose-800",
      };
    }
    if (stock <= 4) {
      return {
        status: "LOW_STOCK" as const,
        label: "Baixo",
        badgeText: `Baixo • ${stock} un`,
        badgeClass: "bg-amber-50/95 text-amber-900 border-amber-200/90 shadow-2xs",
        dotClass: "bg-amber-500 animate-pulse",
        icon: AlertTriangle,
        salesAdvice: `Últimas ${stock} peças • Priorizar venda`,
        statusColor: "text-amber-800",
        pillBg: "bg-amber-100/70 text-amber-900",
      };
    }
    return {
      status: "AVAILABLE" as const,
      label: "Disponível",
      badgeText: `Disponível • ${stock} un`,
      badgeClass: "bg-emerald-50/95 text-emerald-800 border-emerald-200/90 shadow-2xs",
      dotClass: "bg-emerald-500",
      icon: CheckCircle2,
      salesAdvice: `Pronta Entrega • ${stock} un no estoque`,
      statusColor: "text-emerald-800",
      pillBg: "bg-emerald-100/70 text-emerald-800",
    };
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto animate-fadeIn pb-12 font-sans">
      {/* ========================================================================= */}
      {/* HEADER: Produtos + "+ Novo Produto"                                       */}
      {/* ========================================================================= */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-800 text-[10px] font-bold uppercase tracking-wider mb-1">
            <Sparkles className="w-3 h-3 text-amber-600" />
            Catálogo & Acervo Lumina
          </div>
          <h1 className="text-3xl sm:text-4xl font-serif italic font-bold text-stone-900 tracking-tight">
            Gestão de Produtos & Vitrine
          </h1>
          <p className="text-xs sm:text-sm text-stone-500 mt-1 font-sans">
            Controle de peças, fotos editoriais, precificação inteligente e estoque em tempo real
          </p>
        </div>

        {/* + Novo Produto Button */}
        <div className="flex items-center gap-2.5 self-start sm:self-auto">
          <button
            onClick={onOpenNewProduct}
            className="flex items-center gap-2 px-5 py-2.5 bg-stone-900 hover:bg-stone-800 active:scale-98 text-white text-xs font-bold rounded-2xl shadow-xs hover:shadow-md transition-all cursor-pointer font-sans"
          >
            <Plus className="w-4 h-4 text-amber-400" />
            <span>Novo Produto</span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 4-COLUMN HIGH-IMPACT METRIC CARDS (EXACT EXECUTIVE DASHBOARD STANDARD)    */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        {/* CARD 1: Total de Peças & Acervo */}
        <div className="bg-white border border-stone-200 rounded-3xl p-6 shadow-xs hover:shadow-lg hover:scale-[1.01] transition-all duration-300 ease-out flex flex-col justify-between group">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-stone-100 mb-3">
              <span className="text-[11px] font-serif font-bold uppercase tracking-wider text-stone-400">
                Acervo Total
              </span>
              <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-700 border border-amber-100 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Package className="w-4 h-4" />
              </div>
            </div>
            <div className="space-y-1">
              <div className="flex items-baseline justify-between gap-2">
                <div className="text-3xl font-sans font-bold text-stone-900 tracking-tight">
                  {allCount} <span className="text-sm font-sans font-normal text-stone-500">modelos</span>
                </div>
                <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-bold font-sans">
                  <ArrowUp className="w-3.5 h-3.5 text-emerald-600" />
                  +100% Ativo
                </span>
              </div>
              <div className="text-xs text-stone-500 mt-1.5 font-sans">
                {totalStockUnits} peças físicas cadastradas
              </div>
            </div>
          </div>
          <div className="pt-4 mt-4 border-t border-stone-100 flex items-center justify-between text-xs font-sans">
            <span className="text-emerald-700 font-bold flex items-center gap-1">
              <ArrowUp className="w-3.5 h-3.5 text-emerald-600" />
              {ativosCount} na vitrine ativa
            </span>
            <span className="text-stone-400 font-medium">{rascunhosCount} rascunhos</span>
          </div>
        </div>

        {/* CARD 2: Pronta Entrega */}
        <div className="bg-white border border-stone-200 rounded-3xl p-6 shadow-xs hover:shadow-lg hover:scale-[1.01] transition-all duration-300 ease-out flex flex-col justify-between group">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-stone-100 mb-3">
              <span className="text-[11px] font-serif font-bold uppercase tracking-wider text-stone-400">
                Pronta Entrega
              </span>
              <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-100 flex items-center justify-center group-hover:scale-110 transition-transform">
                <CheckCircle className="w-4 h-4" />
              </div>
            </div>
            <div className="space-y-1">
              <div className="flex items-baseline justify-between gap-2">
                <div className="text-3xl font-sans font-bold text-stone-900 tracking-tight">
                  {ativosCount} <span className="text-sm font-sans font-normal text-stone-500">modelos</span>
                </div>
                <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-bold font-sans">
                  <ArrowUp className="w-3.5 h-3.5 text-emerald-600" />
                  Despacho 24h
                </span>
              </div>
              <div className="text-xs text-stone-500 mt-1.5 font-sans">
                Disponíveis para envio imediato
              </div>
            </div>
          </div>
          <div className="pt-4 mt-4 border-t border-stone-100 flex items-center justify-between text-xs font-sans">
            <span className="text-emerald-700 font-bold flex items-center gap-1">
              <ArrowUp className="w-3.5 h-3.5 text-emerald-600" />
              Taxa de disponibilidade 94%
            </span>
            <span className="text-stone-400 font-medium">Lumina ERP</span>
          </div>
        </div>

        {/* CARD 3: Preço Médio & Valor do Acervo */}
        <div className="bg-white border border-stone-200 rounded-3xl p-6 shadow-xs hover:shadow-lg hover:scale-[1.01] transition-all duration-300 ease-out flex flex-col justify-between group">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-stone-100 mb-3">
              <span className="text-[11px] font-serif font-bold uppercase tracking-wider text-stone-400">
                Preço Médio
              </span>
              <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-700 border border-purple-100 flex items-center justify-center group-hover:scale-110 transition-transform">
                <TrendingUp className="w-4 h-4" />
              </div>
            </div>
            <div className="space-y-1">
              <div className="flex items-baseline justify-between gap-2">
                <div className="text-3xl font-sans font-bold text-stone-900 tracking-tight">
                  R$ {avgPrice.toLocaleString("pt-BR", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                </div>
                <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-bold font-sans">
                  <ArrowUp className="w-3.5 h-3.5 text-emerald-600" />
                  Margem 45%
                </span>
              </div>
              <div className="text-xs text-stone-500 mt-1.5 font-sans">
                Acervo total: <strong className="text-stone-800 font-bold">R$ {totalCatalogValue.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</strong>
              </div>
            </div>
          </div>
          <div className="pt-4 mt-4 border-t border-stone-100 flex items-center justify-between text-xs font-sans">
            <span className="text-emerald-700 font-bold flex items-center gap-1">
              <ArrowUp className="w-3.5 h-3.5 text-emerald-600" />
              Condições PIX & 6x
            </span>
            <span className="text-stone-400 font-medium">Balanço Ativo</span>
          </div>
        </div>

        {/* CARD 4: Alertas de Reposição & Galvânica */}
        <div className="bg-white border border-stone-200 rounded-3xl p-6 shadow-xs hover:shadow-lg hover:scale-[1.01] transition-all duration-300 ease-out flex flex-col justify-between group">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-stone-100 mb-3">
              <span className="text-[11px] font-serif font-bold uppercase tracking-wider text-stone-400">
                Alertas de Estoque
              </span>
              <div className={`w-8 h-8 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform ${
                baixoCount > 0 ? "bg-rose-50 text-rose-700 border border-rose-100" : "bg-emerald-50 text-emerald-700 border border-emerald-100"
              }`}>
                {baixoCount > 0 ? <ArrowDown className="w-4 h-4 text-rose-600" /> : <ShieldCheck className="w-4 h-4 text-emerald-600" />}
              </div>
            </div>
            <div className="space-y-1">
              <div className="flex items-baseline justify-between gap-2">
                <div className="text-3xl font-sans font-bold text-stone-900 tracking-tight">
                  {baixoCount} <span className="text-sm font-sans font-normal text-stone-500">em alerta</span>
                </div>
                {baixoCount > 0 ? (
                  <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold font-sans">
                    <ArrowDown className="w-3.5 h-3.5 text-rose-600" />
                    Repor
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-bold font-sans">
                    <ArrowUp className="w-3.5 h-3.5 text-emerald-600" />
                    Estável
                  </span>
                )}
              </div>
              <div className="text-xs text-stone-500 mt-1.5 font-sans">
                {esgotadosCount} peças esgotadas atualmente
              </div>
            </div>
          </div>
          <div className="pt-4 mt-4 border-t border-stone-100 flex items-center justify-between text-xs font-sans">
            <span className={baixoCount > 0 ? "text-rose-700 font-bold flex items-center gap-1" : "text-emerald-700 font-bold flex items-center gap-1"}>
              {baixoCount > 0 ? (
                <>
                  <ArrowDown className="w-3.5 h-3.5 text-rose-600" />
                  Reposição recomendada
                </>
              ) : (
                <>
                  <ArrowUp className="w-3.5 h-3.5 text-emerald-600" />
                  Estoque abastecido
                </>
              )}
            </span>
            <span className="text-stone-400 font-medium">Galvânica</span>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* SEARCH, CATEGORIES & ORDERING CONTROLS                                    */}
      {/* ========================================================================= */}
      <div className="bg-white border border-stone-200 rounded-3xl p-4 sm:p-5 shadow-xs space-y-4">
        {/* Top search & sorting row */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          {/* Search input */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar por nome da semijoia, SKU, coleção ou pedras..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-8 py-2.5 bg-stone-50/70 border border-stone-200 rounded-2xl text-xs text-stone-900 placeholder:text-stone-400 focus:outline-none focus:bg-white focus:border-amber-400 shadow-2xs font-sans transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-700 text-xs font-bold cursor-pointer"
              >
                ✕
              </button>
            )}
          </div>

          {/* Sort selector */}
          <div className="flex items-center gap-2 self-end sm:self-auto">
            <div className="relative">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="appearance-none bg-stone-50/70 border border-stone-200 rounded-2xl pl-3.5 pr-8 py-2.5 text-xs font-semibold text-stone-700 hover:bg-white hover:border-stone-300 transition-colors shadow-2xs focus:outline-none cursor-pointer font-sans"
              >
                <option value="featured">Destaques da Curadoria</option>
                <option value="price-asc">Menor Preço</option>
                <option value="price-desc">Maior Preço</option>
                <option value="stock-desc">Maior Estoque</option>
                <option value="stock-asc">Menor Estoque</option>
                <option value="name">Nome (A-Z)</option>
              </select>
              <ArrowUpDown className="w-3.5 h-3.5 text-stone-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>
        </div>

        {/* Category Filter Chips */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
          {[
            { id: "TODOS", label: "Todas Categorias" },
            { id: "COLARES", label: "Colares & Chokers" },
            { id: "BRINCOS", label: "Brincos & Argolas" },
            { id: "ANEIS", label: "Anéis & Solitários" },
            { id: "PULSEIRAS", label: "Pulseiras & Braceletes" },
            { id: "CONJUNTOS", label: "Conjuntos" },
            { id: "PERSONALIZADOS", label: "Personalizáveis" },
          ].map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-3.5 py-1.5 rounded-xl whitespace-nowrap text-xs font-semibold transition-all cursor-pointer ${
                selectedCategory === cat.id
                  ? "bg-amber-100/80 text-amber-900 border border-amber-300 font-bold shadow-2xs"
                  : "bg-stone-50 hover:bg-stone-100 text-stone-600 border border-stone-200"
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* STATUS TABS (Pills with live counts)                                      */}
      {/* ========================================================================= */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2.5 overflow-x-auto pb-1 text-xs font-sans">
          {[
            { id: "TODOS", label: `Todos (${allCount})` },
            { id: "ATIVOS", label: `Ativos na Vitrine (${ativosCount})` },
            { id: "ESTOQUE_BAIXO", label: `Estoque Baixo (${baixoCount})` },
            { id: "ESGOTADOS", label: `Esgotados (${esgotadosCount})` },
            { id: "RASCUNHOS", label: `Rascunhos (${rascunhosCount})` },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 rounded-2xl whitespace-nowrap font-semibold transition-all cursor-pointer ${
                activeTab === tab.id
                  ? "bg-stone-900 text-white font-bold shadow-xs scale-102"
                  : "bg-white hover:bg-stone-100 text-stone-600 border border-stone-200"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="text-xs text-stone-500 font-sans">
          Exibindo <strong className="text-stone-900 font-bold">{filteredAndSortedItems.length}</strong> de {allCount} semijoias
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 4-COLUMN RESPONSIVE LUXURY PRODUCT GRID (ZERO TABLES)                     */}
      {/* ========================================================================= */}
      {filteredAndSortedItems.length === 0 ? (
        <div className="bg-white border border-stone-200 rounded-3xl p-12 text-center space-y-4 max-w-lg mx-auto shadow-xs">
          <div className="w-14 h-14 mx-auto rounded-full bg-stone-100 flex items-center justify-center text-stone-400">
            <Search className="w-6 h-6" />
          </div>
          <h3 className="text-xl font-serif italic font-bold text-stone-900">
            Nenhuma semijoia encontrada
          </h3>
          <p className="text-xs text-stone-500 leading-relaxed font-sans">
            Não encontramos peças correspondentes aos critérios de busca ou filtros selecionados.
          </p>
          <button
            onClick={() => {
              setActiveTab("TODOS");
              setSelectedCategory("TODOS");
              setSearchQuery("");
              setSortBy("featured");
            }}
            className="px-5 py-2.5 bg-stone-900 hover:bg-stone-800 text-white rounded-2xl text-xs font-bold transition-all cursor-pointer"
          >
            Limpar Filtros
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3.5 sm:gap-6">
          {filteredAndSortedItems.map((product: any) => {
            const isFav = favorites[product.id];
            const stock =
              product.availableStock !== undefined
                ? product.availableStock
                : (product.stockAvailable !== undefined
                    ? product.stockAvailable
                    : (product.stockPhysical !== undefined ? product.stockPhysical : (product.currentStock || 0)));
            const stockInfo = getStockBadgeInfo(stock);
            const priceNum = Number(product.price) || 0;
            const pixPrice = priceNum * 0.95; // 5% PIX discount
            const installmentValue = priceNum / 6;

            return (
              <div
                key={product.id}
                className="product-card-container bg-white rounded-2xl sm:rounded-3xl border border-stone-200/90 shadow-xs hover:shadow-lg hover:scale-105 hover:border-amber-300 transition-all duration-300 ease-out flex flex-col justify-between overflow-hidden group cursor-pointer"
                onClick={() => onEditProduct && onEditProduct(product)}
              >
                <div>
                  {/* Image & Top Badges Container */}
                  <div className="relative aspect-square bg-gradient-to-b from-[#FAF8F5] to-[#F5F2ED] overflow-hidden flex items-center justify-center p-3 sm:p-5">
                    {/* Top Left: Visual Stock Status Badge */}
                    <div className="absolute top-2 sm:top-3 left-2 sm:left-3 flex flex-col gap-1 sm:gap-1.5 z-10 max-w-[80%]">
                      <span
                        className={`inline-flex items-center gap-1 sm:gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold border backdrop-blur-xs font-sans tracking-tight ${stockInfo.badgeClass}`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${stockInfo.dotClass}`} />
                        <span className="truncate">{stockInfo.badgeText}</span>
                      </span>

                      {product.isCustomizable && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[8px] sm:text-[9px] font-bold bg-purple-50 text-purple-700 border border-purple-200 shadow-2xs font-sans w-fit">
                          <Gem className="w-2 h-2 text-purple-600" />
                          <span className="hidden sm:inline">Personalizável</span>
                        </span>
                      )}
                    </div>

                    {/* Top Right: Heart & Action */}
                    <div className="absolute top-2 sm:top-3 right-2 sm:right-3 flex items-center gap-1 sm:gap-1.5 z-10">
                      <button
                        onClick={(e) => toggleFavorite(product.id, e)}
                        className={`p-1.5 sm:p-2 rounded-full backdrop-blur-xs transition-all shadow-2xs cursor-pointer ${
                          isFav
                            ? "bg-rose-50 text-rose-600 scale-105 border border-rose-200"
                            : "bg-white/90 hover:bg-white text-stone-400 hover:text-stone-700 border border-stone-200/50"
                        }`}
                        title="Favoritar semijoia"
                      >
                        <Heart className={`w-3 h-3 sm:w-3.5 sm:h-3.5 ${isFav ? "fill-rose-500 text-rose-500" : ""}`} />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (onEditProduct) onEditProduct(product);
                        }}
                        className="p-1.5 sm:p-2 rounded-full bg-white/90 hover:bg-white text-stone-400 hover:text-stone-700 backdrop-blur-xs transition-all shadow-2xs border border-stone-200/50 cursor-pointer"
                        title="Editar peça"
                      >
                        <Edit2 className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                      </button>
                    </div>

                    {/* Product Image with smooth luxury hover zoom */}
                    <img
                      src={product.imageUrl}
                      alt={product.name}
                      className="w-full h-full object-contain mix-blend-multiply group-hover:scale-108 transition-transform duration-700 ease-out"
                      referrerPolicy="no-referrer"
                    />

                    {/* Bath / Material Pill on Image bottom */}
                    <div className="absolute bottom-2 sm:bottom-3 left-2 sm:left-3 right-2 sm:right-3 flex items-center justify-between pointer-events-none">
                      <span className="px-1.5 sm:px-2 py-0.5 rounded-lg bg-stone-900/85 backdrop-blur-xs text-white text-[8px] sm:text-[9px] font-bold tracking-wider uppercase font-sans">
                        {getBathLabel(product.bath)}
                      </span>
                      {product.stones && product.stones.length > 0 && (
                        <span className="hidden sm:inline-block px-2 py-0.5 rounded-lg bg-white/90 backdrop-blur-xs text-stone-700 text-[9px] font-semibold border border-stone-200/60 font-sans truncate max-w-[120px]">
                          {product.stones[0]}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Card Body with Editorial Typography */}
                  <div className="p-3.5 sm:p-5 space-y-1.5 sm:space-y-2">
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-[9px] sm:text-[10px] uppercase font-bold text-amber-900/80 tracking-widest font-sans truncate">
                        {product.collection || product.category || "Coleção Lumina"}
                      </span>
                      <span className="text-[9px] sm:text-[10px] text-stone-400 font-mono tracking-tight shrink-0">
                        {product.sku}
                      </span>
                    </div>

                    <h3 className="text-sm sm:text-lg font-serif italic font-bold text-stone-900 group-hover:text-amber-950 transition-colors line-clamp-1 leading-snug">
                      {product.name}
                    </h3>

                    {/* Pricing */}
                    <div className="pt-0.5 sm:pt-1">
                      <div className="flex items-baseline gap-1.5">
                        <div className="text-base sm:text-xl font-sans font-bold text-stone-900 tracking-tight">
                          R$ {priceNum.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </div>
                        {product.promoPrice && product.promoPrice < priceNum && (
                          <span className="text-[10px] sm:text-xs text-stone-400 line-through">
                            R$ {Number(product.promoPrice).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                          </span>
                        )}
                      </div>

                      <div className="text-[10px] sm:text-[11px] text-stone-500 font-sans mt-0.5 flex flex-col sm:flex-row sm:items-center sm:gap-1.5">
                        <span className="text-emerald-700 font-bold">R$ {pixPrice.toLocaleString("pt-BR", { minimumFractionDigits: 2 })} PIX</span>
                        <span className="hidden sm:inline text-stone-300">•</span>
                        <span>6x R$ {installmentValue.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span>
                      </div>
                    </div>

                    {/* Quick Sales Decision Strip */}
                    <div className="pt-2 border-t border-stone-100 flex items-center justify-between text-[10px] sm:text-[11px] font-sans">
                      <div className={`flex items-center gap-1.5 font-semibold ${stockInfo.statusColor}`}>
                        <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${stockInfo.dotClass}`} />
                        <span>{stockInfo.label}</span>
                      </div>
                      <span className="text-stone-500 text-[9px] sm:text-[10px] truncate max-w-[130px] font-medium">
                        {stockInfo.salesAdvice}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Card Footer: Estoque & Ações Rápidas */}
                <div className="px-3.5 sm:px-5 pb-3.5 sm:pb-5 pt-2 sm:pt-3 border-t border-stone-100 flex items-center justify-between text-xs font-sans gap-1">
                  <div className="flex items-center gap-1 sm:gap-1.5 text-stone-600 font-medium truncate">
                    <Package className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-stone-400 shrink-0" />
                    <span className={`text-[10px] sm:text-xs font-semibold truncate ${stockInfo.statusColor}`}>
                      {stock} un
                    </span>
                  </div>

                  <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (onOpenStockModal) onOpenStockModal(product);
                        else if (onEditProduct) onEditProduct(product);
                      }}
                      className="px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg sm:rounded-xl bg-stone-50 hover:bg-stone-100 border border-stone-200 text-stone-700 text-[10px] sm:text-xs font-bold transition-all hover:border-stone-300 cursor-pointer"
                    >
                      Estoque
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (onEditProduct) onEditProduct(product);
                      }}
                      className="px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg sm:rounded-xl bg-stone-900 hover:bg-stone-800 text-white text-[10px] sm:text-xs font-bold transition-all cursor-pointer shadow-2xs"
                    >
                      Editar
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

