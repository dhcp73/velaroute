import { z } from "zod";
import type { Workspace } from "../engine/types";
import type { Action } from "../server/service";
import { uid } from "../engine/util";

const id = z.string().min(1).max(100).regex(/^[\w-]+$/);
const text = z.string().trim().min(1).max(200);
export const fieldSchema = z.object({ id, label: text, type: z.enum(["text", "email", "select", "number", "textarea", "buttons", "checkbox"]), required: z.boolean().optional(), options: z.array(text).max(30).optional(), placeholder: z.string().max(200).optional() });
export const stepSchema = z.object({ id, title: text, fields: z.array(fieldSchema).min(1).max(25) });
export const formSchema = z.object({ id, name: text, slug: z.string().min(1).max(120).regex(/^[a-z0-9-]+$/), status: z.enum(["draft", "live"]), steps: z.array(stepSchema).min(1).max(8), logic: z.array(z.object({ id, stepId: id, fieldId: id, op: z.enum(["equals", "not_equals", "contains", "gte", "lte", "filled", "empty"]), value: z.string().max(200), goto: id })).max(40), showBooking: z.boolean(), createdAt: z.string(), submissions: z.number(), views: z.number() });
export const conditionSchema = z.object({ field: z.enum(["country", "region", "employees", "domain", "industry", "icpScore", "source", "answer"]), op: z.enum(["equals", "in", "gte", "lte", "contains", "ends_with"]), value: z.string().max(400), key: z.string().max(100).optional() });
export const ruleSchema = z.object({ id: id.optional(), name: text, priority: z.number().int().min(0).max(10000).optional(), enabled: z.boolean(), match: z.enum(["all", "any"]), conditions: z.array(conditionSchema).max(20), repIds: z.array(id).min(1).max(100) });
export const settingsSchema = z.object({
  enrichOrder: z.array(z.enum(["apollo", "clay", "valyu"])).min(1).max(3).refine((xs) => new Set(xs).size === xs.length, "Use each provider once"),
  perLeadCapCents: z.number().int().min(0).max(100000), monthlySpendCapCents: z.number().int().min(0).max(100000000),
  slaMinutes: z.number().int().min(1).max(1440), escalateAfterMinutes: z.number().int().min(1).max(1440),
  botBlockScore: z.number().int().min(2).max(100), botReviewScore: z.number().int().min(1).max(99), blockDisposable: z.boolean(),
  meetingMinutes: z.number().int().min(5).max(240), bookingWindowDays: z.number().int().min(1).max(90),
  icpMinEmployees: z.number().int().min(0).max(10000000), icpMaxEmployees: z.number().int().min(0).max(10000000),
  icpIndustries: z.array(text).max(30), icpRegions: z.array(text).max(10), crmTarget: z.enum(["hubspot", "salesforce", "attio"]), slackChannel: text,
}).partial().strict().refine((s) => Object.keys(s).length > 0, "Describe at least one settings change");
export const agentActionSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("form.save"), form: formSchema, create: z.boolean().optional() }),
  z.object({ type: z.literal("rule.save"), rule: ruleSchema }),
  z.object({ type: z.literal("settings.save"), settings: settingsSchema }),
  z.object({ type: z.literal("lead.create"), input: z.object({ email: z.string().email(), name: text.optional(), company: text.optional(), title: text.optional(), message: z.string().max(2000).optional(), source: z.enum(["api", "form", "chat", "email"]) }) }),
  z.object({ type: z.literal("lead.stage"), leadId: id, stage: z.enum(["new", "working", "meeting", "qualified", "won", "lost", "spam"]) }),
  z.object({ type: z.literal("lead.touch"), leadId: id, kind: z.enum(["email", "call", "linkedin", "note"]), text: z.string().max(2000) }),
  z.object({ type: z.literal("lead.book"), leadId: id, start: z.string().datetime() }),
]);
export type AgentAction = z.infer<typeof agentActionSchema>;
export const proposalSchema = z.object({ id, title: text, summary: z.string().max(1500), action: agentActionSchema, before: z.string().max(30000), status: z.enum(["pending", "saved", "dismissed"]), href: z.string().max(300).regex(/^\/app(?:\/|$)/) });
export type Proposal = z.infer<typeof proposalSchema>;
export const traceSchema = z.object({ tool: z.string().max(100), thought: z.string().max(400), observation: z.string().max(1500), ok: z.boolean() });
export type AgentStep = z.infer<typeof traceSchema>;
export const turnSchema = z.object({ id, request: z.string().max(4000), answer: z.string().max(12000), mode: z.string().max(150), kind: z.enum(["form", "routing", "settings", "read", "help"]), needsClarification: z.boolean(), steps: z.array(traceSchema).max(30), proposals: z.array(proposalSchema).max(8), at: z.string() });
export type AgentTurn = z.infer<typeof turnSchema>;
export const historySchema = z.array(turnSchema).max(30);

