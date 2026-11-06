import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { getSession } from "@/lib/server/auth";
import { WorkspaceProvider } from "@/components/app/workspace";
import { AppShell } from "@/components/app/shell";

export const metadata: Metadata = { title: "App", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const s = await getSession();
  if (!s) redirect("/login");
  return (
    <WorkspaceProvider wid={s.wid} user={{ name: s.name, email: s.email, role: s.role }}>
      <AppShell>{children}</AppShell>
    </WorkspaceProvider>
  );
}
