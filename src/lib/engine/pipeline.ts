import type { Alert, CrmEvent, Enrichment, Lead, LeadInput, Meeting, Stage, Workspace } from "./types";
import { scoreGuard } from "./guard";
import { offlineEnrich } from "./enrich";
import { icpScore } from "./icp";
import { routeLead, weightedPick } from "./route";
import { emailDomain, titleCase, uid } from "./util";

export interface EngineEvent { type: "lead.created" | "lead.routed" | "lead.blocked" | "meeting.booked" | "sla.breached" | "lead.escalated" | "lead.stage_changed" | "lead.touched"; leadId: string; data: Record<string, unknown> }
export interface PipelineResult { lead: Lead; events: EngineEvent[] }

function alert(ws: Workspace, a: Omit<Alert, "id" | "read">): void {
  ws.alerts.unshift({ id: uid("alr"), read: false, ...a });
  if (ws.alerts.length > 400) ws.alerts.length = 400;
}

function crmSync(ws: Workspace, lead: Lead, action: string, at: string): CrmEvent {
  const system = ws.settings.crmTarget;
  const connected = ws.integrations.find((i) => i.id === system)?.connected;
  const ev: CrmEvent = {
    id: uid("crm"), at, leadId: lead.id, system, action,
    status: connected ? "ok" : "skipped",
    detail: connected ? `${action} → ${titleCase(system)} (contact ${lead.email}, owner ${ws.reps.find((r) => r.id === lead.ownerId)?.email ?? "unassigned"})` : `${titleCase(system)} not connected — event kept in the sync log and replayed once you connect`,
  };
  if (connected && !lead.crmId) lead.crmId = `${system.slice(0, 2).toUpperCase()}-${Math.abs(lead.id.split("").reduce((a, c) => a * 31 + c.charCodeAt(0), 7)) % 900000 + 100000}`;
  ws.crm.unshift(ev);
  if (ws.crm.length > 600) ws.crm.length = 600;
  return ev;
}

/**
 * The inbound pipeline: capture → guard → enrich → match/dedupe → score → route → SLA → CRM.
 * Synchronous and deterministic given `enrichment` (resolved by the server layer, or offline).
 */
