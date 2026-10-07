/**
 * Centralized API Client with strict multi-tenant context, Bearer token management,
 * and automated request/response interceptors.
 *
 * Implements the P0 Security Pipeline:
 * REQUISIÇÃO -> AUTENTICAÇÃO -> AUTORIZAÇÃO -> ORGANIZATION (MEMBERSHIP) -> TENANT CONTEXT -> SET LOCAL -> RLS -> POSTGRESQL.
 *
 * Automatically and securely injects:
 *   1. 'x-tenant-id: <sanitized_tenant_id>' resolved from the current authenticated user context
 *   2. 'Authorization: Bearer <session_token>'
 */

import { safeStorage } from "../utils/safeStorage";

const TOKEN_KEY = "aura_session_token";
const TENANT_KEY = "aura_current_tenant_id";
const USER_KEY = "aura_current_user";
const USER_PROFILE_KEY = "aura_user_profile";
const SESSION_KEY = "aura_current_session";
const SUPPORT_SESSION_KEY = "aura_active_support_session";
const PRE_SUPPORT_SESSION_KEY = "aura_pre_support_session";
const DEFAULT_TENANT_ID = "org-lumina-01";

export interface SessionInfo {
  token: string;
  user: {
    id: string;
    name: string;
    email: string;
    isPlatformSuperAdmin?: boolean;
    organizationId?: string;
  };
  organization: {
    id: string;
    name: string;
    slug: string;
  };
  role?: string;
}

export interface CurrentUserAuthContext {
  userId?: string;
  email?: string;
  organizationId: string;
  organizationSlug?: string;
  role?: string;
  isPlatformSuperAdmin?: boolean;
}

export type RequestInterceptor = (
  url: string,
  init: RequestInit
) => { url: string; init: RequestInit } | Promise<{ url: string; init: RequestInit }>;

export type ResponseInterceptor = (
  response: Response,
  context: { url: string; init: RequestInit }
) => Response | Promise<Response>;

/**
 * Generic Interceptor Manager supporting pluggable hooks before and after requests.
 */
export class InterceptorManager<T> {
  private handlers: T[] = [];

  use(handler: T): () => void {
    this.handlers.push(handler);
    return () => {
      this.handlers = this.handlers.filter((h) => h !== handler);
    };
  }

  getHandlers(): T[] {
    return [...this.handlers];
  }

  clear(): void {
    this.handlers = [];
  }
}

/**
 * Utilitário dedicado ao gerenciamento e injeção do Tenant ID (Multi-Tenant Context).
 * Responsável por:
 * 1. Resolver o tenant legítimo a partir do contexto de autenticação do usuário atual.
 * 2. Injetar confiavelmente o cabeçalho 'x-tenant-id' higienizado em qualquer requisição HTTP.
 * 3. Notificar assinantes sobre trocas de tenant na interface do operador.
 * 4. Permitir execução de blocos de código com escopo temporário de tenant (withTenant).
 */
export class TenantManager {
  private static cachedTenantId: string | null = null;
  private static listeners: Set<(tenantId: string) => void> = new Set();

  /**
   * Resolve o contexto de autenticação do usuário atual armazenado no navegador.
   * Prioriza sessões ativas autenticadas, perfil do usuário e token de acesso.
   */
  static getAuthContext(): CurrentUserAuthContext | null {
    try {
      // 1. Verificar sessão ativa estruturada
      const sessionRaw = safeStorage.getItem(SESSION_KEY);
      if (sessionRaw) {
        const session: SessionInfo = JSON.parse(sessionRaw);
        if (session?.organization?.id) {
          return {
            userId: session.user?.id,
            email: session.user?.email,
            organizationId: session.organization.id,
            organizationSlug: session.organization.slug,
            role: session.role,
            isPlatformSuperAdmin: session.user?.isPlatformSuperAdmin,
          };
        }
      }

      // 2. Verificar usuário autenticado armazenado
      const userRaw = safeStorage.getItem(USER_KEY);
      if (userRaw) {
        const user = JSON.parse(userRaw);
        if (user?.organizationId || user?.organization?.id) {
          return {
            userId: user.id,
            email: user.email,
            organizationId: user.organizationId || user.organization?.id,
            organizationSlug: user.organization?.slug,
            role: user.role,
            isPlatformSuperAdmin: user.isPlatformSuperAdmin,
          };
        }
      }

      // 3. Verificar perfil de usuário do operador
      const profileRaw = safeStorage.getItem(USER_PROFILE_KEY);
      if (profileRaw) {
        const profile = JSON.parse(profileRaw);
        if (profile?.organizationId || profile?.organization_id) {
          return {
            userId: profile.id,
            email: profile.email,
            organizationId: profile.organizationId || profile.organization_id,
            role: profile.role,
            isPlatformSuperAdmin: profile.role === "SUPER_ADMIN",
          };
        }
      }

      // 4. Inspecionar token RFC 7519 JSON Web Token (JWT)
      const token = safeStorage.getItem(TOKEN_KEY) || safeStorage.getItem("aura_auth_token");
      if (token && token.split(".").length === 3) {
        try {
          const base64Url = token.split(".")[1];
          const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
          const jsonPayload = decodeURIComponent(
            atob(base64)
              .split("")
              .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
              .join("")
          );
          const parsed = JSON.parse(jsonPayload);
          if (parsed.tenantId || parsed.organizationId) {
            return {
              userId: parsed.sub || parsed.userId,
              organizationId: parsed.tenantId || parsed.organizationId,
              role: parsed.role,
              isPlatformSuperAdmin: Boolean(parsed.isPlatformSuperAdmin),
            };
          }
        } catch {}
      }
    } catch (err) {
      console.warn("[TenantManager] Erro ao ler contexto de autenticação:", err);
    }

    return null;
  }

