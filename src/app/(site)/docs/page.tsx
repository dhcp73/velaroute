import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, BookOpen, Code2 } from "lucide-react";
import { allDocs } from "@/lib/docs";

export const metadata: Metadata = { title: "Docs", description: "Guides for setting up Velaroute: routing, enrichment, SLA, integrations, API, webhooks and MCP." };

export default function DocsIndex() {
  const docs = allDocs();
  return (
    <div>
      <p className="text-sm font-semibold uppercase tracking-wider text-primary-600 dark:text-primary-300">Documentation</p>
      <h1 className="mt-2 font-display text-4xl font-semibold tracking-tight">Velaroute docs</h1>
      <p className="mt-3 max-w-2xl text-lg text-muted">Everything you need to capture, qualify, route and follow up on inbound leads — and to plug Velaroute into your own systems and agents.</p>
      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        <Link href="/docs/getting-started" className="card group flex items-start gap-4 p-6 hover:ring-2 hover:ring-primary-300"><BookOpen className="h-6 w-6 shrink-0 text-primary-500" /><div><h2 className="font-semibold">Start here</h2><p className="mt-1 text-sm text-muted">Route and book your first lead in ten minutes.</p></div></Link>
        {/* Hard navigation on purpose: the OpenAPI explorer must load as a full page. */}
        {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
        <a href="/docs/api" className="card group flex items-start gap-4 p-6 hover:ring-2 hover:ring-primary-300"><Code2 className="h-6 w-6 shrink-0 text-primary-500" /><div><h2 className="font-semibold">API reference</h2><p className="mt-1 text-sm text-muted">Interactive OpenAPI 3.1 explorer.</p></div></a>
      </div>
      <h2 className="mt-12 font-display text-2xl font-semibold">Guides</h2>
      <ul className="mt-4 divide-y divide-line rounded-3xl border border-line bg-surface">
        {docs.map((d) => <li key={d.slug}><Link href={`/docs/${d.slug}`} className="flex items-center justify-between gap-4 p-5 hover:bg-surface-2"><div className="min-w-0"><p className="font-medium">{d.title}</p><p className="truncate text-sm text-muted">{d.description}</p></div><ArrowRight className="h-4 w-4 shrink-0 text-faint" /></Link></li>)}
      </ul>
    </div>
  );
}
