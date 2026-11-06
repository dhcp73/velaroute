import { clientIp, handleError, json, problem, rateLimit } from "@/lib/server/api";
import { loadWorkspace, saveWorkspace } from "@/lib/server/store";
import { ingestLead, slotsFor } from "@/lib/server/service";
import { pathFor, validateStep } from "@/lib/engine/form-logic";
import { storageMode } from "@/lib/server/env";

export const dynamic = "force-dynamic";
type P = { params: Promise<{ wid: string; slug: string }> };

export async function GET(_req: Request, { params }: P) {
  const { wid, slug } = await params;
  const ws = loadWorkspace(wid);
  const form = ws.forms.find((f) => f.slug === slug);
  if (!form) return problem(404, "Form not found");
  return json({ form, workspace: ws.name });
}

/** Public submission: validates the branching path server-side, then runs the full pipeline. */
export async function POST(req: Request, { params }: P) {
  const { wid, slug } = await params;
  const rl = rateLimit(`form:${clientIp(req)}`, 30);
  if (!rl.ok) return problem(429, "Too many submissions", "Please wait a minute");
  const b = (await req.json().catch(() => null)) as { answers?: Record<string, string>; elapsedMs?: number; hp?: string; utm?: Record<string, string>; snapshot?: unknown; preview?: boolean } | null;
  if (!b?.answers) return problem(400, "Missing answers");
  const ws = loadWorkspace(wid, b.snapshot);
  const form = ws.forms.find((f) => f.slug === slug);
  if (!form) return problem(404, "Form not found");
  if (form.status !== "live" && !b.preview) return problem(403, "Form is not live", "Publish the form to accept submissions");
  const answers = Object.fromEntries(Object.entries(b.answers).map(([k, v]) => [k, String(v ?? "").slice(0, 4000)]));
  for (const step of pathFor(form, answers)) {
    const errs = validateStep(form, step, answers);
    if (Object.keys(errs).length) return json({ error: { status: 422, title: "Invalid answers", detail: Object.values(errs)[0] }, fields: errs }, 422);
  }
  const emailField = form.steps.flatMap((s) => s.fields).find((f) => f.type === "email");
  try {
    const lead = await ingestLead(ws, {
      source: "form", formId: form.id, email: answers[emailField?.id ?? "email"] || "", name: answers.name, company: answers.company, title: answers.title,
      message: answers.message || answers.notes, answers, utm: b.utm, honeypot: b.hp, elapsedMs: b.elapsedMs, ip: clientIp(req),
    });
    saveWorkspace(ws);
    const blocked = lead.stage === "spam";
    const booking = !blocked && form.showBooking && lead.ownerId && lead.guard.verdict === "pass" ? slotsFor(ws, lead.id) : null;
    return json({ ok: true, leadId: lead.id, blocked, owner: booking?.rep ?? null, slots: booking?.slots ?? [], ws: storageMode() === "browser" && b.snapshot ? ws : undefined });
  } catch (e) {
    return handleError(e);
  }
}
