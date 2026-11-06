import Link from "next/link";
import { ArrowRight } from "lucide-react";

export function CtaBand() {
  return (
    <section className="mx-auto max-w-7xl px-5 pb-20 sm:px-8">
      <div className="relative overflow-hidden rounded-xl bg-[#20211e] px-6 py-14 text-center text-white sm:px-12 sm:py-20">
        <div className="relative">
          <h2 className="mx-auto mt-4 max-w-2xl text-balance font-display text-3xl font-semibold tracking-tight sm:text-5xl">Stop letting good leads wait.</h2>
          <p className="mx-auto mt-4 max-w-xl text-white/85">Connect a form, add your reps and watch the first lead get routed and booked — in a sandbox workspace.</p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link href="/signup" className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-md bg-white px-6 font-semibold text-[#20211e] hover:bg-white/90 sm:w-auto">Start free<ArrowRight className="h-4 w-4" /></Link>
            <Link href="/contact" className="inline-flex h-12 w-full items-center justify-center rounded-md border border-white/40 px-6 font-semibold text-white hover:bg-white/10 sm:w-auto">Talk to us</Link>
          </div>
        </div>
      </div>
    </section>
  );
}
