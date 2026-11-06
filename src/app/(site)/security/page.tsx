import type { Metadata } from "next";
import { KeyRound, Lock, ScrollText, Server, ShieldCheck, Timer } from "lucide-react";
import { PageHero, Section } from "@/components/site/page-hero";

export const metadata: Metadata = { title: "Security", description: "How Velaroute protects your data." };

const ITEMS = [
  { i: Lock, t: "Encryption", d: "TLS for all traffic. Integration secrets are encrypted at rest with AES-256-GCM before they are stored." },
  { i: KeyRound, t: "API keys", d: "Keys are shown once and stored only as SHA-256 hashes, with per-key scopes and rate limits. Revoke at any time." },
  { i: ShieldCheck, t: "Signed webhooks", d: "Every webhook carries an HMAC-SHA256 signature over a timestamp and the body, so you can reject forgeries and replays." },
  { i: ScrollText, t: "Audit log", d: "Settings changes, routing edits, key creation and integration changes are recorded with who and when." },
  { i: Server, t: "Data minimisation", d: "Spam is blocked before enrichment, enrichment is cached per domain, and you choose which providers run." },
  { i: Timer, t: "Monitoring", d: "Storage, pipeline, routing, SLA, API and MCP are health-checked continuously, with results on the public status page." },
];

export default function SecurityPage() {
  return (
    <>
      <PageHero eyebrow="Security" title={<>Security is a <span className="text-gradient">feature</span></>}>Velaroute handles your buyers' contact details and your CRM credentials. Here is how we protect them.</PageHero>
      <Section className="!pt-0">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {ITEMS.map((x) => <div key={x.t} className="card p-6"><x.i className="h-6 w-6 text-primary-500" /><h2 className="mt-3 font-display text-lg font-semibold">{x.t}</h2><p className="mt-2 text-sm text-muted">{x.d}</p></div>)}
        </div>
        <p className="mx-auto mt-10 max-w-2xl text-center text-sm text-muted">Velaroute does not yet hold a SOC 2 report. Found a vulnerability? Please report it through the <a className="text-primary-600 underline dark:text-primary-300" href="/contact">contact form</a> with “Security” in the message.</p>
      </Section>
    </>
  );
}
