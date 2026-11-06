"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Menu, X } from "lucide-react";
import { Logo } from "@/components/logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { buttonClass } from "@/components/ui";
import { cn } from "@/lib/cn";

export const NAV = [
  { href: "/product", label: "Product" },
  { href: "/how-it-works", label: "How it works" },
  { href: "/pricing", label: "Pricing" },
  { href: "/customers", label: "Use cases" },
  { href: "/docs", label: "Docs" },
  { href: "/blog", label: "Blog" },
  { href: "/about", label: "About" },
];

export function SiteHeader() {
  const path = usePathname();
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => setOpen(false), [path]);
  useEffect(() => {
    const h = () => setScrolled(window.scrollY > 8);
    h(); window.addEventListener("scroll", h, { passive: true });
    return () => window.removeEventListener("scroll", h);
  }, []);
  useEffect(() => { document.body.style.overflow = open ? "hidden" : ""; return () => { document.body.style.overflow = ""; }; }, [open]);
  return (
    <header className={cn("sticky top-0 z-50 transition-colors", scrolled || open ? "border-b border-line bg-bg/80 backdrop-blur-xl" : "border-b border-transparent")}>
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-6 px-5 sm:px-8">
        <Logo />
        <nav className="hidden flex-1 items-center gap-1 lg:flex" aria-label="Main">
          {NAV.map((n) => <Link key={n.href} href={n.href} aria-current={path.startsWith(n.href) ? "page" : undefined} className={cn("rounded-full px-3 py-2 text-sm font-medium transition-colors", path.startsWith(n.href) ? "text-ink" : "text-muted hover:text-ink")}>{n.label}</Link>)}
        </nav>
        <div className="ml-auto flex items-center gap-1 lg:ml-0">
          <ThemeToggle />
          <Link href="/login" className="hidden rounded-full px-3 py-2 text-sm font-medium text-muted hover:text-ink sm:inline-flex">Log in</Link>
          <Link href="/signup" className={cn(buttonClass("primary", "md"), "hidden sm:inline-flex")}>Start free</Link>
          <button type="button" className="grid h-10 w-10 place-items-center rounded-full hover:bg-surface-2 lg:hidden" onClick={() => setOpen((o) => !o)} aria-label={open ? "Close menu" : "Open menu"} aria-expanded={open}>{open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}</button>
        </div>
      </div>
      {open && (
        <div className="h-[calc(100dvh-64px)] overflow-y-auto border-t border-line bg-bg px-5 pb-10 pt-4 lg:hidden">
          <nav className="flex flex-col" aria-label="Mobile">
            {NAV.map((n) => <Link key={n.href} href={n.href} className="border-b border-line py-4 font-display text-xl font-medium">{n.label}</Link>)}
          </nav>
          <div className="mt-6 grid gap-3"><Link href="/signup" className={buttonClass("primary", "lg")}>Start free</Link><Link href="/login" className={buttonClass("secondary", "lg")}>Log in</Link></div>
        </div>
      )}
    </header>
  );
}
