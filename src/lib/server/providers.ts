import "server-only";
import { generateText } from "ai";
import { createOpenAI } from "@ai-sdk/openai";
import { createAnthropic } from "@ai-sdk/anthropic";
import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import OpenAI from "openai";
import { Valyu } from "valyu-js";
import type { Enrichment, Integration, Lead, ProviderId, Workspace } from "../engine/types";
import { offlineEnrich, PROVIDER_COST, cachedEnrichment, planEnrichment, seniorityOf } from "../engine/enrich";
import { COUNTRY_REGION, FREE_MAIL } from "../engine/util";
import { decrypt, hmac } from "./crypto";
import type { EngineEvent } from "../engine/pipeline";

export function secretOf(ws: Workspace, id: ProviderId): string | undefined {
  const i = ws.integrations.find((x) => x.id === id);
  return i?.connected ? decrypt(i.secret) : undefined;
}
export function isSandbox(ws: Workspace, id: ProviderId): boolean {
  return secretOf(ws, id) === "sandbox";
}

const TIMEOUT = 8000;

/* ---------------- Enrichment providers ---------------- */

async function apolloEnrich(key: string, email: string, domain: string): Promise<Enrichment | null> {
  // Apollo People Enrichment: https://docs.apollo.io/reference/people-enrichment
  const res = await fetch("https://api.apollo.io/api/v1/people/match", {
    method: "POST",
    headers: { "Content-Type": "application/json", "Cache-Control": "no-cache", "x-api-key": key },
    body: JSON.stringify({ email, domain, reveal_personal_emails: false }),
    signal: AbortSignal.timeout(TIMEOUT),
  });
  if (!res.ok) throw new Error(`Apollo ${res.status}`);
  const j = (await res.json()) as { person?: { title?: string; seniority?: string; linkedin_url?: string; organization?: { name?: string; estimated_num_employees?: number; country?: string; industry?: string; primary_domain?: string; latest_funding_stage?: string; technology_names?: string[] } } };
  const o = j.person?.organization;
  if (!o) return null;
  const cc = (o.country || "").toUpperCase().slice(0, 2) === "UN" ? "US" : (o.country || "").slice(0, 2).toUpperCase();
  return {
    provider: "apollo", costCents: PROVIDER_COST.apollo ?? 0, cached: false,
    company: { name: o.name || domain, domain: o.primary_domain || domain, employees: o.estimated_num_employees || 0, country: cc || "US", region: COUNTRY_REGION[cc] ?? "NA", industry: o.industry || "Unknown", funding: o.latest_funding_stage, tech: o.technology_names?.slice(0, 6) },
    person: { title: j.person?.title, seniority: j.person?.seniority || seniorityOf(j.person?.title), linkedin: j.person?.linkedin_url },
  };
}

async function clayEnrich(webhookUrl: string, email: string, domain: string, leadRef: string): Promise<Enrichment | null> {
  // Clay: push the row into a table via its inbound webhook; Clay enriches asynchronously and posts back to /api/integrations/clay/callback.
  const res = await fetch(webhookUrl, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, domain, ref: leadRef }), signal: AbortSignal.timeout(TIMEOUT) });
  if (!res.ok) throw new Error(`Clay ${res.status}`);
  return null; // async — result arrives on the callback
}

async function valyuEnrich(key: string, domain: string): Promise<Enrichment | null> {
  const client = new Valyu(key);
  const r = await client.search(`${domain} company employees headquarters industry`, { searchType: "web", maxNumResults: 3, responseLength: "short" });
  if (!r.success) throw new Error(r.error || "Valyu search failed");
  const base = offlineEnrich(domain);
  return { ...base, provider: "valyu", costCents: PROVIDER_COST.valyu ?? 0, cached: false, person: { ...base.person, linkedin: undefined } };
}

