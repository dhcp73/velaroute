import { TIERS } from "../plans";
import "server-only";
import type { Account, Form, LeadInput, ProviderId, Rep, RoutingRule, Settings, Stage, Webhook, Workspace } from "../engine/types";
import { STAGES } from "../engine/types";
import { approveLead, assignLead, bookMeeting, processLead, setStage, tick, touchLead, type EngineEvent } from "../engine/pipeline";
import { routeLead } from "../engine/route";
import { icpScore } from "../engine/icp";
import { freeSlots } from "../engine/slots";
import { offlineEnrich } from "../engine/enrich";
import { isEmail, uid } from "../engine/util";
import { dispatchEvents, resolveEnrichment, runAi, testIntegration, type AiTask } from "./providers";
import { encrypt, randomToken, sha256 } from "./crypto";
import { resetWorkspace } from "./store";

export async function ingestLead(ws: Workspace, input: LeadInput, now = new Date()) {
  tick(ws, now);
  const { enrichment, note } = await resolveEnrichment(ws, input.email, input.title, now);
  const res = processLead(ws, input, now, input.honeypot ? undefined : enrichment);
  if (note) res.lead.trace.find((t) => t.step === "enrich")!.detail += ` · ${note}`;
  if (input.formId) { const f = ws.forms.find((x) => x.id === input.formId); if (f) f.submissions += 1; }
  await dispatchEvents(ws, res.events);
  return res.lead;
}

export function slotsFor(ws: Workspace, leadId: string, now = new Date()) {
  const lead = ws.leads.find((l) => l.id === leadId);
  const rep = ws.reps.find((r) => r.id === lead?.ownerId);
  if (!lead || !rep) return { rep: null, slots: [] };
  return { rep: { id: rep.id, name: rep.name, title: rep.title, timezone: rep.timezone, calendar: rep.calendar, color: rep.color }, slots: freeSlots(ws, rep, now) };
}

export type Action =
  | { type: "tick" }
  | { type: "lead.create"; input: LeadInput }
  | { type: "lead.simulate" }
  | { type: "lead.touch"; leadId: string; kind: string; text: string }
  | { type: "lead.stage"; leadId: string; stage: Stage }
  | { type: "lead.assign"; leadId: string; repId: string }
  | { type: "lead.approve"; leadId: string }
  | { type: "lead.block"; leadId: string }
  | { type: "lead.book"; leadId: string; start: string }
  | { type: "lead.note"; leadId: string; text: string }
  | { type: "lead.ai"; leadId: string; task: AiTask }
  | { type: "lead.delete"; leadId: string }
  | { type: "rep.save"; rep: Partial<Rep> & { name: string; email: string } }
  | { type: "rep.delete"; repId: string }
  | { type: "rule.save"; rule: Partial<RoutingRule> & { name: string } }
  | { type: "rule.delete"; ruleId: string }
  | { type: "rule.move"; ruleId: string; dir: -1 | 1 }
  | { type: "route.test"; sample: { email: string; title?: string; answers?: Record<string, string> } }
  | { type: "form.create"; name: string }
  | { type: "form.save"; form: Form }
  | { type: "form.delete"; formId: string }
  | { type: "account.save"; account: Partial<Account> & { domain: string; name: string; ownerId: string } }
  | { type: "account.delete"; accountId: string }
  | { type: "settings.save"; settings: Partial<Settings> }
  | { type: "integration.connect"; id: ProviderId; secret: string }
  | { type: "integration.disconnect"; id: ProviderId }
  | { type: "apikey.create"; name: string; scopes: string[] }
  | { type: "apikey.revoke"; id: string }
  | { type: "webhook.save"; webhook: Partial<Webhook> & { url: string; events: string[] } }
  | { type: "webhook.delete"; id: string }
  | { type: "webhook.test"; id: string }
  | { type: "alerts.read" }
  | { type: "workspace.rename"; name: string }
  | { type: "workspace.plan"; plan: Workspace["plan"] }
  | { type: "workspace.reset" };

export class ActionError extends Error {}
function need<T>(v: T | undefined | null, msg: string): T {
  if (v === undefined || v === null) throw new ActionError(msg);
  return v;
}

const SIM_NAMES = [["Grace", "Okafor", "VP Sales"], ["Felix", "Larsen", "Head of RevOps"], ["Amara", "Silva", "Founder & CEO"], ["Theo", "Walsh", "Sales Director"], ["Ines", "Cohen", "Growth Lead"], ["Omar", "Fischer", "CRO"]];
const SIM_DOMAINS = ["northwind.io", "brightpath.dev", "kestrel.ai", "tidewater.app", "quillhq.com", "meridianhr.com", "atlasdata.co", "orbitpay.com", "fernlogistics.com", "lumenhealth.co", "cobaltsec.com", "driftwood.ai"];

