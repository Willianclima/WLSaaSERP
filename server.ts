import "dotenv/config";
import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";

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
import { query } from "./server/db/postgres";

const app = express();

// Configuration of HTTP listening port:
// - In this Google Cloud Run container environment, an internal Nginx reverse-proxy routes external requests to port 3000.
// - For standalone production deployments (Docker, VPS, Railway, Render, AWS), APP_PORT or PORT can be configured.
const PORT = process.env.APP_PORT
  ? parseInt(process.env.APP_PORT, 10)
  : (process.env.PORT && process.env.PORT !== "8080" ? parseInt(process.env.PORT, 10) : 3000);

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

// 1. Health check & Platform SaaS Diagnostics (PostgreSQL Cloud SQL backed)
app.get("/api/health", async (_req, res) => {
  try {
    const [orgs, users, products, movements, subs] = await Promise.all([
      query("SELECT count(*) as count FROM organizations"),
      query("SELECT count(*) as count FROM users"),
      query("SELECT count(*) as count FROM products"),
      query("SELECT count(*) as count FROM inventory_movements"),
      query("SELECT count(*) as count FROM subscriptions WHERE status IN ('ACTIVE', 'TRIALING')"),
    ]);

    res.json({
      status: "ok",
      database: "PostgreSQL (Cloud SQL)",
      environment: process.env.NODE_ENV || "development",
      hasGeminiKey: Boolean(process.env.GEMINI_API_KEY),
      platform: {
        totalOrganizations: parseInt(orgs.rows[0]?.count || "0", 10),
        totalUsers: parseInt(users.rows[0]?.count || "0", 10),
        totalProducts: parseInt(products.rows[0]?.count || "0", 10),
        totalInventoryMovements: parseInt(movements.rows[0]?.count || "0", 10),
        activeSubscriptions: parseInt(subs.rows[0]?.count || "0", 10),
        defaultSeedTenant: "lumina",
      },
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    res.status(500).json({ status: "error", error: err.message });
  }
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
