"use client";
import "./agent-chat.css";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ArrowRight, Check, ChevronRight, FileText, MessageSquare, Plus, Search, Send, Settings2, ShieldCheck, Split, X } from "lucide-react";
import { useWs, BROWSER_MODE } from "./workspace";
import { Button, Chip } from "@/components/ui";
import { conditionDescription } from "@/lib/engine/rule-description";
import { appendCompletedTurn, confirmedAction, historySchema, type AgentStep, type AgentTurn, type Proposal } from "@/lib/agent/contracts";
import { readAgentResponse, type AgentEvent } from "@/lib/agent/stream";
import type { Workspace } from "@/lib/engine/types";

const settingLabels: Record<string, string> = { enrichOrder: "Provider waterfall", perLeadCapCents: "Per-lead cap", monthlySpendCapCents: "Monthly cap", slaMinutes: "First-touch SLA (minutes)", escalateAfterMinutes: "Escalation delay (minutes)", botBlockScore: "Guard block score", botReviewScore: "Guard review score", blockDisposable: "Block disposable emails", meetingMinutes: "Meeting length (minutes)", bookingWindowDays: "Booking window (days)", icpMinEmployees: "ICP minimum employees", icpMaxEmployees: "ICP maximum employees", icpIndustries: "ICP industries", icpRegions: "ICP regions", crmTarget: "CRM target", slackChannel: "Slack channel" };
const valueLabel = (key: string, value: unknown) => key.endsWith("Cents") ? `$${(Number(value) / 100).toFixed(2)}` : Array.isArray(value) ? value.join(key === "enrichOrder" ? " → " : ", ") : typeof value === "boolean" ? value ? "On" : "Off" : String(value ?? "—");
const fieldLabels: Record<string, string> = { text: "Short text", email: "Email", select: "Dropdown", number: "Number", textarea: "Long text", buttons: "Choice buttons", checkbox: "Checkbox" };
function ProposalDetails({ proposal: p, ws }: { proposal: Proposal; ws: Workspace }) {
  const a = p.action;
  if (a.type === "form.save") return <div className="space-y-3"><div className="flex flex-wrap gap-2 text-xs text-muted"><span>{a.form.steps.length} steps</span><span>·</span><span>{a.form.status === "draft" ? "Draft — not published" : "Updates existing live form"}</span><span>· Booking {a.form.showBooking ? "on" : "off"}</span></div>{a.form.steps.map((step, i) => <div key={step.id} className="overflow-hidden rounded-xl border border-line"><p className="border-b border-line bg-surface-2 px-3 py-2 text-xs font-semibold">Step {i + 1} · {step.title}</p><ul className="divide-y divide-line">{step.fields.map((field) => <li key={field.id} className="flex flex-wrap items-start justify-between gap-x-3 gap-y-1 px-3 py-2.5 text-sm"><div className="min-w-0"><p className="break-words">{field.label}{field.required && <span className="ml-1 text-primary-500" aria-label="required">*</span>}</p>{field.options?.length ? <p className="mt-1 text-xs leading-relaxed text-muted">{field.options.join(" · ")}</p> : null}</div><span className="text-xs text-muted">{fieldLabels[field.type]}</span></li>)}</ul></div>)}{!!a.form.logic.length && <p className="text-xs text-muted">{a.form.logic.length} branching rules retained. Inspect them in the editor after saving.</p>}</div>;
  if (a.type === "rule.save") return <div className="space-y-3"><p className="text-xs text-muted">Match {a.rule.match === "all" ? "all" : "any"} conditions · {a.rule.priority === 0 ? "Before existing rules" : a.rule.priority === 999 ? "After existing rules" : `Priority ${a.rule.priority ?? ws.rules.find((r) => r.id === a.rule.id)?.priority ?? "automatic"}`}</p><ul className="space-y-2">{a.rule.conditions.length ? a.rule.conditions.map((c, i) => <li key={i} className="break-words rounded-lg bg-surface-2 px-3 py-2 text-sm">{conditionDescription(c)}</li>) : <li className="rounded-lg bg-surface-2 px-3 py-2 text-sm">All leads · explicit catch-all</li>}</ul><p className="text-xs font-medium text-muted">Receiving pool · existing weighted round robin</p><div className="flex flex-wrap gap-2">{a.rule.repIds.map((id) => <Chip key={id} tone="slate">{ws.reps.find((r) => r.id === id)?.name ?? "Unknown rep"}</Chip>)}</div></div>;
  if (a.type === "settings.save") {
    let before: Record<string, unknown> = {}; try { before = JSON.parse(p.before); } catch { /* invalid data is rejected on confirmation */ }
    return <dl className="divide-y divide-line overflow-hidden rounded-xl border border-line">{Object.entries(a.settings).map(([key, value]) => <div key={key} className="flex flex-col gap-1 px-3 py-3 sm:flex-row sm:items-center sm:justify-between"><dt className="text-sm font-medium">{settingLabels[key] ?? key}</dt><dd className="flex min-w-0 flex-wrap items-center gap-2 text-xs"><span className="break-words text-muted">{valueLabel(key, before[key])}</span><ArrowRight className="h-3 w-3 shrink-0 text-faint" /><strong className="break-words font-semibold text-primary-600 dark:text-primary-300">{valueLabel(key, value)}</strong></dd></div>)}</dl>;
  }
  const values = a.type === "lead.create" ? a.input : Object.fromEntries(Object.entries(a).filter(([key]) => key !== "type"));
  return <dl className="space-y-2 rounded-xl bg-surface-2 p-3">{Object.entries(values).map(([key, value]) => <div key={key} className="flex flex-wrap justify-between gap-2 text-sm"><dt className="text-muted">{key}</dt><dd className="min-w-0 break-words">{String(value)}</dd></div>)}</dl>;
}
function ProposalCard({ proposal, ws, saving, disabled, onConfirm, onDiscard }: { proposal: Proposal; ws: Workspace; saving: boolean; disabled: boolean; onConfirm: () => void; onDiscard: () => void }) {
  const a = proposal.action;
  const label = a.type === "form.save" ? "Open in form editor" : a.type === "rule.save" ? "Open in Routing" : a.type === "settings.save" ? "Open in Settings" : "Open in workspace";
  return <article data-agent-proposal className="overflow-hidden rounded-2xl border border-line bg-surface"><div className="flex items-start justify-between gap-3 border-b border-line px-4 py-4 sm:px-5"><div className="min-w-0"><p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-primary-600 dark:text-primary-300">{a.type === "form.save" ? "Form proposal" : a.type === "rule.save" ? "Routing proposal" : a.type === "settings.save" ? "Settings proposal" : "Action proposal"}</p><h3 className="break-words text-base font-semibold tracking-tight">{proposal.title}</h3></div><Chip tone={proposal.status === "saved" ? "mint" : "slate"}>{proposal.status === "pending" ? "Not saved" : proposal.status === "saved" ? "Saved" : proposal.status === "superseded" ? "Replaced" : "Discarded"}</Chip></div><div className="space-y-4 p-4 sm:p-5"><ProposalDetails proposal={proposal} ws={ws} /><p className="text-xs leading-relaxed text-muted">{proposal.summary}</p>{proposal.status === "pending" ? <div className="flex flex-wrap gap-2"><Button size="sm" loading={saving} icon={<Check className="h-4 w-4" />} onClick={onConfirm} disabled={disabled}>Confirm &amp; save</Button><Button size="sm" variant="ghost" onClick={onDiscard} disabled={disabled}>Discard proposal</Button></div> : proposal.status === "saved" ? <div className="flex flex-wrap items-center justify-between gap-3"><span data-agent-saved className="flex items-center gap-1.5 text-xs font-medium text-muted"><Check className="h-4 w-4 text-primary-500" />Saved to this workspace</span><Link className="inline-flex items-center gap-1 text-sm font-medium text-primary-600 hover:underline dark:text-primary-300" href={proposal.href}>{label}<ChevronRight className="h-4 w-4" /></Link></div> : <p className="text-xs text-muted">{proposal.status === "superseded" ? "Replaced by a newer draft in this conversation." : "No changes were applied."}</p>}</div></article>;
}

