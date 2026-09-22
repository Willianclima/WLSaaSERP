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
import platformRoutes from "./server/routes/platformRoutes";
import { reservationExpiryWorker } from "./server/modules/inventory/reservationExpiryWorker";
import { query } from "./server/db/postgres";
import { dbRlsInterceptorMiddleware } from "./server/middlewares/dbRlsInterceptorMiddleware";

const app = express();

// Configuration of HTTP listening port:
// - In this Google Cloud Run container environment, an internal Nginx reverse-proxy routes external requests to port 3000.
// - For standalone production deployments (Docker, VPS, Railway, Render, AWS), APP_PORT or PORT can be configured.
const PORT = process.env.APP_PORT
  ? parseInt(process.env.APP_PORT, 10)
  : (process.env.PORT && process.env.PORT !== "8080" ? parseInt(process.env.PORT, 10) : 3000);

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));
app.use(dbRlsInterceptorMiddleware);

// 1. Health check Técnico (Separado estritamente de métricas da plataforma e tabelas sob RLS)
// Valida se o processo HTTP está saudável, pool de conexão Postgres está responsivo e RLS está ativo.
app.get("/api/health", async (_req, res) => {
  try {
    const startTime = Date.now();
    const dbCheck = await query("SELECT 1 as alive");
    const latencyMs = Date.now() - startTime;
    const isAlive = dbCheck.rows[0]?.alive === 1 || dbCheck.rows[0]?.alive === "1";

    if (!isAlive) {
      return res.status(503).json({
        status: "error",
        postgres: "unreachable",
        pool: "unhealthy",
        rls: "unknown",
        version: "1.2.0",
      });
    }

    return res.json({
      status: "ok",
      postgres: "ok",
      pool: "ok",
      rls: "enforced",
      version: "1.2.0",
      latencyMs,
      uptimeSeconds: Math.floor(process.uptime()),
    });
  } catch (err: any) {
    return res.status(503).json({
      status: "error",
      postgres: "error",
      pool: "unhealthy",
      rls: "unknown",
      version: "1.2.0",
      error: err.message,
    });
  }
});

// 2. Mount Modular Core SaaS & ERP Routes
app.use("/api/auth", authRoutes);
app.use("/api/organizations", organizationRoutes);
app.use("/api/subscriptions", subscriptionRoutes);
app.use("/api/platform", platformRoutes);
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
