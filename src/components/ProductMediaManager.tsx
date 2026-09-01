import React, { useState, useRef } from "react";
import {
  Upload,
  Image as ImageIcon,
  Film,
  Star,
  Trash2,
  MoveLeft,
  MoveRight,
  GripVertical,
  Plus,
  Sparkles,
  Check,
  Info,
  ExternalLink,
  Eye,
  Camera,
  Layers,
} from "lucide-react";
import { ProductMedia } from "../types";

// Curated high-resolution jewelry photos for quick selection
export const CURATED_JEWELRY_PHOTOS = [
  {
    url: "https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?w=900&auto=format&fit=crop&q=80",
    label: "Gargantilha Fita Ouro 18K (Frente)",
    category: "COLARES",
  },
  {
    url: "https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?w=900&auto=format&fit=crop&q=80",
    label: "Colar Ponto de Luz Zircônia",
    category: "COLARES",
  },
  {
    url: "https://images.unsplash.com/photo-1630019852942-f89202989a59?w=900&auto=format&fit=crop&q=80",
    label: "Brinco Gota Esmeralda Fusion",
    category: "BRINCOS",
  },
  {
    url: "https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?w=900&auto=format&fit=crop&q=80",
    label: "Argola Cravejada Zircônia 5A",
    category: "BRINCOS",
  },
  {
    url: "https://images.unsplash.com/photo-1605100804763-247f67b3557e?w=900&auto=format&fit=crop&q=80",
    label: "Solitário Ouro 18K Cravejado",
    category: "ANEIS",
  },
  {
    url: "https://images.unsplash.com/photo-1603561591411-07134e71a2a9?w=900&auto=format&fit=crop&q=80",
    label: "Anel Aparador Elegance",
    category: "ANEIS",
  },
  {
    url: "https://images.unsplash.com/photo-1611591475103-4fa1b7765a7f?w=900&auto=format&fit=crop&q=80",
    label: "Riviera de Zircônias Cristal",
    category: "PULSEIRAS",
  },
  {
    url: "https://images.unsplash.com/photo-1573408301185-9146fe634ad0?w=900&auto=format&fit=crop&q=80",
    label: "Conjunto Gota Turmalina Paraíba",
    category: "CONJUNTOS",
  },
];

interface ProductMediaManagerProps {
  productId?: string;
  media: ProductMedia[];
  onChange: (updatedMedia: ProductMedia[]) => void;
  productName?: string;
}

