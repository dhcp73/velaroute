"use client";
import { useState } from "react";
import { Building2, Pencil, Plus, Trash2 } from "lucide-react";
import { useWs } from "@/components/app/workspace";
import { Loading, PageHeader } from "@/components/app/shell";
import { Avatar, Button, Card, Chip, Empty, Field, Input, Modal, Select } from "@/components/ui";
import type { Account } from "@/lib/engine/types";

const BLANK = { id: "", domain: "", name: "", ownerId: "", stage: "prospect" as Account["stage"] };

export default function Accounts() {
  const { ws, dispatch, busy } = useWs();
  const [edit, setEdit] = useState<typeof BLANK | null>(null);
  if (!ws) return <Loading />;
  const save = async () => {
    if (!edit) return;
    const r = await dispatch({ type: "account.save", account: { ...edit, id: edit.id || undefined } }, { success: "Account saved" });
    if (r !== undefined) setEdit(null);
  };
  return (
    <>
      <PageHeader title="Accounts" subtitle="Known companies and their owners. Leads from these domains go straight to the owner (account stickiness)." actions={<Button icon={<Plus className="h-4 w-4" />} onClick={() => setEdit({ ...BLANK, ownerId: ws.reps[0]?.id ?? "" })}>Add account</Button>} />
      <Card>
        {ws.accounts.length === 0 ? <Empty icon={<Building2 className="h-5 w-5" />} title="No accounts yet" body="Add your customers and open opportunities so their new leads go to the right owner." /> : (
          <ul className="divide-y divide-line">
            {ws.accounts.map((a) => {
              const owner = ws.reps.find((r) => r.id === a.ownerId);
              const leads = ws.leads.filter((l) => l.accountId === a.id).length;
              return (
                <li key={a.id} className="flex flex-wrap items-center gap-3 px-5 py-4 sm:flex-nowrap">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-surface-2 font-display font-semibold">{a.name[0]}</span>
                  <div className="min-w-0 flex-1"><p className="truncate font-medium">{a.name}</p><p className="truncate text-sm text-muted">{a.domain} · {a.employees.toLocaleString()} employees · {a.industry || "—"}</p></div>
                  <Chip tone={a.stage === "customer" ? "mint" : a.stage === "open_opp" ? "sky" : "slate"}>{a.stage.replace("_", " ")}</Chip>
                  <span className="hidden text-sm text-muted md:inline">{leads} lead{leads === 1 ? "" : "s"}</span>
                  <span className="flex items-center gap-2"><Avatar name={owner?.name ?? "?"} color={owner?.color} size={26} /><span className="text-sm">{owner?.name ?? "—"}</span>{owner && !owner.available && <Chip tone="amber">away</Chip>}</span>
                  <span className="flex gap-1">
                    <button type="button" className="rounded-full p-2 text-muted hover:bg-surface-2 hover:text-ink" aria-label={`Edit ${a.name}`} onClick={() => setEdit({ id: a.id, domain: a.domain, name: a.name, ownerId: a.ownerId, stage: a.stage })}><Pencil className="h-4 w-4" /></button>
                    <button type="button" className="rounded-full p-2 text-muted hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-500/10" aria-label={`Delete ${a.name}`} onClick={() => dispatch({ type: "account.delete", accountId: a.id }, { success: "Account removed" })}><Trash2 className="h-4 w-4" /></button>
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </Card>
      <Modal open={!!edit} onClose={() => setEdit(null)} title={edit?.id ? "Edit account" : "Add account"} footer={<><Button variant="ghost" onClick={() => setEdit(null)}>Cancel</Button><Button loading={busy} onClick={save}>Save</Button></>}>
        {edit && <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Company name" htmlFor="ac-name"><Input id="ac-name" value={edit.name} onChange={(e) => setEdit({ ...edit, name: e.target.value })} /></Field>
          <Field label="Domain" htmlFor="ac-dom"><Input id="ac-dom" value={edit.domain} onChange={(e) => setEdit({ ...edit, domain: e.target.value })} placeholder="acme.com" /></Field>
          <Field label="Owner" htmlFor="ac-own"><Select id="ac-own" value={edit.ownerId} onChange={(e) => setEdit({ ...edit, ownerId: e.target.value })}>{ws.reps.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}</Select></Field>
          <Field label="Stage" htmlFor="ac-stage"><Select id="ac-stage" value={edit.stage} onChange={(e) => setEdit({ ...edit, stage: e.target.value as Account["stage"] })}><option value="prospect">Prospect</option><option value="open_opp">Open opportunity</option><option value="customer">Customer</option></Select></Field>
        </div>}
      </Modal>
    </>
  );
}
