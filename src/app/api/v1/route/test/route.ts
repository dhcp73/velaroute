import { handleError, json, withKey } from "@/lib/server/api";
import { runAction } from "@/lib/server/service";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const ctx = withKey(req, "routing:read");
  if (ctx instanceof Response) return ctx;
  const b = (await req.json().catch(() => ({}))) as { email?: string; title?: string };
  try { return json({ data: await runAction(ctx.ws, { type: "route.test", sample: { email: b.email ?? "", title: b.title } }, "api") }); }
  catch (e) { return handleError(e); }
}
