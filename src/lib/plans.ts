/** Single source of truth for test billing and public pricing. No charges are made. */
export type PlanId = "starter" | "growth" | "scale";
export type Tier = { id: PlanId; name: string; monthly: number; annual: number; blurb: string; cta: string; highlight?: boolean; features: string[]; limits: string; reps: number; leads: number };
export const TIERS: Tier[] = [
  { id: "starter", name: "Starter", monthly: 99, annual: 79, blurb: "For founder-led sales and first reps.", cta: "Start free", reps: 3, leads: 500, limits: "Up to 3 reps · 500 leads/mo", features: ["Branching forms & chat widget", "Bot & spam guard", "Round-robin routing", "Book on submit", "SLA timers with email alerts", "HubSpot or Attio sync", "REST API & webhooks"] },
  { id: "growth", name: "Growth", monthly: 249, annual: 199, blurb: "For SDR teams that live and die by speed-to-lead.", cta: "Start free", highlight: true, reps: 15, leads: 2500, limits: "Up to 15 reps · 2,500 leads/mo", features: ["Everything in Starter", "Enrichment waterfall with spend caps", "Rule-based territories & ICP scoring", "SLA escalation & auto re-route", "AI Copilot (bring your own key)", "Slack alerts", "MCP server"] },
  { id: "scale", name: "Scale", monthly: 499, annual: 399, blurb: "For RevOps running multi-team inbound.", cta: "Talk to sales", reps: 50, leads: 10000, limits: "Up to 50 reps · 10,000 leads/mo", features: ["Everything in Growth", "Salesforce sync", "Account matching & owner stickiness", "Audit log & role permissions", "Custom SLA policies per team", "Priority support & onboarding", "DPA & security review"] },
];


/** Preserve old snapshots by price tier; old Scale was the $249 tier. */
export function migratePlan<T extends { plan: unknown; billingPlanVersion?: number }>(ws: T): T & { plan: PlanId; billingPlanVersion: number } {
  const legacy = ws.billingPlanVersion !== 2;
  const plan: PlanId = ws.plan === "launch" ? "starter" : ws.plan === "command" ? "scale" : ws.plan === "scale" && legacy ? "growth" : ws.plan === "starter" || ws.plan === "growth" || ws.plan === "scale" ? ws.plan : "starter";
  return { ...ws, plan, billingPlanVersion: 2 };
}
