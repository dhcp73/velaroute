import { json, withKey } from "@/lib/server/api";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const ctx = withKey(req, "routing:read");
  if (ctx instanceof Response) return ctx;
  return json({ data: ctx.ws.reps });
}
