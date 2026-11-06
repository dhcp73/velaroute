import type { ReactNode } from "react";

export function PageHero({ eyebrow, title, children }: { eyebrow: string; title: ReactNode; children?: ReactNode }) {
  return (
    <section className="relative overflow-hidden">
      <div className="relative mx-auto max-w-7xl px-5 pb-16 pt-20 sm:px-8 sm:pb-20 sm:pt-28">
        <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[.16em] text-muted"><span className="h-1.5 w-1.5 rounded-full bg-primary-500" />{eyebrow}</p>
        <h1 className="mt-6 max-w-4xl text-balance font-display text-5xl tracking-tight sm:text-7xl">{title}</h1>
        {children && <div className="mt-6 max-w-2xl text-pretty text-lg leading-relaxed text-muted">{children}</div>}
      </div>
    </section>
  );
}

export function Section({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <section className={`mx-auto max-w-7xl px-5 py-16 sm:px-8 sm:py-24 ${className}`}>{children}</section>;
}

export function SectionTitle({ eyebrow, title, sub, center = true }: { eyebrow?: string; title: ReactNode; sub?: ReactNode; center?: boolean }) {
  return (
    <div className={center ? "mx-auto max-w-3xl text-center" : "max-w-3xl"}>
      {eyebrow && <p className="text-sm font-semibold uppercase tracking-wider text-primary-600 dark:text-primary-300">{eyebrow}</p>}
      <h2 className="mt-3 text-balance font-display text-3xl font-semibold tracking-tight sm:text-5xl">{title}</h2>
      {sub && <p className="mt-4 text-pretty text-lg text-muted">{sub}</p>}
    </div>
  );
}