type LiveTurn = { request: string; steps: AgentStep[]; proposals: Proposal[]; text: string; status: Extract<AgentEvent, { type: "status" }>["status"]; mode?: string; notice?: string };
function ToolActivity({ steps, live = false }: { steps: AgentStep[]; live?: boolean }) {
  return steps.length ? <details open={live} className="rounded-xl border border-line"><summary className="cursor-pointer px-4 py-3 text-xs font-medium text-muted">Tool activity · {steps.length} {steps.length === 1 ? "step" : "steps"}</summary><div className="space-y-2 border-t border-line p-3">{steps.map((step, i) => <div key={`${i}-${step.tool}`} data-agent-live-step={live || undefined} className={`rounded-lg bg-surface-2 p-3 text-xs leading-relaxed ${live ? "agent-live-enter" : ""}`}><p className="mb-1 font-medium text-muted">Thought <span className="font-normal">· {step.thought}</span></p><p className="font-semibold">Action · {step.tool}</p><p className="mt-1 whitespace-pre-wrap break-words text-muted">Observation · {step.observation}</p></div>)}<p className="px-1 text-[10px] text-faint">Short action summaries, not hidden model reasoning.</p></div></details> : null;
}
function FollowUps({ questions, onReply }: { questions?: string[]; onReply: () => void }) {
  return questions?.length ? <div data-agent-questions className="rounded-xl border border-line bg-surface-2/60 p-4"><p className="mb-2 text-xs font-semibold text-ink">Let’s refine it</p><ul className="space-y-2 text-sm leading-relaxed text-muted">{questions.map((q) => <li key={q} className="flex items-start gap-2"><span aria-hidden className="mt-2 h-1 w-1 shrink-0 rounded-full bg-primary-500" />{q}</li>)}</ul><button type="button" onClick={onReply} className="mt-3 text-xs font-medium text-primary-600 hover:underline dark:text-primary-300">Reply to refine this draft ↑</button></div> : null;
}
function WorkingStatus({ status }: { status: LiveTurn["status"] }) {
  const Icon = status.phase === "drafting" ? FileText : status.phase === "routing" ? Split : status.phase === "settings" ? Settings2 : status.phase === "researching" ? Search : status.phase === "thinking" ? MessageSquare : status.phase === "review" ? Check : ShieldCheck;
  return <div data-agent-status data-phase={status.phase} role="status" aria-live="polite" className="flex items-center gap-3 rounded-xl border border-primary-200/70 bg-primary-50/50 px-4 py-3 dark:border-primary-900 dark:bg-primary-500/5"><span aria-hidden className="agent-working-mark relative grid h-9 w-9 shrink-0 place-items-center rounded-full bg-surface text-primary-500"><Icon className="h-4 w-4" /></span><div className="min-w-0"><p className="flex items-center gap-1 text-sm font-medium">{status.label}<span aria-hidden className="agent-working-dots inline-flex"><span>·</span><span>·</span><span>·</span></span></p><p className="mt-0.5 text-[11px] text-muted">{status.tool ? status.tool.replaceAll("_", " ") : "Working with your actual workspace"} · nothing saved</p></div></div>;
}

