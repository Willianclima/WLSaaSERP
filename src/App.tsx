import React, { useState } from "react";
import { HeaderNavbar } from "./components/HeaderNavbar";
import { OwnerStoreHome } from "./components/OwnerStoreHome";
import { QuickNewSaleModal } from "./components/QuickNewSaleModal";
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
import { TrialStatusBanner } from "./components/TrialStatusBanner";

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
  const [selectedTenant, setSelectedTenant] = useState<TenantStore>(mockTenants[0]);
  const [currentUser] = useState<RBACUser>(mockCurrentUser);
  const [brandingConfig, setBrandingConfig] = useState<StoreBrandingConfig>(DEFAULT_BRANDING_CONFIG);
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
  const [trialRemainingDays, setTrialRemainingDays] = useState<number>(27);
  const [trialEndsAt, setTrialEndsAt] = useState<string>("2026-09-28");
  const [isOnboardingComplete, setIsOnboardingComplete] = useState<boolean>(true);

  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isBackendConnected, setIsBackendConnected] = useState<boolean>(false);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Check onboarding status and trial info
  const checkOnboardingStatus = async () => {
    try {
      const tenantId = selectedTenant.slug.includes("lumina") ? "org-lumina-01" : selectedTenant.id;
      const res = await fetch("/api/onboarding/status", { headers: { "x-tenant-id": tenantId } });
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
    const tenantId = selectedTenant.slug.includes("lumina") ? "org-lumina-01" : selectedTenant.id;
    const res = await fetch("/api/onboarding/save", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-tenant-id": tenantId,
      },
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
    if (payload.catalogSettings) {
      setBrandingConfig((prev) => ({
        ...prev,
        logoText: payload.catalogSettings.storefrontName || prev.logoText,
        logoUrl: payload.catalogSettings.logoUrl || prev.logoUrl,
        primaryColor: payload.catalogSettings.primaryColor || prev.primaryColor,
        secondaryColor: payload.catalogSettings.secondaryColor || prev.secondaryColor,
        tagline: payload.catalogSettings.bio || prev.tagline,
      }));
    }

    setIsOnboardingComplete(true);
    await refreshBackendData();
    showToast("🎉 Loja configurada e persistida no servidor com sucesso!");
  };

  // Sync Products, Ledger, Customers and Orders from Real ERP API
  const refreshBackendData = async () => {
    try {
      const tenantId = selectedTenant.slug.includes("lumina") ? "org-lumina-01" : selectedTenant.id;
      const headers = { "x-tenant-id": tenantId };

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
    setSelectedTenant((prev) => ({
      ...prev,
      name: newBranding.logoText || prev.name,
      logo: newBranding.logoUrl || prev.logo,
    }));
    showToast("Identidade visual e branding da loja salvos com sucesso!");
  };

  // Add Product handler (Persisted to Backend API)
  const handleAddProduct = async (newProd: ProductItem) => {
    try {
      const tenantId = selectedTenant.slug.includes("lumina") ? "org-lumina-01" : selectedTenant.id;
      const res = await fetch("/api/products", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-tenant-id": tenantId,
        },
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
  const handleUpdateProduct = async (updatedProd: ProductItem) => {
    try {
      const tenantId = selectedTenant.slug.includes("lumina") ? "org-lumina-01" : selectedTenant.id;
      const res = await fetch(`/api/products/${updatedProd.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "x-tenant-id": tenantId,
        },
        body: JSON.stringify(updatedProd),
      });

      if (res.ok) {
        await refreshBackendData();
        showToast(`Produto "${updatedProd.name}" atualizado com sucesso!`);
        return;
      }
    } catch (e) {
      console.error("API error updating product:", e);
    }

    // Local fallback
    setProducts((prev) => prev.map((p) => (p.id === updatedProd.id ? updatedProd : p)));
    showToast(`Produto "${updatedProd.name}" atualizado no catálogo!`);
  };

  // Update Stock manual (Persisted to Backend API)
  const handleUpdateStock = async (productId: string, qty: number, reason: string) => {
    try {
      const tenantId = selectedTenant.slug.includes("lumina") ? "org-lumina-01" : selectedTenant.id;
      const res = await fetch("/api/inventory/movement", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-tenant-id": tenantId,
        },
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
        return;
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
  };

  // Reverse Ledger Movement (Immutable Reversal)
  const handleReverseMovement = async (originalMovementId: string, reason: string) => {
    try {
      const tenantId = selectedTenant.slug.includes("lumina") ? "org-lumina-01" : selectedTenant.id;
      const res = await fetch("/api/inventory/reverse", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-tenant-id": tenantId,
        },
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
      const tenantId = selectedTenant.slug.includes("lumina") ? "org-lumina-01" : selectedTenant.id;
      const res = await fetch("/api/customers", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-tenant-id": tenantId,
        },
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
      const tenantId = selectedTenant.slug.includes("lumina") ? "org-lumina-01" : selectedTenant.id;
      const res = await fetch(`/api/customers/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "x-tenant-id": tenantId,
        },
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
      const tenantId = selectedTenant.slug.includes("lumina") ? "org-lumina-01" : selectedTenant.id;
      const res = await fetch(`/api/customers/${id}`, {
        method: "DELETE",
        headers: {
          "x-tenant-id": tenantId,
        },
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

  // Place Buyer Order from Storefront
  const handlePlaceBuyerOrder = (newOrder: any) => {
    setOrders((prev) => [newOrder, ...prev]);

    const custName = newOrder.customerSnapshot?.name || newOrder.customer?.name || "Cliente Storefront";
    const custDoc = newOrder.customerSnapshot?.document || newOrder.customer?.document || "***.***.***-**";
    const custPhone = newOrder.customerSnapshot?.phone || newOrder.customer?.phone || "";
    const custEmail = newOrder.customerSnapshot?.email || newOrder.customer?.email || "";

    // 1. Auto generate digital warranty for the order
    const warrantyCode = newOrder.warrantyCode || `GRT-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
    const firstItem = newOrder.items?.[0];
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
      orderNumber: newOrder.orderNumber,
      sku: firstItem?.productSnapshot?.sku || firstItem?.sku || "SKU-001",
      productName: firstItem?.productSnapshot?.name || firstItem?.productName || "Semijoia Lumina",
      bathType: firstItem?.productSnapshot?.bath || prod?.bath || "OURO_18K",
      issueDate: issueDate,
      expirationDate: expDate.toISOString(),
      status: "VALIDA",
      terms: "Garantia de 12 meses cobrindo defeitos de fabricação, desprendimento de zircônias e desgaste anômalo do banho metálico.",
      channel: newOrder.channel,
      resellerName: newOrder.resellerName,
      claimsCount: 0,
    };
    setWarranties((prev) => [newWarranty, ...prev]);

    // 2. Adjust inventory according to Order Status (Reserva de Estoque vs Baixa Física)
    const isReservation =
      newOrder.status === "INVENTORY_RESERVED" ||
      newOrder.status === "PENDING_CONFIRMATION" ||
      newOrder.status === "AWAITING_PAYMENT" ||
      newOrder.status === "DRAFT";
    setProducts((prev) =>
      prev.map((p) => {
        const orderItem = newOrder.items?.find((it: any) => it.productId === p.id);
        if (orderItem) {
          if (isReservation) {
            // Reserva de Estoque: aumenta reservado, diminui disponível, mantém físico
            const newReserved = (p.stockReserved || 0) + orderItem.quantity;
            const newAvailable = Math.max(0, p.stockPhysical - newReserved);
            return {
              ...p,
              stockReserved: newReserved,
              stockAvailable: newAvailable,
            };
          } else {
            // Baixa Imediata Física
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

    // 3. Add to ledger
    newOrder.items?.forEach((item: any) => {
      const itemSku = item.productSnapshot?.sku || item.sku || "SKU-N/A";
      const itemName = item.productSnapshot?.name || item.productName || "Produto Semijoia";
      const ledgerEntry: InventoryLedgerEntry = {
        id: `led-${Date.now()}-${item.productId}`,
        productId: item.productId,
        sku: itemSku,
        productName: itemName,
        type: newOrder.channel === "B2B_RESELLER" || newOrder.channel === "REVENDEDORA" ? "VENDA_REVENDEDORA" : "VENDA_DIRETA",
        qtyChange: -item.quantity,
        physicalBalanceAfter: Math.max(0, (products.find((p) => p.id === item.productId)?.stockPhysical || 1) - item.quantity),
        consignedBalanceAfter: products.find((p) => p.id === item.productId)?.stockConsigned || 0,
        timestamp: new Date().toISOString().replace("T", " ").substring(0, 16),
        resellerId: newOrder.resellerId,
        resellerName: newOrder.resellerName,
        orderNumber: newOrder.orderNumber,
        operator: "Checkout do Comprador (E-commerce)",
        reason: isReservation
          ? `Reserva de estoque no storefront para WhatsApp - Pedido ${newOrder.orderNumber}`
          : `Venda B2C via ${newOrder.channel} - Pedido ${newOrder.orderNumber}`,
      };
      setLedger((prev) => [ledgerEntry, ...prev]);
    });

    // 4. If reseller linked, update reseller sales & commission
    if (newOrder.resellerId) {
      setResellers((prev) =>
        prev.map((r) =>
          r.id === newOrder.resellerId
            ? {
                ...r,
                totalSalesAccumulated: r.totalSalesAccumulated + newOrder.totalAmount,
                pendingCommissionValue:
                  r.pendingCommissionValue +
                  (newOrder.totalAmount * (r.commissionDirectRate / 100)),
              }
            : r
        )
      );
    }

    // 5. Audit log
    const auditEntry: AuditLogEntry = {
      id: `aud-${Date.now()}`,
      action: "STOREFRONT_ORDER_PLACED",
      entity: "Order",
      entityId: newOrder.orderNumber,
      userName: custName,
      userEmail: custEmail,
      actor: "Comprador B2C (Storefront)",
      userRole: "LOJA_ADMIN",
      status: "SUCESSO",
      ipAddress: "189.44.120.18",
      userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)",
      timestamp: new Date().toISOString().replace("T", " ").substring(0, 19),
      details: `Novo pedido ${newOrder.orderNumber} realizado pelo cliente ${custName} (R$ ${Number(newOrder.totalAmount).toFixed(2)}) com emissão de garantia digital ${warrantyCode}.`,
      changes: {
        orderNumber: newOrder.orderNumber,
        totalAmount: newOrder.totalAmount,
        channel: newOrder.channel,
        resellerName: newOrder.resellerName,
        warrantyCode: warrantyCode,
      },
    };
    setAuditLogs((prev) => [auditEntry, ...prev]);

    showToast(`Pedido ${newOrder.orderNumber} realizado com sucesso! Garantia ${warrantyCode} emitida.`);
  };

  // Quick New Sale Handler for Store Owner (Instant Sale + Stock Decrement + Digital Warranty)
  const handleQuickNewSale = async (saleData: {
    customerName: string;
    customerPhone: string;
    items: { productId: string; name: string; quantity: number; unitPrice: number }[];
    totalAmount: number;
    paymentMethod: "PIX" | "CREDIT_CARD" | "DEBIT_CARD" | "CASH";
    notes?: string;
  }) => {
    try {
      const tenantId = selectedTenant.slug.includes("lumina") ? "org-lumina-01" : selectedTenant.id;
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-tenant-id": tenantId,
        },
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
      subtotalAmount: saleData.totalAmount,
      discountAmount: 0,
      shippingAmount: 0,
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
  };

  // Direct Payment Confirmation Handler
  const handleConfirmOrderPayment = async (orderId: string) => {
    try {
      const tenantId = selectedTenant.slug.includes("lumina") ? "org-lumina-01" : selectedTenant.id;
      const res = await fetch(`/api/orders/${orderId}/transition`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-tenant-id": tenantId,
        },
        body: JSON.stringify({
          targetStatus: "PAID",
          operator: "Dona da Loja",
          reason: "Confirmação manual de recebimento PIX / Dinheiro",
        }),
      });

      if (res.ok) {
        await refreshBackendData();
      }
    } catch (e) {
      console.warn("Transition API fallback:", e);
    }

    setOrders((prev) =>
      prev.map((o) => (o.id === orderId ? { ...o, status: "PAID", updatedAt: new Date().toISOString() } : o))
    );

    confetti({
      particleCount: 50,
      spread: 50,
      origin: { y: 0.6 },
    });
    showToast("Pagamento confirmado com sucesso! Pedido liberado.");
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
        onNavigateToERP={(tab) => setActiveTab(tab || "dashboard")}
        onNavigateToHome={() => setActiveTab("home")}
      />
    );
  }

  return (
    <div className="min-h-screen bg-[#FAF9F6] text-stone-900 flex flex-col font-sans selection:bg-amber-100 selection:text-amber-900">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-stone-900 border border-stone-800 text-white px-4 py-3 rounded-2xl shadow-2xl flex items-center gap-3 text-xs font-medium animate-bounce">
          <span className="w-2 h-2 rounded-full bg-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Trial Status Banner (Pilot Client 01) */}
      <TrialStatusBanner
        remainingDays={trialRemainingDays}
        trialEndsAt={trialEndsAt}
        storeName={selectedTenant.name}
        onOpenOnboarding={() => setShowOnboardingModal(true)}
        onOpenStorefront={() => setActiveTab("storefront")}
        onOpenShareModal={() => setShowShareModal(true)}
        onOpenSettings={() => setActiveTab("storeSettings")}
      />

      {/* Main App Navigation */}
      <HeaderNavbar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        selectedTenant={selectedTenant}
        branding={brandingConfig}
        onTenantChange={setSelectedTenant}
        onOpenShareModal={() => setShowShareModal(true)}
        onOpenNewSale={() => setShowQuickSaleModal(true)}
      />

      {/* Active Tab View Body */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">
        {(activeTab === "ownerHome" || activeTab === "dashboard" || activeTab === "home") && (
          <OwnerStoreHome
            tenant={selectedTenant}
            branding={brandingConfig}
            products={products}
            orders={orders}
            customers={customers}
            warranties={warranties}
            onNavigateTab={setActiveTab}
            onOpenNewSale={() => setShowQuickSaleModal(true)}
            onOpenNewProduct={() => setShowQuickProductModal(true)}
            onOpenShareModal={() => setShowShareModal(true)}
            onConfirmOrderPayment={handleConfirmOrderPayment}
          />
        )}

        {activeTab === "saasBilling" && (
          <SaaSControlPanel onNotify={showToast} />
        )}

        {activeTab === "storeSettings" && (
          <StoreSettingsPanel
            tenant={selectedTenant}
            branding={brandingConfig}
            paymentSettings={paymentSettings}
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

        {(activeTab === "catalog" || activeTab === "inventory") && (
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

        {activeTab === "consignments" && (
          <ConsignmentsManager
            consignments={consignments}
            resellers={resellers}
            products={products}
            onSettleConsignment={handleSettleConsignment}
            onCreateConsignment={handleCreateConsignment}
          />
        )}

        {activeTab === "commissions" && (
          <CommissionEngine
            tiers={tiers}
            resellers={resellers}
            onUpdateTiers={setTiers}
          />
        )}

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

        {activeTab === "orders" && (
          <UnifiedSalesOrders
            orders={orders}
            products={products}
            customers={customers}
            resellers={resellers}
            onIssueWarrantyFromOrder={handleIssueWarrantyFromOrder}
            onRefreshData={refreshBackendData}
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
    </div>
  );
}
