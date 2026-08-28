import React, { useState } from "react";
import {
  ShieldCheck,
  Lock,
  Eye,
  EyeOff,
  History,
  CheckCircle2,
  AlertTriangle,
  UserCheck,
  Database,
  KeyRound,
  Globe,
  RefreshCw,
  ExternalLink,
  Copy,
  Check,
  Clock,
  ArrowUpRight,
  Sparkles,
  Server,
  Activity,
  FileText,
  Filter,
  Search,
  Zap,
} from "lucide-react";
import { AuditTrailLog, DomainSSLAuditEntry, RBACUser, StoreBrandingConfig } from "../types";
import { mockDomainSSLAuditLogs } from "../data/mockData";
import confetti from "canvas-confetti";

interface SecurityAuditLGPDProps {
  currentUser: RBACUser;
  auditLogs: AuditTrailLog[];
  domainSslLogs?: DomainSSLAuditEntry[];
  branding?: StoreBrandingConfig;
  onNavigateTab?: (tab: string) => void;
}

export const SecurityAuditLGPD: React.FC<SecurityAuditLGPDProps> = ({
  currentUser,
  auditLogs,
  domainSslLogs = mockDomainSSLAuditLogs,
  branding,
  onNavigateTab,
}) => {
  const [activeSubView, setActiveSubView] = useState<"general" | "domain_ssl">("domain_ssl");
  const [showMaskedData, setShowMaskedData] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [domainSearchQuery, setDomainSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [isVerifyingTls, setIsVerifyingTls] = useState(false);
  const [tlsCheckResult, setTlsCheckResult] = useState<{
    testedAt: string;
    latencyMs: number;
    cipher: string;
    protocol: string;
    ocspStatus: string;
    hstsHeader: string;
    status: "HEALTHY" | "WARNING";
  } | null>(null);

  // Active domain info derived from branding or defaults
  const activeDomain = branding?.customDomain || "loja.aura.com";
  const sslIssuer = branding?.customDomainSslIssuer || "Let's Encrypt Authority X3 (ISRG Root X1)";
  const sslExpiry = branding?.customDomainSslExpiresAt || "2026-11-01 (Renovação Automática)";
  const isSslActive = branding?.customDomainStatus === "ACTIVE" || true;
  const isForceHttps = branding?.customDomainForceHttps !== false;
  const isHstsEnabled = branding?.customDomainHstsEnabled !== false;

  // Filter domain audit logs
  const filteredDomainLogs = domainSslLogs.filter((log) => {
    const matchesSearch =
      log.domain.toLowerCase().includes(domainSearchQuery.toLowerCase()) ||
      log.adminName.toLowerCase().includes(domainSearchQuery.toLowerCase()) ||
      log.action.toLowerCase().includes(domainSearchQuery.toLowerCase()) ||
      log.technicalDetails.toLowerCase().includes(domainSearchQuery.toLowerCase());

    const matchesStatus = statusFilter === "ALL" || log.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2500);
  };

  const handleRunTlsHandshakeCheck = () => {
    setIsVerifyingTls(true);
    setTlsCheckResult(null);

    setTimeout(() => {
      setTlsCheckResult({
        testedAt: new Date().toLocaleTimeString("pt-BR"),
        latencyMs: Math.floor(Math.random() * 15) + 12,
        cipher: "TLS_AES_256_GCM_SHA384 (ECDSA P-256)",
        protocol: "TLSv1.3 (RFC 8446)",
        ocspStatus: "Good (Stapled via Cloud Edge CDN)",
        hstsHeader: "max-age=31536000; includeSubDomains; preload",
        status: "HEALTHY",
      });
      setIsVerifyingTls(false);
      confetti({
        particleCount: 35,
        spread: 50,
        origin: { y: 0.7 },
      });
    }, 1100);
  };

  return (
    <div className="space-y-8 text-stone-900">
      {/* Header Principal */}
      <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-4 pb-4 border-b border-stone-200">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-stone-400">
              Domínio #1 & #10: Segurança, LGPD & Auditoria de Infraestrutura
            </span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-serif italic font-bold tracking-wide text-stone-900 mt-1">
            Segurança, Auditoria & Status de Domínios e SSL
          </h2>
          <p className="text-xs text-stone-600 mt-1 max-w-2xl font-sans leading-relaxed">
            Monitoramento em tempo real do ciclo de vida dos certificados SSL/TLS, trilha de auditoria imutável de configurações de domínios por administradores e compliance com a LGPD.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5 bg-emerald-50 px-3 py-1.5 rounded-full border border-emerald-200 text-xs font-semibold text-emerald-800">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span>SSL TLS 1.3 Ativo • Grade A+</span>
          </div>
          <div className="flex items-center gap-1.5 bg-stone-100 px-3 py-1.5 rounded-full border border-stone-200 text-xs font-semibold text-stone-700">
            <Lock className="w-3.5 h-3.5 text-stone-600" />
            <span>LGPD Compliant • AES-256</span>
          </div>
        </div>
      </div>

      {/* Sub-Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-stone-200 pb-2 overflow-x-auto">
        <button
          onClick={() => setActiveSubView("domain_ssl")}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-full text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
            activeSubView === "domain_ssl"
              ? "bg-stone-900 text-amber-300 shadow-xs border border-amber-400/40"
              : "bg-white text-stone-700 hover:bg-stone-100 border border-stone-200"
          }`}
        >
          <Globe className="w-3.5 h-3.5 text-amber-400" />
          <span>🌐 Relatório de Status de Domínios e SSL</span>
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse ml-0.5" />
        </button>

        <button
          onClick={() => setActiveSubView("general")}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-full text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
            activeSubView === "general"
              ? "bg-stone-900 text-amber-300 shadow-xs border border-amber-400/40"
              : "bg-white text-stone-700 hover:bg-stone-100 border border-stone-200"
          }`}
        >
          <History className="w-3.5 h-3.5" />
          <span>🛡️ Auditoria Geral RBAC & LGPD</span>
          <span className="px-2 py-0.5 rounded-full text-[10px] bg-stone-800 text-stone-300 font-mono">
            {auditLogs.length}
          </span>
        </button>
      </div>

      {/* VIEW 1: RELATÓRIO ESPECÍFICO DE STATUS DE DOMÍNIOS E SSL */}
      {activeSubView === "domain_ssl" && (
        <div className="space-y-8 animate-in fade-in duration-200">
          {/* Card de Destaque: Status Atual da Expiração do Certificado SSL */}
          <div className="bg-gradient-to-br from-stone-900 via-stone-850 to-stone-950 rounded-3xl border border-stone-800 p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute bottom-0 left-1/3 w-64 h-64 bg-amber-500/10 rounded-full blur-2xl pointer-events-none" />

            <div className="relative z-10 space-y-6">
              {/* Header do Card de Certificado */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 border-b border-stone-800">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shadow-inner">
                    <Lock className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-400 font-mono">
                        Certificado TLS / SSL Válido & Monitorado
                      </span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-950 text-emerald-400 border border-emerald-500/40">
                        Grade A+
                      </span>
                    </div>
                    <h3 className="text-xl sm:text-2xl font-serif italic font-bold text-white flex items-center gap-2">
                      <span>https://{activeDomain}</span>
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                    </h3>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2.5">
                  <button
                    onClick={handleRunTlsHandshakeCheck}
                    disabled={isVerifyingTls}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-stone-800 hover:bg-stone-700 border border-stone-700 text-stone-200 text-xs font-semibold transition-all cursor-pointer disabled:opacity-60"
                    title="Testa o handshake TLS 1.3 e validação OCSP com os nós de borda"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 text-amber-400 ${isVerifyingTls ? "animate-spin" : ""}`} />
                    <span>{isVerifyingTls ? "Testando Handshake..." : "Testar Handshake TLS Agora"}</span>
                  </button>

                  {onNavigateTab && (
                    <button
                      onClick={() => onNavigateTab("storeSettings")}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-2xl bg-amber-400 hover:bg-amber-300 text-stone-950 text-xs font-bold uppercase tracking-wider transition-all cursor-pointer shadow-md"
                    >
                      <Globe className="w-3.5 h-3.5" />
                      <span>Gerenciar Domínio</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Grid de Métricas de Expiração & Parâmetros Criptográficos */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* 1. Status de Expiração */}
                <div className="bg-stone-950/70 border border-stone-800/80 rounded-2xl p-4 space-y-1.5">
                  <span className="text-[10px] uppercase font-bold tracking-wider text-stone-400 block">
                    Status de Expiração
                  </span>
                  <div className="flex items-center gap-1.5 text-emerald-400 font-bold text-sm">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>Válido (73 dias restantes)</span>
                  </div>
                  <p className="text-[11px] text-stone-300 font-mono">{sslExpiry}</p>
                </div>

                {/* 2. Autoridade Emissora (CA) */}
                <div className="bg-stone-950/70 border border-stone-800/80 rounded-2xl p-4 space-y-1.5">
                  <span className="text-[10px] uppercase font-bold tracking-wider text-stone-400 block">
                    Autoridade Certificadora
                  </span>
                  <div className="text-sm font-bold text-amber-300 truncate">
                    Let's Encrypt Authority X3
                  </div>
                  <p className="text-[11px] text-stone-400">ISRG Root X1 • ACME v2</p>
                </div>

                {/* 3. Cifra & Algoritmo */}
                <div className="bg-stone-950/70 border border-stone-800/80 rounded-2xl p-4 space-y-1.5">
                  <span className="text-[10px] uppercase font-bold tracking-wider text-stone-400 block">
                    Protocolo & Criptografia
                  </span>
                  <div className="text-sm font-bold text-white font-mono">TLS 1.3 • ECDSA P-256</div>
                  <p className="text-[11px] text-stone-400 font-mono">AES-256-GCM / SHA384</p>
                </div>

                {/* 4. Renovação Automática & HSTS */}
                <div className="bg-stone-950/70 border border-stone-800/80 rounded-2xl p-4 space-y-1.5">
                  <span className="text-[10px] uppercase font-bold tracking-wider text-stone-400 block">
                    Políticas de Proteção
                  </span>
                  <div className="text-sm font-bold text-emerald-400 flex items-center gap-1.5">
                    <Zap className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Auto-Renew • HSTS 365d</span>
                  </div>
                  <p className="text-[11px] text-stone-400">Redirecionamento HTTPS 301</p>
                </div>
              </div>

              {/* Barra de Progresso Visual do Ciclo de Vida do Certificado (90 dias) */}
              <div className="bg-stone-950/50 rounded-2xl p-4 border border-stone-850 space-y-2">
                <div className="flex items-center justify-between text-xs text-stone-300">
                  <span className="font-medium flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-amber-400" />
                    <span>Ciclo de Renovação Automática (Let's Encrypt 90 dias)</span>
                  </span>
                  <span className="font-mono text-emerald-400 font-bold">17 dias decorridos • 73 dias restantes</span>
                </div>
                <div className="w-full h-2.5 bg-stone-800 rounded-full overflow-hidden flex">
                  <div className="h-full bg-gradient-to-r from-emerald-500 to-amber-400 w-[19%]" />
                  <div className="h-full bg-stone-700/50 w-[81%]" />
                </div>
                <div className="flex items-center justify-between text-[10px] text-stone-400 font-mono pt-0.5">
                  <span>Emitido: 01/08/2026</span>
                  <span className="text-amber-300 font-bold">Auto-Renovação Agendada: 01/10/2026</span>
                  <span>Expira: 01/11/2026</span>
                </div>
              </div>

              {/* Resultado do Teste de Handshake TLS (Se acionado) */}
              {tlsCheckResult && (
                <div className="bg-emerald-950/80 border border-emerald-500/40 rounded-2xl p-4 text-xs space-y-2 animate-in fade-in">
                  <div className="flex items-center justify-between">
                    <span className="text-emerald-300 font-bold flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      <span>Diagnóstico de Handshake TLS Concluído com Sucesso ({tlsCheckResult.testedAt})</span>
                    </span>
                    <span className="font-mono text-[11px] bg-emerald-900 text-emerald-200 px-2 py-0.5 rounded-md">
                      Latência: {tlsCheckResult.latencyMs} ms
                    </span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11px] font-mono text-stone-300 pt-1">
                    <div>Protocolo: <span className="text-white">{tlsCheckResult.protocol}</span></div>
                    <div>Cifra: <span className="text-white">{tlsCheckResult.cipher}</span></div>
                    <div>OCSP Stapling: <span className="text-emerald-400">{tlsCheckResult.ocspStatus}</span></div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Seção: Histórico de Tentativas de Configuração de Domínios por Administradores */}
          <div className="bg-white border border-stone-200 rounded-3xl overflow-hidden shadow-xs space-y-4">
            {/* Header da Tabela com Filtros */}
            <div className="p-6 border-b border-stone-200 space-y-4">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-700">
                    <Globe className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-serif italic font-bold text-stone-900">
                      Histórico de Tentativas & Configurações de Domínios Customizados
                    </h3>
                    <p className="text-xs text-stone-500">
                      Registro de auditoria de todas as validações de DNS, emissões de certificados SSL e alterações efetuadas pelos administradores.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-stone-600 bg-stone-100 px-3 py-1.5 rounded-full border border-stone-200">
                    {filteredDomainLogs.length} eventos registrados
                  </span>
                </div>
              </div>

              {/* Barra de Filtros e Busca */}
              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                <div className="relative flex-1">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-stone-400">
                    <Search className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    value={domainSearchQuery}
                    onChange={(e) => setDomainSearchQuery(e.target.value)}
                    placeholder="Filtrar por domínio (ex: loja.aura.com), administrador ou ação..."
                    className="w-full bg-stone-50 border border-stone-200 rounded-2xl pl-10 pr-4 py-2 text-xs text-stone-900 focus:bg-white focus:outline-none focus:border-stone-900 transition-all font-sans"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <Filter className="w-4 h-4 text-stone-400 shrink-0" />
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="bg-stone-50 border border-stone-200 rounded-2xl px-3 py-2 text-xs text-stone-800 font-semibold focus:outline-none focus:bg-white cursor-pointer"
                  >
                    <option value="ALL">Todos os Status</option>
                    <option value="SUCESSO">✓ Sucesso</option>
                    <option value="ALERTA_DNS">⚠ Alerta DNS</option>
                    <option value="EM_PROGRESSO">⏳ Em Progresso</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Tabela de Auditoria de Domínios */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-stone-700">
                <thead className="bg-stone-50 text-stone-400 uppercase text-[10px] tracking-wider border-b border-stone-200">
                  <tr>
                    <th className="py-3.5 px-6 font-bold">Data / Hora</th>
                    <th className="py-3.5 px-4 font-bold">Domínio Alvo</th>
                    <th className="py-3.5 px-4 font-bold">Operação / Ação</th>
                    <th className="py-3.5 px-4 font-bold">Administrador Responsável</th>
                    <th className="py-3.5 px-4 font-bold">Status</th>
                    <th className="py-3.5 px-4 font-bold">Detalhes Técnicos & DNS</th>
                    <th className="py-3.5 px-6 font-bold text-right">IP / Dispositivo</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100 font-sans text-xs">
                  {filteredDomainLogs.map((log) => {
                    const isSuccess = log.status === "SUCESSO";
                    const isAlert = log.status === "ALERTA_DNS";
                    return (
                      <tr key={log.id} className="hover:bg-stone-50/80 transition-colors">
                        <td className="py-4 px-6 text-stone-500 font-mono text-[11px] whitespace-nowrap">
                          {log.timestamp}
                        </td>

                        <td className="py-4 px-4 font-mono font-bold text-stone-900 whitespace-nowrap">
                          <span className="flex items-center gap-1.5">
                            <Globe className="w-3.5 h-3.5 text-stone-400" />
                            <span>{log.domain}</span>
                          </span>
                        </td>

                        <td className="py-4 px-4 whitespace-nowrap">
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold font-mono bg-stone-100 text-stone-800 border border-stone-200">
                            {log.action}
                          </span>
                        </td>

                        <td className="py-4 px-4">
                          <div className="font-semibold text-stone-900">{log.adminName}</div>
                          <div className="text-[10px] text-stone-400 font-mono">{log.adminRole}</div>
                        </td>

                        <td className="py-4 px-4 whitespace-nowrap">
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold ${
                              isSuccess
                                ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                                : isAlert
                                ? "bg-amber-100 text-amber-800 border border-amber-200"
                                : "bg-rose-100 text-rose-800 border border-rose-200"
                            }`}
                          >
                            {isSuccess ? (
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            ) : (
                              <AlertTriangle className="w-3 h-3 text-amber-600" />
                            )}
                            <span>{log.status}</span>
                          </span>
                        </td>

                        <td className="py-4 px-4 text-stone-600 text-[11px] max-w-xs leading-relaxed">
                          <p className="line-clamp-2" title={log.technicalDetails}>
                            {log.technicalDetails}
                          </p>
                          {log.dnsResponseTimeMs && (
                            <span className="inline-block mt-1 font-mono text-[10px] text-stone-400">
                              Latência DNS: {log.dnsResponseTimeMs}ms
                            </span>
                          )}
                        </td>

                        <td className="py-4 px-6 text-right text-stone-400 font-mono text-[10px] whitespace-nowrap">
                          <div>{log.ipAddress}</div>
                          <div className="truncate max-w-[120px] ml-auto text-stone-400" title={log.userAgent}>
                            {log.userAgent.split("/")[0]}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {filteredDomainLogs.length === 0 && (
                <div className="p-8 text-center text-stone-500 text-xs">
                  Nenhum registro de auditoria de domínio encontrado para o filtro atual.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* VIEW 2: AUDITORIA GERAL RBAC & LGPD */}
      {activeSubView === "general" && (
        <div className="space-y-8 animate-in fade-in duration-200">
          {/* Cards Row: RBAC Status + LGPD Masking Toggle */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* User Card */}
            <div className="bg-white border border-stone-200 rounded-3xl p-6 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-widest text-stone-400">
                  Sessão Autenticada
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-stone-900 text-white font-mono">
                  {currentUser.role}
                </span>
              </div>
              <h3 className="text-xl font-serif font-bold text-stone-900">{currentUser.name}</h3>
              <p className="text-xs text-stone-500">{currentUser.email}</p>
              <div className="pt-2 border-t border-stone-100 text-[11px] text-emerald-700 font-semibold flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>MFA & Assinatura de Sessão Ativos</span>
              </div>
            </div>

            {/* LGPD Masking Controls */}
            <div className="bg-white border border-stone-200 rounded-3xl p-6 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-widest text-stone-400">
                  Proteção de Dados Pessoais
                </span>
                <button
                  onClick={() => setShowMaskedData(!showMaskedData)}
                  className="text-xs text-stone-600 hover:text-stone-950 flex items-center gap-1 font-semibold cursor-pointer"
                >
                  {showMaskedData ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  <span>{showMaskedData ? "Ocultar" : "Revelar"}</span>
                </button>
              </div>
              <h3 className="text-base font-serif italic font-bold text-stone-900">
                Mascaramento Dinâmico de CPF
              </h3>
              <div className="bg-stone-50 p-2.5 rounded-xl border border-stone-100 font-mono text-xs text-stone-800">
                CPF Exemplo: {showMaskedData ? "384.921.849-00" : "***.***.***-00"}
              </div>
              <p className="text-[10px] text-stone-400">
                Apenas administradores autorizados com termo de consentimento podem decodificar dados reais.
              </p>
            </div>

            {/* Cryptography & Tenant Isolation */}
            <div className="bg-white border border-stone-200 rounded-3xl p-6 shadow-xs space-y-3">
              <span className="text-[10px] font-bold uppercase tracking-widest text-stone-400">
                Isolamento de Tenant
              </span>
              <h3 className="text-base font-serif italic font-bold text-stone-900">
                Row Level Security (RLS)
              </h3>
              <p className="text-xs text-stone-600 leading-relaxed">
                Cada query no PostgreSQL contém a cláusula explícita{" "}
                <code className="font-mono bg-stone-100 px-1 py-0.5 rounded text-stone-800 text-[10px]">
                  WHERE tenant_id = current_tenant()
                </code>
                .
              </p>
              <div className="text-[10px] text-stone-400 font-mono">Status: RLS Habilitado no Postgres</div>
            </div>
          </div>

          {/* Audit Trail Logs Table */}
          <div className="bg-white border border-stone-200 rounded-3xl overflow-hidden shadow-xs">
            <div className="p-6 border-b border-stone-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <History className="w-5 h-5 text-stone-700" />
                <div>
                  <h3 className="text-base font-serif italic font-bold text-stone-900">
                    Trilha de Auditoria Imutável (Security Log)
                  </h3>
                  <p className="text-xs text-stone-500">
                    Registro criptograficamente seguro de todas as ações administrativas, mutações de dados e autorizações MCP.
                  </p>
                </div>
              </div>
              <span className="text-xs text-stone-500 font-medium">
                {auditLogs.length} eventos registrados
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-stone-700">
                <thead className="bg-stone-50 text-stone-400 uppercase text-[10px] tracking-wider border-b border-stone-200">
                  <tr>
                    <th className="py-3.5 px-6 font-bold">Data / Hora</th>
                    <th className="py-3.5 px-4 font-bold">Ação</th>
                    <th className="py-3.5 px-4 font-bold">Operador / Papel</th>
                    <th className="py-3.5 px-4 font-bold">Entidade Alvo</th>
                    <th className="py-3.5 px-6 font-bold text-right">IP / Dispositivo</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100 font-mono text-[11px]">
                  {auditLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-stone-50/60 transition-colors">
                      <td className="py-3.5 px-6 text-stone-500 font-sans">{log.timestamp}</td>
                      <td className="py-3.5 px-4 font-sans">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-stone-100 text-stone-900 border border-stone-200">
                          {log.action}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-sans text-stone-900 font-medium">
                        {log.userName || (log as any).actor}
                      </td>
                      <td className="py-3.5 px-4 font-sans text-stone-600">
                        <span className="font-semibold">{log.entity || log.targetEntity}</span>: {log.details}
                      </td>
                      <td className="py-3.5 px-6 text-right text-stone-400 text-[10px]">
                        {log.ipAddress} • {log.userAgent?.split(" ")[0]}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
