import type { Metadata } from "next";
import { Mail, MessageCircle, Zap } from "lucide-react";
import { PageHero, Section } from "@/components/site/page-hero";
import { HostedForm } from "@/components/hosted-form";
import { loadWorkspace } from "@/lib/server/store";

export const metadata: Metadata = { title: "Contact", description: "Talk to the Velaroute team. This form is routed by Velaroute itself." };
export const dynamic = "force-dynamic";

export default function ContactPage() {
  const form = loadWorkspace("ws_demo").forms.find((f) => f.slug === "contact-sales");
  return (
    <>
      <PageHero eyebrow="Contact" title={<>Talk to a <span className="text-gradient">human</span></>}>Questions about pricing, a design partnership or a security review? This form is routed by Velaroute itself — so you&apos;ll see the product working as you send it.</PageHero>
      <Section className="!pt-0">
        <div className="mx-auto grid max-w-5xl gap-8 lg:grid-cols-[1fr_1.3fr]">
          <div className="space-y-4">
            {[{ i: Zap, t: "Instant routing", d: "Your message is guarded, enriched and routed to the right person in under a second." }, { i: MessageCircle, t: "Prefer chat?", d: "Use the chat bubble in the corner — it goes through the same pipeline." }, { i: Mail, t: "Security & privacy", d: "Ask for our security overview or a signable DPA — just say so in your message." }].map((x) => (
              <div key={x.t} className="card flex gap-4 p-5"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary-100 text-primary-700 dark:bg-primary-500/15 dark:text-primary-200"><x.i className="h-5 w-5" /></span><div><h2 className="font-semibold">{x.t}</h2><p className="mt-1 text-sm text-muted">{x.d}</p></div></div>
            ))}
          </div>
          <div className="card p-6 sm:p-8">{form ? <HostedForm form={form} wid="ws_demo" /> : <p>The contact form is unavailable right now.</p>}</div>
        </div>
      </Section>
    </>
  );
}
