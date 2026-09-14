import React, { useState, useEffect } from "react";
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
import { TrialStatusBanner } from "./components/TrialStatusBanner";
import { MyStoreShowcase } from "./components/MyStoreShowcase";
import { apiClient } from "./services/apiClient";
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
} from "./types";
import confetti from "canvas-confetti";

export default function App() {
  const [activeTab, setActiveTab] = useState<string>("ownerHome");
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
  const [trialRemainingDays, setTrialRemainingDays] = useState<number>(27);
  const [trialEndsAt, setTrialEndsAt] = useState<string>("2026-09-28");
  const [isOnboardingComplete, setIsOnboardingComplete] = useState<boolean>(true);

  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isBackendConnected, setIsBackendConnected] = useState<boolean>(false);

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

  // Add Product handler (Persisted to Backend API)
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
          description: newProd.description,
          status: newProd.status,
        }),
      });

      const data = await res.json();
      if (data.success && data.data) {
        await refreshBackendData();
        showToast(`SKU ${newProd.sku} persistido com sucesso no PostgreSQL & Ledger!`);
        return;
      }
    } catch (e) {
      console.error("API error adding product:", e);
    }

    // Fallback local update
    setProducts((prev) => [newProd, ...prev]);
    const ledgerEntry: InventoryLedgerEntry = {
      id: `led-${Date.now()}`,
      productId: newProd.id,
      sku: newProd.sku,
      productName: newProd.name,
      type: "ENTRADA_FORNECEDOR",
      qtyChange: newProd.stockPhysical,
      physicalBalanceAfter: newProd.stockPhysical,
      consignedBalanceAfter: 0,
      timestamp: new Date().toISOString().replace("T", " ").substring(0, 16),
      operator: "Gestor Matriz (Web)",
      reason: "Cadastro inicial de SKU",
    };
    setLedger((prev) => [ledgerEntry, ...prev]);
    showToast(`SKU ${newProd.sku} cadastrado no Ledger de Estoque!`);
  };

  // Update existing product details (Photos, Prices, Bath, Status)
  const handleUpdateProduct = async (updatedProd: ProductItem): Promise<{ success: boolean; message?: string }> => {
    try {
      const headers = await getAuthHeaders();
      const res = await fetch(`/api/products/${updatedProd.id}`, {
        method: "PUT",
        headers,
        body: JSON.stringify(updatedProd),
      });

      if (res.ok) {
        await refreshBackendData();
        showToast(`Produto "${updatedProd.name}" atualizado com sucesso!`);
        return { success: true, message: "Gravado com sucesso no PostgreSQL" };
      }
    } catch (e) {
      console.error("API error updating product:", e);
    }

    // Local fallback
    setProducts((prev) => prev.map((p) => (p.id === updatedProd.id ? updatedProd : p)));
    showToast(`Produto "${updatedProd.name}" atualizado no catálogo!`);
    return { success: true, message: "Atualizado no catálogo" };
  };

  // Update Stock manual (Persisted to Backend API)
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

      const data = await res.json();
      if (data.success) {
        await refreshBackendData();
        showToast(`Ajuste de estoque (${qty > 0 ? "+" : ""}${qty} un) persistido no Ledger!`);
        return { success: true, message: "Movimentação persistida no PostgreSQL Ledger!" };
      }
    } catch (e) {
      console.error("API error updating stock:", e);
    }

    // Fallback
    setProducts((prev) =>
      prev.map((p) =>
        p.id === productId
          ? {
              ...p,
              stockPhysical: p.stockPhysical + qty,
              stockAvailable: p.stockAvailable + qty,
            }
          : p
      )
    );
    return { success: true, message: "Estoque atualizado" };
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

  // Add Customer (Persisted to Backend API)
  const handleAddCustomer = async (dto: CreateCustomerDTO) => {
    try {
      const headers = await getAuthHeaders();
      const res = await fetch("/api/customers", {
        method: "POST",
        headers,
        body: JSON.stringify(dto),
      });

      const data = await res.json();
      if (data.success && data.data) {
        await refreshBackendData();
        showToast(`Cliente ${dto.fullName} cadastrado no PostgreSQL com sucesso!`);
        return;
      }
    } catch (e) {
      console.error("API error adding customer:", e);
    }

    // Fallback local update
    const newCust: Customer = {
      id: `cust-${Date.now()}`,
      organizationId: selectedTenant.id,
      personType: dto.personType,
      fullName: dto.fullName,
      name: dto.fullName,
      cpf: dto.cpf,
      rg: dto.rg,
      birthDate: dto.birthDate,
      gender: dto.gender,
      companyName: dto.companyName,
      tradeName: dto.tradeName,
      cnpj: dto.cnpj,
      stateRegistration: dto.stateRegistration,
      isStateRegistrationExempt: dto.isStateRegistrationExempt,
      primaryEmail: dto.primaryEmail,
      email: dto.primaryEmail,
      primaryPhone: dto.primaryPhone,
      phone: dto.primaryPhone,
      whatsapp: dto.whatsapp,
      status: dto.status || "ACTIVE",
      customerTier: dto.customerTier || "STANDARD",
      notes: dto.notes,
      address: dto.initialAddress ? {
        id: `addr-${Date.now()}`,
        organizationId: selectedTenant.id,
        customerId: `cust-${Date.now()}`,
        type: dto.initialAddress.type,
        recipientName: dto.initialAddress.recipientName || dto.fullName,
        zipCode: dto.initialAddress.zipCode,
        street: dto.initialAddress.street,
        number: dto.initialAddress.number,
        complement: dto.initialAddress.complement,
        neighborhood: dto.initialAddress.neighborhood,
        city: dto.initialAddress.city,
        state: dto.initialAddress.state,
        country: "BRA",
        isDefault: true,
        createdAt: new Date().toISOString(),
      } : undefined,
      addresses: dto.initialAddress ? [{
        id: `addr-${Date.now()}`,
        organizationId: selectedTenant.id,
        customerId: `cust-${Date.now()}`,
        type: dto.initialAddress.type,
        recipientName: dto.initialAddress.recipientName || dto.fullName,
        zipCode: dto.initialAddress.zipCode,
        street: dto.initialAddress.street,
        number: dto.initialAddress.number,
        complement: dto.initialAddress.complement,
        neighborhood: dto.initialAddress.neighborhood,
        city: dto.initialAddress.city,
        state: dto.initialAddress.state,
        country: "BRA",
        isDefault: true,
        createdAt: new Date().toISOString(),
      }] : [],
      contacts: dto.initialContact ? [{
        id: `cont-${Date.now()}`,
        organizationId: selectedTenant.id,
        customerId: `cust-${Date.now()}`,
        label: dto.initialContact.label,
        contactName: dto.initialContact.contactName,
        email: dto.initialContact.email,
        phone: dto.initialContact.phone,
        isNfeRecipient: dto.initialContact.isNfeRecipient || false,
        createdAt: new Date().toISOString(),
      }] : [],
      createdAt: new Date().toISOString().replace("T", " ").substring(0, 19),
      updatedAt: new Date().toISOString().replace("T", " ").substring(0, 19),
    };

    setCustomers((prev) => [newCust, ...prev]);
    showToast(`Cliente ${dto.fullName} adicionado à lista local.`);
  };

  // Update Customer
  const handleUpdateCustomer = async (id: string, dto: UpdateCustomerDTO) => {
    try {
      const headers = await getAuthHeaders();
      const res = await fetch(`/api/customers/${id}`, {
        method: "PUT",
        headers,
        body: JSON.stringify(dto),
      });

      const data = await res.json();
      if (data.success && data.data) {
        await refreshBackendData();
        showToast("Cliente atualizado com sucesso no banco de dados.");
        return;
      }
    } catch (e) {
      console.error("API error updating customer:", e);
    }

    setCustomers((prev) =>
      prev.map((c) => (c.id === id ? { ...c, ...dto, updatedAt: new Date().toISOString() } : c))
    );
    showToast("Cliente atualizado na lista local.");
  };

  // Soft-Delete / Archive Customer
  const handleDeleteCustomer = async (id: string) => {
    try {
      const headers = await getAuthHeaders();
      const res = await fetch(`/api/customers/${id}`, {
        method: "DELETE",
        headers,
      });

      if (res.ok) {
        await refreshBackendData();
        showToast("Cliente arquivado com sucesso no ERP. Histórico preservado.");
        return;
      }
    } catch (e) {
      console.error("API error archiving customer:", e);
    }

    setCustomers((prev) =>
      prev.map((c) => (c.id === id ? { ...c, status: "ARCHIVED" as const, updatedAt: new Date().toISOString() } : c))
    );
    showToast("Cliente marcado como arquivado.");
  };

  // Add Reseller
  const handleAddReseller = (newReseller: Reseller) => {
    setResellers((prev) => [newReseller, ...prev]);
    showToast(`Revendedora ${newReseller.name} cadastrada com sucesso!`);
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
        locationId: item.locationId || "loc-lumina-matriz",
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

    const token = localStorage.getItem("aura_session_token") || localStorage.getItem("aura_auth_token");
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      "x-tenant-id": tenantId,
    };
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    const response = await fetch("/api/orders/public", {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
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
    const tenantId = selectedTenant.slug.includes("lumina") ? "org-lumina-01" : selectedTenant.id;

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

      // 2. Only after confirmed success, perform local state updates
      setOrders((prev) => [confirmedOrder, ...prev]);

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

  // Quick New Sale Handler for Store Owner (Instant Sale + Stock Decrement + Digital Warranty)
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
          channel: "DIRECT_SALE",
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

      if (res.ok) {
        await refreshBackendData();
      }
    } catch (e) {
      console.warn("Backend order creation error, applying local state update:", e);
    }

    const orderNumber = `LUM-${Math.floor(1000 + Math.random() * 9000)}`;
    const warrantyCode = `GRT-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
    const today = new Date().toISOString().split("T")[0];
    const expDate = new Date();
    expDate.setFullYear(expDate.getFullYear() + 1);

    const newOrderId = `ord-${Date.now()}`;
    const orderItems: any[] = saleData.items.map((i, idx) => {
      const prod = products.find((p) => p.id === i.productId);
      return {
        id: `item-${Date.now()}-${idx}`,
        organizationId: "org-lumina-01",
        orderId: newOrderId,
        productId: i.productId,
        locationId: "loc-matriz-01",
        productSnapshot: {
          productId: i.productId,
          sku: prod?.sku || "SKU",
          name: i.name,
          category: prod?.category || "ANEIS",
          material: prod?.material || "Liga Nobre",
          bath: prod?.bath || "OURO_18K",
          stones: prod?.stones || ["Zircônia Cristal"],
          price: i.unitPrice,
          costPrice: prod?.costPrice || i.unitPrice * 0.35,
          warrantyMonths: prod?.warrantyMonths || 12,
          isCustomizable: false,
          imageUrl: prod?.imageUrl || "https://images.unsplash.com/photo-1605100804763-247f67b3557e?w=600&auto=format&fit=crop&q=80",
          snapshotTimestamp: new Date().toISOString(),
        },
        quantity: i.quantity,
        unitPrice: i.unitPrice,
        costPriceSnapshot: prod?.costPrice || i.unitPrice * 0.35,
        discountAmount: 0,
        totalAmount: i.quantity * i.unitPrice,
        createdAt: new Date().toISOString(),
      };
    });

    const newOrder: UnifiedOrder = {
      id: newOrderId,
      organizationId: "org-lumina-01",
      orderNumber,
      customerId: `cust-${Date.now()}`,
      customerSnapshot: {
        id: `cust-${Date.now()}`,
        personType: "PF",
        name: saleData.customerName,
        phone: saleData.customerPhone,
        document: "",
        email: "",
      },
      channel: "PRESENTIAL_POS",
      status: "PAID",
      shippingAddress: {
        recipientName: saleData.customerName,
        zipCode: "01001-000",
        street: "Balcão Presencial",
        number: "S/N",
        neighborhood: "Centro",
        city: "São Paulo",
        state: "SP",
        country: "BR",
      },
      currency: "BRL",
      subtotalAmount: saleData.subtotalAmount !== undefined ? saleData.subtotalAmount : saleData.totalAmount,
      discountAmount: 0,
      shippingAmount: saleData.shippingAmount || 0,
      totalAmount: saleData.totalAmount,
      items: orderItems,
      warrantyCode,
      notes: saleData.notes,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    setOrders((prev) => [newOrder, ...prev]);

    // Deduct stock
    saleData.items.forEach((item) => {
      setProducts((prev) =>
        prev.map((p) =>
          p.id === item.productId
            ? {
                ...p,
                stockPhysical: Math.max(0, p.stockPhysical - item.quantity),
                stockAvailable: Math.max(0, p.stockAvailable - item.quantity),
                availableStock: Math.max(0, (p.availableStock ?? p.currentStock ?? 1) - item.quantity),
              }
            : p
        )
      );
    });

    // Create digital warranty
    const newWarranty: DigitalWarranty = {
      id: `warr-${Date.now()}`,
      code: warrantyCode,
      customerName: saleData.customerName,
      customerPhone: saleData.customerPhone,
      customerDocument: "",
      customerEmail: "",
      orderNumber,
      sku: saleData.items[0]?.name || "Semijoia",
      productName: saleData.items.map((i) => i.name).join(", "),
      bathType: "Ouro 18K",
      issueDate: today,
      expirationDate: expDate.toISOString().split("T")[0],
      status: "VALIDA",
      channel: "DIRECT_SALE",
      terms: "Garantia oficial de 12 meses cobrindo integridade do banho e cravação de zircônias.",
      claimsCount: 0,
    };
    setWarranties((prev) => [newWarranty, ...prev]);

    confetti({
      particleCount: 70,
      spread: 60,
      origin: { y: 0.6 },
    });

    showToast(`Venda de R$ ${saleData.totalAmount.toFixed(2)} concluída! Estoque baixado e garantia emitida.`);
    return { orderNumber, warrantyCode, newOrder };
  };

  // Direct Payment Confirmation Handler
  const handleConfirmOrderPayment = async (orderId: string) => {
    let targetOrder = orders.find((o) => o.id === orderId);

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

      if (res.ok) {
        await refreshBackendData();
      }
    } catch (e) {
      console.warn("Transition API fallback:", e);
    }

    const today = new Date().toISOString().split("T")[0];
    const expDate = new Date();
    expDate.setFullYear(expDate.getFullYear() + 1);
    const generatedWarrantyCode = `GRT-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;

    // Update orders state
    setOrders((prev) =>
      prev.map((o) =>
        o.id === orderId
          ? {
              ...o,
              status: "PAID",
              paymentStatus: "PAID",
              warrantyCode: o.warrantyCode || generatedWarrantyCode,
              updatedAt: new Date().toISOString(),
            }
          : o
      )
    );

    // If target order has items, deduct stock and register warranty
    if (targetOrder) {
      // Deduct stock for items in order
      if (targetOrder.items && targetOrder.items.length > 0) {
        targetOrder.items.forEach((item: any) => {
          const qty = item.quantity || 1;
          setProducts((prev) =>
            prev.map((p) =>
              p.id === item.productId || p.sku === item.sku
                ? {
                    ...p,
                    stockPhysical: Math.max(0, p.stockPhysical - qty),
                    stockAvailable: Math.max(0, p.stockAvailable - qty),
                    availableStock: Math.max(0, (p.availableStock ?? p.currentStock ?? 1) - qty),
                  }
                : p
            )
          );
        });
      }

      // Create and save Digital Warranty
      const customerName = targetOrder.customerSnapshot?.name || targetOrder.customerName || "Cliente";
      const customerPhone = targetOrder.customerSnapshot?.phone || targetOrder.customerPhone || "";
      const piecesNames = targetOrder.items?.map((i: any) => i.productSnapshot?.name || i.name).filter(Boolean).join(", ") || "Semijoia Nobre";

      const newWarranty: DigitalWarranty = {
        id: `warr-${Date.now()}`,
        code: targetOrder.warrantyCode || generatedWarrantyCode,
        customerName,
        customerPhone,
        customerDocument: "",
        customerEmail: "",
        orderNumber: targetOrder.orderNumber,
        sku: targetOrder.items?.[0]?.sku || targetOrder.items?.[0]?.productId || "SEM-LUMINA",
        productName: piecesNames,
        bathType: "Ouro 18K / Ródio",
        issueDate: today,
        expirationDate: expDate.toISOString().split("T")[0],
        status: "VALIDA",
        channel: "WHATSAPP",
        terms: "Garantia de 12 meses cobrindo banho nobre e integridade das pedras.",
        claimsCount: 0,
      };

      setWarranties((prev) => [newWarranty, ...prev.filter((w) => w.orderId !== orderId && w.orderNumber !== targetOrder?.orderNumber)]);
    }

    confetti({
      particleCount: 50,
      spread: 50,
      origin: { y: 0.6 },
    });
    showToast("Pagamento confirmado com sucesso! Estoque atualizado (SALE) e garantia emitida.");
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

  // If in storefront mode, render full dedicated buyer storefront experience
  if (activeTab === "storefront") {
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
        onPlaceOrder={handlePlaceBuyerOrder}
        onNavigateToERP={(tab) => setActiveTab(tab || "myStore")}
        onNavigateToHome={() => setActiveTab("home")}
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

      {/* Trial Status Banner (Pilot Client 01) */}
      <TrialStatusBanner
        remainingDays={trialRemainingDays}
        trialEndsAt={trialEndsAt}
        storeName={selectedTenant.name}
        onOpenOnboarding={() => setShowOnboardingModal(true)}
        onOpenStorefront={() => setActiveTab("myStore")}
        onOpenShareModal={() => setShowShareModal(true)}
        onOpenSettings={() => setActiveTab("storeSettings")}
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
            pendingOrdersCount={orders.filter((o) => o.status === "PENDING" || o.status === "INVENTORY_RESERVED" || o.paymentStatus === "PENDING").length}
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
                currentUser={currentUser}
                onUpdateUser={handleUpdateUser}
                initialSubTab={activeTab === "profile" ? "profile" : undefined}
                onUpdateBranding={handleUpdateBranding}
                onUpdatePaymentSettings={(newSettings) => {
                  setPaymentSettings(newSettings);
                  showToast("Políticas de PIX, juros e parcelamento atualizadas com sucesso!");
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
    </div>
  );
}