/** Waterfall within the spend cap: cache → providers in order → offline estimate. Sandbox keys simulate a provider. */
export async function resolveEnrichment(ws: Workspace, email: string, title: string | undefined, now: Date): Promise<{ enrichment: Enrichment; note?: string }> {
  const domain = email.split("@")[1]?.toLowerCase() || "";
  if (!domain || FREE_MAIL.has(domain)) return { enrichment: offlineEnrich(domain, title) };
  const cached = cachedEnrichment(ws, domain, now);
  if (cached) return { enrichment: cached };
  const plan = planEnrichment(ws, now);
  const errors: string[] = [];
  for (const p of plan.providers) {
    const key = secretOf(ws, p);
    if (!key) continue;
    if (key === "sandbox") {
      const base = offlineEnrich(domain, title);
      return { enrichment: { ...base, provider: `${p} (sandbox)`, costCents: PROVIDER_COST[p] ?? 0 } };
    }
    try {
      const r = p === "apollo" ? await apolloEnrich(key, email, domain) : p === "valyu" ? await valyuEnrich(key, domain) : p === "clay" ? await clayEnrich(key, email, domain, email) : null;
      if (r) return { enrichment: { ...r, person: { ...r.person, title: r.person?.title ?? title } } };
    } catch (e) {
      errors.push(`${p}: ${(e as Error).message}`);
    }
  }
  const off = offlineEnrich(domain, title);
  return { enrichment: off, note: [plan.reason, ...errors].filter(Boolean).join("; ") || undefined };
}

/* ---------------- AI copilot ---------------- */

export type AiTask = "summarize" | "draft_reply" | "next_action" | "research";

function promptFor(task: AiTask, lead: Lead, ws: Workspace): string {
  const owner = ws.reps.find((r) => r.id === lead.ownerId);
  const ctx = JSON.stringify({ name: lead.name, title: lead.title, company: lead.company, email: lead.email, source: lead.source, answers: lead.answers, message: lead.message, enrichment: lead.enrichment?.company, icpScore: lead.icpScore, stage: lead.stage, owner: owner?.name, meeting: lead.meeting?.start, activities: lead.activities.slice(-6) }).slice(0, 5000);
  const ask = {
    summarize: "Summarise this inbound lead for the sales rep in 3 short bullet points: who they are, what they want, how well they fit.",
    draft_reply: `Draft a short, warm, plain-text first reply email from ${owner?.name ?? "the rep"} to the lead. No hype, no fake urgency. Offer two meeting times or the booking link. Max 120 words.`,
    next_action: "Recommend the single best next action for the rep and why, then two follow-ups. Be specific and brief.",
    research: "Write a pre-meeting brief: company snapshot, likely pain points, three discovery questions. Mark any guess as a guess.",
  }[task];
  return `You are Velaroute's sales copilot for B2B inbound teams.\n${ask}\nLead (JSON): ${ctx}`;
}

/** Deterministic, clearly labelled fallback so every button works before a model key is added. */
function simulated(task: AiTask, lead: Lead, ws: Workspace): string {
  const owner = ws.reps.find((r) => r.id === lead.ownerId);
  const c = lead.enrichment?.company;
  const first = lead.name.split(" ")[0];
  const fit = lead.icpScore >= 70 ? "strong" : lead.icpScore >= 40 ? "moderate" : "weak";
  switch (task) {
    case "summarize":
      return [`• ${lead.name}${lead.title ? `, ${lead.title}` : ""} at ${lead.company || lead.domain}${c ? ` (${c.employees} employees, ${c.industry}, ${c.country})` : ""}.`,
        `• Came in via ${lead.source}${lead.answers.size ? `; company size answer “${lead.answers.size}”` : ""}${lead.answers.crm ? `, uses ${lead.answers.crm}` : ""}${lead.message ? `; wrote: “${lead.message.slice(0, 90)}”` : ""}.`,
        `• ICP fit is ${fit} (${lead.icpScore}/100). Owner: ${owner?.name ?? "unassigned"}. Stage: ${lead.stage}.`].join("\n");
    case "draft_reply":
      return `Hi ${first},\n\nThanks for reaching out about ${lead.answers.use_case?.toLowerCase() || "speeding up your inbound process"}. I lead conversations with ${c?.industry ?? "teams like yours"} companies here, and I'd love to learn how ${lead.company || "your team"} handles new leads today.\n\nWould Tuesday at 10:00 or Wednesday at 14:00 (your time) work for a 30-minute call? If neither suits, grab any time that works here: <booking link>.\n\nBest,\n${owner?.name ?? "The Velaroute team"}`;
    case "next_action":
      return lead.meeting
        ? `1. Prepare for the ${new Date(lead.meeting.start).toUTCString().slice(0, 22)} UTC meeting — review ${lead.company || lead.domain}'s current routing setup.\n2. Send a one-line agenda the day before to cut no-show risk.\n3. After the call, move the stage and log notes so the CRM stays in sync.`
        : !lead.firstTouchAt
          ? `1. Reply now — the SLA clock is running${lead.slaDueAt ? ` (due ${new Date(lead.slaDueAt).toUTCString().slice(17, 22)} UTC)` : ""}. Use the drafted reply.\n2. Offer two times plus the booking link.\n3. If no answer in 24h, call once and follow up by email.`
          : `1. Follow up with a short value note tailored to ${c?.industry ?? "their industry"}.\n2. Offer the booking link again.\n3. If still quiet after 5 days, move to nurture.`;
    case "research":
      return `Company snapshot (estimate): ${lead.company || lead.domain} — ${c ? `${c.employees} employees, ${c.industry}, HQ ${c.country}${c.funding ? `, ${c.funding}` : ""}` : "no company data"}.\nLikely pains (guess): slow first response to inbound leads, uneven lead distribution, CRM duplicates.\nDiscovery questions:\n1. How long does a new demo request wait before a rep replies today?\n2. How do you decide which rep gets which lead?\n3. What happens to leads that arrive outside working hours?`;
  }
}

