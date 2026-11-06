import { authenticate, startSession } from "@/lib/server/auth";
import { clientIp, json, problem, rateLimit } from "@/lib/server/api";

export async function POST(req: Request) {
  const rl = rateLimit(`login:${clientIp(req)}`, 20);
  if (!rl.ok) return problem(429, "Too many attempts", "Wait a minute and try again");
  const body = (await req.json().catch(() => ({}))) as { email?: string; password?: string };
  if (!body.email || !body.password) return problem(400, "Missing fields", "Enter your email and password");
  const u = await authenticate(body.email, body.password);
  if (!u) return problem(401, "Wrong email or password", "Wrong email or password");
  await startSession(u);
  return json({ ok: true, wid: u.wid, name: u.name });
}
