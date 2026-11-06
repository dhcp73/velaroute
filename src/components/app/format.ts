import type { Lead, Stage } from "@/lib/engine/types";
import type { Tone } from "@/components/ui";

export const STAGE_TONE: Record<Stage, Tone> = { new: "violet", working: "sky", meeting: "mint", qualified: "mint", won: "mint", lost: "slate", spam: "rose" };
export const STAGE_LABEL: Record<Stage, string> = { new: "New", working: "Working", meeting: "Meeting", qualified: "Qualified", won: "Won", lost: "Lost", spam: "Spam" };

export function ago(iso: string | undefined, now: number): string {
  if (!iso) return "—";
  const s = Math.round((now - new Date(iso).getTime()) / 1000);
  if (s < 0) return "in " + dur(-s);
  if (s < 45) return "just now";
  return dur(s) + " ago";
}
export function dur(s: number): string {
  if (s < 60) return `${s}s`;
  const m = Math.round(s / 60);
  if (m < 60) return `${m}m`;
  const h = Math.round(m / 60);
  if (h < 48) return `${h}h`;
  return `${Math.round(h / 24)}d`;
}
export function clock(ms: number): string {
  const neg = ms < 0; const s = Math.floor(Math.abs(ms) / 1000);
  return `${neg ? "-" : ""}${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}
export function fmtDate(iso: string, opts: Intl.DateTimeFormatOptions = { dateStyle: "medium", timeStyle: "short" }): string {
  return new Intl.DateTimeFormat("en-GB", opts).format(new Date(iso));
}
export function money(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}
export type SlaState = { label: string; tone: Tone; ms: number | null; kind: "none" | "running" | "warning" | "breached" | "met" | "missed" };
export function slaState(l: Lead, now: number, windowMin: number): SlaState {
  if (l.firstTouchAt) {
    const mins = (new Date(l.firstTouchAt).getTime() - new Date(l.createdAt).getTime()) / 60000;
    const met = !l.slaBreachedAt && !l.escalatedAt && mins <= windowMin + 0.01;
    return { label: `${mins < 1 ? "<1" : Math.round(mins)}m`, tone: met ? "mint" : "amber", ms: null, kind: met ? "met" : "missed" };
  }
  if (!l.slaDueAt) return { label: "—", tone: "slate", ms: null, kind: "none" };
  const ms = new Date(l.slaDueAt).getTime() - now;
  if (ms <= 0) return { label: `Breached ${clock(ms).slice(1)}`, tone: "rose", ms, kind: "breached" };
  return { label: clock(ms), tone: ms < windowMin * 60000 * 0.2 ? "amber" : "violet", ms, kind: ms < windowMin * 60000 * 0.2 ? "warning" : "running" };
}