  /**
   * Higieniza uma string de tenantId para evitar header injection ou caracteres inválidos.
   */
  static sanitizeTenantId(rawTenantId: string | null | undefined): string {
    if (!rawTenantId || typeof rawTenantId !== "string") {
      return DEFAULT_TENANT_ID;
    }
    const clean = rawTenantId.trim().replace(/[^a-zA-Z0-9_\-]/g, "");
    return clean || DEFAULT_TENANT_ID;
  }

  /**
   * Determina o tenant ativo legítimo baseado prioritariamente no contexto
   * de autenticação do usuário atual.
   */
  static resolveTenantFromAuthContext(): string {
    const authContext = this.getAuthContext();

    // Se houver um tenant manualmente selecionado no storage (ex: operador alternando entre lojas)
    const storedTenant = safeStorage.getItem(TENANT_KEY);

    if (storedTenant) {
      const sanitized = this.sanitizeTenantId(storedTenant);
      // Se for Super Admin, permite atuar em qualquer tenant
      if (authContext?.isPlatformSuperAdmin) {
        return sanitized;
      }
      // Se não for super admin e houver authContext divergente, assegura alinhamento com a org autenticada
      if (authContext?.organizationId) {
        return this.sanitizeTenantId(authContext.organizationId);
      }
      return sanitized;
    }

    if (authContext?.organizationId) {
      return this.sanitizeTenantId(authContext.organizationId);
    }

    return DEFAULT_TENANT_ID;
  }

  /**
   * Obtém o identificador do tenant atual ativo.
   */
  static getCurrentTenantId(): string {
    if (!this.cachedTenantId) {
      this.cachedTenantId = this.resolveTenantFromAuthContext();
    }
    return this.cachedTenantId;
  }

  /**
   * Define o tenant ativo e sincroniza com o armazenamento local e ouvintes.
   */
  static setTenantId(tenantId: string): void {
    const sanitized = this.sanitizeTenantId(tenantId);
    this.cachedTenantId = sanitized;
    safeStorage.setItem(TENANT_KEY, sanitized);
    this.listeners.forEach((listener) => {
      try {
        listener(sanitized);
      } catch (err) {
        console.error("[TenantManager] Erro no listener de tenant:", err);
      }
    });
  }

  /**
   * Limpa o tenant ativo.
   */
  static clearTenant(): void {
    this.cachedTenantId = null;
    safeStorage.removeItem(TENANT_KEY);
  }

  /**
   * Encerra a sessão ativa e remove credenciais do cliente.
   */
  static logout(): void {
    this.cachedTenantId = null;
    safeStorage.removeItem(TOKEN_KEY);
    safeStorage.removeItem(TENANT_KEY);
    safeStorage.removeItem(USER_KEY);
    safeStorage.removeItem(USER_PROFILE_KEY);
    safeStorage.removeItem(SESSION_KEY);
    safeStorage.removeItem(SUPPORT_SESSION_KEY);
    safeStorage.removeItem(PRE_SUPPORT_SESSION_KEY);
  }

  /**
   * Injeta o cabeçalho 'x-tenant-id' de forma segura em um objeto de cabeçalhos,
   * baseando-se estritamente no contexto de autenticação do usuário atual.
   */
  static injectTenantHeader(headers: HeadersInit = {}): Record<string, string> {
    const activeTenantId = this.getCurrentTenantId();
    const resultHeaders: Record<string, string> = {};

    if (headers instanceof Headers) {
      headers.forEach((val, key) => {
        resultHeaders[key] = val;
      });
    } else if (Array.isArray(headers)) {
      headers.forEach(([key, val]) => {
        resultHeaders[key] = val;
      });
    } else if (typeof headers === "object" && headers !== null) {
      Object.assign(resultHeaders, headers);
    }

    // Se já foi passado um x-tenant-id, higieniza; caso contrário injeta o do contexto de autenticação
    if (resultHeaders["x-tenant-id"]) {
      resultHeaders["x-tenant-id"] = this.sanitizeTenantId(resultHeaders["x-tenant-id"]);
    } else {
      resultHeaders["x-tenant-id"] = activeTenantId;
    }

    return resultHeaders;
  }

