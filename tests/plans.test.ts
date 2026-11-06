import { describe, expect, it } from "vitest";
import { TIERS, migratePlan } from "@/lib/plans";
import { emptyWorkspace } from "@/lib/engine/seed";

describe("canonical pricing and saved plan migration", () => {
  it("keeps the published monthly prices and quotas together", () => {
    expect(TIERS.map(({ id, name, monthly, reps, leads }) => ({ id, name, monthly, reps, leads }))).toEqual([
      { id: "starter", name: "Starter", monthly: 99, reps: 3, leads: 500 },
      { id: "growth", name: "Growth", monthly: 249, reps: 15, leads: 2500 },
      { id: "scale", name: "Scale", monthly: 499, reps: 50, leads: 10000 },
    ]);
  });
  it.each([["launch", "starter"], ["scale", "growth"], ["command", "scale"]])("migrates legacy %s by price tier", (oldPlan, newPlan) => {
    const snapshot = { plan: oldPlan, name: "Existing workspace" };
    const migrated = migratePlan(snapshot);
    expect(migrated).toEqual({ plan: newPlan, name: "Existing workspace", billingPlanVersion: 2 });
    expect(migratePlan(migrated)).toEqual(migrated);
    expect(snapshot.plan).toBe(oldPlan);
  });
  it("never downgrades the new Scale tier on refresh", () => {
    expect(migratePlan({ plan: "scale", billingPlanVersion: 2 }).plan).toBe("scale");
  });
  it("seeds the demo with the new Growth tier", () => {
    const ws = emptyWorkspace("ws_test", "Test");
    expect(ws.plan).toBe("growth");
    expect(ws.billingPlanVersion).toBe(2);
  });
});
