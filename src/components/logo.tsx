import Link from "next/link";
import { cn } from "@/lib/cn";

export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={cn("h-7 w-7 shrink-0", className)} aria-hidden="true">
      <rect width="32" height="32" rx="6" fill="#985a30" />
      <path d="M8 9.5 16 23l8-13.5" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="16" cy="23" r="2.2" fill="#fff" />
    </svg>
  );
}

export function Logo({ href = "/", className }: { href?: string; className?: string }) {
  return (
    <Link href={href} className={cn("inline-flex items-center gap-2 font-display text-[17px] font-semibold tracking-tight text-ink", className)} aria-label="Velaroute home">
      <LogoMark />
      <span>Velaroute</span>
    </Link>
  );
}
