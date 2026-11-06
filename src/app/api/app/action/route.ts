import { handleError, json, problem, withSession } from "@/lib/server/api";
import { loadWorkspace, saveWorkspace } from "@/lib/server/store";
import { runAction, type Action } from "@/lib/server/service";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

export async function POST(req: Request) {
  const s = await withSession();
  if (s instanceof Response) return s;
  const body = (await req.json().catch(() => null)) as { action?: Action; snapshot?: unknown } | null;
  if (!body?.action?.type) return problem(400, "Missing action");
  if (s.role === "member" && /^(settings|integration|apikey|workspace)\./.test(body.action.type)) return problem(403, "Admins only", "Ask a workspace admin to change this");
  const ws = loadWorkspace(s.wid, body.snapshot);
  try {
    const result = await runAction(ws, body.action, s.name);
    saveWorkspace(ws);
    return json({ ws, result });
  } catch (e) {
    return handleError(e);
  }
}
