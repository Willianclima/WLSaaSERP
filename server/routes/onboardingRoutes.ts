import { Router, Response } from "express";
import { query } from "../db/postgres";
import { orgRepo, subRepo } from "../repositories";
import { productRepo } from "../modules/products/product.repository";
import { inventoryRepo } from "../modules/inventory/inventory.repository";
import { ProductEntity } from "../modules/products/product.types";
import { InventoryMovementEntity, InventoryBalanceEntity } from "../modules/inventory/inventory.types";
import { authMiddleware, AuthenticatedRequest } from "../middlewares/authMiddleware";

const router = Router();

// Protect all onboarding endpoints: Usuário autenticado -> Membership ativo -> Tenant permitido
router.use(authMiddleware);

// GET /api/onboarding/status - Check onboarding status and trial details strictly for authenticated tenant
router.get("/status", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const org = req.tenant;
    if (!org) {
      return res.status(404).json({ success: false, error: "Organização autenticada não encontrada." });
    }
    const orgId = req.organizationId!;

    const subscription = await subRepo.findByOrgId(org.id);

    const [prodCountRes, ordCountRes, custCountRes] = await Promise.all([
      query("SELECT count(*) as count FROM products WHERE organization_id = $1", [org.id]),
      query("SELECT count(*) as count FROM orders WHERE organization_id = $1", [org.id]),
      query("SELECT count(*) as count FROM customers WHERE organization_id = $1", [org.id]),
    ]);

    const productsCount = parseInt(prodCountRes.rows[0]?.count || "0", 10);
    const ordersCount = parseInt(ordCountRes.rows[0]?.count || "0", 10);
    const customersCount = parseInt(custCountRes.rows[0]?.count || "0", 10);

    // Calculate trial remaining days
    let trialRemainingDays = 30;
    if (subscription?.trialEndsAt) {
      const ends = new Date(subscription.trialEndsAt).getTime();
      const now = new Date().getTime();
      const diffDays = Math.max(0, Math.ceil((ends - now) / (1000 * 60 * 60 * 24)));
      trialRemainingDays = diffDays;
    }

    // Retrieve active launch discount if configured
    let launchDiscount: any = (org as any).launchDiscount || null;
    try {
      const discountRes = await query(
        "SELECT details FROM audit_logs WHERE organization_id = $1 AND action = 'ONBOARDING_LAUNCH_DISCOUNT' ORDER BY created_at DESC LIMIT 1",
        [org.id]
      );
      if (discountRes.rows.length > 0 && discountRes.rows[0].details) {
        launchDiscount = typeof discountRes.rows[0].details === "string"
          ? JSON.parse(discountRes.rows[0].details)
          : discountRes.rows[0].details;
      }
    } catch (e) {
      // Non-blocking fallback
    }

    return res.json({
      success: true,
      data: {
        organization: {
          ...org,
          launchDiscount,
        },
        subscription: subscription || {
          status: "TRIALING",
          trialStartedAt: new Date().toISOString(),
          trialEndsAt: new Date(Date.now() + 30 * 86400000).toISOString(),
        },
        trialRemainingDays,
        productsCount,
        ordersCount,
        customersCount,
        hasProducts: productsCount > 0,
        isOnboardingComplete: Boolean((org as any).onboardingCompleted),
        launchDiscount,
      },
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/onboarding/launch-discount - Get active launch discount configuration for authenticated tenant
router.get("/launch-discount", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const orgId = req.organizationId!;
    const discountRes = await query(
      "SELECT details FROM audit_logs WHERE organization_id = $1 AND action = 'ONBOARDING_LAUNCH_DISCOUNT' ORDER BY created_at DESC LIMIT 1",
      [orgId]
    );

    let launchDiscount = null;
    if (discountRes.rows.length > 0 && discountRes.rows[0].details) {
      launchDiscount = typeof discountRes.rows[0].details === "string"
        ? JSON.parse(discountRes.rows[0].details)
        : discountRes.rows[0].details;
    }

    return res.json({
      success: true,
      data: launchDiscount,
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/onboarding/save - Complete or update the onboarding wizard strictly in authenticated tenant context
router.post("/save", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const orgId = req.organizationId!;
    const org = req.tenant;
    if (!org) {
      return res.status(404).json({
        success: false,
        error: "Organização autenticada não encontrada no sistema.",
      });
    }

    // Multi-tenant isolation: Never trust client-supplied organizationId or orgId in body
    const untrustedBodyOrgId = req.body && (req.body.orgId || req.body.organizationId);
    if (untrustedBodyOrgId && untrustedBodyOrgId !== orgId) {
      return res.status(403).json({
        success: false,
        error: `Tentativa de violação multi-tenant bloqueada: o organizationId enviado (${untrustedBodyOrgId}) difere da sua organização autenticada (${orgId}). O onboarding deve respeitar estritamente o contexto de organização autenticado.`,
      });
    }

    const {
      storeIdentity,
      catalogSettings,
      serviceDelivery,
      initialProducts,
      launchDiscount,
    } = req.body || {};
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
    
    // Save launch discount configuration if provided
    if (launchDiscount) {
      (org as any).launchDiscount = launchDiscount;
      try {
        await query(
          `INSERT INTO audit_logs (id, organization_id, action, entity, ip_address, details)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [
            `log-launch-discount-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
            org.id,
            "ONBOARDING_LAUNCH_DISCOUNT",
            "LAUNCH_DISCOUNT",
            req.ip || "127.0.0.1",
            JSON.stringify(launchDiscount),
          ]
        );
      } catch (err) {
        console.error("Failed to log launch discount in PostgreSQL audit_logs:", err);
      }
    }

    org.updatedAt = new Date().toISOString();

    await orgRepo.update(org.id, org);

    // 2. Ensure Trial Subscription is active
    let sub = await subRepo.findByOrgId(org.id);
    if (!sub) {
      const now = new Date();
      const trialEnd = new Date(now.getTime() + 30 * 86400000);
      sub = {
        id: `sub-${org.id}`,
        organizationId: org.id,
        planId: "TRIAL_30D",
        status: "TRIALING",
        trialStartedAt: now.toISOString(),
        trialEndsAt: trialEnd.toISOString(),
        currentPeriodStart: now.toISOString(),
        currentPeriodEnd: trialEnd.toISOString(),
        paymentMethod: "MANUAL_TRIAL",
        autoRenew: true,
        createdAt: now.toISOString(),
        updatedAt: now.toISOString(),
      };
      await subRepo.create(sub);
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
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        await productRepo.create(newProduct);

        // Seed inventory balance for headquarters
        const orgLocations = await inventoryRepo.listLocations(org.id);
        const defaultLoc = orgLocations.find((l) => l.type === "HEADQUARTERS" || l.code === "MATRIZ") || orgLocations[0];
        const locId = defaultLoc ? defaultLoc.id : "loc-lumina-matriz";
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
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        await inventoryRepo.upsertBalance(balance);

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
          createdAt: new Date().toISOString(),
        };
        await inventoryRepo.createMovement(movement);

        insertedCount++;
      }
    }

    return res.json({
      success: true,
      message: "Onboarding concluído e loja publicada com sucesso!",
      data: {
        organization: org,
        productsConfigured: insertedCount,
        trialStatus: "TRIALING",
        launchDiscount: launchDiscount || null,
      },
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
