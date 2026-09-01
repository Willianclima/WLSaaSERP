import { Router, Request, Response } from "express";
import { dbStore } from "../db/store";
import { ProductEntity } from "../modules/products/product.types";
import { InventoryMovementEntity, InventoryBalanceEntity } from "../modules/inventory/inventory.types";
import { OrganizationEntity, SubscriptionEntity } from "../types/saas";

const router = Router();

// GET /api/onboarding/status - Check onboarding status and trial details
router.get("/status", async (req: Request, res: Response) => {
  try {
    const orgId = (req.headers["x-tenant-id"] as string) || "org-lumina-01";
    let org = dbStore.organizations.get(orgId);

    if (!org) {
      // Fallback to first org
      org = Array.from(dbStore.organizations.values())[0];
    }

    if (!org) {
      return res.status(404).json({ success: false, error: "Organização não encontrada." });
    }

    const subscription = dbStore.subscriptions.get(org.id);
    const orgProducts = Array.from(dbStore.products.values()).filter((p) => p.organizationId === org.id);
    const orgOrders = Array.from(dbStore.orders.values()).filter((o) => o.organizationId === org.id);
    const orgCustomers = Array.from(dbStore.customers.values()).filter((c) => c.organizationId === org.id);

    // Calculate trial remaining days
    let trialRemainingDays = 30;
    if (subscription?.trialEndsAt) {
      const ends = new Date(subscription.trialEndsAt).getTime();
      const now = new Date().getTime();
      const diffDays = Math.max(0, Math.ceil((ends - now) / (1000 * 60 * 60 * 24)));
      trialRemainingDays = diffDays;
    }

    return res.json({
      success: true,
      data: {
        organization: org,
        subscription: subscription || {
          status: "TRIALING",
          trialStartedAt: new Date().toISOString(),
          trialEndsAt: new Date(Date.now() + 30 * 86400000).toISOString(),
        },
        trialRemainingDays,
        productsCount: orgProducts.length,
        ordersCount: orgOrders.length,
        customersCount: orgCustomers.length,
        hasProducts: orgProducts.length > 0,
        isOnboardingComplete: Boolean((org as any).onboardingCompleted),
      },
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/onboarding/save - Complete or update the onboarding wizard
router.post("/save", async (req: Request, res: Response) => {
  try {
    const orgId = (req.headers["x-tenant-id"] as string) || req.body.orgId || "org-lumina-01";
    const {
      storeIdentity,
      catalogSettings,
      serviceDelivery,
      initialProducts,
    } = req.body;

    let org = dbStore.organizations.get(orgId);
    if (!org) {
      org = {
        id: orgId,
        name: storeIdentity?.name || "Minha Loja de Semijoias",
        slug: (storeIdentity?.name || "minha-loja").toLowerCase().replace(/\s+/g, "-"),
        document: storeIdentity?.document || "00.000.000/0001-00",
        segment: "SEMIJOIAS",
        status: "ACTIVE",
        city: storeIdentity?.city || "Limeira",
        state: storeIdentity?.state || "SP",
        contactEmail: storeIdentity?.email || "contato@loja.com.br",
        contactWhatsapp: storeIdentity?.whatsapp || "(00) 00000-0000",
        createdAt: new Date().toISOString().replace("T", " ").substring(0, 16),
        updatedAt: new Date().toISOString().replace("T", " ").substring(0, 16),
      };
      dbStore.organizations.set(orgId, org);
    }

    // 1. Update Organization with Store Identity & Delivery Details
    org.name = storeIdentity?.name || org.name;
    org.document = storeIdentity?.document || org.document;
    org.contactWhatsapp = serviceDelivery?.orderWhatsapp || storeIdentity?.whatsapp || org.contactWhatsapp;
    org.contactEmail = storeIdentity?.email || org.contactEmail;
    org.city = storeIdentity?.city || org.city;
    org.state = storeIdentity?.state || org.state;
    org.logoUrl = catalogSettings?.logoUrl || org.logoUrl;
    (org as any).ownerName = storeIdentity?.ownerName;
    (org as any).instagram = storeIdentity?.instagram;
    (org as any).storefrontName = catalogSettings?.storefrontName || org.name;
    (org as any).bio = catalogSettings?.bio;
    (org as any).bannerUrl = catalogSettings?.bannerUrl;
    (org as any).primaryColor = catalogSettings?.primaryColor || "#D97706";
    (org as any).secondaryColor = catalogSettings?.secondaryColor || "#1C1917";
    (org as any).businessHours = serviceDelivery?.businessHours;
    (org as any).deliveryOptions = serviceDelivery?.deliveryOptions;
    (org as any).onboardingCompleted = true;
    (org as any).onboardingCompletedAt = new Date().toISOString();
    org.updatedAt = new Date().toISOString().replace("T", " ").substring(0, 16);

    dbStore.organizations.set(org.id, org);

    // 2. Ensure Trial Subscription is active
    let sub = dbStore.subscriptions.get(org.id);
    if (!sub) {
      const now = new Date();
      const trialEnd = new Date(now.getTime() + 30 * 86400000);
      sub = {
        id: `sub-${org.id}`,
        organizationId: org.id,
        planId: "TRIAL_30D",
        status: "TRIALING",
        trialStartedAt: now.toISOString().replace("T", " ").substring(0, 16),
        trialEndsAt: trialEnd.toISOString().replace("T", " ").substring(0, 16),
        currentPeriodStart: now.toISOString().replace("T", " ").substring(0, 16),
        currentPeriodEnd: trialEnd.toISOString().replace("T", " ").substring(0, 16),
        paymentMethod: "MANUAL_TRIAL",
        autoRenew: true,
        createdAt: now.toISOString().replace("T", " ").substring(0, 16),
        updatedAt: now.toISOString().replace("T", " ").substring(0, 16),
      };
      dbStore.subscriptions.set(org.id, sub);
    }

    // 3. Process Initial Products if provided
    let insertedCount = 0;
    if (Array.isArray(initialProducts) && initialProducts.length > 0) {
      for (const item of initialProducts) {
        if (!item.name || !item.sku) continue;

        const prodId = `prod-${org.id}-${item.sku.toLowerCase().replace(/[^a-z0-9]/g, "-")}`;
        const newProduct: ProductEntity = {
          id: prodId,
          organizationId: org.id,
          sku: item.sku.trim().toUpperCase(),
          name: item.name.trim(),
          description: item.description || `Semijoia ${item.name.trim()} banhada com verniz italiano e garantia de ${item.warrantyMonths || 12} meses.`,
          category: item.category || "ANEIS",
          collection: "Coleção Essencial",
          material: "Liga Nobre Antialérgica",
          bath: item.bath || "OURO_18K",
          stones: ["Zircônia Cristal"],
          price: Number(item.price) || 99.0,
          costPrice: Number(item.costPrice) || 30.0,
          warrantyMonths: Number(item.warrantyMonths) || 12,
          isCustomizable: false,
          status: "ATIVO",
          imageUrl: item.imageUrl || "https://images.unsplash.com/photo-1605100804763-247f67b3557e?w=600&auto=format&fit=crop&q=80",
          createdAt: new Date().toISOString().replace("T", " ").substring(0, 16),
          updatedAt: new Date().toISOString().replace("T", " ").substring(0, 16),
        };

        dbStore.products.set(prodId, newProduct);

        // Seed inventory balance for headquarters
        const locId = "loc-lumina-matriz";
        const balanceKey = `${prodId}:${locId}`;
        const stockQty = Number(item.stock) || 1;
        const balance: InventoryBalanceEntity = {
          id: `bal-${balanceKey}`,
          organizationId: org.id,
          productId: prodId,
          locationId: locId,
          onHandQuantity: stockQty,
          reservedQuantity: 0,
          availableQuantity: stockQty,
          createdAt: new Date().toISOString().replace("T", " ").substring(0, 16),
          updatedAt: new Date().toISOString().replace("T", " ").substring(0, 16),
        };
        dbStore.inventoryBalances.set(balanceKey, balance);

        // Seed initial purchase/inventory entry movement
        const movId = `mov-init-${prodId}`;
        const movement: InventoryMovementEntity = {
          id: movId,
          organizationId: org.id,
          productId: prodId,
          locationId: locId,
          type: "PURCHASE",
          quantityChange: stockQty,
          physicalBalanceAfter: stockQty,
          consignedBalanceAfter: 0,
          onHandAfter: stockQty,
          reservedAfter: 0,
          availableAfter: stockQty,
          referenceType: "INITIAL_STOCK",
          operatorName: (org as any).ownerName || "Consultora Titular",
          notes: "Carga inicial via Assistente de Onboarding da Consultora",
          createdAt: new Date().toISOString().replace("T", " ").substring(0, 16),
        };
        dbStore.inventoryMovements.set(movId, movement);

        insertedCount++;
      }
    }

    // Persist all state to disk immediately
    dbStore.saveToDisk();

    return res.json({
      success: true,
      message: "Onboarding concluído e loja publicada com sucesso!",
      data: {
        organization: org,
        productsConfigured: insertedCount,
        trialStatus: "TRIALING",
      },
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
