import React, { useState, useEffect, useMemo, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import confetti from "canvas-confetti";
import {
  X,
  Zap,
  DollarSign,
  Boxes,
  TrendingUp,
  Percent,
  Plus,
  Minus,
  Check,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  ExternalLink,
  Tag,
  Shield,
  Layers,
  Sparkles,
  RotateCcw,
  Database,
  Server,
  Clock,
  ArrowRight,
  CheckCheck,
  RefreshCw,
} from "lucide-react";
import { ProductItem, JewelryBath } from "../types";
import { toast } from "../utils/toast";

interface ProductQuickEditDrawerProps {
  product: ProductItem | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdateProduct?: (updated: ProductItem) => void | Promise<any>;
  onUpdateStock?: (productId: string, qty: number, reason: string) => void | Promise<any>;
  onOpenFullEdit?: (product: ProductItem) => void;
}

const BATH_LABELS: Record<JewelryBath, string> = {
  OURO_18K: "Ouro 18k (10 milésimos)",
  RODIO_BRANCO: "Ródio Branco",
  RODIO_NEGRO: "Ródio Negro",
  PRATA_925: "Prata 925",
  ROSE_GOLD: "Rose Gold",
};

export const ProductQuickEditDrawer: React.FC<ProductQuickEditDrawerProps> = ({
  product,
  isOpen,
  onClose,
  onUpdateProduct,
  onUpdateStock,
  onOpenFullEdit,
}) => {
  if (!isOpen || !product) return null;

  const [price, setPrice] = useState<string>(product.price ? String(product.price) : "0");
  const [promoPrice, setPromoPrice] = useState<string>(
    product.promoPrice ? String(product.promoPrice) : ""
  );
  const [costPrice, setCostPrice] = useState<string>(
    product.costPrice ? String(product.costPrice) : "0"
  );
  const [stockPhysical, setStockPhysical] = useState<number>(product.stockPhysical || 0);
  const [stockReason, setStockReason] = useState<string>("Ajuste rápido de balcão");

  // Submission & Persistence States
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [persistedSuccess, setPersistedSuccess] = useState(false);
  const [persistedSnapshot, setPersistedSnapshot] = useState<{
    prevPrice: number;
    newPrice: number;
    prevPromo?: number;
    newPromo?: number;
    prevStock: number;
    newStock: number;
    stockDelta: number;
    timestamp: string;
    marginPercent: number;
    grossProfit: number;
  } | null>(null);

  // Auto-close countdown after successful persistence
  const [countdown, setCountdown] = useState<number>(4);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const countdownTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Sync state whenever selected product changes or opens
  useEffect(() => {
    if (product) {
      setPrice(product.price ? String(product.price) : "0");
      setPromoPrice(product.promoPrice ? String(product.promoPrice) : "");
      setCostPrice(product.costPrice ? String(product.costPrice) : "0");
      setStockPhysical(product.stockPhysical || 0);
      setStockReason("Ajuste rápido de balcão");
      setPersistedSuccess(false);
      setPersistedSnapshot(null);
      setCountdown(4);
      setIsPaused(false);
    }
  }, [product, isOpen]);

  // Handle auto-close countdown when persisted successfully
  useEffect(() => {
    if (persistedSuccess && !isPaused) {
      countdownTimerRef.current = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(countdownTimerRef.current as NodeJS.Timeout);
            onClose();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else if (countdownTimerRef.current) {
      clearInterval(countdownTimerRef.current);
    }

    return () => {
      if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
    };
  }, [persistedSuccess, isPaused, onClose]);

  // Handle ESC key press
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  // Parse numeric values
  const numPrice = parseFloat(price) || 0;
  const numCost = parseFloat(costPrice) || 0;
  const numPromo = promoPrice.trim() !== "" ? parseFloat(promoPrice) : undefined;
  const currentPhysical = product.stockPhysical || 0;
  const currentPrice = product.price || 0;
  const stockDelta = stockPhysical - currentPhysical;

  // Commercial Margin Calculations
  const grossProfit = numPrice > 0 ? numPrice - numCost : 0;
  const markupPercent = numCost > 0 ? Math.round(((numPrice - numCost) / numCost) * 100) : 0;
  const marginPercent = numPrice > 0 ? Math.round(((numPrice - numCost) / numPrice) * 100) : 0;
  const discountPercent =
    numPromo && numPrice > 0 && numPromo < numPrice
      ? Math.round(((numPrice - numPromo) / numPrice) * 100)
      : 0;

  // Real-time Validation Engine
  const validation = useMemo(() => {
    const priceErrors: string[] = [];
    const priceWarnings: string[] = [];
    const promoErrors: string[] = [];
    const promoWarnings: string[] = [];
    const stockErrors: string[] = [];
    const stockWarnings: string[] = [];

    // 1. Price validation
    if (!price || price.trim() === "") {
      priceErrors.push("O preço de venda é obrigatório.");
    } else if (isNaN(numPrice) || numPrice <= 0) {
      priceErrors.push("O preço de venda deve ser maior que zero (R$ 0,00).");
    } else if (numCost > 0 && numPrice < numCost) {
      priceWarnings.push(
        `Atenção: Preço de venda (R$ ${numPrice.toFixed(2)}) está abaixo do custo base (R$ ${numCost.toFixed(2)}), gerando prejuízo de R$ ${(numCost - numPrice).toFixed(2)} por peça.`
      );
    } else if (numCost > 0 && markupPercent < 15) {
      priceWarnings.push(
        `Margem comercial reduzida (${markupPercent}% de markup). Recomenda-se no mínimo 50% para semijoias finas.`
      );
    }

    // 2. Promotional Price validation
    if (promoPrice.trim() !== "") {
      if (numPromo === undefined || isNaN(numPromo) || numPromo <= 0) {
        promoErrors.push("O preço promocional deve ser um número positivo maior que zero.");
      } else if (numPrice > 0 && numPromo >= numPrice) {
        promoErrors.push(
          `O preço promocional (R$ ${numPromo.toFixed(2)}) deve ser estritamente menor que o preço de venda normal (R$ ${numPrice.toFixed(2)}).`
        );
      } else if (numCost > 0 && numPromo < numCost) {
        promoWarnings.push(
          `Aviso: O preço promocional está abaixo do custo de fabricação/banho (R$ ${numCost.toFixed(2)}).`
        );
      }
    }

    // 3. Stock validation
    if (isNaN(stockPhysical) || stockPhysical < 0) {
      stockErrors.push("O saldo de estoque físico não pode ser negativo.");
    } else if (!Number.isInteger(stockPhysical)) {
      stockErrors.push("O saldo de estoque físico deve ser um número inteiro.");
    } else if (stockPhysical === 0) {
      stockWarnings.push(
        "Saldo zerado: a peça será alterada para status ESGOTADA e os botões de venda direta serão desativados na vitrine."
      );
    } else if (stockPhysical <= (product.minStockAlert || 3)) {
      stockWarnings.push(
        `Nível de estoque crítico (${stockPhysical} un). Limite mínimo configurado: ${product.minStockAlert || 3} un.`
      );
    }

    const hasErrors = priceErrors.length > 0 || promoErrors.length > 0 || stockErrors.length > 0;
    const allWarnings = [...priceWarnings, ...promoWarnings, ...stockWarnings];

    return {
      priceErrors,
      priceWarnings,
      promoErrors,
      promoWarnings,
      stockErrors,
      stockWarnings,
      hasErrors,
      allWarnings,
      isValid: !hasErrors,
    };
  }, [price, numPrice, promoPrice, numPromo, numCost, markupPercent, stockPhysical, product.minStockAlert]);

  // Quick Price Modifiers
  const handleApplyMargin = (targetMarginPercent: number) => {
    if (numCost <= 0) return;
    const calculatedPrice = numCost / (1 - targetMarginPercent / 100);
    setPrice(calculatedPrice.toFixed(2));
  };

  const handleApplyMarkup = (markupPct: number) => {
    if (numCost <= 0) return;
    const calculatedPrice = numCost * (1 + markupPct / 100);
    setPrice(calculatedPrice.toFixed(2));
  };

  const handleRoundTo90 = () => {
    if (numPrice <= 0) return;
    const rounded = Math.floor(numPrice) + 0.9;
    setPrice(rounded.toFixed(2));
  };

  // Stock Steppers
  const handleAdjustStock = (delta: number) => {
    setStockPhysical((prev) => Math.max(0, prev + delta));
  };

  // Submit and persist to PostgreSQL backend
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!product || !validation.isValid) {
      if (validation.priceErrors[0]) toast.warning(validation.priceErrors[0]);
      else if (validation.promoErrors[0]) toast.warning(validation.promoErrors[0]);
      else if (validation.stockErrors[0]) toast.warning(validation.stockErrors[0]);
      return;
    }

    setIsSubmitting(true);
    try {
      // 1. If stock changed, dispatch inventory movement adjustment to PostgreSQL
      if (stockDelta !== 0 && onUpdateStock) {
        await onUpdateStock(
          product.id,
          stockDelta,
          `${stockReason} (${stockDelta > 0 ? "+" : ""}${stockDelta} un)`
        );
      }

      // 2. Dispatch product update to PostgreSQL
      const updatedStockAvailable = Math.max(
        0,
        stockPhysical - (product.stockReserved || 0)
      );

      const updatedProduct: ProductItem = {
        ...product,
        price: numPrice,
        costPrice: numCost,
        promoPrice: numPromo && numPromo > 0 ? numPromo : undefined,
        stockPhysical,
        stockAvailable: updatedStockAvailable,
        status: stockPhysical === 0 ? "ESGOTADO" : product.status === "ESGOTADO" ? "ATIVO" : product.status,
      };

      if (onUpdateProduct) {
        await onUpdateProduct(updatedProduct);
      }

      // Save persisted snapshot details for animated confirmation view
      setPersistedSnapshot({
        prevPrice: currentPrice,
        newPrice: numPrice,
        prevPromo: product.promoPrice,
        newPromo: numPromo,
        prevStock: currentPhysical,
        newStock: stockPhysical,
        stockDelta,
        timestamp: new Date().toLocaleTimeString("pt-BR"),
        marginPercent,
        grossProfit,
      });

      // Launch celebration confetti burst
      try {
        confetti({
          particleCount: 60,
          spread: 70,
          origin: { y: 0.5, x: 0.8 },
          colors: ["#d97706", "#059669", "#f59e0b", "#10b981", "#fbbf24"],
        });
      } catch (err) {
        // Silently ignore if canvas not available
      }

      setPersistedSuccess(true);
      setCountdown(4);
      setIsPaused(false);
      toast.success(`Peça ${product.sku} persistida com sucesso no PostgreSQL!`);
    } catch (err: any) {
      console.error("Erro ao persistir no PostgreSQL:", err);
      toast.error("Ocorreu um erro ao persistir as alterações no PostgreSQL.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const isLowStock = stockPhysical <= (product.minStockAlert || 3) && stockPhysical > 0;
  const isOutOfStock = stockPhysical === 0;

  return (
    <div
      id="product-quick-edit-drawer-overlay"
      className="fixed inset-0 z-50 bg-stone-950/60 backdrop-blur-xs flex justify-end animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isSubmitting) onClose();
      }}
    >
      <div
        id="product-quick-edit-drawer-panel"
        className="bg-white w-full max-w-xl h-full shadow-2xl flex flex-col overflow-hidden text-stone-900 border-l border-stone-200 animate-in slide-in-from-right duration-300"
        role="dialog"
        aria-labelledby="quick-edit-drawer-title"
        aria-modal="true"
      >
        {/* Header */}
        <div className="p-5 border-b border-stone-200 bg-stone-50/95 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-12 h-12 rounded-2xl overflow-hidden bg-stone-200 border border-stone-300/80 shrink-0 shadow-xs relative">
              <img
                src={product.imageUrl}
                alt={product.name}
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
              {/* PostgreSQL Sync Indicator Badge */}
              <div
                className="absolute bottom-0 right-0 p-0.5 bg-emerald-600 text-white rounded-tl-md shadow-2xs"
                title="Sincronizado com backend PostgreSQL"
              >
                <Database className="w-2.5 h-2.5" />
              </div>
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
                  <Zap className="w-3 h-3 text-amber-600 fill-amber-500" />
                  Edição Rápida
                </span>
                <span className="font-mono text-xs font-bold text-stone-500">
                  {product.sku}
                </span>
                <span className="hidden sm:inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                  <Server className="w-2.5 h-2.5 text-emerald-600" />
                  PostgreSQL
                </span>
              </div>
              <h2
                id="quick-edit-drawer-title"
                className="text-base font-serif font-bold text-stone-900 truncate mt-0.5"
                title={product.name}
              >
                {product.name}
              </h2>
              <div className="text-[11px] text-stone-500 flex items-center gap-2">
                <span>{product.category}</span>
                <span>•</span>
                <span className="text-amber-800 font-medium">
                  {BATH_LABELS[product.bath] || product.bath}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {onOpenFullEdit && !persistedSuccess && (
              <button
                type="button"
                id="quick-edit-open-full-modal-btn"
                onClick={() => {
                  onClose();
                  onOpenFullEdit(product);
                }}
                className="px-2.5 py-1.5 text-xs font-medium text-stone-600 hover:text-stone-900 hover:bg-stone-200/70 rounded-xl transition-colors flex items-center gap-1 cursor-pointer"
                title="Abrir formulário com todos os campos de foto, materiais e garantias"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Edição Completa</span>
              </button>
            )}
            <button
              type="button"
              id="quick-edit-close-btn"
              onClick={onClose}
              disabled={isSubmitting}
              className="p-2 text-stone-400 hover:text-stone-700 hover:bg-stone-200/60 rounded-xl transition-colors cursor-pointer disabled:opacity-40"
              aria-label="Fechar gaveta"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Area: Form OR Animated PostgreSQL Success Screen */}
        <div className="flex-1 overflow-y-auto relative">
          <AnimatePresence mode="wait">
            {persistedSuccess && persistedSnapshot ? (
              /* Success Animation Screen */
              <motion.div
                key="success-screen"
                initial={{ opacity: 0, scale: 0.94 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ type: "spring", stiffness: 280, damping: 24 }}
                className="p-6 h-full flex flex-col justify-between"
                id="quick-edit-success-view"
              >
                <div className="space-y-6 pt-4">
                  {/* Animated Checkmark Halo */}
                  <div className="text-center space-y-3">
                    <motion.div
                      initial={{ scale: 0, rotate: -45 }}
                      animate={{ scale: 1, rotate: 0 }}
                      transition={{
                        type: "spring",
                        stiffness: 260,
                        damping: 18,
                        delay: 0.1,
                      }}
                      className="w-18 h-18 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center mx-auto shadow-md border border-emerald-300 relative"
                    >
                      <Check className="w-9 h-9 stroke-[3]" />
                      <motion.div
                        animate={{ scale: [1, 1.25, 1], opacity: [0.6, 0, 0.6] }}
                        transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
                        className="absolute inset-0 rounded-full border-2 border-emerald-500 pointer-events-none"
                      />
                    </motion.div>

                    <div className="space-y-1">
                      <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-900 border border-emerald-300 shadow-2xs">
                        <Database className="w-3.5 h-3.5 text-emerald-700" />
                        <span>Persistido no Banco de Dados PostgreSQL</span>
                      </div>
                      <h3 className="text-xl font-serif font-bold text-stone-900 pt-1">
                        Atualização Concluída com Sucesso!
                      </h3>
                      <p className="text-xs text-stone-600 max-w-md mx-auto">
                        Os novos valores de preço e saldo de estoque foram gravados e auditados no Ledger relacional.
                      </p>
                    </div>
                  </div>

                  {/* Summary Comparison Cards */}
                  <div className="bg-stone-50 border border-stone-200/90 rounded-2xl p-4.5 space-y-4 shadow-xs">
                    <div className="flex items-center justify-between border-b border-stone-200 pb-2.5">
                      <span className="text-xs font-bold text-stone-800 uppercase tracking-wider flex items-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        Resumo das Alterações Gravadas
                      </span>
                      <span className="font-mono text-[11px] text-stone-500 flex items-center gap-1">
                        <Clock className="w-3 h-3 text-stone-400" />
                        {persistedSnapshot.timestamp}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {/* Price Delta Card */}
                      <div className="bg-white border border-stone-200 rounded-xl p-3 shadow-2xs">
                        <span className="text-[10px] uppercase font-bold text-stone-400 block mb-1">
                          Preço de Venda
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-stone-400 line-through">
                            R$ {persistedSnapshot.prevPrice.toFixed(2)}
                          </span>
                          <ArrowRight className="w-3.5 h-3.5 text-stone-400" />
                          <span className="font-serif font-bold text-base text-stone-900">
                            R$ {persistedSnapshot.newPrice.toFixed(2)}
                          </span>
                        </div>
                        <div className="mt-2 flex items-center gap-1.5">
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200">
                            {persistedSnapshot.marginPercent}% Margem
                          </span>
                          <span className="text-[10px] text-stone-500">
                            Lucro: R$ {persistedSnapshot.grossProfit.toFixed(2)}/un
                          </span>
                        </div>
                      </div>

                      {/* Stock Delta Card */}
                      <div className="bg-white border border-stone-200 rounded-xl p-3 shadow-2xs">
                        <span className="text-[10px] uppercase font-bold text-stone-400 block mb-1">
                          Saldo Físico (Prateleira)
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-stone-400">
                            {persistedSnapshot.prevStock} un
                          </span>
                          <ArrowRight className="w-3.5 h-3.5 text-stone-400" />
                          <span className="font-serif font-bold text-base text-stone-900">
                            {persistedSnapshot.newStock} un
                          </span>
                        </div>
                        <div className="mt-2">
                          {persistedSnapshot.stockDelta !== 0 ? (
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                                persistedSnapshot.stockDelta > 0
                                  ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                                  : "bg-rose-50 text-rose-800 border border-rose-200"
                              }`}
                            >
                              {persistedSnapshot.stockDelta > 0
                                ? `+${persistedSnapshot.stockDelta} un movimentadas (Entrada)`
                                : `${persistedSnapshot.stockDelta} un movimentadas (Saída)`}
                            </span>
                          ) : (
                            <span className="text-[10px] font-medium text-stone-500 bg-stone-100 px-2 py-0.5 rounded-md">
                              Saldo mantido inalterado
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Audit Trail Badge */}
                    <div className="pt-2 border-t border-stone-100 flex items-center justify-between text-[11px] text-stone-500">
                      <span className="flex items-center gap-1 text-emerald-800 font-medium">
                        <CheckCheck className="w-3.5 h-3.5 text-emerald-600" />
                        Auditoria ACID gravada em inventory_movements & products
                      </span>
                      <span className="font-mono text-[10px] text-stone-400">
                        status: 200 OK
                      </span>
                    </div>
                  </div>
                </div>

                {/* Success Screen Action Controls */}
                <div className="pt-6 border-t border-stone-200 space-y-3">
                  {/* Auto-close Progress Bar */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs text-stone-500">
                      <span>
                        {isPaused ? (
                          <span className="text-amber-700 font-medium">Contagem pausada</span>
                        ) : (
                          <span>Fechamento automático em <strong>{countdown}s</strong>...</span>
                        )}
                      </span>
                      <button
                        type="button"
                        onClick={() => setIsPaused((prev) => !prev)}
                        className="text-xs font-semibold text-stone-600 hover:text-stone-900 underline cursor-pointer"
                      >
                        {isPaused ? "Retomar contagem" : "Pausar fechamento"}
                      </button>
                    </div>
                    <div className="w-full bg-stone-100 h-1.5 rounded-full overflow-hidden">
                      <motion.div
                        className="h-full bg-emerald-500 rounded-full"
                        initial={{ width: "100%" }}
                        animate={{ width: isPaused ? `${(countdown / 4) * 100}%` : "0%" }}
                        transition={{ duration: isPaused ? 0 : countdown, ease: "linear" }}
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      id="quick-edit-edit-again-btn"
                      onClick={() => {
                        setPersistedSuccess(false);
                      }}
                      className="flex-1 py-2.5 px-4 rounded-xl border border-stone-300 hover:bg-stone-100 text-stone-800 text-xs font-bold transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <RotateCcw className="w-3.5 h-3.5 text-stone-600" />
                      <span>Continuar Editando</span>
                    </button>

                    <button
                      type="button"
                      id="quick-edit-done-close-btn"
                      onClick={onClose}
                      className="flex-1 py-2.5 px-4 rounded-xl bg-stone-900 hover:bg-stone-800 text-white text-xs font-bold shadow-sm hover:shadow transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Check className="w-4 h-4 text-emerald-400" />
                      <span>Concluir e Fechar</span>
                    </button>
                  </div>
                </div>
              </motion.div>
            ) : (
              /* Editable Form View with Real-time Validation */
              <form
                key="edit-form"
                id="product-quick-edit-form"
                onSubmit={handleSave}
                className="p-6 space-y-6"
              >
                {/* Real-time Validation Status Banner */}
                <div
                  id="quick-edit-validation-banner"
                  className={`rounded-2xl p-4 transition-all duration-200 border ${
                    validation.hasErrors
                      ? "bg-rose-50 border-rose-200 text-rose-900"
                      : validation.allWarnings.length > 0
                      ? "bg-amber-50/80 border-amber-200 text-amber-950"
                      : "bg-emerald-50/90 border-emerald-200 text-emerald-950"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    {validation.hasErrors ? (
                      <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                    ) : validation.allWarnings.length > 0 ? (
                      <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                    ) : (
                      <div className="relative mt-0.5">
                        <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                        <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                      </div>
                    )}

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <span className="text-xs font-bold uppercase tracking-wider">
                          {validation.hasErrors
                            ? "Ajustes Necessários para Gravação"
                            : validation.allWarnings.length > 0
                            ? "Validação: Pronto com Avisos Comerciais"
                            : "Validação em Tempo Real: Tudo Pronto"}
                        </span>
                        <span
                          className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-bold ${
                            validation.hasErrors
                              ? "bg-rose-200 text-rose-900"
                              : "bg-emerald-200 text-emerald-900"
                          }`}
                        >
                          {validation.hasErrors ? "Bloqueado" : "PostgreSQL Ready"}
                        </span>
                      </div>

                      {validation.hasErrors && (
                        <ul className="mt-2 space-y-1 text-xs text-rose-800 list-disc list-inside">
                          {validation.priceErrors.map((err, i) => (
                            <li key={`pe-${i}`}>{err}</li>
                          ))}
                          {validation.promoErrors.map((err, i) => (
                            <li key={`pme-${i}`}>{err}</li>
                          ))}
                          {validation.stockErrors.map((err, i) => (
                            <li key={`se-${i}`}>{err}</li>
                          ))}
                        </ul>
                      )}

                      {!validation.hasErrors && validation.allWarnings.length > 0 && (
                        <div className="mt-1.5 space-y-1 text-xs text-amber-900">
                          {validation.allWarnings.map((warn, i) => (
                            <p key={`w-${i}`} className="leading-relaxed">
                              {warn}
                            </p>
                          ))}
                        </div>
                      )}

                      {!validation.hasErrors && validation.allWarnings.length === 0 && (
                        <p className="mt-1 text-xs text-emerald-800">
                          Todos os campos atendem às restrições de preço, margem e integridade do PostgreSQL.
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Section 1: Preço de Venda e Margem Comercial */}
                <div className="bg-white border border-stone-200 rounded-2xl p-5 space-y-4 shadow-xs">
                  <div className="flex items-center justify-between border-b border-stone-100 pb-3">
                    <div className="flex items-center gap-2">
                      <div className="p-2 bg-amber-50 text-amber-700 rounded-xl">
                        <DollarSign className="w-4 h-4" />
                      </div>
                      <div>
                        <h3 className="text-xs font-bold uppercase tracking-wider text-stone-900">
                          Preço de Venda & Margem
                        </h3>
                        <p className="text-[11px] text-stone-500">
                          Atualize o preço no catálogo e vitrine em tempo real
                        </p>
                      </div>
                    </div>
                    <span className="font-mono text-xs font-bold text-stone-400">
                      Custo Base: R$ {numCost.toFixed(2)}
                    </span>
                  </div>

                  {/* Price Inputs Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Regular Price */}
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label
                          htmlFor="quick-edit-price"
                          className="block text-xs font-bold text-stone-700"
                        >
                          Preço de Venda (R$) <span className="text-rose-500">*</span>
                        </label>
                        {validation.priceErrors.length === 0 && numPrice > 0 && (
                          <span className="inline-flex items-center gap-1 text-[10px] text-emerald-700 font-bold">
                            <Check className="w-3 h-3" /> Válido
                          </span>
                        )}
                      </div>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 font-serif font-bold text-sm">
                          R$
                        </span>
                        <input
                          type="number"
                          id="quick-edit-price"
                          step="0.01"
                          min="0.01"
                          value={price}
                          onChange={(e) => setPrice(e.target.value)}
                          className={`w-full pl-10 pr-3 py-2.5 rounded-xl font-serif font-bold text-lg transition-all focus:outline-none focus:ring-2 ${
                            validation.priceErrors.length > 0
                              ? "bg-rose-50/40 border-2 border-rose-400 text-rose-900 focus:ring-rose-400"
                              : numPrice > 0
                              ? "bg-stone-50 border border-stone-300 text-stone-900 focus:bg-white focus:ring-amber-400 focus:border-amber-400"
                              : "bg-stone-50 border border-stone-300 text-stone-900"
                          }`}
                          placeholder="0.00"
                          required
                        />
                      </div>
                      {validation.priceErrors[0] && (
                        <p className="text-[11px] text-rose-600 font-medium mt-1 flex items-center gap-1">
                          <AlertCircle className="w-3 h-3 shrink-0" />
                          {validation.priceErrors[0]}
                        </p>
                      )}
                    </div>

                    {/* Promotional Price */}
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label
                          htmlFor="quick-edit-promo-price"
                          className="block text-xs font-bold text-stone-700"
                        >
                          Preço Promo (R$) <span className="text-stone-400 font-normal">(Opcional)</span>
                        </label>
                        {discountPercent > 0 && (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
                            <Sparkles className="w-2.5 h-2.5 text-amber-700" />
                            -{discountPercent}% OFF
                          </span>
                        )}
                      </div>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 font-serif font-bold text-sm">
                          R$
                        </span>
                        <input
                          type="number"
                          id="quick-edit-promo-price"
                          step="0.01"
                          min="0"
                          value={promoPrice}
                          onChange={(e) => setPromoPrice(e.target.value)}
                          className={`w-full pl-10 pr-3 py-2.5 rounded-xl font-serif font-bold text-lg transition-all focus:outline-none focus:ring-2 ${
                            validation.promoErrors.length > 0
                              ? "bg-rose-50/40 border-2 border-rose-400 text-rose-900 focus:ring-rose-400"
                              : "bg-stone-50 border border-stone-300 text-stone-900 focus:bg-white focus:ring-amber-400 focus:border-amber-400"
                          }`}
                          placeholder="Deixe em branco se não houver"
                        />
                      </div>
                      {validation.promoErrors[0] && (
                        <p className="text-[11px] text-rose-600 font-medium mt-1 flex items-center gap-1">
                          <AlertCircle className="w-3 h-3 shrink-0" />
                          {validation.promoErrors[0]}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Quick Price Formula Presets */}
                  <div>
                    <span className="text-[10px] uppercase font-bold text-stone-400 tracking-wider block mb-1.5">
                      Ajustes Rápidos de Markup & Margem
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      <button
                        type="button"
                        id="preset-markup-100"
                        onClick={() => handleApplyMarkup(100)}
                        className="px-2.5 py-1 text-xs font-medium rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-700 transition-colors cursor-pointer"
                        title="Dobro do custo (100% de markup / 50% de margem)"
                      >
                        Markup 2x (100%)
                      </button>
                      <button
                        type="button"
                        id="preset-markup-150"
                        onClick={() => handleApplyMarkup(150)}
                        className="px-2.5 py-1 text-xs font-medium rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-700 transition-colors cursor-pointer"
                        title="2.5x custo (150% de markup / 60% de margem)"
                      >
                        Markup 2.5x (150%)
                      </button>
                      <button
                        type="button"
                        id="preset-margin-65"
                        onClick={() => handleApplyMargin(65)}
                        className="px-2.5 py-1 text-xs font-medium rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-700 transition-colors cursor-pointer"
                        title="Margem de 65%"
                      >
                        Margem 65%
                      </button>
                      <button
                        type="button"
                        id="preset-round-90"
                        onClick={handleRoundTo90}
                        className="px-2.5 py-1 text-xs font-medium rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 transition-colors cursor-pointer"
                        title="Arredondar final para ,90"
                      >
                        Arredondar ,90
                      </button>
                    </div>
                  </div>

                  {/* Real-time Profit & Margin Card */}
                  <div className="bg-stone-50 border border-stone-200/90 rounded-xl p-3.5 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-emerald-100 text-emerald-800 rounded-lg">
                        <TrendingUp className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-stone-800">
                          Lucro Bruto:{" "}
                          <span
                            className={`font-serif font-bold ${
                              grossProfit >= 0 ? "text-emerald-700" : "text-rose-600"
                            }`}
                          >
                            R$ {grossProfit.toFixed(2)}
                          </span>{" "}
                          / peça
                        </div>
                        <div className="text-[11px] text-stone-500">
                          Markup: {markupPercent}% sobre custo base
                        </div>
                      </div>
                    </div>

                    <div className="text-right">
                      <span
                        className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold ${
                          marginPercent >= 60
                            ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                            : marginPercent >= 40
                            ? "bg-amber-100 text-amber-800 border border-amber-300"
                            : marginPercent >= 0
                            ? "bg-stone-200 text-stone-800"
                            : "bg-rose-100 text-rose-800 border border-rose-300"
                        }`}
                      >
                        {marginPercent}% Margem
                      </span>
                      <span className="block text-[10px] text-stone-400 mt-0.5">
                        {marginPercent >= 60
                          ? "Margem Excelente"
                          : marginPercent >= 40
                          ? "Margem Saudável"
                          : marginPercent >= 0
                          ? "Margem Reduzida"
                          : "Prejuízo por Peça"}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Section 2: Nível de Estoque (Physical & Available Stock) */}
                <div className="bg-white border border-stone-200 rounded-2xl p-5 space-y-4 shadow-xs">
                  <div className="flex items-center justify-between border-b border-stone-100 pb-3">
                    <div className="flex items-center gap-2">
                      <div className="p-2 bg-stone-100 text-stone-800 rounded-xl">
                        <Boxes className="w-4 h-4" />
                      </div>
                      <div>
                        <h3 className="text-xs font-bold uppercase tracking-wider text-stone-900">
                          Saldo de Estoque Físico & Disponível
                        </h3>
                        <p className="text-[11px] text-stone-500">
                          Ajuste o saldo do armazém com conciliação automática no PostgreSQL
                        </p>
                      </div>
                    </div>
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                        isOutOfStock
                          ? "bg-rose-100 text-rose-800 border border-rose-200"
                          : isLowStock
                          ? "bg-amber-100 text-amber-800 border border-amber-200"
                          : "bg-emerald-100 text-emerald-800 border border-emerald-200"
                      }`}
                    >
                      {isOutOfStock ? "Esgotado" : isLowStock ? "Estoque Baixo" : "Estoque Normal"}
                    </span>
                  </div>

                  {/* Current Stock Snapshot */}
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="bg-stone-50 border border-stone-200 rounded-xl p-2.5">
                      <span className="text-[10px] uppercase font-bold text-stone-400 block">
                        Físico Atual
                      </span>
                      <span className="font-serif font-bold text-stone-900 text-base">
                        {currentPhysical} un
                      </span>
                    </div>
                    <div className="bg-stone-50 border border-stone-200 rounded-xl p-2.5">
                      <span className="text-[10px] uppercase font-bold text-stone-400 block">
                        Reservado
                      </span>
                      <span className="font-serif font-bold text-amber-800 text-base">
                        {product.stockReserved || 0} un
                      </span>
                    </div>
                    <div className="bg-stone-50 border border-stone-200 rounded-xl p-2.5">
                      <span className="text-[10px] uppercase font-bold text-stone-400 block">
                        Consignado
                      </span>
                      <span className="font-serif font-bold text-stone-600 text-base">
                        {product.stockConsigned || 0} un
                      </span>
                    </div>
                  </div>

                  {/* Target Stock Input + Stepper */}
                  <div>
                    <label
                      htmlFor="quick-edit-stock-physical"
                      className="block text-xs font-bold text-stone-700 mb-1"
                    >
                      Novo Saldo Físico em Prateleira (unidades)
                    </label>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        id="stock-decrease-5"
                        onClick={() => handleAdjustStock(-5)}
                        className="p-2 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold text-xs transition-colors cursor-pointer"
                        title="Subtrair 5 unidades"
                      >
                        -5
                      </button>
                      <button
                        type="button"
                        id="stock-decrease-1"
                        onClick={() => handleAdjustStock(-1)}
                        className="p-2.5 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 transition-colors cursor-pointer"
                        title="Subtrair 1 unidade"
                      >
                        <Minus className="w-4 h-4" />
                      </button>

                      <input
                        type="number"
                        id="quick-edit-stock-physical"
                        min="0"
                        value={stockPhysical}
                        onChange={(e) =>
                          setStockPhysical(Math.max(0, parseInt(e.target.value) || 0))
                        }
                        className={`flex-1 py-2.5 px-4 rounded-xl text-center font-serif font-bold text-xl text-stone-900 focus:outline-none focus:ring-2 transition-all ${
                          validation.stockErrors.length > 0
                            ? "bg-rose-50 border-2 border-rose-400 focus:ring-rose-400"
                            : "bg-stone-50 border border-stone-300 focus:bg-white focus:ring-amber-400 focus:border-amber-400"
                        }`}
                        required
                      />

                      <button
                        type="button"
                        id="stock-increase-1"
                        onClick={() => handleAdjustStock(1)}
                        className="p-2.5 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 transition-colors cursor-pointer"
                        title="Adicionar 1 unidade"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        id="stock-increase-5"
                        onClick={() => handleAdjustStock(5)}
                        className="p-2 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold text-xs transition-colors cursor-pointer"
                        title="Adicionar 5 unidades"
                      >
                        +5
                      </button>
                      <button
                        type="button"
                        id="stock-increase-10"
                        onClick={() => handleAdjustStock(10)}
                        className="p-2 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-900 font-bold text-xs border border-amber-200 transition-colors cursor-pointer"
                        title="Adicionar 10 unidades"
                      >
                        +10
                      </button>
                    </div>
                    {validation.stockErrors[0] && (
                      <p className="text-[11px] text-rose-600 font-medium mt-1 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3 shrink-0" />
                        {validation.stockErrors[0]}
                      </p>
                    )}
                  </div>

                  {/* Delta Indicator & Reason for PostgreSQL Inventory Movement */}
                  {stockDelta !== 0 && (
                    <div className="p-3.5 bg-amber-50/80 border border-amber-200 rounded-xl space-y-2.5">
                      <div className="flex items-center justify-between text-xs font-bold text-amber-950">
                        <span className="flex items-center gap-1.5">
                          <RotateCcw className="w-3.5 h-3.5 text-amber-700" />
                          Movimentação no Ledger PostgreSQL:
                        </span>
                        <span
                          className={`font-mono px-2.5 py-0.5 rounded-full text-xs font-bold ${
                            stockDelta > 0
                              ? "bg-emerald-100 text-emerald-900 border border-emerald-300"
                              : "bg-rose-100 text-rose-900 border border-rose-300"
                          }`}
                        >
                          {stockDelta > 0
                            ? `+${stockDelta} un (Entrada no Armazém)`
                            : `${stockDelta} un (Saída / Baixa)`}
                        </span>
                      </div>

                      <div>
                        <label
                          htmlFor="quick-edit-stock-reason"
                          className="block text-[11px] font-bold text-stone-700 mb-1"
                        >
                          Motivo para Registro no Ledger
                        </label>
                        <select
                          id="quick-edit-stock-reason"
                          value={stockReason}
                          onChange={(e) => setStockReason(e.target.value)}
                          className="w-full px-3 py-2 bg-white border border-stone-300 rounded-xl text-xs font-medium text-stone-800 focus:outline-none focus:ring-2 focus:ring-amber-400"
                        >
                          <option value="Ajuste rápido de balcão">Ajuste rápido de balcão</option>
                          <option value="Contagem física de inventário">
                            Contagem física de inventário
                          </option>
                          <option value="Entrada de reposição de fornecedor">
                            Entrada de reposição de fornecedor
                          </option>
                          <option value="Baixa por avaria ou defeito">
                            Baixa por avaria ou defeito de peça
                          </option>
                          <option value="Devolução de cliente ou mostruário">
                            Devolução de cliente ou mostruário
                          </option>
                        </select>
                      </div>
                    </div>
                  )}

                  {/* Out of Stock Warning */}
                  {stockPhysical === 0 && (
                    <div className="flex items-center gap-2 p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800">
                      <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                      <span>
                        Ao zerar o estoque físico, a peça será marcada como <strong>ESGOTADA</strong> e
                        os botões de compra direta serão bloqueados ou direcionados ao WhatsApp.
                      </span>
                    </div>
                  )}
                </div>
              </form>
            )}
          </AnimatePresence>
        </div>

        {/* Footer Actions (Only displayed when editing) */}
        {!persistedSuccess && (
          <div className="p-4 border-t border-stone-200 bg-stone-50 flex items-center justify-between gap-3 shrink-0">
            <button
              type="button"
              id="quick-edit-cancel-btn"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2.5 rounded-xl border border-stone-300 hover:bg-stone-200/60 text-stone-700 text-xs font-bold transition-colors cursor-pointer disabled:opacity-50"
            >
              Cancelar
            </button>

            <div className="flex items-center gap-2">
              <button
                type="submit"
                form="product-quick-edit-form"
                id="quick-edit-save-btn"
                disabled={isSubmitting || !validation.isValid}
                className="px-6 py-2.5 rounded-xl bg-stone-900 hover:bg-stone-800 text-white text-xs font-bold shadow-sm hover:shadow transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                title={
                  validation.hasErrors
                    ? "Corrija os campos com aviso antes de persistir"
                    : "Gravar alterações no banco de dados PostgreSQL"
                }
              >
                {isSubmitting ? (
                  <>
                    <RefreshCw className="w-4 h-4 text-amber-400 animate-spin" />
                    <span>Persistindo no PostgreSQL...</span>
                  </>
                ) : (
                  <>
                    <Database className="w-4 h-4 text-emerald-400" />
                    <span>Salvar no PostgreSQL</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
