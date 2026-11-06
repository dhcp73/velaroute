"use client";
import { motion, useInView, useReducedMotion, animate } from "framer-motion";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { cn } from "@/lib/cn";

export function Reveal({ children, delay = 0, className, y = 24 }: { children: ReactNode; delay?: number; className?: string; y?: number }) {
  const reduce = useReducedMotion();
  return (
    <motion.div className={className} initial={reduce ? false : { opacity: 0, y }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-60px" }} transition={{ duration: 0.6, delay, ease: [0.22, 1, 0.36, 1] }}>
      {children}
    </motion.div>
  );
}

export function Orbs({ className }: { className?: string }) {
  const reduce = useReducedMotion();
  const orbs = [
    { c: "rgba(124,108,242,.55)", s: 520, x: ["-10%", "8%", "-10%"], y: ["-20%", "5%", "-20%"], l: "8%", t: "-10%", d: 18 },
    { c: "rgba(56,189,248,.45)", s: 440, x: ["0%", "-12%", "0%"], y: ["0%", "14%", "0%"], l: "55%", t: "-6%", d: 22 },
    { c: "rgba(52,211,153,.35)", s: 380, x: ["0%", "10%", "0%"], y: ["10%", "-6%", "10%"], l: "30%", t: "30%", d: 26 },
    { c: "rgba(244,114,182,.28)", s: 300, x: ["0%", "-8%", "0%"], y: ["0%", "-10%", "0%"], l: "75%", t: "38%", d: 20 },
  ];
  return (
    <div className={cn("pointer-events-none absolute inset-0 overflow-hidden", className)} aria-hidden>
      {orbs.map((o, i) => (
        <motion.div key={i} className="absolute rounded-full blur-3xl" style={{ width: o.s, height: o.s, left: o.l, top: o.t, background: `radial-gradient(circle at 30% 30%, ${o.c}, transparent 70%)` }}
          animate={reduce ? undefined : { x: o.x, y: o.y, scale: [1, 1.08, 1] }} transition={{ duration: o.d, repeat: Infinity, ease: "easeInOut" }} />
      ))}
    </div>
  );
}

export function CountUp({ to, suffix = "", prefix = "", decimals = 0 }: { to: number; suffix?: string; prefix?: string; decimals?: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true });
  const reduce = useReducedMotion();
  const [v, setV] = useState(reduce ? to : 0);
  useEffect(() => {
    if (!inView || reduce) { if (reduce) setV(to); return; }
    const c = animate(0, to, { duration: 1.4, ease: "easeOut", onUpdate: setV });
    return () => c.stop();
  }, [inView, to, reduce]);
  return <span ref={ref} className="tabular-nums">{prefix}{v.toFixed(decimals)}{suffix}</span>;
}

export function Marquee({ items }: { items: string[] }) {
  const reduce = useReducedMotion();
  const row = [...items, ...items];
  return (
    <div className="relative overflow-hidden [mask-image:linear-gradient(90deg,transparent,black_12%,black_88%,transparent)]">
      <motion.ul className="flex w-max gap-3" animate={reduce ? undefined : { x: ["0%", "-50%"] }} transition={{ duration: 38, repeat: Infinity, ease: "linear" }}>
        {row.map((t, i) => <li key={i} className="whitespace-nowrap rounded-full border border-line bg-surface/70 px-4 py-2 text-sm font-medium text-muted backdrop-blur" aria-hidden={i >= items.length}>{t}</li>)}
      </motion.ul>
    </div>
  );
}
