"use client";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ArrowDown, ArrowLeft, ArrowUp, Copy, ExternalLink, GitBranch, Plus, Save, Trash2, X } from "lucide-react";
import { useWs } from "@/components/app/workspace";
import { Loading } from "@/components/app/shell";
import { Button, Card, CardHeader, Chip, Empty, Field, Input, Modal, Select, Tabs, Toggle } from "@/components/ui";
import { HostedForm } from "@/components/hosted-form";
import type { FieldType, Form, FormField, LogicOp } from "@/lib/engine/types";
import { uid } from "@/lib/engine/util";

const TYPES: { id: FieldType; label: string }[] = [
  { id: "text", label: "Short text" }, { id: "email", label: "Email" }, { id: "number", label: "Number" }, { id: "textarea", label: "Long text" },
  { id: "buttons", label: "Choice buttons" }, { id: "select", label: "Dropdown" }, { id: "checkbox", label: "Checkbox" },
];
const OPS: { id: LogicOp; label: string }[] = [
  { id: "equals", label: "is" }, { id: "not_equals", label: "is not" }, { id: "contains", label: "contains" }, { id: "gte", label: "≥" }, { id: "lte", label: "≤" }, { id: "filled", label: "is answered" }, { id: "empty", label: "is empty" },
];

export default function FormBuilder() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { ws, dispatch, busy, toast, reload } = useWs();
  const saved = ws?.forms.find((f) => f.id === id);
  const [form, setForm] = useState<Form | null>(null);
  const [tab, setTab] = useState<"build" | "logic" | "share">("build");
  const [previewKey, setPreviewKey] = useState(0);
  const [del, setDel] = useState(false);
  useEffect(() => { if (saved && (!form || form.id !== saved.id)) setForm(structuredClone(saved)); }, [saved, form]);
  if (!ws) return <Loading />;
  if (!saved) return <Card><Empty title="Form not found" action={<Link href="/app/forms" className="text-sm font-medium text-primary-600">All forms</Link>} /></Card>;
  if (!form) return <Loading />;
  const dirty = JSON.stringify(form) !== JSON.stringify(saved);
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const url = `${origin}/f/${ws.id}/${form.slug}`;

  const upd = (f: Partial<Form>) => setForm({ ...form, ...f });
  const updField = (si: number, fi: number, patch: Partial<FormField>) => { const steps = structuredClone(form.steps); steps[si].fields[fi] = { ...steps[si].fields[fi], ...patch }; upd({ steps }); };
  const save = async () => { const r = await dispatch({ type: "form.save", form }, { success: "Form saved" }); if (r !== undefined) setPreviewKey((k) => k + 1); };
  const copy = (t: string) => { void navigator.clipboard?.writeText(t); toast("Copied to clipboard"); };
  const embed = `<iframe src="${url}?embed=1" style="width:100%;min-height:560px;border:0" title="${form.name}"></iframe>`;

  return (
    <div className="form-builder">
      <Link href="/app/forms" className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted hover:text-ink"><ArrowLeft className="h-4 w-4" />Forms</Link>
      <div className="form-editor-toolbar mb-6 flex flex-wrap items-center gap-4">
        <Input aria-label="Form name" value={form.name} onChange={(e) => upd({ name: e.target.value })} className="form-name h-12 w-full max-w-none font-display text-xl font-semibold sm:max-w-sm" />
        <label className="flex items-center gap-2 text-sm"><Toggle checked={form.status === "live"} label="Live" onChange={(v) => upd({ status: v ? "live" : "draft" })} />{form.status === "live" ? "Live" : "Draft"}</label>
        <label className="flex items-center gap-2 text-sm"><Toggle checked={form.showBooking} label="Instant booking" onChange={(v) => upd({ showBooking: v })} />Instant booking</label>
        <div className="ml-auto flex gap-2">
          {dirty && <Chip tone="amber">Unsaved changes</Chip>}
          <Button size="sm" variant="ghost" icon={<Trash2 className="h-4 w-4" />} onClick={() => setDel(true)}>Delete</Button>
          <Button size="sm" icon={<Save className="h-4 w-4" />} loading={busy} disabled={!dirty} onClick={save}>Save</Button>
        </div>
      </div>
      <div data-form-canvas className="grid items-start gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
        <div className="min-w-0">
          <Tabs value={tab} onChange={setTab} className="mb-5 max-w-full w-fit" items={[{ id: "build", label: "Steps & fields" }, { id: "logic", label: "Branching", count: form.logic.length }, { id: "share", label: "Share & embed" }]} />
          {tab === "build" && (
            <div className="flex flex-col gap-4">
              {form.steps.map((s, si) => (
                <Card key={s.id} className="builder-step p-4 sm:p-5">
                  <div className="flex items-center gap-3 border-b border-line pb-4">
                    <Chip tone="violet">Step {si + 1}</Chip>
                    <Input aria-label={`Step ${si + 1} title`} value={s.title} onChange={(e) => { const steps = structuredClone(form.steps); steps[si].title = e.target.value; upd({ steps }); }} className="h-11 flex-1 font-semibold" />
                    <button type="button" disabled={form.steps.length === 1} className="rounded-full p-2 text-muted hover:bg-rose-50 hover:text-rose-600 disabled:opacity-30" aria-label="Delete step" onClick={() => upd({ steps: form.steps.filter((x) => x.id !== s.id), logic: form.logic.filter((l) => l.stepId !== s.id && l.goto !== s.id) })}><Trash2 className="h-4 w-4" /></button>
                  </div>
                  <ul className="mt-5 flex flex-col gap-4">
                    {s.fields.map((f, fi) => (
                      <li key={f.id + fi} className="builder-field rounded-xl border border-line bg-surface p-4">
                        <label className="mb-2 block text-xs font-semibold text-muted" htmlFor={`label-${si}-${fi}`}>Question {fi + 1}</label>
                        <Input id={`label-${si}-${fi}`} aria-label="Field label" className="h-11 text-[15px] font-semibold" value={f.label} onChange={(e) => updField(si, fi, { label: e.target.value })} />
                        <div className="field-settings mt-4 flex flex-wrap items-center gap-3">
                          <Select className="field-type" aria-label="Field type" value={f.type} onChange={(e) => updField(si, fi, { type: e.target.value as FieldType, options: ["buttons", "select"].includes(e.target.value) ? f.options ?? ["Option A", "Option B"] : undefined })}>{TYPES.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}</Select>
                          <div className="field-actions flex flex-1 items-center justify-end gap-1">
                            <label className="mr-auto flex items-center gap-2 pr-3 text-xs font-medium text-muted"><input type="checkbox" className="h-4 w-4 accent-primary-500" checked={!!f.required} onChange={(e) => updField(si, fi, { required: e.target.checked })} />Required</label>
                            <button type="button" disabled={fi === 0} className="rounded-full p-1.5 text-muted hover:bg-surface disabled:opacity-30" aria-label="Move field up" onClick={() => { const steps = structuredClone(form.steps); const a = steps[si].fields; [a[fi - 1], a[fi]] = [a[fi], a[fi - 1]]; upd({ steps }); }}><ArrowUp className="h-4 w-4" /></button>
                            <button type="button" disabled={fi === s.fields.length - 1} className="rounded-full p-1.5 text-muted hover:bg-surface disabled:opacity-30" aria-label="Move field down" onClick={() => { const steps = structuredClone(form.steps); const a = steps[si].fields; [a[fi + 1], a[fi]] = [a[fi], a[fi + 1]]; upd({ steps }); }}><ArrowDown className="h-4 w-4" /></button>
                            <button type="button" className="rounded-full p-1.5 text-muted hover:bg-surface hover:text-rose-600" aria-label="Remove field" onClick={() => { const steps = structuredClone(form.steps); steps[si].fields.splice(fi, 1); upd({ steps, logic: form.logic.filter((l) => !(l.stepId === s.id && l.fieldId === f.id)) }); }}><X className="h-4 w-4" /></button>
                          </div>
                        </div>
                        {(f.type === "buttons" || f.type === "select") && (
                          <fieldset className="mt-4 border-t border-line pt-4">
                            <legend className="float-left mb-3 w-full text-xs font-semibold text-muted">Answer options</legend>
                            <div className="clear-both grid gap-2">
                              {(f.options ?? []).map((option, oi) => <div key={oi} className="flex items-center gap-2">
                                <span className="w-5 shrink-0 text-center text-xs text-faint">{oi + 1}</span>
                                <Input aria-label={`Option ${oi + 1}`} value={option} onChange={(e) => updField(si, fi, { options: (f.options ?? []).map((o, i) => i === oi ? e.target.value : o) })} />
                                <button type="button" aria-label={`Remove option ${oi + 1}`} className="rounded-lg p-2 text-muted hover:bg-surface-2 hover:text-rose-600" onClick={() => updField(si, fi, { options: f.options?.filter((_, i) => i !== oi) })}><X className="h-4 w-4" /></button>
                              </div>)}
                            </div>
                            <Button size="sm" variant="ghost" className="mt-2" icon={<Plus className="h-3.5 w-3.5" />} onClick={() => updField(si, fi, { options: [...(f.options ?? []), `Option ${(f.options?.length ?? 0) + 1}`] })}>Add option</Button>
                          </fieldset>
                        )}
                        <details className="mt-3 text-xs text-faint"><summary className="w-fit cursor-pointer rounded py-1 hover:text-ink">Advanced</summary><p className="mt-2 break-all">Field ID <code className="ml-2 rounded bg-surface-2 px-2 py-1">{f.id}</code></p></details>
                      </li>
                    ))}
                  </ul>
                  <Button size="sm" variant="ghost" className="mt-4 w-full rounded-lg border border-dashed border-line" icon={<Plus className="h-4 w-4" />} onClick={() => { const steps = structuredClone(form.steps); steps[si].fields.push({ id: `q_${uid("f").slice(-5)}`, label: "New question", type: "text" }); upd({ steps }); }}>Add field</Button>
                </Card>
              ))}
              <Button variant="secondary" icon={<Plus className="h-4 w-4" />} onClick={() => upd({ steps: [...form.steps, { id: uid("stp"), title: "New step", fields: [] }] })}>Add step</Button>
            </div>
          )}
          {tab === "logic" && (
            <Card>
              <CardHeader title="Branching rules" subtitle="On each step, the first matching rule picks the next step. If none match, the form goes to the next step in order." action={<GitBranch className="h-5 w-5 text-primary-500" />} />
              <div className="flex flex-col gap-2 p-5">
                {form.logic.length === 0 && <p className="text-sm text-muted">No rules — the form runs step by step.</p>}
                {form.logic.map((r, i) => {
                  const step = form.steps.find((s) => s.id === r.stepId);
                  const setR = (p: Partial<typeof r>) => { const logic = [...form.logic]; logic[i] = { ...r, ...p }; upd({ logic }); };
                  return (
                    <div key={r.id} className="grid gap-2 rounded-lg bg-surface-2 p-3 2xl:grid-cols-2 2xl:items-center">
                      <Select aria-label="On step" value={r.stepId} onChange={(e) => setR({ stepId: e.target.value, fieldId: form.steps.find((s) => s.id === e.target.value)?.fields[0]?.id ?? "" })}>{form.steps.map((s, k) => <option key={s.id} value={s.id}>On step {k + 1}</option>)}</Select>
                      <Select aria-label="If field" value={r.fieldId} onChange={(e) => setR({ fieldId: e.target.value })}>{(step?.fields ?? []).map((f) => <option key={f.id} value={f.id}>{f.label}</option>)}</Select>
                      <Select aria-label="Operator" value={r.op} onChange={(e) => setR({ op: e.target.value as LogicOp })}>{OPS.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}</Select>
                      {["filled", "empty"].includes(r.op) ? <span className="text-xs text-faint">—</span> : (() => { const fd = step?.fields.find((f) => f.id === r.fieldId); return fd?.options ? <Select aria-label="Value" value={r.value} onChange={(e) => setR({ value: e.target.value })}><option value="">Choose…</option>{fd.options.map((o) => <option key={o}>{o}</option>)}</Select> : <Input aria-label="Value" value={r.value} onChange={(e) => setR({ value: e.target.value })} placeholder="value" />; })()}
                      <Select aria-label="Go to" value={r.goto} onChange={(e) => setR({ goto: e.target.value })}>{form.steps.map((s, k) => <option key={s.id} value={s.id}>→ Step {k + 1}: {s.title}</option>)}<option value="submit">→ Submit</option></Select>
                      <button type="button" className="justify-self-end rounded-full p-2 text-muted hover:bg-surface hover:text-rose-600" aria-label="Remove rule" onClick={() => upd({ logic: form.logic.filter((x) => x.id !== r.id) })}><X className="h-4 w-4" /></button>
                    </div>
                  );
                })}
                <Button size="sm" variant="tonal" className="self-start" icon={<Plus className="h-4 w-4" />} onClick={() => upd({ logic: [...form.logic, { id: uid("lg"), stepId: form.steps[0].id, fieldId: form.steps[0].fields[0]?.id ?? "", op: "equals", value: "", goto: "submit" }] })}>Add rule</Button>
              </div>
            </Card>
          )}
          {tab === "share" && (
            <Card className="p-5">
              <Field label="Hosted link" htmlFor="share-url"><div className="flex gap-2"><Input id="share-url" readOnly value={url} /><Button variant="secondary" icon={<Copy className="h-4 w-4" />} onClick={() => copy(url)}>Copy</Button></div></Field>
              <a href={url} target="_blank" rel="noreferrer" className="mt-2 inline-flex items-center gap-1 text-sm font-medium text-primary-600 hover:underline dark:text-primary-300">Open hosted form <ExternalLink className="h-3.5 w-3.5" /></a>
              <Field label="Embed on your site" htmlFor="embed" className="mt-5"><textarea id="embed" readOnly className="input min-h-24 font-mono text-xs" value={embed} /></Field>
              <Button size="sm" variant="secondary" className="mt-2" icon={<Copy className="h-4 w-4" />} onClick={() => copy(embed)}>Copy embed code</Button>
              <Field label="Or post from your own form (headless)" htmlFor="curl" className="mt-5"><textarea id="curl" readOnly className="input min-h-24 font-mono text-xs" value={`curl -X POST ${origin}/api/public/forms/${ws.id}/${form.slug} \\\n  -H 'Content-Type: application/json' \\\n  -d '{"answers":{"name":"Jordan Lee","email":"jordan@acme.com"}}'`} /></Field>
              {form.status !== "live" && <p className="mt-3 text-sm text-amber-700 dark:text-amber-300">This form is a draft — switch it to Live and save to accept submissions.</p>}
            </Card>
          )}
        </div>
        <div className="min-w-0">
          <Card className="builder-preview xl:sticky xl:top-20">
            <CardHeader title="Live preview" subtitle={dirty ? "Showing unsaved changes. Preview submissions create real leads." : "Matches your hosted form. Submitting creates a real lead."} action={<Button size="sm" variant="ghost" onClick={() => setPreviewKey((k) => k + 1)}>Reset</Button>} />
            <div className="p-4 sm:p-5"><div className="rounded-xl border border-line bg-white p-5 sm:p-7"><HostedForm key={previewKey} form={form} wid={ws.id} preview onSubmitted={() => void reload()} /></div></div>
          </Card>
        </div>
      </div>
      <Modal open={del} onClose={() => setDel(false)} title="Delete form?" footer={<><Button variant="ghost" onClick={() => setDel(false)}>Cancel</Button><Button variant="danger" onClick={async () => { await dispatch({ type: "form.delete", formId: form.id }, { success: "Form deleted" }); router.push("/app/forms"); }}>Delete</Button></>}>
        <p className="text-sm text-muted">The hosted link stops working. Leads already captured stay in the inbox.</p>
      </Modal>
    </div>
  );
}
