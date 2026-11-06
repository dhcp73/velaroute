import "server-only";
import type { Lead, Stage, Workspace } from "../engine/types";
import { STAGES } from "../engine/types";
import { analytics } from "../engine/analytics";
import { ingestLead, runAction, slotsFor } from "./service";

/** Shared by the REST API and the MCP server so both behave identically. */
export function leadView(ws: Workspace, l: Lead) {
  const owner = ws.reps.find((r) => r.id === l.ownerId);
  return {
    id: l.id, createdAt: l.createdAt, source: l.source, name: l.name, email: l.email, company: l.company, domain: l.domain, title: l.title ?? null,
    stage: l.stage, icpScore: l.icpScore, guard: l.guard, owner: owner ? { id: owner.id, name: owner.name, email: owner.email } : null,
    routeReason: l.routeReason ?? null, accountId: l.accountId ?? null, duplicateOf: l.duplicateOf ?? null,
    sla: { dueAt: l.slaDueAt ?? null, firstTouchAt: l.firstTouchAt ?? null, breachedAt: l.slaBreachedAt ?? null, escalatedAt: l.escalatedAt ?? null },
    meeting: l.meeting ?? null, enrichment: l.enrichment ?? null, answers: l.answers, trace: l.trace,
  };
}

export interface Tool { name: string; description: string; scope: string; inputSchema: Record<string, unknown>; run: (ws: Workspace, args: Record<string, unknown>) => Promise<unknown> }

const str = (d: string) => ({ type: "string", description: d });

export const TOOLS: Tool[] = [
  { name: "list_leads", description: "List recent inbound leads, optionally filtered by stage or owner.", scope: "leads:read",
    inputSchema: { type: "object", properties: { stage: { type: "string", enum: STAGES }, ownerId: str("Rep id"), limit: { type: "number", minimum: 1, maximum: 100 } } },
    run: async (ws, a) => ws.leads.filter((l) => (!a.stage || l.stage === a.stage) && (!a.ownerId || l.ownerId === a.ownerId)).slice(0, Number(a.limit ?? 20)).map((l) => leadView(ws, l)) },
  { name: "get_lead", description: "Get one lead with its full pipeline trace (guard, enrichment, match, route, SLA, CRM).", scope: "leads:read",
    inputSchema: { type: "object", properties: { id: str("Lead id") }, required: ["id"] },
    run: async (ws, a) => { const l = ws.leads.find((x) => x.id === a.id); if (!l) throw new Error("Lead not found"); return leadView(ws, l); } },
  { name: "create_lead", description: "Push a new inbound lead through the full pipeline and return who it was routed to.", scope: "leads:write",
    inputSchema: { type: "object", properties: { email: str("Work email"), name: str("Full name"), company: str("Company"), title: str("Job title"), message: str("Message"), source: { type: "string", enum: ["api", "form", "chat", "email"] } }, required: ["email"] },
    run: async (ws, a) => leadView(ws, await ingestLead(ws, { source: (a.source as "api") ?? "api", email: String(a.email), name: a.name as string, company: a.company as string, title: a.title as string, message: a.message as string, elapsedMs: 60000 })) },
  { name: "explain_route", description: "Dry-run the router for an email address and explain which rep would get the lead and why. Changes nothing.", scope: "routing:read",
    inputSchema: { type: "object", properties: { email: str("Email to test"), title: str("Job title") }, required: ["email"] },
    run: async (ws, a) => runAction(ws, { type: "route.test", sample: { email: String(a.email), title: a.title as string } }, "api") },
  { name: "get_sla_breaches", description: "Leads whose first-touch SLA has been breached and not yet touched.", scope: "leads:read",
    inputSchema: { type: "object", properties: {} },
    run: async (ws) => ws.leads.filter((l) => l.slaBreachedAt && !l.firstTouchAt).map((l) => leadView(ws, l)) },
  { name: "get_free_slots", description: "Free meeting slots on the calendar of the lead's owner.", scope: "leads:read",
    inputSchema: { type: "object", properties: { leadId: str("Lead id") }, required: ["leadId"] },
    run: async (ws, a) => slotsFor(ws, String(a.leadId)) },
  { name: "book_meeting", description: "Book a meeting for a lead with its owner at a free slot (ISO start time).", scope: "meetings:write",
    inputSchema: { type: "object", properties: { leadId: str("Lead id"), start: str("ISO 8601 start time from get_free_slots") }, required: ["leadId", "start"] },
    run: async (ws, a) => runAction(ws, { type: "lead.book", leadId: String(a.leadId), start: String(a.start) }, "api") },
  { name: "update_stage", description: "Move a lead to a new stage (syncs to the CRM).", scope: "leads:write",
    inputSchema: { type: "object", properties: { leadId: str("Lead id"), stage: { type: "string", enum: STAGES } }, required: ["leadId", "stage"] },
    run: async (ws, a) => { await runAction(ws, { type: "lead.stage", leadId: String(a.leadId), stage: a.stage as Stage }, "api"); return leadView(ws, ws.leads.find((l) => l.id === a.leadId)!); } },
  { name: "log_touch", description: "Record a first touch (email, call) on a lead — stops the SLA clock.", scope: "leads:write",
    inputSchema: { type: "object", properties: { leadId: str("Lead id"), kind: { type: "string", enum: ["email", "call", "linkedin", "note"] }, text: str("What happened") }, required: ["leadId"] },
    run: async (ws, a) => { await runAction(ws, { type: "lead.touch", leadId: String(a.leadId), kind: String(a.kind ?? "email"), text: String(a.text ?? "Touched via API") }, "api"); return leadView(ws, ws.leads.find((l) => l.id === a.leadId)!); } },
  { name: "get_analytics", description: "Speed-to-lead, SLA rate, booked rate, routing fairness and enrichment spend for the last 14 days.", scope: "analytics:read",
    inputSchema: { type: "object", properties: { days: { type: "number", minimum: 1, maximum: 90 } } },
    run: async (ws, a) => analytics(ws, new Date(), Number(a.days ?? 14)) },
  { name: "list_rules", description: "Routing rules in priority order with their round-robin pools.", scope: "routing:read",
    inputSchema: { type: "object", properties: {} },
    run: async (ws) => ws.rules.map((r) => ({ ...r, reps: r.repIds.map((id) => ws.reps.find((x) => x.id === id)?.name) })) },
];
