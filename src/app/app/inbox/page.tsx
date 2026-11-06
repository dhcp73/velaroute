"use client";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useMemo, useState } from "react";
import { Inbox as InboxIcon, Plus, Search, Zap } from "lucide-react";
import { useWs } from "@/components/app/workspace";
import { Loading, PageHeader } from "@/components/app/shell";
import { Avatar, Button, Card, Chip, Empty, Field, Input, Modal, Select, Tabs } from "@/components/ui";
import { ago, slaState, STAGE_LABEL } from "@/components/app/format";
import { StageChip } from "@/components/app/bits";
import { STAGES, type Lead } from "@/lib/engine/types";

type Tab = "all" | "needs" | "breached" | "review" | "meetings" | "spam";

function InboxInner() {
  const { ws, now, dispatch, busy } = useWs();
  const params = useSearchParams();
  const router = useRouter();
  const [tab, setTab] = useState<Tab>((params.get("tab") as Tab) || "all");
  const [q, setQ] = useState("");
  const [owner, setOwner] = useState("");
  const [stage, setStage] = useState("");
  const [source, setSource] = useState("");
  const [add, setAdd] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", company: "", title: "", message: "" });

  const counts = useMemo(() => {
    const L = ws?.leads ?? [];
    return {
      all: L.filter((l) => l.stage !== "spam").length,
      needs: L.filter((l) => l.slaDueAt && !l.firstTouchAt && l.stage !== "spam").length,
      breached: L.filter((l) => l.slaBreachedAt && !l.firstTouchAt).length,
      review: L.filter((l) => l.guard.verdict === "review" && l.stage !== "spam").length,
      meetings: L.filter((l) => l.meeting?.status === "booked").length,
      spam: L.filter((l) => l.stage === "spam").length,
    };
  }, [ws]);

  const rows = useMemo(() => {
    const s = q.trim().toLowerCase();
    return (ws?.leads ?? []).filter((l) => {
      if (tab === "all" && l.stage === "spam") return false;
      if (tab === "needs" && !(l.slaDueAt && !l.firstTouchAt && l.stage !== "spam")) return false;
      if (tab === "breached" && !(l.slaBreachedAt && !l.firstTouchAt)) return false;
      if (tab === "review" && !(l.guard.verdict === "review" && l.stage !== "spam")) return false;
      if (tab === "meetings" && l.meeting?.status !== "booked") return false;
      if (tab === "spam" && l.stage !== "spam") return false;
      if (owner && (owner === "none" ? l.ownerId : l.ownerId !== owner)) return false;
      if (stage && l.stage !== stage) return false;
      if (source && l.source !== source) return false;
      if (s && !`${l.name} ${l.email} ${l.company}`.toLowerCase().includes(s)) return false;
      return true;
    });
  }, [ws, tab, q, owner, stage, source]);

  if (!ws) return <Loading />;
  const create = async () => {
    const id = await dispatch<string>({ type: "lead.create", input: { source: "api", ...form } }, { success: "Lead added and routed" });
    if (id) { setAdd(false); setForm({ name: "", email: "", company: "", title: "", message: "" }); router.push(`/app/leads/${id}`); }
  };

  return (
    <>
      <PageHeader title="Inbox" subtitle="Every inbound lead with its owner, fit score and live SLA clock."
        actions={<>
          <Button variant="secondary" icon={<Zap className="h-4 w-4" />} loading={busy} onClick={() => dispatch({ type: "lead.simulate" }, { success: "Simulated lead routed" })}>Simulate</Button>
          <Button icon={<Plus className="h-4 w-4" />} onClick={() => setAdd(true)}>Add lead</Button>
        </>} />
      <Tabs value={tab} onChange={(t) => { setTab(t); router.replace(`/app/inbox?tab=${t}`, { scroll: false }); }} className="mb-4 w-full sm:w-fit" items={[
        { id: "all", label: "All", count: counts.all }, { id: "needs", label: "Needs reply", count: counts.needs }, { id: "breached", label: "Breached", count: counts.breached },
        { id: "review", label: "Review", count: counts.review }, { id: "meetings", label: "Meetings", count: counts.meetings }, { id: "spam", label: "Blocked", count: counts.spam },
      ]} />
      <Card>
        <div className="grid gap-3 border-b border-line p-4 sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_1fr]">
          <label className="relative block"><span className="sr-only">Search</span><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-faint" /><Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name, email, company" className="pl-9" /></label>
          <Select aria-label="Owner" value={owner} onChange={(e) => setOwner(e.target.value)}><option value="">All owners</option><option value="none">Unassigned</option>{ws.reps.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}</Select>
          <Select aria-label="Stage" value={stage} onChange={(e) => setStage(e.target.value)}><option value="">All stages</option>{STAGES.map((s) => <option key={s} value={s}>{STAGE_LABEL[s]}</option>)}</Select>
          <Select aria-label="Source" value={source} onChange={(e) => setSource(e.target.value)}><option value="">All sources</option>{["form", "chat", "email", "api", "booking"].map((s) => <option key={s} value={s}>{s[0].toUpperCase() + s.slice(1)}</option>)}</Select>
        </div>
        {rows.length === 0 ? <Empty icon={<InboxIcon className="h-5 w-5" />} title="No leads here" body="Try another tab or clear the filters." /> : (
          <>
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full text-sm">
                <thead><tr className="border-b border-line text-left text-xs uppercase tracking-wide text-faint">
                  <th className="px-4 py-3 font-medium">Lead</th><th className="px-4 py-3 font-medium">Owner</th><th className="px-4 py-3 font-medium">Fit</th><th className="px-4 py-3 font-medium">Stage</th><th className="px-4 py-3 font-medium">SLA</th><th className="px-4 py-3 font-medium">Source</th><th className="px-4 py-3 font-medium">Created</th>
                </tr></thead>
                <tbody>{rows.slice(0, 150).map((l) => <Row key={l.id} l={l} />)}</tbody>
              </table>
            </div>
            <ul className="divide-y divide-line md:hidden">{rows.slice(0, 100).map((l) => <MobileRow key={l.id} l={l} />)}</ul>
            <p className="border-t border-line px-4 py-3 text-xs text-faint">{rows.length} lead{rows.length === 1 ? "" : "s"}{rows.length > 150 ? " · showing the newest 150" : ""}</p>
          </>
        )}
      </Card>
      <Modal open={add} onClose={() => setAdd(false)} title="Add a lead" footer={<><Button variant="ghost" onClick={() => setAdd(false)}>Cancel</Button><Button loading={busy} onClick={create}>Add and route</Button></>}>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Full name" htmlFor="al-name"><Input id="al-name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
          <Field label="Work email" htmlFor="al-email"><Input id="al-email" type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="name@company.com" /></Field>
          <Field label="Company" htmlFor="al-co"><Input id="al-co" value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} /></Field>
          <Field label="Job title" htmlFor="al-title"><Input id="al-title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></Field>
          <Field label="Message" htmlFor="al-msg" className="sm:col-span-2"><Input id="al-msg" value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} /></Field>
        </div>
        <p className="mt-3 text-xs text-muted">The lead goes through the same pipeline as a form submission: guard, enrichment, matching, routing and the SLA clock.</p>
      </Modal>
    </>
  );

  function Row({ l }: { l: Lead }) {
    const owner = ws!.reps.find((r) => r.id === l.ownerId);
    const s = slaState(l, now, ws!.settings.slaMinutes);
    return (
      <tr className="cursor-pointer border-b border-line/70 last:border-0 hover:bg-surface-2" onClick={() => router.push(`/app/leads/${l.id}`)}>
        <td className="max-w-[280px] px-4 py-3"><Link href={`/app/leads/${l.id}`} className="block truncate font-medium hover:underline" onClick={(e) => e.stopPropagation()}>{l.name}</Link><span className="block truncate text-xs text-muted">{l.company || l.domain} · {l.email}</span></td>
        <td className="px-4 py-3"><span className="flex items-center gap-2">{owner ? <><Avatar name={owner.name} color={owner.color} size={24} /><span className="truncate">{owner.name.split(" ")[0]}</span></> : <span className="text-faint">—</span>}</span></td>
        <td className="px-4 py-3"><Chip tone={l.icpScore >= 70 ? "mint" : l.icpScore >= 40 ? "sky" : "slate"}>{l.icpScore}</Chip></td>
        <td className="px-4 py-3"><StageChip stage={l.stage} /></td>
        <td className="px-4 py-3"><Chip tone={s.tone} className="tabular-nums">{s.label}</Chip></td>
        <td className="px-4 py-3 capitalize text-muted">{l.source}</td>
        <td className="whitespace-nowrap px-4 py-3 text-muted">{ago(l.createdAt, now)}</td>
      </tr>
    );
  }
  function MobileRow({ l }: { l: Lead }) {
    const owner = ws!.reps.find((r) => r.id === l.ownerId);
    const s = slaState(l, now, ws!.settings.slaMinutes);
    return (
      <li><Link href={`/app/leads/${l.id}`} className="flex items-center gap-3 px-4 py-3 hover:bg-surface-2">
        <Avatar name={owner?.name ?? "?"} color={owner?.color} />
        <span className="min-w-0 flex-1"><span className="block truncate text-sm font-medium">{l.name}</span><span className="block truncate text-xs text-muted">{l.company || l.domain} · {ago(l.createdAt, now)}</span></span>
        <span className="flex flex-col items-end gap-1"><StageChip stage={l.stage} /><Chip tone={s.tone} className="tabular-nums">{s.label}</Chip></span>
      </Link></li>
    );
  }
}

export default function InboxPage() {
  return <Suspense fallback={<Loading />}><InboxInner /></Suspense>;
}
