import jwt from "jsonwebtoken";
import { getSessionSecret } from "../config/authConfig";
import { OrganizationRole } from "../types/saas";

export interface TenantJwtPayload {
  sub: string;
  userId: string;
  email: string;
  organizationId: string;
  tenantId: string;
  role: OrganizationRole;
  membershipId?: string;
  isPlatformSuperAdmin?: boolean;
  iat?: number;
  exp?: number;
}

export class JwtService {
  /**
   * Assina um token JWT com as claims do usuário e do seu Membership de tenant.
   */
  static sign(payload: Omit<TenantJwtPayload, "iat" | "exp">, expiresIn: string | number = "7d"): string {
    const secret = getSessionSecret();
    const claims: Record<string, any> = {
      sub: payload.userId,
      userId: payload.userId,
      email: payload.email,
      organizationId: payload.organizationId,
      tenantId: payload.tenantId || payload.organizationId,
      role: payload.role,
      membershipId: payload.membershipId,
      isPlatformSuperAdmin: Boolean(payload.isPlatformSuperAdmin),
    };

    return jwt.sign(claims, secret, {
      expiresIn: expiresIn as any,
      algorithm: "HS256",
    });
  }

  /**
   * Verifica a assinatura criptográfica e validade do token JWT.
   */
  static verify(token: string): TenantJwtPayload {
    const secret = getSessionSecret();
    return jwt.verify(token, secret, { algorithms: ["HS256"] }) as TenantJwtPayload;
  }

  /**
   * Decodifica o token sem validar a assinatura (útil para inspeção rápida).
   */
  static decode(token: string): TenantJwtPayload | null {
    try {
      return jwt.decode(token) as TenantJwtPayload | null;
    } catch {
      return null;
    }
  }

  /**
   * Verifica se uma string corresponde à estrutura básica de um JWT (3 partes separadas por ponto).
   */
  static isJwt(token: string): boolean {
    if (!token || typeof token !== "string") return false;
    const parts = token.trim().split(".");
    return parts.length === 3;
  }
}
