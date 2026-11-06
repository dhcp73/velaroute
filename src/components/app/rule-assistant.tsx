"use client";
import { useEffect, useRef, useState } from "react";
import { ArrowRight, Check, MessageSquare, RotateCcw, Send } from "lucide-react";
import { useWs } from "./workspace";
import { Button, Card, Chip, Field, Input, Select, Textarea } from "@/components/ui";
import { conditionDescription, parseRuleDescription, type DescribedRule, type RuleDescription } from "@/lib/engine/rule-description";

export function RuleAssistant({ onManual }: { onManual: (rule: DescribedRule) => void }) {
  const { ws, dispatch, busy } = useWs();
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<{ who: "you" | "assistant"; text: string }[]>([]);
  const [result, setResult] = useState<RuleDescription | null>(null);
  const [name, setName] = useState("");
  const [position, setPosition] = useState("top");
  const [saved, setSaved] = useState(false);
  const conversation = useRef<HTMLDivElement>(null);
  useEffect(() => { const el = conversation.current; if (el) el.scrollTop = el.scrollHeight; }, [messages]);
  if (!ws) return null;
  const reset = () => { setResult(null); setMessages([]); setInput(""); setName(""); setSaved(false); };
  const describe = () => {
    if (!input.trim() || saved) return;
    const next = parseRuleDescription(input, ws.reps, result ?? undefined);
    const reply = next.questions.length ? next.questions.join("\n\n") : "Your draft is ready. Review the conditions, pool and position, then confirm to save. Nothing has changed yet.";
    setMessages((m) => [...m, { who: "you", text: input.trim() }, { who: "assistant", text: reply }]);
    setResult(next); setName(next.draft.name); setPosition(next.draft.conditions.length ? "top" : "bottom"); setInput("");
  };
  const confirm = async () => {
    if (!result || result.questions.length || !name.trim() || saved) return;
    const r = await dispatch({ type: "rule.save", rule: { ...result.draft, name: name.trim(), priority: position === "top" ? 0 : 999 } }, { success: "Routing rule saved" });
    if (r !== undefined) { setSaved(true); setMessages((m) => [...m, { who: "assistant", text: `Saved “${name.trim()}”. It's now in your rules list. You can reorder or edit it manually any time.` }]); }
  };
  return (
    <Card className="mb-5 overflow-hidden" data-rule-assistant>
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-4">
        <div><h2 className="flex items-center gap-2 text-sm font-semibold"><MessageSquare className="h-4 w-4 text-primary-500" />Describe a routing rule</h2><p className="mt-1 text-xs text-muted">A local language parser, not a paid model. You always review before saving.</p></div>
        <Button size="sm" variant="ghost" icon={<RotateCcw className="h-3.5 w-3.5" />} onClick={reset}>Start another draft</Button>
      </div>
      <div className="grid lg:grid-cols-2">
        <div className="min-w-0 border-b border-line p-5 lg:border-b-0 lg:border-r">
          <div ref={conversation} className="max-h-72 space-y-3 overflow-y-auto overscroll-contain pb-4" role="log" aria-label="Rule conversation" aria-live="polite">
            {!messages.length && <div className="rounded-xl bg-surface-2 p-4 text-sm leading-relaxed text-muted">Tell me which leads should go to which reps. I can use country, region, employee size, industry, domain, ICP, source and form answers. If a name or threshold is unclear, I&apos;ll ask.</div>}
            {messages.map((m, i) => <div key={i} className={m.who === "you" ? "ml-5 rounded-xl bg-primary-50 p-3 text-sm text-primary-900 dark:bg-primary-500/10 dark:text-primary-100" : "mr-3 rounded-xl bg-surface-2 p-3 text-sm"}><p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-muted">{m.who === "you" ? "You" : "Rule assistant"}</p><p className="whitespace-pre-wrap break-words leading-relaxed">{m.text}</p></div>)}
          </div>
          {!messages.length && <div className="mb-4 flex flex-col gap-2">{["EMEA companies over 50 employees between Jonas and Sofia", "Germany leads go to Jonas, everyone else round-robin"].map((example) => <button type="button" key={example} onClick={() => setInput(example)} className="rounded-lg border border-line p-2.5 text-left text-xs text-muted hover:border-primary-300 hover:text-ink">{example}<ArrowRight className="ml-1 inline h-3 w-3" /></button>)}</div>}
          <form onSubmit={(e) => { e.preventDefault(); describe(); }}>
            <Field label={result?.questions.length ? "Clarify your instructions" : "Rule instructions"} htmlFor="rule-instructions"><Textarea id="rule-instructions" value={input} disabled={saved} onChange={(e) => setInput(e.target.value)} placeholder="e.g. Germany leads with ICP at least 80 go to Jonas" className="min-h-24" /></Field>
            <div className="mt-3 flex flex-wrap items-center justify-between gap-2"><p className="text-[11px] text-muted">No API key needed · {saved ? "Draft saved" : "Nothing saved yet"}</p><Button type="submit" size="sm" icon={<Send className="h-3.5 w-3.5" />} disabled={!input.trim() || saved}>Preview rule</Button></div>
          </form>
        </div>
        <div className="min-w-0 p-5" data-rule-preview>
          <div className="mb-4 flex items-center justify-between gap-3"><h3 className="text-sm font-semibold">Review your draft</h3><Chip tone={saved ? "mint" : result?.questions.length ? "amber" : "slate"}>{saved ? "Saved" : result?.questions.length ? "Needs clarification" : "Not saved"}</Chip></div>
          {!result ? <div className="grid min-h-52 place-items-center rounded-xl border border-dashed border-line px-6 text-center text-sm text-muted">Your conditions and actual team members will appear here. No routing changes happen until you confirm.</div> : <>
            <Field label="Draft rule name" htmlFor="assistant-rule-name"><Input id="assistant-rule-name" value={name} onChange={(e) => setName(e.target.value)} disabled={saved} /></Field>
            <div className="mt-4 rounded-xl bg-surface-2 p-4 text-sm leading-relaxed"><p className="font-medium">{result.draft.conditions.length ? `When ${result.draft.conditions.map(conditionDescription).join(result.draft.match === "all" ? " and " : " or ")}` : "Match all leads (catch-all)"}</p><p className="mt-2 text-muted">{result.draft.repIds.length ? `Route to ${result.draft.repIds.map((id) => ws.reps.find((r) => r.id === id)?.name).join(" and ")} using the existing weighted round robin.` : "Choose or clarify the receiving reps."}</p></div>
            <p className="label mt-4">Structured conditions · {result.draft.match === "all" ? "ALL" : "ANY"}</p>
            <ul className="space-y-1.5">{result.draft.conditions.map((c, i) => <li key={i} className="break-words rounded-lg border border-line p-2 font-mono text-[11px]">{c.field}{c.key ? `.${c.key}` : ""} <strong>{c.op}</strong> {c.value}</li>)}{!result.draft.conditions.length && <li className="text-xs text-muted">No conditions — explicit catch-all.</li>}</ul>
            <div className="mt-4"><Field label="Rule position" htmlFor="assistant-rule-position"><Select id="assistant-rule-position" value={position} onChange={(e) => setPosition(e.target.value)} disabled={saved}><option value="top">Before existing rules</option><option value="bottom">After existing rules</option></Select></Field></div>
            <ul className="mt-3 space-y-1.5 text-xs leading-relaxed text-muted">{result.notes.map((n) => <li key={n}>{n}</li>)}</ul>
            {result.questions.length > 0 && <p className="mt-3 text-xs font-medium text-amber-700 dark:text-amber-300">Answer the clarification in the conversation before saving.</p>}
            <div className="mt-5 flex flex-wrap gap-2"><Button size="sm" loading={busy} icon={<Check className="h-4 w-4" />} onClick={confirm} disabled={saved || !!result.questions.length || !name.trim()}>Confirm &amp; save rule</Button><Button size="sm" variant="secondary" disabled={saved} onClick={() => onManual({ ...result.draft, name })}>Edit manually</Button></div>
          </>}
        </div>
      </div>
    </Card>
  );
}
