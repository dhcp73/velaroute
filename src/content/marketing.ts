import { BadgeCheck, Bot, CalendarCheck, Database, FileInput, Gauge, KeyRound, LineChart, Plug, ShieldCheck, Split, Timer } from "lucide-react";

export const INTEGRATIONS = ["HubSpot", "Salesforce", "Attio", "Apollo", "Clay", "Valyu", "OpenAI", "Anthropic", "OpenRouter", "Slack", "Google Calendar", "Microsoft 365", "Webhooks", "REST API", "MCP"];

export const FEATURES = [
  { icon: FileInput, title: "Branching forms & chat", text: "Multi-step forms with conditional logic, a website chat widget, email-to-lead and an API — one queue for every inbound channel.", tone: "bg-surface-2 text-ink" },
  { icon: ShieldCheck, title: "Bot & spam guard", text: "Honeypots, fill-time checks, disposable domains and spam phrases. Junk is blocked before it costs you an enrichment credit.", tone: "bg-surface-2 text-ink" },
  { icon: Database, title: "Enrichment with a spend cap", text: "Apollo, Clay and Valyu in a waterfall with per-lead and monthly caps, domain caching and a full spend ledger.", tone: "bg-surface-2 text-ink" },
  { icon: Split, title: "Explainable routing", text: "Territory, size, industry and ICP rules, then weighted round robin that skips away reps — with a trace for every decision.", tone: "bg-surface-2 text-ink" },
  { icon: CalendarCheck, title: "Book on submit", text: "Qualified buyers see the assigned rep's real free times the moment they hit send. No back-and-forth emails.", tone: "bg-surface-2 text-ink" },
  { icon: Timer, title: "SLA agent", text: "A first-touch clock on every lead. Warnings at 80%, Slack alerts on breach and automatic re-routing to a free rep.", tone: "bg-surface-2 text-ink" },
  { icon: Bot, title: "AI Copilot", text: "Summaries, account research, next best action and reply drafts — on OpenAI, Anthropic or any OpenRouter model.", tone: "bg-surface-2 text-ink" },
  { icon: Plug, title: "CRM write-back", text: "Contacts, companies, owners and meetings written to HubSpot, Salesforce or Attio, with a visible sync log.", tone: "bg-surface-2 text-ink" },
  { icon: KeyRound, title: "API, webhooks & MCP", text: "A documented REST API, signed webhooks and an MCP server so your own agents can route, book and query leads.", tone: "bg-surface-2 text-ink" },
  { icon: LineChart, title: "Inbound analytics", text: "Speed-to-lead, conversion by source, routing fairness and enrichment spend — the numbers RevOps gets asked for.", tone: "bg-surface-2 text-ink" },
  { icon: Gauge, title: "Live health checks", text: "Storage, pipeline, routing, SLA, API and MCP checked continuously and published on a status page.", tone: "bg-surface-2 text-ink" },
  { icon: BadgeCheck, title: "Built for small teams", text: "Set up in an afternoon. Flat pricing from $99/month instead of a five-figure annual contract.", tone: "bg-surface-2 text-ink" },
];

/** Public research figures. Sources are cited on the page. */
export const STATS = [
  { value: 42, suffix: " h", label: "average first response time to a web lead across 2,241 US companies", src: "Harvard Business Review (2011)", href: "https://hbr.org/2011/03/the-short-life-of-online-sales-leads" },
  { value: 7, suffix: "×", label: "more likely to qualify a lead when you reply within an hour vs. an hour later", src: "Harvard Business Review (2011)", href: "https://hbr.org/2011/03/the-short-life-of-online-sales-leads" },
  { value: 99, prefix: "$", suffix: "/mo", label: "to start — incumbent inbound suites are often priced per seat on annual contracts", src: "Velaroute pricing", href: "/pricing" },
];

export { TIERS, type Tier } from "@/lib/plans";

export const FAQ = [
  { q: "How is Velaroute different from a scheduling link?", a: "A scheduling link books whoever clicks it. Velaroute decides who should get the meeting first — guarding against spam, enriching the lead, matching it to an existing account, applying your territory rules — and only then shows that rep's calendar. Every step is traced, so you can see why a lead went where it did." },
  { q: "Do I need Apollo, Clay or an AI key to start?", a: "No. Every workspace starts in sandbox mode with simulated enrichment and AI so you can try the full pipeline. Add your own keys in Settings → Integrations when you are ready, and the spend cap applies from the first real call." },
  { q: "Which CRMs do you support?", a: "HubSpot and Attio on every plan, Salesforce on Scale. Velaroute writes contacts, companies, owners and meetings, and logs every sync event so RevOps can audit it." },
  { q: "Can my own agents use Velaroute?", a: "Yes. There is a REST API with an OpenAPI spec, HMAC-signed webhooks and an MCP server exposing tools like explain_route, list_leads, book_meeting and get_analytics." },
  { q: "What happens when a rep misses the SLA?", a: "At 80% of the window Velaroute warns the owner. On breach it alerts the channel, and after the escalation window it re-routes the lead to the next available rep and records the hand-off in the lead's trace." },
  { q: "Is there a free trial?", a: "Yes — 14 days on any plan, no card required. You can also explore the full product right now with the demo login on the sign-in page." },
];
