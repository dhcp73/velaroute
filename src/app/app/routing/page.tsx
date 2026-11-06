"use client";
import { useState } from "react";
import { ArrowDown, ArrowUp, FlaskConical, Pencil, Plus, Trash2, UserPlus, X } from "lucide-react";
import { useWs } from "@/components/app/workspace";
import { Loading, PageHeader } from "@/components/app/shell";
import { Avatar, Button, Card, CardHeader, Chip, Empty, Field, Input, Modal, Select, Toggle } from "@/components/ui";
import type { Rep, RouteCondition, RouteField, RouteOp, RoutingRule } from "@/lib/engine/types";
import { TZ_OFFSETS } from "@/lib/engine/util";
import { cn } from "@/lib/cn";

const FIELDS: { id: RouteField; label: string }[] = [
  { id: "employees", label: "Employees" }, { id: "region", label: "Region (NA, EMEA, APAC, LATAM)" }, { id: "country", label: "Country code" }, { id: "industry", label: "Industry" },
  { id: "domain", label: "Email domain" }, { id: "icpScore", label: "ICP score" }, { id: "source", label: "Source" }, { id: "answer", label: "Form answer" },
];
const OPS: { id: RouteOp; label: string }[] = [
  { id: "equals", label: "equals" }, { id: "in", label: "is one of (comma list)" }, { id: "gte", label: "≥" }, { id: "lte", label: "≤" }, { id: "contains", label: "contains" }, { id: "ends_with", label: "ends with" },
];
type Draft = Pick<RoutingRule, "name" | "match" | "conditions" | "repIds" | "enabled"> & { id?: string; priority?: number };

function condText(c: RouteCondition) {
  return `${c.field === "answer" ? `answer “${c.key}”` : FIELDS.find((f) => f.id === c.field)?.label.split(" (")[0]} ${OPS.find((o) => o.id === c.op)?.label.split(" (")[0]} ${c.value}`;
}