export function processLead(ws: Workspace, input: LeadInput, now: Date, enrichment?: Enrichment): PipelineResult {
  const at = now.toISOString();
  const t0 = Date.now();
  const lap = () => Math.max(1, Date.now() - t0);
  const email = (input.email || "").trim().toLowerCase();
  const domain = emailDomain(email);
  const events: EngineEvent[] = [];
  const lead: Lead = {
    id: uid("lead"),
    createdAt: at,
    source: input.source,
    formId: input.formId,
    name: (input.name || "").trim() || titleCase(email.split("@")[0] || "Unknown"),
    email,
    company: (input.company || "").trim(),
    domain,
    title: input.title?.trim() || undefined,
    message: input.message?.trim() || undefined,
    answers: input.answers ?? {},
    utm: input.utm,
    guard: { score: 0, verdict: "pass", reasons: [] },
    icpScore: 0,
    stage: "new",
    trace: [],
    activities: [{ at, type: "created", text: `Captured via ${input.source}${input.formId ? ` (${ws.forms.find((f) => f.id === input.formId)?.name ?? "form"})` : ""}` }],
  };

  // 1. Guard
  lead.guard = scoreGuard(input, ws.settings);
  lead.trace.push({ step: "guard", ok: lead.guard.verdict !== "block", detail: `Risk ${lead.guard.score}/100 · ${lead.guard.verdict} · ${lead.guard.reasons.join("; ")}`, ms: lap() });
  if (lead.guard.verdict === "block") {
    lead.stage = "spam";
    lead.activities.push({ at, type: "blocked", text: "Blocked by the bot guard — not routed, not enriched, no spend" });
    ws.leads.unshift(lead);
    events.push({ type: "lead.blocked", leadId: lead.id, data: { score: lead.guard.score, reasons: lead.guard.reasons } });
    return { lead, events };
  }

  // 2. Enrich
  lead.enrichment = enrichment ?? offlineEnrich(domain, lead.title);
  if (!lead.company && lead.enrichment.company) lead.company = lead.enrichment.company.name;
  if (!lead.title && lead.enrichment.person?.title) lead.title = lead.enrichment.person.title;
  if (lead.enrichment.costCents > 0) ws.spend.push({ at, leadId: lead.id, provider: lead.enrichment.provider, cents: lead.enrichment.costCents });
  lead.trace.push({
    step: "enrich", ok: !!lead.enrichment.company,
    detail: lead.enrichment.skipped ?? `${lead.enrichment.provider}${lead.enrichment.cached ? " (cache)" : ""} · ${lead.enrichment.company?.employees ?? "?"} employees · ${lead.enrichment.company?.country ?? "?"} · ${lead.enrichment.company?.industry ?? "?"} · ${(lead.enrichment.costCents / 100).toFixed(2)} USD`,
    ms: lap(),
  });

  // 3. Match + dedupe
  const acct = domain ? ws.accounts.find((a) => a.domain === domain) : undefined;
  if (acct) lead.accountId = acct.id;
  const dupe = ws.leads.find((l) => l.email === email && l.stage !== "spam" && now.getTime() - new Date(l.createdAt).getTime() < 30 * 86400000);
  if (dupe) lead.duplicateOf = dupe.id;
  lead.trace.push({ step: "match", ok: true, detail: `${acct ? `Matched account ${acct.name} (${acct.stage.replace("_", " ")})` : "No existing account"}${dupe ? ` · duplicate of ${dupe.id}` : " · no duplicate"}`, ms: lap() });

  // 4. Score
  const icp = icpScore(lead, ws.settings);
  lead.icpScore = icp.score;
  lead.trace.push({ step: "score", ok: true, detail: `ICP ${icp.score}/100 · ${icp.parts.join(", ") || "no fit signals"}`, ms: lap() });

  // 5. Route
  const decision = routeLead(ws, lead, now);
  lead.ownerId = decision.repId;
  lead.ruleId = decision.ruleId;
  lead.routeReason = decision.reason;
  const owner = ws.reps.find((r) => r.id === lead.ownerId);
  lead.trace.push({ step: "route", ok: !!owner, detail: `${owner ? `→ ${owner.name}. ` : ""}${decision.reason}${decision.considered.length ? ` (${decision.considered.join("; ")})` : ""}`, ms: lap() });
  if (owner) lead.activities.push({ at, type: "routed", text: `Routed to ${owner.name} — ${decision.reason}` });

  // 6. SLA clock (not for duplicates or review-queue leads)
  if (owner && !lead.duplicateOf && lead.guard.verdict === "pass") {
    lead.slaDueAt = new Date(now.getTime() + ws.settings.slaMinutes * 60000).toISOString();
    lead.trace.push({ step: "sla", ok: true, detail: `First touch due within ${ws.settings.slaMinutes} min`, ms: lap() });
  } else {
    lead.trace.push({ step: "sla", ok: true, detail: lead.duplicateOf ? "Duplicate — no new SLA clock" : lead.guard.verdict === "review" ? "In review queue — SLA starts after approval" : "Unassigned — no SLA", ms: lap() });
  }

  // 7. CRM write-back
  const ev = crmSync(ws, lead, lead.duplicateOf ? "update contact" : "upsert contact + company", at);
  lead.trace.push({ step: "crm", ok: ev.status !== "error", detail: ev.detail, ms: lap() });

  ws.leads.unshift(lead);
  if (owner) alert(ws, { at, leadId: lead.id, kind: "new_lead", channel: "slack", text: `New ${lead.icpScore >= 70 ? "high-fit " : ""}lead ${lead.name} (${lead.company || domain}) → ${owner.name}` });
  events.push({ type: "lead.created", leadId: lead.id, data: { email, source: lead.source } });
  if (owner) events.push({ type: "lead.routed", leadId: lead.id, data: { ownerId: owner.id, owner: owner.email, reason: decision.reason, ruleId: decision.ruleId ?? null } });
  return { lead, events };
}

