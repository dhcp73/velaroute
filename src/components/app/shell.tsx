"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Activity, BarChart3, Bell, Bot, Building2, CalendarDays, ChevronDown, Code2, FileText, Gauge, Inbox, LogOut, Menu, Plug, Search, Settings, Split, X, BookOpen, ExternalLink } from "lucide-react";
import { LogoMark } from "@/components/logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { Avatar } from "@/components/ui";
import { cn } from "@/lib/cn";
import { useWs, BROWSER_MODE } from "./workspace";
import { ago } from "./format";

const NAV: { group: string; items: { href: string; label: string; icon: typeof Inbox; exact?: boolean }[] }[] = [
  { group: "Work", items: [
    { href: "/app", label: "Overview", icon: Gauge, exact: true },
    { href: "/app/inbox", label: "Inbox", icon: Inbox },
    { href: "/app/meetings", label: "Meetings", icon: CalendarDays },
    { href: "/app/agents", label: "Agents", icon: Bot },
  ] },
  { group: "Engine", items: [
    { href: "/app/routing", label: "Routing", icon: Split },
    { href: "/app/forms", label: "Forms", icon: FileText },
    { href: "/app/accounts", label: "Accounts", icon: Building2 },
    { href: "/app/analytics", label: "Analytics", icon: BarChart3 },
  ] },
  { group: "Workspace", items: [
    { href: "/app/settings/integrations", label: "Integrations", icon: Plug },
    { href: "/app/settings/developers", label: "Developers", icon: Code2 },
    { href: "/app/health", label: "Health", icon: Activity },
    { href: "/app/settings", label: "Settings", icon: Settings, exact: true },
  ] },
];

