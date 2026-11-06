import { handleError, json, withKey } from "@/lib/server/api";
import { saveWorkspace } from "@/lib/server/store";
import { TOOLS } from "@/lib/server/tools";

export const dynamic = "force-dynamic";
const tool = (n: string) => TOOLS.find((t) => t.name === n)!;

export async function GET(req: Request) {
  const ctx = withKey(req, "leads:read");
  if (ctx instanceof Response) return ctx;
  const u = new URL(req.url);
  const data = await tool("list_leads").run(ctx.ws, { stage: u.searchParams.get("stage") || undefined, ownerId: u.searchParams.get("ownerId") || undefined, limit: Math.min(100, Number(u.searchParams.get("limit") || 25)) });
  saveWorkspace(ctx.ws);
  return json({ data });
}

export async function POST(req: Request) {
  const ctx = withKey(req, "leads:write");
  if (ctx instanceof Response) return ctx;
  const b = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  if (!b || typeof b.email !== "string") return json({ error: { status: 400, title: "Invalid body", detail: "`email` is required" } }, 400);
  try {
    const data = await tool("create_lead").run(ctx.ws, { ...b, source: b.source ?? "api" });
    saveWorkspace(ctx.ws);
    return json({ data }, 201);
  } catch (e) { return handleError(e); }
}
