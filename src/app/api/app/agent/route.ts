import { z } from "zod";
import { json, problem, rateLimit, withSession } from "@/lib/server/api";
import { loadWorkspace } from "@/lib/server/store";
import { runBuilder } from "@/lib/server/agent";
import { historySchema, turnSchema } from "@/lib/agent/contracts";
import { encodeAgentEvent, type AgentEvent } from "@/lib/agent/stream";
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
    if (!req.headers.get("accept")?.includes("text/event-stream")) {
      const turn = await runBuilder(ws, parsed.message, parsed.history, session.role !== "member", req.signal);
      return json({ turn }); // Older/API clients retain complete JSON responses.
    }
    const abort = new AbortController();
    const stop = () => abort.abort();
    req.signal.addEventListener("abort", stop, { once: true });
    if (req.signal.aborted) stop();
    let cleanup = () => {};
    const body = new ReadableStream<Uint8Array>({
      start(controller) {
        const encoder = new TextEncoder();
        const emit = async (event: AgentEvent) => {
          abort.signal.throwIfAborted();
          controller.enqueue(encoder.encode(encodeAgentEvent(event)));
          // Fast local tools finish within a frame. Brief presentation pacing lets each real
          // status flush and remain legible; no invented work or synthetic progress percentage.
          if (event.type === "status") await new Promise<void>((resolve, reject) => {
            const done = () => { clearTimeout(timer); abort.signal.removeEventListener("abort", cancel); };
            const cancel = () => { done(); reject(new DOMException("Stopped", "AbortError")); };
            const timer = setTimeout(() => { done(); resolve(); }, event.status.phase === "review" ? 220 : 180);
            abort.signal.addEventListener("abort", cancel, { once: true });
          });
        };
        const heartbeat = setInterval(() => { if (!abort.signal.aborted) try { controller.enqueue(encoder.encode(": heartbeat\n\n")); } catch { stop(); } }, 10000);
        cleanup = () => { clearInterval(heartbeat); req.signal.removeEventListener("abort", stop); };
        void (async () => {
          try {
            const turn = turnSchema.parse(await runBuilder(ws, parsed.message, parsed.history, session.role !== "member", abort.signal, emit));
            await emit({ type: "done", turn });
          } catch {
            if (!abort.signal.aborted) try { controller.enqueue(encoder.encode(encodeAgentEvent({ type: "error", message: "The agent could not finish this review. Try again; no changes were saved." }))); } catch { /* disconnected */ }
          } finally { cleanup(); try { controller.close(); } catch { /* canceled stream */ } }
        })();
      },
      cancel() { stop(); cleanup(); },
    });
    return new Response(body, { headers: { "Content-Type": "text/event-stream; charset=utf-8", "Cache-Control": "no-cache, no-transform", "X-Accel-Buffering": "no", "Connection": "keep-alive" } });
  } catch { return problem(500, "Agent unavailable", "No changes were saved. Try again or use the manual builders."); }
}
