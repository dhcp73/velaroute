import type { Metadata } from "next";
import Link from "next/link";
import { PageHero, Section } from "@/components/site/page-hero";
import { POSTS } from "@/content/blog";

export const metadata: Metadata = { title: "Blog", description: "Notes on inbound, routing, enrichment and agentic GTM." };

export default function BlogIndex() {
  const [first, ...rest] = POSTS;
  return (
    <>
      <PageHero eyebrow="Blog" title="Notes on inbound">How we think about speed-to-lead, routing, enrichment and agents.</PageHero>
      <Section className="!pt-0">
        <Link href={`/blog/${first.slug}`} className="card group block p-6 transition-transform hover:-translate-y-1 sm:p-10">
          <p className="text-sm font-medium text-primary-600 dark:text-primary-300">{first.tag} · {first.read}</p>
          <h2 className="mt-2 font-display text-2xl font-semibold group-hover:underline sm:text-4xl">{first.title}</h2>
          <p className="mt-3 max-w-2xl text-muted">{first.excerpt}</p>
          <p className="mt-4 text-sm text-faint">{new Date(first.date).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}</p>
        </Link>
        <div className="mt-5 grid gap-5 md:grid-cols-2">
          {rest.map((p) => (
            <Link key={p.slug} href={`/blog/${p.slug}`} className="card group flex flex-col p-6 transition-transform hover:-translate-y-1">
              <p className="text-sm font-medium text-primary-600 dark:text-primary-300">{p.tag} · {p.read}</p>
              <h2 className="mt-2 font-display text-xl font-semibold group-hover:underline">{p.title}</h2>
              <p className="mt-2 flex-1 text-sm text-muted">{p.excerpt}</p>
              <p className="mt-4 text-sm text-faint">{new Date(p.date).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}</p>
            </Link>
          ))}
        </div>
      </Section>
    </>
  );
}
