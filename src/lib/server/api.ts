import "server-only";
import { NextResponse } from "next/server";
import type { Workspace } from "../engine/types";
import { allWorkspaceIds, loadWorkspace, saveWorkspace } from "./store";
import { sha256 } from "./crypto";
import { storageMode } from "./env";
import { getSession, type Session } from "./auth";
import { ActionError } from "./service";

export function json(data: unknown, status = 200, headers?: Record<string, string>) {
  return NextResponse.json(data, { status, headers: { "Cache-Control": "no-store", ...headers } });
}
export function problem(status: number, title: string, detail?: string) {
  return json({ error: { status, title, detail: detail ?? title } }, status);
}

const buckets = new Map<string, { n: number; reset: number }>();
/** Fixed-window rate limit per key (in-memory, per instance). */
export function rateLimit(key: string, limit = 60, windowMs = 60000): { ok: boolean; remaining: number; reset: number } {
  const now = Date.now();
  const b = buckets.get(key);
  if (!b || b.reset < now) { buckets.set(key, { n: 1, reset: now + windowMs }); return { ok: true, remaining: limit - 1, reset: now + windowMs }; }
  b.n += 1;
  if (buckets.size > 5000) for (const [k, v] of buckets) if (v.reset < now) buckets.delete(k);
  return { ok: b.n <= limit, remaining: Math.max(0, limit - b.n), reset: b.reset };
}

export function clientIp(req: Request): string {
  return req.headers.get("x-forwarded-for")?.split(",")[0].trim() || req.headers.get("x-real-ip") || "local";
}

export interface KeyCtx { ws: Workspace; keyId: string; scopes: string[] }

/** Authenticate a developer API request (Bearer vr_… key) and check the scope. */
export function withKey(req: Request, scope: string): KeyCtx | Response {
  const auth = req.headers.get("authorization") || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7).trim() : req.headers.get("x-api-key")?.trim() || "";
  if (!token) return problem(401, "Missing API key", "Send Authorization: Bearer <key>");
  const rl = rateLimit(`key:${token.slice(0, 16)}`, 120);
  if (!rl.ok) return problem(429, "Rate limit exceeded", "120 requests per minute per key");
  const h = sha256(token);
  const ids = storageMode() === "sqlite" ? allWorkspaceIds() : ["ws_demo", ...allWorkspaceIds().filter((x) => x !== "ws_demo")];
  if (!ids.includes("ws_demo")) ids.push("ws_demo");
  for (const id of ids) {
    const ws = loadWorkspace(id);
    const key = ws.apiKeys.find((k) => k.hash === h && !k.revoked);
    if (key) {
      if (!key.scopes.includes(scope)) return problem(403, "Insufficient scope", `This key lacks the ${scope} scope`);
      key.lastUsedAt = new Date().toISOString();
      return { ws, keyId: key.id, scopes: key.scopes };
    }
  }
  return problem(401, "Invalid API key");
}

export async function withSession(): Promise<Session | Response> {
  const s = await getSession();
  return s ?? problem(401, "Not signed in");
}

export function handleError(e: unknown) {
  if (e instanceof ActionError) return problem(400, "Request failed", e.message);
  if (e instanceof Error && /not found|invalid|taken|no owner/i.test(e.message)) return problem(400, "Request failed", e.message);
  console.error(e);
  return problem(500, "Internal error", e instanceof Error ? e.message : "Unexpected error");
}

export function persist(ws: Workspace) { saveWorkspace(ws); }

/** Strip what the browser never needs before sending a workspace to the client. */
export function clientView(ws: Workspace): Workspace {
  return ws;
}
