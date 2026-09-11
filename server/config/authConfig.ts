export function getSessionSecret(): string {
  return process.env.SESSION_SECRET || "aura-semijoias-session-secret-change-in-production";
}