export function targetState(ws: Workspace, action: AgentAction): string {
  if (action.type === "form.save") return JSON.stringify(ws.forms.find((f) => f.id === action.form.id) ?? null);
  if (action.type === "rule.save") return JSON.stringify(ws.rules.find((r) => r.id === action.rule.id) ?? null);
  if (action.type === "settings.save") return JSON.stringify(Object.fromEntries(Object.keys(action.settings).map((k) => [k, ws.settings[k as keyof typeof ws.settings]])));
  if (action.type !== "lead.create") return JSON.stringify(ws.leads.find((l) => l.id === action.leadId) ?? null);
  return "null";
}
export function validateAction(raw: unknown, ws: Workspace): AgentAction {
  const a = agentActionSchema.parse(raw);
  if (a.type === "form.save") {
    const fields = a.form.steps.flatMap((s) => s.fields), stepIds = a.form.steps.map((s) => s.id);
    if (!fields.some((f) => f.id === "email" && f.type === "email")) throw new Error("Keep a work-email field with id email so submissions can be routed.");
    const existing = ws.forms.find((f) => f.id === a.form.id);
    const originalFields = existing?.steps.flatMap((s) => s.fields) ?? [];
    const duplicates = fields.some((f) => fields.filter((x) => x.id === f.id).length > Math.max(1, originalFields.filter((x) => x.id === f.id).length));
    if (duplicates || new Set(stepIds).size !== stepIds.length) throw new Error("New field and step IDs must be unique. Existing shared branching field IDs may be preserved.");
    if (fields.some((f) => ["select", "buttons"].includes(f.type) && !f.options?.length)) throw new Error("Choice fields need options.");
    for (const l of a.form.logic) if (!stepIds.includes(l.stepId) || !a.form.steps.find((s) => s.id === l.stepId)?.fields.some((f) => f.id === l.fieldId) || (l.goto !== "submit" && !stepIds.includes(l.goto))) throw new Error("A branching rule points to a missing step or field.");
    if (a.create ? !!existing : !existing) throw new Error(a.create ? "This form already exists. Create a fresh proposal." : "Choose an existing form to update.");
    if (ws.forms.some((f) => f.slug === a.form.slug && f.id !== a.form.id)) throw new Error("That form URL is already in use.");
  }
  if (a.type === "rule.save") {
    if (a.rule.repIds.some((id) => !ws.reps.some((r) => r.id === id))) throw new Error("Choose actual reps from this workspace.");
    if (a.rule.id && !a.rule.id.startsWith("rul_agent_") && !ws.rules.some((r) => r.id === a.rule.id)) throw new Error("Rule not found.");
    if (a.rule.match === "all") for (const field of ["employees", "icpScore"]) {
      const cs = a.rule.conditions.filter((c) => c.field === field);
      const min = cs.find((c) => c.op === "gte"), max = cs.find((c) => c.op === "lte");
      if (min && max && Number(min.value) > Number(max.value)) throw new Error("The minimum threshold exceeds the maximum. Correct the range before saving.");
    }
    for (const c of a.rule.conditions) if ((c.field === "answer" && !c.key) || (["employees", "icpScore"].includes(c.field) && (!Number.isFinite(Number(c.value)) || Number(c.value) < 0 || (c.field === "icpScore" && Number(c.value) > 100)))) throw new Error("Check the condition key and numeric threshold.");
  }
  if (a.type === "settings.save") {
    const merged = { ...ws.settings, ...a.settings };
    if (merged.botReviewScore >= merged.botBlockScore) throw new Error("Guard review must be below the block threshold.");
    if (merged.icpMinEmployees > merged.icpMaxEmployees) throw new Error("ICP minimum must not exceed maximum.");
  }
  if (a.type.startsWith("lead.") && a.type !== "lead.create" && !ws.leads.some((l) => l.id === (a as { leadId: string }).leadId)) throw new Error("Lead not found.");
  return a;
}
export function propose(ws: Workspace, raw: unknown, title: string, summary: string): Proposal {
  const action = validateAction(raw, ws);
  const href = action.type === "form.save" ? `/app/forms/${encodeURIComponent(action.form.id)}` : action.type === "rule.save" ? "/app/routing" : action.type === "settings.save" ? "/app/settings" : action.type === "lead.create" ? "/app/inbox" : `/app/leads/${encodeURIComponent(action.leadId)}`;
  return proposalSchema.parse({ id: uid("proposal"), title, summary, action, before: targetState(ws, action), status: "pending", href });
}
/** Approval is a UI event, never a model tool. Revalidate stored proposals and reject stale overwrites. */
export function confirmedAction(proposal: Proposal, ws: Workspace): Action {
  const p = proposalSchema.parse(proposal);
  if (p.status !== "pending") throw new Error("This proposal is no longer pending.");
  const action = validateAction(p.action, ws);
  if (targetState(ws, action) !== p.before) throw new Error("This item changed since the proposal. Ask for a fresh draft before saving.");
  return action as Action;
}
