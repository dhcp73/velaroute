import type { Metadata } from "next";
import { PageHero, Section } from "@/components/site/page-hero";
import { Reveal } from "@/components/site/motion";
import { CtaBand } from "@/components/site/cta";

export const metadata: Metadata = { title: "About", description: "Why Velaroute exists, and the principles we build by." };

const VALUES = [
  { t: "Show the working", d: "Every automated decision gets a trace a human can read. If we can't explain it, we don't ship it." },
  { t: "Spend like it's ours", d: "Enrichment and AI calls cost real money. Caps, caches and guards come before any paid call." },
  { t: "Small teams first", d: "Our customers have 3 to 50 reps. Setup takes an afternoon, pricing fits on one line." },
  { t: "Agents with jobs", d: "We build small agents with one responsibility each, not one black box that does everything." },
];

export default function AboutPage() {
  return (
    <>
      <PageHero eyebrow="About" title={<>A <span className="text-gradient">vela</span> catches the wind. A route gets you there.</>}>Velaroute exists so that no good lead waits — and nobody has to guess why it went where it went.</PageHero>
      <Section className="!pt-0">
        <Reveal className="prose prose-lg mx-auto max-w-3xl dark:prose-invert">
          <h2>The founding story</h2>
          <p>Velaroute started with a simple, slightly embarrassing observation: most B2B teams we looked at were far better at generating inbound demand than at answering it. Demo requests arrived in a shared inbox. Someone assigned them by hand, or by a round-robin sheet that drifted out of date. Enrichment ran on every submission — including the bots. And when a lead went cold, nobody could say whether it was routed wrong, routed late or never routed at all.</p>
          <p>The tools that fix this exist, but they were built for large revenue organisations: annual contracts, implementation partners and per-seat pricing that a ten-rep team can't justify. Smaller teams stitch together a form tool, a scheduler, a Zap and a Slack channel, and hope.</p>
          <p>We think agents change the shape of the problem. Not one giant AI that &ldquo;handles inbound&rdquo;, but a pipeline of small, testable agents — a guard, an enricher, a matcher, a router, a booker, a CRM writer and an SLA watcher — each with a single job and a written trace. Put them in one product, price it for teams of 3 to 50 reps, and make every decision explainable.</p>
          <p>That's Velaroute. The name comes from <em>vela</em>, Latin for sail, and <em>route</em>: catch the moment a buyer raises their hand, and get them to the right person before it passes.</p>
          <p>Velaroute was designed and built by <a href="https://github.com/rahulpatel84" target="_blank" rel="noreferrer">Rahul Patel</a>.</p>
        </Reveal>
      </Section>
      <Section className="!pt-0">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {VALUES.map((v, i) => <Reveal key={v.t} delay={i * 0.05} className="card p-6"><h3 className="font-display text-lg font-semibold">{v.t}</h3><p className="mt-2 text-sm text-muted">{v.d}</p></Reveal>)}
        </div>
      </Section>
      <CtaBand />
    </>
  );
}
