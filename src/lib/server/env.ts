import "server-only";

export type StorageMode = "sqlite" | "browser";
export function storageMode(): StorageMode {
  const m = (process.env.STORAGE_MODE || "").toLowerCase();
  if (m === "browser" || m === "memory" || m === "demo") return "browser";
  if (m === "sqlite") return "sqlite";
  return process.env.VERCEL ? "browser" : "sqlite";
}
export const SESSION_SECRET = process.env.SESSION_SECRET || "velaroute-local-dev-secret-change-me-0f3a9c";
export function publicUrl(): string {
  return (process.env.PUBLIC_URL || (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : "") || "http://localhost:3300").replace(/\/$/, "");
}
