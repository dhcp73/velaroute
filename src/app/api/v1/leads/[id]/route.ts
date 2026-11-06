import { handleError, json, problem, withKey } from "@/lib/server/api";
import { saveWorkspace } from "@/lib/server/store";
import { leadView } from "@/lib/server/tools";
import { runAction } from "@/lib/server/service";
import type { Stage } from "@/lib/engine/types";

export const dynamic = "force-dynamic";
type P = { params: Promise<{ id: string }> };

export async function GET(req: Request, { params }: P) {
  const ctx = withKey(req, "leads:read");
  if (ctx instanceof Response) return ctx;
  const { id } = await params;
  const l = ctx.ws.leads.find((x) => x.id === id);
  return l ? json({ data: leadView(ctx.ws, l) }) : problem(404, "Lead not found");
}

/** PATCH { stage?, ownerId? } */
export async function PATCH(req: Request, { params }: P) {
  const ctx = withKey(req, "leads:write");
  if (ctx instanceof Response) return ctx;
  const { id } = await params;
  if (!ctx.ws.leads.some((x) => x.id === id)) return problem(404, "Lead not found");
  const b = (await req.json().catch(() => ({}))) as { stage?: Stage; ownerId?: string };
  try {
    if (b.ownerId) await runAction(ctx.ws, { type: "lead.assign", leadId: id, repId: b.ownerId }, "api");
    if (b.stage) await runAction(ctx.ws, { type: "lead.stage", leadId: id, stage: b.stage }, "api");
    saveWorkspace(ctx.ws);
    return json({ data: leadView(ctx.ws, ctx.ws.leads.find((x) => x.id === id)!) });
  } catch (e) { return handleError(e); }
}
