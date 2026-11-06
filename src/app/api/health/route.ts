import { json } from "@/lib/server/api";
import { runHealthChecks } from "@/lib/server/health";

export const dynamic = "force-dynamic";

export async function GET() {
  const h = await runHealthChecks();
  return json(h, h.status === "down" ? 503 : 200);
}
