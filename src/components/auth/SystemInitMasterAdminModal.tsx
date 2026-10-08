import React, { useState } from "react";
import {
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Lock,
  Mail,
  User,
  Phone,
  Building2,
  CheckCircle2,
  Eye,
  EyeOff,
  Zap,
  ArrowRight,
  Server,
  AlertTriangle,
  KeyRound,
  Database,
  RefreshCw,
} from "lucide-react";
import confetti from "canvas-confetti";
import { apiClient } from "../../services/apiClient";
import { RBACUser, TenantStore } from "../../types";
import { toast } from "../../utils/toast";

interface SystemInitMasterAdminModalProps {
  isOpen: boolean;
  onClose?: () => void;
  onSuccess: (user: RBACUser, tenant?: TenantStore) => void;
  allowDismiss?: boolean;
}

export const SystemInitMasterAdminModal: React.FC<SystemInitMasterAdminModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  allowDismiss = false,
}) => {
  const [name, setName] = useState<string>("Willian C. Lima");
  const [email, setEmail] = useState<string>("willianCLima@gmail.com");
  const [password, setPassword] = useState<string>("");
  const [confirmPassword, setConfirmPassword] = useState<string>("");
  const [phone, setPhone] = useState<string>("+55 (19) 99876-5432");
  const [ecosystemName, setEcosystemName] = useState<string>("AURA Plataforma & Ecossistema");

  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState<boolean>(false);
  const [createdSessionData, setCreatedSessionData] = useState<any>(null);

  if (!isOpen) return null;

  const calculatePasswordStrength = (pwd: string) => {
    if (!pwd) return { score: 0, label: "Vazia", color: "bg-stone-700" };
    let score = 0;
    if (pwd.length >= 8) score += 1;
    if (pwd.length >= 12) score += 1;
    if (/[A-Z]/.test(pwd)) score += 1;
    if (/[a-z]/.test(pwd)) score += 1;
    if (/[0-9]/.test(pwd)) score += 1;
    if (/[^A-Za-z0-9]/.test(pwd)) score += 1;

    if (score <= 3 || pwd.length < 12) return { score: 1, label: "Fraca (< 12 carac.)", color: "bg-rose-500" };
    if (score <= 5) return { score: 2, label: "Média", color: "bg-amber-500" };
    return { score: 3, label: "Forte (Alta Segurança)", color: "bg-emerald-500" };
  };

  const strength = calculatePasswordStrength(password);

  const handleGenerateSecurePassword = () => {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%&*+";
    let securePwd = "";
    for (let i = 0; i < 16; i++) {
      securePwd += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setPassword(securePwd);
    setConfirmPassword(securePwd);
    setShowPassword(true);
    setErrorMessage(null);
  };

  const handleFillDefaults = () => {
    setName("Willian C. Lima");
    setEmail("willianCLima@gmail.com");
    setPhone("+55 (19) 99876-5432");
    setEcosystemName("AURA Plataforma & Ecossistema");
    setErrorMessage(null);
    if (!password) {
      handleGenerateSecurePassword();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!name.trim()) {
      setErrorMessage("Informe o nome completo do administrador mestre.");
      return;
    }
    if (!email.trim() || !email.includes("@")) {
      setErrorMessage("Informe um endereço de e-mail corporativo válido.");
      return;
    }
    if (!password || password.length < 12) {
      setErrorMessage("A senha do Administrador Mestre deve conter no mínimo 12 caracteres.");
      return;
    }
    if (!/[A-Z]/.test(password) || !/[a-z]/.test(password) || !/[0-9]/.test(password) || !/[^A-Za-z0-9]/.test(password)) {
      setErrorMessage("A senha deve conter uma combinação de letras maiúsculas, minúsculas, números e símbolos especiais.");
      return;
    }
    if (password !== confirmPassword) {
      setErrorMessage("A confirmação de senha não confere com a senha informada.");
      return;
    }

    setIsLoading(true);

    try {
      const response = await apiClient.setupFirstAdmin({
        name: name.trim(),
        email: email.trim().toLowerCase(),
        password,
        phone: phone.trim(),
        ecosystemName: ecosystemName.trim(),
      });

      // Confetti celebration
      try {
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 },
          colors: ["#f59e0b", "#fbbf24", "#d97706", "#10b981"],
        });
      } catch (err) {}

      setIsSuccess(true);
      setCreatedSessionData(response);
      toast.success("Conta mestre AURA criada com sucesso! O ecossistema está inicializado.");
    } catch (err: any) {
      setErrorMessage(err.message || "Erro ao criar conta mestre de configuração.");
      toast.error(err.message || "Falha na inicialização do sistema.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleFinishSetup = () => {
    if (createdSessionData?.session) {
      const s = createdSessionData.session;
      const user: RBACUser = {
        id: s.user.id,
        name: s.user.name,
        email: s.user.email,
        role: "SUPER_ADMIN",
        tenantId: s.organization?.id || "org-lumina-01",
        avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80",
        phone: s.user.phone || phone,
        title: "Administrador Mestre & Fundador",
        bio: "Conta raiz responsável pela governança do ecossistema AURA.",
      };

      const tenant: TenantStore | undefined = s.organization
        ? {
            id: s.organization.id,
            name: s.organization.name,
            slug: s.organization.slug,
            document: s.organization.document || "00.000.000/0001-00",
            planTier: "PREMIUM",
            logo: s.organization.logoUrl || "https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?w=200&auto=format&fit=crop&q=80",
            activeProductsCount: 0,
            activeResellersCount: 0,
            city: s.organization.city || "Limeira",
            state: s.organization.state || "SP",
            contactEmail: s.organization.contactEmail || s.user.email,
            contactWhatsapp: s.organization.contactWhatsapp || "(19) 98765-4321",
            customDomain: s.organization.customDomain || `${s.organization.slug}.aura.com`,
            customDomainStatus: "ACTIVE",
            features: {
              unlimitedProducts: true,
              consignments: true,
              commissionEngine: true,
              digitalWarranty: true,
              customJewelry: true,
              whatsappAutomations: true,
              aiGatewayMCP: true,
              marketplaces: true,
              multiUserRBAC: true,
            },
          }
        : undefined;

      onSuccess(user, tenant);
    } else {
      if (onClose) onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md overflow-y-auto animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-stone-900 border border-amber-500/30 rounded-2xl shadow-2xl overflow-hidden my-8">
        {/* Header Banner */}
        <div className="relative bg-gradient-to-r from-stone-950 via-amber-950/40 to-stone-950 p-6 sm:p-8 border-b border-stone-800 text-stone-100">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-amber-500 to-amber-300 flex items-center justify-center font-serif font-black text-stone-950 text-2xl shadow-lg select-none">
                A
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 font-bold">
                    Inicialização do Sistema
                  </span>
                  <span className="text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded-full bg-stone-800 text-stone-400 border border-stone-700">
                    Conta Mestre Raiz
                  </span>
                </div>
                <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white mt-1">
                  Primeiro Administrador AURA
                </h2>
              </div>
            </div>

            {allowDismiss && onClose && (
              <button
                onClick={onClose}
                className="text-stone-400 hover:text-white p-2 rounded-lg hover:bg-stone-800/80 transition-colors cursor-pointer"
                title="Fechar"
              >
                ✕
              </button>
            )}
          </div>

          <p className="text-stone-300 text-xs sm:text-sm mt-3 leading-relaxed">
            O sistema detectou que não existe nenhum usuário cadastrado no banco de dados. 
            Para garantir a governança e segurança da plataforma, crie agora o 
            <strong className="text-amber-400 font-semibold"> Administrador Mestre do Ecossistema</strong>.
          </p>
        </div>

        {/* Content Body */}
        <div className="p-6 sm:p-8 bg-stone-900 text-stone-200">
          {isSuccess ? (
            /* Success State */
            <div className="text-center py-6 space-y-6 animate-in zoom-in-95 duration-200">
              <div className="w-16 h-16 bg-emerald-500/10 border-2 border-emerald-500/30 text-emerald-400 rounded-full flex items-center justify-center mx-auto shadow-inner">
                <CheckCircle2 className="w-9 h-9" />
              </div>

              <div className="space-y-2">
                <h3 className="text-xl font-bold text-white">
                  Ecossistema AURA Inicializado com Sucesso!
                </h3>
                <p className="text-xs sm:text-sm text-stone-400 max-w-md mx-auto">
                  A conta mestre raiz de configuração foi provisionada no banco de dados com credenciais ativas e privilégios irrestritos de governança.
                </p>
              </div>

              {/* Account Card */}
              <div className="bg-stone-950/80 border border-stone-800 rounded-xl p-4 text-left max-w-md mx-auto space-y-2.5 text-xs font-mono">
                <div className="flex items-center justify-between text-stone-400 border-b border-stone-800 pb-2">
                  <span>Administrador:</span>
                  <span className="text-white font-bold">{name}</span>
                </div>
                <div className="flex items-center justify-between text-stone-400 border-b border-stone-800 pb-2">
                  <span>E-mail Mestre:</span>
                  <span className="text-amber-400 font-bold">{email}</span>
                </div>
                <div className="flex items-center justify-between text-stone-400 border-b border-stone-800 pb-2">
                  <span>Perfil de Segurança:</span>
                  <span className="text-emerald-400 font-bold">SUPER_ADMIN (Root)</span>
                </div>
                <div className="flex items-center justify-between text-stone-400">
                  <span>Permissões:</span>
                  <span className="text-amber-300 font-bold">[*] Acesso Total</span>
                </div>
              </div>

              <button
                onClick={handleFinishSetup}
                className="w-full max-w-md mx-auto py-3 px-6 bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-stone-950 font-bold text-sm rounded-xl shadow-lg shadow-amber-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>Acessar Central AURA como Administrador</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          ) : (
            /* Setup Form */
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Information pill */}
              <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-3.5 flex items-start gap-3 text-xs text-amber-200">
                <ShieldCheck className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" />
                <div>
                  <strong className="text-amber-300 block font-semibold mb-0.5">
                    Privilégios da Conta Mestre:
                  </strong>
                  Esta conta possuirá perfil <span className="font-mono font-bold text-amber-300">SUPER_ADMIN</span>, 
                  acesso a todas as lojas (tenants), gestão de planos, aprovação de revendedoras, catálogo mestre e console de governança.
                </div>
              </div>

              {errorMessage && (
                <div className="bg-rose-500/10 border border-rose-500/30 rounded-xl p-3.5 flex items-center gap-3 text-xs text-rose-300 animate-in shake">
                  <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}

              {/* Grid Fields */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Full Name */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-stone-300 flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-amber-400" />
                    <span>Nome Completo do Administrador *</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Ex: Willian C. Lima"
                    className="w-full px-3.5 py-2.5 bg-stone-950 border border-stone-800 rounded-xl text-stone-100 text-xs sm:text-sm focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400 transition-colors"
                  />
                </div>

                {/* Email */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-stone-300 flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5 text-amber-400" />
                    <span>E-mail Corporativo Mestre *</span>
                  </label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Ex: willianCLima@gmail.com"
                    className="w-full px-3.5 py-2.5 bg-stone-950 border border-stone-800 rounded-xl text-stone-100 text-xs sm:text-sm focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400 transition-colors font-mono"
                  />
                </div>

                {/* Password */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-stone-300 flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <Lock className="w-3.5 h-3.5 text-amber-400" />
                      <span>Senha Mestre *</span>
                    </span>
                    <span className="text-[10px] text-stone-400 font-mono">
                      Força: <span className="font-bold text-amber-400">{strength.label}</span>
                    </span>
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Mínimo 12 caracteres (A-Z, a-z, 0-9, símbolos)"
                      className="w-full pl-3.5 pr-10 py-2.5 bg-stone-950 border border-stone-800 rounded-xl text-stone-100 text-xs sm:text-sm focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400 transition-colors font-mono"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-200 transition-colors cursor-pointer"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  <div className="flex items-center justify-between text-[11px] pt-0.5">
                    <button
                      type="button"
                      onClick={handleGenerateSecurePassword}
                      className="text-amber-400 hover:text-amber-300 underline underline-offset-2 flex items-center gap-1 cursor-pointer font-medium"
                    >
                      <Sparkles className="w-3 h-3" />
                      <span>Gerar Senha Forte Aleatória</span>
                    </button>
                    <span className="text-stone-500 text-[10px]">12+ carac. com maiúsc., mín., num. e símbolos</span>
                  </div>
                </div>

                {/* Confirm Password */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-stone-300 flex items-center gap-1.5">
                    <KeyRound className="w-3.5 h-3.5 text-amber-400" />
                    <span>Confirmar Senha Mestre *</span>
                  </label>
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Repita a senha mestre"
                    className="w-full px-3.5 py-2.5 bg-stone-950 border border-stone-800 rounded-xl text-stone-100 text-xs sm:text-sm focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400 transition-colors font-mono"
                  />
                </div>

                {/* Phone / Whatsapp */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-stone-300 flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-stone-400" />
                    <span>WhatsApp / Telefone de Contato</span>
                  </label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+55 (19) 99876-5432"
                    className="w-full px-3.5 py-2.5 bg-stone-950 border border-stone-800 rounded-xl text-stone-100 text-xs sm:text-sm focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400 transition-colors font-mono"
                  />
                </div>

                {/* Ecosystem / Organization Name */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-stone-300 flex items-center gap-1.5">
                    <Building2 className="w-3.5 h-3.5 text-stone-400" />
                    <span>Nome da Plataforma / Matriz</span>
                  </label>
                  <input
                    type="text"
                    value={ecosystemName}
                    onChange={(e) => setEcosystemName(e.target.value)}
                    placeholder="Ex: AURA Plataforma & Ecossistema"
                    className="w-full px-3.5 py-2.5 bg-stone-950 border border-stone-800 rounded-xl text-stone-100 text-xs sm:text-sm focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400 transition-colors"
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-stone-800">
                <button
                  type="button"
                  onClick={handleFillDefaults}
                  className="w-full sm:w-auto text-xs text-amber-400 hover:text-amber-300 flex items-center gap-1.5 py-2 px-3 rounded-lg hover:bg-stone-800/60 transition-colors cursor-pointer"
                >
                  <Zap className="w-3.5 h-3.5" />
                  <span>Preencher dados de Willian C. Lima</span>
                </button>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full sm:w-auto py-2.5 px-6 bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 disabled:opacity-50 text-stone-950 font-bold text-xs sm:text-sm rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  {isLoading ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin text-stone-950" />
                      <span>Inicializando Ecossistema...</span>
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="w-4 h-4 text-stone-950" />
                      <span>Criar Administrador & Inicializar Ecossistema</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
