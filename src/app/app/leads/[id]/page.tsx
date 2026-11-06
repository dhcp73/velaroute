"use client";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useMemo, useState } from "react";
import { ArrowLeft, Ban, Bot, CalendarPlus, CheckCircle2, Copy, Mail, MessageSquare, Phone, ShieldAlert, Sparkles, Trash2, XCircle } from "lucide-react";
import { useWs } from "@/components/app/workspace";
import { Loading } from "@/components/app/shell";
import { Avatar, Button, Card, CardHeader, Chip, Empty, Field, Modal, Select, Textarea } from "@/components/ui";
import { StageChip } from "@/components/app/bits";
import { ago, fmtDate, money, slaState, STAGE_LABEL } from "@/components/app/format";
import { STAGES, type Stage } from "@/lib/engine/types";
import { freeSlots } from "@/lib/engine/slots";
import { cn } from "@/lib/cn";
import { useRouter } from "next/navigation";

const STEP_LABEL: Record<string, string> = { guard: "Guard", enrich: "Enrich", match: "Match & dedupe", score: "ICP score", route: "Route", sla: "SLA clock", crm: "CRM write-back" };
type AiTask = "summarize" | "draft_reply" | "next_action" | "research";

export default function LeadPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { ws, now, dispatch, busy, toast } = useWs();
  const [touch, setTouch] = useState<null | "email" | "call">(null);
  const [touchText, setTouchText] = useState("");
  const [book, setBook] = useState(false);
  const [note, setNote] = useState("");
  const [ai, setAi] = useState<{ task: AiTask; text: string; simulated: boolean; provider: string } | null>(null);
  const [aiBusy, setAiBusy] = useState<AiTask | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const lead = ws?.leads.find((l) => l.id === id);
  const owner = ws?.reps.find((r) => r.id === lead?.ownerId);
  const slots = useMemo(() => (ws && owner && book ? freeSlots(ws, owner, new Date()) : []), [ws, owner, book]);
  if (!ws) return <Loading />;
  if (!lead) return <Card><Empty title="Lead not found" body="It may have been deleted, or this browser has a different demo workspace." action={<Link href="/app/inbox" className="text-sm font-medium text-primary-600">Back to inbox</Link>} /></Card>;
  const s = slaState(lead, now, ws.settings.slaMinutes);
  const c = lead.enrichment?.company;
  const account = ws.accounts.find((a) => a.id === lead.accountId);

  const runAi = async (task: AiTask) => {
    setAiBusy(task);
    const r = await dispatch<{ text: string; simulated: boolean; provider: string }>({ type: "lead.ai", leadId: lead.id, task });
    if (r) setAi({ task, ...r });
    setAiBusy(null);
  };
  const doTouch = async () => {
    await dispatch({ type: "lead.touch", leadId: lead.id, kind: touch!, text: touchText.trim() || (touch === "call" ? "Called the lead" : "Sent a first reply") }, { success: "First touch logged — SLA clock stopped" });
    setTouch(null); setTouchText("");
  };

  return (
    <>
      <Link href="/app/inbox" className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted hover:text-ink"><ArrowLeft className="h-4 w-4" />Inbox</Link>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div className="flex min-w-0 items-center gap-4">
          <Avatar name={lead.name} size={52} color="#f7764c" />
          <div className="min-w-0">
            <h1 className="truncate font-display text-2xl font-semibold tracking-tight">{lead.name}</h1>
            <p className="truncate text-sm text-muted">{[lead.title, lead.company || lead.domain].filter(Boolean).join(" · ")}</p>
            <div className="mt-2 flex flex-wrap gap-1.5"><StageChip stage={lead.stage} /><Chip tone={s.tone} className="tabular-nums">SLA {s.label}</Chip><Chip tone={lead.icpScore >= 70 ? "mint" : lead.icpScore >= 40 ? "sky" : "slate"}>ICP {lead.icpScore}</Chip>{lead.duplicateOf && <Chip tone="amber">Duplicate</Chip>}{lead.guard.verdict !== "pass" && <Chip tone={lead.guard.verdict === "block" ? "rose" : "amber"}>Guard: {lead.guard.verdict}</Chip>}</div>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {lead.guard.verdict === "review" && lead.stage !== "spam" && <><Button variant="tonal" icon={<CheckCircle2 className="h-4 w-4" />} onClick={() => dispatch({ type: "lead.approve", leadId: lead.id }, { success: "Approved — SLA clock started" })}>Approve</Button><Button variant="danger" icon={<Ban className="h-4 w-4" />} onClick={() => dispatch({ type: "lead.block", leadId: lead.id }, { success: "Marked as spam" })}>Block</Button></>}
          {lead.stage === "spam" && <Button variant="tonal" icon={<CheckCircle2 className="h-4 w-4" />} onClick={() => dispatch({ type: "lead.approve", leadId: lead.id }, { success: "Restored and routed" })}>Not spam</Button>}
          {lead.stage !== "spam" && <><Button variant="secondary" icon={<Mail className="h-4 w-4" />} onClick={() => setTouch("email")}>Log reply</Button><Button variant="secondary" icon={<Phone className="h-4 w-4" />} onClick={() => setTouch("call")}>Log call</Button><Button icon={<CalendarPlus className="h-4 w-4" />} onClick={() => setBook(true)} disabled={!owner || !!lead.meeting && lead.meeting.status === "booked"}>{lead.meeting?.status === "booked" ? "Meeting booked" : "Book meeting"}</Button></>}
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.5fr_1fr]">
        <div className="flex min-w-0 flex-col gap-4">
          <Card>
            <CardHeader title="Pipeline trace" subtitle="Every decision the engine made, in order" />
            <ol className="relative mx-5 mb-5 mt-4 border-l-2 border-dashed border-line pl-6">
              {lead.trace.map((t, i) => (
                <li key={i} className="relative pb-4 last:pb-0">
                  <span className={cn("absolute -left-[33px] top-0 grid h-6 w-6 place-items-center rounded-full ring-4 ring-surface", t.ok ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300" : "bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-300")}>{t.ok ? <CheckCircle2 className="h-3.5 w-3.5" /> : <XCircle className="h-3.5 w-3.5" />}</span>
                  <p className="text-sm font-semibold">{STEP_LABEL[t.step] ?? t.step}</p>
                  <p className="mt-0.5 break-words text-[13px] text-muted">{t.detail}</p>
                </li>
              ))}
            </ol>
          </Card>

          <Card>
            <CardHeader title="Copilot" subtitle={ws.integrations.find((i) => i.id === ws.settings.aiProvider)?.connected && ws.integrations.find((i) => i.id === ws.settings.aiProvider)?.keyHint !== "sandbox" ? `Using ${ws.settings.aiProvider} · ${ws.settings.aiModel}` : "Built-in drafts until you add a model key in Integrations"} action={<Sparkles className="h-5 w-5 text-primary-500" />} />
            <div className="flex flex-wrap gap-2 px-5 pt-4">
              {([["summarize", "Summarise"], ["draft_reply", "Draft reply"], ["next_action", "Next best action"], ["research", "Meeting brief"]] as [AiTask, string][]).map(([t, label]) => (
                <Button key={t} size="sm" variant={ai?.task === t ? "tonal" : "secondary"} loading={aiBusy === t} disabled={!!aiBusy} onClick={() => runAi(t)}>{label}</Button>
              ))}
            </div>
            <div className="p-5">
              {ai ? (
                <div className="rounded-lg bg-surface-2 p-4">
                  <div className="mb-2 flex items-center justify-between gap-2"><Chip tone={ai.simulated ? "slate" : "violet"}><Bot className="h-3 w-3" />{ai.simulated ? "Built-in draft" : ai.provider}</Chip>
                    <button type="button" className="inline-flex items-center gap-1 text-xs font-medium text-primary-600 hover:underline dark:text-primary-300" onClick={() => { void navigator.clipboard?.writeText(ai.text); toast("Copied"); }}><Copy className="h-3.5 w-3.5" />Copy</button></div>
                  <pre className="whitespace-pre-wrap break-words font-sans text-sm leading-relaxed">{ai.text}</pre>
                  {ai.task === "draft_reply" && !lead.firstTouchAt && <Button size="sm" className="mt-3" onClick={() => { setTouch("email"); setTouchText(ai.text.split("\n")[0] + " … (copilot draft sent)"); }}>Use as first reply</Button>}
                </div>
              ) : <p className="text-sm text-muted">Pick a task. A person always reviews anything that goes to the lead.</p>}
            </div>
          </Card>

          <Card>
            <CardHeader title="Activity" />
            <div className="px-5 pt-3">
              <Textarea aria-label="Add a note" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Add a note for the team…" className="min-h-16" />
              <div className="mt-2 flex justify-end"><Button size="sm" variant="tonal" disabled={!note.trim()} onClick={async () => { await dispatch({ type: "lead.note", leadId: lead.id, text: note }, { success: "Note added" }); setNote(""); }}>Add note</Button></div>
            </div>
            <ul className="mt-2 divide-y divide-line">
              {[...lead.activities].reverse().map((a, i) => (
                <li key={i} className="flex gap-3 px-5 py-3 text-sm">
                  <span className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full bg-surface-2 text-muted">{a.type === "ai" ? <Sparkles className="h-3.5 w-3.5" /> : a.type === "call" ? <Phone className="h-3.5 w-3.5" /> : a.type === "email" ? <Mail className="h-3.5 w-3.5" /> : a.type === "sla" || a.type === "escalated" ? <ShieldAlert className="h-3.5 w-3.5" /> : <MessageSquare className="h-3.5 w-3.5" />}</span>
                  <span className="min-w-0 flex-1"><span className="block break-words">{a.text}</span><span className="text-xs text-faint">{a.by ? `${a.by} · ` : ""}{fmtDate(a.at)}</span></span>
                </li>
              ))}
            </ul>
          </Card>
        </div>

        <div className="flex min-w-0 flex-col gap-4">
          <Card className="p-5">
            <h2 className="text-[15px] font-semibold">Owner & stage</h2>
            <div className="mt-4 grid gap-3">
              <Field label="Owner" htmlFor="owner"><Select id="owner" value={lead.ownerId ?? ""} onChange={(e) => e.target.value && dispatch({ type: "lead.assign", leadId: lead.id, repId: e.target.value }, { success: "Reassigned — SLA clock restarted" })}><option value="">Unassigned</option>{ws.reps.map((r) => <option key={r.id} value={r.id}>{r.name}{!r.available ? " (away)" : ""}</option>)}</Select></Field>
              <Field label="Stage" htmlFor="stage"><Select id="stage" value={lead.stage} onChange={(e) => dispatch({ type: "lead.stage", leadId: lead.id, stage: e.target.value as Stage }, { success: `Stage → ${STAGE_LABEL[e.target.value as Stage]} (synced to CRM)` })}>{STAGES.map((st) => <option key={st} value={st}>{STAGE_LABEL[st]}</option>)}</Select></Field>
              <p className="text-xs text-muted">{lead.routeReason ?? "Not routed"}</p>
            </div>
          </Card>
          {lead.meeting && (
            <Card className="p-5">
              <h2 className="text-[15px] font-semibold">Meeting</h2>
              <p className="mt-2 text-sm">{fmtDate(lead.meeting.start, { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "UTC" })} UTC · {ws.settings.meetingMinutes} min</p>
              <p className="text-sm text-muted">{lead.meeting.provider} with {ws.reps.find((r) => r.id === lead.meeting!.repId)?.name}</p>
              <div className="mt-2 flex items-center gap-2"><Chip tone={lead.meeting.status === "booked" ? "violet" : lead.meeting.status === "held" ? "mint" : "rose"}>{lead.meeting.status.replace("_", "-")}</Chip><Link href={`${lead.meeting.link}?w=${ws.id}`} className="text-sm font-medium text-primary-600 hover:underline dark:text-primary-300">Meeting page</Link></div>
            </Card>
          )}
          <Card className="p-5">
            <h2 className="text-[15px] font-semibold">Company</h2>
            {c ? (
              <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
                <div><dt className="text-xs text-faint">Name</dt><dd className="font-medium">{c.name}</dd></div>
                <div><dt className="text-xs text-faint">Domain</dt><dd className="truncate">{c.domain}</dd></div>
                <div><dt className="text-xs text-faint">Employees</dt><dd>{c.employees.toLocaleString()}</dd></div>
                <div><dt className="text-xs text-faint">Location</dt><dd>{c.country} · {c.region}</dd></div>
                <div><dt className="text-xs text-faint">Industry</dt><dd>{c.industry}</dd></div>
                <div><dt className="text-xs text-faint">Funding</dt><dd>{c.funding ?? "—"}</dd></div>
                {c.tech?.length ? <div className="col-span-2"><dt className="text-xs text-faint">Tech</dt><dd className="mt-1 flex flex-wrap gap-1">{c.tech.map((t) => <Chip key={t}>{t}</Chip>)}</dd></div> : null}
                <div className="col-span-2"><dt className="text-xs text-faint">Source</dt><dd className="text-muted">{lead.enrichment?.provider}{lead.enrichment?.cached ? " (cached)" : ""} · {money(lead.enrichment?.costCents ?? 0)}{lead.enrichment?.provider.startsWith("offline") ? " · estimate" : ""}</dd></div>
              </dl>
            ) : <p className="mt-2 text-sm text-muted">{lead.enrichment?.skipped ?? "No company data."}</p>}
            {account && <p className="mt-4 rounded-xl bg-primary-50 p-3 text-xs text-primary-900 dark:bg-primary-500/10 dark:text-primary-100">Matched account <b>{account.name}</b> ({account.stage.replace("_", " ")}) — owner {ws.reps.find((r) => r.id === account.ownerId)?.name}</p>}
          </Card>
          <Card className="p-5">
            <h2 className="text-[15px] font-semibold">Submission</h2>
            <dl className="mt-3 grid gap-2 text-sm">
              <div className="flex justify-between gap-3"><dt className="text-muted">Email</dt><dd className="truncate">{lead.email}</dd></div>
              <div className="flex justify-between gap-3"><dt className="text-muted">Source</dt><dd className="capitalize">{lead.source}{lead.formId ? ` · ${ws.forms.find((f) => f.id === lead.formId)?.name ?? ""}` : ""}</dd></div>
              <div className="flex justify-between gap-3"><dt className="text-muted">Received</dt><dd>{ago(lead.createdAt, now)}</dd></div>
              {Object.entries(lead.answers).filter(([k]) => !["name", "email", "company"].includes(k)).map(([k, v]) => <div key={k} className="flex justify-between gap-3"><dt className="capitalize text-muted">{k.replace(/_/g, " ")}</dt><dd className="truncate text-right">{v}</dd></div>)}
              {lead.utm && <div className="flex justify-between gap-3"><dt className="text-muted">UTM</dt><dd className="truncate">{Object.values(lead.utm).join(" / ")}</dd></div>}
              {lead.message && <div><dt className="text-muted">Message</dt><dd className="mt-1 whitespace-pre-wrap break-words rounded-xl bg-surface-2 p-3">{lead.message}</dd></div>}
            </dl>
            <p className="mt-3 text-xs text-muted">Guard score {lead.guard.score}/100 · {lead.guard.reasons.join("; ")}</p>
          </Card>
          <button type="button" onClick={() => setConfirmDelete(true)} className="inline-flex items-center gap-1.5 self-start text-xs text-faint hover:text-rose-600"><Trash2 className="h-3.5 w-3.5" />Delete lead (data request)</button>
        </div>
      </div>

      <Modal open={!!touch} onClose={() => setTouch(null)} title={touch === "call" ? "Log a call" : "Log a reply"} footer={<><Button variant="ghost" onClick={() => setTouch(null)}>Cancel</Button><Button loading={busy} onClick={doTouch}>Save</Button></>}>
        <Field label="What happened?" htmlFor="touch-text"><Textarea id="touch-text" value={touchText} onChange={(e) => setTouchText(e.target.value)} placeholder={touch === "call" ? "Spoke for 5 min, sending times" : "Replied with two times to meet"} /></Field>
        {!lead.firstTouchAt && <p className="mt-3 text-xs text-muted">This is the first touch — it stops the SLA clock.</p>}
      </Modal>
      <Modal open={book} onClose={() => setBook(false)} title={`Book with ${owner?.name ?? "owner"}`} wide>
        {slots.length === 0 ? <p className="text-sm text-muted">No free slots in the next {ws.settings.bookingWindowDays} days.</p> : (
          <>
            <p className="mb-3 text-sm text-muted">Free {ws.settings.meetingMinutes}-minute slots from {owner?.name}&apos;s working hours ({owner?.timezone}), shown in your local time.</p>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
              {slots.map((sl) => (
                <Button key={sl.start} variant="secondary" size="sm" disabled={busy} onClick={async () => { const r = await dispatch({ type: "lead.book", leadId: lead.id, start: sl.start }, { success: "Meeting booked and synced" }); if (r) setBook(false); }}>
                  {new Intl.DateTimeFormat("en-GB", { weekday: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }).format(new Date(sl.start))}
                </Button>
              ))}
            </div>
          </>
        )}
      </Modal>
      <Modal open={confirmDelete} onClose={() => setConfirmDelete(false)} title="Delete this lead?" footer={<><Button variant="ghost" onClick={() => setConfirmDelete(false)}>Cancel</Button><Button variant="danger" onClick={async () => { await dispatch({ type: "lead.delete", leadId: lead.id }, { success: "Lead deleted" }); router.push("/app/inbox"); }}>Delete</Button></>}>
        <p className="text-sm text-muted">This removes {lead.name} and their activity from Velaroute. Use it for data deletion requests. It can&apos;t be undone.</p>
      </Modal>
    </>
  );
}
