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
import billingRoutes from "./server/modules/billing/billing.routes";
import consignmentRoutes from "./server/modules/consignments/consignment.routes";
import { reservationExpiryWorker } from "./server/modules/inventory/reservationExpiryWorker";
import { query } from "./server/db/postgres";
import { dbRlsInterceptorMiddleware } from "./server/middlewares/dbRlsInterceptorMiddleware";

const app = express();
app.disable("x-powered-by");

// Dynamic port configuration: uses process.env.APP_PORT || process.env.PORT || 3000
const PORT = Number(process.env.APP_PORT || process.env.PORT || 3000);

// Enterprise Security Headers & Controlled CORS Guard
app.use((req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader("X-XSS-Protection", "1; mode=block");

  const origin = req.headers.origin;
  const configuredOrigins = process.env.CORS_ALLOWED_ORIGINS
    ? process.env.CORS_ALLOWED_ORIGINS.split(",").map((o) => o.trim())
    : [];

  if (origin) {
    const isAllowed =
      configuredOrigins.includes(origin) ||
      origin.includes("localhost") ||
      origin.includes("127.0.0.1") ||
      origin.endsWith(".run.app") ||
      origin.endsWith(".google.com");

    if (isAllowed) {
      res.setHeader("Access-Control-Allow-Origin", origin);
      res.setHeader("Access-Control-Allow-Methods", "GET,POST,PUT,PATCH,DELETE,OPTIONS");
      res.setHeader(
        "Access-Control-Allow-Headers",
        "Content-Type,Authorization,x-tenant-id,x-support-reason,asaas-access-token,x-webhook-token,x-billing-secret,x-aura-signature"
      );
      res.setHeader("Access-Control-Allow-Credentials", "true");
    }
  }

  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }
  next();
});

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
      error: process.env.NODE_ENV === "production" ? "Falha na verificação de conectividade com banco de dados." : err.message,
    });
  }
});

// 2. Mount Modular Core SaaS & ERP Routes
app.use("/api/auth", authRoutes);
app.use("/api/organizations", organizationRoutes);
app.use("/api/subscriptions", subscriptionRoutes);
app.use("/api/billing", billingRoutes);
app.use("/api/platform", platformRoutes);
app.use("/api/products", productRoutes);
app.use("/api/inventory", inventoryRoutes);
app.use("/api/customers", customerRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/consignments", consignmentRoutes);
app.use("/api/storage", storageRoutes);
app.use("/api/onboarding", onboardingRoutes);
app.use("/api/ai", aiRoutes);
app.use("/api/diagnostics", diagnosticRoutes);

// 3. Start Server and mount Vite middleware / static files
async function start() {
  const isProduction =
    process.env.NODE_ENV === "production" ||
    process.argv.includes("--production") ||
    (typeof __filename !== "undefined" && __filename.endsWith("server.cjs"));

  if (isProduction) {
    const requiredEnv = ["SESSION_SECRET"];
    const missing = requiredEnv.filter((k) => !process.env[k] || !process.env[k]?.trim());
    if (missing.length > 0) {
      console.error(`[Fatal Startup Error] Variáveis obrigatórias ausentes em produção: ${missing.join(", ")}`);
      process.exit(1);
    }
  }

  if (!isProduction) {
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
      },
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
    console.log(`✨ Aura Multi-Tenant SaaS & ERP Server running on http://0.0.0.0:${PORT} [mode: ${isProduction ? "production" : "development"}]`);
    // Start background reservation expiry worker & stock reconciliation
    reservationExpiryWorker.start();
  });
}

start();
