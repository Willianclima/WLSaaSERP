import { Request, Response, NextFunction } from "express";

interface AttemptRecord {
  failures: number;
  lastFailureAt: number;
  lockedUntil?: number;
}

const attemptsByIp = new Map<string, AttemptRecord>();
const attemptsByEmail = new Map<string, AttemptRecord>();

const MAX_FAILURES = 5;
const LOCKOUT_WINDOW_MS = 15 * 60 * 1000; // 15 minutos
const ATTEMPT_EXPIRY_MS = 15 * 60 * 1000; // 15 minutos

// Limpeza periódica de memória para evitar vazamento
setInterval(() => {
  const now = Date.now();
  for (const [key, record] of attemptsByIp.entries()) {
    if (now - record.lastFailureAt > ATTEMPT_EXPIRY_MS && (!record.lockedUntil || now > record.lockedUntil)) {
      attemptsByIp.delete(key);
    }
  }
  for (const [key, record] of attemptsByEmail.entries()) {
    if (now - record.lastFailureAt > ATTEMPT_EXPIRY_MS && (!record.lockedUntil || now > record.lockedUntil)) {
      attemptsByEmail.delete(key);
    }
  }
}, 5 * 60 * 1000);

export function getClientIp(req: Request): string {
  const forwarded = req.headers["x-forwarded-for"];
  if (typeof forwarded === "string") {
    return forwarded.split(",")[0].trim();
  }
  return req.ip || req.socket.remoteAddress || "127.0.0.1";
}

/**
 * Middleware que verifica se o IP ou e-mail está temporariamente bloqueado por excesso de tentativas.
 */
export function loginRateLimitMiddleware(req: Request, res: Response, next: NextFunction) {
  const ip = getClientIp(req);
  const email = typeof req.body?.email === "string" ? req.body.email.trim().toLowerCase() : "";
  const now = Date.now();

  const ipRecord = attemptsByIp.get(ip);
  if (ipRecord?.lockedUntil && now < ipRecord.lockedUntil) {
    const minutesLeft = Math.ceil((ipRecord.lockedUntil - now) / 60000);
    return res.status(429).json({
      success: false,
      code: "TOO_MANY_ATTEMPTS",
      error: `Muitas tentativas incorretas deste endereço IP. Acesso bloqueado temporariamente por mais ${minutesLeft} minuto(s).`,
    });
  }

  if (email) {
    const emailRecord = attemptsByEmail.get(email);
    if (emailRecord?.lockedUntil && now < emailRecord.lockedUntil) {
      const minutesLeft = Math.ceil((emailRecord.lockedUntil - now) / 60000);
      return res.status(429).json({
        success: false,
        code: "TOO_MANY_ATTEMPTS",
        error: `Muitas tentativas incorretas para esta conta. Acesso bloqueado temporariamente por mais ${minutesLeft} minuto(s).`,
      });
    }
  }

  return next();
}

/**
 * Registra falha de autenticação (sem armazenar senha) e aciona bloqueio temporário se limite for excedido.
 */
export function recordLoginFailure(ip: string, email?: string): void {
  const now = Date.now();

  // 1. IP Tracking
  const ipRecord = attemptsByIp.get(ip) || { failures: 0, lastFailureAt: now };
  ipRecord.failures += 1;
  ipRecord.lastFailureAt = now;
  if (ipRecord.failures >= MAX_FAILURES) {
    ipRecord.lockedUntil = now + LOCKOUT_WINDOW_MS;
    console.warn(`[Security Alert] IP ${ip} bloqueado temporariamente por 15 minutos (${ipRecord.failures} falhas consecutivas).`);
  }
  attemptsByIp.set(ip, ipRecord);

  // 2. Email Tracking
  if (email && email.trim()) {
    const cleanEmail = email.trim().toLowerCase();
    const emailRecord = attemptsByEmail.get(cleanEmail) || { failures: 0, lastFailureAt: now };
    emailRecord.failures += 1;
    emailRecord.lastFailureAt = now;
    if (emailRecord.failures >= MAX_FAILURES) {
      emailRecord.lockedUntil = now + LOCKOUT_WINDOW_MS;
      console.warn(`[Security Alert] Conta ${cleanEmail} bloqueada temporariamente por 15 minutos (${emailRecord.failures} falhas consecutivas).`);
    }
    attemptsByEmail.set(cleanEmail, emailRecord);
  }
}

/**
 * Limpa falhas acumuladas após autenticação bem-sucedida.
 */
export function recordLoginSuccess(ip: string, email?: string): void {
  attemptsByIp.delete(ip);
  if (email && email.trim()) {
    attemptsByEmail.delete(email.trim().toLowerCase());
  }
}
