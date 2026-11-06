import { clientIp, handleError, json, problem, rateLimit } from "@/lib/server/api";
import { loadWorkspace, saveWorkspace } from "@/lib/server/store";
import { ingestLead, slotsFor } from "@/lib/server/service";
import { storageMode } from "@/lib/server/env";
import { isEmail } from "@/lib/engine/util";

export const dynamic = "force-dynamic";

/** Website chat widget → lead. Visitors leave a question + email; the router assigns an owner instantly. */
export async function POST(req: Request) {
  const rl = rateLimit(`chat:${clientIp(req)}`, 20);
  if (!rl.ok) return problem(429, "Too many messages");
  const b = (await req.json().catch(() => null)) as { wid?: string; name?: string; email?: string; message?: string; snapshot?: unknown; elapsedMs?: number } | null;
  if (!b?.wid) return problem(400, "Missing workspace");
  if (!b.email || !isEmail(b.email)) return problem(400, "Invalid email", "Enter a valid email so the team can reply");
  if (!b.message?.trim()) return problem(400, "Empty message", "Type your question");
  const ws = loadWorkspace(b.wid, b.snapshot);
  try {
    const lead = await ingestLead(ws, { source: "chat", name: b.name, email: b.email, message: b.message.slice(0, 2000), elapsedMs: b.elapsedMs ?? 20000, ip: clientIp(req) });
    saveWorkspace(ws);
    const booking = lead.ownerId && lead.guard.verdict === "pass" ? slotsFor(ws, lead.id) : null;
    return json({ ok: true, leadId: lead.id, blocked: lead.stage === "spam", owner: booking?.rep ?? null, slots: booking?.slots.slice(0, 6) ?? [], ws: storageMode() === "browser" && b.snapshot ? ws : undefined });
  } catch (e) {
    return handleError(e);
  }
}
