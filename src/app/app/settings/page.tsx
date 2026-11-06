"use client";
import { useEffect, useState } from "react";
import { Check, RotateCcw, Save } from "lucide-react";
import { useWs } from "@/components/app/workspace";
import { Loading, PageHeader } from "@/components/app/shell";
import { Button, Card, CardHeader, Chip, Field, Input, Modal, Select, Toggle } from "@/components/ui";
import type { Settings, Workspace } from "@/lib/engine/types";
import { fmtDate, money } from "@/components/app/format";
import { cn } from "@/lib/cn";

const PLANS: { id: Workspace["plan"]; name: string; price: number; desc: string; features: string[] }[] = [
  { id: "launch", name: "Launch", price: 99, desc: "For teams with up to 5 reps", features: ["1,000 inbound leads / month", "Forms, chat and email capture", "Rules + weighted round robin", "Instant booking", "HubSpot or Attio sync", "Email support"] },
  { id: "scale", name: "Scale", price: 249, desc: "For teams with up to 20 reps", features: ["5,000 inbound leads / month", "Everything in Launch", "Enrichment waterfall + spend caps", "SLA agent with Slack escalation", "Copilot (bring your own model key)", "API, webhooks and MCP"] },
  { id: "command", name: "Command", price: 499, desc: "For teams with up to 50 reps", features: ["20,000 inbound leads / month", "Everything in Scale", "Salesforce sync", "Multiple workspaces + roles", "Audit log export", "Priority support + onboarding"] },
];
const PROVIDERS = ["apollo", "clay", "valyu"] as const;

