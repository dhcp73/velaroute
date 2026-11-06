"use client";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { CheckCircle2, RefreshCw, XCircle } from "lucide-react";
import { useWs } from "@/components/app/workspace";
import { Loading, PageHeader } from "@/components/app/shell";
import { Button, Card, CardHeader, Chip, Tabs } from "@/components/ui";
import { ago } from "@/components/app/format";

type Health = { status: string; mode: string; checkedAt: string; checks: { component: string; ok: boolean; ms: number; detail: string }[] };

export default function HealthPage() {
  const { ws, now } = useWs();
  const [h, setH] = useState<Health | null>(null);
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState<"crm" | "webhooks" | "alerts">("crm");
  const load = useCallback(async () => { setLoading(true); try { const r = await fetch("/api/health", { cache: "no-store" }); setH(await r.json()); } finally { setLoading(false); } }, []);
  useEffect(() => { void load(); const t = setInterval(load, 60000); return () => clearInterval(t); }, [load]);
  if (!ws) return <Loading />;
  return (
    <>
      <PageHeader title="Health" subtitle="The monitor checks every part of the backend each minute. Public view: /status." actions={<><Link href="/status" className="inline-flex h-10 items-center rounded-full border border-line bg-surface px-4 text-sm font-medium hover:bg-surface-2">Public status</Link><Button variant="secondary" icon={<RefreshCw className="h-4 w-4" />} loading={loading} onClick={load}>Run checks</Button></>} />
      <Card>
        <CardHeader title="System" subtitle={h ? `Checked ${ago(h.checkedAt, now)} · storage mode ${h.mode}` : "Checking…"} action={h && <Chip tone={h.status === "ok" ? "mint" : h.status === "degraded" ? "amber" : "rose"} dot>{h.status === "ok" ? "All systems normal" : h.status}</Chip>} />
        <ul className="mt-3 grid gap-3 p-5 pt-2 sm:grid-cols-2 xl:grid-cols-3">
          {(h?.checks ?? []).map((c) => (
            <li key={c.component} className="rounded-lg bg-surface-2 p-4">
              <p className="flex items-center gap-2 text-sm font-semibold capitalize">{c.ok ? <CheckCircle2 className="h-4 w-4 text-emerald-500" /> : <XCircle className="h-4 w-4 text-rose-500" />}{c.component}<span className="ml-auto text-xs font-normal text-faint">{c.ms} ms</span></p>
              <p className="mt-1 text-xs text-muted">{c.detail}</p>
            </li>
          ))}
        </ul>
      </Card>
      <Tabs value={tab} onChange={setTab} className="my-4 w-fit" items={[{ id: "crm", label: "CRM sync log", count: ws.crm.length }, { id: "webhooks", label: "Webhook deliveries", count: ws.deliveries.length }, { id: "alerts", label: "Alerts", count: ws.alerts.length }]} />
      <Card className="overflow-x-auto">
        {tab === "crm" && <table className="w-full min-w-[640px] text-sm"><thead><tr className="border-b border-line text-left text-xs uppercase tracking-wide text-faint"><th className="px-5 py-3 font-medium">When</th><th className="px-5 py-3 font-medium">System</th><th className="px-5 py-3 font-medium">Action</th><th className="px-5 py-3 font-medium">Status</th><th className="px-5 py-3 font-medium">Detail</th></tr></thead>
          <tbody>{ws.crm.slice(0, 60).map((c) => <tr key={c.id} className="border-b border-line/70 last:border-0"><td className="whitespace-nowrap px-5 py-2.5 text-muted">{ago(c.at, now)}</td><td className="px-5 py-2.5 capitalize">{c.system}</td><td className="px-5 py-2.5">{c.action}</td><td className="px-5 py-2.5"><Chip tone={c.status === "ok" ? "mint" : c.status === "skipped" ? "amber" : "rose"}>{c.status}</Chip></td><td className="max-w-md truncate px-5 py-2.5 text-muted"><Link href={`/app/leads/${c.leadId}`} className="hover:underline">{c.detail}</Link></td></tr>)}</tbody></table>}
        {tab === "webhooks" && <table className="w-full min-w-[560px] text-sm"><thead><tr className="border-b border-line text-left text-xs uppercase tracking-wide text-faint"><th className="px-5 py-3 font-medium">When</th><th className="px-5 py-3 font-medium">Event</th><th className="px-5 py-3 font-medium">Endpoint</th><th className="px-5 py-3 font-medium">Status</th><th className="px-5 py-3 font-medium">Time</th></tr></thead>
          <tbody>{ws.deliveries.length === 0 ? <tr><td colSpan={5} className="px-5 py-8 text-center text-muted">No deliveries yet</td></tr> : ws.deliveries.slice(0, 60).map((d) => <tr key={d.id} className="border-b border-line/70 last:border-0"><td className="whitespace-nowrap px-5 py-2.5 text-muted">{ago(d.at, now)}</td><td className="px-5 py-2.5"><code>{d.event}</code></td><td className="max-w-xs truncate px-5 py-2.5 text-muted">{ws.webhooks.find((w) => w.id === d.webhookId)?.url ?? "removed"}</td><td className="px-5 py-2.5"><Chip tone={d.ok ? "mint" : "rose"}>{d.status || "no response"}</Chip></td><td className="px-5 py-2.5 tabular-nums">{d.ms} ms</td></tr>)}</tbody></table>}
        {tab === "alerts" && <ul className="divide-y divide-line">{ws.alerts.slice(0, 60).map((a) => <li key={a.id} className="flex flex-wrap items-center gap-3 px-5 py-3 text-sm"><Chip tone={a.kind === "sla_breach" ? "rose" : a.kind === "escalation" || a.kind === "sla_warning" ? "amber" : "violet"}>{a.kind.replace("_", " ")}</Chip><span className="min-w-0 flex-1">{a.text}</span><span className="text-xs text-faint">{a.channel} · {ago(a.at, now)}</span></li>)}</ul>}
      </Card>
    </>
  );
}