export function bookMeeting(ws: Workspace, leadId: string, start: string, now: Date, repId?: string): { meeting: Meeting; events: EngineEvent[] } {
  const lead = ws.leads.find((l) => l.id === leadId);
  if (!lead) throw new Error("Lead not found");
  const rep = ws.reps.find((r) => r.id === (repId ?? lead.ownerId));
  if (!rep) throw new Error("Lead has no owner to book with");
  const s = new Date(start);
  if (Number.isNaN(s.getTime())) throw new Error("Invalid start time");
  const e = new Date(s.getTime() + ws.settings.meetingMinutes * 60000);
  const clash = ws.leads.some((l) => l.meeting && l.meeting.repId === rep.id && l.meeting.status === "booked" && l.id !== leadId && s < new Date(l.meeting.end) && e > new Date(l.meeting.start));
  if (clash) throw new Error("That slot was just taken — pick another time");
  const id = uid("mtg");
  const provider = rep.calendar === "microsoft" ? "Microsoft Teams" : rep.calendar === "google" ? "Google Meet" : "Velaroute room";
  const meeting: Meeting = { id, repId: rep.id, start: s.toISOString(), end: e.toISOString(), link: `/m/${id}`, provider, status: "booked" };
  lead.meeting = meeting;
  if (lead.stage === "new" || lead.stage === "working") lead.stage = "meeting";
  lead.activities.push({ at: now.toISOString(), type: "meeting", text: `Meeting booked with ${rep.name} for ${s.toUTCString().slice(0, 22)} UTC (${provider})` });
  crmSync(ws, lead, "log meeting + set lifecycle stage", now.toISOString());
  return { meeting, events: [{ type: "meeting.booked", leadId, data: { repId: rep.id, start: meeting.start, end: meeting.end } }] };
}

export function touchLead(ws: Workspace, leadId: string, kind: string, text: string, by: string, now: Date): EngineEvent[] {
  const lead = ws.leads.find((l) => l.id === leadId);
  if (!lead) throw new Error("Lead not found");
  const at = now.toISOString();
  const first = !lead.firstTouchAt;
  if (first) lead.firstTouchAt = at;
  if (lead.stage === "new") lead.stage = "working";
  lead.activities.push({ at, type: kind, text, by });
  return first ? [{ type: "lead.touched", leadId, data: { firstTouchAt: at, withinSla: lead.slaDueAt ? at <= lead.slaDueAt : null } }] : [];
}

export function setStage(ws: Workspace, leadId: string, stage: Stage, by: string, now: Date): EngineEvent[] {
  const lead = ws.leads.find((l) => l.id === leadId);
  if (!lead) throw new Error("Lead not found");
  const from = lead.stage;
  if (from === stage) return [];
  lead.stage = stage;
  lead.activities.push({ at: now.toISOString(), type: "stage", text: `Stage ${from} → ${stage}`, by });
  crmSync(ws, lead, `update stage → ${stage}`, now.toISOString());
  return [{ type: "lead.stage_changed", leadId, data: { from, to: stage } }];
}

export function assignLead(ws: Workspace, leadId: string, repId: string, by: string, now: Date): void {
  const lead = ws.leads.find((l) => l.id === leadId);
  const rep = ws.reps.find((r) => r.id === repId);
  if (!lead || !rep) throw new Error("Lead or rep not found");
  lead.ownerId = rep.id;
  lead.routeReason = `Manually assigned by ${by}`;
  if (!lead.firstTouchAt) lead.slaDueAt = new Date(now.getTime() + ws.settings.slaMinutes * 60000).toISOString();
  lead.slaBreachedAt = undefined;
  lead.slaWarnedAt = undefined;
  lead.activities.push({ at: now.toISOString(), type: "assigned", text: `Assigned to ${rep.name}`, by });
}

