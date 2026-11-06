import Link from "next/link";
import { buttonClass } from "@/components/button-class";
import { ArrowRight } from "lucide-react";

export function CtaBand() {
  return (
    <section className="mx-auto max-w-7xl px-5 pb-20 sm:px-8">
      <div className="relative overflow-hidden rounded-xl border border-line bg-surface-2 px-6 py-14 text-center text-ink sm:px-12 sm:py-20">
        <div className="relative">
          <h2 className="mx-auto mt-4 max-w-2xl text-balance font-display text-3xl font-semibold tracking-tight sm:text-5xl">Stop letting good leads wait.</h2>
          <p className="mx-auto mt-4 max-w-xl text-muted">Connect a form, add your reps and watch the first lead get routed and booked — in a sandbox workspace.</p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link href="/signup" className={buttonClass("primary", "lg", "w-full sm:w-auto")}>Start free<ArrowRight className="h-4 w-4" /></Link>
            <Link href="/contact" className={buttonClass("secondary", "lg", "w-full sm:w-auto")}>Talk to us</Link>
          </div>
        </div>
      </div>
    </section>
  );
}
