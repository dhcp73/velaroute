import Link from "next/link";
import { Logo } from "@/components/logo";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative min-h-dvh overflow-hidden bg-bg">
      <div className="pointer-events-none absolute -left-40 -top-40 h-[480px] w-[480px] rounded-full bg-primary-300/30 blur-3xl dark:bg-primary-500/15" aria-hidden />
      <div className="pointer-events-none absolute -bottom-40 -right-40 h-[480px] w-[480px] rounded-full bg-sky-300/30 blur-3xl dark:bg-sky-500/10" aria-hidden />
      <div className="relative mx-auto flex min-h-dvh max-w-md flex-col px-5 py-8">
        <Logo />
        <main className="flex flex-1 items-center py-10">{children}</main>
        <p className="text-center text-xs text-faint"><Link href="/legal/privacy" className="hover:underline">Privacy</Link> · <Link href="/legal/terms" className="hover:underline">Terms</Link> · Built by <a href="https://github.com/rahulpatel84" className="hover:underline">Rahul Patel</a></p>
      </div>
    </div>
  );
}