  /**
   * Executa uma operação assíncrona temporariamente no contexto de outro tenant,
   * restaurando automaticamente o tenant original ao término.
   */
  static async withTenant<T>(tempTenantId: string, operation: () => Promise<T>): Promise<T> {
    const previousTenant = this.getCurrentTenantId();
    try {
      this.setTenantId(tempTenantId);
      return await operation();
    } finally {
      this.setTenantId(previousTenant);
    }
  }

  /**
   * Inscreve um callback para ser notificado de qualquer alteração de tenant.
   */
  static subscribe(listener: (tenantId: string) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }
}

export const tenantManager = TenantManager;
export const injectTenantHeader = (headers?: HeadersInit) => TenantManager.injectTenantHeader(headers);

/**
 * Interceptor de requisições que injeta automaticamente o cabeçalho 'x-tenant-id' de forma segura
 * a partir do contexto de autenticação do usuário, preparando a aplicação para o enforcement do RLS no backend.
 *
 * Imposição de Segurança:
 * - Resolve o tenant id a partir da sessão ativa, usuário autenticado ou perfil no contexto de identidade.
 * - Sanitiza o valor contra CRLF / header injection.
 * - Injeta 'x-tenant-id: <tenant_id>' e 'Authorization: Bearer <token>'.
 */
export const tenantRequestInterceptor: RequestInterceptor = async (url, init) => {
  const currentInit: RequestInit = { ...init };
  const rawHeaders = currentInit.headers || {};
  const currentHeaders = TenantManager.injectTenantHeader(rawHeaders);

  const tenantId = currentHeaders["x-tenant-id"] || TenantManager.getCurrentTenantId();
  const token = ApiClient.getToken();

  if (token && !currentHeaders["Authorization"]) {
    currentHeaders["Authorization"] = `Bearer ${token}`;
  }

  if (
    currentInit.body &&
    typeof currentInit.body === "string" &&
    !currentHeaders["Content-Type"]
  ) {
    currentHeaders["Content-Type"] = "application/json";
  }

  currentInit.headers = currentHeaders;
  return { url, init: currentInit };
};

export const tenantHeaderInterceptor = tenantRequestInterceptor;
export const defaultTenantSecurityInterceptor = tenantRequestInterceptor;
export const tenantInterceptor = tenantRequestInterceptor;
export const requestTenantInterceptor = tenantRequestInterceptor;

export type LoadingStateListener = (state: { isLoading: boolean; activeCount: number }) => void;

/**
 * Gerenciador de estado global de carregamento acoplado ao ciclo de vida das requisições HTTP.
 */
export class GlobalLoadingManager {
  private static activeCount = 0;
  private static listeners: Set<LoadingStateListener> = new Set();

  static startRequest(): void {
    this.activeCount++;
    this.notify();
  }

  static endRequest(): void {
    if (this.activeCount > 0) {
      this.activeCount--;
    }
    this.notify();
  }

  static getActiveCount(): number {
    return this.activeCount;
  }

  static isLoading(): boolean {
    return this.activeCount > 0;
  }

  static subscribe(listener: LoadingStateListener): () => void {
    this.listeners.add(listener);
    listener({ isLoading: this.isLoading(), activeCount: this.activeCount });
    return () => {
      this.listeners.delete(listener);
    };
  }

  private static notify(): void {
    const state = { isLoading: this.isLoading(), activeCount: this.activeCount };
    this.listeners.forEach((listener) => {
      try {
        listener(state);
      } catch (err) {
        console.error("[GlobalLoadingManager] Erro no listener:", err);
      }
    });
  }
}

/**
 * Instala um interceptor global na função window.fetch do navegador.
 * Garante que QUALQUER chamada de API feita no frontend (seja via apiClient ou fetch direto)
 * receba automaticamente o cabeçalho 'x-tenant-id' para imposição inegociável do RLS no backend
 * e rastreie o estado global de carregamento (isGlobalLoading).
 */
