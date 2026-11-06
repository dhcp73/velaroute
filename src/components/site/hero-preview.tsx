"use client";
import { motion, useReducedMotion } from "framer-motion";
import { useEffect, useState } from "react";
import { CheckCircle2, Sparkles } from "lucide-react";

const ROWS = [
  { n: "Maya Brooks", c: "Kestrel AI", o: "Jonas", col: "#cf3f16", s: "4:12", t: "violet" },
  { n: "Ethan Kim", c: "Quill", o: "Ava", col: "#6e7785", s: "1:03", t: "amber" },
  { n: "Leo Tanaka", c: "Harbor Cloud", o: "Priya", col: "#537563", s: "2m", t: "mint" },
  { n: "Grace Okafor", c: "OrbitPay", o: "Sofia", col: "#657083", s: "Booked", t: "mint" },
];
const TONE: Record<string, string> = { violet: "bg-primary-100 text-primary-800 dark:bg-primary-500/20 dark:text-primary-100", amber: "bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-100", mint: "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-100" };
const TRACE = ["Guard · risk 0/100 · pass", "Enrich · 75 employees · DE · $0.05", "Match · no existing account", "Route · EMEA territory → Jonas", "Book · Thu 14:30 · Teams", "CRM · upsert → HubSpot"];

export function HeroPreview() {
  const reduce = useReducedMotion();
  const [n, setN] = useState(reduce ? TRACE.length : 0);
  useEffect(() => {
    if (reduce) return;
    const t = setInterval(() => setN((x) => (x >= TRACE.length + 3 ? 0 : x + 1)), 900);
    return () => clearInterval(t);
  }, [reduce]);
  return (
    <div className="relative mx-auto w-full max-w-5xl">
      <div className="product-frame relative overflow-hidden rounded-2xl border border-line bg-surface">
        <div className="flex items-center gap-2 border-b border-line bg-surface-2 px-4 py-3 text-muted"><span className="h-2 w-2 rounded-full bg-[#9aa3af]" /><span className="h-2 w-2 rounded-full bg-[#9aa3af]" /><span className="h-2 w-2 rounded-full bg-[#9aa3af]" /><span className="ml-3 truncate rounded-md border border-line bg-surface px-3 py-1 text-xs text-muted">Velaroute / Inbox · Sample workspace</span></div>
        <div className="grid md:grid-cols-[1.25fr_1fr]">
          <div className="border-b border-line p-4 md:border-b-0 md:border-r">
            <div className="mb-3 flex items-center justify-between"><p className="text-sm font-semibold">Inbox</p><span className="rounded-full bg-primary-100 px-2 py-0.5 text-[11px] font-medium text-primary-800 dark:bg-primary-500/20 dark:text-primary-100">4 need a reply</span></div>
            <ul className="flex flex-col gap-2">
              {ROWS.map((r, i) => (
                <motion.li key={r.n} initial={reduce ? false : { opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 + i * 0.12 }} className="flex items-center gap-3 border-b border-line px-3 py-2.5">
                  <span className="grid h-8 w-8 place-items-center rounded-full text-[11px] font-semibold text-white" style={{ background: r.col }}>{r.o.slice(0, 2).toUpperCase()}</span>
                  <span className="min-w-0 flex-1"><span className="block truncate text-[13px] font-medium">{r.n}</span><span className="block truncate text-[11px] text-muted">{r.c} → {r.o}</span></span>
                  <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium tabular-nums ${TONE[r.t]}`}>{r.s}</span>
                </motion.li>
              ))}
            </ul>
          </div>
          <div className="p-4">
            <p className="text-sm font-semibold">Maya Brooks · pipeline trace</p>
            <ol className="mt-3 flex flex-col gap-2">
              {TRACE.map((t, i) => (
                <motion.li key={t} animate={{ opacity: i < n ? 1 : 0.25 }} transition={{ duration: 0.3 }} className="flex items-center gap-2 text-[13px]">
                  <CheckCircle2 className={`h-4 w-4 shrink-0 ${i < n ? "text-primary-500" : "text-faint"}`} /><span className="truncate">{t}</span>
                </motion.li>
              ))}
            </ol>
            <div className="mt-4 rounded-lg bg-primary-50 p-3 text-[12px] text-primary-900 dark:bg-primary-500/10 dark:text-primary-100"><p className="flex items-center gap-1.5 font-semibold"><Sparkles className="h-3.5 w-3.5" />Copilot draft</p><p className="mt-1 text-primary-900/80 dark:text-primary-100/80">Hi Maya — thanks for reaching out. Would Thursday 14:30 work for a 30-minute call?</p></div>
          </div>
        </div>
      </div>
    </div>
  );
}
