"use client";
import { useMemo, useState } from "react";
import { useWs } from "@/components/app/workspace";
import { Loading, PageHeader } from "@/components/app/shell";
import { Card, CardHeader, Stat, Tabs } from "@/components/ui";
import { analytics } from "@/lib/engine/analytics";
import { FairnessChart, FunnelBars, SourceChart, SpeedChart, VolumeChart } from "@/components/app/charts";
import { money } from "@/components/app/format";

export default function Analytics() {
  const { ws } = useWs();
  const [days, setDays] = useState<"7" | "14" | "30">("14");
  const a = useMemo(() => (ws ? analytics(ws, new Date(), Number(days)) : null), [ws, days]);
  if (!ws || !a) return <Loading />;
  return (
    <>
      <PageHeader title="Analytics" subtitle="Speed-to-lead, SLA, routing fairness, conversion and enrichment spend." actions={<Tabs value={days} onChange={setDays} items={[{ id: "7", label: "7 days" }, { id: "14", label: "14 days" }, { id: "30", label: "30 days" }]} />} />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="Median speed-to-lead" value={`${a.medianMinutes}m`} hint="Lead created → first touch" />
        <Stat label="Within SLA" value={`${a.slaRate}%`} tone="mint" hint={`SLA ${ws.settings.slaMinutes} minutes`} />
        <Stat label="Meeting rate" value={`${a.bookedRate}%`} tone="sky" hint={`Win rate ${a.winRate}%`} />
        <Stat label="Open pipeline" value={`$${(a.pipelineValue / 1000).toFixed(0)}k`} tone="amber" hint="Meetings + qualified" />
      </div>
      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Card><CardHeader title="Volume" subtitle="Leads, meetings and blocked junk per day" /><div className="px-2 pb-3 pt-2"><VolumeChart data={a.daily} /></div></Card>
        <Card><CardHeader title="Routing fairness" subtitle="Leads routed per rep vs. their weight share" /><div className="px-2 pb-3 pt-2"><FairnessChart data={a.fairness} /></div></Card>
        <Card><CardHeader title="Speed-to-lead by rep" subtitle="Median minutes to first touch" /><div className="px-2 pb-3 pt-2"><SpeedChart data={a.fairness.filter((f) => f.leads)} /></div></Card>
        <Card><CardHeader title="Source mix" /><div className="px-2 pb-3 pt-2"><SourceChart data={a.bySource} /></div></Card>
        <Card><CardHeader title="Funnel" subtitle="From capture to closed-won" /><div className="p-5"><FunnelBars data={a.funnel} /></div></Card>
        <Card>
          <CardHeader title="Enrichment spend" subtitle={`${money(a.monthSpendCents)} of ${money(a.capCents)} this month`} />
          <div className="p-5">
            <div className="h-3 overflow-hidden rounded-full bg-surface-2"><div className="h-full rounded-full bg-primary-500" style={{ width: `${Math.min(100, (a.monthSpendCents / Math.max(1, a.capCents)) * 100)}%` }} /></div>
            <ul className="mt-4 divide-y divide-line text-sm">
              {a.spendByProvider.length === 0 && <li className="py-3 text-muted">No paid lookups in this period.</li>}
              {a.spendByProvider.map((s) => <li key={s.provider} className="flex justify-between py-2.5"><span className="capitalize">{s.provider}</span><span className="tabular-nums">{money(s.cents)}</span></li>)}
            </ul>
            <p className="mt-3 text-xs text-muted">Cached domains and blocked leads cost nothing. Cost per real lead: {money(a.real ? Math.round(a.spendByProvider.reduce((x, s) => x + s.cents, 0) / a.real) : 0)}.</p>
          </div>
        </Card>
      </div>
      <Card className="mt-4 overflow-x-auto">
        <CardHeader title="Rep scorecard" />
        <table className="mt-3 w-full min-w-[560px] text-sm">
          <thead><tr className="border-y border-line text-left text-xs uppercase tracking-wide text-faint"><th className="px-5 py-2.5 font-medium">Rep</th><th className="px-5 py-2.5 font-medium">Leads</th><th className="px-5 py-2.5 font-medium">Expected</th><th className="px-5 py-2.5 font-medium">Share</th><th className="px-5 py-2.5 font-medium">Median touch</th><th className="px-5 py-2.5 font-medium">Meetings</th></tr></thead>
          <tbody>{a.fairness.map((f) => <tr key={f.repId} className="border-b border-line/70 last:border-0"><td className="px-5 py-3"><span className="mr-2 inline-block h-2.5 w-2.5 rounded-full" style={{ background: f.color }} />{f.name}</td><td className="px-5 py-3 tabular-nums">{f.leads}</td><td className="px-5 py-3 tabular-nums text-muted">{f.expected}</td><td className="px-5 py-3 tabular-nums">{f.share}%</td><td className="px-5 py-3 tabular-nums">{f.medianMinutes}m</td><td className="px-5 py-3 tabular-nums">{f.meetings}</td></tr>)}</tbody>
        </table>
        <p className="px-5 py-3 text-xs text-muted">“Expected” is the share each rep’s round-robin weight would give if every lead could go to anyone. Territory rules and account ownership move leads away from it on purpose.</p>
      </Card>
    </>
  );
}