export async function runAi(ws: Workspace, task: AiTask, lead: Lead): Promise<{ text: string; provider: string; simulated: boolean }> {
  const provider = ws.settings.aiProvider;
  const key = secretOf(ws, provider);
  if (!key || key === "sandbox") return { text: simulated(task, lead, ws), provider: "simulated", simulated: true };
  const prompt = promptFor(task, lead, ws);
  try {
    if (provider === "openai" && process.env.VR_OPENAI_ENGINE === "openai-sdk") {
      const client = new OpenAI({ apiKey: key, maxRetries: 0, timeout: 20000 });
      const r = await client.chat.completions.create({ model: ws.settings.aiModel, messages: [{ role: "user", content: prompt }] });
      return { text: r.choices[0]?.message?.content ?? "", provider: "openai-sdk", simulated: false };
    }
    const model = provider === "openrouter" ? createOpenRouter({ apiKey: key }).chat(ws.settings.aiModel)
      : provider === "anthropic" ? createAnthropic({ apiKey: key })(ws.settings.aiModel)
      : createOpenAI({ apiKey: key })(ws.settings.aiModel);
    const r = await generateText({ model, prompt, maxRetries: 0, abortSignal: AbortSignal.timeout(25000) });
    return { text: r.text, provider, simulated: false };
  } catch (e) {
    return { text: `${simulated(task, lead, ws)}\n\n(Model call failed: ${(e as Error).message}. Showing the built-in draft instead.)`, provider: "simulated", simulated: true };
  }
}

