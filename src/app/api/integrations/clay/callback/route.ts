import { json, problem, withKey } from "@/lib/server/api";
import { saveWorkspace } from "@/lib/server/store";
import { COUNTRY_REGION } from "@/lib/engine/util";

export const dynamic = "force-dynamic";

/** Clay HTTP-API column posts enriched rows back here (Bearer API key with leads:write). */
export async function POST(req: Request) {
  const ctx = withKey(req, "leads:write");
  if (ctx instanceof Response) return ctx;
  const b = (await req.json().catch(() => null)) as { ref?: string; email?: string; company?: string; employees?: number; country?: string; industry?: string; title?: string } | null;
  const lead = ctx.ws.leads.find((l) => l.email === (b?.email || b?.ref));
  if (!lead || !b) return problem(404, "Lead not found");
  const cc = (b.country || lead.enrichment?.company?.country || "US").toUpperCase().slice(0, 2);
  lead.enrichment = { provider: "clay", costCents: 0, cached: false, company: { name: b.company || lead.company, domain: lead.domain, employees: Number(b.employees) || lead.enrichment?.company?.employees || 0, country: cc, region: COUNTRY_REGION[cc] ?? "NA", industry: b.industry || lead.enrichment?.company?.industry || "Unknown" }, person: { title: b.title ?? lead.title } };
  lead.activities.push({ at: new Date().toISOString(), type: "enriched", text: "Clay enrichment received" });
  saveWorkspace(ctx.ws);
  return json({ ok: true });
}