function NavList({ onNavigate }: { onNavigate?: () => void }) {
  const path = usePathname();
  const { ws } = useWs();
  const unread = ws?.leads.filter((l) => l.slaDueAt && !l.firstTouchAt && l.stage !== "spam").length ?? 0;
  return (
    <nav className="flex flex-col gap-5" aria-label="App">
      {NAV.map((g) => (
        <div key={g.group}>
          <p className="px-3 pb-1.5 text-[11px] font-semibold uppercase tracking-wider text-faint">{g.group}</p>
          <ul className="flex flex-col gap-0.5">
            {g.items.map((i) => {
              const active = i.exact ? path === i.href : path === i.href || path.startsWith(i.href + "/");
              return (
                <li key={i.href}>
                  <Link href={i.href} onClick={onNavigate} aria-current={active ? "page" : undefined}
                    className={cn("flex h-9 items-center gap-3 rounded-full px-3 text-[14px] font-medium transition-colors", active ? "bg-primary-100 text-primary-800 dark:bg-primary-500/15 dark:text-primary-100" : "text-muted hover:bg-surface-2 hover:text-ink")}>
                    <i.icon className="h-[18px] w-[18px] shrink-0" aria-hidden />
                    <span className="flex-1 truncate">{i.label}</span>
                    {i.href === "/app/inbox" && unread > 0 && <span className="rounded-full bg-primary-500 px-1.5 text-[11px] font-semibold leading-5 text-white">{unread}</span>}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}

function Palette({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { ws } = useWs();
  const router = useRouter();
  const [q, setQ] = useState("");
  const [idx, setIdx] = useState(0);
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => { if (open) { setQ(""); setIdx(0); setTimeout(() => input.current?.focus(), 20); } }, [open]);
  const results = useMemo(() => {
    const pages = NAV.flatMap((g) => g.items).map((i) => ({ id: i.href, label: i.label, hint: "Page", href: i.href }));
    const s = q.trim().toLowerCase();
    const leads = (ws?.leads ?? []).filter((l) => !s || `${l.name} ${l.email} ${l.company}`.toLowerCase().includes(s)).slice(0, 8).map((l) => ({ id: l.id, label: l.name, hint: l.company || l.email, href: `/app/leads/${l.id}` }));
    return [...pages.filter((p) => !s || p.label.toLowerCase().includes(s)), ...(s ? leads : [])].slice(0, 12);
  }, [q, ws]);
  if (!open) return null;
  const go = (href: string) => { onClose(); router.push(href); };
  return (
    <div className="fixed inset-0 z-[110] flex items-start justify-center p-4 pt-[12vh]" role="dialog" aria-modal="true" aria-label="Search">
      <div className="absolute inset-0 bg-[#0d0e16]/40" onClick={onClose} />
      <div className="relative w-full max-w-lg overflow-hidden rounded-3xl border border-line bg-surface shadow-2xl">
        <div className="flex items-center gap-2 border-b border-line px-4">
          <Search className="h-4 w-4 text-faint" aria-hidden />
          <input ref={input} value={q} onChange={(e) => { setQ(e.target.value); setIdx(0); }} placeholder="Search leads and pages…" aria-label="Search"
            onKeyDown={(e) => { if (e.key === "Escape") onClose(); if (e.key === "ArrowDown") { e.preventDefault(); setIdx((i) => Math.min(i + 1, results.length - 1)); } if (e.key === "ArrowUp") { e.preventDefault(); setIdx((i) => Math.max(i - 1, 0)); } if (e.key === "Enter" && results[idx]) go(results[idx].href); }}
            className="h-12 flex-1 bg-transparent text-[15px] outline-none placeholder:text-faint" />
          <kbd className="rounded-md border border-line px-1.5 text-[11px] text-faint">Esc</kbd>
        </div>
        <ul className="max-h-80 overflow-y-auto p-2">
          {results.length === 0 && <li className="px-3 py-6 text-center text-sm text-muted">No matches</li>}
          {results.map((r, i) => (
            <li key={r.id}>
              <button type="button" onMouseEnter={() => setIdx(i)} onClick={() => go(r.href)} className={cn("flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2 text-left text-sm", i === idx ? "bg-primary-100 text-primary-900 dark:bg-primary-500/15 dark:text-primary-100" : "")}>
                <span className="truncate font-medium">{r.label}</span><span className="truncate text-xs text-muted">{r.hint}</span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function Alerts() {
  const { ws, dispatch, now } = useWs();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", h); return () => document.removeEventListener("mousedown", h);
  }, []);
  const unread = ws?.alerts.filter((a) => !a.read).length ?? 0;
  return (
    <div className="relative" ref={ref}>
      <button type="button" onClick={() => setOpen((o) => !o)} aria-label={`Alerts${unread ? ` (${unread} unread)` : ""}`} aria-expanded={open} className="relative grid h-9 w-9 place-items-center rounded-full text-muted hover:bg-surface-2 hover:text-ink">
        <Bell className="h-[18px] w-[18px]" />
        {unread > 0 && <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-rose-500 ring-2 ring-surface" />}
      </button>
      {open && (
        <div className="absolute right-0 top-11 z-50 w-[min(92vw,380px)] overflow-hidden rounded-2xl border border-line bg-surface shadow-xl">
          <div className="flex items-center justify-between border-b border-line px-4 py-3">
            <p className="text-sm font-semibold">Alerts</p>
            <button type="button" className="text-xs font-medium text-primary-600 hover:underline dark:text-primary-300" onClick={() => dispatch({ type: "alerts.read" }, { quiet: true })}>Mark all read</button>
          </div>
          <ul className="max-h-96 overflow-y-auto">
            {(ws?.alerts ?? []).slice(0, 25).map((a) => (
              <li key={a.id}>
                <Link href={`/app/leads/${a.leadId}`} onClick={() => setOpen(false)} className="flex gap-3 border-b border-line/60 px-4 py-3 text-sm hover:bg-surface-2">
                  <span className={cn("mt-1.5 h-2 w-2 shrink-0 rounded-full", a.kind === "sla_breach" ? "bg-rose-500" : a.kind === "escalation" ? "bg-amber-500" : a.kind === "sla_warning" ? "bg-amber-400" : "bg-primary-400", a.read && "opacity-30")} />
                  <span className="min-w-0 flex-1"><span className="block">{a.text}</span><span className="text-xs text-faint">{a.channel} · {ago(a.at, now)}</span></span>
                </Link>
              </li>
            ))}
            {!ws?.alerts.length && <li className="px-4 py-8 text-center text-sm text-muted">No alerts yet</li>}
          </ul>
        </div>
      )}
    </div>
  );
}

function UserMenu() {
  const { user, ws } = useWs();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", h); return () => document.removeEventListener("mousedown", h);
  }, []);
  return (
    <div className="relative" ref={ref}>
      <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} aria-label="Account menu" className="flex items-center gap-2 rounded-full py-1 pl-1 pr-2 hover:bg-surface-2">
        <Avatar name={user.name} />
        <ChevronDown className="h-4 w-4 text-faint" />
      </button>
      {open && (
        <div className="absolute right-0 top-11 z-50 w-64 overflow-hidden rounded-2xl border border-line bg-surface p-1.5 shadow-xl">
          <div className="px-3 py-2"><p className="truncate text-sm font-semibold">{user.name}</p><p className="truncate text-xs text-muted">{user.email}</p><p className="mt-1 truncate text-xs text-faint">{ws?.name} · {user.role}</p></div>
          <Link href="/docs" className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm hover:bg-surface-2"><BookOpen className="h-4 w-4" />Documentation</Link>
          <Link href="/" className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm hover:bg-surface-2"><ExternalLink className="h-4 w-4" />Website</Link>
          <form action="/api/auth/logout" method="post"><button type="submit" className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm text-rose-600 hover:bg-rose-50 dark:text-rose-300 dark:hover:bg-rose-500/10"><LogOut className="h-4 w-4" />Log out</button></form>
        </div>
      )}
    </div>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const [drawer, setDrawer] = useState(false);
  const [palette, setPalette] = useState(false);
  const { ws } = useWs();
  const path = usePathname();
  useEffect(() => setDrawer(false), [path]);
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") { e.preventDefault(); setPalette((p) => !p); } };
    window.addEventListener("keydown", h); return () => window.removeEventListener("keydown", h);
  }, []);
  return (
    <div className="min-h-dvh bg-bg">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-60 flex-col border-r border-line bg-surface px-3 py-4 lg:flex">
        <Link href="/app" className="mb-6 flex items-center gap-2 px-2 font-display text-[17px] font-semibold"><LogoMark />Velaroute</Link>
        <div className="min-h-0 flex-1 overflow-y-auto scrollbar-thin"><NavList /></div>
        <div className="mt-4 rounded-2xl bg-surface-2 p-3 text-xs text-muted">
          <p className="truncate font-semibold text-ink">{ws?.name ?? "…"}</p>
          <p className="mt-0.5 capitalize">{ws?.plan ?? ""} plan{BROWSER_MODE ? " · demo storage" : ""}</p>
        </div>
      </aside>
      {drawer && (
        <div className="fixed inset-0 z-[90] lg:hidden" role="dialog" aria-modal="true" aria-label="Navigation">
          <div className="absolute inset-0 bg-[#0d0e16]/40" onClick={() => setDrawer(false)} />
          <div className="absolute inset-y-0 left-0 flex w-72 max-w-[85vw] flex-col bg-surface px-3 py-4 shadow-2xl">
            <div className="mb-6 flex items-center justify-between px-2"><span className="flex items-center gap-2 font-display font-semibold"><LogoMark />Velaroute</span><button type="button" onClick={() => setDrawer(false)} className="rounded-full p-2 hover:bg-surface-2" aria-label="Close menu"><X className="h-5 w-5" /></button></div>
            <div className="min-h-0 flex-1 overflow-y-auto"><NavList onNavigate={() => setDrawer(false)} /></div>
          </div>
        </div>
      )}
      <div className="lg:pl-60">
        {BROWSER_MODE && <div className="bg-primary-100 px-4 py-1.5 text-center text-xs text-primary-900 dark:bg-primary-500/15 dark:text-primary-100">Demo mode: your workspace is saved in this browser. Connect a database for permanent storage.</div>}
        <header className="sticky top-0 z-30 flex h-16 items-center gap-2 border-b border-line bg-bg/85 px-4 backdrop-blur-md sm:px-6">
          <button type="button" className="grid h-9 w-9 place-items-center rounded-full hover:bg-surface-2 lg:hidden" onClick={() => setDrawer(true)} aria-label="Open menu"><Menu className="h-5 w-5" /></button>
          <button type="button" onClick={() => setPalette(true)} className="flex h-10 min-w-0 max-w-md flex-1 items-center gap-2 rounded-full border border-line bg-surface px-4 text-left text-sm text-faint hover:border-primary-300">
            <Search className="h-4 w-4 shrink-0" /><span className="truncate">Search leads, pages…</span><kbd className="ml-auto hidden rounded-md border border-line px-1.5 text-[11px] sm:inline">⌘K</kbd>
          </button>
          <div className="ml-auto flex items-center gap-1"><ThemeToggle /><Alerts /><UserMenu /></div>
        </header>
        <main className="mx-auto w-full max-w-[1400px] px-4 py-6 sm:px-6 lg:px-8">{children}</main>
      </div>
      <Palette open={palette} onClose={() => setPalette(false)} />
    </div>
  );
}

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        <h1 className="font-display text-2xl font-semibold tracking-tight sm:text-[28px]">{title}</h1>
        {subtitle && <p className="mt-1 max-w-2xl text-sm text-muted">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function Loading() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4" aria-busy="true" aria-label="Loading">
      {Array.from({ length: 8 }).map((_, i) => <div key={i} className="h-28 animate-pulse rounded-2xl bg-surface-2" />)}
    </div>
  );
}
