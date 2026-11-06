import type { Enrichment, ProviderId, Workspace } from "./types";
import { COUNTRY_REGION, FREE_MAIL, hash, pick, titleCase } from "./util";

/** Price list (US cents per successful lookup) used for the spend ledger and caps. */
export const PROVIDER_COST: Partial<Record<ProviderId, number>> = {
  apollo: 5,
  clay: 8,
  valyu: 10,
  openai: 1,
  openrouter: 1,
  anthropic: 1,
};

/** Fictional demo companies used by the seed + offline enricher. */
export const KNOWN: Record<string, NonNullable<Enrichment["company"]>> = {
  "northwind.io": { name: "Northwind Analytics", domain: "northwind.io", employees: 140, country: "US", region: "NA", industry: "SaaS", funding: "Series B", tech: ["HubSpot", "Segment", "Snowflake"] },
  "lumenhealth.co": { name: "Lumen Health", domain: "lumenhealth.co", employees: 420, country: "US", region: "NA", industry: "Healthtech", funding: "Series C", tech: ["Salesforce", "Marketo"] },
  "brightpath.dev": { name: "Brightpath", domain: "brightpath.dev", employees: 38, country: "GB", region: "EMEA", industry: "Developer tools", funding: "Seed", tech: ["Attio", "Stripe"] },
  "kestrel.ai": { name: "Kestrel AI", domain: "kestrel.ai", employees: 75, country: "DE", region: "EMEA", industry: "AI / ML", funding: "Series A", tech: ["HubSpot", "Clay"] },
  "orbitpay.com": { name: "OrbitPay", domain: "orbitpay.com", employees: 900, country: "US", region: "NA", industry: "Fintech", funding: "Series D", tech: ["Salesforce", "Outreach", "Gong"] },
  "tidewater.app": { name: "Tidewater", domain: "tidewater.app", employees: 22, country: "AU", region: "APAC", industry: "SaaS", funding: "Seed", tech: ["HubSpot"] },
  "cobaltsec.com": { name: "Cobalt Security", domain: "cobaltsec.com", employees: 260, country: "US", region: "NA", industry: "Cybersecurity", funding: "Series C", tech: ["Salesforce", "Chili Piper"] },
  "fernlogistics.com": { name: "Fern Logistics", domain: "fernlogistics.com", employees: 1800, country: "NL", region: "EMEA", industry: "Logistics", funding: "Private", tech: ["Salesforce"] },
  "quillhq.com": { name: "Quill", domain: "quillhq.com", employees: 55, country: "CA", region: "NA", industry: "SaaS", funding: "Series A", tech: ["HubSpot", "Intercom"] },
  "sundial.so": { name: "Sundial", domain: "sundial.so", employees: 12, country: "IN", region: "APAC", industry: "Developer tools", funding: "Pre-seed", tech: ["Notion"] },
  "harborcloud.io": { name: "Harbor Cloud", domain: "harborcloud.io", employees: 310, country: "SG", region: "APAC", industry: "Infrastructure", funding: "Series B", tech: ["Salesforce", "Segment"] },
  "meridianhr.com": { name: "Meridian HR", domain: "meridianhr.com", employees: 95, country: "US", region: "NA", industry: "HR tech", funding: "Series A", tech: ["HubSpot", "Calendly"] },
  "atlasdata.co": { name: "Atlas Data", domain: "atlasdata.co", employees: 180, country: "FR", region: "EMEA", industry: "Data", funding: "Series B", tech: ["HubSpot", "Snowflake"] },
  "pinecrest.edu": { name: "Pinecrest Learning", domain: "pinecrest.edu", employees: 650, country: "US", region: "NA", industry: "Edtech", funding: "Private", tech: ["Salesforce"] },
  "vortexgames.gg": { name: "Vortex Games", domain: "vortexgames.gg", employees: 48, country: "SE", region: "EMEA", industry: "Gaming", funding: "Seed", tech: ["Attio"] },
};

const INDUSTRIES = ["SaaS", "Fintech", "Developer tools", "Healthtech", "AI / ML", "Cybersecurity", "Data", "E-commerce", "Martech"];
const COUNTRIES = ["US", "US", "US", "GB", "DE", "CA", "AU", "IN", "FR", "NL", "SG"];
const SIZES = [8, 18, 35, 60, 120, 240, 480, 1100, 2600];

export function seniorityOf(title = ""): string {
  const t = title.toLowerCase();
  if (/(founder|ceo|cto|coo|cfo|cro|chief|owner|president)/.test(t)) return "C-level";
  if (/(vp|vice president|head)/.test(t)) return "VP / Head";
  if (/(director)/.test(t)) return "Director";
  if (/(manager|lead)/.test(t)) return "Manager";
  return t ? "Individual contributor" : "Unknown";
}

/** Deterministic offline enrichment so the full pipeline works with zero API keys. Labelled as an estimate. */
export function offlineEnrich(domain: string, title?: string): Enrichment {
  if (!domain || FREE_MAIL.has(domain)) {
    return { provider: "offline", costCents: 0, cached: false, skipped: "Personal email — no company to enrich", person: { title, seniority: seniorityOf(title) } };
  }
  const known = KNOWN[domain];
  const h = hash(domain);
  const country = known?.country ?? pick(COUNTRIES, h >>> 3);
  const company = known ?? {
    name: titleCase(domain.split(".")[0]),
    domain,
    employees: pick(SIZES, h >>> 5),
    country,
    region: COUNTRY_REGION[country] ?? "NA",
    industry: pick(INDUSTRIES, h >>> 7),
  };
  return { provider: known ? "offline-dataset" : "offline-estimate", costCents: 0, cached: false, company, person: { title, seniority: seniorityOf(title) } };
}

export function monthSpendCents(ws: Workspace, now: Date): number {
  const key = now.toISOString().slice(0, 7);
  return ws.spend.filter((s) => s.at.slice(0, 7) === key).reduce((a, s) => a + s.cents, 0);
}

/** Look up a cached enrichment for the domain from the last 30 days (no spend on cache hits). */
export function cachedEnrichment(ws: Workspace, domain: string, now: Date): Enrichment | undefined {
  const cutoff = now.getTime() - 30 * 86400000;
  const hit = ws.leads.find((l) => l.domain === domain && l.enrichment?.company && new Date(l.createdAt).getTime() > cutoff && !l.enrichment.provider.startsWith("offline"));
  return hit?.enrichment ? { ...hit.enrichment, cached: true, costCents: 0 } : undefined;
}

export interface EnrichPlan { providers: ProviderId[]; reason?: string }

/** Decide which paid providers may run for this lead without crossing the per-lead or monthly cap. */
export function planEnrichment(ws: Workspace, now: Date): EnrichPlan {
  const connected = new Set(ws.integrations.filter((i) => i.connected).map((i) => i.id));
  const order = ws.settings.enrichOrder.filter((p) => connected.has(p) && PROVIDER_COST[p] !== undefined);
  if (!order.length) return { providers: [], reason: "No enrichment provider connected — using offline estimate" };
  const remaining = ws.settings.monthlySpendCapCents - monthSpendCents(ws, now);
  const providers: ProviderId[] = [];
  let budget = Math.min(ws.settings.perLeadCapCents, remaining);
  for (const p of order) {
    const c = PROVIDER_COST[p] ?? 0;
    if (c <= budget) { providers.push(p); budget -= c; }
  }
  if (!providers.length) return { providers: [], reason: remaining <= 0 ? "Monthly spend cap reached" : "Per-lead cap too low for any provider" };
  return { providers };
}
