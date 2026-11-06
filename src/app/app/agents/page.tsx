"use client";
import Link from "next/link";
import { useMemo } from "react";
import { Bot, Building2, CalendarCheck, Database, Radar, ShieldCheck, Sparkles, Split, Timer } from "lucide-react";
import { useWs } from "@/components/app/workspace";
import { Loading, PageHeader } from "@/components/app/shell";
import { Card, Chip } from "@/components/ui";
import { money } from "@/components/app/format";

export default function Agents() {
  const { ws } = useWs();
  const stats = useMemo(() => {
    if (!ws) return null;
    const L = ws.leads;
    return {
      guard: { runs: L.length, out: `${L.filter((l) => l.stage === "spam").length} blocked · ${L.filter((l) => l.guard.verdict === "review").length} sent to review` },
      enrich: { runs: L.filter((l) => l.enrichment).length, out: `${L.filter((l) => l.enrichment?.cached).length} cache hits · ${money(ws.spend.reduce((a, s) => a + s.cents, 0))} total spend` },
      match: { runs: L.filter((l) => l.trace.some((t) => t.step === "match")).length, out: `${L.filter((l) => l.accountId).length} matched to accounts · ${L.filter((l) => l.duplicateOf).length} duplicates merged` },
      route: { runs: L.filter((l) => l.ownerId).length, out: `${ws.rules.filter((r) => r.enabled).length} rules · ${L.filter((l) => l.routeReason?.includes("sticky")).length} sticky to account owner` },
      book: { runs: L.filter((l) => l.meeting).length, out: `${L.filter((l) => l.meeting?.status === "booked").length} upcoming · ${L.filter((l) => l.meeting?.status === "held").length} held` },
      sla: { runs: ws.alerts.filter((a) => a.kind.startsWith("sla") || a.kind === "escalation").length, out: `${ws.alerts.filter((a) => a.kind === "sla_breach").length} breaches flagged · ${ws.alerts.filter((a) => a.kind === "escalation").length} escalations` },
      crm: { runs: ws.crm.length, out: `${ws.crm.filter((c) => c.status === "ok").length} synced · ${ws.crm.filter((c) => c.status === "skipped").length} queued` },
      copilot: { runs: L.reduce((a, l) => a + l.activities.filter((x) => x.type === "ai").length, 0), out: "Summaries, replies, next steps and meeting briefs" },
    };
  }, [ws]);
  if (!ws || !stats) return <Loading />;
  const agents = [
    { id: "guard", icon: ShieldCheck, name: "Guard agent", does: "Scores every submission for bots, disposable domains, junk and spam phrases before anything is spent.", href: "/app/settings#guard", cfg: `Block ≥ ${ws.settings.botBlockScore}, review ≥ ${ws.settings.botReviewScore}` },
    { id: "enrich", icon: Database, name: "Enrichment agent", does: "Runs your provider waterfall inside a per-lead and monthly spend cap, with a 30-day domain cache.", href: "/app/settings#enrichment", cfg: `${ws.settings.enrichOrder.join(" → ")} · ${money(ws.settings.perLeadCapCents)}/lead` },
    { id: "match", icon: Building2, name: "Match agent", does: "Matches leads to existing accounts by domain and merges duplicates so nobody gets the same lead twice.", href: "/app/accounts", cfg: `${ws.accounts.length} accounts` },
    { id: "route", icon: Split, name: "Router agent", does: "Applies rules by geography, size, industry, domain and ICP score, then weighted round robin. Skips reps who are away or full.", href: "/app/routing", cfg: `${ws.reps.filter((r) => r.available && r.weight > 0).length} reps in rotation` },
    { id: "book", icon: CalendarCheck, name: "Booking agent", does: "Shows the owner's real free slots right after the form, and books into Google or Microsoft calendars.", href: "/app/meetings", cfg: `${ws.settings.meetingMinutes} min · ${ws.settings.bookingWindowDays}-day window` },
    { id: "sla", icon: Timer, name: "SLA agent", does: "Watches every clock. Warns at 80%, alerts Slack on breach, re-routes to the next rep after the escalation window.", href: "/app/settings#sla", cfg: `${ws.settings.slaMinutes} min SLA · escalate +${ws.settings.escalateAfterMinutes} min` },
    { id: "crm", icon: Radar, name: "CRM sync agent", does: "Writes contacts, companies, owners, meetings and stages back to your CRM, and keeps a replayable log.", href: "/app/health", cfg: `Target: ${ws.settings.crmTarget}` },
    { id: "copilot", icon: Sparkles, name: "Copilot", does: "Drafts first replies, summaries, next steps and pre-meeting briefs. A person approves anything sent.", href: "/app/settings/integrations", cfg: `${ws.settings.aiProvider} · ${ws.settings.aiModel}` },
  ] as const;
  return (
    <>
      <PageHeader title="Agents" subtitle="Eight small agents run every inbound lead end to end. Each one is explainable — open any lead to see its trace." />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {agents.map((a) => {
          const s = stats[a.id as keyof typeof stats];
          return (
            <Card key={a.id} className="flex flex-col p-5">
              <div className="flex items-center justify-between"><span className="grid h-10 w-10 place-items-center rounded-lg bg-primary-100 text-primary-700 dark:bg-primary-500/15 dark:text-primary-200"><a.icon className="h-5 w-5" /></span><Chip tone="mint" dot>Running</Chip></div>
              <h2 className="mt-4 font-semibold">{a.name}</h2>
              <p className="mt-1 flex-1 text-sm text-muted">{a.does}</p>
              <div className="mt-4 rounded-lg bg-surface-2 p-3 text-xs"><p className="font-display text-xl font-semibold text-ink">{s.runs.toLocaleString()}</p><p className="text-muted">runs · {s.out}</p></div>
              <div className="mt-3 flex items-center justify-between gap-2 text-xs"><span className="truncate text-faint">{a.cfg}</span><Link href={a.href} className="shrink-0 font-medium text-primary-600 hover:underline dark:text-primary-300">Configure</Link></div>
            </Card>
          );
        })}
      </div>
      <Card className="mt-4 flex flex-wrap items-center gap-4 p-5">
        <Bot className="h-6 w-6 text-primary-500" />
        <p className="min-w-0 flex-1 text-sm text-muted">Agents also run from your own AI tools: connect any MCP client to <code className="rounded bg-surface-2 px-1.5 py-0.5 text-ink">/api/mcp</code> to list leads, explain routing, find SLA breaches and book meetings.</p>
        <Link href="/app/settings/developers#mcp" className="text-sm font-medium text-primary-600 hover:underline dark:text-primary-300">MCP setup</Link>
      </Card>
    </>
  );
}
