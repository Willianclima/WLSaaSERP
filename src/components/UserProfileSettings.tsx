import React, { useState, useRef } from "react";
import {
  User,
  Camera,
  Upload,
  Trash2,
  Check,
  Sparkles,
  Phone,
  Mail,
  Briefcase,
  ShieldCheck,
  Save,
  RotateCcw,
  Smartphone,
  Eye,
  FileCheck,
} from "lucide-react";
import confetti from "canvas-confetti";
import { RBACUser } from "../types";
import { ClientStorageService } from "../services/storageService";

interface UserProfileSettingsProps {
  currentUser: RBACUser;
  onUpdateUser: (updated: Partial<RBACUser>) => void;
}

const SAMPLE_AVATAR_PRESETS = [
  {
    name: "Clássico Negócios",
    url: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80",
  },
  {
    name: "Executivo Joalheria",
    url: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&auto=format&fit=crop&q=80",
  },
  {
    name: "Consultora Ateliê",
    url: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=200&auto=format&fit=crop&q=80",
  },
  {
    name: "Design & Luxo",
    url: "https://images.unsplash.com/photo-1580489944761-15a19d654956?w=200&auto=format&fit=crop&q=80",
  },
];

export const UserProfileSettings: React.FC<UserProfileSettingsProps> = ({
  currentUser,
  onUpdateUser,
}) => {
  const [name, setName] = useState(currentUser.name || "Willian Lima");
  const [email, setEmail] = useState(currentUser.email || "willianCLima@gmail.com");
  const [phone, setPhone] = useState(currentUser.phone || "(11) 98765-4321");
  const [title, setTitle] = useState(currentUser.title || "Fundador & Proprietário");
  const [bio, setBio] = useState(
    currentUser.bio ||
      "Gestor geral da marca e curador de coleções nobres com garantia digital QR."
  );
  const [avatar, setAvatar] = useState(currentUser.avatar || currentUser.photoUrl || "");

  const [isDragging, setIsDragging] = useState(false);
  const [isProcessingFile, setIsProcessingFile] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [uploadFeedback, setUploadFeedback] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Handle file reading from input or drag-and-drop
  const processImageFile = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      alert("Por favor, selecione um arquivo de imagem válido (JPG, PNG, WebP ou GIF).");
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      alert("O arquivo excede o limite máximo de 10MB. Escolha uma foto menor.");
      return;
    }

    setIsProcessingFile(true);
    setUploadFeedback("Processando foto...");

    try {
      // 1. Convert to data URL for immediate local preview without needing an external link
      const storage = ClientStorageService.getInstance();
      const base64Data = await storage.fileToBase64(file);
      setAvatar(base64Data);

      // 2. Also attempt upload to storage endpoint in background
      try {
        const uploadRes = await storage.uploadFile(file, {
          folder: "avatars",
          sku: "user-profile",
        });
        if (uploadRes && uploadRes.url) {
          setAvatar(uploadRes.url);
        }
      } catch (err) {
        console.info("Using local base64 preview for avatar (fallback offline safe)");
      }

      setUploadFeedback(`Foto "${file.name}" carregada com sucesso!`);
      setTimeout(() => setUploadFeedback(null), 4000);
    } catch (error) {
      console.error("Erro ao ler foto do perfil:", error);
      alert("Não foi possível carregar a imagem. Tente novamente.");
    } finally {
      setIsProcessingFile(false);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processImageFile(file);
    }
    // reset input so the same file can be chosen again if needed
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      processImageFile(file);
    }
  };

  const handleRemovePhoto = () => {
    setAvatar("");
    setUploadFeedback("Foto removida. Será exibido o avatar com suas iniciais.");
    setTimeout(() => setUploadFeedback(null), 3000);
  };

  const handleSave = (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    const updated: Partial<RBACUser> = {
      name: name.trim() || "Usuário",
      email: email.trim(),
      phone: phone.trim(),
      title: title.trim(),
      bio: bio.trim(),
      avatar: avatar.trim(),
      photoUrl: avatar.trim(),
    };

    onUpdateUser(updated);

    setSavedSuccess(true);
    confetti({
      particleCount: 50,
      spread: 60,
      origin: { y: 0.6 },
    });
    setTimeout(() => setSavedSuccess(false), 3500);
  };

  const initials = name
    .split(" ")
    .map((n) => n[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Top Banner / Card */}
      <div className="bg-white rounded-3xl border border-stone-200 p-6 sm:p-8 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-xl bg-amber-100 text-amber-900">
              <User className="w-5 h-5" />
            </span>
            <span className="text-xs font-bold uppercase tracking-wider text-stone-500">
              Gerenciamento de Conta & Identidade
            </span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-serif italic font-bold text-stone-900">
            Meu Perfil & Foto
          </h2>
          <p className="text-xs sm:text-sm text-stone-600 max-w-2xl">
            Faça upload direto da sua foto de perfil do computador ou celular (sem precisar de links externos). 
            Personalize seu nome, cargo e informações de contato exibidas nas garantias e no atendimento aos clientes.
          </p>
        </div>

        <button
          type="button"
          onClick={() => handleSave()}
          className="w-full md:w-auto flex items-center justify-center gap-2 px-6 py-2.5 rounded-full bg-stone-900 hover:bg-stone-800 text-amber-300 hover:text-amber-200 font-bold text-xs uppercase tracking-wider transition-all shadow-md cursor-pointer"
        >
          <Save className="w-4 h-4 text-amber-400" />
          <span>Salvar Perfil</span>
        </button>
      </div>

      {/* Success Notification Banner */}
      {savedSuccess && (
        <div className="bg-emerald-50 border border-emerald-300 text-emerald-900 rounded-2xl p-4 flex items-center justify-between shadow-xs animate-in fade-in duration-300">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-emerald-500 text-white flex items-center justify-center font-bold">
              <Check className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-emerald-800">
                Perfil Atualizado com Sucesso!
              </p>
              <p className="text-xs text-emerald-700">
                Sua foto e dados foram salvos e já estão refletidos na barra lateral e nos atendimentos.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Upload Feedback Toast */}
      {uploadFeedback && (
        <div className="bg-amber-50 border border-amber-300 text-amber-900 rounded-2xl p-3.5 flex items-center gap-3 text-xs font-medium shadow-xs">
          <Sparkles className="w-4 h-4 text-amber-600 shrink-0" />
          <span>{uploadFeedback}</span>
        </div>
      )}

      {/* Main Grid: Photo Upload & Profile Form */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Photo Upload Card */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-white rounded-3xl border border-stone-200 p-6 sm:p-7 shadow-xs space-y-6">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <div className="flex items-center gap-2">
                <Camera className="w-4 h-4 text-amber-600" />
                <h3 className="font-serif italic font-bold text-lg text-stone-900">
                  Foto do Perfil
                </h3>
              </div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                Upload Direto
              </span>
            </div>

            {/* Avatar Centered Display with Ring */}
            <div className="flex flex-col items-center justify-center py-2">
              <div className="relative group">
                <div className="w-28 h-28 sm:w-32 sm:h-32 rounded-full ring-4 ring-amber-300/40 p-1 shadow-md bg-stone-50 flex items-center justify-center overflow-hidden">
                  {avatar ? (
                    <img
                      src={avatar}
                      alt={name}
                      className="w-full h-full rounded-full object-cover"
                      referrerPolicy="no-referrer"
                      onError={() => {
                        setAvatar("");
                      }}
                    />
                  ) : (
                    <div className="w-full h-full rounded-full bg-stone-900 text-amber-300 font-serif font-bold text-3xl flex items-center justify-center">
                      {initials || "WL"}
                    </div>
                  )}
                </div>

                {/* Status dot */}
                <div
                  className="absolute bottom-1 right-1 w-5 h-5 rounded-full bg-emerald-500 border-2 border-white shadow-xs"
                  title="Status: Online & Ativo"
                />

                {/* Hover overlay quick change button */}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute inset-0 rounded-full bg-stone-950/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-white text-xs font-semibold cursor-pointer"
                  title="Alterar foto"
                >
                  <Camera className="w-6 h-6 mb-1 text-amber-300" />
                  <span>Trocar Foto</span>
                </button>
              </div>

              <p className="mt-3 text-sm font-bold text-stone-900">{name}</p>
              <p className="text-xs text-stone-500">{title}</p>
            </div>

            {/* Drag and Drop Zone */}
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all ${
                isDragging
                  ? "border-amber-500 bg-amber-50/70 scale-[1.01]"
                  : "border-stone-200 hover:border-amber-400 hover:bg-stone-50/60"
              }`}
            >
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileInputChange}
                accept="image/png,image/jpeg,image/webp,image/gif"
                className="hidden"
              />

              <div className="w-10 h-10 rounded-full bg-amber-100 text-amber-800 flex items-center justify-center mx-auto mb-3 shadow-2xs">
                {isProcessingFile ? (
                  <div className="w-5 h-5 border-2 border-amber-600 border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Upload className="w-5 h-5" />
                )}
              </div>

              <p className="text-xs font-bold text-stone-800">
                {isDragging ? "Solte a imagem aqui!" : "Clique ou arraste a sua foto aqui"}
              </p>
              <p className="text-[11px] text-stone-500 mt-1">
                Suporta PNG, JPG ou WebP até 10MB. Não precisa de link externo.
              </p>

              <button
                type="button"
                className="mt-3 px-4 py-1.5 rounded-full bg-stone-900 hover:bg-stone-800 text-amber-300 text-xs font-bold transition-all shadow-xs"
              >
                Escolher do Computador ou Celular
              </button>
            </div>

            {/* Quick Actions (Remove, Presets) */}
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-stone-400">
                  Ou selecione um avatar rápido:
                </span>
                {avatar && (
                  <button
                    type="button"
                    onClick={handleRemovePhoto}
                    className="flex items-center gap-1 text-[11px] font-semibold text-rose-600 hover:text-rose-800 transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Remover Foto</span>
                  </button>
                )}
              </div>

              <div className="grid grid-cols-4 gap-2">
                {SAMPLE_AVATAR_PRESETS.map((preset, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setAvatar(preset.url);
                      setUploadFeedback(`Avatar "${preset.name}" selecionado.`);
                      setTimeout(() => setUploadFeedback(null), 3000);
                    }}
                    className={`p-1 rounded-xl border transition-all flex flex-col items-center gap-1 cursor-pointer ${
                      avatar === preset.url
                        ? "border-amber-500 bg-amber-50 shadow-2xs"
                        : "border-stone-200 hover:border-stone-400 bg-stone-50"
                    }`}
                    title={preset.name}
                  >
                    <img
                      src={preset.url}
                      alt={preset.name}
                      className="w-10 h-10 rounded-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                    <span className="text-[9px] text-stone-600 font-medium truncate w-full text-center">
                      {preset.name.split(" ")[0]}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Preview in Real Contexts */}
            <div className="bg-stone-900 text-stone-200 rounded-2xl p-4 space-y-3 border border-stone-800">
              <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                <Eye className="w-3 h-3" />
                Como sua foto aparece no sistema:
              </span>

              <div className="space-y-2 text-xs">
                {/* 1. Sidebar Real Preview */}
                <div className="p-2 rounded-xl bg-stone-950 border border-stone-800 flex items-center gap-2.5">
                  {avatar ? (
                    <img
                      src={avatar}
                      alt={name}
                      className="w-7 h-7 rounded-full object-cover border border-amber-300 shrink-0"
                    />
                  ) : (
                    <div className="w-7 h-7 rounded-full bg-stone-800 text-amber-300 font-bold text-xs flex items-center justify-center shrink-0">
                      {initials || "W"}
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="font-bold text-white text-[11px] truncate leading-tight">{name}</p>
                    <p className="text-[9px] text-emerald-400 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                      {title}
                    </p>
                  </div>
                  <span className="text-[9px] text-stone-400 bg-stone-800 px-1.5 py-0.5 rounded">
                    Barra Lateral
                  </span>
                </div>

                {/* 2. Customer WhatsApp Header Preview */}
                <div className="p-2 rounded-xl bg-stone-950 border border-stone-800 flex items-center gap-2.5">
                  {avatar ? (
                    <img
                      src={avatar}
                      alt={name}
                      className="w-8 h-8 rounded-full object-cover border border-emerald-400 shrink-0"
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-stone-800 text-amber-300 font-bold text-xs flex items-center justify-center shrink-0">
                      {initials || "W"}
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="font-bold text-white text-[11px] truncate leading-tight">
                      Atendimento Consultoria
                    </p>
                    <p className="text-[9px] text-stone-400">Garantia & Vendas WhatsApp</p>
                  </div>
                  <span className="text-[9px] text-emerald-400 bg-emerald-950/60 border border-emerald-800/60 px-1.5 py-0.5 rounded">
                    Vitrine
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: User Information Form */}
        <div className="lg:col-span-7 space-y-6">
          <form
            onSubmit={handleSave}
            className="bg-white rounded-3xl border border-stone-200 p-6 sm:p-8 shadow-xs space-y-6"
          >
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <div className="flex items-center gap-2">
                <FileCheck className="w-4 h-4 text-amber-600" />
                <h3 className="font-serif italic font-bold text-lg text-stone-900">
                  Dados do Lojista & Administrador
                </h3>
              </div>
              <span className="text-xs font-bold uppercase tracking-wider text-stone-400">
                Identificação Comercial
              </span>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-stone-600 block mb-1">
                  Nome Completo:
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Ex: Willian Lima"
                    required
                    className="w-full bg-stone-50 border border-stone-300 rounded-2xl px-4 py-2.5 text-sm font-semibold text-stone-900 focus:outline-none focus:border-stone-900 focus:bg-white transition-all pl-10"
                  />
                  <User className="w-4 h-4 text-stone-400 absolute left-3.5 top-3" />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-stone-600 block mb-1">
                    E-mail de Acesso:
                  </label>
                  <div className="relative">
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="willianCLima@gmail.com"
                      required
                      className="w-full bg-stone-50 border border-stone-300 rounded-2xl px-4 py-2.5 text-xs text-stone-900 focus:outline-none focus:border-stone-900 focus:bg-white transition-all pl-10"
                    />
                    <Mail className="w-4 h-4 text-stone-400 absolute left-3.5 top-3" />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-stone-600 block mb-1">
                    WhatsApp / Telefone:
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="(11) 98765-4321"
                      className="w-full bg-stone-50 border border-stone-300 rounded-2xl px-4 py-2.5 text-xs text-stone-900 focus:outline-none focus:border-stone-900 focus:bg-white transition-all pl-10"
                    />
                    <Phone className="w-4 h-4 text-stone-400 absolute left-3.5 top-3" />
                  </div>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-stone-600 block mb-1">
                  Cargo / Função no Sistema:
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Ex: Fundador & Proprietário"
                    className="w-full bg-stone-50 border border-stone-300 rounded-2xl px-4 py-2.5 text-xs font-medium text-stone-900 focus:outline-none focus:border-stone-900 focus:bg-white transition-all pl-10"
                  />
                  <Briefcase className="w-4 h-4 text-stone-400 absolute left-3.5 top-3" />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-stone-600 block mb-1">
                  Bio & Assinatura de Garantia:
                </label>
                <textarea
                  rows={3}
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="Texto breve exibido aos clientes ou nos certificados de autenticidade."
                  className="w-full bg-stone-50 border border-stone-300 rounded-2xl p-4 text-xs text-stone-900 focus:outline-none focus:border-stone-900 focus:bg-white transition-all leading-relaxed"
                />
              </div>
            </div>

            {/* RBAC Privilege Pill Badge */}
            <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200/80 flex items-start gap-3">
              <ShieldCheck className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-amber-900">
                    Nível de Acesso: SUPER_ADMIN (Acesso Pleno)
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-amber-200/80 text-amber-950 font-mono text-[9px] font-bold">
                    RBAC Ativo
                  </span>
                </div>
                <p className="text-[11px] text-amber-800 leading-relaxed">
                  Você possui permissão para gerenciar o catálogo, finanças, maletas de consignação,
                  domínio customizado, identidade visual e cadastros de clientes.
                </p>
              </div>
            </div>

            {/* Bottom Actions */}
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-stone-100">
              <button
                type="button"
                onClick={() => {
                  setName(currentUser.name || "Willian Lima");
                  setEmail(currentUser.email || "willianCLima@gmail.com");
                  setPhone(currentUser.phone || "(11) 98765-4321");
                  setTitle(currentUser.title || "Fundador & Proprietário");
                  setBio(currentUser.bio || "");
                  setAvatar(currentUser.avatar || currentUser.photoUrl || "");
                }}
                className="px-4 py-2.5 rounded-full border border-stone-200 hover:bg-stone-100 text-stone-600 text-xs font-semibold transition-colors cursor-pointer"
              >
                Descartar Modificações
              </button>

              <button
                type="submit"
                className="flex items-center gap-2 px-6 py-2.5 rounded-full bg-stone-900 hover:bg-stone-800 text-amber-300 hover:text-amber-200 font-bold text-xs uppercase tracking-wider transition-all shadow-md cursor-pointer"
              >
                <Save className="w-4 h-4 text-amber-400" />
                <span>Salvar Informações do Perfil</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
