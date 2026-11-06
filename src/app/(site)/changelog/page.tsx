import type { Metadata } from "next";
import { PageHero, Section } from "@/components/site/page-hero";

export const metadata: Metadata = { title: "Changelog", description: "What's new in Velaroute." };

const ENTRIES = [
  { v: "1.0", d: "November 2026", t: "Velaroute 1.0", items: ["MCP server with 11 tools for your own agents", "SLA agent: warnings at 80%, breach alerts and automatic re-routing", "AI Copilot on OpenAI, Anthropic or OpenRouter", "Public status page with live health checks", "OpenAPI 3.1 reference with an interactive explorer"] },
  { v: "0.9", d: "October 2026", t: "Enrichment waterfall", items: ["Apollo → Clay → Valyu waterfall", "Per-lead and monthly spend caps with a spend ledger", "Domain cache for repeat companies"] },
  { v: "0.8", d: "September 2026", t: "Routing engine", items: ["Rules on any field, ICP scoring and the route tester", "Weighted round robin that skips away and at-capacity reps", "Account matching and duplicate merge"] },
  { v: "0.7", d: "August 2026", t: "Forms & booking", items: ["Branching multi-step form builder with embeds", "Book on submit with rep working hours and time zones", "Bot and spam guard"] },
];

export default function ChangelogPage() {
  return (
    <>
      <PageHero eyebrow="Changelog" title="What's new" />
      <Section className="!pt-0">
        <div className="mx-auto max-w-3xl space-y-10">
          {ENTRIES.map((e) => (
            <article key={e.v} className="grid gap-4 sm:grid-cols-[140px_1fr]">
              <div><p className="font-display text-lg font-semibold">v{e.v}</p><p className="text-sm text-muted">{e.d}</p></div>
              <div className="card p-6"><h2 className="font-display text-xl font-semibold">{e.t}</h2><ul className="mt-3 list-disc space-y-1.5 pl-5 text-muted">{e.items.map((i) => <li key={i}>{i}</li>)}</ul></div>
            </article>
          ))}
        </div>
      </Section>
    </>
  );
}
