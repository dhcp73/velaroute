"use client";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { migratePlan } from "@/lib/plans";
import type { Workspace } from "@/lib/engine/types";
import type { Action } from "@/lib/server/service";
import { CheckCircle2, AlertCircle } from "lucide-react";

export const BROWSER_MODE = process.env.NEXT_PUBLIC_STORAGE_MODE === "browser";
export const snapKey = (wid: string) => `vr:ws:${wid}`;

export function readSnapshot(wid: string): Workspace | undefined {
  if (typeof window === "undefined") return undefined;
  try { const raw = localStorage.getItem(snapKey(wid)); return raw ? migratePlan(JSON.parse(raw) as Workspace) : undefined; } catch { return undefined; }
}
export function writeSnapshot(ws: Workspace) {
  try { localStorage.setItem(snapKey(ws.id), JSON.stringify(ws)); } catch { /* quota — demo only */ }
}

interface Toast { id: number; text: string; tone: "ok" | "error" }
interface Ctx {
  ws: Workspace | null;
  user: { name: string; email: string; role: string };
  dispatch: <T = unknown>(a: Action, opts?: { quiet?: boolean; success?: string }) => Promise<T | undefined>;
  busy: boolean;
  toast: (text: string, tone?: "ok" | "error") => void;
  now: number;
  reload: () => Promise<void>;
}
const WsCtx = createContext<Ctx | null>(null);

export function useWs(): Ctx {
  const c = useContext(WsCtx);
  if (!c) throw new Error("useWs outside provider");
  return c;
}

export function WorkspaceProvider({ wid, user, children }: { wid: string; user: Ctx["user"]; children: ReactNode }) {
  const [ws, setWs] = useState<Workspace | null>(null);
  const [busy, setBusy] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [now, setNow] = useState(() => Date.now());
  const wsRef = useRef<Workspace | null>(null);
  const tid = useRef(0);

  const apply = useCallback((next: Workspace) => {
    wsRef.current = next;
    setWs(next);
    if (BROWSER_MODE) writeSnapshot(next);
  }, []);

  const toast = useCallback((text: string, tone: "ok" | "error" = "ok") => {
    const id = ++tid.current;
    setToasts((t) => [...t.slice(-3), { id, text, tone }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4200);
  }, []);

  const post = useCallback(async (a: Action) => {
    const res = await fetch("/api/app/action", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: a, snapshot: BROWSER_MODE ? wsRef.current ?? readSnapshot(wid) : undefined }) });
    if (res.status === 401) { window.location.href = "/login?next=" + encodeURIComponent(location.pathname); throw new Error("Signed out"); }
    const j = (await res.json().catch(() => ({}))) as { ws?: Workspace; result?: unknown; error?: { detail?: string } };
    if (!res.ok || !j.ws) throw new Error(j.error?.detail || `Request failed (${res.status})`);
    apply(j.ws);
    return j.result;
  }, [apply, wid]);

  const reload = useCallback(async () => {
    const snap = BROWSER_MODE ? readSnapshot(wid) : undefined;
    if (snap && snap.id === wid) { apply(snap); try { await post({ type: "tick" }); } catch { /* offline */ } return; }
    const res = await fetch("/api/app/state", { cache: "no-store" });
    if (res.status === 401) { window.location.href = "/login"; return; }
    const j = (await res.json()) as { ws: Workspace };
    apply(j.ws);
  }, [apply, post, wid]);

  useEffect(() => { void reload(); }, [reload]);
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    const k = setInterval(() => { if (document.visibilityState === "visible") void post({ type: "tick" }).catch(() => undefined); }, 30000);
    return () => { clearInterval(t); clearInterval(k); };
  }, [post]);

  const dispatch = useCallback(async <T,>(a: Action, opts?: { quiet?: boolean; success?: string }): Promise<T | undefined> => {
    setBusy(true);
    try {
      const r = (await post(a)) as T;
      if (opts?.success) toast(opts.success);
      return r;
    } catch (e) {
      if (!opts?.quiet) toast((e as Error).message, "error");
      return undefined;
    } finally { setBusy(false); }
  }, [post, toast]);

  const value = useMemo(() => ({ ws, user, dispatch, busy, toast, now, reload }), [ws, user, dispatch, busy, toast, now, reload]);
  return (
    <WsCtx.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed bottom-4 left-1/2 z-[120] flex w-[min(92vw,420px)] -translate-x-1/2 flex-col gap-2" aria-live="polite">
        {toasts.map((t) => (
          <div key={t.id} className="pointer-events-auto flex items-start gap-2 rounded-lg border border-line bg-surface px-4 py-3 text-sm shadow-lg" role="status">
            {t.tone === "ok" ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" /> : <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-500" />}
            <span>{t.text}</span>
          </div>
        ))}
      </div>
    </WsCtx.Provider>
  );
}
