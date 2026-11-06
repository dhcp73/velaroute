import { handleError, json, withKey } from "@/lib/server/api";
import { saveWorkspace } from "@/lib/server/store";
import { TOOLS } from "@/lib/server/tools";

export const dynamic = "force-dynamic";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const ctx = withKey(req, "leads:write");
  if (ctx instanceof Response) return ctx;
  const { id } = await params;
  const b = (await req.json().catch(() => ({}))) as { kind?: string; text?: string };
  try {
    const data = await TOOLS.find((t) => t.name === "log_touch")!.run(ctx.ws, { leadId: id, ...b });
    saveWorkspace(ctx.ws);
    return json({ data });
  } catch (e) { return handleError(e); }
}
