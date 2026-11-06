import { json, problem, withKey } from "@/lib/server/api";
import { slotsFor } from "@/lib/server/service";

export const dynamic = "force-dynamic";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const ctx = withKey(req, "leads:read");
  if (ctx instanceof Response) return ctx;
  const { id } = await params;
  if (!ctx.ws.leads.some((x) => x.id === id)) return problem(404, "Lead not found");
  return json({ data: slotsFor(ctx.ws, id) });
}