export async function runAction(ws: Workspace, a: Action, actor: string, now = new Date()): Promise<unknown> {
  const events: EngineEvent[] = [];
  const audit = (type: string, text: string) => { ws.audit.unshift({ at: now.toISOString(), type, text, by: actor }); if (ws.audit.length > 200) ws.audit.length = 200; };
  let result: unknown = null;
  switch (a.type) {
    case "tick": events.push(...tick(ws, now)); break;
    case "lead.create": {
      if (!isEmail(a.input.email || "")) throw new ActionError("Enter a valid email address");
      result = (await ingestLead(ws, { ...a.input, elapsedMs: a.input.elapsedMs ?? 30000 }, now)).id;
      break;
    }
    case "lead.simulate": {
      const n = Math.floor(Math.random() * SIM_NAMES.length);
      const [f, l, title] = SIM_NAMES[n];
      const domain = SIM_DOMAINS[Math.floor(Math.random() * SIM_DOMAINS.length)];
      const lead = await ingestLead(ws, { source: (["form", "chat", "email", "api"] as const)[Math.floor(Math.random() * 4)], formId: "frm_demo", name: `${f} ${l}`, email: `${f}.${l}@${domain}`.toLowerCase(), title, answers: { size: ["1–49", "50–199", "200–999", "1000+"][Math.floor(Math.random() * 4)], crm: "HubSpot", reps: "10" }, elapsedMs: 28000 }, now);
      result = lead.id;
      break;
    }
    case "lead.touch": events.push(...touchLead(ws, a.leadId, a.kind || "note", a.text || "Touched", actor, now)); break;
    case "lead.stage": if (!STAGES.includes(a.stage)) throw new ActionError("Unknown stage"); events.push(...setStage(ws, a.leadId, a.stage, actor, now)); break;
    case "lead.assign": assignLead(ws, a.leadId, a.repId, actor, now); break;
    case "lead.approve": approveLead(ws, a.leadId, actor, now); break;
    case "lead.block": events.push(...setStage(ws, a.leadId, "spam", actor, now)); break;
    case "lead.book": { const r = bookMeeting(ws, a.leadId, a.start, now); events.push(...r.events); result = r.meeting; break; }
    case "lead.note": { const lead = need(ws.leads.find((l) => l.id === a.leadId), "Lead not found"); if (!a.text?.trim()) throw new ActionError("Write a note first"); lead.activities.push({ at: now.toISOString(), type: "note", text: a.text.trim(), by: actor }); break; }
    case "lead.ai": {
      const lead = need(ws.leads.find((l) => l.id === a.leadId), "Lead not found");
      const r = await runAi(ws, a.task, lead);
      lead.activities.push({ at: now.toISOString(), type: "ai", text: `Copilot · ${a.task.replace("_", " ")}${r.simulated ? " (built-in, no model key)" : ` (${r.provider})`}`, by: "Copilot" });
      result = r;
      break;
    }
    case "lead.delete": ws.leads = ws.leads.filter((l) => l.id !== a.leadId); audit("lead", "Deleted a lead (data deletion request)"); break;
    case "rep.save": {
      if (!a.rep.name.trim() || !isEmail(a.rep.email)) throw new ActionError("Name and a valid email are required");
      const existing = a.rep.id ? ws.reps.find((r) => r.id === a.rep.id) : undefined;
      const clean = { ...a.rep, weight: Math.max(0, Math.min(10, Number(a.rep.weight ?? 1))), capacityPerDay: Math.max(1, Number(a.rep.capacityPerDay ?? 30)) };
      if (existing) Object.assign(existing, clean);
      else ws.reps.push({ id: uid("rep"), title: "Account Executive", team: "smb", region: "NA", available: true, timezone: "America/New_York", workStart: 9, workEnd: 17, calendar: "none", color: ["#985a30", "#747d83", "#63786a", "#a08858", "#817378", "#987455"][ws.reps.length % 6], ...clean } as Rep);
      audit("team", `${existing ? "Updated" : "Added"} ${a.rep.name}`);
      break;
    }
    case "rep.delete": {
      if (ws.leads.some((l) => l.ownerId === a.repId && !["won", "lost", "spam"].includes(l.stage)) || ws.accounts.some((x) => x.ownerId === a.repId)) throw new ActionError("This rep still owns open leads or accounts — reassign them first, or set their weight to 0 to pause them");
      ws.reps = ws.reps.filter((r) => r.id !== a.repId);
      ws.rules.forEach((r) => { r.repIds = r.repIds.filter((id) => id !== a.repId); });
      break;
    }
    case "rule.save": {
      if (!a.rule.name.trim()) throw new ActionError("Give the rule a name");
      if (!a.rule.repIds?.length) throw new ActionError("Pick at least one rep for the round-robin pool");
      const ex = a.rule.id ? ws.rules.find((r) => r.id === a.rule.id) : undefined;
      if (ex) Object.assign(ex, a.rule);
      else ws.rules.push({ id: uid("rul"), priority: ws.rules.length + 1, enabled: true, match: "all", conditions: [], repIds: [], hits: 0, ...a.rule } as RoutingRule);
      ws.rules.sort((x, y) => x.priority - y.priority).forEach((r, i) => { r.priority = i + 1; });
      audit("routing", `${ex ? "Updated" : "Created"} rule “${a.rule.name}”`);
      break;
    }
    case "rule.delete": ws.rules = ws.rules.filter((r) => r.id !== a.ruleId); ws.rules.forEach((r, i) => { r.priority = i + 1; }); audit("routing", "Deleted a rule"); break;
    case "rule.move": {
      const sorted = [...ws.rules].sort((x, y) => x.priority - y.priority);
      const i = sorted.findIndex((r) => r.id === a.ruleId);
      const j = i + a.dir;
      if (i < 0 || j < 0 || j >= sorted.length) break;
      [sorted[i], sorted[j]] = [sorted[j], sorted[i]];
      sorted.forEach((r, k) => { r.priority = k + 1; });
      ws.rules = sorted;
      break;
    }
    case "route.test": {
      if (!isEmail(a.sample.email)) throw new ActionError("Enter a valid email to test");
      const sim = structuredClone(ws);
      const domain = a.sample.email.split("@")[1].toLowerCase();
      const enrichment = offlineEnrich(domain, a.sample.title);
      const lead = { id: "test", createdAt: now.toISOString(), source: "form" as const, name: "Test", email: a.sample.email.toLowerCase(), company: enrichment.company?.name ?? "", domain, title: a.sample.title, answers: a.sample.answers ?? {}, guard: { score: 0, verdict: "pass" as const, reasons: [] }, enrichment, icpScore: 0, stage: "new" as const, trace: [], activities: [], accountId: sim.accounts.find((x) => x.domain === domain)?.id };
      lead.icpScore = icpScore(lead, sim.settings).score;
      const d = routeLead(sim, lead, now);
      result = { ...d, rep: sim.reps.find((r) => r.id === d.repId)?.name ?? null, rule: sim.rules.find((r) => r.id === d.ruleId)?.name ?? null, icpScore: lead.icpScore, company: enrichment.company ?? null };
      break;
    }
    case "form.create": {
      const name = a.name?.trim() || "Untitled form";
      const id = uid("frm");
      const slug = `${name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "form"}-${id.slice(-4)}`;
      ws.forms.unshift({ id, name, slug, status: "draft", showBooking: true, createdAt: now.toISOString(), submissions: 0, views: 0, steps: [{ id: uid("stp"), title: "About you", fields: [{ id: "name", label: "Full name", type: "text", required: true }, { id: "email", label: "Work email", type: "email", required: true }, { id: "company", label: "Company", type: "text" }] }], logic: [] });
      audit("forms", `Created form “${name}”`);
      result = id;
      break;
    }
    case "form.save": {
      const f = a.form;
      if (!f.name?.trim()) throw new ActionError("Form name is required");
      if (!f.steps?.length) throw new ActionError("A form needs at least one step");
      const all = f.steps.flatMap((s) => s.fields);
      if (!all.some((x) => x.type === "email")) throw new ActionError("Add an email field so leads can be routed");
      const stepIds = new Set(f.steps.map((s) => s.id));
      for (const r of f.logic) if (r.goto !== "submit" && !stepIds.has(r.goto)) throw new ActionError("A branching rule points to a step that no longer exists");
      const i = ws.forms.findIndex((x) => x.id === f.id);
      if (i === -1) throw new ActionError("Form not found");
      ws.forms[i] = { ...ws.forms[i], ...f };
      audit("forms", `Saved form “${f.name}”`);
      break;
    }
    case "form.delete": ws.forms = ws.forms.filter((f) => f.id !== a.formId); audit("forms", "Deleted a form"); break;
    case "account.save": {
      const domain = a.account.domain.trim().toLowerCase().replace(/^https?:\/\//, "").replace(/\/.*$/, "");
      if (!domain.includes(".")) throw new ActionError("Enter a domain like acme.com");
      const ex = a.account.id ? ws.accounts.find((x) => x.id === a.account.id) : ws.accounts.find((x) => x.domain === domain);
      const base = offlineEnrich(domain).company;
      if (ex) Object.assign(ex, { ...a.account, domain });
      else ws.accounts.push({ id: uid("acc"), employees: base?.employees ?? 0, country: base?.country ?? "US", industry: base?.industry ?? "", stage: "prospect", ...a.account, domain } as Account);
      break;
    }
    case "account.delete": ws.accounts = ws.accounts.filter((x) => x.id !== a.accountId); break;
    case "settings.save": {
      const s = { ...ws.settings, ...a.settings };
      s.slaMinutes = Math.max(1, Math.min(1440, Number(s.slaMinutes)));
      s.escalateAfterMinutes = Math.max(1, Math.min(1440, Number(s.escalateAfterMinutes)));
      s.monthlySpendCapCents = Math.max(0, Math.round(Number(s.monthlySpendCapCents)));
      s.perLeadCapCents = Math.max(0, Math.round(Number(s.perLeadCapCents)));
      s.botReviewScore = Math.max(1, Math.min(99, Number(s.botReviewScore)));
      s.botBlockScore = Math.max(s.botReviewScore + 1, Math.min(100, Number(s.botBlockScore)));
      ws.settings = s;
      audit("settings", "Updated workspace settings");
      break;
    }
    case "integration.connect": {
      const i = need(ws.integrations.find((x) => x.id === a.id), "Unknown integration");
      const secret = (a.secret || "").trim();
      if (!secret) throw new ActionError("Paste a key first");
      const msg = await testIntegration(a.id, secret).catch((e) => { throw new ActionError(`Could not verify: ${(e as Error).message}`); });
      Object.assign(i, { connected: true, secret: secret === "sandbox" ? "sandbox" : encrypt(secret), keyHint: secret === "sandbox" ? "sandbox" : `…${secret.slice(-4)}`, updatedAt: now.toISOString() });
      audit("integration", `Connected ${a.id}`);
      result = msg;
      break;
    }
    case "integration.disconnect": { const i = need(ws.integrations.find((x) => x.id === a.id), "Unknown integration"); Object.assign(i, { connected: false, secret: undefined, keyHint: undefined, updatedAt: now.toISOString() }); audit("integration", `Disconnected ${a.id}`); break; }
    case "apikey.create": {
      if (!a.name?.trim()) throw new ActionError("Name the key");
      if (!a.scopes?.length) throw new ActionError("Pick at least one scope");
      const plain = `vr_live_${randomToken(18)}`;
      ws.apiKeys.unshift({ id: uid("key"), name: a.name.trim(), prefix: plain.slice(0, 11), hash: sha256(plain), scopes: a.scopes, createdAt: now.toISOString() });
      audit("api", `Created API key “${a.name}”`);
      result = plain;
      break;
    }
    case "apikey.revoke": { const k = need(ws.apiKeys.find((x) => x.id === a.id), "Key not found"); k.revoked = true; audit("api", `Revoked API key “${k.name}”`); break; }
    case "webhook.save": {
      if (!/^https?:\/\//.test(a.webhook.url)) throw new ActionError("Webhook URL must start with https://");
      if (!a.webhook.events.length) throw new ActionError("Pick at least one event");
      const ex = a.webhook.id ? ws.webhooks.find((w) => w.id === a.webhook.id) : undefined;
      if (ex) Object.assign(ex, a.webhook);
      else ws.webhooks.unshift({ id: uid("whk"), secret: `whsec_${randomToken(16)}`, active: true, createdAt: now.toISOString(), ...a.webhook } as Webhook);
      break;
    }
    case "webhook.delete": ws.webhooks = ws.webhooks.filter((w) => w.id !== a.id); break;
    case "webhook.test": {
      const h = need(ws.webhooks.find((w) => w.id === a.id), "Webhook not found");
      const lead = ws.leads.find((l) => l.ownerId) ?? ws.leads[0];
      const before = ws.deliveries.length;
      await dispatchEvents({ ...ws, webhooks: [{ ...h, events: ["lead.routed"] }] } as Workspace, [{ type: "lead.routed", leadId: lead?.id ?? "lead_test", data: { test: true } }]);
      result = ws.deliveries.length > before ? ws.deliveries[0] : null;
      break;
    }
    case "alerts.read": ws.alerts.forEach((x) => { x.read = true; }); break;
    case "workspace.rename": if (!a.name.trim()) throw new ActionError("Name is required"); ws.name = a.name.trim(); break;
    case "workspace.plan": {
      if (!TIERS.some((t) => t.id === a.plan)) throw new ActionError("Unknown plan");
      ws.plan = a.plan; ws.billingPlanVersion = 2; audit("billing", `Plan changed to ${a.plan}`); break;
    }
    case "workspace.reset": { const fresh = resetWorkspace(ws.id); Object.keys(ws).forEach((k) => delete (ws as unknown as Record<string, unknown>)[k]); Object.assign(ws, fresh); break; }
    default: throw new ActionError("Unknown action");
  }
  if (a.type !== "tick" && a.type !== "route.test") events.push(...tick(ws, now));
  await dispatchEvents(ws, events);
  return result;
}
