import type { Workspace } from "./types";
import { median, minutesBetween } from "./util";
import { monthSpendCents } from "./enrich";

export function analytics(ws: Workspace, now: Date, days = 14) {
  const since = now.getTime() - days * 86400000;
  const leads = ws.leads.filter((l) => new Date(l.createdAt).getTime() >= since);
  const real = leads.filter((l) => l.stage !== "spam");
  const touched = real.filter((l) => l.firstTouchAt);
  const ttft = touched.map((l) => minutesBetween(l.createdAt, l.firstTouchAt!));
  const withSla = real.filter((l) => l.slaDueAt || l.slaBreachedAt || l.escalatedAt);
  const withinSla = withSla.filter((l) => l.firstTouchAt && !l.escalatedAt && !l.slaBreachedAt);
  const booked = real.filter((l) => l.meeting);
  const won = real.filter((l) => l.stage === "won");

  const daily: { day: string; leads: number; booked: number; blocked: number }[] = [];
  for (let d = days - 1; d >= 0; d--) {
    const key = new Date(now.getTime() - d * 86400000).toISOString().slice(0, 10);
    const dayLeads = leads.filter((l) => l.createdAt.slice(0, 10) === key);
    daily.push({ day: key.slice(5), leads: dayLeads.filter((l) => l.stage !== "spam").length, booked: dayLeads.filter((l) => l.meeting).length, blocked: dayLeads.filter((l) => l.stage === "spam").length });
  }

  const totalWeight = ws.reps.filter((r) => r.weight > 0).reduce((a, r) => a + r.weight, 0) || 1;
  const routedCount = real.filter((l) => l.ownerId && !l.duplicateOf).length || 1;
  const fairness = ws.reps.map((r) => {
    const mine = real.filter((l) => l.ownerId === r.id && !l.duplicateOf);
    const t = mine.filter((l) => l.firstTouchAt).map((l) => minutesBetween(l.createdAt, l.firstTouchAt!));
    return {
      repId: r.id, name: r.name.split(" ")[0], color: r.color,
      leads: mine.length,
      expected: Math.round((r.weight / totalWeight) * routedCount),
      share: Math.round((mine.length / routedCount) * 100),
      medianMinutes: Math.round(median(t) * 10) / 10,
      meetings: mine.filter((l) => l.meeting).length,
    };
  });

  const bySource = ["form", "chat", "email", "api", "booking"].map((s) => ({ source: s, leads: real.filter((l) => l.source === s).length })).filter((s) => s.leads);
  const funnel = [
    { stage: "Captured", value: leads.length },
    { stage: "Passed guard", value: real.length },
    { stage: "Routed", value: real.filter((l) => l.ownerId).length },
    { stage: "Touched", value: touched.length },
    { stage: "Meeting", value: booked.length },
    { stage: "Won", value: won.length },
  ];
  const spendByProvider: Record<string, number> = {};
  for (const s of ws.spend) if (new Date(s.at).getTime() >= since) spendByProvider[s.provider] = (spendByProvider[s.provider] ?? 0) + s.cents;

  return {
    total: leads.length,
    real: real.length,
    blocked: leads.length - real.length,
    medianMinutes: Math.round(median(ttft) * 10) / 10,
    slaRate: withSla.length ? Math.round((withinSla.length / withSla.length) * 100) : 100,
    bookedRate: real.length ? Math.round((booked.length / real.length) * 100) : 0,
    winRate: real.length ? Math.round((won.length / real.length) * 100) : 0,
    openBreaches: ws.leads.filter((l) => l.slaBreachedAt && !l.firstTouchAt).length,
    awaiting: ws.leads.filter((l) => l.slaDueAt && !l.firstTouchAt && !l.slaBreachedAt && l.stage !== "spam").length,
    review: ws.leads.filter((l) => l.guard.verdict === "review" && l.stage !== "spam" && !l.guard.reasons.some((r) => r.startsWith("Approved"))).length,
    monthSpendCents: monthSpendCents(ws, now),
    capCents: ws.settings.monthlySpendCapCents,
    spendByProvider: Object.entries(spendByProvider).map(([provider, cents]) => ({ provider, cents })),
    daily, fairness, bySource, funnel,
    pipelineValue: real.filter((l) => ["meeting", "qualified"].includes(l.stage)).reduce((a, l) => a + (l.value ?? 0), 0),
  };
}
export type Analytics = ReturnType<typeof analytics>;