export function AgentChat() {
  const { ws, user, dispatch, busy } = useWs();
  const [greeting, setGreeting] = useState("Hello");
  const [input, setInput] = useState("");
  const [history, setHistory] = useState<AgentTurn[]>([]);
  const [loadedKey, setLoadedKey] = useState("");
  const writable = useRef(false);
  const [thinking, setThinking] = useState(false);
  const [live, setLive] = useState<LiveTurn | null>(null);
  const liveRef = useRef<HTMLDivElement>(null);
  const [saving, setSaving] = useState("");
  const [error, setError] = useState("");
  const [clearArmed, setClearArmed] = useState(false);
  const controller = useRef<AbortController | null>(null);
  const saveLock = useRef(false);
  const wid = ws?.id;
  const key = `vr:agent-chat:v1:${wid ?? "loading"}`;
  const loaded = loadedKey === key;
  useEffect(() => { const hour = new Date().getHours(); setGreeting(hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening"); }, []);
  useEffect(() => {
    if (!wid) return;
    writable.current = false; setHistory([]);
    try { const raw = localStorage.getItem(key); if (raw) { const parsed = historySchema.safeParse(JSON.parse(raw)); if (parsed.success) { setHistory(parsed.data); writable.current = true; } else setError("The saved conversation could not be restored. Start a new request to begin a fresh chat."); } else writable.current = true; } catch { setError("Chat storage is unavailable in this browser. Your workspace is unchanged."); }
    setLoadedKey(key);
  }, [key, wid]); // load once per workspace, not on every tick
  useEffect(() => { if (loaded && writable.current) try { localStorage.setItem(key, JSON.stringify(history)); } catch { setError("This browser could not save the conversation. Keep this tab open or free some storage."); } }, [history, key, loaded]);
  useEffect(() => () => controller.current?.abort(), []);
  useEffect(() => { if (thinking) liveRef.current?.scrollIntoView({ block: "start", behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" }); }, [thinking]);
  if (!ws) return null;
  const firstName = user.name.trim().split(/\s+/)[0] || "there";
  const send = async (request = input) => {
    if (!request.trim() || thinking || !loaded || controller.current || saveLock.current || busy) return;
    setThinking(true); setLive({ request: request.trim(), steps: [], proposals: [], text: "", status: { phase: "thinking", label: "Thinking through your request" } }); setInput(""); setError("");
    controller.current = new AbortController();
    try {
      const response = await fetch("/api/app/agent", { method: "POST", headers: { "Content-Type": "application/json", Accept: "text/event-stream" }, body: JSON.stringify({ message: request.trim(), history, snapshot: BROWSER_MODE ? ws : undefined }), signal: controller.current.signal });
      const turn = await readAgentResponse(response, (event) => {
        setLive((current) => {
          if (!current) return current;
          if (event.type === "status") return { ...current, status: event.status, mode: event.status.mode ?? current.mode };
          if (event.type === "step") return { ...current, steps: [...current.steps, event.step] };
          if (event.type === "proposal") return { ...current, proposals: [...current.proposals.filter((p) => p.id !== event.proposal.id), event.proposal] };
          if (event.type === "delta") return { ...current, text: (current.text + event.text).slice(0, 12000) };
          if (event.type === "reset") return { ...current, steps: [], proposals: [], text: "", notice: event.message };
          return current;
        });
      });
      writable.current = true;
      setHistory((h) => appendCompletedTurn(h, turn)); setLive(null);
    } catch (e) {
      const stopped = controller.current?.signal.aborted || (e instanceof DOMException && e.name === "AbortError");
      const message = stopped ? "Request stopped. Unfinished drafts were discarded; no changes were saved." : e instanceof Error ? e.message : "Request failed. No changes saved.";
      setError(message); setInput(request);
      setLive((current) => current ? { ...current, text: "", proposals: [], notice: message } : current);
    } finally { setThinking(false); controller.current = null; }

  };
  const updateProposal = (turnId: string, proposalId: string, status: Proposal["status"]) => setHistory((turns) => turns.map((t) => t.id === turnId ? { ...t, proposals: t.proposals.map((p) => p.id === proposalId ? { ...p, status } : p) } : t));
  const confirm = async (turn: AgentTurn, proposal: Proposal) => {
    if (saveLock.current || thinking) return;
    saveLock.current = true; setSaving(proposal.id); setError("");
    try {
      const action = confirmedAction(proposal, ws);
      const result = await dispatch(action, { success: "Agent proposal saved" });
      if (result !== undefined) updateProposal(turn.id, proposal.id, "saved");
      else setError("The proposal could not be saved. Check the workspace permissions and try again.");
    } catch (e) { setError(e instanceof Error ? e.message : "Unable to confirm this proposal."); }
    finally { saveLock.current = false; setSaving(""); }
  };
  const rep = ws.reps.find((r) => r.region === "EMEA") ?? ws.reps[0];
  const suggestions = [
    { icon: FileText, label: "Build a demo form", request: "Build a two-step demo form with company size and budget" },
    { icon: Split, label: "Create a routing rule", request: rep ? `Germany leads go to ${rep.name}, everyone else round-robin` : "All leads round robin" },
    { icon: Settings2, label: "Set enrichment waterfall", request: "Set enrichment to Apollo then Valyu, 50 cents per lead, $100 per month" },
    { icon: Search, label: "Explain a lead", request: ws.leads[0] ? `Explain why ${ws.leads[0].name} was routed` : "List leads" },
  ];
  return <section data-agent-chat className="mx-auto mb-10 max-w-4xl">
    <div className="mb-6 flex flex-wrap items-start justify-between gap-3"><div className="min-w-0 flex-1"><p className="mb-2 text-xs font-medium text-muted">Agents · Workspace builder</p><h1 className="break-words text-2xl font-semibold tracking-[-.035em] sm:text-3xl">{greeting}, {firstName}.</h1><p className="mt-2 max-w-xl text-sm leading-relaxed text-muted">Describe the workflow. I&apos;ll check your workspace and build something you can review.</p></div>{!!history.length && <div className="flex flex-wrap items-center gap-2">{clearArmed ? <><span className="text-xs text-muted">Clear this chat?</span><Button size="sm" variant="secondary" onClick={() => { setHistory([]); setLive(null); setClearArmed(false); setError(""); }} disabled={thinking || !!saving}>Clear</Button><Button size="sm" variant="ghost" onClick={() => setClearArmed(false)}>Keep</Button></> : <Button size="sm" variant="ghost" icon={<Plus className="h-3.5 w-3.5" />} onClick={() => setClearArmed(true)} disabled={thinking || !!saving}>New conversation</Button>}</div>}</div>
    <form onSubmit={(e) => { e.preventDefault(); void send(); }} className="overflow-hidden rounded-2xl border border-line bg-surface shadow-[0_4px_24px_-15px_rgb(20_30_50_/_0.15)] transition-shadow focus-within:border-primary-400 focus-within:ring-4 focus-within:ring-primary-500/5">
      <label htmlFor="agent-composer" className="sr-only">Ask the agent</label><textarea id="agent-composer" value={input} onChange={(e) => setInput(e.target.value)} maxLength={4000} disabled={thinking || !loaded} placeholder="Ask anything about your inbound workflow…" className="block min-h-32 w-full resize-y bg-transparent p-4 text-[15px] leading-relaxed outline-none placeholder:text-faint focus-visible:outline-none sm:min-h-36 sm:p-5" onKeyDown={(e) => { if ((e.ctrlKey || e.metaKey) && e.key === "Enter") { e.preventDefault(); void send(); } }} />
      <div className="flex items-center justify-between gap-3 px-4 pb-4 sm:px-5"><span className="flex items-center gap-1.5 text-[11px] text-muted"><ShieldCheck className="h-3.5 w-3.5 shrink-0" />You review every change</span><div className="flex items-center gap-3"><Link href="/app/settings/integrations" className="hidden text-xs text-muted hover:text-ink sm:block">Model &amp; tools</Link>{thinking ? <button type="button" aria-label="Stop request" onClick={() => controller.current?.abort()} className="grid h-9 w-9 place-items-center rounded-full border border-line text-muted hover:text-ink"><X className="h-4 w-4" /></button> : <button type="submit" aria-label="Send request" disabled={!input.trim() || !loaded || !!saving} className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-primary-500 text-white transition-colors hover:bg-primary-600 disabled:cursor-not-allowed disabled:opacity-40"><Send className="h-4 w-4" /></button>}</div></div>
    </form>
    <div className="mt-3 flex flex-wrap gap-2">{suggestions.map((s) => <button key={s.label} type="button" onClick={() => void send(s.request)} disabled={thinking || !loaded || !!saving} className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-surface px-2.5 py-2 text-xs text-muted transition-colors hover:border-primary-300 hover:text-ink disabled:opacity-40"><s.icon className="h-3.5 w-3.5" />{s.label}</button>)}</div>
    <p className="mt-3 text-[11px] leading-relaxed text-faint">Uses your connected OpenRouter/model and Valyu tools. No keys? The built-in demo planner can still build. Chat stays in this browser.</p>
    {error && !live?.notice && <div role="alert" className="mt-4 rounded-xl border border-primary-200 bg-primary-50 p-4 text-sm leading-relaxed text-primary-800 dark:border-primary-800 dark:bg-primary-500/10 dark:text-primary-100">{error}</div>}

    {!!history.length && <div className="mt-8 space-y-8" aria-label="Agent conversation">{history.map((turn) => <div key={turn.id} data-agent-turn className="space-y-4"><div className="ml-4 rounded-xl bg-surface-2 p-4 sm:ml-12"><p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-muted">You</p><p className="whitespace-pre-wrap break-words text-sm leading-relaxed">{turn.request}</p></div><div><div className="mb-2 flex flex-wrap items-center gap-2"><MessageSquare className="h-4 w-4 text-primary-500" /><span className="text-sm font-semibold">Velaroute</span><span className="text-[10px] text-muted">{turn.mode}</span></div><p className="whitespace-pre-wrap break-words text-sm leading-relaxed text-muted">{turn.answer}</p></div><FollowUps questions={turn.questions} onReply={() => { document.getElementById("agent-composer")?.focus(); }} /><ToolActivity steps={turn.steps} /><div className="space-y-4">{turn.proposals.map((p) => <ProposalCard key={p.id} proposal={p} ws={ws} saving={saving === p.id} disabled={busy || !!saving || thinking} onConfirm={() => void confirm(turn, p)} onDiscard={() => updateProposal(turn.id, p.id, "dismissed")} />)}</div></div>)}</div>}
    {live && <div ref={liveRef} data-agent-live className="mt-8 scroll-mt-20 space-y-4"><div className="ml-4 rounded-xl bg-surface-2 p-4 sm:ml-12"><p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-muted">You</p><p className="whitespace-pre-wrap break-words text-sm leading-relaxed">{live.request}</p></div><div className="flex items-center justify-between gap-3"><div className="flex min-w-0 flex-wrap items-center gap-2"><MessageSquare className="h-4 w-4 text-primary-500" /><span className="text-sm font-semibold">Velaroute</span><span className="text-[10px] text-muted">{live.mode ?? "Connecting to workspace tools"}</span></div>{thinking && <button type="button" aria-label="Stop building" onClick={() => controller.current?.abort()} className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-line px-2 py-1.5 text-xs text-muted hover:text-ink"><X className="h-3.5 w-3.5" />Stop</button>}</div>{thinking && <WorkingStatus status={live.status} />}{live.notice && <p role={thinking ? undefined : "alert"} className="text-xs leading-relaxed text-muted">{live.notice}</p>}{live.text && <p data-agent-live-answer className="whitespace-pre-wrap break-words text-sm leading-relaxed text-muted">{live.text}</p>}<ToolActivity steps={live.steps} live />{thinking && !live.proposals.length && ["drafting", "routing", "settings"].includes(live.status.phase) && <div aria-label="Building a draft" className="space-y-3 rounded-2xl border border-dashed border-line p-5"><p className="text-xs font-medium text-muted">Preparing a structured preview</p><div className="agent-building-skeleton h-3 w-2/3 rounded bg-surface-2" /><div className="agent-building-skeleton h-9 rounded-lg bg-surface-2" /><div className="agent-building-skeleton h-9 rounded-lg bg-surface-2" /></div>}<div className="space-y-4">{live.proposals.map((p) => <div key={p.id} data-agent-live-proposal className="agent-live-enter"><ProposalCard proposal={p} ws={ws} saving={false} disabled onConfirm={() => {}} onDiscard={() => {}} /><p className="mt-2 text-xs text-muted">Finishing the review. Confirmation unlocks when the response is complete.</p></div>)}</div></div>}

  </section>;
}
