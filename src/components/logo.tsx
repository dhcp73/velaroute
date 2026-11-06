import Link from "next/link";
import { cn } from "@/lib/cn";

export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={cn("h-7 w-7 shrink-0", className)} aria-hidden="true">
      <defs><linearGradient id="vr-g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#7c6cf2" /><stop offset="1" stopColor="#38bdf8" /></linearGradient></defs>
      <rect width="32" height="32" rx="9" fill="url(#vr-g)" />
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
