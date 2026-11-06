"use client";
import { useEffect, useState } from "react";
import type { Form, Workspace } from "@/lib/engine/types";
import { HostedForm } from "@/components/hosted-form";
import { LogoMark } from "@/components/logo";

/** In demo (browser) mode the owner's edits live in localStorage, so prefer that copy of the form when present. */
export function PublicForm({ wid, slug, initial, workspace, embed }: { wid: string; slug: string; initial: Form | null; workspace: string; embed: boolean }) {
  const [form, setForm] = useState<Form | null>(initial);
  const [ready, setReady] = useState(process.env.NEXT_PUBLIC_STORAGE_MODE !== "browser");
  useEffect(() => {
    if (process.env.NEXT_PUBLIC_STORAGE_MODE === "browser") {
      try { const ws = JSON.parse(localStorage.getItem(`vr:ws:${wid}`) || "null") as Workspace | null; const f = ws?.forms.find((x) => x.slug === slug); if (f) setForm(f); } catch { /* ignore */ }
      setReady(true);
    }
  }, [wid, slug]);
  if (!ready) return <div className="min-h-dvh bg-bg" />;
  return (
    <div className={embed ? "bg-transparent p-2" : "relative min-h-dvh overflow-hidden bg-bg px-4 py-10"}>
      <main className="relative mx-auto w-full max-w-xl">
        {!embed && <p className="mb-6 text-center text-sm font-medium text-muted">{workspace}</p>}
        <div className="card p-6 shadow-xl shadow-primary-500/5 sm:p-8">
          {!form ? <p className="text-center text-sm text-muted">This form doesn&apos;t exist or was removed.</p> : form.status !== "live" ? <p className="text-center text-sm text-muted">This form isn&apos;t accepting responses right now.</p> : <HostedForm form={form} wid={wid} />}
        </div>
        {!embed && <p className="mt-6 flex items-center justify-center gap-1.5 text-xs text-faint"><LogoMark className="h-4 w-4" />Powered by Velaroute</p>}
      </main>
    </div>
  );
}
