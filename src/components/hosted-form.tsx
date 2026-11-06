"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, CalendarCheck, CheckCircle2, Loader2 } from "lucide-react";
import type { Form, Workspace } from "@/lib/engine/types";
import { nextStep, validateStep } from "@/lib/engine/form-logic";
import { cn } from "@/lib/cn";
import { Avatar } from "@/components/ui";

const BROWSER = process.env.NEXT_PUBLIC_STORAGE_MODE === "browser";
type Result = { leadId: string; blocked: boolean; owner: { name: string; title: string; timezone: string; color: string; calendar: string } | null; slots: { start: string; end: string }[] };

function snapshot(wid: string): Workspace | undefined {
  if (!BROWSER) return undefined;
  try { const r = localStorage.getItem(`vr:ws:${wid}`); return r ? JSON.parse(r) : undefined; } catch { return undefined; }
}
function store(ws?: Workspace) { if (BROWSER && ws) try { localStorage.setItem(`vr:ws:${ws.id}`, JSON.stringify(ws)); } catch { /* ignore */ } }

export function HostedForm({ form, wid, preview = false, onSubmitted }: { form: Form; wid: string; preview?: boolean; onSubmitted?: () => void }) {
  const [stepId, setStepId] = useState(form.steps[0]?.id);
  const [history, setHistory] = useState<string[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [sending, setSending] = useState(false);
  const [serverError, setServerError] = useState("");
  const [result, setResult] = useState<Result | null>(null);
  const [booked, setBooked] = useState<string | null>(null);
  const [hp, setHp] = useState("");
  const started = useRef(Date.now());
  useEffect(() => { setStepId(form.steps[0]?.id); setHistory([]); setAnswers({}); setResult(null); setBooked(null); }, [form.id, form.steps]);
  const step = form.steps.find((s) => s.id === stepId) ?? form.steps[0];
  const next = useMemo(() => (step ? nextStep(form, step.id, answers) : "submit"), [form, step, answers]);
  const idx = form.steps.findIndex((s) => s.id === step?.id);
  if (!step) return <p className="text-sm text-muted">This form has no steps yet.</p>;

  const set = (id: string, v: string) => { setAnswers((a) => ({ ...a, [id]: v })); setErrors((e) => ({ ...e, [id]: "" })); };

  const advance = async () => {
    const errs = validateStep(form, step.id, answers);
    if (Object.keys(errs).length) { setErrors(errs); return; }
    if (next !== "submit") { setHistory((h) => [...h, step.id]); setStepId(next); return; }
    setSending(true); setServerError("");
    try {
      const utm = Object.fromEntries([...new URLSearchParams(typeof location !== "undefined" ? location.search : "")].filter(([k]) => k.startsWith("utm_")).map(([k, v]) => [k.slice(4), v]));
      const res = await fetch(`/api/public/forms/${wid}/${form.slug}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ answers, elapsedMs: Date.now() - started.current, hp, utm, preview, snapshot: snapshot(wid) }) });
      const j = await res.json();
      if (!res.ok) { setServerError(j.error?.detail ?? "Something went wrong"); if (j.fields) setErrors(j.fields); return; }
      store(j.ws);
      setResult(j);
      onSubmitted?.();
    } catch { setServerError("Network error — please try again"); } finally { setSending(false); }
  };

  const book = async (start: string) => {
    if (!result) return;
    setSending(true); setServerError("");
    try {
      const res = await fetch("/api/public/book", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ wid, leadId: result.leadId, start, snapshot: snapshot(wid) }) });
      const j = await res.json();
      if (!res.ok) { setServerError(j.error?.detail ?? "Could not book"); return; }
      store(j.ws);
      setBooked(start);
      onSubmitted?.();
    } finally { setSending(false); }
  };

  if (result) {
    return (
      <div className="text-center" aria-live="polite">
        <span className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-300"><CheckCircle2 className="h-7 w-7" /></span>
        {booked ? (
          <>
            <h2 className="mt-4 font-display text-2xl font-semibold">You&apos;re booked</h2>
            <p className="mt-2 text-sm text-muted">{new Intl.DateTimeFormat("en-GB", { dateStyle: "full", timeStyle: "short" }).format(new Date(booked))} with {result.owner?.name}. A calendar invite is on its way.</p>
          </>
        ) : (
          <>
            <h2 className="mt-4 font-display text-2xl font-semibold">Thanks — we&apos;ve got it</h2>
            {result.owner && result.slots.length ? (
              <>
                <div className="mx-auto mt-4 flex w-fit items-center gap-3 rounded-2xl bg-surface-2 px-4 py-3 text-left"><Avatar name={result.owner.name} color={result.owner.color} size={40} /><div><p className="text-sm font-semibold">{result.owner.name}</p><p className="text-xs text-muted">{result.owner.title}</p></div></div>
                <p className="mt-4 text-sm text-muted">Pick a time with {result.owner.name.split(" ")[0]} — times shown in your time zone.</p>
                <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {result.slots.slice(0, 9).map((s) => (
                    <button key={s.start} type="button" disabled={sending} onClick={() => book(s.start)} className="rounded-xl border border-line px-2 py-2.5 text-sm font-medium transition-colors hover:border-primary-400 hover:bg-primary-50 disabled:opacity-50 dark:hover:bg-primary-500/10">
                      {new Intl.DateTimeFormat("en-GB", { weekday: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }).format(new Date(s.start))}
                    </button>
                  ))}
                </div>
              </>
            ) : <p className="mt-2 text-sm text-muted">{result.blocked ? "Your message has been received." : "The right person on our team will reply shortly."}</p>}
          </>
        )}
        {serverError && <p className="mt-3 text-sm text-rose-600" role="alert">{serverError}</p>}
      </div>
    );
  }

  return (
    <form onSubmit={(e) => { e.preventDefault(); void advance(); }} noValidate>
      <div className="mb-5 flex items-center gap-2" aria-hidden>{form.steps.map((s, i) => <span key={s.id} className={cn("h-1.5 flex-1 rounded-full transition-colors", i <= idx ? "bg-primary-500" : "bg-line")} />)}</div>
      <h2 className="font-display text-xl font-semibold">{step.title}</h2>
      <div className="mt-4 grid gap-4">
        {step.fields.map((f) => {
          const id = `f-${form.id}-${f.id}`;
          const err = errors[f.id];
          return (
            <div key={f.id}>
              <label htmlFor={f.type === "buttons" ? undefined : id} id={`${id}-l`} className="label">{f.label}{f.required && <span className="text-rose-500"> *</span>}</label>
              {f.type === "buttons" ? (
                <div role="radiogroup" aria-labelledby={`${id}-l`} className="grid grid-cols-2 gap-2">
                  {(f.options ?? []).map((o) => <button key={o} type="button" role="radio" aria-checked={answers[f.id] === o} onClick={() => set(f.id, o)} className={cn("rounded-xl border px-3 py-2.5 text-sm font-medium transition-colors", answers[f.id] === o ? "border-primary-500 bg-primary-50 text-primary-900 dark:bg-primary-500/15 dark:text-primary-100" : "border-line hover:bg-surface-2")}>{o}</button>)}
                </div>
              ) : f.type === "select" ? (
                <select id={id} className="input h-10" value={answers[f.id] ?? ""} onChange={(e) => set(f.id, e.target.value)}><option value="">Choose…</option>{(f.options ?? []).map((o) => <option key={o}>{o}</option>)}</select>
              ) : f.type === "textarea" ? (
                <textarea id={id} className="input min-h-24" value={answers[f.id] ?? ""} placeholder={f.placeholder} onChange={(e) => set(f.id, e.target.value)} />
              ) : f.type === "checkbox" ? (
                <label className="flex items-center gap-2 text-sm"><input id={id} type="checkbox" className="h-4 w-4 accent-primary-500" checked={answers[f.id] === "yes"} onChange={(e) => set(f.id, e.target.checked ? "yes" : "")} />Yes</label>
              ) : (
                <input id={id} className="input" type={f.type === "email" ? "email" : f.type === "number" ? "number" : "text"} value={answers[f.id] ?? ""} placeholder={f.placeholder} autoComplete={f.type === "email" ? "email" : f.id === "name" ? "name" : f.id === "company" ? "organization" : undefined} onChange={(e) => set(f.id, e.target.value)} aria-invalid={!!err} />
              )}
              {err && <p className="mt-1 text-xs text-rose-600" role="alert">{err}</p>}
            </div>
          );
        })}
        <input type="text" tabIndex={-1} autoComplete="off" aria-hidden="true" className="absolute left-[-9999px] h-0 w-0 opacity-0" name="website" value={hp} onChange={(e) => setHp(e.target.value)} />
      </div>
      {serverError && <p className="mt-3 text-sm text-rose-600" role="alert">{serverError}</p>}
      <div className="mt-6 flex items-center justify-between gap-3">
        {history.length ? <button type="button" onClick={() => { const h = [...history]; const prev = h.pop()!; setHistory(h); setStepId(prev); }} className="inline-flex items-center gap-1 text-sm font-medium text-muted hover:text-ink"><ArrowLeft className="h-4 w-4" />Back</button> : <span />}
        <button type="submit" disabled={sending} className="inline-flex h-11 items-center gap-2 rounded-full bg-primary-500 px-6 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-primary-600 disabled:opacity-60">
          {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : next === "submit" ? <CalendarCheck className="h-4 w-4" /> : null}
          {next === "submit" ? (form.showBooking ? "Submit & pick a time" : "Submit") : "Continue"}{next !== "submit" && <ArrowRight className="h-4 w-4" />}
        </button>
      </div>
    </form>
  );
}
