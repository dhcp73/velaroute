"use client";
import { motion, useReducedMotion } from "framer-motion";
import { useEffect, useState } from "react";
import { STAGES } from "@/content/stages";
import { cn } from "@/lib/cn";



export function PipelineFlow({ compact = false }: { compact?: boolean }) {
  const reduce = useReducedMotion();
  const [active, setActive] = useState(0);
  const [hover, setHover] = useState<number | null>(null);
  useEffect(() => {
    if (reduce || hover !== null) return;
    const t = setInterval(() => setActive((a) => (a + 1) % STAGES.length), 1600);
    return () => clearInterval(t);
  }, [reduce, hover]);
  const cur = hover ?? active;
  return (
    <div className="relative">
      <div className={cn("grid gap-3", compact ? "grid-cols-4 sm:grid-cols-8" : "grid-cols-2 sm:grid-cols-4 lg:grid-cols-8")}>
        {STAGES.map((s, i) => {
          const on = i === cur, done = i < cur;
          return (
            <button key={s.id} type="button" onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)} onFocus={() => setHover(i)} onBlur={() => setHover(null)}
              className={cn("group relative flex flex-col items-center gap-2 rounded-lg border p-3 text-center transition-colors", on ? "border-primary-400 bg-primary-50/80 dark:bg-primary-500/10" : "border-line bg-surface/70 hover:border-primary-300")}
              aria-pressed={on} aria-label={`${s.name}: ${s.text}`}>
              <span className={cn("relative grid h-11 w-11 place-items-center rounded-lg transition-colors", on ? "bg-primary-500 text-white" : done ? "bg-primary-100 text-primary-700 dark:bg-primary-500/20 dark:text-primary-200" : "bg-surface-2 text-muted")}>
                <s.icon className="h-5 w-5" />
                {on && !reduce && <motion.span layoutId="pulse" className="absolute inset-0 rounded-lg ring-4 ring-primary-400/40" transition={{ type: "spring", stiffness: 300, damping: 30 }} />}
              </span>
              <span className="text-[13px] font-semibold">{s.name}</span>
            </button>
          );
        })}
      </div>
      <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-surface-2" aria-hidden>
        <motion.div className="h-full rounded-full bg-primary-500" animate={{ width: `${((cur + 1) / STAGES.length) * 100}%` }} transition={{ duration: reduce ? 0 : 0.5, ease: "easeOut" }} />
      </div>
      <motion.div key={cur} initial={reduce ? false : { opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }} className="mt-4 flex flex-col gap-2 rounded-lg border border-line bg-surface/80 p-4 backdrop-blur sm:flex-row sm:items-center sm:justify-between" aria-live="polite">
        <p className="text-sm"><span className="font-semibold">{STAGES[cur].name}.</span> <span className="text-muted">{STAGES[cur].text}</span></p>
        <code className="min-w-0 break-words rounded-md bg-[#20211e] px-3 py-1.5 text-xs text-[#e2dfd5]">{STAGES[cur].out}</code>
      </motion.div>
    </div>
  );
}
