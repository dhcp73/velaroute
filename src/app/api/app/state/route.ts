import { json, withSession } from "@/lib/server/api";
import { loadWorkspace, saveWorkspace } from "@/lib/server/store";
import { tick } from "@/lib/engine/pipeline";
import { storageMode } from "@/lib/server/env";

export const dynamic = "force-dynamic";

export async function GET() {
  const s = await withSession();
  if (s instanceof Response) return s;
  const ws = loadWorkspace(s.wid);
  tick(ws, new Date());
  saveWorkspace(ws);
  return json({ ws, mode: storageMode(), user: { name: s.name, email: s.email, role: s.role } });
}
