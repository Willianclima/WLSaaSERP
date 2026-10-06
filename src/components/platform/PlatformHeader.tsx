import React from "react";
import {
  LogOut,
  KeyRound,
} from "lucide-react";
import { TenantStore, RBACUser, SystemUserRole } from "../../types";

export type ProductMode = "PLATFORM_OWNER" | "TENANT_STORE" | "STORE_CONSUMER";

interface PlatformHeaderProps {
  currentUser?: RBACUser | null;
  isAuthenticated?: boolean;
  currentMode?: ProductMode;
  selectedTenant?: TenantStore;
  tenants?: TenantStore[];
  onSwitchMode?: (mode: ProductMode) => void;
  onSelectTenant?: (tenant: TenantStore) => void;
  onOpenStorefrontPreview?: () => void;
  onSwitchRole?: (role: SystemUserRole) => void;
  onOpenAuthModal?: (defaultTab?: "STORE_LOGIN" | "ADMIN_LOGIN" | "REGISTER_TRIAL" | "EXPLANATION") => void;
  onLogout?: () => void;
}

export const PlatformHeader: React.FC<PlatformHeaderProps> = ({
  currentUser,
  isAuthenticated = false,
  onOpenAuthModal,
  onLogout,
}) => {
  const isSuperAdmin = Boolean(currentUser?.role === "SUPER_ADMIN");

  return (
    <header className="bg-stone-950 text-stone-200 border-b border-stone-800 sticky top-0 z-40 px-4 sm:px-6 py-2.5 shadow-md">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
        {/* Left: Apenas o logo 'A' de Aura */}
        <div className="flex items-center gap-2">
          <span
            className="w-8 h-8 rounded-xl bg-gradient-to-tr from-amber-500 to-amber-300 flex items-center justify-center font-serif font-black text-stone-950 text-sm shadow-sm select-none"
            title="AURA"
          >
            A
          </span>
        </div>

        {/* Right: Botão 'Entrar' (quando não autenticado) ou menu de usuário (quando autenticado) */}
        <div className="flex items-center gap-2">
          {isAuthenticated && currentUser ? (
            <div className="flex items-center gap-2">
              <div
                className="flex items-center gap-1.5 px-3 py-1.5 bg-stone-900 border border-stone-800 rounded-xl text-xs"
                title={`Conectado como ${currentUser.name} (${currentUser.email})`}
              >
                <span
                  className={`w-2 h-2 rounded-full ${
                    isSuperAdmin ? "bg-amber-400" : "bg-emerald-400"
                  }`}
                />
                <span className="font-bold text-white max-w-[140px] truncate">
                  {currentUser.name}
                </span>
                <span
                  className={`text-[9px] px-1.5 py-0.5 rounded font-mono font-bold uppercase ${
                    isSuperAdmin
                      ? "bg-amber-400/20 text-amber-300 border border-amber-400/40"
                      : "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                  }`}
                >
                  {isSuperAdmin ? "SuperAdmin" : currentUser.role}
                </span>
              </div>

              {onLogout && (
                <button
                  onClick={onLogout}
                  className="p-1.5 bg-stone-900 hover:bg-stone-800 text-stone-400 hover:text-rose-400 border border-stone-800 rounded-xl transition-colors cursor-pointer"
                  title="Encerrar sessão (Logout)"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          ) : (
            onOpenAuthModal && (
              <button
                onClick={() => onOpenAuthModal("STORE_LOGIN")}
                className="flex items-center gap-1.5 px-4 py-1.5 bg-amber-400 hover:bg-amber-300 text-stone-950 font-bold rounded-xl text-xs transition-all shadow-sm cursor-pointer"
                title="Entrar no sistema"
              >
                <KeyRound className="w-3.5 h-3.5 text-stone-950" />
                <span>Entrar</span>
              </button>
            )
          )}
        </div>
      </div>
    </header>
  );
};
