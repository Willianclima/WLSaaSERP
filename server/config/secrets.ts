import { SecretManagerServiceClient } from "@google-cloud/secret-manager";

/**
 * Enterprise Secrets Management Service for Aura ERP
 * 
 * Strict Zero-Fallback Policy:
 * Under no circumstances does this codebase provide hardcoded credentials or
 * insecure fallback secrets in source code. All production credentials must be
 * supplied via environment variables, container secret mounts, or directly fetched
 * from Google Cloud Secret Manager.
 */

let secretManagerClient: SecretManagerServiceClient | null = null;
const secretsCache: Map<string, string> = new Map();

function getClient(): SecretManagerServiceClient {
  if (!secretManagerClient) {
    secretManagerClient = new SecretManagerServiceClient();
  }
  return secretManagerClient;
}

/**
 * Mapping from environment variable names to GCP Secret Manager secret IDs.
 */
export const GCP_SECRET_MAP: Record<string, string> = {
  DATABASE_URL: "aura-database-url",
  SQL_PASSWORD: "aura-sql-password",
  SESSION_SECRET: "aura-session-secret",
  GEMINI_API_KEY: "aura-gemini-api-key",
  AWS_ACCESS_KEY_ID: "aura-aws-access-key-id",
  AWS_SECRET_ACCESS_KEY: "aura-aws-secret-access-key",
  R2_ACCESS_KEY_ID: "aura-r2-access-key-id",
  R2_SECRET_ACCESS_KEY: "aura-r2-secret-access-key",
};

/**
 * Retrieves a secret value strictly without insecure hardcoded fallbacks.
 * 
 * 1. Checks environment variables (e.g. injected via Cloud Run secrets).
 * 2. Checks local in-memory cache.
 * 3. If GCP Secret Manager is enabled/available, attempts remote fetch.
 * 4. Throws a descriptive error if the required credential is missing.
 */
export async function getRequiredSecret(key: string): Promise<string> {
  // 1. Direct environment variable lookup
  const envVal = process.env[key];
  if (envVal && envVal.trim()) {
    return envVal.trim();
  }

  // 2. Memory cache lookup
  if (secretsCache.has(key)) {
    return secretsCache.get(key)!;
  }

  // 3. Remote GCP Secret Manager query (if running in GCP or explicitly configured)
  const projectId = process.env.GOOGLE_CLOUD_PROJECT || process.env.GCP_PROJECT;
  const secretId = GCP_SECRET_MAP[key];

  if (projectId && secretId) {
    try {
      const client = getClient();
      const name = `projects/${projectId}/secrets/${secretId}/versions/latest`;
      const [version] = await client.accessSecretVersion({ name });
      const payload = version.payload?.data?.toString();

      if (payload && payload.trim()) {
        const trimmed = payload.trim();
        secretsCache.set(key, trimmed);
        return trimmed;
      }
    } catch (err: any) {
      console.error(`[SecretManager] Failed to fetch secret '${secretId}' for key '${key}':`, err.message || err);
    }
  }

  // 4. Strict Zero-Fallback: Fail fast rather than using insecure source fallbacks
  throw new Error(
    `[Security Violation] Credencial obrigatória ausente: '${key}'. ` +
    `Por diretriz de segurança, o sistema não utiliza credenciais padrão ou fallbacks em código-fonte. ` +
    `Configure a variável no painel do Google Cloud Secret Manager ('${secretId || key}') ou no arquivo de ambiente do container.`
  );
}

/**
 * Synchronous secret retrieval.
 * If the secret is not yet cached or in process.env, validates strict absence.
 */
export function getRequiredSecretSync(key: string): string {
  const envVal = process.env[key];
  if (envVal && envVal.trim()) {
    return envVal.trim();
  }

  if (secretsCache.has(key)) {
    return secretsCache.get(key)!;
  }

  throw new Error(
    `[Security Violation] Credencial obrigatória ausente: '${key}'. ` +
    `Por diretriz de segurança, nenhum fallback em código fonte é permitido. ` +
    `Defina a variável '${key}' no ambiente ou execute 'getRequiredSecret' assincronamente na inicialização.`
  );
}
