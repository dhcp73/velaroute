import type { Metadata } from "next";
import { PageHero, Section } from "@/components/site/page-hero";

export const metadata: Metadata = { title: "Careers", description: "Work on agentic inbound at Velaroute." };

const ROLES = [
  { t: "Founding Product Engineer", l: "Remote · Europe", d: "TypeScript, Next.js and agents. Own features end to end, from routing engine to UI." },
  { t: "Founding GTM Lead", l: "Remote · UK / EU", d: "Run our own inbound with our own product. Talk to every design partner." },
];

export default function CareersPage() {
  return (
    <>
      <PageHero eyebrow="Careers" title={<>Build the inbound engine <span className="text-gradient">small teams deserve</span></>}>We&apos;re a very small team. We hire slowly, pay fairly and write things down.</PageHero>
      <Section className="!pt-0">
        <div className="mx-auto grid max-w-3xl gap-4">
          {ROLES.map((r) => (
            <div key={r.t} className="card flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
              <div><h2 className="font-display text-xl font-semibold">{r.t}</h2><p className="text-sm text-muted">{r.l}</p><p className="mt-2 text-sm">{r.d}</p></div>
              <a href="/contact?topic=careers" className="inline-flex h-10 shrink-0 items-center justify-center rounded-full border border-line px-4 text-sm font-medium hover:bg-surface-2">Get in touch</a>
            </div>
          ))}
          <p className="mt-4 text-center text-sm text-muted">Don&apos;t see your role? We still want to hear from exceptional people. Use the contact form and tell us what you&apos;d build.</p>
        </div>
      </Section>
    </>
  );
}
