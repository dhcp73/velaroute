import { handleError, json, problem, withKey } from "@/lib/server/api";
import { saveWorkspace } from "@/lib/server/store";
import { ingestLead } from "@/lib/server/service";
import { isEmail } from "@/lib/engine/util";

export const dynamic = "force-dynamic";

/**
 * Email-to-lead: point your inbound parse webhook (SendGrid Inbound Parse, Postmark, Mailgun routes)
 * for sales@yourco.com here. Accepts JSON { from, fromName?, subject?, text }.
 */
export async function POST(req: Request) {
  const ctx = withKey(req, "leads:write");
  if (ctx instanceof Response) return ctx;
  const b = (await req.json().catch(() => null)) as { from?: string; fromName?: string; subject?: string; text?: string } | null;
  const from = b?.from?.match(/<([^>]+)>/)?.[1] ?? b?.from ?? "";
  if (!isEmail(from)) return problem(400, "Invalid sender", "`from` must be an email address");
  try {
    const lead = await ingestLead(ctx.ws, { source: "email", email: from, name: b?.fromName, message: [b?.subject, b?.text].filter(Boolean).join("\n\n").slice(0, 4000), elapsedMs: 60000 });
    saveWorkspace(ctx.ws);
    return json({ id: lead.id, ownerId: lead.ownerId ?? null, stage: lead.stage, guard: lead.guard }, 201);
  } catch (e) {
    return handleError(e);
  }
}
