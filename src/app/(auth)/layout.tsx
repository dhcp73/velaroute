import Link from "next/link";
import { Logo } from "@/components/logo";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="auth-layout relative min-h-dvh overflow-hidden bg-bg">
      <div className="relative mx-auto flex min-h-dvh max-w-md flex-col px-5 py-8">
        <Logo />
        <main className="flex flex-1 items-center py-10">{children}</main>
        <p className="text-center text-xs text-faint"><Link href="/legal/privacy" className="hover:underline">Privacy</Link> · <Link href="/legal/terms" className="hover:underline">Terms</Link> · Built by <a href="https://github.com/rahulpatel84" className="hover:underline">Rahul Patel</a></p>
      </div>
    </div>
  );
}
