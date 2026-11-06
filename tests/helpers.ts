import { emptyWorkspace } from "@/lib/engine/seed";
import type { Rep, Workspace } from "@/lib/engine/types";

/** A Wednesday at 15:00 UTC — inside every demo rep's working hours except APAC. */
export const NOW = new Date("2026-11-04T15:00:00.000Z");

export function ws(mut?: (w: Workspace) => void): Workspace {
  const w = emptyWorkspace("ws_test", "Test", NOW);
  mut?.(w);
  return w;
}

export function rep(id: string, extra: Partial<Rep> = {}): Rep {
  return { id, name: id, email: `${id}@t.dev`, title: "AE", team: "smb", region: "NA", weight: 1, available: true, capacityPerDay: 100, timezone: "Europe/London", workStart: 0, workEnd: 24, calendar: "google", color: "#000", ...extra };
}
