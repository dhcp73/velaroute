import { createUser, startSession } from "@/lib/server/auth";
import { clientIp, json, problem, rateLimit } from "@/lib/server/api";
import { isEmail } from "@/lib/engine/util";
import { loadWorkspace, saveWorkspace } from "@/lib/server/store";

export async function POST(req: Request) {
  const rl = rateLimit(`signup:${clientIp(req)}`, 10);
  if (!rl.ok) return problem(429, "Too many attempts", "Wait a minute and try again");
  const b = (await req.json().catch(() => ({}))) as { name?: string; email?: string; password?: string; company?: string };
  if (!b.email || !isEmail(b.email)) return problem(400, "Invalid email", "Enter a valid work email");
  if (!b.password || b.password.length < 8) return problem(400, "Weak password", "Use at least 8 characters");
  try {
    const u = await createUser(b.name || "", b.email, b.password, b.company || "");
    const ws = loadWorkspace(u.wid);
    ws.name = b.company?.trim() || `${u.name.split(" ")[0]}'s workspace`;
    const me = ws.reps[0];
    if (me) { me.name = u.name; me.email = u.email; me.title = "Founder"; }
    saveWorkspace(ws);
    await startSession(u);
    return json({ ok: true, wid: u.wid });
  } catch (e) {
    return problem(409, "Account exists", (e as Error).message);
  }
}
