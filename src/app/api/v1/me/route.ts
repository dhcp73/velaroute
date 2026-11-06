import { json, withKey } from "@/lib/server/api";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const ctx = withKey(req, "leads:read");
  if (ctx instanceof Response) return ctx;
  return json({ data: { workspace: { id: ctx.ws.id, name: ctx.ws.name, plan: ctx.ws.plan }, key: { id: ctx.keyId, scopes: ctx.scopes } } });
}
