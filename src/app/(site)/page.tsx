import Link from "next/link";
import type { Metadata } from "next";
import { ArrowRight, Check, Play } from "lucide-react";
import { buttonClass } from "@/components/button-class";
import { CountUp, Marquee, Reveal } from "@/components/site/motion";
import { HeroPreview } from "@/components/site/hero-preview";
import { PipelineFlow } from "@/components/site/pipeline";
import { Section, SectionTitle } from "@/components/site/page-hero";
import { CtaBand } from "@/components/site/cta";
import { FAQ, FEATURES, INTEGRATIONS, STATS, TIERS } from "@/content/marketing";

export const metadata: Metadata = { title: "Velaroute — the agentic inbound engine", description: "Every inbound lead guarded, enriched, routed to the right rep, booked and followed up in minutes. From $99/month." };

export default function Home() {
  return (
    <>
      <section className="overflow-hidden bg-bg">
        <div className="mx-auto max-w-7xl px-5 pb-16 pt-12 sm:px-8 sm:pt-20">
          <Reveal className="mx-auto max-w-4xl text-center">
            <Link href="/changelog" className="inline-flex max-w-full items-center gap-2 rounded-full border border-line bg-surface-2 px-3 py-1.5 text-xs font-medium text-muted hover:text-primary-600">
              <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-primary-500" /><span className="truncate">MCP server &amp; SLA auto re-routing</span><ArrowRight className="h-3.5 w-3.5 shrink-0" />
            </Link>
            <h1 className="mt-7 text-balance font-display text-[3.1rem] leading-[1.08] tracking-tight sm:text-[4.75rem] lg:text-[5.4rem]">
              Every lead.<br />A <span className="text-primary-500">clear next step.</span>
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-pretty text-lg leading-relaxed text-muted">Capture, qualify and route inbound leads in one workspace. Get the right person on the next conversation, with every decision explained.</p>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link href="/signup" className={buttonClass("primary", "lg", "w-full sm:w-auto")}>Start free for 14 days<ArrowRight className="h-4 w-4" /></Link>
              <Link href="/login?demo=1" className={buttonClass("secondary", "lg", "w-full sm:w-auto")}><Play className="h-4 w-4" />Open the live demo</Link>
            </div>
            <ul className="mt-6 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-xs text-muted">
              {["No card required", "Sandbox mode, no API keys needed", "Set up in an afternoon"].map((t) => <li key={t} className="inline-flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-primary-500" />{t}</li>)}
            </ul>
          </Reveal>
          <Reveal delay={0.15} className="mt-12 sm:mt-14"><HeroPreview /></Reveal>
        </div>
      </section>

      <section className="py-10" aria-label="Integrations">
        <p className="mb-5 text-center text-sm font-medium text-faint">Plugs into the stack you already run</p>
        <Marquee items={INTEGRATIONS} />
      </section>

      <Section>
        <div className="grid gap-5 md:grid-cols-3">
          {STATS.map((s, i) => (
            <Reveal key={s.label} delay={i * 0.08} className="card p-6">
              <p className="font-display text-5xl font-semibold tracking-tight text-ink"><CountUp to={s.value} prefix={s.prefix} suffix={s.suffix} /></p>
              <p className="mt-3 text-muted">{s.label}</p>
              <a href={s.href} className="mt-3 inline-block text-xs text-faint underline-offset-2 hover:underline" target={s.href.startsWith("http") ? "_blank" : undefined} rel="noreferrer">Source: {s.src}</a>
            </Reveal>
          ))}
        </div>
      </Section>

      <Section className="!pt-0">
        <SectionTitle eyebrow="The pipeline" title={<>Eight agents. <span className="editorial-emphasis">One trace.</span></>} sub="Each step is a small, testable agent with a single job. Hover a stage to see what it did for a sample lead." />
        <Reveal className="mt-12"><PipelineFlow /></Reveal>
        <div className="mt-8 text-center"><Link href="/how-it-works" className="inline-flex items-center gap-1.5 font-medium text-primary-600 hover:underline dark:text-primary-300">See how each agent works<ArrowRight className="h-4 w-4" /></Link></div>
      </Section>

      <Section>
        <SectionTitle eyebrow="Platform" title="Everything inbound, in one place" sub="Capture to closed loop, without stitching five tools together." />
        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.slice(0, 6).map((f, i) => (
            <Reveal key={f.title} delay={(i % 3) * 0.06} className="card group p-6 sm:p-7">
              <span className={`feature-icon grid h-9 w-9 place-items-center ${f.tone}`}><f.icon className="h-5 w-5" /></span>
              <h3 className="mt-4 font-display text-lg font-semibold">{f.title}</h3>
              <p className="mt-2 text-sm text-muted">{f.text}</p>
            </Reveal>
          ))}
        </div>
      </Section>

      <Section>
        <div className="grid items-center gap-10 lg:grid-cols-2">
          <Reveal>
            <SectionTitle center={false} eyebrow="Explainable by default" title="Know exactly why a lead went where it did" sub="Every lead carries a step-by-step trace: the guard score, what enrichment cost, which rule matched, why a rep was skipped and when the SLA clock started. No more “why did Jonas get this?” threads." />
            <ul className="mt-6 space-y-3 text-sm">
              {["Rule matches with the exact conditions that fired", "Round-robin decisions, including skipped reps and why", "Enrichment provider, cache hits and cost per lead", "SLA warnings, breaches and re-routes"].map((t) => <li key={t} className="flex gap-2"><Check className="mt-0.5 h-4 w-4 shrink-0 text-primary-500" />{t}</li>)}
            </ul>
          </Reveal>
          <Reveal delay={0.1}>
            <div className="overflow-hidden rounded-xl border border-line bg-[#17191c] p-5 font-mono text-[12.5px] leading-6 text-[#e9edf2] shadow-2xl">
              <p className="text-[#9aa3af]">{"// trace · lead_8f2k · Maya Brooks"}</p>
              {[["guard", "risk 0 · pass · 41s fill time"], ["enrich", "apollo · 75 emp · DE · $0.05"], ["match", "kestrel.ai · no owner"], ["icp", "score 82 · SaaS, 51–200, EMEA"], ["route", "rule “EMEA territory”"], ["  rr", "skip Liam (away) → Jonas"], ["book", "Thu 14:30 Europe/Berlin"], ["crm", "hubspot.upsert contact ✓"], ["sla", "first touch due 14:05:12"]].map(([k, v]) => (
                <p key={k} className="truncate"><span className="text-[#fda27f]">{k.padEnd(7, " ")}</span><span className="text-[#9aa3af]">→ </span>{v}</p>
              ))}
            </div>
          </Reveal>
        </div>
      </Section>

      <Section>
        <SectionTitle eyebrow="Pricing" title="Flat, honest pricing" sub="Start at $99/month. No per-seat surprises, no annual lock-in." />
        <div className="mt-12 grid gap-5 lg:grid-cols-3">
          {TIERS.map((t, i) => (
            <Reveal key={t.id} delay={i * 0.06} className={`card relative flex flex-col p-6 ${t.highlight ? "ring-2 ring-primary-400" : ""}`}>
              {t.highlight && <span className="absolute -top-3 left-6 rounded-full bg-primary-500 px-3 py-1 text-xs font-semibold text-white">Most popular</span>}
              <h3 className="font-display text-xl font-semibold">{t.name}</h3>
              <p className="mt-1 text-sm text-muted">{t.blurb}</p>
              <p className="mt-5"><span className="font-display text-4xl font-semibold">${t.monthly}</span><span className="text-muted">/month</span></p>
              <p className="mt-1 text-xs text-faint">{t.limits}</p>
              <Link href="/pricing" className={buttonClass(t.highlight ? "primary" : "secondary", "md", "mt-6")}>Compare plans</Link>
            </Reveal>
          ))}
        </div>
      </Section>

      <Section>
        <SectionTitle eyebrow="FAQ" title="Questions, answered" />
        <div className="mx-auto mt-10 max-w-3xl divide-y divide-line rounded-xl border border-line bg-surface">
          {FAQ.map((f) => (
            <details key={f.q} className="group p-5 [&_summary::-webkit-details-marker]:hidden">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-medium">{f.q}<span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-surface-2 text-muted transition-transform group-open:rotate-45">+</span></summary>
              <p className="mt-3 text-muted">{f.a}</p>
            </details>
          ))}
        </div>
      </Section>

      <CtaBand />
    </>
  );
}
