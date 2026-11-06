import { clientIp, handleError, json, problem, rateLimit } from "@/lib/server/api";
import { loadWorkspace, saveWorkspace } from "@/lib/server/store";
import { runAction } from "@/lib/server/service";
import { storageMode } from "@/lib/server/env";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const rl = rateLimit(`book:${clientIp(req)}`, 20);
  if (!rl.ok) return problem(429, "Too many requests");
  const b = (await req.json().catch(() => null)) as { wid?: string; leadId?: string; start?: string; snapshot?: unknown } | null;
  if (!b?.wid || !b.leadId || !b.start) return problem(400, "Missing fields");
  const ws = loadWorkspace(b.wid, b.snapshot);
  const lead = ws.leads.find((l) => l.id === b.leadId);
  if (!lead) return problem(404, "Lead not found");
  if (lead.meeting) return problem(409, "Already booked", "This meeting is already booked");
  try {
    const meeting = await runAction(ws, { type: "lead.book", leadId: b.leadId, start: b.start }, lead.name);
    saveWorkspace(ws);
    return json({ ok: true, meeting, ws: storageMode() === "browser" && b.snapshot ? ws : undefined });
  } catch (e) {
    return handleError(e);
  }
}
