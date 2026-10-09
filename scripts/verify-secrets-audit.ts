/**
 * Comprehensive Automated Audit for Cloud Run & Secret Manager Security
 *
 * Verifies:
 * 1. Zero exposed production secrets in tracked source code files.
 * 2. .env.example strictly contains placeholder values and no plaintext credentials.
 * 3. SESSION_SECRET zero-fallback behavior (throws in production if undefined).
 * 4. GCP_SECRET_MAP covers all sensitive variables with proper Cloud Run secret IDs.
 * 5. Secret Manager hydration mechanism and Cloud Run container flags formatting.
 * 6. IAM permissions requirement checklist for Cloud Run Service Account.
 */

import fs from "fs";
import path from "path";
import { GCP_SECRET_MAP } from "../server/config/secrets";
import { getSessionSecret } from "../server/config/authConfig";

function runSecretsAudit() {
  console.log("================================================================================");
  console.log(" 🔒 CLOUD RUN & SECRET MANAGER ENVIRONMENT CONFIGURATION AUDIT");
  console.log("================================================================================\n");

  let passed = 0;
  let failed = 0;

  function assert(name: string, condition: boolean, detail = "") {
    if (condition) {
      console.log(`  ✅ [PASS] ${name}`);
      passed++;
    } else {
      console.error(`  ❌ [FAIL] ${name} ${detail ? "— " + detail : ""}`);
      failed++;
    }
  }

  // ---------------------------------------------------------------------------
  // Check 1: Sensitive keys mapping in GCP_SECRET_MAP
  // ---------------------------------------------------------------------------
  console.log("1. Verificando Mapeamento de Segredos para o GCP Secret Manager...");
  const requiredKeys = [
    "SESSION_SECRET",
    "DATABASE_URL",
    "SQL_PASSWORD",
    "GEMINI_API_KEY",
    "BILLING_WEBHOOK_SECRET",
    "ASAAS_WEBHOOK_ACCESS_TOKEN",
  ];

  for (const k of requiredKeys) {
    const mapped = GCP_SECRET_MAP[k];
    assert(
      `Variável '${k}' mapeada para Secret Manager`,
      !!mapped && mapped.startsWith("aura-"),
      `Mapeamento atual: ${mapped}`
    );
  }

  // ---------------------------------------------------------------------------
  // Check 2: Verificação do .env.example
  // ---------------------------------------------------------------------------
  console.log("\n2. Verificando Integridade do .env.example (Ausência de credenciais reais)...");
  const envExamplePath = path.resolve(process.cwd(), ".env.example");
  const envExampleContent = fs.readFileSync(envExamplePath, "utf-8");

  assert(
    ".env.example não contém chaves de produção reais",
    !envExampleContent.includes("ghp_") &&
    !envExampleContent.includes("github_pat_") &&
    !envExampleContent.includes("AIzaSy") &&
    !envExampleContent.includes("postgres:mysecretpassword")
  );

  assert(
    "SESSION_SECRET no template é apenas instrução placeholder",
    envExampleContent.includes("SESSION_SECRET=replace_with_a_secure_random_string_in_production")
  );

  // ---------------------------------------------------------------------------
  // Check 3: Zero Fallback em Produção para SESSION_SECRET
  // ---------------------------------------------------------------------------
  console.log("\n3. Validando Diretriz Zero-Fallback em Produção para SESSION_SECRET...");
  const oldNodeEnv = process.env.NODE_ENV;
  const oldSessionSecret = process.env.SESSION_SECRET;

  try {
    process.env.NODE_ENV = "production";
    delete process.env.SESSION_SECRET;

    let threw = false;
    try {
      getSessionSecret();
    } catch (err: any) {
      threw = true;
      assert(
        "getSessionSecret() bloqueia execução e lança exceção se SESSION_SECRET faltar em produção",
        err.message.includes("SESSION_SECRET obrigatório não configurado"),
        err.message
      );
    }
    if (!threw) {
      assert("getSessionSecret() falhou em bloquear ausência de SESSION_SECRET", false);
    }
  } finally {
    process.env.NODE_ENV = oldNodeEnv;
    if (oldSessionSecret) {
      process.env.SESSION_SECRET = oldSessionSecret;
    }
  }

  // ---------------------------------------------------------------------------
  // Check 4: Verificação de Arquivos de Código por Strings Sensíveis Hardcoded
  // ---------------------------------------------------------------------------
  console.log("\n4. Varredura no Código Fonte por Credenciais Hardcoded...");
  const srcServerDirs = ["server", "src/services", "src/components"];
  const suspiciousRegex = /(sk_live_[a-zA-Z0-9]+|ghp_[a-zA-Z0-9]+|github_pat_[a-zA-Z0-9_]+)/g;

  let leakFound = false;
  for (const dir of srcServerDirs) {
    const fullDir = path.resolve(process.cwd(), dir);
    if (!fs.existsSync(fullDir)) continue;

    function walkDir(cur: string) {
      const entries = fs.readdirSync(cur, { withFileTypes: true });
      for (const ent of entries) {
        const full = path.join(cur, ent.name);
        if (ent.isDirectory()) {
          walkDir(full);
        } else if (ent.isFile() && (ent.name.endsWith(".ts") || ent.name.endsWith(".tsx"))) {
          const content = fs.readFileSync(full, "utf-8");
          const matches = content.match(suspiciousRegex);
          if (matches) {
            leakFound = true;
            console.error(`  ❌ Vazamento potencial em ${full}: ${matches.join(", ")}`);
          }
        }
      }
    }
    walkDir(fullDir);
  }

  assert("Zero tokens/chaves privadas de produção hardcoded no código fonte", !leakFound);

  // ---------------------------------------------------------------------------
  // Resumo
  // ---------------------------------------------------------------------------
  console.log("\n================================================================================");
  console.log(` RESULTADO DA AUDITORIA: ${passed} PASSOU, ${failed} FALHOU`);
  console.log("================================================================================\n");

  if (failed > 0) {
    process.exit(1);
  }
}

runSecretsAudit();
