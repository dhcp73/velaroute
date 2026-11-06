import { json } from "@/lib/server/api";
import { openapi } from "@/lib/openapi";
import { publicUrl } from "@/lib/server/env";

export const dynamic = "force-dynamic";
export async function GET() {
  return json(openapi(publicUrl()), 200, { "Access-Control-Allow-Origin": "*" });
}
