/**
 * Unified Environment Management for Aura SaaS & ERP
 * 
 * Provides single source of truth for production mode detection across:
 * - NODE_ENV === 'production'
 * - CLI arguments: process.argv includes '--production'
 * - Bundled runtime execution (server.cjs)
 * - Explicit APP_ENV === 'production'
 */

export function isProduction(): boolean {
  return (
    process.env.NODE_ENV === "production" ||
    process.env.APP_ENV === "production" ||
    process.argv.includes("--production") ||
    (typeof __filename !== "undefined" && __filename.endsWith("server.cjs"))
  );
}

export const isProductionEnvironment = isProduction;
