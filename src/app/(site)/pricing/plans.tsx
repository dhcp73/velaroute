"use client";
import Link from "next/link";
import { useState } from "react";
import { motion } from "framer-motion";
import { Check } from "lucide-react";
import { buttonClass } from "@/components/button-class";
import { TIERS } from "@/content/marketing";
import { cn } from "@/lib/cn";

export function Plans() {
  const [annual, setAnnual] = useState(true);
  return (
    <div>
      <div className="flex items-center justify-center gap-3">
        <div className="inline-flex rounded-full border border-line bg-surface p-1" role="group" aria-label="Billing period">
          {[false, true].map((a) => (
            <button key={String(a)} type="button" aria-pressed={annual === a} onClick={() => setAnnual(a)} className={cn("relative rounded-full px-4 py-2 text-sm font-medium transition-colors", annual === a ? "text-white" : "text-muted hover:text-ink")}>
              {annual === a && <motion.span layoutId="bill" className="absolute inset-0 rounded-full bg-primary-500" transition={{ type: "spring", stiffness: 400, damping: 32 }} />}
              <span className="relative">{a ? "Annual" : "Monthly"}</span>
            </button>
          ))}
        </div>
        <span className="rounded-full bg-mint-soft px-2.5 py-1 text-xs font-semibold text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-200">Save 20%</span>
      </div>
      <div className="mt-10 grid gap-5 lg:grid-cols-3">
        {TIERS.map((t) => {
          const price = annual ? t.annual : t.monthly;
          return (
            <div key={t.id} className={cn("card relative flex flex-col p-6 sm:p-8", t.highlight && "ring-2 ring-primary-400")}>
              {t.highlight && <span className="absolute -top-3 left-6 rounded-full bg-primary-500 px-3 py-1 text-xs font-semibold text-white">Most popular</span>}
              <h2 className="font-display text-2xl font-semibold">{t.name}</h2>
              <p className="mt-1 text-sm text-muted">{t.blurb}</p>
              <p className="mt-6 flex items-end gap-1"><motion.span key={price} initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} className="font-display text-5xl font-semibold tabular-nums">${price}</motion.span><span className="pb-1.5 text-muted">/month</span></p>
              <p className="mt-1 h-5 text-xs text-faint">{annual ? `$${price * 12} billed yearly` : "Billed monthly, cancel anytime"}</p>
              <p className="mt-4 rounded-xl bg-surface-2 px-3 py-2 text-sm font-medium">{t.limits}</p>
              <ul className="mt-6 flex-1 space-y-3 text-sm">{t.features.map((f) => <li key={f} className="flex gap-2"><Check className="mt-0.5 h-4 w-4 shrink-0 text-primary-500" />{f}</li>)}</ul>
              <Link href={t.id === "scale" ? "/contact" : `/signup?plan=${t.id}`} className={buttonClass(t.highlight ? "primary" : "secondary", "lg", "mt-8 w-full")}>{t.cta}</Link>
            </div>
          );
        })}
      </div>
    </div>
  );
}