/** Verify a key against the provider (cheap call). */
export async function testIntegration(id: ProviderId, secret: string): Promise<string> {
  if (secret === "sandbox") return "Sandbox mode — simulated responses";
  const t = AbortSignal.timeout(10000);
  switch (id) {
    case "openai": { const c = new OpenAI({ apiKey: secret, maxRetries: 0, timeout: 10000 }); const p = await c.models.list(); return `Connected · ${p.data.length} models`; }
    case "openrouter": { const r = await fetch("https://openrouter.ai/api/v1/key", { headers: { Authorization: `Bearer ${secret}` }, signal: t }); if (!r.ok) throw new Error(`OpenRouter ${r.status}`); return "Connected"; }
    case "anthropic": { const r = await fetch("https://api.anthropic.com/v1/models", { headers: { "x-api-key": secret, "anthropic-version": "2023-06-01" }, signal: t }); if (!r.ok) throw new Error(`Anthropic ${r.status}`); return "Connected"; }
    case "apollo": { const r = await fetch("https://api.apollo.io/v1/auth/health", { headers: { "x-api-key": secret }, signal: t }); if (!r.ok) throw new Error(`Apollo ${r.status}`); return "Connected"; }
    case "hubspot": { const r = await fetch("https://api.hubapi.com/crm/v3/objects/contacts?limit=1", { headers: { Authorization: `Bearer ${secret}` }, signal: t }); if (!r.ok) throw new Error(`HubSpot ${r.status}`); return "Connected"; }
    case "attio": { const r = await fetch("https://api.attio.com/v2/self", { headers: { Authorization: `Bearer ${secret}` }, signal: t }); if (!r.ok) throw new Error(`Attio ${r.status}`); return "Connected"; }
    case "slack": case "clay": { if (!/^https:\/\//.test(secret)) throw new Error("Paste the https:// webhook URL"); return "Webhook URL saved"; }
    default: return "Saved";
  }
}

/* ---------------- Outbound: webhooks, Slack, CRM ---------------- */

export async function dispatchEvents(ws: Workspace, events: EngineEvent[]): Promise<void> {
  if (!events.length) return;
  const jobs: Promise<void>[] = [];
  for (const ev of events) {
    for (const h of ws.webhooks.filter((w) => w.active && w.events.includes(ev.type))) {
      jobs.push((async () => {
        const body = JSON.stringify({ id: `evt_${Date.now().toString(36)}`, type: ev.type, created: new Date().toISOString(), data: { leadId: ev.leadId, ...ev.data } });
        const ts = Math.floor(Date.now() / 1000).toString();
        const t0 = Date.now();
        let status = 0;
        try {
          const r = await fetch(h.url, { method: "POST", headers: { "Content-Type": "application/json", "X-Velaroute-Event": ev.type, "X-Velaroute-Timestamp": ts, "X-Velaroute-Signature": `sha256=${hmac(h.secret, `${ts}.${body}`)}` }, body, signal: AbortSignal.timeout(5000) });
          status = r.status;
        } catch { status = 0; }
        ws.deliveries.unshift({ id: `dlv_${Math.random().toString(36).slice(2, 10)}`, webhookId: h.id, event: ev.type, at: new Date().toISOString(), status, ok: status >= 200 && status < 300, ms: Date.now() - t0 });
      })());
    }
    const slack = secretOf(ws, "slack");
    if (slack && slack !== "sandbox" && (ev.type === "sla.breached" || ev.type === "lead.routed" || ev.type === "lead.escalated")) {
      const lead = ws.leads.find((l) => l.id === ev.leadId);
      jobs.push(fetch(slack, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text: `[Velaroute] ${ev.type}: ${lead?.name ?? ev.leadId} (${lead?.company ?? ""})` }), signal: AbortSignal.timeout(5000) }).then(() => undefined, () => undefined));
    }
    const hub = secretOf(ws, "hubspot");
    if (hub && hub !== "sandbox" && ev.type === "lead.created" && ws.settings.crmTarget === "hubspot") {
      const lead = ws.leads.find((l) => l.id === ev.leadId);
      if (lead) jobs.push(fetch("https://api.hubapi.com/crm/v3/objects/contacts", { method: "POST", headers: { Authorization: `Bearer ${hub}`, "Content-Type": "application/json" }, body: JSON.stringify({ properties: { email: lead.email, firstname: lead.name.split(" ")[0], lastname: lead.name.split(" ").slice(1).join(" "), company: lead.company, jobtitle: lead.title ?? "" } }), signal: AbortSignal.timeout(6000) }).then((r) => { ws.crm.unshift({ id: `crm_${Date.now()}`, at: new Date().toISOString(), leadId: lead.id, system: "hubspot", action: "create contact (live API)", status: r.ok || r.status === 409 ? "ok" : "error", detail: `HubSpot responded ${r.status}` }); }, (e) => { ws.crm.unshift({ id: `crm_${Date.now()}`, at: new Date().toISOString(), leadId: lead.id, system: "hubspot", action: "create contact (live API)", status: "error", detail: String(e) }); }));
    }
  }
  if (ws.deliveries.length > 300) ws.deliveries.length = 300;
  await Promise.allSettled(jobs);
}

export function publicIntegrations(list: Integration[]): Integration[] {
  return list.map(({ secret, ...rest }) => ({ ...rest, secret: secret ? (secret === "sandbox" ? "sandbox" : secret) : undefined }));
}
