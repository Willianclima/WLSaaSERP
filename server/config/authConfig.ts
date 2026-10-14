import crypto from "crypto";
import { isProduction } from "./environment";

let instanceSessionSecret: string | null = null;

/**
 * Returns the cryptographically secure session signing secret.
 * Prioritizes standard SESSION_SECRET environment variable.
 * If unset (e.g. during Cloud Run deployments with restricted Secret Manager),
 * generates a secure 256-bit ephemeral secret in memory so the container boots and serves traffic safely.
 */
export function getSessionSecret(): string {
  const secret = process.env.SESSION_SECRET;
  if (secret && secret.trim()) {
    return secret.trim();
  }

  if (instanceSessionSecret) {
    return instanceSessionSecret;
  }

  // Generate cryptographically secure 256-bit random key
  instanceSessionSecret = crypto.randomBytes(32).toString("hex");

  if (isProduction()) {
    console.warn(
      `[AURA Cloud Run Notice] Variável 'SESSION_SECRET' não encontrada no ambiente do Cloud Run. ` +
      `Gerada chave HMAC segura de 256 bits para esta instância. ` +
      `Para persistir sessões de usuários entre reinicializações de container, defina 'SESSION_SECRET' ` +
      `em 'Variables & Secrets -> Environment Variables' no Cloud Run (dispensa Secret Manager).`
    );
  } else {
    console.warn(
      "[Security Notice] SESSION_SECRET não definido no ambiente de desenvolvimento. " +
      "Chave efêmera aleatória em memória gerada dinamicamente para esta instância."
    );
  }

  return instanceSessionSecret;
}

