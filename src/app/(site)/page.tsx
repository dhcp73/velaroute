import Link from "next/link";
import type { Metadata } from "next";
import { ArrowRight, Check, Play } from "lucide-react";
import { buttonClass } from "@/components/button-class";
import { CountUp, Marquee, Orbs, Reveal } from "@/components/site/motion";
import { HeroPreview } from "@/components/site/hero-preview";
import { PipelineFlow } from "@/components/site/pipeline";
import { Section, SectionTitle } from "@/components/site/page-hero";
import { CtaBand } from "@/components/site/cta";
import { FAQ, FEATURES, INTEGRATIONS, STATS, TIERS } from "@/content/marketing";

export const metadata: Metadata = { title: "Velaroute — the agentic inbound engine", description: "Every inbound lead guarded, enriched, routed to the right rep, booked and followed up in minutes. From $99/month." };

export default function Home() {
  return (
    <>
      <section className="relative overflow-hidden">
        <div className="bg-grid absolute inset-0 [mask-image:radial-gradient(ellipse_at_top,black_35%,transparent_75%)]" aria-hidden />
        <Orbs />
        <div className="relative mx-auto max-w-7xl px-5 pb-16 pt-14 sm:px-8 sm:pt-24">
          <Reveal className="mx-auto max-w-4xl text-center">
            <Link href="/changelog" className="mx-auto inline-flex max-w-full items-center gap-2 rounded-full border border-line bg-surface/70 py-1 pl-1 pr-3 text-xs font-medium text-muted backdrop-blur hover:text-ink">
              <span className="rounded-full bg-primary-500 px-2 py-0.5 text-white">New</span><span className="truncate">MCP server & SLA auto re-routing</span><ArrowRight className="h-3.5 w-3.5 shrink-0" />
            </Link>
            <h1 className="mt-6 text-balance font-display text-[2.6rem] font-semibold leading-[1.05] tracking-tight sm:text-7xl">
              Every inbound lead, to the <span className="text-gradient">right rep</span>, in minutes.
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-pretty text-lg text-muted sm:text-xl">Velaroute is the agentic inbound engine for B2B SaaS teams. It guards, enriches, matches, routes, books and follows up on every lead — and shows its working at every step.</p>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link href="/signup" className={buttonClass("primary", "lg", "w-full sm:w-auto")}>Start free for 14 days<ArrowRight className="h-4 w-4" /></Link>
              <Link href="/login?demo=1" className={buttonClass("secondary", "lg", "w-full sm:w-auto")}><Play className="h-4 w-4" />Open the live demo</Link>
            </div>
            <ul className="mt-6 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-sm text-muted">
              {["No card required", "Sandbox mode, no API keys needed", "Set up in an afternoon"].map((t) => <li key={t} className="inline-flex items-center gap-1.5"><Check className="h-4 w-4 text-emerald-500" />{t}</li>)}
            </ul>
          </Reveal>
          <Reveal delay={0.15} className="mt-14 sm:mt-20"><HeroPreview /></Reveal>
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
              <p className="font-display text-5xl font-semibold tracking-tight text-gradient"><CountUp to={s.value} prefix={s.prefix} suffix={s.suffix} /></p>
              <p className="mt-3 text-muted">{s.label}</p>
              <a href={s.href} className="mt-3 inline-block text-xs text-faint underline-offset-2 hover:underline" target={s.href.startsWith("http") ? "_blank" : undefined} rel="noreferrer">Source: {s.src}</a>
            </Reveal>
          ))}
        </div>
      </Section>

      <Section className="!pt-0">
        <SectionTitle eyebrow="The pipeline" title={<>Eight agents. <span className="text-gradient">One trace.</span></>} sub="Each step is a small, testable agent with a single job. Hover a stage to see what it did for a real lead." />
        <Reveal className="mt-12"><PipelineFlow /></Reveal>
        <div className="mt-8 text-center"><Link href="/how-it-works" className="inline-flex items-center gap-1.5 font-medium text-primary-600 hover:underline dark:text-primary-300">See how each agent works<ArrowRight className="h-4 w-4" /></Link></div>
      </Section>

      <Section>
        <SectionTitle eyebrow="Platform" title="Everything inbound, in one place" sub="Capture to closed loop, without stitching five tools together." />
        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.slice(0, 9).map((f, i) => (
            <Reveal key={f.title} delay={(i % 3) * 0.06} className="card group p-6 transition-transform duration-300 hover:-translate-y-1">
              <span className={`grid h-11 w-11 place-items-center rounded-2xl ${f.tone}`}><f.icon className="h-5 w-5" /></span>
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
              {["Rule matches with the exact conditions that fired", "Round-robin decisions, including skipped reps and why", "Enrichment provider, cache hits and cost per lead", "SLA warnings, breaches and re-routes"].map((t) => <li key={t} className="flex gap-2"><Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />{t}</li>)}
            </ul>
          </Reveal>
          <Reveal delay={0.1}>
            <div className="overflow-hidden rounded-3xl border border-line bg-[#12131f] p-5 font-mono text-[12.5px] leading-6 text-[#cfd3ff] shadow-2xl">
              <p className="text-[#7d82b0]">{"// trace · lead_8f2k · Maya Brooks"}</p>
              {[["guard", "risk 0 · pass · 41s fill time"], ["enrich", "apollo · 75 emp · DE · $0.05"], ["match", "kestrel.ai · no owner"], ["icp", "score 82 · SaaS, 51–200, EMEA"], ["route", "rule “EMEA territory”"], ["  rr", "skip Liam (away) → Jonas"], ["book", "Thu 14:30 Europe/Berlin"], ["crm", "hubspot.upsert contact ✓"], ["sla", "first touch due 14:05:12"]].map(([k, v]) => (
                <p key={k} className="truncate"><span className="text-[#9b8cff]">{k.padEnd(7, " ")}</span><span className="text-[#7d82b0]">→ </span>{v}</p>
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
        <div className="mx-auto mt-10 max-w-3xl divide-y divide-line rounded-3xl border border-line bg-surface">
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
