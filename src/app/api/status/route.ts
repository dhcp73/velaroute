import { json } from "@/lib/server/api";
import { statusSummary } from "@/lib/server/health";

export const dynamic = "force-dynamic";

export async function GET() {
  return json(await statusSummary(), 200, { "Access-Control-Allow-Origin": "*" });
}
