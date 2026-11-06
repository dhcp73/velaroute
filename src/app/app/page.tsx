"use client";
import Link from "next/link";
import { useMemo } from "react";
import { ArrowRight, Bot, CalendarCheck, Clock3, DollarSign, ShieldCheck, Sparkles, Timer, Zap } from "lucide-react";
import { useWs } from "@/components/app/workspace";
import { Loading, PageHeader } from "@/components/app/shell";
import { Avatar, Button, buttonClass, Card, CardHeader, Chip, Empty, Stat } from "@/components/ui";
import { analytics } from "@/lib/engine/analytics";
import { VolumeChart } from "@/components/app/charts";
import { ago, money, slaState } from "@/components/app/format";

export default function Overview() {
  const { ws, now, dispatch, busy } = useWs();
  const a = useMemo(() => (ws ? analytics(ws, new Date(now - (now % 60000))) : null), [ws, now]);
  if (!ws || !a) return <Loading />;
  const live = ws.leads.filter((l) => l.slaDueAt && !l.firstTouchAt && l.stage !== "spam").sort((x, y) => x.slaDueAt!.localeCompare(y.slaDueAt!)).slice(0, 6);
  const feed = ws.leads.slice(0, 7);
  return (
    <>
      <PageHeader title="Overview" subtitle="Your inbound engine at a glance — last 14 days."
        actions={<Button icon={<Zap className="h-4 w-4" />} loading={busy} onClick={() => dispatch({ type: "lead.simulate" }, { success: "Simulated lead captured, enriched and routed" })}>Simulate inbound lead</Button>} />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="Median speed-to-lead" value={`${a.medianMinutes}m`} hint={`Target ${ws.settings.slaMinutes}m first touch`} icon={<Timer className="h-4 w-4" />} />
        <Stat label="Replied within SLA" value={`${a.slaRate}%`} tone="mint" hint={`${a.openBreaches} open breach${a.openBreaches === 1 ? "" : "es"} · ${a.awaiting} running`} icon={<Clock3 className="h-4 w-4" />} />
        <Stat label="Booked from inbound" value={`${a.bookedRate}%`} tone="sky" hint={`${a.real} real leads · ${a.blocked} blocked`} icon={<CalendarCheck className="h-4 w-4" />} />
        <Stat label="Enrichment spend (month)" value={money(a.monthSpendCents)} tone="amber" hint={`Cap ${money(a.capCents)} · ${Math.round((a.monthSpendCents / Math.max(1, a.capCents)) * 100)}% used`} icon={<DollarSign className="h-4 w-4" />} />
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-[1.6fr_1fr]">
        <Card>
          <CardHeader title="Inbound volume" subtitle="Real leads, meetings booked and junk blocked per day" />
          <div className="px-2 pb-3 pt-2"><VolumeChart data={a.daily} /></div>
        </Card>
        <Card>
          <CardHeader title="SLA queue" subtitle="Leads waiting for a first touch" action={<Link href="/app/inbox?tab=needs" className="text-sm font-medium text-primary-600 hover:underline dark:text-primary-300">Open inbox</Link>} />
          {live.length === 0 ? <Empty icon={<ShieldCheck className="h-5 w-5" />} title="Nobody is waiting" body="Every routed lead has had a first touch." /> : (
            <ul className="mt-3 divide-y divide-line">
              {live.map((l) => {
                const s = slaState(l, now, ws.settings.slaMinutes);
                const owner = ws.reps.find((r) => r.id === l.ownerId);
                return (
                  <li key={l.id}>
                    <Link href={`/app/leads/${l.id}`} className="flex items-center gap-3 px-5 py-3 hover:bg-surface-2">
                      <Avatar name={owner?.name ?? "?"} color={owner?.color} />
                      <span className="min-w-0 flex-1"><span className="block truncate text-sm font-medium">{l.name}</span><span className="block truncate text-xs text-muted">{l.company || l.domain} → {owner?.name ?? "Unassigned"}</span></span>
                      <Chip tone={s.tone} className="tabular-nums">{s.label}</Chip>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-[1fr_1fr]">
        <Card>
          <CardHeader title="Agent activity" subtitle="What the engine did with the latest leads" action={<Link href="/app/agents" className="text-sm font-medium text-primary-600 hover:underline dark:text-primary-300">Agents</Link>} />
          <ul className="mt-3 divide-y divide-line">
            {feed.map((l) => {
              const route = l.trace.find((t) => t.step === "route");
              return (
                <li key={l.id}>
                  <Link href={`/app/leads/${l.id}`} className="flex items-start gap-3 px-5 py-3 hover:bg-surface-2">
                    <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-primary-100 text-primary-700 dark:bg-primary-500/15 dark:text-primary-200"><Bot className="h-4 w-4" /></span>
                    <span className="min-w-0 flex-1 text-sm"><span className="font-medium">{l.name}</span> <span className="text-muted">· {l.source} · {ago(l.createdAt, now)}</span>
                      <span className="mt-0.5 block truncate text-xs text-muted">{l.stage === "spam" ? `Blocked: ${l.guard.reasons[0]}` : route?.detail ?? "Captured"}</span></span>
                    {l.stage === "spam" ? <Chip tone="rose">blocked</Chip> : <Chip tone={l.icpScore >= 70 ? "mint" : l.icpScore >= 40 ? "sky" : "slate"}>ICP {l.icpScore}</Chip>}
                  </Link>
                </li>
              );
            })}
          </ul>
        </Card>
        <Card className="overflow-hidden">
          <CardHeader title="Pipeline health" subtitle="Each stage of the inbound engine" />
          <ul className="grid gap-2 p-5 sm:grid-cols-2">
            {[
              ["Capture", `${ws.forms.filter((f) => f.status === "live").length} live forms · chat · email · API`],
              ["Guard", `${a.blocked} junk leads blocked · ${a.review} in review`],
              ["Enrich", `${ws.integrations.filter((i) => ["apollo", "clay", "valyu"].includes(i.id) && i.connected).length} providers · cap ${money(ws.settings.monthlySpendCapCents)}`],
              ["Route", `${ws.rules.filter((r) => r.enabled).length} rules · ${ws.reps.filter((r) => r.available && r.weight > 0).length}/${ws.reps.length} reps in rotation`],
              ["Book", `${ws.leads.filter((l) => l.meeting?.status === "booked").length} upcoming meetings`],
              ["CRM sync", `${ws.crm.filter((c) => c.status === "ok").length} events → ${ws.settings.crmTarget}`],
            ].map(([k, v]) => (
              <li key={k} className="rounded-lg bg-surface-2 p-3"><p className="flex items-center gap-1.5 text-sm font-semibold"><span className="h-2 w-2 rounded-full bg-emerald-500" />{k}</p><p className="mt-1 text-xs text-muted">{v}</p></li>
            ))}
          </ul>
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line px-5 py-4">
            <p className="flex items-center gap-2 text-sm text-muted"><Sparkles className="h-4 w-4 text-primary-500" />Copilot drafts replies and briefs on every lead.</p>
            <Link href="/app/inbox" className={buttonClass("tonal", "sm")}>Work the queue <ArrowRight className="h-4 w-4" /></Link>
          </div>
        </Card>
      </div>
    </>
  );
}
