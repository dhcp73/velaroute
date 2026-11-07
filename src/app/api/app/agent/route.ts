import { z } from "zod";
import { json, problem, rateLimit, withSession } from "@/lib/server/api";
import { loadWorkspace } from "@/lib/server/store";
import { runBuilder } from "@/lib/server/agent";
import { historySchema } from "@/lib/agent/contracts";
export const dynamic = "force-dynamic";
export const maxDuration = 60;
const requestSchema = z.object({ message: z.string().trim().min(1).max(4000), history: historySchema.default([]), snapshot: z.unknown().optional() });
export async function POST(req: Request) {
  const session = await withSession();
  if (session instanceof Response) return session;
  if (!rateLimit(`agent:${session.wid}:${session.email}`, 15).ok) return problem(429, "Too many agent requests", "Wait a minute, then try again.");
  const raw = await req.text();
  if (raw.length > 4000000) return problem(413, "Workspace snapshot too large");
  let parsed: z.infer<typeof requestSchema>;
  try { parsed = requestSchema.parse(JSON.parse(raw)); } catch { return problem(400, "Invalid agent request", "Use a request under 4000 characters and a valid conversation."); }
  try {
    const ws = loadWorkspace(session.wid, parsed.snapshot);
    const turn = await runBuilder(ws, parsed.message, parsed.history, session.role !== "member", req.signal);
    return json({ turn }); // Never persist: only the existing /action confirmation path can write.
  } catch { return problem(500, "Agent unavailable", "No changes were saved. Try again or use the manual builders."); }
}
