"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/cn";

export function DocsNav({ items }: { items: { slug: string; title: string }[] }) {
  const path = usePathname();
  const router = useRouter();
  const all = [{ href: "/docs", title: "Overview" }, ...items.map((i) => ({ href: `/docs/${i.slug}`, title: i.title })), { href: "/docs/api", title: "API reference ↗" }];
  return (
    <>
      <label className="mb-6 block lg:hidden"><span className="sr-only">Docs section</span>
        <select className="input" value={all.find((a) => a.href === path)?.href ?? "/docs"} onChange={(e) => (e.target.value === "/docs/api" ? (window.location.href = "/docs/api") : router.push(e.target.value))}>{all.map((a) => <option key={a.href} value={a.href}>{a.title}</option>)}</select>
      </label>
      <nav className="sticky top-24 hidden lg:block" aria-label="Docs">
        <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-faint">Documentation</p>
        <ul className="space-y-1">{all.map((a) => <li key={a.href}><Link prefetch={a.href === "/docs/api" ? false : undefined} replace={false} href={a.href} aria-current={path === a.href ? "page" : undefined} className={cn("block rounded-xl px-3 py-2 text-sm transition-colors", path === a.href ? "bg-primary-100 font-medium text-primary-800 dark:bg-primary-500/15 dark:text-primary-100" : "text-muted hover:bg-surface-2 hover:text-ink")}>{a.title}</Link></li>)}</ul>
      </nav>
    </>
  );
}
