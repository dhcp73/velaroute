import { json } from "@/lib/server/api";
import { allWorkspaceIds, loadWorkspace, saveWorkspace } from "@/lib/server/store";
import { tick } from "@/lib/engine/pipeline";
import { dispatchEvents } from "@/lib/server/providers";
import { runHealthChecks } from "@/lib/server/health";

export const dynamic = "force-dynamic";

/** SLA agent heartbeat — run every minute locally (instrumentation) or by Vercel Cron. */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret && req.headers.get("authorization") !== `Bearer ${secret}`) return json({ error: "unauthorized" }, 401);
  let events = 0;
  for (const id of allWorkspaceIds()) {
    const ws = loadWorkspace(id);
    const ev = tick(ws, new Date());
    events += ev.length;
    await dispatchEvents(ws, ev);
    saveWorkspace(ws);
  }
  const health = await runHealthChecks();
  return json({ ok: true, events, health: health.status });
}
