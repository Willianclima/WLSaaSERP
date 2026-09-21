import React from "react";
import { Loader2 } from "lucide-react";

interface GlobalLoadingOverlayProps {
  isLoading: boolean;
  message?: string;
  activeRequestsCount?: number;
}

/**
 * Overlay de carregamento global sutil e sofisticado integrado ao ciclo de vida
 * das chamadas HTTP do ApiClient. Não bloqueia desnecessariamente a tela quando
 * há micro-interações, mas exibe feedback visual claro de requisições ativas.
 */
export const GlobalLoadingOverlay: React.FC<GlobalLoadingOverlayProps> = ({
  isLoading,
  message = "Processando dados...",
  activeRequestsCount = 1,
}) => {
  if (!isLoading) return null;

  return (
    <div
      id="global-loading-overlay"
      aria-live="polite"
      aria-busy="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/30 backdrop-blur-[2px] transition-all duration-200"
    >
      <div
        id="global-loading-modal-card"
        className="relative mx-4 flex max-w-sm items-center gap-3.5 rounded-2xl border border-amber-500/20 bg-white/95 px-5 py-4 shadow-2xl backdrop-blur-md transition-all dark:border-amber-400/20 dark:bg-slate-900/95"
      >
        {/* Subtle decorative glow */}
        <div className="absolute -inset-0.5 -z-10 rounded-2xl bg-gradient-to-r from-amber-500/10 via-amber-400/15 to-amber-600/10 blur-sm" />

        <div className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600 dark:bg-amber-400/15 dark:text-amber-400">
          <Loader2 className="h-5 w-5 animate-spin" />
        </div>

        <div className="flex flex-col">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold tracking-tight text-slate-800 dark:text-slate-100">
              Aura Semijoias
            </span>
            {activeRequestsCount > 1 && (
              <span className="rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold text-amber-800 dark:bg-amber-900/50 dark:text-amber-300">
                {activeRequestsCount} req
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {message}
          </p>
        </div>
      </div>
    </div>
  );
};
