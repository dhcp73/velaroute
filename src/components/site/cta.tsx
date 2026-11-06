import Link from "next/link";
import { ArrowRight, Sparkles } from "lucide-react";
import { Orbs } from "./motion";

export function CtaBand() {
  return (
    <section className="mx-auto max-w-7xl px-5 pb-20 sm:px-8">
      <div className="relative overflow-hidden rounded-[32px] bg-gradient-to-br from-primary-600 via-primary-500 to-sky-500 px-6 py-14 text-center text-white sm:px-12 sm:py-20">
        <Orbs className="opacity-50 mix-blend-screen" />
        <div className="relative">
          <Sparkles className="mx-auto h-8 w-8 opacity-90" />
          <h2 className="mx-auto mt-4 max-w-2xl text-balance font-display text-3xl font-semibold tracking-tight sm:text-5xl">Stop letting good leads wait.</h2>
          <p className="mx-auto mt-4 max-w-xl text-white/85">Connect a form, add your reps and watch the first lead get routed and booked — in under an hour.</p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link href="/signup" className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-full bg-white px-6 font-semibold text-primary-700 hover:bg-white/90 sm:w-auto">Start free<ArrowRight className="h-4 w-4" /></Link>
            <Link href="/contact" className="inline-flex h-12 w-full items-center justify-center rounded-full border border-white/40 px-6 font-semibold text-white hover:bg-white/10 sm:w-auto">Talk to us</Link>
          </div>
        </div>
      </div>
    </section>
  );
}
