import type { Lead, Rep, RouteCondition, RoutingRule, Workspace } from "./types";

export interface RouteContext {
  country: string;
  region: string;
  employees: number;
  domain: string;
  industry: string;
  icpScore: number;
  source: string;
  answers: Record<string, string>;
}

export function contextOf(lead: Lead): RouteContext {
  const c = lead.enrichment?.company;
  return {
    country: c?.country ?? "",
    region: c?.region ?? "",
    employees: c?.employees ?? 0,
    domain: lead.domain,
    industry: c?.industry ?? "",
    icpScore: lead.icpScore,
    source: lead.source,
    answers: lead.answers,
  };
}

function valueOf(ctx: RouteContext, cond: RouteCondition): string | number {
  if (cond.field === "answer") return ctx.answers[cond.key ?? ""] ?? "";
  return ctx[cond.field as keyof Omit<RouteContext, "answers">] as string | number;
}

export function evalCondition(ctx: RouteContext, cond: RouteCondition): boolean {
  const raw = valueOf(ctx, cond);
  const v = String(raw).toLowerCase();
  const target = cond.value.toLowerCase().trim();
  switch (cond.op) {
    case "equals": return v === target;
    case "in": return target.split(",").map((s) => s.trim()).filter(Boolean).includes(v);
    case "contains": return v.includes(target);
    case "ends_with": return v.endsWith(target);
    case "gte": return Number(raw) >= Number(cond.value);
    case "lte": return Number(raw) <= Number(cond.value);
    default: return false;
  }
}

export function ruleMatches(rule: RoutingRule, ctx: RouteContext): boolean {
  if (!rule.enabled) return false;
  if (!rule.conditions.length) return true;
  return rule.match === "all" ? rule.conditions.every((c) => evalCondition(ctx, c)) : rule.conditions.some((c) => evalCondition(ctx, c));
}

export function leadsToday(ws: Workspace, repId: string, now: Date): number {
  const day = now.toISOString().slice(0, 10);
  return ws.leads.filter((l) => l.ownerId === repId && l.createdAt.slice(0, 10) === day && !l.duplicateOf).length;
}

export function isEligible(ws: Workspace, rep: Rep | undefined, now: Date): rep is Rep {
  return !!rep && rep.available && rep.weight > 0 && leadsToday(ws, rep.id, now) < rep.capacityPerDay;
}

/**
 * Smooth weighted round robin (nginx algorithm): deterministic, fair over time,
 * respects weights (weight 0 = paused) and skips unavailable / at-capacity reps.
 * Mutates ws.rrState for the pool key.
 */
export function weightedPick(ws: Workspace, poolKey: string, repIds: string[], now: Date, exclude: string[] = []): Rep | undefined {
  const eligible = repIds.map((id) => ws.reps.find((r) => r.id === id)).filter((r): r is Rep => isEligible(ws, r, now) && !exclude.includes(r.id));
  if (!eligible.length) return undefined;
  const state = (ws.rrState[poolKey] ??= {});
  const total = eligible.reduce((a, r) => a + r.weight, 0);
  let best: Rep | undefined;
  for (const r of eligible) {
    state[r.id] = (state[r.id] ?? 0) + r.weight;
    if (!best || state[r.id] > state[best.id]) best = r;
  }
  state[best!.id] -= total;
  return best;
}

export interface RouteDecision { repId?: string; ruleId?: string; reason: string; considered: string[] }

export function routeLead(ws: Workspace, lead: Lead, now: Date): RouteDecision {
  const considered: string[] = [];
  // 1. Duplicate → same owner as the original lead.
  if (lead.duplicateOf) {
    const orig = ws.leads.find((l) => l.id === lead.duplicateOf);
    if (orig?.ownerId) return { repId: orig.ownerId, reason: "Duplicate of an existing lead — kept with the same owner", considered };
  }
  // 2. Account-owner stickiness.
  if (lead.accountId) {
    const acct = ws.accounts.find((a) => a.id === lead.accountId);
    const owner = ws.reps.find((r) => r.id === acct?.ownerId);
    if (acct && owner && owner.available) return { repId: owner.id, reason: `Account owner of ${acct.name} (sticky)`, considered };
    if (acct && owner) considered.push(`Account owner ${owner.name} is unavailable — falling back to rules`);
  }
  // 3. Rules by priority, weighted round robin inside the pool.
  const ctx = contextOf(lead);
  for (const rule of [...ws.rules].sort((a, b) => a.priority - b.priority)) {
    if (!ruleMatches(rule, ctx)) { considered.push(`${rule.name}: no match`); continue; }
    const rep = weightedPick(ws, rule.id, rule.repIds, now);
    if (!rep) { considered.push(`${rule.name}: matched but every rep is away, paused or at capacity`); continue; }
    rule.hits += 1;
    return { repId: rep.id, ruleId: rule.id, reason: `Rule "${rule.name}" → weighted round robin`, considered };
  }
  // 4. Fallback pool: everyone available.
  const rep = weightedPick(ws, "__fallback", ws.reps.map((r) => r.id), now);
  if (rep) return { repId: rep.id, reason: "No rule matched — fallback round robin across the team", considered };
  return { reason: "Nobody available — left unassigned in the queue", considered };
}
