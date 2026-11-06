import { handleError, json, withKey } from "@/lib/server/api";
import { saveWorkspace } from "@/lib/server/store";
import { runAction } from "@/lib/server/service";
import type { RoutingRule } from "@/lib/engine/types";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const ctx = withKey(req, "routing:read");
  if (ctx instanceof Response) return ctx;
  return json({ data: [...ctx.ws.rules].sort((a, b) => a.priority - b.priority) });
}

export async function POST(req: Request) {
  const ctx = withKey(req, "routing:write");
  if (ctx instanceof Response) return ctx;
  const b = (await req.json().catch(() => null)) as (Partial<RoutingRule> & { name: string }) | null;
  if (!b?.name) return json({ error: { status: 400, title: "Invalid body", detail: "`name` and `repIds` are required" } }, 400);
  try {
    await runAction(ctx.ws, { type: "rule.save", rule: { ...b, id: undefined, priority: b.priority ?? 999 } }, "api");
    saveWorkspace(ctx.ws);
    return json({ data: ctx.ws.rules.find((r) => r.name === b.name) }, 201);
  } catch (e) { return handleError(e); }
}
