"use client";
import { AnimatePresence, motion } from "framer-motion";
import { useRef, useState } from "react";
import { Loader2, MessageCircle, Send, X } from "lucide-react";

type Res = { owner: { name: string; title: string; color: string } | null; slots: { start: string }[]; blocked: boolean };

/** Website chat → Velaroute. Visitors leave a question; the demo workspace routes it instantly. */
export function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [v, setV] = useState({ name: "", email: "", message: "" });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [res, setRes] = useState<Res | null>(null);
  const opened = useRef(0);
  const send = async (e: React.FormEvent) => {
    e.preventDefault(); setBusy(true); setErr("");
    try {
      const r = await fetch("/api/public/chat", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ wid: "ws_demo", ...v, elapsedMs: Date.now() - opened.current }) });
      const j = await r.json();
      if (!r.ok) setErr(j.error?.detail ?? "Could not send"); else setRes(j);
    } catch { setErr("Network error"); } finally { setBusy(false); }
  };
  return (
    <div className="fixed bottom-5 right-5 z-[60] flex flex-col items-end gap-3">
      <AnimatePresence>
        {open && (
          <motion.div initial={{ opacity: 0, y: 16, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 16, scale: 0.97 }} transition={{ duration: 0.2 }}
            className="w-[min(calc(100vw-40px),360px)] overflow-hidden rounded-xl border border-line bg-surface shadow-2xl" role="dialog" aria-label="Chat with sales">
            <div className="bg-[#17191c] px-5 py-4 text-white"><p className="font-semibold">Talk to sales</p><p className="text-sm text-white/85">Routed to the right person in seconds.</p></div>
            {res ? (
              <div className="p-5 text-sm">
                {res.owner ? <><p><b>{res.owner.name}</b> ({res.owner.title}) has your message and will reply by email shortly.</p>{res.slots[0] && <p className="mt-2 text-muted">Prefer a call? {res.owner.name.split(" ")[0]} is free {new Intl.DateTimeFormat("en-GB", { weekday: "long", hour: "2-digit", minute: "2-digit" }).format(new Date(res.slots[0].start))}.</p>}</> : <p>Thanks — the team will be in touch.</p>}
                <p className="mt-3 text-xs text-faint">Routed by Velaroute: guard, enrich, match and route ran on your message just now.</p>
                <button type="button" className="mt-4 text-sm font-medium text-primary-600 hover:underline dark:text-primary-300" onClick={() => { setRes(null); setV({ name: "", email: "", message: "" }); }}>Send another</button>
              </div>
            ) : (
              <form onSubmit={send} className="grid gap-3 p-5">
                <label className="sr-only" htmlFor="cw-name">Name</label><input id="cw-name" className="input" placeholder="Your name" value={v.name} onChange={(e) => setV({ ...v, name: e.target.value })} />
                <label className="sr-only" htmlFor="cw-email">Work email</label><input id="cw-email" className="input" type="email" placeholder="Work email" required value={v.email} onChange={(e) => setV({ ...v, email: e.target.value })} />
                <label className="sr-only" htmlFor="cw-msg">Message</label><textarea id="cw-msg" className="input min-h-20" placeholder="How can we help?" required value={v.message} onChange={(e) => setV({ ...v, message: e.target.value })} />
                {err && <p className="text-xs text-rose-600" role="alert">{err}</p>}
                <button type="submit" disabled={busy} className="inline-flex h-10 items-center justify-center gap-2 rounded-full bg-primary-500 text-sm font-semibold text-white hover:bg-primary-600 disabled:opacity-60">{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}Send</button>
              </form>
            )}
          </motion.div>
        )}
      </AnimatePresence>
      <button type="button" onClick={() => { setOpen((o) => !o); opened.current = Date.now(); }} aria-label={open ? "Close chat" : "Open chat"} aria-expanded={open} className="grid h-14 w-14 place-items-center rounded-full bg-primary-500 text-white shadow-xl shadow-primary-500/30 transition-transform hover:scale-105 hover:bg-primary-600">
        {open ? <X className="h-6 w-6" /> : <MessageCircle className="h-6 w-6" />}
      </button>
    </div>
  );
}
