import React, { useState } from "react";
import {
  Package,
  Layers,
  Sparkles,
  DollarSign,
  Eye,
  EyeOff,
  FileText,
  AlertTriangle,
  CheckCircle2,
  Filter,
  ArrowRight,
  TrendingUp,
  Box,
  Tag,
  ShieldCheck,
  Building2,
  Info,
} from "lucide-react";
import { ProductItem, PublicationStatus } from "../types";

interface ProductReadinessModalProps {
  isOpen: boolean;
  onClose: () => void;
  products: ProductItem[];
  onOpenEditProduct: (product: ProductItem) => void;
  onUpdateProduct: (product: ProductItem) => void;
}

export const ProductReadinessModal: React.FC<ProductReadinessModalProps> = ({
  isOpen,
  onClose,
  products,
  onOpenEditProduct,
  onUpdateProduct,
}) => {
  const [filterMode, setFilterMode] = useState<"ALL" | "PUBLISHED" | "DRAFT" | "HIDDEN" | "OUT_OF_STOCK" | "READY_TO_PUBLISH">("ALL");

  if (!isOpen) return null;

  // Compute readiness score for each product
  const auditProducts = products.map((p) => {
    const checks = {
      hasBasicInfo: !!(p.name && p.sku && p.category),
      hasPricing: p.price > 0 && p.costPrice > 0,
      hasCharacteristics: !!(p.bath && p.material && p.stones?.length),
      hasMedia: !!p.imageUrl,
      hasGallery: !!(p.galleryUrls && p.galleryUrls.length > 1),
      hasStock: (p.stockPhysical || 0) > 0,
      isPublished: p.publicationStatus === "PUBLISHED" || p.status === "ATIVO",
    };

    let score = 0;
    if (checks.hasBasicInfo) score += 20;
    if (checks.hasPricing) score += 20;
    if (checks.hasCharacteristics) score += 20;
    if (checks.hasMedia) score += 20;
    if (checks.hasGallery) score += 10;
    if (p.description && p.description.length > 20) score += 10;

    const isReadyForCatalog = score >= 80;
    const isOutOfStock = (p.stockPhysical || 0) === 0;

    return {
      product: p,
      score,
      checks,
      isReadyForCatalog,
      isOutOfStock,
    };
  });

  const totalProducts = products.length;
  const publishedCount = products.filter((p) => (p.publicationStatus || "PUBLISHED") === "PUBLISHED" && p.status !== "PAUSADO").length;
  const draftCount = products.filter((p) => p.publicationStatus === "DRAFT" || p.status === "PAUSADO").length;
  const outOfStockCount = products.filter((p) => (p.stockPhysical || 0) === 0).length;
  const avgReadiness = Math.round(auditProducts.reduce((acc, curr) => acc + curr.score, 0) / (totalProducts || 1));

  // Filtered List
  const filteredList = auditProducts.filter(({ product, score, isOutOfStock }) => {
    const pubStatus = product.publicationStatus || (product.status === "ATIVO" ? "PUBLISHED" : "DRAFT");
    if (filterMode === "PUBLISHED") return pubStatus === "PUBLISHED" && !isOutOfStock;
    if (filterMode === "DRAFT") return pubStatus === "DRAFT";
    if (filterMode === "HIDDEN") return pubStatus === "HIDDEN" || product.status === "PAUSADO";
    if (filterMode === "OUT_OF_STOCK") return isOutOfStock;
    if (filterMode === "READY_TO_PUBLISH") return score >= 80 && pubStatus === "DRAFT";
    return true;
  });

  const handleTogglePublication = (product: ProductItem, newStatus: PublicationStatus) => {
    const updated: ProductItem = {
      ...product,
      publicationStatus: newStatus,
      status: newStatus === "PUBLISHED" ? "ATIVO" : newStatus === "HIDDEN" ? "PAUSADO" : "PAUSADO",
    };
    onUpdateProduct(updated);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-5xl bg-white rounded-3xl shadow-2xl border border-stone-200 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="bg-gradient-to-r from-stone-900 via-stone-800 to-stone-900 text-white p-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-400/30 flex items-center justify-center text-amber-400 font-bold">
              <Package className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold uppercase tracking-widest text-amber-400 bg-amber-950/80 px-2.5 py-0.5 rounded-full border border-amber-500/30">
                  Auditoria de Catálogo
                </span>
                <span className="text-xs text-stone-400 font-mono">Product Readiness Index</span>
              </div>
              <h2 className="text-xl font-serif font-bold text-white tracking-wide mt-0.5">
                Prontidão de Produtos &amp; Publicação
              </h2>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-stone-400 hover:text-white p-2 rounded-xl hover:bg-stone-800 transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Conceptual Distinction Banner: Estoque vs Publicação */}
        <div className="bg-amber-50/90 border-b border-amber-200/80 px-6 py-3.5 flex items-center justify-between gap-4 text-xs">
          <div className="flex items-start sm:items-center gap-2.5 text-amber-950">
            <Info className="w-4 h-4 text-amber-700 shrink-0 mt-0.5 sm:mt-0" />
            <span>
              <strong>Regra de Ouro do Catálogo:</strong> <code>ESTOQUE ≠ PUBLICAÇÃO</code>. Um produto pode ter <strong>15 unidades no estoque físico</strong> e permanecer como <strong>Rascunho (DRAFT)</strong> até fotos e preços estarem prontos. Da mesma forma, um produto com <strong>0 em estoque</strong> pode continuar <strong>PUBLICADO</strong> como <em>Esgotado</em> para gerar lista de espera.
            </span>
          </div>
        </div>

        {/* Metrics Grid */}
        <div className="p-6 border-b border-stone-200 grid grid-cols-2 sm:grid-cols-4 gap-4 bg-stone-50/50">
          <div className="bg-white border border-stone-200 rounded-2xl p-3.5 space-y-1">
            <span className="text-[11px] font-semibold text-stone-500 block">Total de SKUs</span>
            <div className="flex items-baseline justify-between">
              <span className="text-2xl font-serif font-bold text-stone-900">{totalProducts}</span>
              <span className="text-xs text-stone-500 font-mono">100% auditado</span>
            </div>
          </div>

          <div className="bg-white border border-stone-200 rounded-2xl p-3.5 space-y-1">
            <span className="text-[11px] font-semibold text-emerald-800 block">🟢 Publicados no Catálogo</span>
            <div className="flex items-baseline justify-between">
              <span className="text-2xl font-serif font-bold text-emerald-900">{publishedCount}</span>
              <span className="text-xs text-emerald-700 font-semibold">Visíveis na loja</span>
            </div>
          </div>

          <div className="bg-white border border-stone-200 rounded-2xl p-3.5 space-y-1">
            <span className="text-[11px] font-semibold text-amber-800 block">🟡 Rascunhos / Ocultos</span>
            <div className="flex items-baseline justify-between">
              <span className="text-2xl font-serif font-bold text-amber-900">{draftCount}</span>
              <span className="text-xs text-amber-700 font-semibold">Em preparação</span>
            </div>
          </div>

          <div className="bg-white border border-stone-200 rounded-2xl p-3.5 space-y-1">
            <span className="text-[11px] font-semibold text-stone-700 block">Qualidade Média de Cadastro</span>
            <div className="flex items-baseline justify-between">
              <span className="text-2xl font-serif font-bold text-stone-900">{avgReadiness}%</span>
              <span className="text-xs text-emerald-600 font-semibold">Ready Index</span>
            </div>
          </div>
        </div>

        {/* Filter Pills */}
        <div className="px-6 py-3 border-b border-stone-200 flex items-center justify-between gap-2 overflow-x-auto">
          <div className="flex items-center gap-1.5 text-xs font-semibold">
            <button
              onClick={() => setFilterMode("ALL")}
              className={`px-3 py-1.5 rounded-full transition-colors ${
                filterMode === "ALL" ? "bg-stone-900 text-white" : "bg-stone-100 text-stone-600 hover:bg-stone-200"
              }`}
            >
              Todos ({totalProducts})
            </button>
            <button
              onClick={() => setFilterMode("PUBLISHED")}
              className={`px-3 py-1.5 rounded-full transition-colors flex items-center gap-1 ${
                filterMode === "PUBLISHED" ? "bg-emerald-700 text-white" : "bg-emerald-50 text-emerald-800 hover:bg-emerald-100"
              }`}
            >
              <span>Publicados</span>
              <span className="text-[10px] bg-emerald-900/30 px-1.5 rounded-full">{publishedCount}</span>
            </button>
            <button
              onClick={() => setFilterMode("DRAFT")}
              className={`px-3 py-1.5 rounded-full transition-colors flex items-center gap-1 ${
                filterMode === "DRAFT" ? "bg-amber-700 text-white" : "bg-amber-50 text-amber-800 hover:bg-amber-100"
              }`}
            >
              <span>Rascunhos (DRAFT)</span>
              <span className="text-[10px] bg-amber-900/30 px-1.5 rounded-full">{draftCount}</span>
            </button>
            <button
              onClick={() => setFilterMode("OUT_OF_STOCK")}
              className={`px-3 py-1.5 rounded-full transition-colors flex items-center gap-1 ${
                filterMode === "OUT_OF_STOCK" ? "bg-rose-700 text-white" : "bg-rose-50 text-rose-800 hover:bg-rose-100"
              }`}
            >
              <span>Estoque Zero ({outOfStockCount})</span>
            </button>
          </div>
        </div>

        {/* Product Readiness Audit Table */}
        <div className="flex-1 overflow-y-auto p-6 space-y-3">
          {filteredList.map(({ product, score, checks, isOutOfStock }) => {
            const pubStatus = product.publicationStatus || (product.status === "ATIVO" ? "PUBLISHED" : "DRAFT");
            const profit = product.price - product.costPrice;
            const margin = product.price > 0 ? Math.round((profit / product.price) * 100) : 0;

            return (
              <div
                key={product.id}
                className="bg-white border border-stone-200 rounded-2xl p-4 hover:border-stone-400 transition-all shadow-xs space-y-3"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  {/* Product Info */}
                  <div className="flex items-center gap-3">
                    <img
                      src={product.imageUrl}
                      alt={product.name}
                      referrerPolicy="no-referrer"
                      className="w-14 h-14 rounded-xl object-cover border border-stone-200 shrink-0"
                    />
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-[11px] font-bold text-stone-600 bg-stone-100 px-2 py-0.5 rounded-md">
                          {product.sku}
                        </span>
                        <span className="text-[10px] uppercase font-bold tracking-wider text-amber-800 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                          {product.category}
                        </span>
                        <span className="text-[10px] text-stone-500 font-semibold">
                          {product.bath.replace("_", " ")}
                        </span>
                      </div>
                      <h4 className="text-sm font-serif font-bold text-stone-900 mt-0.5">
                        {product.name}
                      </h4>
                    </div>
                  </div>

                  {/* Commercial & Stock Highlights */}
                  <div className="flex items-center gap-4 text-xs">
                    <div className="text-right">
                      <span className="text-[10px] text-stone-400 block font-semibold">Preço &amp; Margem</span>
                      <span className="font-bold text-stone-900 text-sm">R$ {product.price.toFixed(2)}</span>
                      <span className="text-[10px] text-emerald-700 font-bold block">
                        Margem: {margin}% (R$ {profit.toFixed(2)})
                      </span>
                    </div>

                    {/* Estoque Breakdown */}
                    <div className="text-right bg-stone-50 px-3 py-1.5 rounded-xl border border-stone-200">
                      <span className="text-[10px] text-stone-500 block font-semibold">Estoque Físico / Livre</span>
                      <span className="font-bold text-stone-900">
                        {product.stockPhysical} un <span className="text-stone-400 font-normal">({product.stockAvailable} livre)</span>
                      </span>
                      {product.stockReserved ? (
                        <span className="text-[10px] text-amber-700 block font-bold">
                          {product.stockReserved} un reservada
                        </span>
                      ) : null}
                    </div>

                    {/* Status Toggle & Edit Buttons */}
                    <div className="flex items-center gap-2">
                      <select
                        value={pubStatus}
                        onChange={(e) => handleTogglePublication(product, e.target.value as PublicationStatus)}
                        className={`text-xs font-bold rounded-xl px-3 py-1.5 border cursor-pointer ${
                          pubStatus === "PUBLISHED"
                            ? isOutOfStock
                              ? "bg-rose-50 text-rose-900 border-rose-300"
                              : "bg-emerald-50 text-emerald-900 border-emerald-300"
                            : pubStatus === "DRAFT"
                            ? "bg-amber-50 text-amber-900 border-amber-300"
                            : "bg-stone-100 text-stone-800 border-stone-300"
                        }`}
                      >
                        <option value="PUBLISHED">
                          {isOutOfStock ? "🔴 Publicado (Esgotado)" : "🟢 Publicado (No Catálogo)"}
                        </option>
                        <option value="DRAFT">🟡 Rascunho (DRAFT)</option>
                        <option value="HIDDEN">👁️ Oculto (Privado)</option>
                        <option value="ARCHIVED">📦 Arquivado</option>
                      </select>

                      <button
                        onClick={() => {
                          onOpenEditProduct(product);
                          onClose();
                        }}
                        className="px-3 py-1.5 bg-stone-900 hover:bg-stone-800 text-white rounded-xl font-bold text-xs flex items-center gap-1 transition-colors"
                      >
                        <span>Editar</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Readiness Breakdown Checklist (Micro Audit) */}
                <div className="pt-2 border-t border-stone-100 grid grid-cols-2 sm:grid-cols-6 gap-2 text-[11px]">
                  <div className="flex items-center gap-1.5">
                    {checks.hasBasicInfo ? (
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    ) : (
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                    )}
                    <span className={checks.hasBasicInfo ? "text-stone-700" : "text-amber-800 font-bold"}>
                      Básico &amp; SKU
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    {checks.hasPricing ? (
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    ) : (
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                    )}
                    <span className={checks.hasPricing ? "text-stone-700" : "text-amber-800 font-bold"}>
                      Preço &amp; Custo
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    {checks.hasCharacteristics ? (
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    ) : (
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                    )}
                    <span className={checks.hasCharacteristics ? "text-stone-700" : "text-amber-800 font-bold"}>
                      Banho &amp; Pedras
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    {checks.hasMedia ? (
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    ) : (
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                    )}
                    <span className={checks.hasMedia ? "text-stone-700" : "text-amber-800 font-bold"}>
                      Foto Principal
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    {product.description ? (
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    ) : (
                      <AlertTriangle className="w-3.5 h-3.5 text-stone-400" />
                    )}
                    <span className="text-stone-700">Descrição Comercial</span>
                  </div>

                  {/* Readiness Score Badge */}
                  <div className="text-right sm:col-span-1">
                    <span className={`font-bold px-2 py-0.5 rounded-full ${
                      score >= 80
                        ? "bg-emerald-100 text-emerald-900"
                        : score >= 50
                        ? "bg-amber-100 text-amber-900"
                        : "bg-rose-100 text-rose-900"
                    }`}>
                      Prontidão: {score}%
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="p-4 bg-stone-50 border-t border-stone-200 flex items-center justify-between text-xs">
          <div className="text-stone-500">
            A auditoria garante que apenas peças com informações completas e fotos profissionais sejam visualizadas pelas clientes finais.
          </div>
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-stone-900 hover:bg-stone-800 text-white font-bold transition-colors"
          >
            Concluir Auditoria
          </button>
        </div>
      </div>
    </div>
  );
};
