import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { DOC_ORDER, getDoc } from "@/lib/docs";

type P = { params: Promise<{ slug: string }> };
export const dynamicParams = false;
export function generateStaticParams() { return DOC_ORDER.map((slug) => ({ slug })); }
export async function generateMetadata({ params }: P): Promise<Metadata> {
  const { slug } = await params;
  const d = getDoc(slug);
  return d ? { title: `${d.title} · Docs`, description: d.description } : {};
}

export default async function DocPage({ params }: P) {
  const { slug } = await params;
  const doc = getDoc(slug);
  if (!doc) notFound();
  const i = DOC_ORDER.indexOf(slug as (typeof DOC_ORDER)[number]);
  const prev = i > 0 ? getDoc(DOC_ORDER[i - 1]) : null;
  const next = i < DOC_ORDER.length - 1 ? getDoc(DOC_ORDER[i + 1]) : null;
  return (
    <div className="grid gap-10 xl:grid-cols-[minmax(0,1fr)_200px]">
      <article className="min-w-0">
        <h1 className="font-display text-4xl font-semibold tracking-tight">{doc.title}</h1>
        <p className="mt-3 text-lg text-muted">{doc.description}</p>
        <div className="prose mt-8 max-w-none dark:prose-invert prose-headings:scroll-mt-24 prose-a:text-primary-600 dark:prose-a:text-primary-300 prose-pre:overflow-x-auto prose-pre:rounded-lg prose-pre:bg-[#17191c] prose-table:block prose-table:overflow-x-auto prose-figcaption:text-center" dangerouslySetInnerHTML={{ __html: doc.html }} />
        <div className="mt-12 grid gap-3 border-t border-line pt-6 sm:grid-cols-2">
          {prev ? <Link href={`/docs/${prev.slug}`} className="card flex items-center gap-2 p-4 text-sm hover:bg-surface-2"><ArrowLeft className="h-4 w-4" /><span><span className="block text-faint">Previous</span>{prev.title}</span></Link> : <span />}
          {next && <Link href={`/docs/${next.slug}`} className="card flex items-center justify-end gap-2 p-4 text-right text-sm hover:bg-surface-2"><span><span className="block text-faint">Next</span>{next.title}</span><ArrowRight className="h-4 w-4" /></Link>}
        </div>
      </article>
      {doc.headings.length > 1 && (
        <nav className="sticky top-24 hidden h-fit xl:block" aria-label="On this page">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-faint">On this page</p>
          <ul className="space-y-2 text-sm">{doc.headings.map((h) => <li key={h.id}><a href={`#${h.id}`} className="text-muted hover:text-ink">{h.text}</a></li>)}</ul>
        </nav>
      )}
    </div>
  );
}
