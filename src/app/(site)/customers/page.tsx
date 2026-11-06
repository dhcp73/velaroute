import type { Metadata } from "next";
import { Building, Rocket, Users, Workflow } from "lucide-react";
import { PageHero, Section, SectionTitle } from "@/components/site/page-hero";
import { Reveal } from "@/components/site/motion";
import { CtaBand } from "@/components/site/cta";

export const metadata: Metadata = { title: "Use cases", description: "How founder-led teams, SDR teams, RevOps and product-led companies use Velaroute." };

const CASES = [
  { icon: Rocket, who: "Founder-led sales", team: "1–3 sellers", pain: "Demo requests sit in a shared inbox until someone has a gap between calls.", how: ["Book-on-submit straight onto the founder's calendar", "Guard filters agency pitches and spam", "Copilot drafts the first reply from the form answers"], result: "Buyers book while they are still on your site." },
  { icon: Users, who: "SDR teams", team: "5–20 reps", pain: "Round robin in a spreadsheet, cherry-picking, and leads that nobody touched for a day.", how: ["Weighted round robin with capacity and away status", "5-minute SLA with Slack alerts", "Auto re-route when a rep misses the window"], result: "Every lead has an owner and a clock from second one." },
  { icon: Workflow, who: "RevOps", team: "Multi-team inbound", pain: "Territory logic lives in five tools and nobody can explain why a lead went where it did.", how: ["Readable rules on geo, size, industry and ICP score", "Account matching keeps owners on their accounts", "Full routing trace and CRM sync log"], result: "One place to change territories, and an answer to every “why”." },
  { icon: Building, who: "Product-led growth", team: "Self-serve + sales assist", pain: "High-intent signups from good accounts look the same as students and tyre-kickers.", how: ["Signup webhook → enrichment with a spend cap", "ICP score separates sales-assist from self-serve", "MCP tools let your own agents query and route leads"], result: "Sales spends time on the accounts that can buy." },
];

export default function CustomersPage() {
  return (
    <>
      <PageHero eyebrow="Use cases" title={<>Made for teams that <span className="text-gradient">can&apos;t afford slow</span></>}>Velaroute is built for B2B SaaS companies with 3 to 50 reps — big enough to need routing, too small for a six-month enterprise rollout.</PageHero>
      <Section className="!pt-0">
        <div className="grid gap-5 md:grid-cols-2">
          {CASES.map((c, i) => (
            <Reveal key={c.who} delay={(i % 2) * 0.06} className="card flex flex-col p-6 sm:p-8">
              <div className="flex items-center gap-3"><span className="grid h-11 w-11 place-items-center rounded-2xl bg-primary-100 text-primary-700 dark:bg-primary-500/15 dark:text-primary-200"><c.icon className="h-5 w-5" /></span><div><h2 className="font-display text-xl font-semibold">{c.who}</h2><p className="text-sm text-muted">{c.team}</p></div></div>
              <p className="mt-5 text-muted"><span className="font-medium text-ink">The problem: </span>{c.pain}</p>
              <ul className="mt-4 space-y-2 text-sm">{c.how.map((h) => <li key={h} className="rounded-xl bg-surface-2 px-3 py-2">{h}</li>)}</ul>
              <p className="mt-5 font-medium text-primary-700 dark:text-primary-200">{c.result}</p>
            </Reveal>
          ))}
        </div>
      </Section>
      <Section className="!pt-0">
        <SectionTitle eyebrow="Design partners" title="We're onboarding our first teams" sub="Velaroute is new. Rather than invent logos, we're working closely with a small group of design partners who get founder-level support and locked-in pricing. If your team has 3–50 reps and an inbound problem, we'd like to talk." />
        <div className="mt-8 text-center"><a href="/contact" className="inline-flex h-12 items-center rounded-full bg-primary-500 px-6 font-semibold text-white hover:bg-primary-600">Become a design partner</a></div>
      </Section>
      <CtaBand />
    </>
  );
}
