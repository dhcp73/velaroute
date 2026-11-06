"use client";
import { useCallback, useEffect, useState } from "react";
import { CheckCircle2, AlertTriangle, RefreshCw } from "lucide-react";
import { cn } from "@/lib/cn";

type Comp = { id: string; name: string; ok: boolean; detail: string; ms: number; uptime: number; samples: number; buckets: { hour: string; ok: boolean | null }[] };
type Summary = { status: "ok" | "degraded" | "down"; mode: string; checkedAt: string; components: Comp[] };

export function StatusBoard() {
  const [s, setS] = useState<Summary | null>(null);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const load = useCallback(async () => {
    setBusy(true);
    try { const r = await fetch("/api/status", { cache: "no-store" }); setS(await r.json()); setErr(""); } catch { setErr("Could not reach the status API."); } finally { setBusy(false); }
  }, []);
  useEffect(() => { load(); const t = setInterval(load, 30000); return () => clearInterval(t); }, [load]);
  if (!s) return <div className="card p-8 text-center text-muted">{err || "Running health checks…"}</div>;
  const ok = s.status === "ok";
  return (
    <div className="space-y-5">
      <div className={cn("flex flex-col gap-3 rounded-3xl p-6 sm:flex-row sm:items-center sm:justify-between", ok ? "bg-mint-soft text-emerald-900 dark:bg-emerald-500/10 dark:text-emerald-100" : "bg-amber-soft text-amber-900 dark:bg-amber-500/10 dark:text-amber-100")}>
        <div className="flex items-center gap-3">{ok ? <CheckCircle2 className="h-7 w-7" /> : <AlertTriangle className="h-7 w-7" />}<div><p className="font-display text-xl font-semibold">{ok ? "All systems operational" : s.status === "down" ? "Major outage" : "Partial degradation"}</p><p className="text-sm opacity-80">Checked {new Date(s.checkedAt).toLocaleTimeString()} · refreshes every 30 s</p></div></div>
        <button type="button" onClick={load} disabled={busy} className="inline-flex h-10 items-center justify-center gap-2 rounded-full bg-white/70 px-4 text-sm font-medium text-ink hover:bg-white dark:bg-white/10 dark:text-white"><RefreshCw className={cn("h-4 w-4", busy && "animate-spin")} />Re-check</button>
      </div>
      <div className="card divide-y divide-line">
        {s.components.map((c) => (
          <div key={c.id} className="p-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="flex items-center gap-2 font-medium"><span className={cn("h-2.5 w-2.5 rounded-full", c.ok ? "bg-emerald-500" : "bg-rose-500")} />{c.name}</p>
              <p className="text-sm text-muted">{c.uptime}% · {c.ms} ms</p>
            </div>
            <p className="mt-1 text-sm text-muted">{c.detail}</p>
            <div className="mt-3 flex gap-[3px]" aria-label="Last 24 hours">
              {c.buckets.map((b, i) => <span key={i} title={`${b.hour}:00 UTC — ${b.ok === null ? "no data" : b.ok ? "operational" : "issues"}`} className={cn("h-7 flex-1 rounded-[3px]", b.ok === null ? "bg-surface-2" : b.ok ? "bg-emerald-400/80" : "bg-rose-400")} />)}
            </div>
          </div>
        ))}
      </div>
      <p className="text-center text-xs text-faint">Machine-readable: <a className="underline" href="/api/status">/api/status</a> · <a className="underline" href="/api/health">/api/health</a></p>
    </div>
  );
}
