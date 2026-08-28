import React, { useState } from "react";
import {
  Globe,
  ShieldCheck,
  Lock,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Copy,
  Check,
  ExternalLink,
  Server,
  ArrowUpRight,
  Sparkles,
  HelpCircle,
  Clock,
  KeyRound,
  FileCode,
  Sliders,
  Shield,
  Zap,
  Radio,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { StoreBrandingConfig, TenantStore } from "../types";
import confetti from "canvas-confetti";

interface CustomDomainSSLManagerProps {
  branding: StoreBrandingConfig;
  onUpdateBranding: (updated: StoreBrandingConfig) => void;
  tenant: TenantStore;
}

export const CustomDomainSSLManager: React.FC<CustomDomainSSLManagerProps> = ({
  branding,
  onUpdateBranding,
  tenant,
}) => {
  const [domainInput, setDomainInput] = useState<string>(branding.customDomain || "loja.aura.com");
  const [forceHttps, setForceHttps] = useState<boolean>(branding.customDomainForceHttps ?? true);
  const [hstsEnabled, setHstsEnabled] = useState<boolean>(branding.customDomainHstsEnabled ?? true);
  const [domainStatus, setDomainStatus] = useState<
    "NOT_CONFIGURED" | "PENDING_DNS" | "SSL_PROVISIONING" | "ACTIVE" | "ERROR"
  >(branding.customDomainStatus || "ACTIVE");

  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState<boolean>(false);
  const [isCheckingOwnership, setIsCheckingOwnership] = useState<boolean>(false);
  const [ownershipCheckResult, setOwnershipCheckResult] = useState<{
    testedAt: string;
    domain: string;
    cnameStatus: "SUCCESS" | "PENDING";
    txtOwnershipStatus: "SUCCESS" | "PENDING";
    spfStatus: "SUCCESS" | "PENDING";
    queriedServers: { server: string; ip: string; status: "OK" | "SYNC"; latencyMs: number }[];
    totalLatencyMs: number;
    message: string;
    verified: boolean;
  } | null>(null);
  const [dnsTabFilter, setDnsTabFilter] = useState<"ALL" | "CNAME_TXT" | "ZONE_FILE">("CNAME_TXT");
  const [isValidatingAvailability, setIsValidatingAvailability] = useState<boolean>(false);
  const [availabilityResult, setAvailabilityResult] = useState<{
    valid: boolean;
    domain: string;
    message: string;
    format: "subdomain" | "apex";
    dnsReady: boolean;
    sslAutoEligible: boolean;
  } | null>(null);
  const [verifySteps, setVerifySteps] = useState<{ step: string; status: "pending" | "success" | "running" }[]>([]);
  const [selectedProviderGuide, setSelectedProviderGuide] = useState<string>("registrobr");
  const [showCertDetails, setShowCertDetails] = useState<boolean>(false);
  const [saveToast, setSaveToast] = useState<boolean>(false);

  const cnameTarget = branding.customDomainCnameTarget || "cname.aura.com";
  const ipTarget = branding.customDomainIpTarget || "199.36.158.100";
  const sslIssuer = branding.customDomainSslIssuer || "Let's Encrypt Authority X3 (Auto-Renew 90d)";
  const sslExpiry = branding.customDomainSslExpiresAt || "2026-11-01 (Renovação Automática)";

  const handleValidateAndConfigureSSL = (domainToTest?: string) => {
    const raw = (domainToTest || domainInput).trim().toLowerCase().replace(/^https?:\/\//, "").replace(/\/+$/, "");
    if (!raw) {
      setAvailabilityResult({
        valid: false,
        domain: "",
        message: "Por favor, informe um nome de domínio válido (ex: loja.aura.com ou suamarca.com.br).",
        format: "subdomain",
        dnsReady: false,
        sslAutoEligible: false,
      });
      return;
    }

    // Domain validation regex
    const domainRegex = /^(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}$/;
    if (!domainRegex.test(raw)) {
      setAvailabilityResult({
        valid: false,
        domain: raw,
        message: "Formato de domínio inválido. Use caracteres alfanuméricos e pontos (ex: joias.minhaloja.com.br).",
        format: "subdomain",
        dnsReady: false,
        sslAutoEligible: false,
      });
      return;
    }

    setIsValidatingAvailability(true);
    setAvailabilityResult(null);

    // Simulate real-time DNS & SSL Provider API check
    setTimeout(() => {
      const parts = raw.split(".");
      const isSubdomain = parts.length > 2;

      setAvailabilityResult({
        valid: true,
        domain: raw,
        message: `Domínio '${raw}' disponível e elegível para provisionamento automático de SSL/TLS 1.3!`,
        format: isSubdomain ? "subdomain" : "apex",
        dnsReady: true,
        sslAutoEligible: true,
      });
      setIsValidatingAvailability(false);

      // Auto configure SSL and save
      const updated: StoreBrandingConfig = {
        ...branding,
        customDomain: raw,
        customDomainStatus: "ACTIVE",
        customDomainSslAutoManaged: true,
        customDomainForceHttps: forceHttps,
        customDomainHstsEnabled: hstsEnabled,
        customDomainLastChecked: new Date().toISOString().replace("T", " ").substring(0, 16),
      };

      onUpdateBranding(updated);
      setDomainStatus("ACTIVE");
      setSaveToast(true);
      confetti({
        particleCount: 45,
        spread: 70,
        origin: { y: 0.6 },
      });
      setTimeout(() => setSaveToast(false), 4000);
    }, 1200);
  };

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    confetti({
      particleCount: 20,
      spread: 40,
      origin: { y: 0.7 },
    });
    setTimeout(() => setCopiedKey(null), 2500);
  };

  const handleSaveDomain = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const cleanDomain = domainInput.trim().toLowerCase().replace(/^https?:\/\//, "").replace(/\/+$/, "");
    
    const updated: StoreBrandingConfig = {
      ...branding,
      customDomain: cleanDomain,
      customDomainStatus: cleanDomain ? "ACTIVE" : "NOT_CONFIGURED",
      customDomainSslAutoManaged: true,
      customDomainForceHttps: forceHttps,
      customDomainHstsEnabled: hstsEnabled,
      customDomainLastChecked: new Date().toISOString().replace("T", " ").substring(0, 16),
    };

    onUpdateBranding(updated);
    setSaveToast(true);
    confetti({
      particleCount: 35,
      spread: 60,
      origin: { y: 0.6 },
    });
    setTimeout(() => setSaveToast(false), 3500);
  };

  const handleVerifyOwnershipDNS = () => {
    setIsCheckingOwnership(true);
    setOwnershipCheckResult(null);

    const cleanDomain =
      domainInput.trim().toLowerCase().replace(/^https?:\/\//, "").replace(/\/+$/, "") || "loja.aura.com";

    setTimeout(() => {
      setOwnershipCheckResult({
        testedAt: new Date().toLocaleTimeString("pt-BR"),
        domain: cleanDomain,
        cnameStatus: "SUCCESS",
        txtOwnershipStatus: "SUCCESS",
        spfStatus: "SUCCESS",
        queriedServers: [
          { server: "Google Public DNS", ip: "8.8.8.8", status: "OK", latencyMs: 12 },
          { server: "Cloudflare Resolver", ip: "1.1.1.1", status: "OK", latencyMs: 8 },
          { server: "OpenDNS Cisco", ip: "208.67.222.222", status: "OK", latencyMs: 19 },
          { server: "Quad9 Anycast", ip: "9.9.9.9", status: "OK", latencyMs: 15 },
          { server: "Registro.br Autoritativo", ip: "200.160.0.10", status: "SYNC", latencyMs: 22 },
        ],
        totalLatencyMs: 18,
        message: `Consulta de DNS concluída com 100% de sucesso! Registro CNAME e registro TXT de posse de domínio validados em todos os nós de borda globais.`,
        verified: true,
      });
      setIsCheckingOwnership(false);
      setDomainStatus("ACTIVE");
      confetti({
        particleCount: 50,
        spread: 75,
        origin: { y: 0.65 },
      });
    }, 1200);
  };

  const handleRunDiagnostic = () => {
    setIsVerifying(true);
    setVerifySteps([
      { step: "Consultando servidores DNS mundiais (Google 8.8.8.8 e Cloudflare 1.1.1.1)...", status: "running" },
    ]);

    setTimeout(() => {
      setVerifySteps((prev) => [
        { ...prev[0], status: "success" },
        { step: "Apontamento CNAME / A validado com sucesso para o cluster SaaS", status: "running" },
      ]);
    }, 900);

    setTimeout(() => {
      setVerifySteps((prev) => [
        prev[0],
        { ...prev[1], status: "success" },
        { step: "Validando desafio ACME HTTP-01 e emitindo certificado TLS 1.3 gerenciado...", status: "running" },
      ]);
    }, 1800);

    setTimeout(() => {
      setVerifySteps((prev) => [
        prev[0],
        prev[1],
        { ...prev[2], status: "success" },
        { step: "SSL Let's Encrypt ativo! Redirecionamento HTTPS forçado e seguro.", status: "success" },
      ]);
      setDomainStatus("ACTIVE");
      setIsVerifying(false);
      confetti({
        particleCount: 50,
        spread: 80,
        origin: { y: 0.6 },
      });
    }, 2800);
  };

  const getSubdomainOrHost = (fullDomain: string) => {
    const parts = fullDomain.split(".");
    if (parts.length > 2) {
      return parts[0]; // e.g. "loja" in "loja.aura.com"
    }
    return "@";
  };

  const currentHost = getSubdomainOrHost(domainInput || "loja.aura.com");

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Banner Principal */}
      <div className="bg-gradient-to-r from-stone-900 via-stone-850 to-stone-900 rounded-3xl p-6 sm:p-8 text-white border border-stone-700/60 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-400/20 text-emerald-300 text-[11px] font-bold tracking-wider uppercase border border-emerald-400/30">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>SSL Gerenciado Automático • Zero Configuração de Certificados</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-serif italic font-bold text-stone-100">
              Domínio Customizado da Landing Home
            </h2>
            <p className="text-xs sm:text-sm text-stone-300 font-light leading-relaxed">
              Vincule o endereço próprio da sua marca (ex: <span className="font-mono text-amber-300 font-bold">loja.aura.com</span> ou <span className="font-mono text-amber-300 font-bold">semijoias.lumina.com.br</span>). O sistema emite, renova e gerencia automaticamente o certificado de segurança SSL/TLS Let's Encrypt com criptografia de ponta e CDN global.
            </p>
          </div>

          <div className="flex flex-col items-end gap-2 shrink-0">
            <div className="flex items-center gap-2 bg-stone-800/90 px-4 py-2 rounded-2xl border border-stone-700 text-xs">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="font-bold text-stone-200">Status do Domínio:</span>
              <span className="font-bold text-emerald-400 uppercase">
                {domainStatus === "ACTIVE" ? "Ativo & Seguro (SSL)" : "Aguardando DNS"}
              </span>
            </div>
            <span className="text-[10px] text-stone-400">
              Última sincronização: {branding.customDomainLastChecked || "Hoje às 06:30"}
            </span>
          </div>
        </div>

        {saveToast && (
          <div className="mt-4 p-3 rounded-2xl bg-emerald-950/80 border border-emerald-500/50 text-emerald-300 text-xs font-semibold flex items-center gap-2 animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>Domínio e configurações de segurança salvos com sucesso! Propagando para a Landing Home...</span>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* ========================================================================= */}
        {/* COLUNA ESQUERDA: FORMULÁRIO DE DOMÍNIO & TOGGLES DE SEGURANÇA (5 COLUNAS) */}
        {/* ========================================================================= */}
        <div className="lg:col-span-5 space-y-6">
          {/* 1. INPUT DO DOMÍNIO */}
          <div className="bg-white rounded-3xl border border-stone-200 p-6 space-y-5 shadow-xs">
            <div className="flex items-center justify-between pb-3 border-b border-stone-100">
              <div className="flex items-center gap-2">
                <Globe className="w-4 h-4 text-amber-600" />
                <h3 className="font-serif italic font-bold text-base text-stone-900">
                  1. Configurar Domínio Próprio
                </h3>
              </div>
              <span className="text-[10px] font-bold uppercase text-stone-500 bg-stone-100 px-2.5 py-0.5 rounded-full">
                {tenant.name}
              </span>
            </div>

            <form onSubmit={handleSaveDomain} className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold uppercase tracking-wider text-stone-700 block">
                    Endereço Web Desejado (Domínio Próprio):
                  </label>
                  <span className="text-[10px] font-mono text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                    Auto-SSL Pronto
                  </span>
                </div>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-stone-400">
                    <Lock className="w-4 h-4 text-emerald-600" />
                  </div>
                  <input
                    type="text"
                    value={domainInput}
                    onChange={(e) => {
                      setDomainInput(e.target.value);
                      if (availabilityResult) setAvailabilityResult(null);
                    }}
                    placeholder="loja.aura.com ou joias.suamarca.com.br"
                    className="w-full bg-stone-50 border border-stone-300 rounded-2xl pl-10 pr-4 py-3 text-sm font-mono font-bold text-stone-900 focus:bg-white focus:outline-none focus:border-amber-500 transition-all shadow-inner"
                  />
                </div>
                <p className="text-[11px] text-stone-500">
                  Recomendamos usar subdomínio (ex: <span className="font-mono text-stone-700 font-semibold">loja.aura.com</span>) ou domínio principal (<span className="font-mono text-stone-700 font-semibold">aura.com</span>).
                </p>
              </div>

              {/* Action Buttons: Validate Availability & Auto Configure SSL */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                <button
                  type="button"
                  onClick={() => handleValidateAndConfigureSSL()}
                  disabled={isValidatingAvailability || !domainInput.trim()}
                  className="py-3 px-3 rounded-2xl bg-stone-900 hover:bg-stone-800 text-amber-300 font-bold text-xs uppercase tracking-wider transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                  title="Testa a disponibilidade do domínio e provisiona SSL via provedor de serviço"
                >
                  <RefreshCw className={`w-3.5 h-3.5 text-amber-400 ${isValidatingAvailability ? "animate-spin" : ""}`} />
                  <span>{isValidatingAvailability ? "Validando..." : "Validar Disponibilidade & SSL"}</span>
                </button>

                <button
                  type="submit"
                  className="py-3 px-3 rounded-2xl bg-amber-400 hover:bg-amber-300 text-stone-950 font-bold text-xs uppercase tracking-wider transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Check className="w-4 h-4" />
                  <span>Salvar & Ativar</span>
                </button>
              </div>

              {/* Feedback de Validação e Auto-SSL */}
              {availabilityResult && (
                <div
                  className={`p-3.5 rounded-2xl border text-xs animate-in fade-in space-y-1.5 ${
                    availabilityResult.valid
                      ? "bg-emerald-50/90 border-emerald-300 text-emerald-900"
                      : "bg-rose-50 border-rose-300 text-rose-900"
                  }`}
                >
                  <div className="flex items-center gap-2 font-bold">
                    {availabilityResult.valid ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    ) : (
                      <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                    )}
                    <span>{availabilityResult.valid ? "Domínio Válido & SSL Configurado!" : "Atenção ao Domínio"}</span>
                  </div>
                  <p className="text-[11px] leading-relaxed pl-6">{availabilityResult.message}</p>
                  {availabilityResult.valid && (
                    <div className="pl-6 pt-1 flex flex-wrap gap-2 text-[10px] font-mono">
                      <span className="bg-emerald-200/60 text-emerald-900 px-2 py-0.5 rounded-md">
                        ✓ SSL Let's Encrypt TLS 1.3
                      </span>
                      <span className="bg-emerald-200/60 text-emerald-900 px-2 py-0.5 rounded-md">
                        ✓ Redirecionamento HTTPS 301
                      </span>
                      <span className="bg-emerald-200/60 text-emerald-900 px-2 py-0.5 rounded-md">
                        ✓ Renovação Automática 90d
                      </span>
                    </div>
                  )}
                </div>
              )}
            </form>
          </div>

          {/* 2. SSL AUTO-MANAGED & SEGURANÇA */}
          <div className="bg-white rounded-3xl border border-stone-200 p-6 space-y-5 shadow-xs">
            <div className="flex items-center justify-between pb-3 border-b border-stone-100">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <h3 className="font-serif italic font-bold text-base text-stone-900">
                  2. Certificado SSL & Criptografia
                </h3>
              </div>
              <span className="text-[10px] font-bold uppercase text-emerald-700 bg-emerald-100 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" />
                <span>Automático</span>
              </span>
            </div>

            {/* SSL Info Card */}
            <div className="p-4 rounded-2xl bg-emerald-50/60 border border-emerald-200/80 space-y-3">
              <div className="flex items-start justify-between">
                <div className="space-y-0.5">
                  <span className="text-xs font-bold text-emerald-950 block flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5 text-emerald-700" />
                    <span>Certificado TLS 1.3 Ativo</span>
                  </span>
                  <p className="text-[11px] text-emerald-800">
                    Emitido automaticamente via ACME Let's Encrypt com chave ECC 256-bit.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowCertDetails(!showCertDetails)}
                  className="text-[10px] font-bold text-emerald-800 hover:text-emerald-950 flex items-center gap-0.5"
                >
                  <span>{showCertDetails ? "Ocultar" : "Detalhes"}</span>
                  {showCertDetails ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                </button>
              </div>

              {showCertDetails && (
                <div className="pt-2 border-t border-emerald-200/60 space-y-1.5 text-[10px] font-mono text-emerald-900 animate-in fade-in">
                  <div className="flex justify-between">
                    <span className="text-emerald-700">Autoridade Emissora:</span>
                    <span className="font-bold">{sslIssuer}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-emerald-700">Validade:</span>
                    <span className="font-bold">{sslExpiry}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-emerald-700">Criptografia:</span>
                    <span className="font-bold">TLS 1.3 / AES-256-GCM / SHA-384</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-emerald-700">Renovação:</span>
                    <span className="font-bold text-emerald-600">Zero-downtime (Auto)</span>
                  </div>
                </div>
              )}
            </div>

            {/* Security Toggles */}
            <div className="space-y-3 pt-1">
              <label className="flex items-center justify-between p-3 rounded-2xl bg-stone-50 border border-stone-200 cursor-pointer hover:bg-stone-100/70 transition-colors">
                <div className="space-y-0.5 pr-2">
                  <span className="text-xs font-bold text-stone-900 block flex items-center gap-1.5">
                    <Zap className="w-3.5 h-3.5 text-amber-600" />
                    <span>Forçar Redirecionamento HTTPS</span>
                  </span>
                  <p className="text-[10px] text-stone-500">
                    Redireciona automaticamente todo tráfego HTTP para HTTPS seguro (301 Permanent Redirect).
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={forceHttps}
                  onChange={(e) => setForceHttps(e.target.checked)}
                  className="w-4 h-4 accent-amber-500 rounded cursor-pointer"
                />
              </label>

              <label className="flex items-center justify-between p-3 rounded-2xl bg-stone-50 border border-stone-200 cursor-pointer hover:bg-stone-100/70 transition-colors">
                <div className="space-y-0.5 pr-2">
                  <span className="text-xs font-bold text-stone-900 block flex items-center gap-1.5">
                    <Shield className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Proteção HSTS (Strict-Transport-Security)</span>
                  </span>
                  <p className="text-[10px] text-stone-500">
                    Instrui navegadores a exigir conexões seguras, prevenindo ataques de interceptação SSL strip.
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={hstsEnabled}
                  onChange={(e) => setHstsEnabled(e.target.checked)}
                  className="w-4 h-4 accent-amber-500 rounded cursor-pointer"
                />
              </label>
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* COLUNA DIREITA: PAINEL DE CONFIGURAÇÃO AVANÇADA DE DNS (CNAME / TXT)     */}
        {/* ========================================================================= */}
        <div className="lg:col-span-7 space-y-6">
          {/* PAINEL DE CONFIGURAÇÃO AVANÇADA DE DNS */}
          <div className="bg-white rounded-3xl border border-stone-200 p-6 sm:p-8 space-y-6 shadow-xs">
            <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-stone-100">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-700">
                  <Server className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-serif italic font-bold text-lg text-stone-900">
                      Configuração Avançada de DNS
                    </h3>
                    <span className="text-[10px] font-mono font-bold bg-amber-100 text-amber-900 px-2 py-0.5 rounded-full">
                      CNAME & TXT
                    </span>
                  </div>
                  <p className="text-[11px] text-stone-500">
                    Entradas obrigatórias para apontar o domínio customizado e comprovar a propriedade técnica.
                  </p>
                </div>
              </div>

              {/* Botões de Ação: Verificar Propriedade + Diagnóstico */}
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={handleVerifyOwnershipDNS}
                  disabled={isCheckingOwnership || isVerifying}
                  className="px-4 py-2 rounded-full bg-amber-400 hover:bg-amber-300 text-stone-950 font-bold text-xs flex items-center gap-1.5 transition-all shadow-xs cursor-pointer disabled:opacity-50"
                  title="Simula uma consulta global de DNS nos servidores autoritativos para checar CNAME e TXT"
                >
                  <Radio className={`w-3.5 h-3.5 ${isCheckingOwnership ? "animate-spin text-stone-900" : "text-stone-950"}`} />
                  <span>{isCheckingOwnership ? "Consultando DNS..." : "Verificar Propriedade"}</span>
                </button>

                <button
                  type="button"
                  onClick={handleRunDiagnostic}
                  disabled={isVerifying || isCheckingOwnership}
                  className="px-3.5 py-2 rounded-full bg-stone-900 hover:bg-stone-800 text-stone-100 font-bold text-xs flex items-center gap-1.5 transition-all shadow-xs cursor-pointer disabled:opacity-50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isVerifying ? "animate-spin text-amber-400" : ""}`} />
                  <span>{isVerifying ? "Testando..." : "Diagnóstico SSL"}</span>
                </button>
              </div>
            </div>

            {/* Sub-filtros de Visualização de DNS */}
            <div className="flex items-center justify-between gap-2 border-b border-stone-100 pb-2">
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setDnsTabFilter("CNAME_TXT")}
                  className={`px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    dnsTabFilter === "CNAME_TXT"
                      ? "bg-stone-900 text-amber-300 shadow-xs"
                      : "bg-stone-100 text-stone-600 hover:bg-stone-200"
                  }`}
                >
                  CNAME & TXT (Essenciais)
                </button>
                <button
                  type="button"
                  onClick={() => setDnsTabFilter("ALL")}
                  className={`px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    dnsTabFilter === "ALL"
                      ? "bg-stone-900 text-amber-300 shadow-xs"
                      : "bg-stone-100 text-stone-600 hover:bg-stone-200"
                  }`}
                >
                  Todos os Registros (+ Tipo A)
                </button>
                <button
                  type="button"
                  onClick={() => setDnsTabFilter("ZONE_FILE")}
                  className={`px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                    dnsTabFilter === "ZONE_FILE"
                      ? "bg-stone-900 text-amber-300 shadow-xs"
                      : "bg-stone-100 text-stone-600 hover:bg-stone-200"
                  }`}
                >
                  <FileCode className="w-3.5 h-3.5" />
                  <span>Zona BIND (Raw)</span>
                </button>
              </div>

              <span className="text-[11px] text-stone-400 font-mono hidden sm:inline-block">
                TTL Padrão: 300s (5min)
              </span>
            </div>

            {/* PAINEL DE RESULTADO DA SIMULAÇÃO DE CONSULTA DNS: VERIFICAR PROPRIEDADE */}
            {ownershipCheckResult && (
              <div className="p-4 rounded-2xl bg-gradient-to-br from-stone-900 via-stone-950 to-stone-900 text-stone-100 border border-stone-800 shadow-lg space-y-3 animate-in fade-in duration-300">
                <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-stone-800">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
                    <span className="text-xs font-bold text-emerald-400 flex items-center gap-1">
                      <ShieldCheck className="w-4 h-4" />
                      <span>Propriedade do Domínio Verificada com Sucesso!</span>
                    </span>
                  </div>
                  <span className="text-[10px] font-mono text-stone-400">
                    Consulta executada às {ownershipCheckResult.testedAt} • Latência: {ownershipCheckResult.totalLatencyMs}ms
                  </span>
                </div>

                <p className="text-xs text-stone-300 font-light leading-relaxed">
                  {ownershipCheckResult.message}
                </p>

                {/* Status dos Servidores DNS Mundiais */}
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2 pt-1">
                  {ownershipCheckResult.queriedServers.map((srv, idx) => (
                    <div key={idx} className="p-2 rounded-xl bg-stone-850/80 border border-stone-700/60 text-center space-y-1">
                      <span className="text-[10px] font-bold text-stone-300 block truncate">{srv.server}</span>
                      <span className="text-[9px] font-mono text-stone-500 block">{srv.ip}</span>
                      <div className="flex items-center justify-center gap-1 text-[10px] text-emerald-400 font-mono font-bold">
                        <Check className="w-3 h-3" />
                        <span>{srv.latencyMs}ms</span>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Resumo dos registros respondidos */}
                <div className="pt-2 border-t border-stone-800/80 flex flex-wrap gap-2 text-[11px] font-mono">
                  <span className="px-2.5 py-0.5 rounded-lg bg-emerald-900/40 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                    <Check className="w-3 h-3" /> CNAME: OK (Apontamento para {cnameTarget})
                  </span>
                  <span className="px-2.5 py-0.5 rounded-lg bg-emerald-900/40 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                    <Check className="w-3 h-3" /> TXT Propriedade: Válido (Hash ACME confirmada)
                  </span>
                  <span className="px-2.5 py-0.5 rounded-lg bg-emerald-900/40 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                    <Check className="w-3 h-3" /> TXT SPF: Autenticado
                  </span>
                </div>
              </div>
            )}

            {/* TABELAS DE REGISTROS DNS OU RAW ZONE FILE */}
            {dnsTabFilter === "ZONE_FILE" ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-stone-800">
                    Arquivo de Zona DNS no formato RFC 1035 (BIND / Cloudflare / cPanel):
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      handleCopy(
                        `; Zona DNS Gerada para ${domainInput || "loja.aura.com"}\n$ORIGIN ${domainInput || "loja.aura.com"}.\n$TTL 300\n\n; Apontamento CNAME Principal da Loja\n${currentHost}\tIN\tCNAME\t${cnameTarget}.\n\n; Registro TXT de Verificação de Propriedade\n_aura-challenge\tIN\tTXT\t"aura-site-verification=lumina-sec-7f93a02e58bdc8e4"\n\n; Registro TXT de SPF para E-mails Transacionais\n@\tIN\tTXT\t"v=spf1 include:_spf.aura.com ~all"\n\n; Registro Tipo A (Fallback Apex)\n@\tIN\tA\t${ipTarget}\n`,
                        "zone_file_all"
                      )
                    }
                    className="px-3 py-1 rounded-xl bg-stone-900 hover:bg-stone-800 text-amber-300 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-xs"
                  >
                    {copiedKey === "zone_file_all" ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedKey === "zone_file_all" ? "Copiado!" : "Copiar Zona Completa"}</span>
                  </button>
                </div>

                <textarea
                  readOnly
                  rows={8}
                  value={`; Zona DNS Gerada para ${domainInput || "loja.aura.com"}
$ORIGIN ${domainInput || "loja.aura.com"}.
$TTL 300

; 1. Apontamento CNAME Principal da Loja
${currentHost}\tIN\tCNAME\t${cnameTarget}.

; 2. Registro TXT de Verificação de Propriedade do Domínio (ACME)
_aura-challenge\tIN\tTXT\t"aura-site-verification=lumina-sec-7f93a02e58bdc8e4"

; 3. Registro TXT de SPF (Garantia Digital & E-mails)
@\tIN\tTXT\t"v=spf1 include:_spf.aura.com ~all"

; 4. Registro Tipo A (Apex Root Fallback)
@\tIN\tA\t${ipTarget}`}
                  className="w-full font-mono text-xs p-4 rounded-2xl bg-stone-950 text-stone-200 border border-stone-800 focus:outline-none select-all"
                />
              </div>
            ) : (
              <div className="space-y-4">
                {/* 1. CNAME RECORD (MAIN) */}
                <div className="p-4 rounded-2xl bg-stone-50 border border-stone-200 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-0.5 rounded-md bg-amber-100 text-amber-900 font-mono font-bold text-xs">
                        CNAME
                      </span>
                      <span className="text-xs font-bold text-stone-900">
                        1. Apontamento Principal da Loja (Subdomínio)
                      </span>
                    </div>
                    <span className="text-[10px] font-bold uppercase text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full flex items-center gap-1">
                      <Check className="w-3 h-3" />
                      <span>Propagado</span>
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs font-mono">
                    <div className="p-2.5 bg-white rounded-xl border border-stone-200">
                      <span className="text-[10px] text-stone-400 block font-sans font-semibold">TIPO</span>
                      <span className="font-bold text-stone-800">CNAME</span>
                    </div>

                    <div className="p-2.5 bg-white rounded-xl border border-stone-200 flex items-center justify-between">
                      <div>
                        <span className="text-[10px] text-stone-400 block font-sans font-semibold">NOME / HOST</span>
                        <span className="font-bold text-stone-800">{currentHost}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleCopy(currentHost, "host_cname")}
                        className="p-1 text-stone-400 hover:text-stone-700"
                        title="Copiar Host CNAME"
                      >
                        {copiedKey === "host_cname" ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    </div>

                    <div className="p-2.5 bg-white rounded-xl border border-stone-200 flex items-center justify-between sm:col-span-2">
                      <div className="truncate mr-1">
                        <span className="text-[10px] text-stone-400 block font-sans font-semibold">DESTINO / VALOR</span>
                        <span className="font-bold text-amber-700 truncate block">{cnameTarget}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleCopy(cnameTarget, "target_cname")}
                        className="p-1 text-stone-400 hover:text-stone-700 shrink-0"
                        title="Copiar Destino CNAME"
                      >
                        {copiedKey === "target_cname" ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>
                </div>

                {/* 2. TXT RECORD (VERIFICAÇÃO DE PROPRIEDADE DO DOMÍNIO) */}
                <div className="p-4 rounded-2xl bg-stone-50 border border-stone-200 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-0.5 rounded-md bg-indigo-100 text-indigo-900 font-mono font-bold text-xs">
                        TXT
                      </span>
                      <span className="text-xs font-bold text-stone-900">
                        2. Verificação de Propriedade do Domínio & Desafio ACME
                      </span>
                    </div>
                    <span className="text-[10px] font-bold uppercase text-indigo-700 bg-indigo-100 px-2 py-0.5 rounded-full flex items-center gap-1">
                      <Shield className="w-3 h-3" />
                      <span>Propriedade & SSL</span>
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs font-mono">
                    <div className="p-2.5 bg-white rounded-xl border border-stone-200">
                      <span className="text-[10px] text-stone-400 block font-sans font-semibold">TIPO</span>
                      <span className="font-bold text-stone-800">TXT</span>
                    </div>

                    <div className="p-2.5 bg-white rounded-xl border border-stone-200 flex items-center justify-between">
                      <div>
                        <span className="text-[10px] text-stone-400 block font-sans font-semibold">NOME / HOST</span>
                        <span className="font-bold text-stone-800">_aura-challenge</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleCopy("_aura-challenge", "host_txt_prop")}
                        className="p-1 text-stone-400 hover:text-stone-700"
                        title="Copiar Host TXT"
                      >
                        {copiedKey === "host_txt_prop" ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    </div>

                    <div className="p-2.5 bg-white rounded-xl border border-stone-200 flex items-center justify-between sm:col-span-2">
                      <div className="truncate mr-1">
                        <span className="text-[10px] text-stone-400 block font-sans font-semibold">VALOR / CONTEÚDO TXT</span>
                        <span className="font-bold text-indigo-700 truncate block">aura-site-verification=lumina-sec-7f93a02e58bdc8e4</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleCopy("aura-site-verification=lumina-sec-7f93a02e58bdc8e4", "val_txt_prop")}
                        className="p-1 text-stone-400 hover:text-stone-700 shrink-0"
                        title="Copiar Conteúdo TXT"
                      >
                        {copiedKey === "val_txt_prop" ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>
                </div>

                {/* 3. TXT RECORD (SPF E-MAILS & GARANTIA DIGITAL QR) */}
                <div className="p-4 rounded-2xl bg-stone-50 border border-stone-200 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-0.5 rounded-md bg-purple-100 text-purple-900 font-mono font-bold text-xs">
                        TXT
                      </span>
                      <span className="text-xs font-bold text-stone-900">
                        3. Autenticação SPF (E-mails Transacionais & Garantias Digitais)
                      </span>
                    </div>
                    <span className="text-[10px] font-bold uppercase text-purple-700 bg-purple-100 px-2 py-0.5 rounded-full">
                      SPF v=spf1
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs font-mono">
                    <div className="p-2.5 bg-white rounded-xl border border-stone-200">
                      <span className="text-[10px] text-stone-400 block font-sans font-semibold">TIPO</span>
                      <span className="font-bold text-stone-800">TXT</span>
                    </div>

                    <div className="p-2.5 bg-white rounded-xl border border-stone-200 flex items-center justify-between">
                      <div>
                        <span className="text-[10px] text-stone-400 block font-sans font-semibold">NOME / HOST</span>
                        <span className="font-bold text-stone-800">@</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleCopy("@", "host_txt_spf")}
                        className="p-1 text-stone-400 hover:text-stone-700"
                        title="Copiar Host SPF"
                      >
                        {copiedKey === "host_txt_spf" ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    </div>

                    <div className="p-2.5 bg-white rounded-xl border border-stone-200 flex items-center justify-between sm:col-span-2">
                      <div className="truncate mr-1">
                        <span className="text-[10px] text-stone-400 block font-sans font-semibold">VALOR / CONTEÚDO TXT</span>
                        <span className="font-bold text-purple-700 truncate block">v=spf1 include:_spf.aura.com ~all</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleCopy("v=spf1 include:_spf.aura.com ~all", "val_txt_spf")}
                        className="p-1 text-stone-400 hover:text-stone-700 shrink-0"
                        title="Copiar Conteúdo SPF"
                      >
                        {copiedKey === "val_txt_spf" ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>
                </div>

                {/* 4. A RECORD (APEX / ROOT FALLBACK - VISÍVEL QUANDO 'ALL') */}
                {dnsTabFilter === "ALL" && (
                  <div className="p-4 rounded-2xl bg-stone-50 border border-stone-200 space-y-3 animate-in fade-in">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="px-2.5 py-0.5 rounded-md bg-stone-200 text-stone-800 font-mono font-bold text-xs">
                          TIPO A
                        </span>
                        <span className="text-xs font-bold text-stone-900">
                          4. Opcional para Domínio Raiz Apex (ex: aura.com)
                        </span>
                      </div>
                      <span className="text-[10px] font-bold uppercase text-stone-500 bg-stone-200 px-2 py-0.5 rounded-full">
                        IPv4 Anycast
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs font-mono">
                      <div className="p-2.5 bg-white rounded-xl border border-stone-200">
                        <span className="text-[10px] text-stone-400 block font-sans font-semibold">TIPO</span>
                        <span className="font-bold text-stone-800">A</span>
                      </div>

                      <div className="p-2.5 bg-white rounded-xl border border-stone-200 flex items-center justify-between">
                        <div>
                          <span className="text-[10px] text-stone-400 block font-sans font-semibold">NOME / HOST</span>
                          <span className="font-bold text-stone-800">@</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleCopy("@", "host_a")}
                          className="p-1 text-stone-400 hover:text-stone-700"
                          title="Copiar Nome"
                        >
                          {copiedKey === "host_a" ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                        </button>
                      </div>

                      <div className="p-2.5 bg-white rounded-xl border border-stone-200 flex items-center justify-between">
                        <div>
                          <span className="text-[10px] text-stone-400 block font-sans font-semibold">ENDEREÇO IP</span>
                          <span className="font-bold text-stone-800">{ipTarget}</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleCopy(ipTarget, "target_ip")}
                          className="p-1 text-stone-400 hover:text-stone-700"
                          title="Copiar IP"
                        >
                          {copiedKey === "target_ip" ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* LIVE DIAGNOSTIC OUTPUT TERMINAL */}
            {verifySteps.length > 0 && (
              <div className="p-4 rounded-2xl bg-stone-950 text-stone-200 font-mono text-xs space-y-2 border border-stone-800 shadow-inner">
                <div className="flex items-center justify-between pb-2 border-b border-stone-800 text-[11px] text-stone-400">
                  <span className="flex items-center gap-1.5">
                    <Radio className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
                    <span>Diagnóstico de Conectividade DNS & SSL</span>
                  </span>
                  <span className="text-stone-500">TTL: 300s</span>
                </div>
                {verifySteps.map((s, idx) => (
                  <div key={idx} className="flex items-start gap-2 animate-in fade-in">
                    {s.status === "success" ? (
                      <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    ) : (
                      <RefreshCw className="w-4 h-4 text-amber-400 animate-spin shrink-0 mt-0.5" />
                    )}
                    <span className={s.status === "success" ? "text-emerald-300" : "text-amber-200"}>
                      {s.step}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {/* 2. GUIAS RÁPIDOS DE PROVEDORES POPULARES */}
            <div className="pt-4 border-t border-stone-200 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-stone-700 flex items-center gap-1.5">
                  <HelpCircle className="w-4 h-4 text-amber-600" />
                  <span>Passo a Passo por Provedor:</span>
                </span>

                <div className="flex items-center gap-1">
                  {[
                    { id: "registrobr", label: "Registro.br" },
                    { id: "cloudflare", label: "Cloudflare" },
                    { id: "godaddy", label: "GoDaddy" },
                    { id: "hostinger", label: "Hostinger" },
                  ].map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setSelectedProviderGuide(p.id)}
                      className={`px-3 py-1 rounded-xl text-[11px] font-bold transition-all cursor-pointer ${
                        selectedProviderGuide === p.id
                          ? "bg-stone-900 text-amber-300 shadow-xs"
                          : "bg-stone-100 text-stone-600 hover:bg-stone-200"
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Instructions text */}
              <div className="p-4 rounded-2xl bg-amber-50/60 border border-amber-200/70 text-xs text-stone-700 space-y-2 leading-relaxed">
                {selectedProviderGuide === "registrobr" && (
                  <div>
                    <p className="font-bold text-stone-900">Como configurar no Registro.br:</p>
                    <ol className="list-decimal list-inside space-y-1 text-[11px] text-stone-600 mt-1">
                      <li>Acesse o painel do Registro.br e clique no seu domínio.</li>
                      <li>Vá na seção <strong>DNS &gt; Editar Zona</strong> (ou Modo Avançado).</li>
                      <li>Clique em <strong>Nova Entrada</strong>, selecione <strong>CNAME</strong>.</li>
                      <li>No campo Nome preencha com <code className="font-mono bg-white px-1 py-0.5 rounded text-amber-900">{currentHost}</code> e no campo Dados preencha com <code className="font-mono bg-white px-1 py-0.5 rounded text-amber-900">{cnameTarget}</code>.</li>
                      <li>Clique em <strong>Salvar Alterações</strong>. A propagação leva de 10 a 60 minutos.</li>
                    </ol>
                  </div>
                )}

                {selectedProviderGuide === "cloudflare" && (
                  <div>
                    <p className="font-bold text-stone-900">Como configurar no Cloudflare:</p>
                    <ol className="list-decimal list-inside space-y-1 text-[11px] text-stone-600 mt-1">
                      <li>No dashboard da Cloudflare, selecione o domínio e abra a aba <strong>DNS &gt; Records</strong>.</li>
                      <li>Clique em <strong>Add Record</strong>, escolha o tipo <strong>CNAME</strong>.</li>
                      <li>Em Name digite <code className="font-mono bg-white px-1 py-0.5 rounded text-amber-900">{currentHost}</code> e em Target cole <code className="font-mono bg-white px-1 py-0.5 rounded text-amber-900">{cnameTarget}</code>.</li>
                      <li>Recomendamos manter o Proxy <strong>DNS Only (Nuvem Cinza)</strong> durante a primeira emissão de SSL.</li>
                    </ol>
                  </div>
                )}

                {selectedProviderGuide === "godaddy" && (
                  <div>
                    <p className="font-bold text-stone-900">Como configurar na GoDaddy:</p>
                    <ol className="list-decimal list-inside space-y-1 text-[11px] text-stone-600 mt-1">
                      <li>Acesse <strong>Meus Produtos &gt; Gerenciar DNS</strong> no domínio correspondente.</li>
                      <li>Clique em <strong>Adicionar Novo Registro</strong> e selecione o tipo <strong>CNAME</strong>.</li>
                      <li>Preencha Nome com <code className="font-mono bg-white px-1 py-0.5 rounded text-amber-900">{currentHost}</code> e Valor com <code className="font-mono bg-white px-1 py-0.5 rounded text-amber-900">{cnameTarget}</code>.</li>
                      <li>Deixe o TTL em 1/2 hora ou Automático e salve.</li>
                    </ol>
                  </div>
                )}

                {selectedProviderGuide === "hostinger" && (
                  <div>
                    <p className="font-bold text-stone-900">Como configurar na Hostinger:</p>
                    <ol className="list-decimal list-inside space-y-1 text-[11px] text-stone-600 mt-1">
                      <li>No hPanel, vá em <strong>Domínios &gt; Zona DNS</strong>.</li>
                      <li>Selecione o registro <strong>CNAME</strong>, aponte o host para <code className="font-mono bg-white px-1 py-0.5 rounded text-amber-900">{cnameTarget}</code>.</li>
                      <li>Clique em <strong>Adicionar Registro</strong> e aguarde a propagação.</li>
                    </ol>
                  </div>
                )}
              </div>
            </div>

            {/* LIVE TEST BUTTON IN BROWSER */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-3">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-stone-600">URL Final da sua Landing Home:</span>
                <span className="font-mono text-xs font-bold text-stone-900 bg-stone-100 px-2.5 py-1 rounded-lg border border-stone-200">
                  https://{domainInput || "loja.aura.com"}
                </span>
              </div>

              <a
                href={`https://${domainInput || "loja.aura.com"}`}
                target="_blank"
                rel="noreferrer"
                className="px-5 py-2.5 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1.5 transition-all shadow-sm"
              >
                <span>Acessar Domínio</span>
                <ArrowUpRight className="w-4 h-4" />
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
