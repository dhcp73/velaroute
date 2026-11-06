"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { FileText, Plus } from "lucide-react";
import { useWs } from "@/components/app/workspace";
import { Loading, PageHeader } from "@/components/app/shell";
import { Button, Card, Chip, Empty, Field, Input, Modal } from "@/components/ui";
import { fmtDate } from "@/components/app/format";

export default function Forms() {
  const { ws, dispatch, busy } = useWs();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  if (!ws) return <Loading />;
  const create = async () => {
    const id = await dispatch<string>({ type: "form.create", name }, { success: "Form created" });
    if (id) { setOpen(false); setName(""); router.push(`/app/forms/${id}`); }
  };
  return (
    <>
      <PageHeader title="Forms" subtitle="Branching forms are one capture channel. Every submission runs the full pipeline and can book a meeting instantly." actions={<Button icon={<Plus className="h-4 w-4" />} onClick={() => setOpen(true)}>New form</Button>} />
      {ws.forms.length === 0 ? <Card><Empty icon={<FileText className="h-5 w-5" />} title="No forms yet" action={<Button onClick={() => setOpen(true)}>Create a form</Button>} /></Card> : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {ws.forms.map((f) => (
            <Link key={f.id} href={`/app/forms/${f.id}`} className="card group flex flex-col p-5 transition-shadow hover:shadow-lg hover:shadow-primary-500/5">
              <div className="flex items-center justify-between gap-2"><span className="grid h-10 w-10 place-items-center rounded-2xl bg-sky-soft text-sky-700 dark:bg-sky-500/15 dark:text-sky-200"><FileText className="h-5 w-5" /></span><Chip tone={f.status === "live" ? "mint" : "slate"} dot>{f.status}</Chip></div>
              <h2 className="mt-4 font-semibold group-hover:text-primary-700 dark:group-hover:text-primary-200">{f.name}</h2>
              <p className="mt-1 text-sm text-muted">{f.steps.length} step{f.steps.length === 1 ? "" : "s"} · {f.logic.length} branching rule{f.logic.length === 1 ? "" : "s"}{f.showBooking ? " · instant booking" : ""}</p>
              <div className="mt-4 grid grid-cols-3 gap-2 rounded-2xl bg-surface-2 p-3 text-center text-xs">
                <div><p className="font-display text-lg font-semibold">{f.submissions}</p><p className="text-muted">submissions</p></div>
                <div><p className="font-display text-lg font-semibold">{ws.leads.filter((l) => l.formId === f.id && l.meeting).length}</p><p className="text-muted">booked</p></div>
                <div><p className="font-display text-lg font-semibold">{f.views ? Math.round((f.submissions / f.views) * 100) : 0}%</p><p className="text-muted">conversion</p></div>
              </div>
              <p className="mt-3 text-xs text-faint">Created {fmtDate(f.createdAt, { dateStyle: "medium" })}</p>
            </Link>
          ))}
        </div>
      )}
      <Modal open={open} onClose={() => setOpen(false)} title="New form" footer={<><Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button><Button loading={busy} onClick={create}>Create</Button></>}>
        <Field label="Form name" htmlFor="nf-name" hint="Starts with name, work email and company. Add steps and branching next."><Input id="nf-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Pricing page demo request" onKeyDown={(e) => e.key === "Enter" && create()} /></Field>
      </Modal>
    </>
  );
}
