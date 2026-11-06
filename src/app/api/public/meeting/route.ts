import { json, problem } from "@/lib/server/api";
import { loadWorkspace } from "@/lib/server/store";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const u = new URL(req.url);
  const wid = u.searchParams.get("w") || "ws_demo";
  const id = u.searchParams.get("id") || "";
  const ws = loadWorkspace(wid);
  const lead = ws.leads.find((l) => l.meeting?.id === id);
  if (!lead?.meeting) return problem(404, "Meeting not found");
  const rep = ws.reps.find((r) => r.id === lead.meeting!.repId);
  return json({ meeting: lead.meeting, with: rep ? { name: rep.name, title: rep.title } : null, guest: lead.name.split(" ")[0], company: ws.name });
}
