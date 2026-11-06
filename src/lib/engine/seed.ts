import type { Enrichment, Form, Integration, LeadInput, Rep, Settings, Workspace } from "./types";
import { processLead, bookMeeting, touchLead, setStage, tick } from "./pipeline";
import { offlineEnrich, PROVIDER_COST } from "./enrich";
import { freeSlots } from "./slots";
import { FREE_MAIL } from "./util";

export const DEMO_API_KEY = "vr_demo_7Kq2Lm9Xp4Rt8Wz3";
const DEMO_API_KEY_HASH = "fa533a332a45486bed9a8695298ee33fedad36c30edcc6cd2e5844ef4b74ddf1";

function rng(seed: number) {
  return () => {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const DEFAULT_SETTINGS: Settings = {
  slaMinutes: 5,
  escalateAfterMinutes: 10,
  monthlySpendCapCents: 5000,
  perLeadCapCents: 15,
  botBlockScore: 70,
  botReviewScore: 35,
  blockDisposable: true,
  enrichOrder: ["apollo", "clay", "valyu"],
  crmTarget: "hubspot",
  slackChannel: "#inbound-alerts",
  aiModel: "gpt-4.1-mini",
  aiProvider: "openai",
  icpMinEmployees: 20,
  icpMaxEmployees: 1000,
  icpIndustries: ["SaaS", "Developer tools", "AI / ML", "Fintech", "Cybersecurity", "Data", "Healthtech"],
  icpRegions: ["NA", "EMEA"],
  bookingWindowDays: 7,
  meetingMinutes: 30,
};

export const DEMO_REPS: Rep[] = [
  { id: "rep_ava", name: "Ava Chen", email: "ava@velaroute.dev", title: "Account Executive, SMB", team: "smb", region: "NA", weight: 2, available: true, capacityPerDay: 40, timezone: "America/New_York", workStart: 9, workEnd: 17, calendar: "google", color: "#7c6cf2" },
  { id: "rep_marcus", name: "Marcus Reid", email: "marcus@velaroute.dev", title: "Account Executive, SMB", team: "smb", region: "NA", weight: 1, available: true, capacityPerDay: 40, timezone: "America/Chicago", workStart: 8, workEnd: 16, calendar: "microsoft", color: "#38bdf8" },
  { id: "rep_priya", name: "Priya Nair", email: "priya@velaroute.dev", title: "Account Executive, Mid-market", team: "midmarket", region: "NA", weight: 2, available: true, capacityPerDay: 30, timezone: "America/Los_Angeles", workStart: 8, workEnd: 17, calendar: "google", color: "#34d399" },
  { id: "rep_jonas", name: "Jonas Weber", email: "jonas@velaroute.dev", title: "Account Executive, EMEA", team: "emea", region: "EMEA", weight: 1, available: true, capacityPerDay: 30, timezone: "Europe/Berlin", workStart: 9, workEnd: 18, calendar: "microsoft", color: "#fbbf24" },
  { id: "rep_sofia", name: "Sofia Alvarez", email: "sofia@velaroute.dev", title: "Enterprise Account Executive", team: "enterprise", region: "NA", weight: 1, available: true, capacityPerDay: 20, timezone: "America/New_York", workStart: 9, workEnd: 18, calendar: "google", color: "#f472b6" },
  { id: "rep_liam", name: "Liam O'Connor", email: "liam@velaroute.dev", title: "Account Executive, APAC", team: "emea", region: "APAC", weight: 1, available: false, capacityPerDay: 25, timezone: "Australia/Sydney", workStart: 9, workEnd: 17, calendar: "google", color: "#fb923c" },
];

export const DEMO_FORMS: Form[] = [
  {
    id: "frm_demo", name: "Book a demo", slug: "book-a-demo", status: "live", showBooking: true, createdAt: "2026-09-01T09:00:00.000Z", submissions: 0, views: 0,
    steps: [
      { id: "s_about", title: "Tell us about you", fields: [
        { id: "name", label: "Full name", type: "text", required: true, placeholder: "Jordan Lee" },
        { id: "email", label: "Work email", type: "email", required: true, placeholder: "jordan@company.com" },
        { id: "company", label: "Company", type: "text", placeholder: "Company Inc." },
        { id: "size", label: "Company size", type: "buttons", required: true, options: ["1–49", "50–199", "200–999", "1000+"] },
      ] },
      { id: "s_small", title: "What are you hoping to fix?", fields: [
        { id: "use_case", label: "Main use case", type: "buttons", required: true, options: ["Faster lead response", "Round robin", "Spam leads", "Something else"] },
        { id: "notes", label: "Anything else?", type: "textarea", placeholder: "Optional" },
      ] },
      { id: "s_team", title: "Your sales team", fields: [
        { id: "reps", label: "How many sales reps?", type: "number", required: true, placeholder: "8" },
        { id: "crm", label: "Which CRM?", type: "select", required: true, options: ["HubSpot", "Salesforce", "Attio", "Pipedrive", "Other"] },
      ] },
      { id: "s_ent", title: "Enterprise rollout", fields: [
        { id: "timeline", label: "Timeline", type: "buttons", required: true, options: ["This quarter", "Next quarter", "Exploring"] },
        { id: "security", label: "Need a security review (SOC 2, DPA)?", type: "checkbox" },
        { id: "crm", label: "Which CRM?", type: "select", options: ["Salesforce", "HubSpot", "Other"] },
      ] },
    ],
    logic: [
      { id: "lg1", stepId: "s_about", fieldId: "size", op: "equals", value: "1000+", goto: "s_ent" },
      { id: "lg2", stepId: "s_about", fieldId: "size", op: "equals", value: "1–49", goto: "s_small" },
      { id: "lg3", stepId: "s_about", fieldId: "size", op: "filled", value: "", goto: "s_team" },
      { id: "lg4", stepId: "s_small", fieldId: "use_case", op: "filled", value: "", goto: "submit" },
      { id: "lg5", stepId: "s_team", fieldId: "reps", op: "filled", value: "", goto: "submit" },
    ],
  },
  {
    id: "frm_contact", name: "Contact sales", slug: "contact-sales", status: "live", showBooking: false, createdAt: "2026-09-10T09:00:00.000Z", submissions: 0, views: 0,
    steps: [{ id: "s1", title: "Contact sales", fields: [
      { id: "name", label: "Full name", type: "text", required: true },
      { id: "email", label: "Work email", type: "email", required: true },
      { id: "company", label: "Company", type: "text" },
      { id: "message", label: "How can we help?", type: "textarea", required: true },
    ] }],
    logic: [],
  },
  {
    id: "frm_partner", name: "Partner program", slug: "partners", status: "draft", showBooking: true, createdAt: "2026-10-02T09:00:00.000Z", submissions: 0, views: 0,
    steps: [
      { id: "p1", title: "Partner with us", fields: [
        { id: "name", label: "Full name", type: "text", required: true },
        { id: "email", label: "Work email", type: "email", required: true },
        { id: "ptype", label: "Partner type", type: "buttons", required: true, options: ["Agency", "Technology", "Reseller"] },
      ] },
      { id: "p2", title: "Agency details", fields: [{ id: "clients", label: "How many clients do you serve?", type: "number", required: true }] },
    ],
    logic: [
      { id: "pl1", stepId: "p1", fieldId: "ptype", op: "equals", value: "Agency", goto: "p2" },
      { id: "pl2", stepId: "p1", fieldId: "ptype", op: "not_equals", value: "Agency", goto: "submit" },
    ],
  },
];

function integrations(): Integration[] {
  const ids = ["openai", "openrouter", "anthropic", "apollo", "clay", "valyu", "hubspot", "salesforce", "attio", "slack", "google", "microsoft"] as const;
  const sandbox = new Set(["apollo", "clay", "hubspot", "slack"]);
  return ids.map((id) => sandbox.has(id) ? { id, connected: true, keyHint: "sandbox", secret: "sandbox", updatedAt: "2026-10-01T09:00:00.000Z" } : { id, connected: false });
}

export function emptyWorkspace(id: string, name: string, now = new Date()): Workspace {
  return {
    id, name, plan: "scale", createdAt: now.toISOString(), version: 1,
    reps: structuredClone(DEMO_REPS),
    accounts: [], forms: structuredClone(DEMO_FORMS), rules: [], rrState: {}, leads: [], alerts: [], crm: [], webhooks: [], deliveries: [],
    apiKeys: [], spend: [], integrations: integrations(), settings: structuredClone(DEFAULT_SETTINGS), audit: [],
  };
}

const FIRST = ["Jordan", "Maya", "Ethan", "Chloe", "Noah", "Isla", "Leo", "Zara", "Owen", "Hana", "Ravi", "Elena", "Theo", "Amara", "Felix", "Nina", "Kai", "Lucia", "Sam", "Ines", "Diego", "Freya", "Omar", "Grace"];
const LAST = ["Brooks", "Patel", "Kim", "Moreau", "Schmidt", "Okafor", "Nguyen", "Rossi", "Larsen", "Silva", "Cohen", "Walsh", "Tanaka", "Fischer", "Haddad", "Novak"];
const TITLES = ["Head of Sales", "VP Revenue", "RevOps Manager", "Founder & CEO", "Sales Director", "Marketing Ops Lead", "Demand Gen Manager", "CRO", "Growth Lead", "Account Manager"];
const EXTRA_DOMAINS = ["bluefin.dev", "copperleaf.io", "driftwood.ai", "emberly.co", "foxglove.app", "granitecloud.so", "hollowpeak.com", "ironbark.dev", "juniperlabs.io", "kitefin.com", "larkspur.ai", "mosaichq.com", "nebulaops.io", "oakline.co", "parallaxhq.dev", "quarrydata.so", "redwoodapps.com", "saltmarsh.io", "thistle.ai", "umbradev.com", "gmail.com", "outlook.com"];
const KNOWN_DOMAINS = ["northwind.io", "lumenhealth.co", "brightpath.dev", "kestrel.ai", "orbitpay.com", "tidewater.app", "cobaltsec.com", "fernlogistics.com", "quillhq.com", "sundial.so", "harborcloud.io", "meridianhr.com", "atlasdata.co", "pinecrest.edu", "vortexgames.gg"];

function sandboxEnrich(domain: string, title: string, r: () => number): Enrichment {
  const base = offlineEnrich(domain, title);
  if (FREE_MAIL.has(domain) || !base.company) return base;
  const provider = r() < 0.8 ? "apollo" : "clay";
  return { ...base, provider: `${provider} (sandbox)`, costCents: PROVIDER_COST[provider] ?? 0 };
}

/** Rich, deterministic-ish demo workspace built by running the real pipeline at back-dated times. */
export function demoWorkspace(id = "ws_demo", now = new Date()): Workspace {
  const ws = emptyWorkspace(id, "Northstar Labs", now);
  ws.createdAt = new Date(now.getTime() - 40 * 86400000).toISOString();
  ws.accounts = [
    { id: "acc_orbit", domain: "orbitpay.com", name: "OrbitPay", ownerId: "rep_sofia", employees: 900, country: "US", industry: "Fintech", stage: "customer" },
    { id: "acc_cobalt", domain: "cobaltsec.com", name: "Cobalt Security", ownerId: "rep_sofia", employees: 260, country: "US", industry: "Cybersecurity", stage: "open_opp" },
    { id: "acc_lumen", domain: "lumenhealth.co", name: "Lumen Health", ownerId: "rep_priya", employees: 420, country: "US", industry: "Healthtech", stage: "prospect" },
    { id: "acc_fern", domain: "fernlogistics.com", name: "Fern Logistics", ownerId: "rep_jonas", employees: 1800, country: "NL", industry: "Logistics", stage: "customer" },
    { id: "acc_harbor", domain: "harborcloud.io", name: "Harbor Cloud", ownerId: "rep_liam", employees: 310, country: "SG", industry: "Infrastructure", stage: "open_opp" },
    { id: "acc_northwind", domain: "northwind.io", name: "Northwind Analytics", ownerId: "rep_ava", employees: 140, country: "US", industry: "SaaS", stage: "open_opp" },
  ];
  ws.rules = [
    { id: "rul_lowfit", name: "Low fit → nurture", priority: 1, enabled: true, match: "all", conditions: [{ field: "icpScore", op: "lte", value: "25" }], repIds: ["rep_marcus"], hits: 0 },
    { id: "rul_ent", name: "Enterprise (1,000+ employees)", priority: 2, enabled: true, match: "all", conditions: [{ field: "employees", op: "gte", value: "1000" }], repIds: ["rep_sofia"], hits: 0 },
    { id: "rul_emea", name: "EMEA territory", priority: 3, enabled: true, match: "all", conditions: [{ field: "region", op: "equals", value: "EMEA" }], repIds: ["rep_jonas"], hits: 0 },
    { id: "rul_apac", name: "APAC territory", priority: 4, enabled: true, match: "all", conditions: [{ field: "region", op: "equals", value: "APAC" }], repIds: ["rep_liam", "rep_priya"], hits: 0 },
    { id: "rul_mm", name: "Mid-market (200–999)", priority: 5, enabled: true, match: "all", conditions: [{ field: "employees", op: "gte", value: "200" }], repIds: ["rep_priya", "rep_sofia"], hits: 0 },
    { id: "rul_smb", name: "SMB round robin", priority: 6, enabled: true, match: "all", conditions: [{ field: "employees", op: "lte", value: "199" }], repIds: ["rep_ava", "rep_marcus"], hits: 0 },
  ];
  ws.apiKeys = [{ id: "key_demo", name: "Website (demo)", prefix: DEMO_API_KEY.slice(0, 11), hash: DEMO_API_KEY_HASH, scopes: ["leads:read", "leads:write", "routing:read", "routing:write", "meetings:write", "analytics:read"], createdAt: ws.createdAt }];
  ws.webhooks = [{ id: "whk_demo", url: "https://hooks.example.com/velaroute", events: ["lead.routed", "meeting.booked", "sla.breached"], secret: "whsec_demo_6b1f0c", active: true, createdAt: ws.createdAt }];

  const r = rng(20261106);
  // Liam is away today, but was working for the historic data.
  const liam = ws.reps.find((x) => x.id === "rep_liam")!;
  liam.available = true;
  const N = 96;
  const times = Array.from({ length: N }, () => {
    const daysAgo = Math.floor(Math.pow(r(), 1.3) * 20) + 1;
    const at = new Date(now.getTime() - daysAgo * 86400000);
    at.setUTCHours(13 + Math.floor(r() * 9), Math.floor(r() * 60), 0, 0);
    return { at, daysAgo };
  }).sort((a, b) => a.at.getTime() - b.at.getTime());
  for (let i = 0; i < N; i++) {
    const { at, daysAgo } = times[i];
    const spam = r() < 0.09;
    const domain = spam ? (r() < 0.5 ? "mailinator.com" : "yopmail.com") : r() < 0.55 ? KNOWN_DOMAINS[Math.floor(r() * KNOWN_DOMAINS.length)] : EXTRA_DOMAINS[Math.floor(r() * EXTRA_DOMAINS.length)];
    const first = FIRST[Math.floor(r() * FIRST.length)];
    const last = LAST[Math.floor(r() * LAST.length)];
    const title = TITLES[Math.floor(r() * TITLES.length)];
    const source = (["form", "form", "form", "form", "chat", "email", "api", "booking"] as const)[Math.floor(r() * 8)];
    const form = source === "form" ? (r() < 0.75 ? "frm_demo" : "frm_contact") : undefined;
    const input: LeadInput = {
      source, formId: form, name: `${first} ${last}`, email: `${first}.${last}`.toLowerCase() + `@${domain}`, title,
      answers: form === "frm_demo" ? { size: ["1–49", "50–199", "200–999", "1000+"][Math.floor(r() * 4)], crm: ["HubSpot", "Salesforce", "Attio"][Math.floor(r() * 3)], reps: String(2 + Math.floor(r() * 30)) } : {},
      message: source === "email" ? "Hi — we're evaluating routing tools for our inbound team, can we talk this week?" : undefined,
      elapsedMs: spam ? 900 : 20000 + Math.floor(r() * 60000),
      utm: { source: ["google", "linkedin", "g2", "newsletter", "direct"][Math.floor(r() * 5)], medium: ["cpc", "social", "referral", "email", "none"][Math.floor(r() * 5)] },
    };
    const res = processLead(ws, input, at, sandboxEnrich(domain, title, r));
    const lead = res.lead;
    if (form) { const f = ws.forms.find((x) => x.id === form)!; f.submissions += 1; f.views += 3 + Math.floor(r() * 4); }
    if (lead.stage === "spam" || !lead.ownerId) continue;
    // Outcomes
    const fast = r();
    const touchMin = fast < 0.62 ? 0.5 + r() * 4 : fast < 0.86 ? 5 + r() * 9 : 15 + r() * 120;
    const touchAt = new Date(at.getTime() + touchMin * 60000);
    if (touchMin > ws.settings.slaMinutes) tick(ws, new Date(at.getTime() + (ws.settings.slaMinutes + 0.1) * 60000));
    if (touchMin > ws.settings.slaMinutes + ws.settings.escalateAfterMinutes) tick(ws, new Date(at.getTime() + (ws.settings.slaMinutes + ws.settings.escalateAfterMinutes + 0.2) * 60000));
    touchLead(ws, lead.id, r() < 0.5 ? "email" : "call", r() < 0.5 ? "Sent a personal reply with two times to meet" : "Called — left a voicemail and sent a follow-up", ws.reps.find((x) => x.id === lead.ownerId)?.name ?? "Rep", touchAt);
    lead.value = [6000, 12000, 18000, 24000, 48000][Math.floor(r() * 5)];
    if (r() < 0.42) {
      const rep = ws.reps.find((x) => x.id === lead.ownerId)!;
      const slots = freeSlots(ws, rep, touchAt, 5, 30, 10);
      if (slots.length) {
        const { meeting } = bookMeeting(ws, lead.id, slots[Math.floor(r() * slots.length)].start, touchAt);
        if (new Date(meeting.end) < now) {
          meeting.status = r() < 0.86 ? "held" : "no_show";
          const roll = r();
          if (meeting.status === "held") setStage(ws, lead.id, roll < 0.35 ? "won" : roll < 0.75 ? "qualified" : "lost", rep.name, new Date(meeting.end));
        }
      }
    } else if (r() < 0.25 && daysAgo > 6) {
      setStage(ws, lead.id, "lost", "Rep", new Date(touchAt.getTime() + 2 * 86400000));
    }
  }
  liam.available = false;

  // Live leads so the SLA agent has something to do right now.
  const live: [string, string, string, number][] = [
    ["Maya Brooks", "maya@kestrel.ai", "Head of Revenue", 2],
    ["Ethan Kim", "ethan.kim@quillhq.com", "Founder & CEO", 4],
    ["Chloe Moreau", "chloe@atlasdata.co", "RevOps Manager", 9],
    ["Leo Tanaka", "leo@harborcloud.io", "VP Sales", 1],
    ["Zara Haddad", "zara@copperleaf.io", "Demand Gen Manager", 3],
  ];
  for (const [name, email, title, minsAgo] of live) {
    processLead(ws, { source: "form", formId: "frm_demo", name, email, title, answers: { size: "50–199", reps: "12", crm: "HubSpot" }, elapsedMs: 32000 }, new Date(now.getTime() - minsAgo * 60000), sandboxEnrich(email.split("@")[1], title, r));
  }
  processLead(ws, { source: "chat", name: "Kai Novak", email: "kai.novak@gmail.com", message: "is there a free plan? check my site http://a.co http://b.co http://c.co", elapsedMs: 15000 }, new Date(now.getTime() - 20 * 60000));
  processLead(ws, { source: "form", formId: "frm_contact", name: "xxxxxx", email: "promo@mailinator.com", message: "cheap backlinks and seo services", honeypot: "x", elapsedMs: 700 }, new Date(now.getTime() - 35 * 60000));
  tick(ws, now);

  ws.deliveries = ws.leads.filter((l) => l.ownerId).slice(0, 12).map((l, i) => ({ id: `dlv_${i}`, webhookId: "whk_demo", event: "lead.routed", at: l.createdAt, status: i === 3 ? 503 : 200, ok: i !== 3, ms: 80 + ((i * 37) % 160) }));
  ws.audit = [
    { at: new Date(now.getTime() - 3 * 86400000).toISOString(), type: "settings", text: "SLA window set to 5 minutes", by: "Rahul Patel" },
    { at: new Date(now.getTime() - 5 * 86400000).toISOString(), type: "routing", text: "Rule “EMEA territory” created", by: "Rahul Patel" },
    { at: new Date(now.getTime() - 9 * 86400000).toISOString(), type: "integration", text: "HubSpot connected (sandbox)", by: "Rahul Patel" },
  ];
  ws.alerts.forEach((a, i) => { if (i > 6) a.read = true; });
  return ws;
}
