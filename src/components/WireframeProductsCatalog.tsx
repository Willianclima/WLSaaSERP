import React, { useState } from "react";
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
  const [activeTab, setActiveTab] = useState<string>("ATIVOS");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("TODOS");
  const [favorites, setFavorites] = useState<Record<string, boolean>>({});

  // Default wireframe jewelry items if products list is empty
  const defaultWireframeProducts = [
    {
      id: "wf-1",
      name: "Colar Riviera Zircônias",
      sku: "COL-RIV-18K",
      price: 398.0,
      stockAvailable: 8,
      status: "ATIVO",
      publicationStatus: "PUBLISHED",
      category: "COLARES",
      isLowStock: false,
      imageUrl: "https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?w=600&auto=format&fit=crop&q=80",
    },
    {
      id: "wf-2",
      name: "Brinco Ponto de Luz",
      sku: "BR-PL-6MM",
      price: 129.9,
      stockAvailable: 12,
      status: "ATIVO",
      publicationStatus: "PUBLISHED",
      category: "BRINCOS",
      isLowStock: false,
      imageUrl: "https://images.unsplash.com/photo-1630019852942-f89202989a59?w=600&auto=format&fit=crop&q=80",
    },
    {
      id: "wf-3",
      name: "Anel Solitário Cristal",
      sku: "AN-SOL-01",
      price: 149.9,
      stockAvailable: 4,
      status: "ATIVO",
      publicationStatus: "PUBLISHED",
      category: "ANEIS",
      isLowStock: true,
      imageUrl: "https://images.unsplash.com/photo-1605100804763-247f67b3557e?w=600&auto=format&fit=crop&q=80",
    },
    {
      id: "wf-4",
      name: "Pulseira Veneziana",
      sku: "PU-VEN-18K",
      price: 189.9,
      stockAvailable: 6,
      status: "ATIVO",
      publicationStatus: "PUBLISHED",
      category: "PULSEIRAS",
      isLowStock: false,
      imageUrl: "https://images.unsplash.com/photo-1611591475155-42864299616f?w=600&auto=format&fit=crop&q=80",
    },
    {
      id: "wf-5",
      name: "Conjunto Coração",
      sku: "CJ-COR-01",
      price: 259.9,
      stockAvailable: 10,
      status: "ATIVO",
      publicationStatus: "PUBLISHED",
      category: "CONJUNTOS",
      isLowStock: false,
      imageUrl: "https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?w=600&auto=format&fit=crop&q=80",
    },
    {
      id: "wf-6",
      name: "Bracelete Banhado 18K",
      sku: "BRACE-18K-01",
      price: 219.9,
      stockAvailable: 5,
      status: "ATIVO",
      publicationStatus: "PUBLISHED",
      category: "PULSEIRAS",
      isLowStock: false,
      imageUrl: "https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?w=600&auto=format&fit=crop&q=80",
    },
    {
      id: "wf-7",
      name: "Colar Medalha Fé",
      sku: "COL-MED-FE",
      price: 179.9,
      stockAvailable: 7,
      status: "ATIVO",
      publicationStatus: "PUBLISHED",
      category: "COLARES",
      isLowStock: false,
      imageUrl: "https://images.unsplash.com/photo-1598560917505-59a3ad559071?w=600&auto=format&fit=crop&q=80",
    },
    {
      id: "wf-8",
      name: "Brinco Argola Média",
      sku: "BR-ARG-MED",
      price: 159.9,
      stockAvailable: 9,
      status: "ATIVO",
      publicationStatus: "PUBLISHED",
      category: "BRINCOS",
      isLowStock: false,
      imageUrl: "https://images.unsplash.com/photo-1635767798638-3e25273a8236?w=600&auto=format&fit=crop&q=80",
    },
  ];

  // Merge runtime products or fallback
  const displayItems = products.length > 0 ? products : (defaultWireframeProducts as any);

  // Filter items based on active tab and query
  const filteredItems = displayItems.filter((item: any) => {
    const stock = item.availableStock !== undefined
      ? item.availableStock
      : (item.stockAvailable !== undefined ? item.stockAvailable : (item.currentStock || 0));

    const matchesSearch =
      (item.name || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.sku || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.collection || "").toLowerCase().includes(searchQuery.toLowerCase());

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

  const toggleFavorite = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setFavorites((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto animate-fadeIn pb-12 font-sans">
      {/* ========================================================================= */}
      {/* HEADER: Produtos + "+ Novo Produto"                                       */}
      {/* ========================================================================= */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-stone-900 tracking-tight">
            Produtos
          </h1>
          <p className="text-xs sm:text-sm text-stone-500 mt-0.5">
            Gestão de peças, fotos, preços e disponibilidade de estoque
          </p>
        </div>

        {/* + Novo Produto Button */}
        <button
          onClick={onOpenNewProduct}
          className="flex items-center gap-1.5 px-4 py-2 bg-[#C88A2C] hover:bg-[#B37822] text-white text-xs font-bold rounded-xl shadow-xs transition-all active:scale-98 cursor-pointer self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Novo Produto</span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* SEARCH & FILTERS BAR                                                      */}
      {/* ========================================================================= */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
        {/* Search input */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Buscar por nome, SKU ou coleção..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 bg-white border border-stone-200 rounded-xl text-xs text-stone-900 placeholder:text-stone-400 focus:outline-none focus:border-stone-400 shadow-2xs"
          />
        </div>

        <div className="flex items-center gap-2.5">
          {/* Filtros button */}
          <button className="flex items-center gap-2 px-3.5 py-2.5 bg-white border border-stone-200 rounded-xl text-xs font-semibold text-stone-700 hover:bg-stone-50 transition-colors shadow-2xs cursor-pointer">
            <SlidersHorizontal className="w-3.5 h-3.5 text-stone-500" />
            <span>Filtros</span>
          </button>

          {/* Categorias dropdown */}
          <div className="relative">
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="appearance-none bg-white border border-stone-200 rounded-xl pl-3.5 pr-8 py-2.5 text-xs font-semibold text-stone-700 hover:bg-stone-50 transition-colors shadow-2xs focus:outline-none cursor-pointer"
            >
              <option value="TODOS">Categorias</option>
              <option value="COLARES">Colares</option>
              <option value="BRINCOS">Brincos</option>
              <option value="ANEIS">Anéis</option>
              <option value="PULSEIRAS">Pulseiras</option>
              <option value="CONJUNTOS">Conjuntos</option>
            </select>
            <ChevronDown className="w-3 h-3 text-stone-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* TABS: Todos (24), Ativos (18), Rascunhos (4), Esgotados (2), Baixo (3)    */}
      {/* ========================================================================= */}
      <div className="flex items-center gap-6 border-b border-stone-200 overflow-x-auto text-xs pb-0">
        <button
          onClick={() => setActiveTab("TODOS")}
          className={`pb-3 font-semibold transition-colors relative cursor-pointer ${
            activeTab === "TODOS"
              ? "text-stone-900 font-bold border-b-2 border-stone-900"
              : "text-stone-500 hover:text-stone-800"
          }`}
        >
          Todos (24)
        </button>

        <button
          onClick={() => setActiveTab("ATIVOS")}
          className={`pb-3 font-semibold transition-colors relative cursor-pointer ${
            activeTab === "ATIVOS"
              ? "text-stone-900 font-bold border-b-2 border-stone-900"
              : "text-stone-500 hover:text-stone-800"
          }`}
        >
          Ativos (18)
        </button>

        <button
          onClick={() => setActiveTab("RASCUNHOS")}
          className={`pb-3 font-semibold transition-colors relative cursor-pointer ${
            activeTab === "RASCUNHOS"
              ? "text-stone-900 font-bold border-b-2 border-stone-900"
              : "text-stone-500 hover:text-stone-800"
          }`}
        >
          Rascunhos (4)
        </button>

        <button
          onClick={() => setActiveTab("ESGOTADOS")}
          className={`pb-3 font-semibold transition-colors relative cursor-pointer ${
            activeTab === "ESGOTADOS"
              ? "text-stone-900 font-bold border-b-2 border-stone-900"
              : "text-stone-500 hover:text-stone-800"
          }`}
        >
          Esgotados (2)
        </button>

        <button
          onClick={() => setActiveTab("ESTOQUE_BAIXO")}
          className={`pb-3 font-semibold transition-colors relative cursor-pointer ${
            activeTab === "ESTOQUE_BAIXO"
              ? "text-stone-900 font-bold border-b-2 border-stone-900"
              : "text-stone-500 hover:text-stone-800"
          }`}
        >
          Estoque baixo (3)
        </button>
      </div>

      {/* ========================================================================= */}
      {/* 4-COLUMN PRODUCT GRID (EXACT WIREFRAME DESIGN)                            */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
        {filteredItems.map((product: any) => {
          const isFav = favorites[product.id];
          const stock =
            product.availableStock !== undefined
              ? product.availableStock
              : (product.stockAvailable !== undefined ? product.stockAvailable : (product.currentStock || 0));
          const isLowStock = product.isLowStock || (stock > 0 && stock <= 4);

          return (
            <div
              key={product.id}
              className="bg-white rounded-2xl border border-stone-200/90 shadow-2xs hover:shadow-xs hover:border-stone-300 transition-all flex flex-col justify-between overflow-hidden group cursor-pointer"
              onClick={() => onEditProduct && onEditProduct(product)}
            >
              <div>
                {/* Image & Top Badges Container */}
                <div className="relative aspect-square bg-[#FBF9F7] overflow-hidden flex items-center justify-center p-4">
                  {/* Top Left: Ativo badge */}
                  <span className="absolute top-3 left-3 px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 z-10">
                    Ativo
                  </span>

                  {/* Top Right: Heart & 3 dots */}
                  <div className="absolute top-3 right-3 flex items-center gap-1.5 z-10">
                    <button
                      onClick={(e) => toggleFavorite(product.id, e)}
                      className={`p-1.5 rounded-full backdrop-blur-xs transition-colors cursor-pointer ${
                        isFav
                          ? "bg-rose-50 text-rose-600"
                          : "bg-white/80 hover:bg-white text-stone-400 hover:text-stone-700"
                      }`}
                    >
                      <Heart className={`w-3.5 h-3.5 ${isFav ? "fill-rose-500 text-rose-500" : ""}`} />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (onEditProduct) onEditProduct(product);
                      }}
                      className="p-1.5 rounded-full bg-white/80 hover:bg-white text-stone-400 hover:text-stone-700 backdrop-blur-xs transition-colors cursor-pointer"
                    >
                      <MoreVertical className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Product Image */}
                  <img
                    src={product.imageUrl}
                    alt={product.name}
                    className="w-full h-full object-contain mix-blend-multiply group-hover:scale-104 transition-transform duration-300"
                    referrerPolicy="no-referrer"
                  />
                </div>

                {/* Card Body */}
                <div className="p-4 space-y-1">
                  <h3 className="text-xs font-bold text-stone-900 truncate">
                    {product.name}
                  </h3>
                  <div className="text-[11px] text-stone-400 font-mono">
                    {product.sku}
                  </div>
                  <div className="text-sm font-bold text-stone-900 pt-1">
                    R$ {Number(product.price).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                  </div>
                </div>
              </div>

              {/* Card Footer: Estoque */}
              <div className="px-4 pb-4 pt-1 flex items-center gap-2">
                <span className="text-[11px] text-stone-500">
                  Estoque: {stock} un
                </span>
                {isLowStock && (
                  <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                    Estoque baixo
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
