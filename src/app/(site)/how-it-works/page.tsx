import type { Metadata } from "next";
import { PageHero, Section } from "@/components/site/page-hero";
import { Reveal } from "@/components/site/motion";
import { PipelineFlow } from "@/components/site/pipeline";
import { STAGES } from "@/content/stages";
import { CtaBand } from "@/components/site/cta";

export const metadata: Metadata = { title: "How it works", description: "The eight agents in the Velaroute pipeline: capture, guard, enrich, match, route, book, sync and SLA." };

const DETAIL: Record<string, string[]> = {
  capture: ["Hosted forms with branching steps, embeds and a JS snippet", "Website chat, inbound email and REST API land in the same queue", "UTM and page context captured automatically"],
  guard: ["Scores 0–100 from honeypot, fill time, disposable and free-mail domains, and spam phrases", "Above your block threshold: marked spam, nothing spent", "Between thresholds: held for human review with the reasons shown"],
  enrich: ["Waterfall across Apollo, Clay and Valyu — stops at the first complete answer", "Per-lead and monthly caps checked before every paid call", "Results cached per domain for 30 days"],
  match: ["Matches the lead's domain to an existing account", "Merges duplicates submitted within 30 days", "Hands account-owned leads straight to the owner"],
  route: ["Ordered rules on any field: country, region, size, industry, ICP score, answers", "Weighted round robin among the matched team", "Skips reps who are away, off hours or at capacity — and records why"],
  book: ["Free slots from the rep's working hours and time zone", "Booking confirmation page with a meeting link", "Meeting written to the CRM and the lead timeline"],
  sync: ["Contact, company, owner and meeting upserts", "HubSpot, Attio and Salesforce connectors", "Signed webhooks for everything else"],
  sla: ["First-touch clock starts at routing", "Warn at 80% of the window, alert on breach", "Escalate by re-routing to the next free rep"],
};

export default function HowItWorks() {
  return (
    <>
      <PageHero eyebrow="How it works" title={<>From form fill to booked meeting in <span className="editorial-emphasis">eight steps</span></>}>
        Each step is a small agent with one job and a written trace. You can test, tune or switch off any of them.
      </PageHero>
      <Section className="!pt-0"><PipelineFlow /></Section>
      <Section className="relative isolate border-t border-line !pt-12 sm:!pt-16">
        <div data-step-section className="relative mx-auto max-w-3xl border-l-2 border-dashed border-primary-200 pl-8 dark:border-primary-500/30">
          {STAGES.map((s, i) => (
            <Reveal key={s.id} delay={0.03} className="relative pb-12 last:pb-0">
              <div>
                <span className="absolute -left-[3.15rem] grid h-10 w-10 place-items-center rounded-lg bg-primary-500 text-white shadow-lg shadow-primary-500/30"><s.icon className="h-5 w-5" /></span>
                <p className="text-sm font-semibold text-primary-600 dark:text-primary-300">Step {i + 1}</p>
                <h2 className="font-display text-2xl font-semibold">{s.name}</h2>
                <p className="mt-2 text-muted">{s.text}</p>
                <ul className="mt-4 grid gap-2 text-sm">{DETAIL[s.id].map((d) => <li key={d} className="rounded-xl border border-line bg-surface px-4 py-2.5">{d}</li>)}</ul>
              </div>
            </Reveal>
          ))}
        </div>
      </Section>
      <CtaBand />
    </>
  );
}
