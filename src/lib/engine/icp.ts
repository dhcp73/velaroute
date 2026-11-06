import type { Lead, Settings } from "./types";
import { FREE_MAIL } from "./util";

/** 0–100 fit score against the workspace ICP. Each part is explainable. */
export function icpScore(lead: Pick<Lead, "enrichment" | "domain" | "title">, s: Settings): { score: number; parts: string[] } {
  const parts: string[] = [];
  let score = 0;
  const c = lead.enrichment?.company;
  if (c) {
    if (c.employees >= s.icpMinEmployees && c.employees <= s.icpMaxEmployees) { score += 35; parts.push(`+35 size ${c.employees} in ${s.icpMinEmployees}–${s.icpMaxEmployees}`); }
    else if (c.employees > s.icpMaxEmployees) { score += 20; parts.push(`+20 larger than ICP (${c.employees})`); }
    if (s.icpIndustries.map((i) => i.toLowerCase()).includes(c.industry.toLowerCase())) { score += 25; parts.push(`+25 industry ${c.industry}`); }
    if (s.icpRegions.includes(c.region)) { score += 20; parts.push(`+20 region ${c.region}`); }
  }
  if (lead.domain && !FREE_MAIL.has(lead.domain)) { score += 10; parts.push("+10 business email"); }
  const t = (lead.title || lead.enrichment?.person?.title || "").toLowerCase();
  if (/(founder|ceo|cro|vp|vice president|head|director|chief)/.test(t)) { score += 10; parts.push("+10 senior title"); }
  return { score: Math.min(100, score), parts };
}
