import React, { useState, useEffect, useCallback } from "react";
import {
  Activity,
  Server,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  RefreshCw,
  Cpu,
  Database,
  ShieldCheck,
  Terminal,
  ExternalLink,
  Layers,
  Copy,
  Check,
  Maximize2,
  Minimize2,
  X,
  Wifi,
  WifiOff,
} from "lucide-react";
import { apiClient, tenantManager } from "../services/apiClient";

const metaEnv = ((import.meta as unknown) as { env?: Record<string, string | boolean> }).env || {};
const envMode = String(metaEnv.MODE || "development");
const isDev = Boolean(metaEnv.DEV);
const isProd = Boolean(metaEnv.PROD);

export interface BackendHealthResponse {
  status: string;
  postgres: string;
  pool: string;
  rls: string;
  version: string;
  latencyMs?: number;
  uptimeSeconds?: number;
  error?: string;
}

export interface PreviewDiagnosticProps {
  /** If true, renders as full screen diagnostic dashboard */
  fullscreen?: boolean;
  /** If true, renders compact without floating trigger */
  compact?: boolean;
  /** Callback to close diagnostic modal/screen if closable */
  onClose?: () => void;
}

export function PreviewDiagnostic({
  fullscreen = false,
  compact = false,
  onClose,
}: PreviewDiagnosticProps) {
  const [mountedAt] = useState<string>(() => new Date().toLocaleTimeString());
  const [renderCount, setRenderCount] = useState<number>(1);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [healthData, setHealthData] = useState<BackendHealthResponse | null>(null);
  const [healthError, setHealthError] = useState<string | null>(null);
  const [httpStatus, setHttpStatus] = useState<number | null>(null);
  const [latencyMs, setLatencyMs] = useState<number | null>(null);
  const [lastCheckTime, setLastCheckTime] = useState<string>("");
  const [copied, setCopied] = useState<boolean>(false);
  const [isOpen, setIsOpen] = useState<boolean>(fullscreen || compact);
  const [storageStatus, setStorageStatus] = useState<{
    accessible: boolean;
    hasToken: boolean;
    tokenPreview?: string;
    hasTenant: boolean;
    tenantId?: string;
  }>({ accessible: false, hasToken: false, hasTenant: false });

  // Test local storage accessibility
  const checkStorage = useCallback(() => {
    try {
      const testKey = "__aura_diag_test__";
      localStorage.setItem(testKey, "1");
      localStorage.removeItem(testKey);

      const token = localStorage.getItem("aura_session_token");
      const tenant = localStorage.getItem("aura_current_tenant_id");

      setStorageStatus({
        accessible: true,
        hasToken: Boolean(token),
        tokenPreview: token ? `${token.substring(0, 16)}...` : undefined,
        hasTenant: Boolean(tenant),
        tenantId: tenant || undefined,
      });
    } catch {
      setStorageStatus({
        accessible: false,
        hasToken: false,
        hasTenant: false,
      });
    }
  }, []);

  // Fetch backend /api/health
  const checkBackendHealth = useCallback(async () => {
    setIsLoading(true);
    setHealthError(null);
    const start = performance.now();

    try {
      const res = await fetch("/api/health", {
        headers: {
          Accept: "application/json",
        },
      });

      const latency = Math.round(performance.now() - start);
      setLatencyMs(latency);
      setHttpStatus(res.status);

      const data = await res.json();
      setHealthData(data);
      if (!res.ok) {
        setHealthError(data.error || `HTTP ${res.status}`);
      }
    } catch (err: any) {
      const latency = Math.round(performance.now() - start);
      setLatencyMs(latency);
      setHttpStatus(0);
      setHealthError(err.message || "Falha na conexão com o servidor Express");
      setHealthData(null);
    } finally {
      setIsLoading(false);
      setLastCheckTime(new Date().toLocaleTimeString());
      setRenderCount((prev) => prev + 1);
    }
  }, []);

  useEffect(() => {
    checkStorage();
    checkBackendHealth();
  }, [checkStorage, checkBackendHealth]);

  const copyDiagnosticJson = () => {
    const diagnosticReport = {
      timestamp: new Date().toISOString(),
      frontend: {
        reactMounted: true,
        reactVersion: React.version,
        mountedAt,
        windowLocation: {
          href: window.location.href,
          origin: window.location.origin,
          pathname: window.location.pathname,
          search: window.location.search,
          hash: window.location.hash,
        },
        viewport: {
          width: window.innerWidth,
          height: window.innerHeight,
        },
        mode: envMode,
        isDev,
        isProd,
      },
      backend: {
        httpStatus,
        latencyMs,
        healthData,
        healthError,
        lastCheckTime,
      },
      storage: storageStatus,
      auth: {
        hasValidToken: apiClient.hasValidToken(),
        activeTenantId: tenantManager.getCurrentTenantId(),
      },
    };

    navigator.clipboard.writeText(JSON.stringify(diagnosticReport, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleResetCache = () => {
    try {
      localStorage.clear();
      sessionStorage.clear();
      window.location.reload();
    } catch (e) {
      console.error("Erro ao limpar storage:", e);
    }
  };

  const isConnected = httpStatus === 200 && healthData?.status === "ok";

  // Compact rendering (e.g. inside ErrorBoundary)
  if (compact) {
    return (
      <div className="bg-stone-900 border border-stone-800 rounded-2xl p-4 text-xs font-mono text-stone-300 space-y-3">
        <div className="flex items-center justify-between border-b border-stone-800 pb-2">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-amber-400" />
            <span className="font-bold text-stone-200">Relatório de Diagnóstico Rápido</span>
          </div>
          <button
            onClick={checkBackendHealth}
            disabled={isLoading}
            className="flex items-center gap-1 px-2 py-1 rounded bg-stone-800 hover:bg-stone-700 text-stone-300"
          >
            <RefreshCw className={`w-3 h-3 ${isLoading ? "animate-spin" : ""}`} />
            <span>Testar</span>
          </button>
        </div>

        <div className="grid grid-cols-2 gap-2 text-[11px]">
          <div>
            <span className="text-stone-500">React:</span>{" "}
            <span className="text-emerald-400 font-semibold">Montado (v{React.version})</span>
          </div>
          <div>
            <span className="text-stone-500">Backend /api/health:</span>{" "}
            {isConnected ? (
              <span className="text-emerald-400 font-semibold">200 OK ({latencyMs}ms)</span>
            ) : (
              <span className="text-rose-400 font-semibold">
                {httpStatus ? `HTTP ${httpStatus}` : "Desconectado"}
              </span>
            )}
          </div>
          <div>
            <span className="text-stone-500">PostgreSQL:</span>{" "}
            <span className={healthData?.postgres === "ok" ? "text-emerald-400" : "text-amber-400"}>
              {healthData?.postgres || "N/A"}
            </span>
          </div>
          <div>
            <span className="text-stone-500">Ambiente:</span>{" "}
            <span className="text-stone-400">{envMode}</span>
          </div>
        </div>
      </div>
    );
  }

  // Floating trigger button when collapsed
  if (!isOpen && !fullscreen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        title="Abrir Diagnóstico de Saúde do Sistema (React & Backend)"
        className="fixed bottom-4 right-4 z-50 flex items-center gap-2 bg-stone-900/90 hover:bg-stone-800 text-stone-200 text-xs font-mono font-medium px-3 py-2 rounded-full border border-stone-700 shadow-xl backdrop-blur-md transition-all hover:scale-105 active:scale-95 cursor-pointer"
      >
        <span className="relative flex h-2 w-2">
          {isConnected ? (
            <>
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </>
          ) : (
            <>
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
            </>
          )}
        </span>
        <Activity className="w-3.5 h-3.5 text-amber-400" />
        <span>Diagnóstico {isConnected ? "OK" : "Atenção"}</span>
      </button>
    );
  }

  const containerClasses = fullscreen
    ? "min-h-screen bg-stone-950 text-stone-100 p-6 flex flex-col items-center justify-center font-sans"
    : "fixed inset-0 z-50 bg-stone-950/80 backdrop-blur-sm flex items-center justify-center p-4 font-sans";

  return (
    <div className={containerClasses}>
      <div className="w-full max-w-3xl bg-stone-900 border border-stone-800 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-stone-800 pb-5">
          <div className="flex items-center gap-3">
            <div
              className={`w-12 h-12 rounded-2xl flex items-center justify-center text-xl border ${
                isConnected
                  ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                  : "bg-rose-500/10 border-rose-500/30 text-rose-400"
              }`}
            >
              {isConnected ? <Wifi className="w-6 h-6" /> : <WifiOff className="w-6 h-6" />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold font-serif text-white">
                  Aura ERP — Diagnóstico de Inicialização & Preview
                </h2>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-amber-400/10 text-amber-400 border border-amber-400/20">
                  v1.2.0
                </span>
              </div>
              <p className="text-xs text-stone-400 font-mono mt-0.5">
                Validação em tempo real: Servidor HTTP, React DOM, Conexão Backend e Banco de Dados.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={copyDiagnosticJson}
              title="Copiar relatório JSON para a área de transferência"
              className="p-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 transition-colors cursor-pointer"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
            </button>
            {!fullscreen && (
              <button
                onClick={() => {
                  setIsOpen(false);
                  onClose?.();
                }}
                className="p-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-400 hover:text-stone-200 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Status Indicators Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Card 1: React Mount */}
          <div className="bg-stone-950/60 border border-stone-800 rounded-2xl p-4 space-y-2">
            <div className="flex items-center justify-between text-xs text-stone-400 font-mono">
              <span className="flex items-center gap-1.5">
                <Cpu className="w-3.5 h-3.5 text-sky-400" />
                Frontend React
              </span>
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-base font-bold text-white">Montado & Ativo</div>
            <div className="text-[11px] text-stone-400 font-mono space-y-0.5">
              <div>Versão: React {React.version}</div>
              <div>Montado às: {mountedAt}</div>
              <div>Render checks: #{renderCount}</div>
            </div>
          </div>

          {/* Card 2: Backend Express */}
          <div className="bg-stone-950/60 border border-stone-800 rounded-2xl p-4 space-y-2">
            <div className="flex items-center justify-between text-xs text-stone-400 font-mono">
              <span className="flex items-center gap-1.5">
                <Server className="w-3.5 h-3.5 text-amber-400" />
                Backend Express
              </span>
              {isConnected ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              ) : (
                <XCircle className="w-4 h-4 text-rose-400" />
              )}
            </div>
            <div className="text-base font-bold text-white">
              {isLoading ? (
                <span className="text-stone-500 text-sm">Consultando...</span>
              ) : isConnected ? (
                <span className="text-emerald-400">200 OK</span>
              ) : (
                <span className="text-rose-400">{httpStatus ? `Erro ${httpStatus}` : "Inacessível"}</span>
              )}
            </div>
            <div className="text-[11px] text-stone-400 font-mono space-y-0.5">
              <div>Endpoint: /api/health</div>
              <div>Latência: {latencyMs !== null ? `${latencyMs} ms` : "—"}</div>
              <div>Último teste: {lastCheckTime || "—"}</div>
            </div>
          </div>

          {/* Card 3: Database & Security */}
          <div className="bg-stone-950/60 border border-stone-800 rounded-2xl p-4 space-y-2">
            <div className="flex items-center justify-between text-xs text-stone-400 font-mono">
              <span className="flex items-center gap-1.5">
                <Database className="w-3.5 h-3.5 text-purple-400" />
                PostgreSQL & RLS
              </span>
              {healthData?.postgres === "ok" ? (
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-amber-400" />
              )}
            </div>
            <div className="text-base font-bold text-white">
              {healthData?.postgres === "ok" ? (
                <span className="text-emerald-400">Conectado (Pool OK)</span>
              ) : (
                <span className="text-stone-400">Desconhecido</span>
              )}
            </div>
            <div className="text-[11px] text-stone-400 font-mono space-y-0.5">
              <div>RLS: {healthData?.rls || "Não verificado"}</div>
              <div>Uptime: {healthData?.uptimeSeconds ? `${healthData.uptimeSeconds}s` : "—"}</div>
              <div>Versão DB: {healthData?.version || "—"}</div>
            </div>
          </div>
        </div>

        {/* Detailed Breakdown Tabs/Section */}
        <div className="space-y-4">
          <h3 className="text-xs font-mono font-bold text-stone-400 uppercase tracking-wider flex items-center gap-2">
            <Terminal className="w-3.5 h-3.5 text-stone-400" />
            Parâmetros do Ambiente & Navegador
          </h3>

          <div className="bg-stone-950 border border-stone-800 rounded-2xl p-4 font-mono text-xs text-stone-300 space-y-2 overflow-x-auto">
            <div className="flex justify-between border-b border-stone-800/80 pb-1.5">
              <span className="text-stone-500">URL / Origem Atual:</span>
              <span className="text-stone-200">{window.location.origin}</span>
            </div>
            <div className="flex justify-between border-b border-stone-800/80 pb-1.5">
              <span className="text-stone-500">Caminho / Search / Hash:</span>
              <span className="text-amber-400">
                {window.location.pathname + window.location.search + window.location.hash || "/"}
              </span>
            </div>
            <div className="flex justify-between border-b border-stone-800/80 pb-1.5">
              <span className="text-stone-500">Vite Build Mode:</span>
              <span className="text-stone-200">
                {envMode} (DEV={String(isDev)}, PROD={String(isProd)})
              </span>
            </div>
            <div className="flex justify-between border-b border-stone-800/80 pb-1.5">
              <span className="text-stone-500">Sessão / Token JWT no Navegador:</span>
              <span className={storageStatus.hasToken ? "text-emerald-400" : "text-stone-500"}>
                {storageStatus.hasToken ? `Presente (${storageStatus.tokenPreview})` : "Ausente (Modo Anônimo / Catálogo Público)"}
              </span>
            </div>
            <div className="flex justify-between border-b border-stone-800/80 pb-1.5">
              <span className="text-stone-500">Tenant Ativo em Cache:</span>
              <span className="text-stone-200">{storageStatus.tenantId || "Padrão (org-lumina-01)"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-stone-500">Dimensões da Janela (Preview):</span>
              <span className="text-stone-200">
                {window.innerWidth} x {window.innerHeight} px
              </span>
            </div>
          </div>
        </div>

        {/* Error Details Banner if any */}
        {healthError && (
          <div className="bg-rose-950/40 border border-rose-800/50 rounded-2xl p-4 text-xs font-mono text-rose-300 space-y-1">
            <div className="flex items-center gap-2 font-bold text-rose-400">
              <AlertTriangle className="w-4 h-4" />
              <span>Falha identificada no diagnóstico:</span>
            </div>
            <p className="text-rose-200/90">{healthError}</p>
          </div>
        )}

        {/* Diagnostic Actions */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-stone-800">
          <div className="flex items-center gap-2">
            <button
              onClick={checkBackendHealth}
              disabled={isLoading}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-stone-950 font-bold text-xs transition-all shadow-md active:scale-95 cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />
              <span>Re-testar /api/health</span>
            </button>

            <button
              onClick={copyDiagnosticJson}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200 font-semibold text-xs transition-all active:scale-95 cursor-pointer"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? "Copiado!" : "Copiar Diagnóstico JSON"}</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleResetCache}
              className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-stone-900 border border-stone-700 hover:bg-stone-800 text-stone-300 font-medium text-xs transition-all active:scale-95 cursor-pointer"
            >
              <span>Limpar Cache & Recarregar</span>
            </button>

            {!fullscreen && (
              <button
                onClick={() => {
                  setIsOpen(false);
                  onClose?.();
                }}
                className="px-4 py-2.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-white font-medium text-xs transition-all active:scale-95 cursor-pointer"
              >
                Fechar
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default PreviewDiagnostic;
