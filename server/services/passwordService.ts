import bcrypt from "bcryptjs";
import { isProduction } from "../config/environment";

/**
 * Enterprise Password Security Service
 * Handles cryptographic hashing with bcrypt (10 rounds), timing-safe verification,
 * and automatic transparent migration of legacy/seed hashes to bcrypt.
 */
export class PasswordService {
  private static readonly BCRYPT_ROUNDS = Math.max(10, Number(process.env.BCRYPT_ROUNDS || 12));

  /**
   * Generates a secure cryptographic bcrypt hash of the plain password.
   */
  static async hash(password: string): Promise<string> {
    if (!password || typeof password !== "string") {
      throw new Error("A senha fornecida para hashing é inválida ou vazia.");
    }
    const salt = await bcrypt.genSalt(this.BCRYPT_ROUNDS);
    return bcrypt.hash(password, salt);
  }

  /**
   * Synchronous version of bcrypt hash generation (useful for deterministic seeds).
   */
  static hashSync(password: string): string {
    if (!password || typeof password !== "string") {
      throw new Error("A senha fornecida para hashing é inválida ou vazia.");
    }
    const salt = bcrypt.genSaltSync(this.BCRYPT_ROUNDS);
    return bcrypt.hashSync(password, salt);
  }

  /**
   * Cryptographically verifies a plain text password against a stored hash.
   * Supports standard bcrypt ($2a$, $2b$, $2y$).
   * In production, non-bcrypt fallbacks are strictly rejected.
   */
  static async verify(password: string, storedHash?: string | null): Promise<boolean> {
    if (!password || !storedHash || typeof password !== "string" || typeof storedHash !== "string") {
      return false;
    }

    const isProd = isProduction();

    // 1. Standard Bcrypt Hash ($2a$, $2b$, $2y$)
    if (this.isBcryptHash(storedHash)) {
      try {
        return await bcrypt.compare(password, storedHash);
      } catch (err) {
        console.error("[PasswordService] Error comparing bcrypt hash:", err);
        return false;
      }
    }

    // Zero fallback policy: all non-bcrypt stored hashes are rejected
    return false;
  }

  /**
   * Common weak passwords blocked by security policy.
   */
  private static readonly COMMON_WEAK_PASSWORDS = new Set([
    "123456",
    "12345678",
    "123456789",
    "admin123",
    "admin1234",
    "password",
    "password123",
    "administrator",
    "master123",
    "aura123",
    "aura2024",
    "aura2025",
    "aura2026",
    "senha123",
    "superadmin",
    "qwerty123456",
  ]);

  /**
   * Validates password strength according to enterprise security standards.
   * For Super Admin / Root accounts, enforces:
   * - Minimum 12 characters
   * - Uppercase, lowercase, numbers, and symbols
   * - Strictly blocks known/common weak passwords
   */
  static validatePasswordStrength(password: string, isSuperAdmin = false): { valid: boolean; error?: string } {
    if (!password || typeof password !== "string") {
      return { valid: false, error: "A senha fornecida é inválida ou vazia." };
    }

    const lower = password.toLowerCase().trim();
    if (this.COMMON_WEAK_PASSWORDS.has(lower)) {
      return {
        valid: false,
        error: "A senha informada é comum e vulnerável. Escolha uma senha segura e exclusiva.",
      };
    }

    if (isSuperAdmin) {
      if (password.length < 12) {
        return {
          valid: false,
          error: "A senha do Administrador Mestre Raiz deve possuir no mínimo 12 caracteres.",
        };
      }
      if (!/[A-Z]/.test(password)) {
        return {
          valid: false,
          error: "A senha do Administrador Mestre deve conter pelo menos uma letra maiúscula (A-Z).",
        };
      }
      if (!/[a-z]/.test(password)) {
        return {
          valid: false,
          error: "A senha do Administrador Mestre deve conter pelo menos uma letra minúscula (a-z).",
        };
      }
      if (!/[0-9]/.test(password)) {
        return {
          valid: false,
          error: "A senha do Administrador Mestre deve conter pelo menos um dígito numérico (0-9).",
        };
      }
      if (!/[^A-Za-z0-9]/.test(password)) {
        return {
          valid: false,
          error: "A senha do Administrador Mestre deve conter pelo menos um caractere especial ou símbolo (!@#$%^&*...).",
        };
      }
    } else {
      if (password.length < 6) {
        return {
          valid: false,
          error: "A senha deve possuir no mínimo 6 caracteres.",
        };
      }
    }

    return { valid: true };
  }

  /**
   * Checks if the stored hash is in standard bcrypt format.
   */
  static isBcryptHash(hash: string): boolean {
    return /^\$2[aby]\$\d{2}\$[./A-Za-z0-9]{53}$/.test(hash);
  }

  /**
   * Identifies whether a stored password hash should be upgraded to current bcrypt standard.
   */
  static needsRehash(storedHash?: string | null): boolean {
    if (!storedHash) return true;
    return !this.isBcryptHash(storedHash);
  }
}
