"use client";
import Link from "next/link";
import { useMemo, useState } from "react";
import { CalendarDays } from "lucide-react";
import { useWs } from "@/components/app/workspace";
import { Loading, PageHeader } from "@/components/app/shell";
import { Avatar, Card, Chip, Empty, Tabs } from "@/components/ui";
import { fmtDate } from "@/components/app/format";

export default function Meetings() {
  const { ws, now } = useWs();
  const [tab, setTab] = useState<"upcoming" | "past">("upcoming");
  const list = useMemo(() => (ws?.leads ?? []).filter((l) => l.meeting).filter((l) => tab === "upcoming" ? new Date(l.meeting!.end).getTime() >= now && l.meeting!.status === "booked" : new Date(l.meeting!.end).getTime() < now || l.meeting!.status !== "booked")
    .sort((a, b) => tab === "upcoming" ? a.meeting!.start.localeCompare(b.meeting!.start) : b.meeting!.start.localeCompare(a.meeting!.start)), [ws, tab, now]);
  if (!ws) return <Loading />;
  const held = ws.leads.filter((l) => l.meeting?.status === "held").length, noshow = ws.leads.filter((l) => l.meeting?.status === "no_show").length;
  return (
    <>
      <PageHeader title="Meetings" subtitle={`Booked straight from forms, chat and the inbox. Show rate ${held + noshow ? Math.round((held / (held + noshow)) * 100) : 100}% (${held} held, ${noshow} no-shows).`} />
      <Tabs value={tab} onChange={setTab} className="mb-4 w-fit" items={[{ id: "upcoming", label: "Upcoming" }, { id: "past", label: "Past" }]} />
      <Card>
        {list.length === 0 ? <Empty icon={<CalendarDays className="h-5 w-5" />} title={tab === "upcoming" ? "No upcoming meetings" : "No past meetings"} body="Meetings appear here when a lead books from a form or a rep books from the inbox." /> : (
          <ul className="divide-y divide-line">
            {list.map((l) => {
              const rep = ws.reps.find((r) => r.id === l.meeting!.repId);
              return (
                <li key={l.id}><Link href={`/app/leads/${l.id}`} className="flex flex-wrap items-center gap-3 px-5 py-4 hover:bg-surface-2 sm:flex-nowrap">
                  <div className="w-24 shrink-0 rounded-2xl bg-primary-50 p-2 text-center dark:bg-primary-500/10"><p className="text-xs font-medium text-primary-700 dark:text-primary-200">{fmtDate(l.meeting!.start, { weekday: "short", day: "numeric", month: "short" })}</p><p className="font-display text-lg font-semibold">{fmtDate(l.meeting!.start, { hour: "2-digit", minute: "2-digit" })}</p></div>
                  <div className="min-w-0 flex-1"><p className="truncate font-medium">{l.name} <span className="font-normal text-muted">· {l.company || l.domain}</span></p><p className="truncate text-sm text-muted">{l.meeting!.provider} · {ws.settings.meetingMinutes} min</p></div>
                  <span className="flex items-center gap-2"><Avatar name={rep?.name ?? "?"} color={rep?.color} size={26} /><span className="text-sm">{rep?.name}</span></span>
                  <Chip tone={l.meeting!.status === "booked" ? "violet" : l.meeting!.status === "held" ? "mint" : "rose"}>{l.meeting!.status.replace("_", "-")}</Chip>
                </Link></li>
              );
            })}
          </ul>
        )}
      </Card>
    </>
  );
}
