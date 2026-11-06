"use client";
import { useParams, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { CalendarDays, Video } from "lucide-react";
import type { Meeting, Workspace } from "@/lib/engine/types";
import { Logo } from "@/components/logo";

type Info = { meeting: Meeting; with: { name: string; title: string } | null; guest: string; company: string };

function Inner() {
  const { id } = useParams<{ id: string }>();
  const w = useSearchParams().get("w") || "ws_demo";
  const [info, setInfo] = useState<Info | null>(null);
  const [missing, setMissing] = useState(false);
  useEffect(() => {
    try {
      const ws = JSON.parse(localStorage.getItem(`vr:ws:${w}`) || "null") as Workspace | null;
      const lead = ws?.leads.find((l) => l.meeting?.id === id);
      if (ws && lead?.meeting) { const rep = ws.reps.find((r) => r.id === lead.meeting!.repId); setInfo({ meeting: lead.meeting, with: rep ? { name: rep.name, title: rep.title } : null, guest: lead.name.split(" ")[0], company: ws.name }); return; }
    } catch { /* ignore */ }
    fetch(`/api/public/meeting?w=${encodeURIComponent(w)}&id=${encodeURIComponent(id)}`).then(async (r) => (r.ok ? setInfo(await r.json()) : setMissing(true))).catch(() => setMissing(true));
  }, [id, w]);
  return (
    <div className="min-h-dvh bg-bg px-4 py-10">
      <div className="mx-auto max-w-lg"><Logo />
        <div className="card mt-8 p-6 sm:p-8">
          {missing ? <p className="text-sm text-muted">This meeting link isn&apos;t valid any more.</p> : !info ? <p className="text-sm text-muted">Loading…</p> : (
            <>
              <span className="grid h-12 w-12 place-items-center rounded-2xl bg-primary-100 text-primary-700 dark:bg-primary-500/15 dark:text-primary-200"><Video className="h-6 w-6" /></span>
              <h1 className="mt-4 font-display text-2xl font-semibold">{info.company} × {info.guest}</h1>
              <p className="mt-2 flex items-center gap-2 text-sm text-muted"><CalendarDays className="h-4 w-4" />{new Intl.DateTimeFormat("en-GB", { dateStyle: "full", timeStyle: "short" }).format(new Date(info.meeting.start))}</p>
              <p className="mt-1 text-sm text-muted">With {info.with?.name} ({info.with?.title}) · {info.meeting.provider}</p>
              <p className="mt-5 rounded-2xl bg-surface-2 p-4 text-sm text-muted">The video link is added to the calendar invite once the rep&apos;s Google or Microsoft calendar is connected. In this demo the meeting is recorded in Velaroute only.</p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
export default function MeetingPage() { return <Suspense><Inner /></Suspense>; }