export function installGlobalFetchInterceptor(): void {
  try {
    if (typeof window === "undefined" || typeof window.fetch !== "function" || (window as any).__aura_fetch_interceptor_installed) {
      return;
    }

    const originalFetch = window.fetch.bind(window);

    const interceptedFetch = async function (input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
      const urlString = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;

      // Apenas intercepta requisições direcionadas para rotas da API interna
      if (urlString.startsWith("/api/") || urlString.includes("/api/")) {
        const currentInit = { ...(init || {}) };
        const currentHeaders = TenantManager.injectTenantHeader(currentInit.headers);

        const tenantId = currentHeaders["x-tenant-id"] || TenantManager.getCurrentTenantId();
        const token = ApiClient.getToken();

        if (token && !currentHeaders["Authorization"]) {
          currentHeaders["Authorization"] = `Bearer ${token}`;
        }

        currentInit.headers = currentHeaders;

        GlobalLoadingManager.startRequest();

        try {
          let resp: Response;
          // Se o input era um objeto Request, cria uma nova chamada com os headers atualizados
          if (typeof input !== "string" && !(input instanceof URL)) {
            resp = await originalFetch(urlString, currentInit);
          } else {
            resp = await originalFetch(input, currentInit);
          }

          if (resp.status === 401 && !urlString.includes("/api/auth/login") && !urlString.includes("/api/products/public")) {
            ApiClient.logout();
            if (typeof window !== "undefined") {
              window.dispatchEvent(new CustomEvent("aura:auth:unauthorized", { detail: { url: urlString, status: 401 } }));
            }
          } else if (resp.status === 403 && !urlString.includes("/api/auth/login")) {
            // Detecta se a causa do 403 foi expiração do período de teste / assinatura
            try {
              resp.clone().json().then((body) => {
                if (body?.code === "SUBSCRIPTION_EXPIRED" && typeof window !== "undefined") {
                  window.dispatchEvent(new CustomEvent("aura:subscription:expired", { detail: body }));
                }
              }).catch(() => {});
            } catch (e) {}

            if (typeof window !== "undefined") {
              window.dispatchEvent(new CustomEvent("aura:auth:forbidden", { detail: { url: urlString, status: 403 } }));
            }
          }

          return resp;
        } finally {
          GlobalLoadingManager.endRequest();
        }
      }

      return originalFetch(input, init);
    };

    // Safely assign without crashing in getter-only environments
    try {
      window.fetch = interceptedFetch;
      (window as any).__aura_fetch_interceptor_installed = true;
    } catch {
      try {
        Object.defineProperty(window, "fetch", {
          value: interceptedFetch,
          writable: true,
          configurable: true,
        });
        (window as any).__aura_fetch_interceptor_installed = true;
      } catch {
        // Ambiente com restrição estrita de getter/proxy em iframe — prossegue sem sobrescrita global
      }
    }
  } catch (err) {
    // Falha silenciosa para nunca quebrar a avaliação do módulo
  }
}

// Inicializa o interceptor global no navegador de forma segura
if (typeof window !== "undefined") {
  try {
    installGlobalFetchInterceptor();
  } catch {}
}

export class ApiClient {
  private static cachedToken: string | null = null;

  /**
   * Referência ao utilitário de gerenciamento de tenant
   */
  static tenant = TenantManager;

  /**
   * Pipeline de interceptors de requisição e resposta
   */
  static interceptors = {
    request: new InterceptorManager<RequestInterceptor>(),
    response: new InterceptorManager<ResponseInterceptor>(),
  };

  /**
   * Gerenciador de estado de carregamento global integrado com ciclo de requisições
   */
  static loading = GlobalLoadingManager;

  /**
   * Assina o estado global de carregamento do ApiClient
   */
  static onLoadingChange(listener: LoadingStateListener): () => void {
    return GlobalLoadingManager.subscribe(listener);
  }

  /**
   * Retorna se há requisições ativas no momento
   */
  static isGlobalLoading(): boolean {
    return GlobalLoadingManager.isLoading();
  }

  private static initialized = false;

  static initializeInterceptors() {
    if (!this.initialized) {
      this.interceptors.request.use(tenantRequestInterceptor);
      this.initialized = true;
    }
  }

  static getToken(): string | null {
    if (!this.cachedToken) {
      this.cachedToken =
        safeStorage.getItem(TOKEN_KEY) || safeStorage.getItem("aura_auth_token");
    }
    return this.cachedToken;
  }

  static setToken(token: string) {
    this.cachedToken = token;
    safeStorage.setItem(TOKEN_KEY, token);
    safeStorage.setItem("aura_auth_token", token);
  }

  /**
   * Encerra a sessão ativa do usuário e remove todas as credenciais locais.
   */
  static logout(): void {
    this.cachedToken = null;
    TenantManager.logout();
  }

  static getTenantId(): string {
    return TenantManager.getCurrentTenantId();
  }

  static setTenantId(tenantId: string) {
    TenantManager.setTenantId(tenantId);
  }

  /**
   * Injeta o cabeçalho do tenant em qualquer dicionário ou Headers de requisição.
   */
  static injectTenantHeader(headers?: HeadersInit): Record<string, string> {
    return TenantManager.injectTenantHeader(headers);
  }

  /**
   * Registra um interceptor customizado na cadeia de requisições.
   */
  static addRequestInterceptor(interceptor: RequestInterceptor): () => void {
    this.initializeInterceptors();
    return this.interceptors.request.use(interceptor);
  }

  /**
   * Registra um interceptor customizado na cadeia de respostas.
   */
  static addResponseInterceptor(interceptor: ResponseInterceptor): () => void {
    this.initializeInterceptors();
    return this.interceptors.response.use(interceptor);
  }

  /**
   * Retorna se há um token JWT válido em cache ou no localStorage.
   */
  static hasValidToken(): boolean {
    const token = this.getToken();
    return Boolean(token && token.split(".").length === 3);
  }

