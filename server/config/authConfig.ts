import crypto from "crypto";

let ephemeralDevSecret: string | null = null;

/**
 * Returns the cryptographically secure session signing secret.
 * Enforces zero hardcoded credential fallbacks in source code.
 */
export function getSessionSecret(): string {
  const secret = process.env.SESSION_SECRET;
  if (secret && secret.trim()) {
    return secret.trim();
  }

  // In production, strictly fail fast if secret is not provided via env or Secret Manager
  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "[Security Violation] SESSION_SECRET obrigatório não configurado no ambiente de produção. " +
      "Configure a variável de ambiente via Google Cloud Secret Manager ('aura-session-secret')."
    );
  }

  // In development, generate an ephemeral in-memory random secret to avoid static hardcoding
  if (!ephemeralDevSecret) {
    ephemeralDevSecret = crypto.randomBytes(32).toString("hex");
    console.warn(
      "[Security Warning] SESSION_SECRET não definido no ambiente. " +
      "Chave efêmera aleatória em memória gerada dinamicamente para esta instância."
    );
  }
  return ephemeralDevSecret;
}