/** Approve a lead from the review queue: starts its SLA clock. */
export function approveLead(ws: Workspace, leadId: string, by: string, now: Date): void {
  const lead = ws.leads.find((l) => l.id === leadId);
  if (!lead) throw new Error("Lead not found");
  lead.guard = { ...lead.guard, verdict: "pass", reasons: [...lead.guard.reasons, `Approved by ${by}`] };
  if (lead.stage === "spam") lead.stage = "new";
  if (!lead.ownerId) {
    const d = routeLead(ws, lead, now);
    lead.ownerId = d.repId; lead.ruleId = d.ruleId; lead.routeReason = d.reason;
  }
  if (lead.ownerId && !lead.firstTouchAt) lead.slaDueAt = new Date(now.getTime() + ws.settings.slaMinutes * 60000).toISOString();
  lead.activities.push({ at: now.toISOString(), type: "approved", text: "Approved from the review queue", by });
}

/**
 * SLA agent tick: warn at 80% of the window, breach at 100%, escalate (re-route to the next
 * eligible rep in the same pool) after `escalateAfterMinutes` more. Idempotent per lead.
 */
export function tick(ws: Workspace, now: Date): EngineEvent[] {
  const events: EngineEvent[] = [];
  const at = now.toISOString();
  const win = ws.settings.slaMinutes * 60000;
  for (const lead of ws.leads) {
    if (!lead.slaDueAt || lead.firstTouchAt || lead.stage === "spam" || lead.stage === "lost") continue;
    const due = new Date(lead.slaDueAt).getTime();
    const owner = ws.reps.find((r) => r.id === lead.ownerId);
    if (!lead.slaWarnedAt && !lead.slaBreachedAt && now.getTime() >= due - win * 0.2 && now.getTime() < due) {
      lead.slaWarnedAt = at;
      alert(ws, { at, leadId: lead.id, kind: "sla_warning", channel: "in_app", text: `${lead.name} needs a first touch in under ${Math.max(1, Math.ceil((due - now.getTime()) / 60000))} min (${owner?.name ?? "unassigned"})` });
    }
    if (!lead.slaBreachedAt && now.getTime() >= due) {
      lead.slaBreachedAt = at;
      lead.activities.push({ at, type: "sla", text: `SLA breached — no first touch within ${ws.settings.slaMinutes} min` });
      alert(ws, { at, leadId: lead.id, kind: "sla_breach", channel: "slack", text: `SLA breached: ${lead.name} (${lead.company || lead.domain}) waited ${ws.settings.slaMinutes}+ min — owner ${owner?.name ?? "unassigned"}. Posted to ${ws.settings.slackChannel}` });
      events.push({ type: "sla.breached", leadId: lead.id, data: { ownerId: lead.ownerId ?? null, dueAt: lead.slaDueAt } });
    }
    if (lead.slaBreachedAt && !lead.escalatedAt && now.getTime() >= due + ws.settings.escalateAfterMinutes * 60000) {
      lead.escalatedAt = at;
      const rule = ws.rules.find((r) => r.id === lead.ruleId);
      const pool = rule?.repIds ?? ws.reps.map((r) => r.id);
      const next = weightedPick(ws, `${rule?.id ?? "__fallback"}`, pool, now, lead.ownerId ? [lead.ownerId] : []);
      const fromName = owner?.name ?? "unassigned";
      if (next) {
        lead.ownerId = next.id;
        lead.routeReason = `Escalated from ${fromName} after SLA breach`;
        lead.slaDueAt = new Date(now.getTime() + win).toISOString();
        lead.slaBreachedAt = undefined;
        lead.slaWarnedAt = undefined;
      }
      lead.activities.push({ at, type: "escalated", text: next ? `Escalated: re-routed from ${fromName} to ${next.name}` : "Escalated to the sales manager — no other rep available" });
      alert(ws, { at, leadId: lead.id, kind: "escalation", channel: "email", text: next ? `Re-routed ${lead.name} from ${fromName} to ${next.name} after SLA breach` : `${lead.name} breached SLA and nobody else is available — manager emailed` });
      events.push({ type: "lead.escalated", leadId: lead.id, data: { from: fromName, to: next?.name ?? null } });
    }
  }
  ws.lastTickAt = at;
  return events;
}
