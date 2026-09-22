import React, { useState, useEffect, useMemo } from "react";
import { SidebarNavigation } from "./components/SidebarNavigation";
import { WireframeProductsCatalog } from "./components/WireframeProductsCatalog";
import { HeaderNavbar } from "./components/HeaderNavbar";
import { OwnerStoreHome } from "./components/OwnerStoreHome";
import { QuickNewSaleModal } from "./components/QuickNewSaleModal";
import { QuickSellScreen } from "./components/QuickSellScreen";
import { QuickNewProductModal } from "./components/QuickNewProductModal";
import { DashboardOverview } from "./components/DashboardOverview";
import { ArchitectureView } from "./components/ArchitectureView";
import { CatalogInventoryLedger } from "./components/CatalogInventoryLedger";
import { ConsignmentsManager } from "./components/ConsignmentsManager";
import { CommissionEngine } from "./components/CommissionEngine";
import { DigitalWarrantyManager } from "./components/DigitalWarrantyManager";
import { CustomJewelryStudio } from "./components/CustomJewelryStudio";
import { UnifiedSalesOrders } from "./components/UnifiedSalesOrders";
import { ResellersNetworkManager } from "./components/ResellersNetworkManager";
import { CommercialNetworkModule } from "./components/CommercialNetworkModule";
import { AIGatewayMCPCopilot } from "./components/AIGatewayMCPCopilot";
import { SecurityAuditLGPD } from "./components/SecurityAuditLGPD";
import { StorefrontBuyerExperience } from "./components/StorefrontBuyerExperience";
import { LandingHomeExperience } from "./components/LandingHomeExperience";
import { StoreSettingsPanel } from "./components/StoreSettingsPanel";
import { SaaSControlPanel } from "./components/SaaSControlPanel";
import { CustomerManager } from "./components/CustomerManager";
import { ShareCatalogModal } from "./components/ShareCatalogModal";
import { OnboardingWizardModal } from "./components/OnboardingWizardModal";
import { AssistantHelpModal } from "./components/AssistantHelpModal";
import { CriticalPathModal } from "./components/CriticalPathModal";
import { TrialStatusBanner } from "./components/TrialStatusBanner";
import { MyStoreShowcase } from "./components/MyStoreShowcase";
import { PlatformMasterConsole } from "./components/platform/PlatformMasterConsole";
import { PlatformHeader, ProductMode } from "./components/platform/PlatformHeader";
import { GlobalLoadingOverlay } from "./components/GlobalLoadingOverlay";
import { apiClient, GlobalLoadingManager } from "./services/apiClient";
import {
  firebaseAuthService,
  firestoreDataService,
  testFirestoreConnection,
} from "./services/firestoreService";
import { toast } from "./utils/toast";

import {
  mockTenants,
  mockProducts,
  mockLedger,
  mockResellers,
  mockConsignments,
  mockOrders,
  mockWarranties,
  mockCommissionTiers,
  mockAuditLogs,
  mockMCPActions,
  mockCurrentUser,
  mockCustomers,
  DEFAULT_BRANDING_CONFIG,
  DEFAULT_PAYMENT_SETTINGS,
  DEFAULT_STORE_SMTP_CONFIG,
} from "./data/mockData";

import {
  TenantStore,
  ProductItem,
  InventoryLedgerEntry,
  Reseller,
  ConsignmentMaleta,
  UnifiedOrder,
  DigitalWarranty,
  CommissionTier,
  AuditLogEntry,
  MCPProposedAction,
  RBACUser,
  StoreBrandingConfig,
  Customer,
  CreateCustomerDTO,
  UpdateCustomerDTO,
  OrganizationPaymentSettings,
  StoreSmtpConfig,
} from "./types";
import confetti from "canvas-confetti";

function detectInitialRoute(): { tab: string; slug?: string } {
  if (typeof window === "undefined") return { tab: "ownerHome" };
  const path = window.location.pathname;
  const search = new URLSearchParams(window.location.search);
  const hash = window.location.hash;

  if (path.startsWith("/loja/")) {
    const slug = path.replace(/^\/loja\/?/, "").split("/")[0].split("?")[0];
    return { tab: "storefront", slug: slug || undefined };
  }

  const queryLoja = search.get("loja");
  if (queryLoja) {
    return { tab: "storefront", slug: queryLoja };
  }

  if (hash === "#storefront" || hash === "#catalogo" || hash === "#loja") {
    return { tab: "storefront" };
  }

  return { tab: "ownerHome" };
}