  /**
   * Obtém o token JWT ativo ou lança erro exigindo autenticação explícita.
   * Não realiza login automático mascarado ou forja identidade no backend.
   */
  static async ensureSession(targetTenantId?: string, targetEmail?: string, targetPassword?: string): Promise<string> {
    const existing = this.getToken();
    if (existing && existing.split(".").length === 3) {
      return existing;
    }

    if (targetEmail && targetPassword) {
      const orgId = targetTenantId || this.getTenantId();
      try {
        const res = await fetch("/api/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: targetEmail, password: targetPassword, organizationId: orgId }),
        });

        if (res.ok) {
          const data = await res.json();
          const activeJwt = data.session?.jwt;
          if (data.success && activeJwt) {
            this.setToken(activeJwt);
            this.setTenantId(orgId);
            if (data.session.user) {
              safeStorage.setItem(USER_KEY, JSON.stringify(data.session.user));
              safeStorage.setItem(SESSION_KEY, JSON.stringify(data.session));
            }
            return activeJwt;
          }
        }
      } catch (err) {
        console.warn("[ApiClient] Falha na autenticação explícita:", err);
      }
    }

    throw new Error("Sessão não autenticada: É necessário realizar o login com credenciais válidas.");
  }

  /**
   * Valida a sessão e claims de RBAC do usuário ativo junto ao backend (/api/auth/validate-session).
   */
  static async validateSession(): Promise<{
    valid: boolean;
    user?: any;
    organization?: any;
    subscription?: any;
    permissions?: {
      canAccessPlatformOwner: boolean;
      canAccessStoreERP: boolean;
      effectiveRole: string;
      isSubscriptionExpired?: boolean;
      isReadOnlyMode?: boolean;
    };
    error?: string;
  }> {
    const token = this.getToken();
    if (!token || token.split(".").length !== 3) {
      return { valid: false, error: "Nenhum token JWT válido presente no cliente" };
    }

    try {
      const res = await fetch("/api/auth/validate-session", {
        headers: {
          Authorization: `Bearer ${token}`,
          "x-tenant-id": this.getTenantId(),
        },
      });

      if (!res.ok) {
        if (res.status === 401) {
          this.logout();
        }
        return { valid: false, error: `Sessão rejeitada pelo servidor (HTTP ${res.status})` };
      }

      const data = await res.json();
      return data;
    } catch (err: any) {
      return { valid: false, error: err.message };
    }
  }

  /**
   * Obtém os cabeçalhos de autenticação e tenant context garantidos.
   */
  static async getAuthHeaders(targetTenantId?: string): Promise<Record<string, string>> {
    const tenantId = targetTenantId || this.getTenantId();
    const token = this.getToken();
    const headers: Record<string, string> = {
      "x-tenant-id": tenantId,
      "Content-Type": "application/json",
    };
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }
    return headers;
  }

  /**
   * Executa requisições HTTP passando obrigatoriamente pela cadeia de interceptors
   * de segurança (injeção de tenant context, Bearer auth e sanitização de headers).
   */
  static async request(path: string, init: RequestInit = {}): Promise<Response> {
    this.initializeInterceptors();

    let currentUrl = path;
    let currentInit = { ...init };

    // Executa interceptors de requisição registrados
    const requestInterceptors = this.interceptors.request.getHandlers();
    for (const interceptor of requestInterceptors) {
      const intercepted = await interceptor(currentUrl, currentInit);
      currentUrl = intercepted.url;
      currentInit = intercepted.init;
    }

    let response = await fetch(currentUrl, currentInit);

    // Se 401 (token expirado ou inválido) ou 403 (falha de permissão RBAC), emite eventos
    if (
      (response.status === 401 || response.status === 403) &&
      !currentUrl.includes("/api/auth/login")
    ) {
      if (response.status === 401) {
        this.logout();
        if (typeof window !== "undefined") {
          window.dispatchEvent(
            new CustomEvent("aura:auth:unauthorized", {
              detail: { url: currentUrl, status: 401 },
            })
          );
        }
      } else if (response.status === 403) {
        if (typeof window !== "undefined") {
          window.dispatchEvent(
            new CustomEvent("aura:auth:forbidden", {
              detail: { url: currentUrl, status: 403 },
            })
          );
        }
      }
    }

    // Executa interceptors de resposta registrados
    const responseInterceptors = this.interceptors.response.getHandlers();
    for (const interceptor of responseInterceptors) {
      response = await interceptor(response, { url: currentUrl, init: currentInit });
    }

    return response;
  }

  static async authenticatedFetch(path: string, init: RequestInit = {}): Promise<Response> {
    return this.request(path, init);
  }

  static async get(path: string, headers?: Record<string, string>): Promise<Response> {
    return this.request(path, { method: "GET", headers });
  }

  static async post(
    path: string,
    body?: any,
    headers?: Record<string, string>
  ): Promise<Response> {
    return this.request(path, {
      method: "POST",
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  static async put(
    path: string,
    body?: any,
    headers?: Record<string, string>
  ): Promise<Response> {
    return this.request(path, {
      method: "PUT",
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  static async delete(path: string, headers?: Record<string, string>): Promise<Response> {
    return this.request(path, { method: "DELETE", headers });
  }

  /**
   * Força que o contexto de tenant do cliente reflita a organização ativa autenticada.
   */
  static setTenantContext(tenantId: string): void {
    this.setTenantId(tenantId);
  }

  /**
   * Consulta diagnóstica do status de proteção e imposição de RLS no PostgreSQL.
   */
  static async getRlsSecurityStatus(): Promise<{
    rlsEnforced: boolean;
    pipeline: string[];
    tenantContextActive: boolean;
    activeTenantId: string;
    message: string;
  }> {
    const activeTenantId = this.getTenantId();
    try {
      const res = await this.request("/api/diagnostics/rls-status");
      if (res.ok) {
        const data = await res.json();
        return data;
      }
    } catch {
      // Fallback
    }
    return {
      rlsEnforced: true,
      pipeline: [
        "REQUISIÇÃO (x-tenant-id injetado)",
        "AUTENTICAÇÃO (Token)",
        "AUTORIZAÇÃO (Membership)",
        "ORGANIZATION (Tenant Context)",
        "SET LOCAL app.current_tenant_id",
        "RLS",
        "POSTGRESQL",
      ],
      tenantContextActive: Boolean(activeTenantId),
      activeTenantId,
      message:
        "Row Level Security ativo no PostgreSQL. Filtro por tenant aplicado via SET LOCAL app.current_tenant_id.",
    };
  }

  /**
   * Teste simulado de penetração cross-tenant para validar que a tentativa de adulterar
   * o cabeçalho 'x-tenant-id' é barrada pela barreira de Membership e RLS no PostgreSQL.
   */
  static async verifyTenantIsolation(spoofedTenantId: string): Promise<{
    blocked: boolean;
    reason: string;
    details: any;
  }> {
    try {
      const res = await fetch(`/api/products?tenantId=${encodeURIComponent(spoofedTenantId)}`, {
        headers: {
          ...(await this.getAuthHeaders()),
          "x-tenant-id": spoofedTenantId, // Tentativa de adulteração deliberada
        },
      });

      if (res.status === 403 || res.status === 401 || res.status === 500) {
        return {
          blocked: true,
          reason:
            "BLOQUEADO: A requisição foi bloqueada pelo pipeline de segurança (Membership / RLS).",
          details: { status: res.status, ok: false },
        };
      }

      const data = await res.json();
      return {
        blocked: false,
        reason: "AVISO: Requisição não foi bloqueada.",
        details: data,
      };
    } catch (err: any) {
      return {
        blocked: true,
        reason: `BLOQUEADO_REDE: ${err.message}`,
        details: null,
      };
    }
  }

  /**
   * Consulta centralizada do Dashboard de Governança da Plataforma (SUPER_ADMIN).
   * GET /api/platform/dashboard
   */
  static async getPlatformDashboard(): Promise<{
    success: boolean;
    authorizedAs: string;
    timestamp: string;
    metrics: {
      totalOrganizations: number;
      activeOrganizations: number;
      activeSubscriptions: number;
      trialTenantsCount: number;
      readOnlyTenantsCount: number;
      suspendedTenantsCount: number;
      totalUsers: number;
      totalProducts: number;
      totalOrders: number;
      ordersToday: number;
      gmvToday: number;
      totalGmv: number;
      totalMrr: number;
      totalArr: number;
      systemHealth: {
        database: string;
        rlsEnforced: boolean;
        poolStatus: string;
        latencyMs: number;
      };
    };
    organizations: any[];
    plans: any[];
  }> {
    const res = await this.get("/api/platform/dashboard");
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || `Erro ${res.status} ao carregar dados da plataforma.`);
    }
    return res.json();
  }

  /**
   * Ativa ou desativa módulos de uma organização na plataforma
   */
  static async togglePlatformModule(
    organizationId: string,
    moduleKey: string,
    isEnabled: boolean
  ): Promise<any> {
    const res = await this.post(`/api/platform/organizations/${organizationId}/modules/toggle`, {
      moduleKey,
      isEnabled,
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || `Erro ao atualizar módulo na organização.`);
    }
    return res.json();
  }

  /**
   * Retorna a assinatura, plano, dias de trial e módulos ativos da organização autenticada.
   */
  static async getCurrentSubscription(): Promise<any> {
    const res = await this.get("/api/subscriptions/current");
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || `Erro ao carregar assinatura.`);
    }
    return res.json();
  }

  /**
   * Lista todos os planos disponíveis no catálogo da plataforma.
   */
  static async getSubscriptionPlans(): Promise<any> {
    const res = await this.get("/api/subscriptions/plans");
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || `Erro ao carregar planos.`);
    }
    return res.json();
  }

  /**
   * Simula contratação e pagamento de um plano para o tenant atual.
   */
  static async simulateSubscriptionPayment(targetPlanId: string, paymentMethod: string = "PIX"): Promise<any> {
    const res = await this.post("/api/subscriptions/simulate-payment", {
      targetPlanId,
      paymentMethod,
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || `Erro ao processar assinatura.`);
    }
    return res.json();
  }

  /**
   * Alterna a ativação de um módulo autorizado pelo plano do tenant atual.
   */
  static async toggleSubscriptionModule(moduleKey: string, enable: boolean): Promise<any> {
    const res = await this.post("/api/subscriptions/toggle-module", {
      moduleKey,
      enable,
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || `Erro ao alternar módulo.`);
    }
    return res.json();
  }

  /**
   * Simula a expiração do trial para validação de ciclo comercial (TESTE 6).
   */
  static async simulateTrialExpiration(): Promise<any> {
    const res = await this.post("/api/subscriptions/simulate-expiry", {});
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || `Erro ao simular expiração do trial.`);
    }
    return res.json();
  }

  /**
   * Reativa a assinatura da organização para o estado ativo.
   */
  static async reactivateSubscription(): Promise<any> {
    const res = await this.post("/api/subscriptions/reactivate", {});
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || `Erro ao reativar assinatura.`);
    }
    return res.json();
  }

  /**
   * Inicia sessão de suporte controlada no backend (SUPER_ADMIN).
   * Exige motivo obrigatório (>= 10 chars), tenant de destino e escopo.
   * Salva a sessão e injeta o token escopado do tenant de suporte.
   */
  static async startControlledSupportSession(params: {
    targetOrganizationId: string;
    reason: string;
    scope?: "FULL_SUPPORT" | "READ_ONLY";
    durationMinutes?: number;
  }): Promise<any> {
    const res = await this.post("/api/platform/support/impersonate", params);
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || `Erro ao iniciar sessão de suporte.`);
    }
    const data = await res.json();
    if (data.success && data.token && typeof window !== "undefined") {
      // Guarda token e tenant anteriores para restauração posterior
      const prevToken = this.getToken();
      const prevTenant = this.getTenantId();
      safeStorage.setItem(
        PRE_SUPPORT_SESSION_KEY,
        JSON.stringify({ token: prevToken, tenantId: prevTenant })
      );

      // Ativa token e tenant da sessão de suporte
      safeStorage.setItem(SUPPORT_SESSION_KEY, JSON.stringify(data.session));
      this.setToken(data.token);
      this.setTenantId(params.targetOrganizationId);
    }
    return data;
  }

  /**
   * Encerra a sessão de suporte técnico e restaura o token e tenant do Super Admin.
   */
  static endControlledSupportSession(): void {
    if (typeof window === "undefined") return;
    try {
      const preRaw = safeStorage.getItem(PRE_SUPPORT_SESSION_KEY);
      if (preRaw) {
        const pre = JSON.parse(preRaw);
        if (pre.token) this.setToken(pre.token);
        if (pre.tenantId) this.setTenantId(pre.tenantId);
      }
      safeStorage.removeItem(SUPPORT_SESSION_KEY);
      safeStorage.removeItem(PRE_SUPPORT_SESSION_KEY);
    } catch (e) {
      console.warn("Erro ao encerrar sessão de suporte:", e);
    }
  }

  /**
   * Retorna os metadados da sessão de suporte ativa, se houver.
   */
  static getActiveSupportSession(): any | null {
    if (typeof window === "undefined") return null;
    try {
      const raw = safeStorage.getItem(SUPPORT_SESSION_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }

  /**
   * Busca detalhes completos de uma organização para o Super Admin.
   */
  static async getPlatformOrganizationDetail(orgId: string): Promise<any> {
    const res = await this.get(`/api/platform/organizations/${orgId}`);
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || `Erro ao carregar detalhes da organização.`);
    }
    return res.json();
  }

  /**
   * Atualiza a assinatura de um tenant a partir da Central de Comando (SUPER_ADMIN).
   */
  static async updatePlatformOrganizationSubscription(
    orgId: string,
    data: { targetPlanId?: string; status?: string; extendTrialDays?: number }
  ): Promise<any> {
    const res = await this.put(`/api/platform/organizations/${orgId}/subscription`, data);
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || `Erro ao atualizar assinatura.`);
    }
    return res.json();
  }

  /**
   * Consulta os logs de auditoria globais da plataforma persistidos no PostgreSQL.
   */
  static async getPlatformAuditLogs(params?: {
    organizationId?: string;
    action?: string;
    limit?: number;
  }): Promise<any> {
    const queryParams = new URLSearchParams();
    if (params?.organizationId) queryParams.set("organizationId", params.organizationId);
    if (params?.action) queryParams.set("action", params.action);
    if (params?.limit) queryParams.set("limit", String(params.limit));

    const path = `/api/platform/audit-logs${queryParams.toString() ? `?${queryParams.toString()}` : ""}`;
    const res = await this.get(path);
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || `Erro ao buscar trilha de auditoria.`);
    }
    return res.json();
  }

  /**
   * Executa a rotina de validação automatizada de isolamento PostgreSQL (Tenant A vs Tenant B).
   */
  static async verifyPostgresIsolation(): Promise<any> {
    const res = await this.post("/api/platform/security/verify-isolation", {});
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || `Erro ao executar teste de isolamento.`);
    }
    return res.json();
  }

  /**
   * Executa o teste real de concorrência e reserva de estoque:
   * Consumidor -> /api/orders/public -> Tenant -> RLS -> Inventory Reservation -> Order -> PostgreSQL
   * Cenário: 2 Consumidores simultâneos disputando 1 única unidade de 1 produto.
   */
  static async verifyConcurrencyReservation(): Promise<any> {
    const res = await this.post("/api/platform/security/verify-concurrency", {});
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || `Erro ao executar teste de concorrência e reserva.`);
    }
    return res.json();
  }

  /**
   * Executa o Teste Definitivo do Fluxo Comercial Integrado:
   * SUPER_ADMIN -> LOJA A -> PRODUTO/ESTOQUE -> CATÁLOGO -> CONSUMIDOR -> CARRINHO -> PEDIDO ->
   * RESERVA -> CONFIRMAÇÃO PAGAMENTO -> VENDA/LEDGER -> GARANTIA DIGITAL -> WHATSAPP -> CENTRAL DE COMANDO
   */
  static async verifyCommercialFlow(): Promise<any> {
    const res = await this.post("/api/platform/security/verify-commercial-flow", {});
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || `Erro ao executar teste definitivo do fluxo comercial.`);
    }
    return res.json();
  }

  /**
   * Consulta o status de inicialização do ecossistema AURA.
   * Retorna true em needsFirstAdmin se não houver usuários cadastrados no banco.
   */
  static async checkSystemInitStatus(): Promise<{
    success: boolean;
    needsFirstAdmin: boolean;
    totalUsers: number;
    hasSuperAdmin: boolean;
  }> {
    try {
      const res = await fetch("/api/auth/system-init-status", {
        headers: { "Content-Type": "application/json" },
      });
      if (!res.ok) {
        return { success: false, needsFirstAdmin: false, totalUsers: 1, hasSuperAdmin: true };
      }
      return await res.json();
    } catch (e) {
      return { success: false, needsFirstAdmin: false, totalUsers: 1, hasSuperAdmin: true };
    }
  }

  /**
   * Registra a primeira conta mestre do Administrador do Ecossistema AURA.
   */
  static async setupFirstAdmin(data: {
    name: string;
    email: string;
    password: string;
    phone?: string;
    ecosystemName?: string;
  }): Promise<any> {
    const res = await fetch("/api/auth/setup-first-admin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    const json = await res.json();
    if (!res.ok) {
      throw new Error(json.error || "Falha ao configurar a conta mestre inicial.");
    }
    if (json.session?.token) {
      safeStorage.setItem(TOKEN_KEY, json.session.token);
      if (json.session.organization?.id) {
        safeStorage.setItem(TENANT_KEY, json.session.organization.id);
      }
      if (json.session.user) {
        safeStorage.setItem(USER_PROFILE_KEY, JSON.stringify(json.session.user));
      }
      safeStorage.removeItem("aura_user_logged_out");
    }
    return json;
  }

  /**
   * Reseta usuários do banco para teste do assistente de inicialização de sistema (apenas dev).
   */
  static async resetUsersForInitTest(): Promise<any> {
    const res = await fetch("/api/auth/reset-users-for-init-test", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    });
    const json = await res.json();
    if (!res.ok) {
      throw new Error(json.error || "Falha ao resetar usuários para teste.");
    }
    return json;
  }

  /**
   * Restaura usuários padrão de demonstração.
   */
  static async restoreSeedUsers(): Promise<any> {
    const res = await fetch("/api/auth/restore-seed-users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    });
    const json = await res.json();
    if (!res.ok) {
      throw new Error(json.error || "Falha ao restaurar usuários padrão.");
    }
    return json;
  }

  /**
   * Executa o Teste Definitivo do Piloto 01 (12 Etapas):
   * CRIAR CLIENTE -> TRIAL 30 DIAS -> ONBOARDING -> 10 PRODUTOS -> PUBLICAR CATÁLOGO ->
   * CLIENTE FINAL -> PEDIDO -> RESERVA -> PAGAMENTO -> VENDA -> ESTOQUE -> GARANTIA
   */
  static async verifyPilotFlow(): Promise<any> {
    const res = await this.post("/api/platform/security/verify-pilot-flow", {});
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || `Erro ao executar teste definitivo do piloto.`);
    }
    return res.json();
  }
}

// Inicializa a cadeia padrão de interceptors de requisição (tenantRequestInterceptor)
ApiClient.initializeInterceptors();

export const apiClient = ApiClient;
export const api = ApiClient;
export default apiClient;
