import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";

// Import modular routes
import authRoutes from "./server/routes/authRoutes";
import organizationRoutes from "./server/routes/organizationRoutes";
import subscriptionRoutes from "./server/routes/subscriptionRoutes";
import aiRoutes from "./server/routes/aiRoutes";
import diagnosticRoutes from "./server/routes/diagnosticRoutes";
import productRoutes from "./server/modules/products/product.routes";
import inventoryRoutes from "./server/modules/inventory/inventory.routes";
import customerRoutes from "./server/modules/customers/customer.routes";
import orderRoutes from "./server/modules/orders/order.routes";
import storageRoutes from "./server/modules/storage/storage.routes";
import onboardingRoutes from "./server/routes/onboardingRoutes";
import { reservationExpiryWorker } from "./server/modules/inventory/reservationExpiryWorker";
import { dbStore } from "./server/db/store";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

// 1. Health check & Platform SaaS Diagnostics
app.get("/api/health", (_req, res) => {
  const totalOrgs = dbStore.organizations.size;
  const totalUsers = dbStore.users.size;
  const totalProducts = dbStore.products.size;
  const totalMovements = dbStore.inventoryMovements.size;
  const activeSubs = Array.from(dbStore.subscriptions.values()).filter(
    (s) => s.status === "ACTIVE" || s.status === "TRIALING"
  ).length;

  res.json({
    status: "ok",
    environment: process.env.NODE_ENV || "development",
    hasGeminiKey: Boolean(process.env.GEMINI_API_KEY),
    platform: {
      totalOrganizations: totalOrgs,
      totalUsers: totalUsers,
      totalProducts: totalProducts,
      totalInventoryMovements: totalMovements,
      activeSubscriptions: activeSubs,
      defaultSeedTenant: "lumina",
    },
    timestamp: new Date().toISOString(),
  });
});

// 2. Mount Modular Core SaaS & ERP Routes
app.use("/api/auth", authRoutes);
app.use("/api/organizations", organizationRoutes);
app.use("/api/subscriptions", subscriptionRoutes);
app.use("/api/products", productRoutes);
app.use("/api/inventory", inventoryRoutes);
app.use("/api/customers", customerRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/storage", storageRoutes);
app.use("/api/onboarding", onboardingRoutes);
app.use("/api/ai", aiRoutes);
app.use("/api/diagnostics", diagnosticRoutes);

// 3. Start Server and mount Vite middleware / static files
async function start() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`✨ Aura Multi-Tenant SaaS & ERP Server running on http://0.0.0.0:${PORT}`);
    // Start background reservation expiry worker & stock reconciliation
    reservationExpiryWorker.start();
  });
}

start();