export default function SettingsPage() {
  const { ws, dispatch, busy, user } = useWs();
  const [s, setS] = useState<Settings | null>(null);
  const [name, setName] = useState("");
  const [reset, setReset] = useState(false);
  useEffect(() => { if (ws && !s) { setS(structuredClone(ws.settings)); setName(ws.name); } }, [ws, s]);
  if (!ws || !s) return <Loading />;
  const dirty = JSON.stringify(s) !== JSON.stringify(ws.settings);
  const admin = user.role !== "member";
  const num = (k: keyof Settings) => (e: React.ChangeEvent<HTMLInputElement>) => setS({ ...s, [k]: Number(e.target.value) });

  return (
    <>
      <PageHeader title="Settings" subtitle="Workspace, SLA, guard, enrichment, ideal customer profile and billing."
        actions={<><Button variant="ghost" disabled={!dirty} onClick={() => setS(structuredClone(ws.settings))}>Discard</Button><Button icon={<Save className="h-4 w-4" />} loading={busy} disabled={!dirty || !admin} onClick={async () => { await dispatch({ type: "settings.save", settings: s }, { success: "Settings saved" }); setS(null); }}>Save changes</Button></>} />
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader title="Workspace" />
          <div className="grid gap-3 p-5">
            <Field label="Workspace name" htmlFor="ws-name"><div className="flex gap-2"><Input id="ws-name" value={name} onChange={(e) => setName(e.target.value)} /><Button variant="secondary" disabled={name === ws.name || !name.trim()} onClick={() => dispatch({ type: "workspace.rename", name }, { success: "Renamed" })}>Rename</Button></div></Field>
            <Field label="CRM to write back to" htmlFor="crm"><Select id="crm" value={s.crmTarget} onChange={(e) => setS({ ...s, crmTarget: e.target.value as Settings["crmTarget"] })}><option value="hubspot">HubSpot</option><option value="salesforce">Salesforce</option><option value="attio">Attio</option></Select></Field>
            <Field label="Slack channel for alerts" htmlFor="slack"><Input id="slack" value={s.slackChannel} onChange={(e) => setS({ ...s, slackChannel: e.target.value })} /></Field>
          </div>
        </Card>
        <Card id="sla">
          <CardHeader title="Speed-to-lead SLA" subtitle="The SLA agent warns at 80% of the window, alerts on breach, then re-routes." />
          <div className="grid gap-3 p-5 sm:grid-cols-2">
            <Field label="First touch within (minutes)" htmlFor="sla-min"><Input id="sla-min" type="number" min={1} value={s.slaMinutes} onChange={num("slaMinutes")} /></Field>
            <Field label="Escalate after breach (minutes)" htmlFor="esc-min"><Input id="esc-min" type="number" min={1} value={s.escalateAfterMinutes} onChange={num("escalateAfterMinutes")} /></Field>
            <Field label="Meeting length (minutes)" htmlFor="mtg"><Select id="mtg" value={s.meetingMinutes} onChange={num("meetingMinutes") as never}>{[15, 30, 45, 60].map((m) => <option key={m} value={m}>{m}</option>)}</Select></Field>
            <Field label="Booking window (days)" htmlFor="bw"><Input id="bw" type="number" min={1} max={30} value={s.bookingWindowDays} onChange={num("bookingWindowDays")} /></Field>
          </div>
        </Card>
        <Card id="guard">
          <CardHeader title="Guard" subtitle="Risk score 0–100 from honeypot, timing, disposable domains, junk names, links and spam phrases." />
          <div className="grid gap-3 p-5 sm:grid-cols-2">
            <Field label="Send to review at score ≥" htmlFor="rev"><Input id="rev" type="number" min={1} max={99} value={s.botReviewScore} onChange={num("botReviewScore")} /></Field>
            <Field label="Block at score ≥" htmlFor="blk"><Input id="blk" type="number" min={2} max={100} value={s.botBlockScore} onChange={num("botBlockScore")} /></Field>
            <label className="flex items-center justify-between gap-3 rounded-2xl bg-surface-2 p-3 text-sm sm:col-span-2">Always block disposable email domains<Toggle checked={s.blockDisposable} label="Block disposable" onChange={(v) => setS({ ...s, blockDisposable: v })} /></label>
          </div>
        </Card>
        <Card id="enrichment">
          <CardHeader title="Enrichment budget" subtitle="Hard caps. When a cap is hit, leads still route using the free offline estimate." />
          <div className="grid gap-3 p-5 sm:grid-cols-2">
            <Field label="Monthly cap (USD)" htmlFor="cap" hint={`Now ${money(s.monthlySpendCapCents)}`}><Input id="cap" type="number" min={0} step={1} value={s.monthlySpendCapCents / 100} onChange={(e) => setS({ ...s, monthlySpendCapCents: Math.round(Number(e.target.value) * 100) })} /></Field>
            <Field label="Per-lead cap (cents)" htmlFor="plc"><Input id="plc" type="number" min={0} value={s.perLeadCapCents} onChange={num("perLeadCapCents")} /></Field>
            <div className="sm:col-span-2"><p className="label">Waterfall order</p><div className="flex flex-wrap gap-2">
              {PROVIDERS.map((p) => { const on = s.enrichOrder.includes(p); return <button key={p} type="button" aria-pressed={on} onClick={() => setS({ ...s, enrichOrder: on ? s.enrichOrder.filter((x) => x !== p) : [...s.enrichOrder, p] })} className={cn("inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm capitalize", on ? "border-primary-400 bg-primary-50 text-primary-900 dark:bg-primary-500/15 dark:text-primary-100" : "border-line text-muted")}>{on && <Check className="h-3.5 w-3.5" />}{p}{on && <span className="text-xs opacity-70">#{s.enrichOrder.indexOf(p) + 1}</span>}</button>; })}
            </div><p className="mt-1.5 text-xs text-faint">Click to toggle; order follows the order you turn them on.</p></div>
          </div>
        </Card>
        <Card>
          <CardHeader title="Ideal customer profile" subtitle="Drives the ICP score used in routing rules and the inbox." />
          <div className="grid gap-3 p-5 sm:grid-cols-2">
            <Field label="Min employees" htmlFor="icpmin"><Input id="icpmin" type="number" min={1} value={s.icpMinEmployees} onChange={num("icpMinEmployees")} /></Field>
            <Field label="Max employees" htmlFor="icpmax"><Input id="icpmax" type="number" min={1} value={s.icpMaxEmployees} onChange={num("icpMaxEmployees")} /></Field>
            <Field label="Industries (comma separated)" htmlFor="icpind" className="sm:col-span-2"><Input id="icpind" value={s.icpIndustries.join(", ")} onChange={(e) => setS({ ...s, icpIndustries: e.target.value.split(",").map((x) => x.trim()).filter(Boolean) })} /></Field>
            <Field label="Regions (comma separated)" htmlFor="icpreg" className="sm:col-span-2"><Input id="icpreg" value={s.icpRegions.join(", ")} onChange={(e) => setS({ ...s, icpRegions: e.target.value.split(",").map((x) => x.trim().toUpperCase()).filter(Boolean) })} /></Field>
          </div>
        </Card>
        <Card>
          <CardHeader title="Copilot model" subtitle="Add the matching key in Integrations. Without one, Copilot uses built-in drafts." />
          <div className="grid gap-3 p-5 sm:grid-cols-2">
            <Field label="Provider" htmlFor="aip"><Select id="aip" value={s.aiProvider} onChange={(e) => setS({ ...s, aiProvider: e.target.value as Settings["aiProvider"], aiModel: e.target.value === "anthropic" ? "claude-sonnet-4-5" : e.target.value === "openrouter" ? "openai/gpt-4.1-mini" : "gpt-4.1-mini" })}><option value="openai">OpenAI</option><option value="openrouter">OpenRouter</option><option value="anthropic">Anthropic</option></Select></Field>
            <Field label="Model id" htmlFor="aim"><Input id="aim" value={s.aiModel} onChange={(e) => setS({ ...s, aiModel: e.target.value })} /></Field>
          </div>
        </Card>
      </div>

      <h2 id="billing" className="mb-3 mt-8 font-display text-xl font-semibold">Plan & billing</h2>
      <div className="grid gap-4 md:grid-cols-3">
        {PLANS.map((p) => (
          <Card key={p.id} className={cn("flex flex-col p-5", ws.plan === p.id && "ring-2 ring-primary-400")}>
            <div className="flex items-center justify-between"><h3 className="font-semibold">{p.name}</h3>{ws.plan === p.id && <Chip tone="violet">Current</Chip>}</div>
            <p className="mt-1 text-sm text-muted">{p.desc}</p>
            <p className="mt-3 font-display text-3xl font-semibold">${p.price}<span className="text-sm font-normal text-muted">/mo</span></p>
            <ul className="mt-4 flex-1 space-y-1.5 text-sm">{p.features.map((f) => <li key={f} className="flex gap-2"><Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />{f}</li>)}</ul>
            <Button className="mt-5" variant={ws.plan === p.id ? "secondary" : "primary"} disabled={ws.plan === p.id || !admin} onClick={() => dispatch({ type: "workspace.plan", plan: p.id }, { success: `Switched to ${p.name}` })}>{ws.plan === p.id ? "Current plan" : `Switch to ${p.name}`}</Button>
          </Card>
        ))}
      </div>
      <p className="mt-3 text-xs text-muted">Billing is in test mode: switching plans changes limits here only. No card is charged.</p>

      <div className="mt-8 grid gap-4 lg:grid-cols-[1.5fr_1fr]">
        <Card>
          <CardHeader title="Audit log" />
          <ul className="mt-3 max-h-80 divide-y divide-line overflow-y-auto">
            {ws.audit.length === 0 && <li className="px-5 py-6 text-sm text-muted">Nothing yet.</li>}
            {ws.audit.map((a, i) => <li key={i} className="flex justify-between gap-3 px-5 py-3 text-sm"><span className="min-w-0"><span className="block truncate">{a.text}</span><span className="text-xs text-faint">{a.by}</span></span><span className="shrink-0 text-xs text-faint">{fmtDate(a.at)}</span></li>)}
          </ul>
        </Card>
        <Card className="p-5">
          <h2 className="font-semibold">Danger zone</h2>
          <p className="mt-1 text-sm text-muted">Reset this workspace to its starting data. Leads, rules, forms and keys you created are removed.</p>
          <Button className="mt-4" variant="danger" icon={<RotateCcw className="h-4 w-4" />} disabled={!admin} onClick={() => setReset(true)}>Reset workspace</Button>
        </Card>
      </div>
      <Modal open={reset} onClose={() => setReset(false)} title="Reset workspace?" footer={<><Button variant="ghost" onClick={() => setReset(false)}>Cancel</Button><Button variant="danger" loading={busy} onClick={async () => { await dispatch({ type: "workspace.reset" }, { success: "Workspace reset" }); setReset(false); setS(null); }}>Reset</Button></>}>
        <p className="text-sm text-muted">This can&apos;t be undone.</p>
      </Modal>
    </>
  );
}