export const ProductMediaManager: React.FC<ProductMediaManagerProps> = ({
  productId = "prod-new",
  media,
  onChange,
  productName = "Semijoia Lumina",
}) => {
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [isDraggingFile, setIsDraggingFile] = useState(false);
  const [inputUrl, setInputUrl] = useState("");
  const [mediaType, setMediaType] = useState<"IMAGE" | "VIDEO">("IMAGE");
  const [showPresets, setShowPresets] = useState(false);
  const [editingAltIdx, setEditingAltIdx] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Helper to re-index items and maintain primary image integrity
  const reorderAndNormalize = (items: ProductMedia[]): ProductMedia[] => {
    return items.map((item, idx) => ({
      ...item,
      sort_order: idx + 1,
      is_primary: idx === 0, // First item is always primary
    }));
  };

  // Set an item as Primary
  const handleSetPrimary = (index: number) => {
    if (index === 0) return;
    const newItems = [...media];
    const [selected] = newItems.splice(index, 1);
    newItems.unshift(selected);
    onChange(reorderAndNormalize(newItems));
  };

  // Move item left/right
  const handleMove = (index: number, direction: "LEFT" | "RIGHT") => {
    const targetIdx = direction === "LEFT" ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= media.length) return;

    const newItems = [...media];
    const temp = newItems[index];
    newItems[index] = newItems[targetIdx];
    newItems[targetIdx] = temp;
    onChange(reorderAndNormalize(newItems));
  };

  // Remove item
  const handleRemove = (index: number) => {
    const newItems = media.filter((_, i) => i !== index);
    onChange(reorderAndNormalize(newItems));
  };

  // Drag & drop sorting handlers
  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleDragEnter = (index: number) => {
    setDragOverIndex(index);
  };

  const handleDragEnd = () => {
    if (draggedIndex !== null && dragOverIndex !== null && draggedIndex !== dragOverIndex) {
      const newItems = [...media];
      const [draggedItem] = newItems.splice(draggedIndex, 1);
      newItems.splice(dragOverIndex, 0, draggedItem);
      onChange(reorderAndNormalize(newItems));
    }
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  // File Upload Handling (Drag & Drop or Manual Selection)
  const handleFiles = (files: FileList | null) => {
    if (!files || files.length === 0) return;

    Array.from(files).forEach((file) => {
      const isVideo = file.type.startsWith("video/");
      const cleanName = file.name.toLowerCase().replace(/[^a-z0-9_.-]/g, "_");
      const reader = new FileReader();

      reader.onload = (e) => {
        const url = e.target?.result as string;
        if (url) {
          const newMediaItem: ProductMedia = {
            id: `med-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
            organization_id: "org-lumina-01",
            product_id: productId,
            storage_key: `org-lumina-01/products/${productId}/${Date.now()}_${cleanName}`,
            type: isVideo ? "VIDEO" : "IMAGE",
            url: url,
            sort_order: media.length + 1,
            is_primary: media.length === 0,
            alt_text: `${productName} - ${isVideo ? "Vídeo" : "Foto"} ${media.length + 1}`,
            created_at: new Date().toISOString(),
            file_size_bytes: file.size,
            mime_type: file.type,
          };
          onChange(reorderAndNormalize([...media, newMediaItem]));
        }
      };

      reader.readAsDataURL(file);
    });
  };

  // Add media via URL
  const handleAddUrl = () => {
    if (!inputUrl.trim()) return;

    const newMediaItem: ProductMedia = {
      id: `med-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      organization_id: "org-lumina-01",
      product_id: productId,
      storage_key: `org-lumina-01/products/${productId}/cdn_${Date.now()}.webp`,
      type: mediaType,
      url: inputUrl.trim(),
      sort_order: media.length + 1,
      is_primary: media.length === 0,
      alt_text: `${productName} - ${mediaType === "IMAGE" ? "Foto" : "Vídeo"} ${media.length + 1}`,
      created_at: new Date().toISOString(),
    };

    onChange(reorderAndNormalize([...media, newMediaItem]));
    setInputUrl("");
  };

  // Add from curated bank
  const handleSelectPreset = (url: string, label: string) => {
    const newMediaItem: ProductMedia = {
      id: `med-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      organization_id: "org-lumina-01",
      product_id: productId,
      storage_key: `org-lumina-01/products/${productId}/preset_${Date.now()}.webp`,
      type: "IMAGE",
      url,
      sort_order: media.length + 1,
      is_primary: media.length === 0,
      alt_text: label,
      created_at: new Date().toISOString(),
    };
    onChange(reorderAndNormalize([...media, newMediaItem]));
  };

  const handleUpdateAltText = (index: number, newAlt: string) => {
    const updated = [...media];
    updated[index] = { ...updated[index], alt_text: newAlt };
    onChange(updated);
  };

  return (
    <div className="space-y-4">
      {/* Informative Header / Rules */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-stone-100">
        <div>
          <div className="flex items-center gap-2">
            <h4 className="text-sm font-serif font-bold text-stone-900">
              Galeria de Mídia da Semijoia
            </h4>
            <span className="text-[10px] font-bold uppercase tracking-wider bg-amber-100 text-amber-900 px-2 py-0.5 rounded-full border border-amber-300/60">
              {media.length} {media.length === 1 ? "Mídia" : "Mídias"}
            </span>
          </div>
          <p className="text-xs text-stone-500 mt-0.5">
            <strong>Reordenação Simples:</strong> Arraste e solte ou use os botões para definir a ordem. A primeira posição é sempre a <strong>Imagem Principal</strong> do catálogo.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowPresets(!showPresets)}
          className="self-start sm:self-auto px-3 py-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 text-xs font-bold transition-colors flex items-center gap-1.5"
        >
          <Sparkles className="w-3.5 h-3.5 text-amber-600" />
          <span>Banco de Fotos HD</span>
        </button>
      </div>

      {/* Preset Curated Photos Drawer */}
      {showPresets && (
        <div className="bg-stone-50 border border-stone-200 rounded-2xl p-4 space-y-3 animate-in fade-in duration-150">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-stone-800 flex items-center gap-1.5">
              <Camera className="w-3.5 h-3.5 text-amber-600" />
              <span>Selecione fotos de alta resolução do acervo Lumina:</span>
            </span>
            <button
              type="button"
              onClick={() => setShowPresets(false)}
              className="text-stone-400 hover:text-stone-700 text-xs font-bold"
            >
              Fechar
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-8 gap-2">
            {CURATED_JEWELRY_PHOTOS.map((item, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleSelectPreset(item.url, item.label)}
                className="group relative aspect-square rounded-xl overflow-hidden border border-stone-200 hover:border-amber-500 hover:shadow-md transition-all text-left"
                title={item.label}
              >
                <img
                  src={item.url}
                  alt={item.label}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-stone-900/80 via-transparent to-transparent flex items-end p-1.5">
                  <span className="text-[9px] text-white font-medium truncate w-full">
                    {item.label}
                  </span>
                </div>
                <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 bg-amber-500 text-stone-950 p-1 rounded-full shadow-xs">
                  <Plus className="w-3 h-3" />
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Drag & Drop Upload Zone */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setIsDraggingFile(true);
        }}
        onDragLeave={() => setIsDraggingFile(false)}
        onDrop={(e) => {
          e.preventDefault();
          setIsDraggingFile(false);
          handleFiles(e.dataTransfer.files);
        }}
        onClick={() => fileInputRef.current?.click()}
        className={`border-2 border-dashed rounded-2xl p-5 text-center cursor-pointer transition-all ${
          isDraggingFile
            ? "border-amber-500 bg-amber-50/60 ring-2 ring-amber-400/40"
            : "border-stone-300 hover:border-stone-400 bg-stone-50/60 hover:bg-stone-50"
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/*,video/*"
          onChange={(e) => handleFiles(e.target.files)}
          className="hidden"
        />
        <div className="flex flex-col items-center justify-center gap-2">
          <div className="w-10 h-10 rounded-full bg-white shadow-xs border border-stone-200 flex items-center justify-center text-amber-700">
            <Upload className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs font-bold text-stone-800">
              Clique para selecionar ou arraste fotos e vídeos aqui
            </p>
            <p className="text-[11px] text-stone-500 mt-0.5">
              Suporta JPG, PNG, WEBP e MP4 (vídeos de demonstração)
            </p>
          </div>
        </div>
      </div>

      {/* URL Ingestion Bar */}
      <div className="flex items-center gap-2">
        <select
          value={mediaType}
          onChange={(e) => setMediaType(e.target.value as "IMAGE" | "VIDEO")}
          className="bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 text-xs font-bold text-stone-700 focus:outline-none"
        >
          <option value="IMAGE">📷 Foto (URL)</option>
          <option value="VIDEO">🎥 Vídeo (URL / Reels)</option>
        </select>
        <input
          type="url"
          value={inputUrl}
          onChange={(e) => setInputUrl(e.target.value)}
          placeholder="Cole uma URL direta da imagem ou vídeo (https://...)"
          className="flex-1 bg-stone-50 border border-stone-200 rounded-xl px-3.5 py-2 text-xs text-stone-900 focus:bg-white focus:outline-none focus:border-stone-400"
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              handleAddUrl();
            }
          }}
        />
        <button
          type="button"
          onClick={handleAddUrl}
          className="px-4 py-2 bg-stone-900 hover:bg-stone-800 text-white rounded-xl text-xs font-bold transition-colors flex items-center gap-1"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Adicionar</span>
        </button>
      </div>

      {/* Media Gallery Grid (Reorderable) */}
      {media.length === 0 ? (
        <div className="p-8 text-center bg-stone-50/50 rounded-2xl border border-stone-200">
          <ImageIcon className="w-8 h-8 text-stone-300 mx-auto mb-2" />
          <p className="text-xs font-bold text-stone-600">Nenhuma foto adicionada ainda</p>
          <p className="text-[11px] text-stone-400 mt-0.5">
            Adicione pelo menos 1 foto principal para publicar este produto no catálogo.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            {media.map((item, index) => {
              const isPrimary = index === 0;
              const isBeingDragged = draggedIndex === index;
              const isDragOver = dragOverIndex === index;

              return (
                <div
                  key={item.id || index}
                  draggable
                  onDragStart={() => handleDragStart(index)}
                  onDragEnter={() => handleDragEnter(index)}
                  onDragEnd={handleDragEnd}
                  onDragOver={(e) => e.preventDefault()}
                  className={`relative bg-white border-2 rounded-2xl overflow-hidden shadow-xs transition-all flex flex-col group ${
                    isPrimary
                      ? "border-amber-500 ring-2 ring-amber-400/30"
                      : isDragOver
                      ? "border-amber-400 bg-amber-50/30"
                      : "border-stone-200 hover:border-stone-300"
                  } ${isBeingDragged ? "opacity-40 scale-95" : "opacity-100"}`}
                >
                  {/* Media Preview Stage */}
                  <div className="relative aspect-square bg-stone-100 overflow-hidden">
                    {item.type === "VIDEO" ? (
                      <div className="w-full h-full flex flex-col items-center justify-center bg-stone-900 text-white p-4">
                        <Film className="w-8 h-8 text-amber-400 mb-2" />
                        <span className="text-[10px] font-mono truncate max-w-full text-stone-300">
                          {item.url}
                        </span>
                      </div>
                    ) : (
                      <img
                        src={item.url}
                        alt={item.alt_text || `Foto ${index + 1}`}
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                      />
                    )}

                    {/* Order & Primary Badges */}
                    <div className="absolute top-2 left-2 flex items-center gap-1">
                      <span className="bg-stone-900/80 backdrop-blur-xs text-white text-[10px] font-mono font-bold px-2 py-0.5 rounded-md flex items-center gap-1">
                        <GripVertical className="w-3 h-3 text-stone-400" />
                        #{index + 1}
                      </span>
                      {isPrimary && (
                        <span className="bg-amber-500 text-stone-950 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md shadow-xs flex items-center gap-0.5">
                          <Star className="w-3 h-3 fill-stone-950" />
                          Principal
                        </span>
                      )}
                    </div>

                    {/* Quick Action Overlay on Hover */}
                    <div className="absolute top-2 right-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        type="button"
                        onClick={() => handleRemove(index)}
                        className="p-1.5 bg-rose-900/85 hover:bg-rose-900 text-white rounded-lg transition-colors shadow-xs"
                        title="Remover foto"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Card Controls & Reordering */}
                  <div className="p-3 bg-white border-t border-stone-100 flex flex-col justify-between gap-2 flex-1">
                    {/* Alt text field / label */}
                    <div>
                      {editingAltIdx === index ? (
                        <div className="flex items-center gap-1">
                          <input
                            type="text"
                            value={item.alt_text || ""}
                            onChange={(e) => handleUpdateAltText(index, e.target.value)}
                            placeholder="Texto alternativo da foto"
                            className="w-full bg-stone-50 border border-stone-200 rounded-md px-2 py-1 text-[11px]"
                            autoFocus
                            onBlur={() => setEditingAltIdx(null)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") setEditingAltIdx(null);
                            }}
                          />
                          <button
                            type="button"
                            onClick={() => setEditingAltIdx(null)}
                            className="p-1 text-emerald-600"
                          >
                            <Check className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <div
                          onClick={() => setEditingAltIdx(index)}
                          className="text-[11px] text-stone-600 truncate cursor-pointer hover:text-stone-900 flex items-center justify-between"
                          title="Clique para editar texto descritivo"
                        >
                          <span className="truncate">{item.alt_text || "Sem descrição (clique p/ editar)"}</span>
                        </div>
                      )}
                    </div>

                    {/* Positioning Buttons */}
                    <div className="flex items-center justify-between pt-1 border-t border-stone-100">
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          disabled={index === 0}
                          onClick={() => handleMove(index, "LEFT")}
                          className={`p-1 rounded-md border text-stone-700 transition-colors ${
                            index === 0
                              ? "opacity-30 cursor-not-allowed border-stone-200"
                              : "hover:bg-stone-100 border-stone-200 cursor-pointer"
                          }`}
                          title="Mover para a esquerda"
                        >
                          <MoveLeft className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          disabled={index === media.length - 1}
                          onClick={() => handleMove(index, "RIGHT")}
                          className={`p-1 rounded-md border text-stone-700 transition-colors ${
                            index === media.length - 1
                              ? "opacity-30 cursor-not-allowed border-stone-200"
                              : "hover:bg-stone-100 border-stone-200 cursor-pointer"
                          }`}
                          title="Mover para a direita"
                        >
                          <MoveRight className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {!isPrimary && (
                        <button
                          type="button"
                          onClick={() => handleSetPrimary(index)}
                          className="text-[10px] font-bold text-amber-800 hover:text-amber-950 bg-amber-50 hover:bg-amber-100 border border-amber-200 px-2 py-1 rounded-md transition-colors flex items-center gap-1"
                        >
                          <Star className="w-3 h-3" />
                          <span>Tornar Capa</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Tips for Best Catalog Conversion */}
          <div className="p-3 bg-stone-50 border border-stone-200 rounded-xl flex items-center justify-between text-xs text-stone-600">
            <div className="flex items-center gap-2">
              <Info className="w-4 h-4 text-amber-600 shrink-0" />
              <span>
                <strong>Dica de Vendas:</strong> Peças com 3 ou mais fotos (frente, no corpo/modelo e detalhe do cravejamento) possuem <strong>taxa de conversão 4x maior</strong> no catálogo WhatsApp.
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
