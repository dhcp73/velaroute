import { handleError, json, problem, withKey } from "@/lib/server/api";
import { saveWorkspace } from "@/lib/server/store";
import { runAction } from "@/lib/server/service";

export const dynamic = "force-dynamic";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const ctx = withKey(req, "meetings:write");
  if (ctx instanceof Response) return ctx;
  const { id } = await params;
  const b = (await req.json().catch(() => ({}))) as { start?: string };
  if (!b.start) return problem(400, "Missing start", "Send { start: ISO time from /slots }");
  try {
    const data = await runAction(ctx.ws, { type: "lead.book", leadId: id, start: b.start }, "api");
    saveWorkspace(ctx.ws);
    return json({ data }, 201);
  } catch (e) { return handleError(e); }
}
