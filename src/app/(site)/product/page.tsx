import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Check } from "lucide-react";
import { PageHero, Section, SectionTitle } from "@/components/site/page-hero";
import { Reveal } from "@/components/site/motion";
import { CtaBand } from "@/components/site/cta";
import { buttonClass } from "@/components/button-class";
import { FEATURES } from "@/content/marketing";

export const metadata: Metadata = { title: "Product", description: "Forms, guard, enrichment, routing, booking, CRM sync, SLA agent, Copilot, API and MCP — the full Velaroute platform." };

const DEEP = [
  { k: "Capture", t: "One queue for every inbound channel", d: "Build multi-step forms with branching logic in a visual builder, embed them with one line, or keep your existing forms and post to the API. The chat widget and email-to-lead address feed the same pipeline.", pts: ["Show/skip steps based on answers", "Hosted pages, iframe embed and JS snippet", "Website chat and inbound email capture", "Hidden fields for UTM and source"] },
  { k: "Qualify", t: "Spend money only on real buyers", d: "The guard scores every submission for bot and spam risk before enrichment runs. Enrichment then runs as a waterfall — Apollo, then Clay, then Valyu — stopping at the first good answer, caching by domain and respecting your caps.", pts: ["Honeypot, fill-time and disposable-domain checks", "Per-lead and monthly spend caps", "Domain cache so repeat companies are free", "Spend ledger per provider and lead"] },
  { k: "Route", t: "Rules you can read, fairness you can prove", d: "Write routing rules on country, region, company size, industry, ICP score or any form answer. Matched rules feed a weighted round robin that respects working hours, capacity and away status. Existing account owners always keep their accounts.", pts: ["Account matching & duplicate merge", "Weighted round robin with capacity limits", "Route tester that dry-runs any lead", "Fairness chart by rep"] },
  { k: "Convert", t: "Book the meeting while intent is highest", d: "Qualified leads see the assigned rep's open slots right after submit. Meetings, owners and contacts are written back to your CRM, and a 5-minute SLA clock starts for every lead that did not book.", pts: ["Rep calendars with working hours and time zones", "HubSpot, Attio and Salesforce write-back", "SLA warnings, breach alerts and auto re-route", "Copilot reply drafts and next best action"] },
];

export default function ProductPage() {
  return (
    <>
      <PageHero eyebrow="Product" title={<>The whole inbound motion, <span className="editorial-emphasis">automated</span></>}>
        Velaroute replaces the form tool, the router, the scheduler and the spreadsheet that tracks who followed up. One pipeline, one trace, one bill.
        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row"><Link href="/signup" className={buttonClass("primary", "lg")}>Start free</Link><Link href="/login?demo=1" className={buttonClass("secondary", "lg")}>Open the demo</Link></div>
      </PageHero>
      {DEEP.map((s, i) => (
        <Section key={s.k} className="!py-12">
          <Reveal className={`grid items-center gap-10 lg:grid-cols-2 ${i % 2 ? "lg:[&>*:first-child]:order-2" : ""}`}>
            <div>
              <p className="text-sm font-semibold uppercase tracking-wider text-primary-600 dark:text-primary-300">{s.k}</p>
              <h2 className="mt-3 font-display text-3xl font-semibold tracking-tight sm:text-4xl">{s.t}</h2>
              <p className="mt-4 text-lg text-muted">{s.d}</p>
            </div>
            <ul className="card grid gap-4 p-6 sm:p-8">
              {s.pts.map((p) => <li key={p} className="flex gap-3"><span className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full bg-primary-100 text-primary-700 dark:bg-primary-500/20 dark:text-primary-200"><Check className="h-3.5 w-3.5" /></span><span>{p}</span></li>)}
            </ul>
          </Reveal>
        </Section>
      ))}
      <Section>
        <SectionTitle eyebrow="All features" title="Built for the way small GTM teams work" />
        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map((f, i) => (
            <Reveal key={f.title} delay={(i % 4) * 0.05} className="card p-5">
              <span className={`grid h-10 w-10 place-items-center rounded-xl ${f.tone}`}><f.icon className="h-5 w-5" /></span>
              <h3 className="mt-3 font-semibold">{f.title}</h3>
              <p className="mt-1.5 text-sm text-muted">{f.text}</p>
            </Reveal>
          ))}
        </div>
        <div className="mt-10 text-center"><Link href="/docs" className="inline-flex items-center gap-1.5 font-medium text-primary-600 hover:underline dark:text-primary-300">Read the docs<ArrowRight className="h-4 w-4" /></Link></div>
      </Section>
      <CtaBand />
    </>
  );
}
