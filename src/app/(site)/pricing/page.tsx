import type { Metadata } from "next";
import { Check, Minus } from "lucide-react";
import { PageHero, Section, SectionTitle } from "@/components/site/page-hero";
import { CtaBand } from "@/components/site/cta";
import { FAQ } from "@/content/marketing";
import { Plans } from "./plans";

export const metadata: Metadata = { title: "Pricing", description: "Velaroute pricing: Starter $99, Growth $249, Scale $499 per month. Save 20% annually. 14-day free trial." };

const ROWS: [string, boolean | string, boolean | string, boolean | string][] = [
  ["Reps", "3", "15", "50"],
  ["Leads per month", "500", "2,500", "10,000"],
  ["Branching forms, chat, email-to-lead", true, true, true],
  ["Bot & spam guard", true, true, true],
  ["Round robin & book on submit", true, true, true],
  ["REST API & signed webhooks", true, true, true],
  ["Enrichment waterfall with spend caps", false, true, true],
  ["Territory rules & ICP scoring", false, true, true],
  ["SLA escalation & auto re-route", false, true, true],
  ["AI Copilot (bring your own key)", false, true, true],
  ["MCP server", false, true, true],
  ["Salesforce sync", false, false, true],
  ["Audit log & role permissions", false, false, true],
  ["Priority support & onboarding", false, false, true],
];

export default function PricingPage() {
  return (
    <>
      <PageHero eyebrow="Pricing" title={<>Priced for teams of <span className="text-gradient">3 to 50 reps</span></>}>Every plan includes a 14-day free trial and sandbox mode. Bring your own Apollo, Clay, Valyu and AI keys — you pay providers directly, at cost.</PageHero>
      <Section className="!pt-0"><Plans /></Section>
      <Section className="!pt-0">
        <SectionTitle title="Compare plans" />
        <div className="mt-10 overflow-x-auto rounded-3xl border border-line bg-surface">
          <table className="w-full min-w-[560px] text-sm">
            <thead><tr className="border-b border-line text-left"><th className="p-4 font-medium text-muted">Feature</th>{["Starter", "Growth", "Scale"].map((h) => <th key={h} className="p-4 text-center font-semibold">{h}</th>)}</tr></thead>
            <tbody>{ROWS.map(([f, ...c]) => (
              <tr key={f} className="border-b border-line last:border-0"><td className="p-4">{f}</td>{c.map((v, i) => <td key={i} className="p-4 text-center">{v === true ? <Check className="mx-auto h-4 w-4 text-primary-500" aria-label="Included" /> : v === false ? <Minus className="mx-auto h-4 w-4 text-faint" aria-label="Not included" /> : <span className="font-medium">{v}</span>}</td>)}</tr>
            ))}</tbody>
          </table>
        </div>
      </Section>
      <Section className="!pt-0">
        <SectionTitle title="Pricing questions" />
        <div className="mx-auto mt-10 grid max-w-5xl gap-4 md:grid-cols-2">
          {[{ q: "What counts as a lead?", a: "Any submission that passes the guard. Spam and blocked submissions are free and never count toward your limit." }, { q: "What if we go over?", a: "We never cut off routing. You will get an email at 80% and 100%; if you stay over for two months we will suggest the next plan." }, { q: "Do you charge for enrichment?", a: "No markup. Enrichment and AI use your own provider keys, and the spend cap stops calls before you overspend." }, ...FAQ.slice(5)].map((f) => (
            <div key={f.q} className="card p-6"><h3 className="font-semibold">{f.q}</h3><p className="mt-2 text-sm text-muted">{f.a}</p></div>
          ))}
        </div>
      </Section>
      <CtaBand />
    </>
  );
}
