import { describe, expect, it } from "vitest";
import { evalCondition, routeLead, weightedPick } from "@/lib/engine/route";
import { processLead } from "@/lib/engine/pipeline";
import { NOW, rep, ws } from "./helpers";

describe("weighted round robin", () => {
  it("distributes picks in proportion to weight", () => {
    const w = ws((w) => { w.reps = [rep("a", { weight: 3 }), rep("b", { weight: 1 })]; });
    const counts: Record<string, number> = { a: 0, b: 0 };
    for (let i = 0; i < 40; i++) counts[weightedPick(w, "p", ["a", "b"], NOW)!.id]++;
    expect(counts).toEqual({ a: 30, b: 10 });
  });

  it("interleaves smoothly instead of bursting", () => {
    const w = ws((w) => { w.reps = [rep("a", { weight: 2 }), rep("b", { weight: 1 })]; });
    const seq = Array.from({ length: 6 }, () => weightedPick(w, "p", ["a", "b"], NOW)!.id).join("");
    expect(seq).toBe("abaaba");
  });

  it("skips away, paused and at-capacity reps", () => {
    const w = ws((w) => { w.reps = [rep("away", { available: false }), rep("paused", { weight: 0 }), rep("full", { capacityPerDay: 0 }), rep("ok")]; });
    for (let i = 0; i < 5; i++) expect(weightedPick(w, "p", ["away", "paused", "full", "ok"], NOW)!.id).toBe("ok");
  });

  it("returns undefined when nobody is eligible", () => {
    const w = ws((w) => { w.reps = [rep("away", { available: false })]; });
    expect(weightedPick(w, "p", ["away"], NOW)).toBeUndefined();
  });
});

describe("rules", () => {
  it("evaluates numeric and set conditions", () => {
    const ctx = { country: "DE", region: "EMEA", employees: 250, domain: "x.io", industry: "Fintech", icpScore: 80, source: "form", answers: {} };
    expect(evalCondition(ctx, { field: "employees", op: "gte", value: "200" })).toBe(true);
    expect(evalCondition(ctx, { field: "region", op: "in", value: "NA, EMEA" })).toBe(true);
    expect(evalCondition(ctx, { field: "icpScore", op: "lte", value: "50" })).toBe(false);
  });

  it("routes by the first matching rule and records the reason", () => {
    const w = ws((w) => {
      w.reps = [rep("emea"), rep("na")];
      w.rules = [
        { id: "r1", name: "EMEA", priority: 1, conditions: [{ field: "region", op: "equals", value: "EMEA" }], match: "all", repIds: ["emea"], hits: 0, enabled: true },
        { id: "r2", name: "Rest", priority: 2, conditions: [], match: "all", repIds: ["na"], hits: 0, enabled: true },
      ];
    });
    const { lead } = processLead(w, { source: "api", email: "maya@kestrel.ai", name: "Maya", elapsedMs: 30000 }, NOW);
    expect(lead.enrichment?.company?.country).toBe("DE");
    expect(lead.ownerId).toBe("emea");
    expect(lead.ruleId).toBe("r1");
  });

  it("keeps duplicates with the original owner and account owners sticky", () => {
    const w = ws((w) => { w.reps = [rep("a"), rep("b")]; });
    const first = processLead(w, { source: "api", email: "sam@northwind.io", elapsedMs: 30000 }, NOW).lead;
    const dup = processLead(w, { source: "api", email: "sam@northwind.io", elapsedMs: 30000 }, new Date(NOW.getTime() + 60000)).lead;
    expect(dup.duplicateOf).toBe(first.id);
    expect(dup.ownerId).toBe(first.ownerId);
    const d = routeLead(w, dup, NOW);
    expect(d.reason).toMatch(/Duplicate/);
  });
});
