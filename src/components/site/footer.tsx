import Link from "next/link";
import { Logo } from "@/components/logo";

const COLS = [
  { title: "Product", links: [["Product", "/product"], ["How it works", "/how-it-works"], ["Pricing", "/pricing"], ["Changelog", "/changelog"], ["Status", "/status"]] },
  { title: "Developers", links: [["Documentation", "/docs"], ["API reference", "/docs/api"], ["MCP server", "/docs/mcp"], ["Webhooks", "/docs/webhooks"]] },
  { title: "Company", links: [["About", "/about"], ["Blog", "/blog"], ["Careers", "/careers"], ["Contact", "/contact"]] },
  { title: "Trust", links: [["Security", "/security"], ["Privacy", "/legal/privacy"], ["Terms", "/legal/terms"], ["DPA", "/legal/dpa"]] },
];

export function SiteFooter() {
  return (
    <footer className="border-t border-line bg-surface/60">
      <div className="mx-auto grid max-w-7xl gap-10 px-5 py-14 sm:px-8 lg:grid-cols-[1.4fr_repeat(4,1fr)]">
        <div>
          <Logo />
          <p className="mt-4 max-w-xs text-sm text-muted">The agentic inbound engine. Every lead guarded, enriched, routed, booked and followed up — in minutes.</p>
        </div>
        {COLS.map((c) => (
          <div key={c.title}>
            <p className="text-sm font-semibold">{c.title}</p>
            <ul className="mt-3 space-y-2">{c.links.map(([l, h]) => <li key={h}><Link href={h} className="text-sm text-muted hover:text-ink">{l}</Link></li>)}</ul>
          </div>
        ))}
      </div>
      <div className="border-t border-line">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-3 px-5 py-6 text-sm text-muted sm:flex-row sm:px-8">
          <p>© {new Date().getFullYear()} Velaroute. All rights reserved.</p>
          <a href="https://github.com/rahulpatel84" target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 font-medium hover:text-ink"><svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden><path d="M12 .5a11.5 11.5 0 0 0-3.64 22.41c.58.1.79-.25.79-.56v-2c-3.2.7-3.88-1.37-3.88-1.37-.53-1.33-1.28-1.69-1.28-1.69-1.05-.71.08-.7.08-.7 1.16.08 1.77 1.19 1.77 1.19 1.03 1.77 2.7 1.26 3.36.96.1-.75.4-1.26.73-1.55-2.55-.29-5.24-1.28-5.24-5.69 0-1.26.45-2.29 1.19-3.1-.12-.29-.52-1.46.11-3.05 0 0 .97-.31 3.17 1.18a11 11 0 0 1 5.78 0c2.2-1.49 3.17-1.18 3.17-1.18.63 1.59.23 2.76.11 3.05.74.81 1.19 1.84 1.19 3.1 0 4.42-2.7 5.39-5.26 5.68.41.36.78 1.06.78 2.14v3.17c0 .31.21.67.8.56A11.5 11.5 0 0 0 12 .5Z"/></svg>Built by Rahul Patel</a>
        </div>
      </div>
    </footer>
  );
}