export default function App() {
  const initialRoute = useMemo(() => detectInitialRoute(), []);
  const [activeTab, setActiveTab] = useState<string>(initialRoute.tab);
  const [productMode, setProductMode] = useState<ProductMode>(() => {
    if (initialRoute.tab === "storefront") return "TENANT_STORE";
    return "PLATFORM_OWNER";
  });
  const [storefrontCategory, setStorefrontCategory] = useState<string>("TODOS");
  const [storefrontCoupon, setStorefrontCoupon] = useState<string>("");
  const [brandingConfig, setBrandingConfig] = useState<StoreBrandingConfig>(() => {
    try {
      const saved = localStorage.getItem("aura_branding_config");
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return DEFAULT_BRANDING_CONFIG;
  });
  const [selectedTenant, setSelectedTenant] = useState<TenantStore>(() => {
    const base = mockTenants[0];
    try {
      const saved = localStorage.getItem("aura_branding_config");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.logoText) {
          return { ...base, name: parsed.logoText };
        }
      }
    } catch (e) {}
    return base;
  });
  const [tenants, setTenants] = useState<TenantStore[]>(mockTenants);
  const [currentUser, setCurrentUser] = useState<RBACUser>(() => {
    try {
      const saved = localStorage.getItem("aura_user_profile");
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return mockCurrentUser;
  });

  const handleUpdateUser = (updated: Partial<RBACUser>) => {
    setCurrentUser((prev) => {
      const next = { ...prev, ...updated };
      try {
        localStorage.setItem("aura_user_profile", JSON.stringify(next));
      } catch (e) {}
      return next;
    });
    showToast("Perfil e foto atualizados com sucesso!");
  };

  const [paymentSettings, setPaymentSettings] = useState<OrganizationPaymentSettings>(DEFAULT_PAYMENT_SETTINGS);
  const [smtpConfig, setSmtpConfig] = useState<StoreSmtpConfig>(() => {
    try {
      const saved = localStorage.getItem("aura_store_smtp_config");
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return DEFAULT_STORE_SMTP_CONFIG;
  });

  // Dynamic state
  const [products, setProducts] = useState<ProductItem[]>(mockProducts);
  const [ledger, setLedger] = useState<InventoryLedgerEntry[]>(mockLedger);
  const [resellers, setResellers] = useState<Reseller[]>(mockResellers);
  const [consignments, setConsignments] = useState<ConsignmentMaleta[]>(mockConsignments);
  const [orders, setOrders] = useState<UnifiedOrder[]>(mockOrders);
  const [warranties, setWarranties] = useState<DigitalWarranty[]>(mockWarranties);
  const [tiers, setTiers] = useState<CommissionTier[]>(mockCommissionTiers);
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>(mockAuditLogs);
  const [mcpActions, setMcpActions] = useState<MCPProposedAction[]>(mockMCPActions);
  const [customers, setCustomers] = useState<Customer[]>(mockCustomers);
  const [showShareModal, setShowShareModal] = useState<boolean>(false);
  const [showOnboardingModal, setShowOnboardingModal] = useState<boolean>(false);
  const [showQuickSaleModal, setShowQuickSaleModal] = useState<boolean>(false);
  const [showQuickProductModal, setShowQuickProductModal] = useState<boolean>(false);
  const [showAssistantHelpModal, setShowAssistantHelpModal] = useState<boolean>(false);
  const [showCriticalPathModal, setShowCriticalPathModal] = useState<boolean>(false);
  const [trialRemainingDays, setTrialRemainingDays] = useState<number>(27);
  const [trialEndsAt, setTrialEndsAt] = useState<string>("2026-09-28");
  const [isOnboardingComplete, setIsOnboardingComplete] = useState<boolean>(true);

  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isBackendConnected, setIsBackendConnected] = useState<boolean>(false);

  // Global loading state synchronized with ApiClient request lifecycle
  const [isGlobalLoading, setIsGlobalLoading] = useState<boolean>(false);
  const [activeRequestsCount, setActiveRequestsCount] = useState<number>(0);

  // Real Firebase Auth and Firestore State
  const [isFirebaseAuthed, setIsFirebaseAuthed] = useState<boolean>(false);
  const [isFirestoreConnected, setIsFirestoreConnected] = useState<boolean>(false);

  useEffect(() => {
    // Validate Firestore connection initially using getDocFromServer
    testFirestoreConnection().then((connected) => {
      setIsFirestoreConnected(connected);
      if (connected) {
        console.log("[Firebase] Firestore conectado com sucesso ao banco:", selectedTenant.id);
      }
    });

    // Listen to Firebase Auth changes
    const unsubAuth = firebaseAuthService.onAuthChange((user) => {
      if (user) {
        setIsFirebaseAuthed(true);
        setCurrentUser((prev) => ({
          ...prev,
          name: user.displayName || prev.name,
          email: user.email || prev.email,
          photoUrl: user.photoURL || prev.photoUrl,
          avatar: user.photoURL || prev.avatar,
        }));
      } else {
        setIsFirebaseAuthed(false);
      }
    });

    return () => {
      unsubAuth();
    };
  }, []);

  // Handle Firebase Google Authentication
  const handleFirebaseGoogleLogin = async () => {
    try {
      const user = await firebaseAuthService.signInWithGoogle();
      showToast(`Bem-vindo, ${user.displayName || user.email}! Conectado via Google/Firebase.`);
    } catch (err: any) {
      console.error("[Firebase Auth Error]", err);
      showToast(`Erro na autenticação Firebase: ${err.message || "Tentativa cancelada"}`);
    }
  };

  const handleFirebaseLogout = async () => {
    try {
      await firebaseAuthService.signOut();
      showToast("Desconectado do Firebase.");
    } catch (err: any) {
      console.error("[Firebase SignOut Error]", err);
    }
  };

  // Real-time Firestore synchronization for the active tenant
  useEffect(() => {
    const tenantId = selectedTenant.slug.includes("lumina") ? "org-lumina-01" : selectedTenant.id;

    // Seed initial collections in Firestore if empty so the user doesn't start blank
    firestoreDataService.seedInitialDataIfEmpty(
      tenantId,
      mockProducts,
      mockCustomers,
      mockOrders,
      mockResellers
    );

    // Subscribe to Products
    const unsubProducts = firestoreDataService.subscribeProducts(
      tenantId,
      (firestoreProds) => {
        if (firestoreProds && firestoreProds.length > 0) {
          setProducts(firestoreProds);
        }
      },
      (err) => console.warn("[Firestore Products Subscription]", err)
    );

    // Subscribe to Customers
    const unsubCustomers = firestoreDataService.subscribeCustomers(
      tenantId,
      (firestoreCusts) => {
        if (firestoreCusts && firestoreCusts.length > 0) {
          setCustomers(firestoreCusts);
        }
      },
      (err) => console.warn("[Firestore Customers Subscription]", err)
    );

    // Subscribe to Orders
    const unsubOrders = firestoreDataService.subscribeOrders(
      tenantId,
      (firestoreOrders) => {
        if (firestoreOrders && firestoreOrders.length > 0) {
          setOrders(firestoreOrders);
        }
      },
      (err) => console.warn("[Firestore Orders Subscription]", err)
    );

    // Subscribe to Resellers
    const unsubResellers = firestoreDataService.subscribeResellers(
      tenantId,
      (firestoreResellers) => {
        if (firestoreResellers && firestoreResellers.length > 0) {
          setResellers(firestoreResellers);
        }
      },
      (err) => console.warn("[Firestore Resellers Subscription]", err)
    );

    return () => {
      unsubProducts();
      unsubCustomers();
      unsubOrders();
      unsubResellers();
    };
  }, [selectedTenant.id, selectedTenant.slug]);

  useEffect(() => {
    const unsubscribe = GlobalLoadingManager.subscribe(({ isLoading, activeCount }) => {
      setIsGlobalLoading(isLoading);
      setActiveRequestsCount(activeCount);
    });
    return unsubscribe;
  }, []);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Subscribe to universal toast notifications
  useEffect(() => {
    const unsub = toast.subscribe(({ message, type }) => {
      setToastMessage(type === "error" ? `❌ ${message}` : type === "warning" ? `⚠️ ${message}` : message);
      setTimeout(() => setToastMessage(null), 4000);
    });
    return unsub;
  }, []);

  // Centralized tenant and authenticated header helper
  const getAuthHeaders = async (customTenantId?: string) => {
    const tenantId = customTenantId || (selectedTenant.slug.includes("lumina") ? "org-lumina-01" : selectedTenant.id);
    return apiClient.getAuthHeaders(tenantId);
  };

  // Check onboarding status and trial info
  const checkOnboardingStatus = async () => {
    try {
      const headers = await getAuthHeaders();
      const res = await fetch("/api/onboarding/status", { headers });
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.data) {
          if (data.data.trialRemainingDays !== undefined) {
            setTrialRemainingDays(data.data.trialRemainingDays);
          }
          if (data.data.subscription?.trialEndsAt) {
            setTrialEndsAt(data.data.subscription.trialEndsAt.substring(0, 10));
          }
          setIsOnboardingComplete(Boolean(data.data.isOnboardingComplete));
        }
      }
    } catch (e) {
      console.warn("Could not check onboarding status:", e);
    }
  };

  const handleCompleteOnboarding = async (payload: any) => {
    const headers = await getAuthHeaders();
    const res = await fetch("/api/onboarding/save", {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
    });

    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.error || "Erro ao salvar dados no servidor.");
    }

    // Update branding and tenant in UI
    if (payload.storeIdentity?.name) {
      setSelectedTenant((prev) => ({
        ...prev,
        name: payload.storeIdentity.name,
      }));
    }
    if (payload.launchDiscount) {
      setSelectedTenant((prev) => ({
        ...prev,
        launchDiscount: payload.launchDiscount,
      }));
    }
    if (payload.catalogSettings) {
      setBrandingConfig((prev) => ({
        ...prev,
        logoText: payload.catalogSettings.storefrontName || prev.logoText,
        logoUrl: payload.catalogSettings.logoUrl || prev.logoUrl,
        primaryColor: payload.catalogSettings.primaryColor || prev.primaryColor,
        secondaryColor: payload.catalogSettings.secondaryColor || prev.secondaryColor,
        tagline: payload.catalogSettings.bio || prev.tagline,
        announcementBarText: payload.launchDiscount?.enabled && payload.launchDiscount?.bannerEnabled && payload.launchDiscount?.bannerHeadline
          ? payload.launchDiscount.bannerHeadline
          : prev.announcementBarText,
        launchDiscount: payload.launchDiscount,
      }));
    }

    setIsOnboardingComplete(true);
    await refreshBackendData();
    showToast("🎉 Loja configurada e persistida no servidor com sucesso!");
  };

  // Sync Products, Ledger, Customers and Orders from Real ERP API
  const refreshBackendData = async () => {
    try {
      const headers = await getAuthHeaders();

      const [resProds, resLedger, resCusts, resOrders] = await Promise.all([
        fetch("/api/products", { headers }),
        fetch("/api/inventory/ledger", { headers }),
        fetch("/api/customers", { headers }),
        fetch("/api/orders", { headers }),
      ]);

      if (resProds.ok) {
        const dataProds = await resProds.json();
        if (dataProds.success && Array.isArray(dataProds.data)) {
          setProducts(dataProds.data);
          setIsBackendConnected(true);

          if (resLedger.ok) {
            const dataLedger = await resLedger.json();
            if (dataLedger.success && Array.isArray(dataLedger.data)) {
              const prodMap = new Map<string, ProductItem>();
              dataProds.data.forEach((p: ProductItem) => prodMap.set(p.id, p));

              const formattedLedger: InventoryLedgerEntry[] = dataLedger.data.map((mov: any) => ({
                id: mov.id,
                productId: mov.productId,
                sku: prodMap.get(mov.productId)?.sku || "SKU-N/A",
                productName: prodMap.get(mov.productId)?.name || "Produto Semijoia",
                type:
                  mov.type === "PURCHASE"
                    ? "ENTRADA_FORNECEDOR"
                    : mov.type === "CONSIGNMENT_OUT"
                    ? "ENVIO_CONSIGNACAO"
                    : mov.type === "CONSIGNMENT_RETURN"
                    ? "RETORNO_CONSIGNACAO"
                    : mov.type === "SALE"
                    ? "VENDA_DIRETA"
                    : mov.type === "CONSIGNMENT_SALE"
                    ? "VENDA_REVENDEDORA"
                    : mov.type === "REVERSAL"
                    ? "REVERSAO_ESTORNO"
                    : "AJUSTE_INVENTARIO",
                qtyChange: mov.quantityChange,
                physicalBalanceAfter: mov.physicalBalanceAfter,
                consignedBalanceAfter: mov.consignedBalanceAfter,
                reversalOfMovementId: mov.reversalOfMovementId,
                operator: mov.operatorName || "Gestor Matriz",
                reason: mov.notes || mov.referenceType || "Movimentação registrada",
                timestamp: mov.createdAt,
              }));

              setLedger(formattedLedger);
            }
          }
        }
      }

      if (resCusts.ok) {
        const dataCusts = await resCusts.json();
        if (dataCusts.success && Array.isArray(dataCusts.data)) {
          setCustomers(dataCusts.data);
        }
      }

      if (resOrders.ok) {
        const dataOrders = await resOrders.json();
        if (dataOrders.success && Array.isArray(dataOrders.data)) {
          setOrders(dataOrders.data);
        }
      }
    } catch (err) {
      console.warn("Backend API sync fallback to local state:", err);
    }
  };

  React.useEffect(() => {
    refreshBackendData();
    checkOnboardingStatus();
  }, [selectedTenant.id]);

  React.useEffect(() => {
    if (activeTab === "storefront") {
      const slug = initialRoute.slug || selectedTenant.slug || "lumina";
      fetch(`/api/products/public?storeSlug=${encodeURIComponent(slug)}`)
        .then((r) => r.json())
        .then((res) => {
          if (res.success && Array.isArray(res.data) && res.data.length > 0) {
            setProducts(res.data);
          }
          if (res.organization) {
            const org = res.organization;
            setSelectedTenant((prev) => ({
              ...prev,
              id: org.id || prev.id,
              name: org.name || prev.name,
              slug: org.slug || prev.slug,
              contactWhatsapp: org.contactWhatsapp || prev.contactWhatsapp,
              contactEmail: org.contactEmail || prev.contactEmail,
              city: org.city || prev.city,
              state: org.state || prev.state,
              logo: org.logoUrl || prev.logo,
            }));
            setBrandingConfig((prev) => ({
              ...prev,
              logoText: org.name || prev.logoText,
              logoUrl: org.logoUrl || prev.logoUrl,
              contactWhatsapp: org.contactWhatsapp || prev.contactWhatsapp,
              contactEmail: org.contactEmail || prev.contactEmail,
            }));
          }
        })
        .catch((e) => console.warn("Could not load public storefront:", e));
    }
  }, [activeTab, selectedTenant.slug]);

  const handleUpdateBranding = (newBranding: StoreBrandingConfig) => {
    setBrandingConfig(newBranding);
    try {
      localStorage.setItem("aura_branding_config", JSON.stringify(newBranding));
    } catch (e) {}
    setSelectedTenant((prev) => ({
      ...prev,
      name: newBranding.logoText || prev.name,
      logo: newBranding.logoUrl || prev.logo,
    }));
    showToast(`Nome da loja atualizado para "${newBranding.logoText || 'Lumina'}" com sucesso!`);
  };

  // Add Product handler (Strict PostgreSQL Persistence - No Silent Fallback)
  const handleAddProduct = async (newProd: ProductItem) => {
    try {
      const headers = await getAuthHeaders();
      const res = await fetch("/api/products", {
        method: "POST",
        headers,
        body: JSON.stringify({
          sku: newProd.sku,
          name: newProd.name,
          category: newProd.category,
          collection: newProd.collection,
          material: newProd.material,
          bath: newProd.bath,
          stones: newProd.stones,
          price: newProd.price,
          costPrice: newProd.costPrice,
          initialStock: newProd.stockPhysical,
          warrantyMonths: newProd.warrantyMonths,
          isCustomizable: newProd.isCustomizable,
          imageUrl: newProd.imageUrl,
          galleryUrls: newProd.galleryUrls,
          media: newProd.media,
          description: newProd.description,
          status: newProd.status,
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success) {
        throw new Error(data.error || data.message || `Falha ao cadastrar produto (HTTP ${res.status})`);
      }

      await refreshBackendData();
      const tenantId = selectedTenant.slug.includes("lumina") ? "org-lumina-01" : selectedTenant.id;
      firestoreDataService.saveProduct(tenantId, newProd).catch((err) => console.warn("[Firestore Product Save]", err));
      showToast(`SKU ${newProd.sku} persistido com sucesso no PostgreSQL & Ledger!`);
    } catch (e: any) {
      console.error("API error adding product:", e);
      const msg = e?.message || "Falha ao comunicar com o servidor.";
      showToast(`❌ Falha ao salvar produto no PostgreSQL: ${msg}`);
      throw e;
    }
  };

  // Update existing product details (Strict PostgreSQL Persistence - No Silent Fallback)
  const handleUpdateProduct = async (updatedProd: ProductItem): Promise<{ success: boolean; message?: string }> => {
    try {
      const headers = await getAuthHeaders();
      const res = await fetch(`/api/products/${updatedProd.id}`, {
        method: "PUT",
        headers,
        body: JSON.stringify(updatedProd),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success) {
        throw new Error(data.error || data.message || `Falha ao atualizar produto (HTTP ${res.status})`);
      }

      await refreshBackendData();
      const tenantId = selectedTenant.slug.includes("lumina") ? "org-lumina-01" : selectedTenant.id;
      firestoreDataService.saveProduct(tenantId, updatedProd).catch((err) => console.warn("[Firestore Product Update]", err));
      showToast(`Produto "${updatedProd.name}" atualizado com sucesso no PostgreSQL!`);
      return { success: true, message: "Gravado com sucesso no PostgreSQL" };
    } catch (e: any) {
      console.error("API error updating product:", e);
      const msg = e?.message || "Falha ao comunicar com o servidor.";
      showToast(`❌ Falha ao atualizar produto no PostgreSQL: ${msg}`);
      throw e;
    }
  };

  // Update Stock manual (Strict PostgreSQL Persistence - No Silent Fallback)
  const handleUpdateStock = async (productId: string, qty: number, reason: string): Promise<{ success: boolean; message?: string }> => {
    try {
      const headers = await getAuthHeaders();
      const res = await fetch("/api/inventory/movement", {
        method: "POST",
        headers,
        body: JSON.stringify({
          productId,
          type: "ADJUSTMENT",
          quantityChange: qty,
          referenceType: "MANUAL_ADJUSTMENT",
          notes: reason || "Ajuste manual de saldo",
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success) {
        throw new Error(data.error || data.message || `Falha no ajuste de estoque (HTTP ${res.status})`);
      }

      await refreshBackendData();
      showToast(`Ajuste de estoque (${qty > 0 ? "+" : ""}${qty} un) persistido no PostgreSQL Ledger!`);
      return { success: true, message: "Movimentação persistida no PostgreSQL Ledger!" };
    } catch (e: any) {
      console.error("API error updating stock:", e);
      const msg = e?.message || "Falha ao comunicar com o servidor.";
      showToast(`❌ Falha no ajuste de estoque: ${msg}`);
      throw e;
    }
  };

  // Reverse Ledger Movement (Immutable Reversal)
  const handleReverseMovement = async (originalMovementId: string, reason: string) => {
    try {
      const headers = await getAuthHeaders();
      const res = await fetch("/api/inventory/reverse", {
        method: "POST",
        headers,
        body: JSON.stringify({
          originalMovementId,
          reason: reason || "Estorno/Reversão de lançamento incorreto",
        }),
      });

      const data = await res.json();
      if (data.success) {
        await refreshBackendData();
        showToast(`Lançamento ${originalMovementId} revertido no Ledger de forma imutável!`);
        return;
      } else {
        showToast(`Erro ao estornar: ${data.error}`);
      }
    } catch (e) {
      console.error("API error reversing movement:", e);
      showToast("Falha ao comunicar com a API de estorno.");
    }
  };

  // Settle Consignment
  const handleSettleConsignment = (
    consignmentId: string,
    soldMap: Record<string, number>,
    returnedMap: Record<string, number>
  ) => {
    const target = consignments.find((c) => c.id === consignmentId);
    if (!target) return;

    let totalSold = 0;
    let totalItemsSoldQty = 0;
    let totalItemsReturnedQty = 0;

    const updatedItems = target.items.map((item) => {
      const sold = soldMap[item.productId] ?? item.quantitySold;
      const returned = returnedMap[item.productId] ?? item.quantityReturned;
      const pending = Math.max(0, item.quantityShipped - sold - returned);

      totalSold += sold * item.unitPrice;
      totalItemsSoldQty += sold;
      totalItemsReturnedQty += returned;

      return {
        ...item,
        quantitySold: sold,
        quantityReturned: returned,
        quantityPending: pending,
      };
    });

    const reseller = resellers.find((r) => r.id === target.resellerId);
    const rate = reseller ? reseller.commissionDirectRate / 100 : 0.25;
    const commission = totalSold * rate;

    // Update consignment record
    setConsignments((prev) =>
      prev.map((c) =>
        c.id === consignmentId
          ? {
              ...c,
              items: updatedItems,
              soldValue: totalSold,
              pendingValue: c.totalValue - totalSold,
              commissionCalculated: commission,
              status: "FINALIZADA",
              updatedAt: new Date().toISOString(),
            }
          : c
      )
    );

    // Return inventory to physical stock for returned items
    setProducts((prev) =>
      prev.map((p) => {
        const returnedQty = returnedMap[p.id] || 0;
        const soldQty = soldMap[p.id] || 0;
        const totalOut = returnedQty + soldQty;
        if (totalOut > 0) {
          return {
            ...p,
            stockPhysical: p.stockPhysical + returnedQty,
            stockConsigned: Math.max(0, p.stockConsigned - (returnedQty + soldQty)),
            stockAvailable: p.stockPhysical + returnedQty,
          };
        }
        return p;
      })
    );

    // Ledger entry
    const ledgerEntry: InventoryLedgerEntry = {
      id: `led-${Date.now()}`,
      productId: target.items[0]?.productId || "multi",
      sku: target.code,
      productName: `Acerto da Maleta ${target.code} (${target.resellerName})`,
      type: "RETORNO_CONSIGNACAO",
      qtyChange: totalItemsReturnedQty,
      physicalBalanceAfter: products[0]?.stockPhysical + totalItemsReturnedQty,
      consignedBalanceAfter: Math.max(0, products[0]?.stockConsigned - (totalItemsSoldQty + totalItemsReturnedQty)),
      timestamp: new Date().toISOString().replace("T", " ").substring(0, 16),
      resellerId: target.resellerId,
      resellerName: target.resellerName,
      operator: "Gestor Comercial",
      reason: `Acerto final: ${totalItemsSoldQty} un vendidas, ${totalItemsReturnedQty} un devolvidas ao estoque matriz`,
    };
    setLedger((prev) => [ledgerEntry, ...prev]);

    // Audit log
    const auditEntry: AuditLogEntry = {
      id: `aud-${Date.now()}`,
      action: "CONSIGNMENT_SETTLED",
      entity: "ConsignmentMaleta",
      entityId: target.code,
      actor: "Gestor Comercial (Admin)",
      ipAddress: "189.44.120.18",
      timestamp: new Date().toISOString().replace("T", " ").substring(0, 16),
      changes: {
        totalSold,
        commissionCalculated: commission,
        resellerName: target.resellerName,
      },
    };
    setAuditLogs((prev) => [auditEntry, ...prev]);

    showToast(
      `Maleta ${target.code} liquidada! Comissão de R$ ${commission.toFixed(2)} creditada.`
    );
  };

  // Create new Consignment
  const handleCreateConsignment = (
    resellerId: string,
    items: Array<{ productId: string; qty: number }>,
    daysDuration: number
  ) => {
    const reseller = resellers.find((r) => r.id === resellerId);
    if (!reseller) return;

    const startDate = new Date();
    const dueDate = new Date();
    dueDate.setDate(startDate.getDate() + daysDuration);

    let totalVal = 0;
    const maletaItems = items.map(({ productId, qty }) => {
      const prod = products.find((p) => p.id === productId);
      const price = prod?.price || 199.9;
      totalVal += price * qty;
      return {
        productId,
        sku: prod?.sku || "SKU",
        productName: prod?.name || "Semijoia",
        quantityShipped: qty,
        quantitySold: 0,
        quantityReturned: 0,
        quantityPending: qty,
        unitPrice: price,
      };
    });

    const code = `MLT-${Math.floor(100 + Math.random() * 900)}`;

    const newMaleta: ConsignmentMaleta = {
      id: `cng-${Date.now()}`,
      code,
      resellerId,
      resellerName: reseller.name,
      resellerPhone: reseller.phone,
      startDate: startDate.toISOString().split("T")[0],
      dueDate: dueDate.toISOString().split("T")[0],
      status: "EM_ABERTO",
      totalValue: totalVal,
      soldValue: 0,
      pendingValue: totalVal,
      commissionCalculated: 0,
      commissionPaid: false,
      items: maletaItems,
      createdAt: startDate.toISOString(),
      updatedAt: startDate.toISOString(),
    };

    setConsignments((prev) => [newMaleta, ...prev]);

    // Subtract from physical stock, add to consigned
    setProducts((prev) =>
      prev.map((p) => {
        const item = items.find((i) => i.productId === p.id);
        if (item) {
          return {
            ...p,
            stockPhysical: Math.max(0, p.stockPhysical - item.qty),
            stockConsigned: p.stockConsigned + item.qty,
            stockAvailable: Math.max(0, p.stockPhysical - item.qty),
          };
        }
        return p;
      })
    );

    // Ledger
    const ledgerEntry: InventoryLedgerEntry = {
      id: `led-${Date.now()}`,
      productId: items[0]?.productId || "multi",
      sku: code,
      productName: `Expedição de Maleta ${code} para ${reseller.name}`,
      type: "ENVIO_CONSIGNACAO",
      qtyChange: -items.reduce((acc, i) => acc + i.qty, 0),
      physicalBalanceAfter: 45,
      consignedBalanceAfter: 35,
      timestamp: new Date().toISOString().replace("T", " ").substring(0, 16),
      resellerId,
      resellerName: reseller.name,
      operator: "Gestor Matriz",
      reason: `Envio de nova maleta para consignação (${daysDuration} dias)`,
    };
    setLedger((prev) => [ledgerEntry, ...prev]);

    showToast(`Maleta ${code} despachada para ${reseller.name}! Estoque transferido.`);
  };

  // Generate Custom Order
  const handleGenerateCustomOrder = (newOrder: UnifiedOrder) => {
    setOrders((prev) => [newOrder, ...prev]);
    showToast(`Pedido Personalizado ${newOrder.orderNumber} criado com snapshot imutável!`);
    setActiveTab("orders");
  };

  // Create Digital Warranty
  const handleCreateWarranty = (newWarranty: DigitalWarranty) => {
    setWarranties((prev) => [newWarranty, ...prev]);
    showToast(`Garantia Digital ${newWarranty.code} emitida e QR Code gerado!`);
  };

  // Issue Warranty directly from Order
  const handleIssueWarrantyFromOrder = (order: any) => {
    const item = order.items?.[0];
    const today = new Date();
    const expDate = new Date();
    expDate.setFullYear(today.getFullYear() + 1);

    const code = order.warrantyCode || `GRT-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
    const custName = order.customerSnapshot?.name || order.customer?.name || "Cliente Lumina";
    const custPhone = order.customerSnapshot?.phone || order.customer?.phone || "";
    const custDoc = order.customerSnapshot?.document || order.customer?.document || "***.***.***-**";
    const custEmail = order.customerSnapshot?.email || order.customer?.email || "";
    const sku = item?.productSnapshot?.sku || item?.sku || "SKU-JOIA";
    const prodName = item?.productSnapshot?.name || item?.productName || "Semijoia Nobre";
    const bathType = item?.productSnapshot?.bath || "Ouro 18K (10 Milésimos)";

    const newWarranty: DigitalWarranty = {
      id: `warr-${Date.now()}`,
      code,
      customerName: custName,
      customerPhone: custPhone,
      customerDocument: custDoc,
      customerEmail: custEmail,
      orderNumber: order.orderNumber,
      sku,
      productName: prodName,
      bathType,
      issueDate: today.toISOString().split("T")[0],
      expirationDate: expDate.toISOString().split("T")[0],
      status: "VALIDA",
      channel: order.channel,
      resellerName: order.resellerName,
      terms:
        "Garantia oficial Lumina Semijoias cobre integridade do banho nobre e reposição de pedras cravejadas pelo período de 12 meses.",
      claimsCount: 0,
    };

    setWarranties((prev) => [newWarranty, ...prev]);
    setActiveTab("warranties");
    confetti({
      particleCount: 50,
      spread: 50,
      origin: { y: 0.6 },
    });
    showToast(`Garantia ${code} emitida com sucesso para o Pedido ${order.orderNumber}!`);
  };

  // Add Customer (Strict PostgreSQL Persistence - No Silent Fallback)
  const handleAddCustomer = async (dto: CreateCustomerDTO) => {
    try {
      const headers = await getAuthHeaders();
      const res = await fetch("/api/customers", {
        method: "POST",
        headers,
        body: JSON.stringify(dto),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success) {
        throw new Error(data.error || data.message || `Falha ao cadastrar cliente no ERP (HTTP ${res.status})`);
      }

      await refreshBackendData();
      const tenantId = selectedTenant.slug.includes("lumina") ? "org-lumina-01" : selectedTenant.id;
      firestoreDataService.saveCustomer(tenantId, data.data).catch((err) => console.warn("[Firestore Customer Save]", err));
      showToast(`Cliente ${dto.fullName} cadastrado com sucesso no PostgreSQL!`);
    } catch (e: any) {
      console.error("API error adding customer:", e);
      const msg = e?.message || "Falha de comunicação com o servidor.";
      showToast(`❌ Falha ao cadastrar cliente: ${msg}`);
      throw e;
    }
  };

  // Update Customer (Strict PostgreSQL Persistence - No Silent Fallback)
  const handleUpdateCustomer = async (id: string, dto: UpdateCustomerDTO) => {
    try {
      const headers = await getAuthHeaders();
      const res = await fetch(`/api/customers/${id}`, {
        method: "PUT",
        headers,
        body: JSON.stringify(dto),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success) {
        throw new Error(data.error || data.message || `Falha ao atualizar cliente no ERP (HTTP ${res.status})`);
      }

      await refreshBackendData();
      showToast("Cliente atualizado com sucesso no PostgreSQL.");
    } catch (e: any) {
      console.error("API error updating customer:", e);
      const msg = e?.message || "Falha de comunicação com o servidor.";
      showToast(`❌ Falha ao atualizar cliente: ${msg}`);
      throw e;
    }
  };

  // Soft-Delete / Archive Customer (Strict PostgreSQL Persistence - No Silent Fallback)
  const handleDeleteCustomer = async (id: string) => {
    try {
      const headers = await getAuthHeaders();
      const res = await fetch(`/api/customers/${id}`, {
        method: "DELETE",
        headers,
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success) {
        throw new Error(data.error || data.message || `Falha ao arquivar cliente no ERP (HTTP ${res.status})`);
      }

      await refreshBackendData();
      showToast("Cliente arquivado com sucesso no ERP. Histórico preservado.");
    } catch (e: any) {
      console.error("API error archiving customer:", e);
      const msg = e?.message || "Falha de comunicação com o servidor.";
      showToast(`❌ Falha ao arquivar cliente: ${msg}`);
      throw e;
    }
  };

  // Add Reseller
  const handleAddReseller = (newReseller: Reseller) => {
    const tenantId = selectedTenant.slug.includes("lumina") ? "org-lumina-01" : selectedTenant.id;
    firestoreDataService.saveReseller(tenantId, newReseller).catch((err) => console.warn("[Firestore Reseller Save]", err));
    setResellers((prev) => [newReseller, ...prev]);
    showToast(`Revendedora ${newReseller.name} cadastrada com sucesso no Firestore & lista local!`);
  };

  // Execute MCP Approved Action
  const handleExecuteMCPAction = (actionId: string) => {
    const action = mcpActions.find((a) => a.id === actionId);
    if (!action) return;

    setMcpActions((prev) =>
      prev.map((a) => (a.id === actionId ? { ...a, status: "APROVADO_EXECUTADO" } : a))
    );

    const auditEntry: AuditLogEntry = {
      id: `aud-${Date.now()}`,
      action: "MCP_ACTION_EXECUTED",
      entity: action.actionType || "AICopilotMCP",
      entityId: action.id,
      userName: currentUser.name,
      userEmail: currentUser.email,
      actor: currentUser.name,
      userRole: currentUser.role,
      status: "CONFIRMADO_HUMANO",
      ipAddress: "189.44.120.18",
      userAgent: "Aura-HumanInTheLoop/2.5",
      timestamp: new Date().toISOString().replace("T", " ").substring(0, 19),
      details: `Ação '${action.title}' aprovada por gestor e executada com sucesso no ERP.`,
      changes: action.payload,
    };
    setAuditLogs((prev) => [auditEntry, ...prev]);

    confetti({
      particleCount: 50,
      spread: 50,
      origin: { y: 0.6 },
    });
    showToast(`Ação MCP '${action.title}' executada com aprovação humana e auditada!`);
  };

  const handleRejectMCPAction = (actionId: string) => {
    const action = mcpActions.find((a) => a.id === actionId);
    if (!action) return;

    setMcpActions((prev) =>
      prev.map((a) => (a.id === actionId ? { ...a, status: "REJEITADO" } : a))
    );

    const auditEntry: AuditLogEntry = {
      id: `aud-${Date.now()}`,
      action: "MCP_ACTION_REJECTED",
      entity: action.actionType || "AICopilotMCP",
      entityId: action.id,
      userName: currentUser.name,
      userEmail: currentUser.email,
      actor: currentUser.name,
      userRole: currentUser.role,
      status: "NEGADO_RBAC",
      ipAddress: "189.44.120.18",
      userAgent: "Aura-HumanInTheLoop/2.5",
      timestamp: new Date().toISOString().replace("T", " ").substring(0, 19),
      details: `Ação '${action.title}' rejeitada pelo operador humano.`,
    };
    setAuditLogs((prev) => [auditEntry, ...prev]);

    showToast(`Proposta MCP '${action.title}' rejeitada.`);
  };

  // Helper function: transactional order creation in PostgreSQL ERP backend
  const submitBuyerOrderToBackend = async (orderData: any, tenantId: string) => {
    const custSnapshot = orderData.customerSnapshot || {
      id: orderData.customerId,
      name: orderData.customer?.name || "Cliente Storefront",
      document: orderData.customer?.document || "",
      phone: orderData.customer?.phone || "",
      email: orderData.customer?.email || "",
      personType: "PF",
    };

    const payload = {
      organizationId: tenantId,
      customerId: custSnapshot.id || orderData.customerId,
      customerSnapshot: custSnapshot,
      channel: orderData.channel || "ECOMMERCE",
      initialStatus: orderData.status || "INVENTORY_RESERVED",
      items: (orderData.items || []).map((item: any) => ({
        productId: item.productId,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        discountAmount: item.discountAmount || 0,
        customizationSpec: item.customizationSpec,
        locationId: item.locationId || undefined,
      })),
      payments: orderData.payments || [
        {
          paymentMethod: orderData.paymentMethod || "PIX",
          amount: orderData.totalAmount,
        },
      ],
      shippingAddress: orderData.shippingAddress,
      shippingAmount: orderData.shippingAmount || 0,
      discountAmount: orderData.discountAmount || 0,
      resellerId: orderData.resellerId,
      resellerCommissionRate: orderData.resellerCommissionRate,
      warrantyCode: orderData.warrantyCode,
      externalReference: orderData.externalReference,
      notes: orderData.notes,
      metadata: orderData.metadata,
    };

    const storeSlug = selectedTenant.slug || "lumina";
    const token = localStorage.getItem("aura_session_token") || localStorage.getItem("aura_auth_token");
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      "x-tenant-id": tenantId,
      "x-store-slug": storeSlug,
    };
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    const response = await fetch("/api/orders/public", {
      method: "POST",
      headers,
      body: JSON.stringify({
        ...payload,
        storeSlug,
      }),
    });

    const responseData = await response.json().catch(() => ({}));

    if (!response.ok || !responseData.success) {
      const errorMsg =
        responseData.error ||
        responseData.message ||
        `Falha ao registrar pedido no ERP (HTTP ${response.status})`;
      throw new Error(errorMsg);
    }

    return responseData.data;
  };

  // Place Buyer Order from Storefront (True Transactional Flow)
  const handlePlaceBuyerOrder = async (newOrder: any) => {
    const tenantId = selectedTenant.id || "org-lumina-01";

    try {
      // 1. Transactional call to backend FIRST - Wait for confirmed success
      const backendOrder = await submitBuyerOrderToBackend(newOrder, tenantId);

      // Backend PostgreSQL record is the single source of truth
      const confirmedOrder = {
        ...newOrder,
        ...backendOrder,
        id: backendOrder?.id || newOrder.id,
        orderNumber: backendOrder?.orderNumber || newOrder.orderNumber,
        warrantyCode: backendOrder?.warrantyCode || newOrder.warrantyCode,
        status: backendOrder?.status || newOrder.status,
        customerSnapshot: backendOrder?.customerSnapshot || newOrder.customerSnapshot,
        items: backendOrder?.items?.length ? backendOrder.items : newOrder.items,
        totalAmount: backendOrder?.totalAmount ?? newOrder.totalAmount,
      };

      // 2. Only after confirmed success, perform local state updates and Firestore replication
      setOrders((prev) => [confirmedOrder, ...prev]);
      firestoreDataService.saveOrder(tenantId, confirmedOrder).catch((err) => console.warn("[Firestore Order Save]", err));

      const custName = confirmedOrder.customerSnapshot?.name || confirmedOrder.customer?.name || "Cliente Storefront";
      const custDoc = confirmedOrder.customerSnapshot?.document || confirmedOrder.customer?.document || "***.***.***-**";
      const custPhone = confirmedOrder.customerSnapshot?.phone || confirmedOrder.customer?.phone || "";
      const custEmail = confirmedOrder.customerSnapshot?.email || confirmedOrder.customer?.email || "";

      // Warranty Generation
      const warrantyCode = confirmedOrder.warrantyCode || `GRT-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
      const firstItem = confirmedOrder.items?.[0];
      const prod = products.find((p) => p.id === firstItem?.productId);
      
      const issueDate = new Date().toISOString();
      const expDate = new Date();
      expDate.setFullYear(expDate.getFullYear() + 1);

      const newWarranty: DigitalWarranty = {
        id: `war-${Date.now()}`,
        code: warrantyCode,
        customerName: custName,
        customerDocument: custDoc,
        customerPhone: custPhone,
        customerEmail: custEmail,
        orderNumber: confirmedOrder.orderNumber,
        sku: firstItem?.productSnapshot?.sku || firstItem?.sku || "SKU-001",
        productName: firstItem?.productSnapshot?.name || firstItem?.productName || "Semijoia Lumina",
        bathType: firstItem?.productSnapshot?.bath || prod?.bath || "OURO_18K",
        issueDate: issueDate,
        expirationDate: expDate.toISOString(),
        status: "VALIDA",
        terms: "Garantia de 12 meses cobrindo defeitos de fabricação, desprendimento de zircônias e desgaste anômalo do banho metálico.",
        channel: confirmedOrder.channel,
        resellerName: confirmedOrder.resellerName,
        claimsCount: 0,
      };
      setWarranties((prev) => [newWarranty, ...prev]);

      // Adjust inventory according to Order Status (Reserva de Estoque vs Baixa Física)
      const isReservation =
        confirmedOrder.status === "INVENTORY_RESERVED" ||
        confirmedOrder.status === "PENDING_CONFIRMATION" ||
        confirmedOrder.status === "AWAITING_PAYMENT" ||
        confirmedOrder.status === "DRAFT";

      setProducts((prev) =>
        prev.map((p) => {
          const orderItem = confirmedOrder.items?.find((it: any) => it.productId === p.id);
          if (orderItem) {
            if (isReservation) {
              const newReserved = (p.stockReserved || 0) + orderItem.quantity;
              const newAvailable = Math.max(0, p.stockPhysical - newReserved);
              return {
                ...p,
                stockReserved: newReserved,
                stockAvailable: newAvailable,
              };
            } else {
              const newPhysical = Math.max(0, p.stockPhysical - orderItem.quantity);
              const newAvailable = Math.max(0, p.stockAvailable - orderItem.quantity);
              return {
                ...p,
                stockPhysical: newPhysical,
                stockAvailable: newAvailable,
              };
            }
          }
          return p;
        })
      );

      // Add to ledger
      confirmedOrder.items?.forEach((item: any) => {
        const itemSku = item.productSnapshot?.sku || item.sku || "SKU-N/A";
        const itemName = item.productSnapshot?.name || item.productName || "Produto Semijoia";
        const ledgerEntry: InventoryLedgerEntry = {
          id: `led-${Date.now()}-${item.productId}`,
          productId: item.productId,
          sku: itemSku,
          productName: itemName,
          type: confirmedOrder.channel === "B2B_RESELLER" || confirmedOrder.channel === "REVENDEDORA" ? "VENDA_REVENDEDORA" : "VENDA_DIRETA",
          qtyChange: -item.quantity,
          physicalBalanceAfter: Math.max(0, (products.find((p) => p.id === item.productId)?.stockPhysical || 1) - item.quantity),
          consignedBalanceAfter: products.find((p) => p.id === item.productId)?.stockConsigned || 0,
          timestamp: new Date().toISOString().replace("T", " ").substring(0, 16),
          resellerId: confirmedOrder.resellerId,
          resellerName: confirmedOrder.resellerName,
          orderNumber: confirmedOrder.orderNumber,
          operator: "Checkout do Comprador (E-commerce)",
          reason: isReservation
            ? `Reserva de estoque no storefront para WhatsApp - Pedido ${confirmedOrder.orderNumber}`
            : `Venda B2C via ${confirmedOrder.channel} - Pedido ${confirmedOrder.orderNumber}`,
        };
        setLedger((prev) => [ledgerEntry, ...prev]);
      });

      // If reseller linked, update reseller sales & commission
      if (confirmedOrder.resellerId) {
        setResellers((prev) =>
          prev.map((r) =>
            r.id === confirmedOrder.resellerId
              ? {
                  ...r,
                  totalSalesAccumulated: r.totalSalesAccumulated + confirmedOrder.totalAmount,
                  pendingCommissionValue:
                    r.pendingCommissionValue +
                    (confirmedOrder.totalAmount * (r.commissionDirectRate / 100)),
                }
              : r
          )
        );
      }

      // Audit log
      const auditEntry: AuditLogEntry = {
        id: `aud-${Date.now()}`,
        action: "STOREFRONT_ORDER_PLACED",
        entity: "Order",
        entityId: confirmedOrder.orderNumber,
        userName: custName,
        userEmail: custEmail,
        actor: "Comprador B2C (Storefront)",
        userRole: "LOJA_ADMIN",
        status: "SUCESSO",
        ipAddress: "189.44.120.18",
        userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)",
        timestamp: new Date().toISOString().replace("T", " ").substring(0, 19),
        details: `Novo pedido ${confirmedOrder.orderNumber} realizado pelo cliente ${custName} (R$ ${Number(confirmedOrder.totalAmount).toFixed(2)}) transacionado com sucesso no ERP com garantia digital ${warrantyCode}.`,
        changes: {
          orderNumber: confirmedOrder.orderNumber,
          totalAmount: confirmedOrder.totalAmount,
          channel: confirmedOrder.channel,
          resellerName: confirmedOrder.resellerName,
          warrantyCode: warrantyCode,
        },
      };
      setAuditLogs((prev) => [auditEntry, ...prev]);

      // Trigger background sync to refresh all backend state
      refreshBackendData();

      showToast(`Pedido ${confirmedOrder.orderNumber} confirmado e registrado no ERP! Garantia ${warrantyCode} emitida.`);
      return confirmedOrder;
    } catch (err: any) {
      console.error("Falha ao registrar pedido no ERP:", err);
      const errorMsg = err?.message || "Erro de comunicação com o ERP ao registrar o pedido.";
      showToast(`❌ Falha no pedido: ${errorMsg}`);
      throw err;
    }
  };

  // Quick New Sale Handler for Store Owner (Strict PostgreSQL Persistence - No Silent Fallback)
  const handleQuickNewSale = async (saleData: {
    customerName: string;
    customerPhone: string;
    items: { productId: string; name: string; quantity: number; unitPrice: number }[];
    totalAmount: number;
    subtotalAmount?: number;
    shippingAmount?: number;
    paymentMethod: "PIX" | "CREDIT_CARD" | "DEBIT_CARD" | "CASH";
    notes?: string;
  }) => {
    try {
      const headers = await getAuthHeaders();
      const res = await fetch("/api/orders", {
        method: "POST",
        headers,
        body: JSON.stringify({
          channel: "PRESENTIAL_POS",
          customer: {
            name: saleData.customerName,
            phone: saleData.customerPhone,
          },
          items: saleData.items.map((i) => ({
            productId: i.productId,
            quantity: i.quantity,
            unitPrice: i.unitPrice,
          })),
          paymentMethod: saleData.paymentMethod,
          status: "PAID",
          notes: saleData.notes,
        }),
      });

      const responseData = await res.json().catch(() => ({}));
      if (!res.ok || !responseData.success) {
        throw new Error(
          responseData.error ||
          responseData.message ||
          `Falha ao registrar venda no ERP (HTTP ${res.status})`
        );
      }

      const backendOrder = responseData.data;
      await refreshBackendData();

      const orderNumber = backendOrder?.orderNumber || `LUM-${Math.floor(1000 + Math.random() * 9000)}`;
      const warrantyCode = backendOrder?.warrantyCode || `GRT-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

      confetti({
        particleCount: 70,
        spread: 60,
        origin: { y: 0.6 },
      });

      showToast(`Venda ${orderNumber} de R$ ${saleData.totalAmount.toFixed(2)} confirmada e persistida no PostgreSQL!`);
      return { orderNumber, warrantyCode, newOrder: backendOrder };
    } catch (e: any) {
      console.error("Erro ao registrar venda rápida no ERP:", e);
      const msg = e?.message || "Erro de comunicação com o servidor ao processar a venda.";
      showToast(`❌ Falha na venda: ${msg}`);
      throw e;
    }
  };

  // Direct Payment Confirmation Handler (Strict PostgreSQL Persistence - No Silent Fallback)
  const handleConfirmOrderPayment = async (orderId: string) => {
    try {
      const res = await apiClient.authenticatedFetch(`/api/orders/${orderId}/transition`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          event: "CONFIRM_PAYMENT",
          targetStatus: "PAID",
          operator: currentUser?.name || "Dona da Loja",
          reason: "Confirmação manual de recebimento PIX / Dinheiro",
        }),
      });

      const responseData = await res.json().catch(() => ({}));
      if (!res.ok || !responseData.success) {
        throw new Error(
          responseData.error ||
          responseData.message ||
          `Falha ao confirmar pagamento no ERP (HTTP ${res.status})`
        );
      }

      await refreshBackendData();

      confetti({
        particleCount: 50,
        spread: 50,
        origin: { y: 0.6 },
      });
      showToast("Pagamento confirmado com sucesso no PostgreSQL! Estoque baixado e garantia emitida.");
    } catch (e: any) {
      console.error("Erro ao confirmar pagamento no ERP:", e);
      const msg = e?.message || "Erro de comunicação ao confirmar o pagamento.";
      showToast(`❌ Falha ao confirmar pagamento: ${msg}`);
      throw e;
    }
  };

  // Open consumer storefront with category & optional coupon from landing page
  const handleOpenStorefrontFromHome = (category?: string, coupon?: string) => {
    setStorefrontCategory(category || "TODOS");
    setStorefrontCoupon(coupon || "");
    setActiveTab("storefront");
  };

  // If in home landing page mode, render luxury entry portal
  if (activeTab === "home") {
    return (
      <LandingHomeExperience
        tenant={selectedTenant}
        branding={brandingConfig}
        products={products}
        resellers={resellers}
        onOpenStorefront={handleOpenStorefrontFromHome}
        onOpenAdminERP={(tab) => setActiveTab(tab || "dashboard")}
      />
    );
  }

  // If in storefront mode, render full dedicated buyer storefront experience (Nível 3: Consumidor)
  if (activeTab === "storefront" || productMode === "STORE_CONSUMER") {
    return (
      <StorefrontBuyerExperience
        tenant={selectedTenant}
        branding={brandingConfig}
        paymentSettings={paymentSettings}
        products={products}
        resellers={resellers}
        warranties={warranties}
        initialCategory={storefrontCategory}
        initialCoupon={storefrontCoupon}
        currentUser={currentUser}
        onPlaceOrder={handlePlaceBuyerOrder}
        onNavigateToERP={(tab) => {
          setProductMode("TENANT_STORE");
          setActiveTab(tab || "myStore");
        }}
        onNavigateToHome={() => {
          setProductMode("TENANT_STORE");
          setActiveTab("home");
        }}
        onNavigateToPlatform={() => {
          setProductMode("PLATFORM_OWNER");
          setActiveTab("ownerHome");
        }}
      />
    );
  }

  return (
    <div className="min-h-screen bg-[#FAF9F6] text-stone-900 flex flex-col font-sans selection:bg-amber-100 selection:text-amber-900">
      {/* Toast Notification */}
      {toastMessage && (
        <div className={`fixed bottom-6 right-6 z-50 ${toastMessage.startsWith("❌") ? "bg-rose-950 border-rose-800 text-rose-100" : "bg-stone-900 border-stone-800 text-white"} border px-4 py-3 rounded-2xl shadow-2xl flex items-center gap-3 text-xs font-medium animate-bounce`}>
          <span className={`w-2 h-2 rounded-full ${toastMessage.startsWith("❌") ? "bg-rose-400" : "bg-emerald-400"}`} />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Top Header: Platform Master Switcher (Nível 1 · Nível 2 · Nível 3) */}
      <PlatformHeader
        currentUser={currentUser}
        currentMode={productMode}
        selectedTenant={selectedTenant}
        tenants={tenants}
        onSwitchMode={(mode) => {
          setProductMode(mode);
          if (mode === "STORE_CONSUMER") {
            setActiveTab("storefront");
          } else if (activeTab === "storefront") {
            setActiveTab(mode === "PLATFORM_OWNER" ? "ownerHome" : "dashboard");
          }
        }}
        onSelectTenant={(t) => {
          setSelectedTenant(t);
          showToast(`Loja alterada para: ${t.name}`);
        }}
        onOpenStorefrontPreview={() => {
          setProductMode("STORE_CONSUMER");
          setActiveTab("storefront");
        }}
        onSwitchRole={(role) => {
          handleUpdateUser({ role });
          showToast(`Papel de loja simulado: ${role}`);
        }}
      />

      {/* If in Platform Master Mode (Produto 2), render dedicated full platform console */}
      {productMode === "PLATFORM_OWNER" ? (
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          <PlatformMasterConsole
            currentUser={currentUser}
            tenants={tenants}
            onImpersonateTenant={(t) => {
              setSelectedTenant(t);
              setProductMode("TENANT_STORE");
              setActiveTab("dashboard");
              showToast(`Acesso concedido como lojista de: ${t.name}`);
            }}
            onOpenStoreSystem={() => setProductMode("TENANT_STORE")}
            onNotify={(msg) => showToast(msg)}
          />
        </main>
      ) : (
        <>
          {/* Trial Status Banner (Pilot Client 01) */}
          <TrialStatusBanner
            remainingDays={trialRemainingDays}
            trialEndsAt={trialEndsAt}
            storeName={selectedTenant.name}
            onOpenOnboarding={() => setShowOnboardingModal(true)}
            onOpenStorefront={() => setActiveTab("myStore")}
            onOpenShareModal={() => setShowShareModal(true)}
            onOpenSettings={() => setActiveTab("storeSettings")}
            onOpenCriticalPath={() => setShowCriticalPathModal(true)}
          />

          {/* Main Layout Container with Sidebar and Content Rail */}
          <div className="flex-1 flex flex-col md:flex-row w-full min-h-screen">
            {/* Left Sidebar Navigation (Desktop) */}
            <div className="hidden md:block">
              <SidebarNavigation
                activeTab={activeTab}
                onTabChange={setActiveTab}
                tenant={selectedTenant}
                branding={brandingConfig}
                currentUser={currentUser}
                onOpenHelp={() => setShowAssistantHelpModal(true)}
                onOpenNewSale={() => setShowQuickSaleModal(true)}
                onOpenNewProduct={() => setShowQuickProductModal(true)}
                onOpenShareModal={() => setShowShareModal(true)}
                onOpenPlatformConsole={() => setProductMode("PLATFORM_OWNER")}
                pendingOrdersCount={orders.filter((o) => o.status === "PENDING" || o.status === "INVENTORY_RESERVED" || o.paymentStatus === "PENDING").length}
                isFirebaseAuthed={isFirebaseAuthed}
                onGoogleLogin={handleFirebaseGoogleLogin}
                onLogout={handleFirebaseLogout}
              />
            </div>

        {/* Right Content Area */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Header Navbar for Mobile / Quick Store Switch */}
          <div className="md:hidden">
            <HeaderNavbar
              activeTab={activeTab}
              onTabChange={setActiveTab}
              selectedTenant={selectedTenant}
              branding={brandingConfig}
              currentUser={currentUser}
              onTenantChange={setSelectedTenant}
              onOpenShareModal={() => setShowShareModal(true)}
              onOpenNewSale={() => setShowQuickSaleModal(true)}
              onOpenHelp={() => setShowAssistantHelpModal(true)}
              isFirebaseAuthed={isFirebaseAuthed}
              onGoogleLogin={handleFirebaseGoogleLogin}
              onLogout={handleFirebaseLogout}
            />
          </div>

          {/* Active Tab View Body */}
          <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
            {(activeTab === "ownerHome" || activeTab === "dashboard" || activeTab === "home") && (
              <OwnerStoreHome
                tenant={selectedTenant}
                branding={brandingConfig}
                products={products}
                orders={orders}
                customers={customers}
                warranties={warranties}
                currentUser={currentUser}
                onNavigateTab={setActiveTab}
                onOpenNewSale={() => setActiveTab("vender")}
                onOpenNewProduct={() => setShowQuickProductModal(true)}
                onOpenShareModal={() => setShowShareModal(true)}
                onOpenNewCustomer={() => setActiveTab("customers")}
                onConfirmOrderPayment={handleConfirmOrderPayment}
              />
            )}

            {activeTab === "myStore" && (
              <MyStoreShowcase
                tenant={selectedTenant}
                branding={brandingConfig}
                products={products}
                onOpenStorefront={() => setActiveTab("storefront")}
                onNavigateTab={setActiveTab}
                onOpenShareModal={() => setShowShareModal(true)}
                onUpdateInstagram={(newHandle) => {
                  setBrandingConfig((prev) => ({
                    ...prev,
                    instagramHandle: newHandle,
                  }));
                  showToast(`Instagram atualizado para ${newHandle}!`);
                }}
              />
            )}

            {(activeTab === "catalog" || activeTab === "products") && (
              <WireframeProductsCatalog
                products={products}
                onOpenNewProduct={() => setShowQuickProductModal(true)}
                onEditProduct={(p) => {
                  setShowQuickProductModal(true);
                }}
                onUpdateProduct={handleUpdateProduct}
                onUpdateStock={handleUpdateStock}
              />
            )}

            {activeTab === "inventory" && (
              <CatalogInventoryLedger
                products={products}
                ledger={ledger}
                onAddProduct={handleAddProduct}
                onUpdateProduct={handleUpdateProduct}
                onUpdateStock={handleUpdateStock}
                onReverseMovement={handleReverseMovement}
                onOpenShareModal={() => setShowShareModal(true)}
                onOpenStorefront={() => setActiveTab("storefront")}
              />
            )}

            {activeTab === "saasBilling" && (
              <SaaSControlPanel onNotify={showToast} />
            )}

            {(activeTab === "storeSettings" || activeTab === "profile") && (
              <StoreSettingsPanel
                tenant={selectedTenant}
                branding={brandingConfig}
                paymentSettings={paymentSettings}
                smtpConfig={smtpConfig}
                currentUser={currentUser}
                onUpdateUser={handleUpdateUser}
                initialSubTab={activeTab === "profile" ? "profile" : undefined}
                onUpdateBranding={handleUpdateBranding}
                onUpdatePaymentSettings={(newSettings) => {
                  setPaymentSettings(newSettings);
                  showToast("Políticas de PIX, juros e parcelamento atualizadas com sucesso!");
                }}
                onUpdateSmtpConfig={(newSmtp) => {
                  setSmtpConfig(newSmtp);
                  try {
                    localStorage.setItem("aura_store_smtp_config", JSON.stringify(newSmtp));
                  } catch (e) {}
                  showToast("Configuração do servidor SMTP e regras de disparo salvas!");
                }}
                onNavigateTab={setActiveTab}
              />
            )}

            {activeTab === "architecture" && (
              <ArchitectureView onClose={() => setActiveTab("ownerHome")} />
            )}

            {(activeTab === "consignments" || activeTab === "adjustments") && (
              <ConsignmentsManager
                consignments={consignments}
                resellers={resellers}
                products={products}
                onSettleConsignment={handleSettleConsignment}
                onCreateConsignment={handleCreateConsignment}
              />
            )}

            {activeTab === "commissions" || activeTab === "financial" ? (
              <CommissionEngine
                tiers={tiers}
                resellers={resellers}
                onUpdateTiers={setTiers}
              />
            ) : null}

            {activeTab === "warranties" && (
              <DigitalWarrantyManager
                warranties={warranties}
                orders={orders}
                onCreateWarranty={handleCreateWarranty}
              />
            )}

            {activeTab === "customJewelry" && (
              <CustomJewelryStudio
                onGenerateCustomOrder={handleGenerateCustomOrder}
              />
            )}

            {(activeTab === "vender" || activeTab === "sales") && (
              <QuickSellScreen
                products={products}
                customers={customers}
                orders={orders}
                tenant={selectedTenant}
                branding={brandingConfig}
                onCompleteSale={handleQuickNewSale}
                onNavigateTab={setActiveTab}
                onOpenOrderHistory={() => setActiveTab("orders")}
              />
            )}

            {activeTab === "orders" && (
              <UnifiedSalesOrders
                orders={orders}
                products={products}
                customers={customers}
                warranties={warranties}
                onOpenNewSale={() => setActiveTab("vender")}
                onConfirmOrderPayment={handleConfirmOrderPayment}
              />
            )}

            {activeTab === "customers" && (
              <CustomerManager
                customers={customers}
                onAddCustomer={handleAddCustomer}
                onUpdateCustomer={handleUpdateCustomer}
                onDeleteCustomer={handleDeleteCustomer}
                onRefreshData={refreshBackendData}
                onNavigateToOrder={(customerId) => {
                  setActiveTab("orders");
                }}
              />
            )}

            {activeTab === "reports" && (
              <DashboardOverview
                tenant={selectedTenant}
                products={products}
                orders={orders}
                resellers={resellers}
                consignments={consignments}
                warranties={warranties}
                onNavigateTab={setActiveTab}
              />
            )}

            {activeTab === "commercialNetwork" && (
              <CommercialNetworkModule
                resellers={resellers}
                consignments={consignments}
                products={products}
                tiers={tiers}
                onAddReseller={handleAddReseller}
                onSettleConsignment={handleSettleConsignment}
                onCreateConsignment={handleCreateConsignment}
                onUpdateTiers={setTiers}
              />
            )}

            {activeTab === "resellers" && (
              <ResellersNetworkManager
                resellers={resellers}
                onAddReseller={handleAddReseller}
              />
            )}

            {activeTab === "aiGateway" && (
              <AIGatewayMCPCopilot
                currentUser={currentUser}
                mcpActions={mcpActions}
                onExecuteMCPAction={handleExecuteMCPAction}
                onRejectMCPAction={handleRejectMCPAction}
              />
            )}

            {activeTab === "security" && (
              <SecurityAuditLGPD
                currentUser={currentUser}
                auditLogs={auditLogs}
                branding={brandingConfig}
                onNavigateTab={setActiveTab}
              />
            )}
          </main>
        </div>
      </div>
      </>
      )}

      {/* Editorial Footer */}
      <footer className="border-t border-stone-200 py-4 px-6 bg-stone-50 text-[10px] font-bold text-stone-500 uppercase tracking-[0.2em]">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex gap-4">
            <span>DB: PostgreSQL / RLS</span>
            <span>LLM Layer: AI Gateway MCP</span>
            <span>Governance: LGPD Compliant</span>
          </div>
          <div>© 2026 Lumina Semijoias SaaS & ERP Ecosystem</div>
        </div>
      </footer>
      {/* Global Share Catalog Modal */}
      <ShareCatalogModal
        isOpen={showShareModal}
        onClose={() => setShowShareModal(false)}
        tenant={selectedTenant}
        totalProducts={products.length}
      />

      {/* Onboarding Wizard Modal */}
      <OnboardingWizardModal
        isOpen={showOnboardingModal}
        onClose={() => setShowOnboardingModal(false)}
        currentTenant={selectedTenant}
        currentBranding={brandingConfig}
        onComplete={handleCompleteOnboarding}
        onNavigateToTab={(tab) => {
          setActiveTab(tab);
          setShowOnboardingModal(false);
        }}
      />

      {/* Quick New Sale Modal */}
      <QuickNewSaleModal
        isOpen={showQuickSaleModal}
        onClose={() => setShowQuickSaleModal(false)}
        products={products}
        customers={customers}
        onCompleteSale={handleQuickNewSale}
      />

      {/* Quick New Product Modal */}
      <QuickNewProductModal
        isOpen={showQuickProductModal}
        onClose={() => setShowQuickProductModal(false)}
        onAddProduct={async (p) => {
          await handleAddProduct({
            ...p,
            id: `prod-${Date.now()}`,
          } as ProductItem);
        }}
      />

      {/* Assistant Help Guided Modal */}
      <AssistantHelpModal
        isOpen={showAssistantHelpModal}
        onClose={() => setShowAssistantHelpModal(false)}
        onNavigateToTab={(tab) => {
          setActiveTab(tab);
          setShowAssistantHelpModal(false);
        }}
        onOpenNewSale={() => {
          setShowAssistantHelpModal(false);
          setShowQuickSaleModal(true);
        }}
        onOpenNewProduct={() => {
          setShowAssistantHelpModal(false);
          setShowQuickProductModal(true);
        }}
        onOpenShareCatalog={() => {
          setShowAssistantHelpModal(false);
          setShowShareModal(true);
        }}
      />

      {/* Critical Path Business Journey Modal */}
      <CriticalPathModal
        isOpen={showCriticalPathModal}
        onClose={() => setShowCriticalPathModal(false)}
        onNavigateTab={(tab) => {
          setActiveTab(tab);
          setShowCriticalPathModal(false);
        }}
        onOpenNewProduct={() => {
          setShowCriticalPathModal(false);
          setShowQuickProductModal(true);
        }}
        onOpenStorefront={() => {
          setShowCriticalPathModal(false);
          setActiveTab("storefront");
        }}
      />

      {/* Global API Loading Overlay */}
      <GlobalLoadingOverlay
        isLoading={isGlobalLoading}
        activeRequestsCount={activeRequestsCount}
        message="Sincronizando dados..."
      />
    </div>
  );
}
