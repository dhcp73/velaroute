import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { marked } from "marked";
import { ArrowLeft } from "lucide-react";
import { POSTS } from "@/content/blog";
import { CtaBand } from "@/components/site/cta";

type P = { params: Promise<{ slug: string }> };
export function generateStaticParams() { return POSTS.map((p) => ({ slug: p.slug })); }
export async function generateMetadata({ params }: P): Promise<Metadata> {
  const { slug } = await params;
  const p = POSTS.find((x) => x.slug === slug);
  return p ? { title: p.title, description: p.excerpt } : {};
}

export default async function PostPage({ params }: P) {
  const { slug } = await params;
  const post = POSTS.find((x) => x.slug === slug);
  if (!post) notFound();
  const html = marked.parse(post.body, { async: false });
  return (
    <>
      <article className="mx-auto max-w-3xl px-5 pb-16 pt-12 sm:px-8 sm:pt-20">
        <Link href="/blog" className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-ink"><ArrowLeft className="h-4 w-4" />All posts</Link>
        <p className="mt-8 text-sm font-medium text-primary-600 dark:text-primary-300">{post.tag} · {post.read} read</p>
        <h1 className="mt-3 text-balance font-display text-4xl font-semibold tracking-tight sm:text-5xl">{post.title}</h1>
        <p className="mt-4 text-sm text-muted">{new Date(post.date).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })} · Velaroute team</p>
        <div className="prose prose-lg mt-10 max-w-none dark:prose-invert prose-a:text-primary-600 dark:prose-a:text-primary-300 prose-table:block prose-table:overflow-x-auto" dangerouslySetInnerHTML={{ __html: html }} />
      </article>
      <CtaBand />
    </>
  );
}
