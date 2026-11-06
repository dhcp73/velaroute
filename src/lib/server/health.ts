import "server-only";
import { healthHistory, loadWorkspace, recordHealth, type HealthSample } from "./store";
import { demoWorkspace } from "../engine/seed";
import { processLead } from "../engine/pipeline";
import { TOOLS } from "./tools";
import { storageMode } from "./env";
import { openapi } from "../openapi";

export const COMPONENTS = [
  { id: "storage", name: "Storage" },
  { id: "pipeline", name: "Inbound pipeline" },
  { id: "routing", name: "Router + round robin" },
  { id: "sla", name: "SLA agent" },
  { id: "api", name: "REST API" },
  { id: "mcp", name: "MCP server" },
] as const;

async function check(component: string, fn: () => Promise<string> | string): Promise<HealthSample> {
  const t = Date.now();
  try {
    const detail = await fn();
    return { at: new Date().toISOString(), component, ok: true, ms: Date.now() - t, detail };
  } catch (e) {
    return { at: new Date().toISOString(), component, ok: false, ms: Date.now() - t, detail: (e as Error).message };
  }
}

const g = globalThis as unknown as { __vrLastHealth?: number };

export async function runHealthChecks(record = true) {
  const samples = await Promise.all([
    check("storage", () => { const ws = loadWorkspace("ws_demo"); if (!ws.reps.length) throw new Error("Demo workspace empty"); return `${storageMode()} · ${ws.leads.length} leads in demo workspace`; }),
    check("pipeline", () => {
      const ws = demoWorkspace("ws_health");
      const { lead } = processLead(ws, { source: "api", email: "health@northwind.io", name: "Health Check", elapsedMs: 30000 }, new Date());
      if (!lead.trace.length || lead.trace.length < 6) throw new Error("Pipeline trace incomplete");
      return `${lead.trace.length} stages ran · routed to ${lead.ownerId ?? "nobody"}`;
    }),
    check("routing", () => {
      const ws = demoWorkspace("ws_health2");
      const owners = new Set<string>();
      for (let i = 0; i < 6; i++) owners.add(processLead(ws, { source: "api", email: `rr${i}@copperleaf.io`, elapsedMs: 30000 }, new Date()).lead.ownerId ?? "none");
      return `Round robin spread across ${owners.size} rep(s)`;
    }),
    check("sla", () => {
      const ws = loadWorkspace("ws_demo");
      const age = ws.lastTickAt ? (Date.now() - new Date(ws.lastTickAt).getTime()) / 60000 : null;
      return age === null ? "Waiting for first tick" : `Last tick ${age < 1 ? "<1" : Math.round(age)} min ago`;
    }),
    check("api", () => { const spec = openapi("http://localhost"); return `${Object.keys(spec.paths).length} endpoints documented`; }),
    check("mcp", () => `${TOOLS.length} tools exposed`),
  ]);
  const now = Date.now();
  if (record && (!g.__vrLastHealth || now - g.__vrLastHealth > 30000)) { recordHealth(samples); g.__vrLastHealth = now; }
  const down = samples.filter((s) => !s.ok).length;
  return { status: down === 0 ? "ok" : down === samples.length ? "down" : "degraded", mode: storageMode(), checkedAt: new Date().toISOString(), checks: samples };
}

export async function statusSummary() {
  const current = await runHealthChecks();
  const hist = healthHistory();
  const components = COMPONENTS.map((c) => {
    const rows = hist.filter((h) => h.component === c.id);
    const now = current.checks.find((x) => x.component === c.id)!;
    const buckets: { hour: string; ok: boolean | null }[] = [];
    for (let i = 23; i >= 0; i--) {
      const start = Date.now() - (i + 1) * 3600000, end = Date.now() - i * 3600000;
      const inHour = rows.filter((r) => { const t = new Date(r.at).getTime(); return t >= start && t < end; });
      buckets.push({ hour: new Date(end).toISOString().slice(11, 13), ok: inHour.length ? inHour.every((r) => r.ok) : null });
    }
    const uptime = rows.length ? Math.round((rows.filter((r) => r.ok).length / rows.length) * 10000) / 100 : 100;
    return { id: c.id, name: c.name, ok: now.ok, detail: now.detail, ms: now.ms, uptime, samples: rows.length, buckets };
  });
  return { status: current.status, mode: current.mode, checkedAt: current.checkedAt, components };
}
