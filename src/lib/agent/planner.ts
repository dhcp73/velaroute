import type { Form, Workspace } from "../engine/types";
import { uid } from "../engine/util";
import { conditionDescription, parseRuleDescription, type RuleDescription } from "../engine/rule-description";
import { propose, type AgentTurn, type Proposal } from "./contracts";

export interface ToolObservation { summary: string; data?: unknown; proposal?: Proposal; questions?: string[] }
export type AgentToolCall = (name: string, args: Record<string, unknown>) => Promise<ToolObservation>;
function previousForm(history: AgentTurn[]) {
  for (const turn of [...history].reverse()) {
    if (turn.kind !== "form") break;
    const proposal = turn.proposals.find((p) => p.action.type === "form.save");
    if (proposal?.action.type === "form.save") return proposal.action.form;
  }
}
const formRefinement = /^(?:add|remove|change|make|rename|call|name|keep|turn|enable|disable|with|without|please|actually|publish)\b|\b(?:phone|job role|job title|no booking|booking (?:on|off)|call it|name it)\b/i;
export function demoForm(ws: Workspace, description: string, history: AgentTurn[] = [], selectedForm?: Form): Form {
  const priorForm = previousForm(history);
  const updating = !!selectedForm || /\b(update|edit|add|remove|change|rename)\b/i.test(description) || (!!priorForm && formRefinement.test(description) && !/\b(?:new|another) form\b/i.test(description));
  const matches = updating && !selectedForm ? ws.forms.filter((f) => description.toLowerCase().includes(f.name.toLowerCase()) || description.includes(f.id)) : [];
  if (matches.length > 1) throw new Error("More than one form matches. Include a unique form ID so I don't edit the wrong one.");
  const found = matches[0];
  const base = selectedForm ?? found ?? (updating ? (ws.forms.find((f) => f.id === priorForm?.id) ?? priorForm) : undefined);
  if (updating && !base) throw new Error("Which form should I update? Include its exact name or ID, or ask to build a new demo form.");
  const naming = /(?:called|named|call\s+it|name\s+it|rename(?:\s+(?:it|the form))?\s+to)\s+/i.exec(description);
  const tail = naming ? description.slice(naming.index + naming[0].length) : "";
  const quoted = (/^["“]([^"”]+)["”]/.exec(tail)?.[1] ?? /^(.+?)(?=\s+(?:and|with|without)\b|[,.;\n]|$)/i.exec(tail)?.[1])?.trim();
  const form: Form = base ? structuredClone(base) : { id: uid("frm_agent"), name: quoted ?? "Demo request", slug: "", status: "draft", showBooking: true, createdAt: new Date().toISOString(), submissions: 0, views: 0, steps: [{ id: uid("stp"), title: "Tell us about you", fields: [{ id: "name", label: "Full name", type: "text", required: true }, { id: "email", label: "Work email", type: "email", required: true }, { id: "company", label: "Company", type: "text", required: true }] }], logic: [] };
  if (quoted) form.name = quoted;
  if (!form.slug) form.slug = `${form.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "demo"}-${form.id.slice(-6)}`;
  const extras: Form["steps"][number]["fields"] = [];
  if (/company size|employees|demo|enterprise/i.test(description) && !/remove.*(?:company size|employees)/i.test(description)) extras.push({ id: "employees", label: "Company size", type: "buttons", options: ["1–49", "50–199", "200–999", "1000+"], required: true });
  if (/phone/i.test(description)) extras.push({ id: "phone", label: "Phone number", type: "text" });
  if (/\b(?:role|job title)\b/i.test(description)) extras.push({ id: "role", label: "Job role", type: "text" });
  if (/budget/i.test(description)) extras.push({ id: "budget", label: "Budget", type: "number" });
  if (/country/i.test(description)) extras.push({ id: "country", label: "Country", type: "text", required: true });
  if (/industry/i.test(description)) extras.push({ id: "industry", label: "Industry", type: "text" });
  if (/message|notes|demo|needs/i.test(description)) extras.push({ id: "message", label: "What would you like to discuss?", type: "textarea" });
  for (const m of description.matchAll(/(?:with|add)(?:\s+a)?\s+([a-z][a-z ]{1,35}?)\s+(?:field|question)\b/gi)) {
    const label = m[1].trim();
    if (!/company size|email|phone|budget|country|industry/i.test(label)) extras.push({ id: label.toLowerCase().replace(/[^a-z0-9]+/g, "_"), label: label[0].toUpperCase() + label.slice(1), type: "text" });
  }
  const existing = new Set(form.steps.flatMap((s) => s.fields.map((f) => f.id)));
  for (const field of extras) if (!existing.has(field.id)) form.steps[0].fields.push(field);
  if (/\bremove\b/i.test(description)) {
    if (/remove.*(?:email|work email)/i.test(description)) throw new Error("A routable form needs its work email field. Keep it and choose another field to remove.");
    const suffix = description.slice(description.toLowerCase().indexOf("remove") + 6).toLowerCase();
    form.steps.forEach((s) => { s.fields = s.fields.filter((f) => !suffix.includes(f.label.toLowerCase()) && !new RegExp(`\\b${f.id}\\b`, "i").test(suffix)); });
    form.steps = form.steps.filter((s) => s.fields.length);
  }
  if (/no booking|without booking|disable booking|remove booking|turn off booking|booking (?:off|disabled)/i.test(description)) form.showBooking = false;
  else if (/enable booking|with booking|turn on booking|booking (?:on|enabled)|book a meeting/i.test(description)) form.showBooking = true;
  for (const step of form.steps) for (const field of step.fields) {
    const names = [field.label, field.id].map((value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|");
    const required = new RegExp(`(?:${names})(?: field)? (required|optional)`, "i").exec(description)?.[1];
    if (required) field.required = required.toLowerCase() === "required";
  }
  if (/two.step|2.step|two steps/i.test(description) && form.steps.length === 1 && form.steps[0].fields.length > 3) form.steps.push({ id: uid("stp"), title: "Your requirements", fields: form.steps[0].fields.splice(3) });
  return form;
}
export function routingDraft(ws: Workspace, description: string, history: AgentTurn[]): RuleDescription {
  let previous: RuleDescription | undefined;
  if (history.at(-1)?.kind === "routing" && !/\b(?:new|another) rule\b/i.test(description)) {
    const start = history.findLastIndex((h) => h.kind !== "routing");
    for (const h of history.slice(start + 1)) previous = parseRuleDescription(h.request, ws.reps, previous);
  }
  return parseRuleDescription(description, ws.reps, previous);
}
export function demoSettings(ws: Workspace, description: string): Partial<Workspace["settings"]> {
  const settings: Partial<Workspace["settings"]> = {};
  if (/(?:^|[\s$])-\s*\d/.test(description)) throw new Error("Use non-negative caps and positive thresholds. Negative values cannot be applied.");
  const money = (value: string) => Number(value.replaceAll(",", ""));
  const providers = [...description.matchAll(/\b(apollo|clay|valyu)\b/gi)].map((m) => m[1].toLowerCase() as "apollo" | "clay" | "valyu");
  if (providers.length) settings.enrichOrder = [...new Set(providers)];
  const perLead = [...description.matchAll(/(?:([\d,]+(?:\.\d+)?)\s*(cents?|dollars?)|\$([\d,]+(?:\.\d+)?))\s*(?:per\s+lead|\/lead)/gi)].at(-1);
  if (perLead) settings.perLeadCapCents = Math.round(perLead[3] ? money(perLead[3]) * 100 : money(perLead[1]) * (/dollar/i.test(perLead[2]) ? 100 : 1));
  const monthly = [...description.matchAll(/(?:([\d,]+(?:\.\d+)?)\s*(cents?|dollars?)|\$([\d,]+(?:\.\d+)?))\s*(?:per\s+month|monthly|\/month)/gi)].at(-1);
  if (monthly) settings.monthlySpendCapCents = Math.round(monthly[3] ? money(monthly[3]) * 100 : money(monthly[1]) * (/dollar/i.test(monthly[2]) ? 100 : 1));
  if (/per[- ]lead|monthly|per month/i.test(description) && !perLead && !monthly) throw new Error("Give caps numerically, for example 50 cents per lead and $100 per month.");
  const icpMin = /icp\s+(?:minimum|min)\s+(?:employees\s+)?(\d+)/i.exec(description);
  const icpMax = /icp\s+(?:maximum|max)\s+(?:employees\s+)?(\d+)/i.exec(description);
  if (icpMin) settings.icpMinEmployees = Number(icpMin[1]); if (icpMax) settings.icpMaxEmployees = Number(icpMax[1]);
  const crm = /crm(?:\s+(?:to|target|is))?\s+(hubspot|salesforce|attio)/i.exec(description);
  if (crm) settings.crmTarget = crm[1].toLowerCase() as "hubspot" | "salesforce" | "attio";
  const slack = /slack\s+channel(?:\s+(?:to|is))?\s+(#[\w-]+)/i.exec(description);
  if (slack) settings.slackChannel = slack[1];
  const window = /booking\s+window(?:\s+(?:of|to))?\s+(\d+)\s*days?/i.exec(description);
  if (window) settings.bookingWindowDays = Number(window[1]);
  const sla = /\b(?:sla|first.touch)(?:\s+(?:of|to|at))?\s+(\d+)\s*(?:min|minutes)/i.exec(description);
  const reverseSla = /(\d+)\s*(?:min|minute)[- ]+(?:sla|first.touch)/i.exec(description);
  if (sla || reverseSla) settings.slaMinutes = Number((sla ?? reverseSla)![1]);
  const escalate = /escalat\w*(?:\s+(?:after|in|to))?\s+(\d+)\s*(?:min|minutes)/i.exec(description);
  if (escalate) settings.escalateAfterMinutes = Number(escalate[1]);
  const block = /block(?:\s+(?:score|threshold|at|above|to))?\s*(?:>=|>|=)?\s*(\d+)/i.exec(description);
  const review = /review(?:\s+(?:score|threshold|at|above|to))?\s*(?:>=|>|=)?\s*(\d+)/i.exec(description);
  if (block) settings.botBlockScore = Number(block[1]); if (review) settings.botReviewScore = Number(review[1]);
  if (/block disposable|reject disposable/i.test(description)) settings.blockDisposable = true;
  if (/allow disposable|disable disposable/i.test(description)) settings.blockDisposable = false;
  const booking = /(\d+)\s*minute\s+(?:meetings?|booking)/i.exec(description);
  if (booking) settings.meetingMinutes = Number(booking[1]);
  if (!Object.keys(settings).length) throw new Error("Give an explicit setting, for example: Apollo then Valyu, 50 cents per lead, $100 per month; SLA 5 minutes; or guard block at 80 and review at 40.");
  if (settings.botReviewScore !== undefined && settings.botBlockScore === undefined && settings.botReviewScore >= ws.settings.botBlockScore) throw new Error("Review must be below your current block threshold. Specify both thresholds.");
  return settings;
}
/** Deterministic ReAct planner. Each awaited call observes real tool output before choosing the next action. */
export async function demoPlan(ws: Workspace, message: string, history: AgentTurn[], call: AgentToolCall): Promise<Pick<AgentTurn, "answer" | "kind" | "needsClarification" | "questions">> {
  message = message.replace(/^(?:please|actually)[,\s]+/i, "");
  const clauses = message.split(/\s*;\s*|\n+|\s+and then\s+|\s+and\s+(?=(?:create|set|configure|build|route|update)\b)/i).filter(Boolean);
  if (clauses.length > 1 && clauses.length <= 4) {
    const results = [];
    for (const clause of clauses) results.push(await demoPlan(ws, clause, history, call));
    const pending = results.find((r) => r.needsClarification);
    return { answer: results.map((r) => r.answer).join("\n\n"), kind: pending?.kind ?? results.at(-1)!.kind, needsClarification: !!pending, questions: results.flatMap((r) => r.questions ?? []).slice(0, 3) };
  }
  const last = history.at(-1);
  if (/^(?:list|show|inspect|get|how many)\b/i.test(message) && !/\b(?:create|build|change|set)\b/i.test(message)) {
    const name = /forms?/i.test(message) ? "list_forms" : /reps|team/i.test(message) ? "list_reps" : /rules|routing/i.test(message) ? "list_rules" : /settings|enrichment|guard|sla/i.test(message) ? "get_settings" : /analytics|performance/i.test(message) ? "get_analytics" : /breach|overdue/i.test(message) ? "get_sla_breaches" : "list_leads";
    const result = await call(name, {});
    return { answer: result.summary, kind: "read", needsClarification: false };
  }
  if (last?.kind === "form" && /who.*(?:gets|receives).*leads|where.*leads.*go/i.test(message)) {
    const rules = await call("list_rules", {});
    return { answer: `This form uses your workspace’s routing rules, not a separate hidden destination. ${rules.summary} You can describe a routing change such as ‘Germany leads go to Jonas’ and review it before saving.`, kind: "form", needsClarification: false };
  }
  if (last?.kind === "form" && /^(?:yes|looks good|that['’]s it|done|perfect|thanks)[.!]?$/i.test(message.trim()) && last.questions?.length === 1 && /look right/i.test(last.questions[0])) return { answer: "Great — the updated preview is ready. Choose Confirm & save on the proposal when you’re happy with it. Saying yes here does not save or publish anything.", kind: "form", needsClarification: false };
  if ((/\b(form|fields?|questionnaire)\b/i.test(message) && !/\b(routing|rule|round.robin)\b/i.test(message)) || (last?.kind === "form" && formRefinement.test(message) && !/\b(?:routing|rule|round.robin|enrichment|waterfall|guard|sla)\b/i.test(message))) {
    await call("list_forms", {});
    const result = await call("draft_form", { description: message });
    return result.proposal ? { ...proposalReply(ws, result.proposal, message), kind: "form", needsClarification: false } : { answer: result.summary, kind: "form", needsClarification: !!result.questions?.length };
  }
  if (/\b(rout\w*|round.robin|leads?\s+(?:in|from)|go(?:es)? to)\b/i.test(message) || last?.kind === "routing" && (last.needsClarification || /^(?:also|add|include|use|instead|change|make|over|under|at least)\b/i.test(message))) {
    if (/explain|why|who gets|test routing/i.test(message)) {
      const email = /[\w.+-]+@[\w.-]+\.[a-z]{2,}/i.exec(message)?.[0] ?? ws.leads.find((l) => message.toLowerCase().includes(l.name.toLowerCase()) || message.includes(l.id))?.email ?? ws.leads[0]?.email;
      if (!email) return { answer: "Which email should I dry-run?", kind: "read", needsClarification: true };
      const result = await call("explain_route", { email });
      return { answer: result.summary, kind: "read", needsClarification: false };
    }
    await call("list_reps", {});
    const result = await call("draft_routing_rule", { description: message });
    return result.proposal ? { ...proposalReply(ws, result.proposal, message), kind: "routing", needsClarification: false } : { answer: result.summary, kind: "routing", needsClarification: !!result.questions?.length };
  }
  if (/enrich|waterfall|apollo|valyu|\bclay\b|per lead|per month|monthly|guard|spam|disposable|\bsla\b|escalat|minute meetings|booking|\bicp\b|\bcrm\b|slack channel/i.test(message)) {
    if (/research|search|look up/i.test(message)) { const result = await call("valyu_search", { query: message }); return { answer: result.summary, kind: "read", needsClarification: false }; }
    await call("get_settings", {});
    const result = await call("draft_settings", { description: message });
    return result.proposal ? { ...proposalReply(ws, result.proposal, message), kind: "settings", needsClarification: false } : { answer: result.summary, kind: "settings", needsClarification: !!result.questions?.length };
  }
  if (last?.kind === "form" && /^(?:yes|no|sure|okay|ok)[.!]?$/i.test(message.trim())) return { answer: "Which part should I change: the form name, its fields, or booking? For example, ‘Call it Product demo, add phone and role, booking off’. I have kept your draft unchanged.", kind: "form", needsClarification: true };
  if (/explain|why|research|search|list|show|analytics|breach|leads|rules|reps|forms/i.test(message)) {
    const lead = ws.leads.find((l) => message.toLowerCase().includes(l.name.toLowerCase()) || message.includes(l.id));
    const name = /research|search|look up/i.test(message) ? "valyu_search" : /reps|team/i.test(message) ? "list_reps" : /rules/i.test(message) ? "list_rules" : /analytics|performance/i.test(message) ? "get_analytics" : /breach|overdue/i.test(message) ? "get_sla_breaches" : /explain|why/i.test(message) ? lead ? "get_lead" : "explain_route" : "list_leads";
    const result = await call(name, name === "valyu_search" ? { query: message } : name === "get_lead" ? { id: lead!.id } : name === "explain_route" ? { email: /[\w.+-]+@[\w.-]+\.[a-z]{2,}/i.exec(message)?.[0] ?? ws.leads[0]?.email } : {});
    return { answer: result.summary, kind: "read", needsClarification: false };
  }
  if (last?.kind === "form") return { answer: "I still have your form draft. Which part would you like to change — its name, fields or booking? For example, ‘Call it Product demo, add phone and role, booking off’. I haven’t changed or saved it.", kind: "form", needsClarification: true };
  return { answer: "I can build or update forms, draft routing rules, set enrichment order and caps, tune guard/SLA settings, and inspect leads. Try “Build a two-step demo form with company size and budget” or “EMEA leads over 50 employees between Jonas and Sofia”. Every change needs your confirmation.", kind: "help", needsClarification: false };
}
export function formProposal(ws: Workspace, form: Form): Proposal {
  return propose(ws, { type: "form.save", form, create: !ws.forms.some((f) => f.id === form.id) }, `${ws.forms.some((f) => f.id === form.id) ? "Update form:" : "Create form:"} ${form.name}`, "Review the fields and steps below. This form is saved only when you confirm; new forms start as drafts.");
}

/** Conversational copy is derived from the validated draft, never a pretend understanding response. */
export function proposalReply(ws: Workspace, proposal: Proposal, request = ""): { answer: string; questions: string[] } {
  const a = proposal.action;
  if (a.type === "form.save") {
    const f = a.form;
    const questions = [
      ...(!/call it|name it|called|named|rename/i.test(request) && f.name === "Demo request" ? ["What should we call this form? You can say ‘Call it Product demo’."] : []),
      ...(!/phone|role|add|remove/i.test(request) ? ["Any fields to add or remove — for example phone or job role?"] : []),
      ...(!/booking/i.test(request) ? [`Should booking stay ${f.showBooking ? "on" : "off"}, or would you like it ${f.showBooking ? "off" : "on"}?`] : []),
    ];
    return { answer: `I drafted “${f.name}” as a ${f.steps.length === 2 ? "two-step" : `${f.steps.length}-step`} form.\n${f.steps.map((s, i) => `Step ${i + 1}, ${s.title}: ${s.fields.map((field) => field.label).join(", ")}.`).join("\n")}\nBooking is ${f.showBooking ? "on" : "off"}. Submissions use your workspace’s routing rules. Review the draft below; it is not published.`, questions: questions.length ? questions : ["Does this updated draft look right, or is there anything else to adjust before you confirm?"] };
  }
  if (a.type === "rule.save") return { answer: `I drafted “${a.rule.name}”. It matches ${a.rule.conditions.length ? a.rule.conditions.map(conditionDescription).join(a.rule.match === "all" ? " and " : " or ") : "all leads"} and sends them to ${a.rule.repIds.map((id) => ws.reps.find((r) => r.id === id)?.name).join(" + ")} using the existing weighted round robin. Your current rules are unchanged until you confirm.`, questions: ["Any country, region or company-size filters to add?", "Is this the right rep pool? You can say ‘also include Sofia’ or give a full name."] };
  if (a.type === "settings.save") {
    const labels: Record<string, string> = { enrichOrder: "provider waterfall", perLeadCapCents: "per-lead cap", monthlySpendCapCents: "monthly cap", slaMinutes: "first-touch SLA (minutes)", escalateAfterMinutes: "escalation delay (minutes)", botBlockScore: "guard block score", botReviewScore: "guard review score" };
    const values = Object.entries(a.settings).map(([k, v]) => `${labels[k] ?? k}: ${k.endsWith("Cents") ? `$${(Number(v) / 100).toFixed(2)}` : Array.isArray(v) ? v.join(" → ") : String(v)}`);
    return { answer: `Here is the configuration I understood: ${values.join("; ")}. Only these settings will change after you confirm.`, questions: ["Would you like to adjust any of these values before saving?"] };
  }
  return { answer: proposal.summary, questions: [] };
}
