import { describe, expect, it } from "vitest";
import { monthSpendCents, planEnrichment, PROVIDER_COST } from "@/lib/engine/enrich";
import { scoreGuard } from "@/lib/engine/guard";
import { processLead } from "@/lib/engine/pipeline";
import { DEFAULT_SETTINGS } from "@/lib/engine/seed";
import type { ProviderId } from "@/lib/engine/types";
import { NOW, ws } from "./helpers";

const connect = (...ids: ProviderId[]) => ws((w) => { for (const i of w.integrations) i.connected = ids.includes(i.id); w.settings.enrichOrder = ["apollo", "clay", "valyu"]; });

describe("enrichment spend caps", () => {
  it("uses no paid provider when none is connected", () => {
    expect(planEnrichment(connect(), NOW).providers).toEqual([]);
  });

  it("keeps the waterfall within the per-lead cap", () => {
    const w = connect("apollo", "clay", "valyu");
    w.settings.perLeadCapCents = 15;
    const plan = planEnrichment(w, NOW);
    const total = plan.providers.reduce((a, p) => a + (PROVIDER_COST[p] ?? 0), 0);
    expect(total).toBeLessThanOrEqual(15);
    expect(plan.providers[0]).toBe("apollo");
  });

  it("stops all paid calls once the monthly cap is reached", () => {
    const w = connect("apollo");
    w.settings.monthlySpendCapCents = 100;
    w.spend = [{ at: NOW.toISOString(), leadId: "l1", provider: "apollo", cents: 100 }];
    expect(monthSpendCents(w, NOW)).toBe(100);
    const plan = planEnrichment(w, NOW);
    expect(plan.providers).toEqual([]);
    expect(plan.reason).toMatch(/Monthly spend cap/);
  });

  it("ignores last month's spend", () => {
    const w = connect("apollo");
    w.settings.monthlySpendCapCents = 100;
    w.spend = [{ at: "2026-10-15T10:00:00.000Z", leadId: "l1", provider: "apollo", cents: 100 }];
    expect(planEnrichment(w, NOW).providers).toEqual(["apollo"]);
  });

  it("never spends on blocked leads", () => {
    const w = connect("apollo", "clay");
    const { lead } = processLead(w, { source: "form", email: "bot@mailinator.com", name: "x", honeypot: "http://spam", elapsedMs: 300 }, NOW);
    expect(lead.stage).toBe("spam");
    expect(w.spend.filter((s) => s.leadId === lead.id)).toHaveLength(0);
  });
});

describe("guard", () => {
  it("passes a normal work-email submission", () => {
    expect(scoreGuard({ source: "form", email: "maya@kestrel.ai", name: "Maya Brooks", elapsedMs: 40000 }, DEFAULT_SETTINGS).verdict).toBe("pass");
  });
  it("blocks honeypot + disposable + instant fills", () => {
    const g = scoreGuard({ source: "form", email: "x@mailinator.com", honeypot: "y", elapsedMs: 200 }, DEFAULT_SETTINGS);
    expect(g.verdict).toBe("block");
    expect(g.reasons.length).toBeGreaterThan(1);
  });
});
