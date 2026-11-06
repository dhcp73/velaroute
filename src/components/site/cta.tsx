import Link from "next/link";
import { buttonClass } from "@/components/button-class";
import { ArrowRight } from "lucide-react";
import { RoutingIllustration } from "./signal-graphics";

export function CtaBand() {
  return (
    <section className="mx-auto max-w-7xl px-5 pb-20 sm:px-8" aria-label="Get started" data-closing-cta>
      <div className="cta-signal-panel relative isolate overflow-hidden rounded-3xl bg-[#17191c] text-white">
        <div className="relative z-10 grid items-center gap-6 px-6 pb-5 pt-10 sm:px-10 sm:py-12 lg:grid-cols-[1.2fr_1fr] lg:px-14 lg:py-14">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[.14em] text-[#fda27f]">Capture. Qualify. Connect.</p>
            <h2 className="mt-4 max-w-xl text-balance font-display text-3xl font-semibold tracking-tight sm:text-5xl">Stop letting good leads wait.</h2>
            <p className="mt-5 max-w-lg text-sm leading-relaxed text-[#bac2ce] sm:text-base">Connect a form, add your reps and watch the first lead get routed and booked — in a sandbox workspace.</p>
            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <Link href="/signup" className={buttonClass("primary", "lg", "w-full sm:w-auto")}>Start free<ArrowRight className="h-4 w-4" /></Link>
              <Link href="/contact" className="inline-flex h-12 w-full items-center justify-center rounded-full border border-white/30 px-6 text-sm font-semibold text-white transition-colors hover:bg-white/10 sm:w-auto">Talk to us</Link>
            </div>
            <p className="mt-4 text-xs text-[#aeb6c1]">14 days free · No card required</p>
          </div>
          <div className="min-w-0"><RoutingIllustration /></div>
        </div>
      </div>
    </section>
  );
}
