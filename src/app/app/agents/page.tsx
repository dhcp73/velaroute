"use client";
import Link from "next/link";
import { useMemo } from "react";
import { Bot, Building2, CalendarCheck, Database, Radar, ShieldCheck, Sparkles, Split, Timer } from "lucide-react";
import { useWs } from "@/components/app/workspace";
import { Loading } from "@/components/app/shell";
import { AgentChat } from "@/components/app/agent-chat";
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
      <AgentChat />
      <section className="mx-auto max-w-4xl" aria-label="Pipeline agents">
        <div className="mb-4"><h2 className="text-base font-semibold tracking-tight">Your pipeline agents</h2><p className="mt-1 text-xs text-muted">Eight connected stages. They run when leads arrive — configure them here or describe a change above.</p></div>
        <div className="overflow-hidden rounded-xl border border-line bg-surface">
          {agents.map((a) => {
            const s = stats[a.id as keyof typeof stats];
            return <Link key={a.id} href={a.href} aria-label={`Configure ${a.name}`} className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 border-b border-line px-4 py-3.5 last:border-b-0 hover:bg-surface-2 sm:gap-4 sm:px-5">
              <span className="grid h-9 w-9 place-items-center rounded-lg bg-surface-2 text-muted"><a.icon className="h-4 w-4" /></span>
              <div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><h3 className="text-sm font-medium">{a.name}</h3><Chip tone="slate" dot>Active</Chip></div><p className="mt-1 break-words text-xs leading-relaxed text-muted">{a.cfg}</p></div>
              <div className="text-right" title={s.out}><p className="text-sm font-medium tabular-nums">{s.runs.toLocaleString()}</p><p className="text-[10px] text-faint">runs</p><span className="mt-1 block text-[10px] font-medium text-primary-600 dark:text-primary-300">Configure ↗</span></div>
            </Link>;
          })}
        </div>
      </section>
      <Card className="mx-auto mt-5 max-w-4xl flex flex-wrap items-center gap-4 p-5">
        <Bot className="h-6 w-6 text-primary-500" />
        <p className="min-w-0 flex-1 text-sm text-muted">Agents also run from your own AI tools: connect any MCP client to <code className="rounded bg-surface-2 px-1.5 py-0.5 text-ink">/api/mcp</code> to list leads, explain routing, find SLA breaches and book meetings.</p>
        <Link href="/app/settings/developers#mcp" className="text-sm font-medium text-primary-600 hover:underline dark:text-primary-300">MCP setup</Link>
      </Card>
    </>
  );
}
