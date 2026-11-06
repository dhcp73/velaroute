import { json, withKey } from "@/lib/server/api";
import { analytics } from "@/lib/engine/analytics";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const ctx = withKey(req, "analytics:read");
  if (ctx instanceof Response) return ctx;
  const days = Math.max(1, Math.min(90, Number(new URL(req.url).searchParams.get("days") || 14)));
  return json({ data: analytics(ctx.ws, new Date(), days) });
}
