import { describe, expect, it } from "vitest";
import { processLead, tick, touchLead } from "@/lib/engine/pipeline";
import { NOW, rep, ws } from "./helpers";

const at = (min: number) => new Date(NOW.getTime() + min * 60000);

function setup() {
  const w = ws((w) => { w.reps = [rep("a"), rep("b")]; w.settings.slaMinutes = 5; w.settings.escalateAfterMinutes = 10; });
  const { lead } = processLead(w, { source: "api", email: "lee@copperleaf.io", name: "Lee", elapsedMs: 30000 }, NOW);
  return { w, lead };
}

describe("SLA agent", () => {
  it("starts a clock at routing", () => {
    const { lead } = setup();
    expect(lead.slaDueAt).toBe(at(5).toISOString());
  });

  it("warns at 80% of the window, once", () => {
    const { w, lead } = setup();
    tick(w, at(3.9));
    expect(lead.slaWarnedAt).toBeUndefined();
    tick(w, at(4.1));
    expect(lead.slaWarnedAt).toBeDefined();
    tick(w, at(4.5));
    expect(w.alerts.filter((a) => a.kind === "sla_warning" && a.leadId === lead.id)).toHaveLength(1);
  });

  it("breaches at the deadline and emits an event", () => {
    const { w, lead } = setup();
    const ev = tick(w, at(5));
    expect(lead.slaBreachedAt).toBeDefined();
    expect(ev.map((e) => e.type)).toContain("sla.breached");
  });

  it("escalates by re-routing to another rep after the escalation window", () => {
    const { w, lead } = setup();
    const first = lead.ownerId;
    tick(w, at(5));
    const ev = tick(w, at(15));
    expect(ev.map((e) => e.type)).toContain("lead.escalated");
    expect(lead.ownerId).not.toBe(first);
    expect(lead.slaDueAt).toBe(at(20).toISOString());
  });

  it("a first touch stops the clock", () => {
    const { w, lead } = setup();
    touchLead(w, lead.id, "email", "Hi!", "a", at(2));
    expect(tick(w, at(30))).toEqual([]);
    expect(lead.slaBreachedAt).toBeUndefined();
  });
});