export default function Routing() {
  const { ws, dispatch, busy } = useWs();
  const [draft, setDraft] = useState<Draft | null>(null);
  const [rep, setRep] = useState<Partial<Rep> | null>(null);
  const [test, setTest] = useState({ email: "maya@kestrel.ai", title: "VP Sales" });
  const [result, setResult] = useState<null | { rep: string | null; rule: string | null; reason: string; considered: string[]; icpScore: number; company: { name: string; employees: number; region: string; industry: string } | null }>(null);
  if (!ws) return <Loading />;
  const rules = [...ws.rules].sort((a, b) => a.priority - b.priority);

  const saveRule = async () => {
    if (!draft) return;
    const r = await dispatch({ type: "rule.save", rule: { ...draft, priority: draft.priority ?? 999 } }, { success: "Rule saved" });
    if (r !== undefined) setDraft(null);
  };
  const saveRep = async () => {
    if (!rep) return;
    const r = await dispatch({ type: "rep.save", rep: rep as Rep }, { success: "Rep saved" });
    if (r !== undefined) setRep(null);
  };
  const runTest = async () => {
    const r = await dispatch<typeof result>({ type: "route.test", sample: test });
    if (r) setResult(r);
  };

  return (
    <>
      <PageHeader title="Routing" subtitle="Account owners first, then rules top to bottom, then weighted round robin inside each pool. Away, paused (weight 0) and full reps are skipped."
        actions={<Button icon={<Plus className="h-4 w-4" />} onClick={() => setDraft({ name: "", match: "all", conditions: [{ field: "employees", op: "gte", value: "50" }], repIds: [], enabled: true })}>New rule</Button>} />
      <div className="grid gap-4 xl:grid-cols-[1.5fr_1fr]">
        <Card>
          <CardHeader title="Rules" subtitle="Evaluated in order — the first rule with an available rep wins" />
          {rules.length === 0 ? <Empty title="No rules" body="Every lead uses the fallback round robin across the whole team." /> : (
            <ol className="mt-3 divide-y divide-line">
              {rules.map((r, i) => (
                <li key={r.id} className={cn("flex flex-wrap items-start gap-3 px-5 py-4 sm:flex-nowrap", !r.enabled && "opacity-60")}>
                  <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-surface-2 text-xs font-semibold">{i + 1}</span>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">{r.name}</p>
                    <p className="mt-0.5 text-sm text-muted">{r.conditions.length ? r.conditions.map(condText).join(r.match === "all" ? " and " : " or ") : "Always"}</p>
                    <div className="mt-2 flex flex-wrap items-center gap-1.5">{r.repIds.map((id) => { const p = ws.reps.find((x) => x.id === id); return p ? <Chip key={id} tone={p.available && p.weight > 0 ? "violet" : "slate"}><Avatar name={p.name} color={p.color} size={16} />{p.name.split(" ")[0]} ×{p.weight}{!p.available ? " · away" : ""}</Chip> : null; })}<span className="text-xs text-faint">{r.hits} hits</span></div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Toggle checked={r.enabled} label={`Enable ${r.name}`} onChange={(v) => dispatch({ type: "rule.save", rule: { ...r, enabled: v } }, { quiet: false })} />
                    <button type="button" className="rounded-full p-2 text-muted hover:bg-surface-2 disabled:opacity-30" disabled={i === 0} aria-label="Move up" onClick={() => dispatch({ type: "rule.move", ruleId: r.id, dir: -1 })}><ArrowUp className="h-4 w-4" /></button>
                    <button type="button" className="rounded-full p-2 text-muted hover:bg-surface-2 disabled:opacity-30" disabled={i === rules.length - 1} aria-label="Move down" onClick={() => dispatch({ type: "rule.move", ruleId: r.id, dir: 1 })}><ArrowDown className="h-4 w-4" /></button>
                    <button type="button" className="rounded-full p-2 text-muted hover:bg-surface-2" aria-label={`Edit ${r.name}`} onClick={() => setDraft({ ...r })}><Pencil className="h-4 w-4" /></button>
                    <button type="button" className="rounded-full p-2 text-muted hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-500/10" aria-label={`Delete ${r.name}`} onClick={() => dispatch({ type: "rule.delete", ruleId: r.id }, { success: "Rule deleted" })}><Trash2 className="h-4 w-4" /></button>
                  </div>
                </li>
              ))}
            </ol>
          )}
          <p className="border-t border-line px-5 py-3 text-xs text-muted">Fallback: if no rule matches, the lead goes round robin across every available rep.</p>
        </Card>

        <Card>
          <CardHeader title="Route tester" subtitle="Dry run — nothing is saved" action={<FlaskConical className="h-5 w-5 text-primary-500" />} />
          <div className="grid gap-3 p-5">
            <Field label="Email" htmlFor="rt-email"><Input id="rt-email" value={test.email} onChange={(e) => setTest({ ...test, email: e.target.value })} /></Field>
            <Field label="Job title" htmlFor="rt-title"><Input id="rt-title" value={test.title} onChange={(e) => setTest({ ...test, title: e.target.value })} /></Field>
            <Button onClick={runTest} loading={busy}>Explain route</Button>
            {result && (
              <div className="rounded-2xl bg-surface-2 p-4 text-sm" aria-live="polite">
                <p className="font-semibold">{result.rep ? `→ ${result.rep}` : "Unassigned"}</p>
                <p className="mt-1 text-muted">{result.reason}</p>
                {result.company && <p className="mt-2 text-xs text-muted">{result.company.name} · {result.company.employees} employees · {result.company.region} · {result.company.industry} · ICP {result.icpScore}</p>}
                {result.considered.length > 0 && <ul className="mt-2 list-disc pl-4 text-xs text-faint">{result.considered.map((c, i) => <li key={i}>{c}</li>)}</ul>}
              </div>
            )}
          </div>
        </Card>
      </div>

      <Card className="mt-4">
        <CardHeader title="Team" subtitle="Weights set each rep's share of round robin. Weight 0 pauses a rep; “away” skips them and their accounts fall back to rules." action={<Button size="sm" variant="tonal" icon={<UserPlus className="h-4 w-4" />} onClick={() => setRep({ name: "", email: "", weight: 1, capacityPerDay: 30, available: true, timezone: "America/New_York", workStart: 9, workEnd: 17, calendar: "google", region: "NA", team: "smb", title: "Account Executive" })}>Add rep</Button>} />
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[720px] text-sm">
            <thead><tr className="border-y border-line text-left text-xs uppercase tracking-wide text-faint"><th className="px-5 py-2.5 font-medium">Rep</th><th className="px-5 py-2.5 font-medium">Weight</th><th className="px-5 py-2.5 font-medium">Daily cap</th><th className="px-5 py-2.5 font-medium">Hours</th><th className="px-5 py-2.5 font-medium">Calendar</th><th className="px-5 py-2.5 font-medium">Available</th><th className="px-5 py-2.5" /></tr></thead>
            <tbody>
              {ws.reps.map((r) => (
                <tr key={r.id} className="border-b border-line/70 last:border-0">
                  <td className="px-5 py-3"><span className="flex items-center gap-3"><Avatar name={r.name} color={r.color} /><span className="min-w-0"><span className="block truncate font-medium">{r.name}</span><span className="block truncate text-xs text-muted">{r.title} · {r.region}</span></span></span></td>
                  <td className="px-5 py-3"><Input aria-label={`Weight for ${r.name}`} type="number" min={0} max={10} className="w-20" defaultValue={r.weight} key={`w-${r.id}-${r.weight}`} onBlur={(e) => Number(e.target.value) !== r.weight && dispatch({ type: "rep.save", rep: { ...r, weight: Number(e.target.value) } }, { success: `${r.name.split(" ")[0]}'s weight → ${e.target.value}` })} /></td>
                  <td className="px-5 py-3 tabular-nums">{r.capacityPerDay}/day</td>
                  <td className="whitespace-nowrap px-5 py-3 text-muted">{r.workStart}:00–{r.workEnd}:00 · {r.timezone.split("/")[1]?.replace("_", " ")}</td>
                  <td className="px-5 py-3"><Chip tone={r.calendar === "none" ? "slate" : "sky"}>{r.calendar === "google" ? "Google" : r.calendar === "microsoft" ? "Microsoft" : "None"}</Chip></td>
                  <td className="px-5 py-3"><Toggle checked={r.available} label={`${r.name} available`} onChange={(v) => dispatch({ type: "rep.save", rep: { ...r, available: v } }, { success: v ? `${r.name} is back in rotation` : `${r.name} marked away — skipped by routing` })} /></td>
                  <td className="px-5 py-3 text-right"><button type="button" className="rounded-full p-2 text-muted hover:bg-surface-2" aria-label={`Edit ${r.name}`} onClick={() => setRep({ ...r })}><Pencil className="h-4 w-4" /></button><button type="button" className="rounded-full p-2 text-muted hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-500/10" aria-label={`Remove ${r.name}`} onClick={() => dispatch({ type: "rep.delete", repId: r.id }, { success: "Rep removed" })}><Trash2 className="h-4 w-4" /></button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Modal wide open={!!draft} onClose={() => setDraft(null)} title={draft?.id ? "Edit rule" : "New rule"} footer={<><Button variant="ghost" onClick={() => setDraft(null)}>Cancel</Button><Button loading={busy} onClick={saveRule}>Save rule</Button></>}>
        {draft && (
          <div className="grid gap-4">
            <div className="grid gap-3 sm:grid-cols-[1fr_200px]">
              <Field label="Rule name" htmlFor="r-name"><Input id="r-name" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} placeholder="e.g. EMEA mid-market" /></Field>
              <Field label="Match" htmlFor="r-match"><Select id="r-match" value={draft.match} onChange={(e) => setDraft({ ...draft, match: e.target.value as "all" | "any" })}><option value="all">All conditions</option><option value="any">Any condition</option></Select></Field>
            </div>
            <div>
              <p className="label">Conditions</p>
              <div className="flex flex-col gap-2">
                {draft.conditions.map((c, i) => (
                  <div key={i} className="grid grid-cols-1 gap-2 rounded-2xl bg-surface-2 p-2 sm:grid-cols-[1.2fr_1fr_1fr_auto]">
                    <Select aria-label="Field" value={c.field} onChange={(e) => { const cs = [...draft.conditions]; cs[i] = { ...c, field: e.target.value as RouteField }; setDraft({ ...draft, conditions: cs }); }}>{FIELDS.map((f) => <option key={f.id} value={f.id}>{f.label}</option>)}</Select>
                    <Select aria-label="Operator" value={c.op} onChange={(e) => { const cs = [...draft.conditions]; cs[i] = { ...c, op: e.target.value as RouteOp }; setDraft({ ...draft, conditions: cs }); }}>{OPS.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}</Select>
                    <div className="flex gap-2">{c.field === "answer" && <Input aria-label="Answer key" placeholder="field id" value={c.key ?? ""} onChange={(e) => { const cs = [...draft.conditions]; cs[i] = { ...c, key: e.target.value }; setDraft({ ...draft, conditions: cs }); }} />}<Input aria-label="Value" value={c.value} onChange={(e) => { const cs = [...draft.conditions]; cs[i] = { ...c, value: e.target.value }; setDraft({ ...draft, conditions: cs }); }} placeholder="value" /></div>
                    <button type="button" className="justify-self-end rounded-full p-2 text-muted hover:bg-surface hover:text-rose-600" aria-label="Remove condition" onClick={() => setDraft({ ...draft, conditions: draft.conditions.filter((_, k) => k !== i) })}><X className="h-4 w-4" /></button>
                  </div>
                ))}
              </div>
              <Button size="sm" variant="ghost" className="mt-2" icon={<Plus className="h-4 w-4" />} onClick={() => setDraft({ ...draft, conditions: [...draft.conditions, { field: "region", op: "equals", value: "" }] })}>Add condition</Button>
            </div>
            <div>
              <p className="label">Round-robin pool</p>
              <div className="flex flex-wrap gap-2">
                {ws.reps.map((r) => {
                  const on = draft.repIds.includes(r.id);
                  return <button key={r.id} type="button" aria-pressed={on} onClick={() => setDraft({ ...draft, repIds: on ? draft.repIds.filter((x) => x !== r.id) : [...draft.repIds, r.id] })} className={cn("inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm transition-colors", on ? "border-primary-400 bg-primary-50 text-primary-900 dark:bg-primary-500/15 dark:text-primary-100" : "border-line hover:bg-surface-2")}><Avatar name={r.name} color={r.color} size={20} />{r.name}</button>;
                })}
              </div>
            </div>
          </div>
        )}
      </Modal>

      <Modal open={!!rep} onClose={() => setRep(null)} title={rep?.id ? "Edit rep" : "Add rep"} footer={<><Button variant="ghost" onClick={() => setRep(null)}>Cancel</Button><Button loading={busy} onClick={saveRep}>Save</Button></>}>
        {rep && (
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Name" htmlFor="rp-name"><Input id="rp-name" value={rep.name ?? ""} onChange={(e) => setRep({ ...rep, name: e.target.value })} /></Field>
            <Field label="Email" htmlFor="rp-email"><Input id="rp-email" type="email" value={rep.email ?? ""} onChange={(e) => setRep({ ...rep, email: e.target.value })} /></Field>
            <Field label="Title" htmlFor="rp-title"><Input id="rp-title" value={rep.title ?? ""} onChange={(e) => setRep({ ...rep, title: e.target.value })} /></Field>
            <Field label="Region" htmlFor="rp-region"><Select id="rp-region" value={rep.region} onChange={(e) => setRep({ ...rep, region: e.target.value })}>{["NA", "EMEA", "APAC", "LATAM"].map((x) => <option key={x}>{x}</option>)}</Select></Field>
            <Field label="Weight (0 pauses)" htmlFor="rp-w"><Input id="rp-w" type="number" min={0} max={10} value={rep.weight ?? 1} onChange={(e) => setRep({ ...rep, weight: Number(e.target.value) })} /></Field>
            <Field label="Daily lead cap" htmlFor="rp-cap"><Input id="rp-cap" type="number" min={1} value={rep.capacityPerDay ?? 30} onChange={(e) => setRep({ ...rep, capacityPerDay: Number(e.target.value) })} /></Field>
            <Field label="Time zone" htmlFor="rp-tz"><Select id="rp-tz" value={rep.timezone} onChange={(e) => setRep({ ...rep, timezone: e.target.value })}>{Object.keys(TZ_OFFSETS).map((z) => <option key={z}>{z}</option>)}</Select></Field>
            <Field label="Calendar" htmlFor="rp-cal"><Select id="rp-cal" value={rep.calendar} onChange={(e) => setRep({ ...rep, calendar: e.target.value as Rep["calendar"] })}><option value="google">Google Calendar</option><option value="microsoft">Microsoft Outlook</option><option value="none">None</option></Select></Field>
            <Field label="Work starts" htmlFor="rp-ws"><Input id="rp-ws" type="number" min={0} max={23} value={rep.workStart ?? 9} onChange={(e) => setRep({ ...rep, workStart: Number(e.target.value) })} /></Field>
            <Field label="Work ends" htmlFor="rp-we"><Input id="rp-we" type="number" min={1} max={24} value={rep.workEnd ?? 17} onChange={(e) => setRep({ ...rep, workEnd: Number(e.target.value) })} /></Field>
          </div>
        )}
      </Modal>
    </>
  );
}
