import type { Rep, Workspace } from "./types";
import { TZ_OFFSETS } from "./util";

export interface Slot { start: string; end: string }

/** Free slots for a rep: working hours in the rep's timezone, weekdays, minus booked meetings, from 1h ahead. */
export function freeSlots(ws: Workspace, rep: Rep, now: Date, days = ws.settings.bookingWindowDays, minutes = ws.settings.meetingMinutes, max = 24): Slot[] {
  const off = TZ_OFFSETS[rep.timezone] ?? 0;
  const busy = ws.leads.filter((l) => l.meeting && l.meeting.repId === rep.id && l.meeting.status === "booked").map((l) => [new Date(l.meeting!.start).getTime(), new Date(l.meeting!.end).getTime()]);
  const earliest = now.getTime() + 60 * 60000;
  const out: Slot[] = [];
  for (let d = 0; d <= days + 2 && out.length < max; d++) {
    // rep-local midnight of day d, expressed in UTC ms
    const local = new Date(now.getTime() + off * 3600000);
    const dayStartUtc = Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate() + d) - off * 3600000;
    const dow = new Date(dayStartUtc + off * 3600000).getUTCDay();
    if (dow === 0 || dow === 6) continue;
    for (let m = rep.workStart * 60; m + minutes <= rep.workEnd * 60 && out.length < max; m += 30) {
      const s = dayStartUtc + m * 60000;
      const e = s + minutes * 60000;
      if (s < earliest) continue;
      if (busy.some(([bs, be]) => s < be && e > bs)) continue;
      out.push({ start: new Date(s).toISOString(), end: new Date(e).toISOString() });
    }
  }
  return out;
}
