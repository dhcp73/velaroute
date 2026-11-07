import { z } from "zod";
import { proposalSchema, traceSchema, turnSchema, type AgentTurn } from "./contracts";

export const statusSchema = z.object({ phase: z.enum(["thinking", "checking", "reading", "drafting", "routing", "settings", "researching", "review"]), label: z.string().max(120), tool: z.string().max(100).optional(), mode: z.string().max(150).optional() });
export const agentEventSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("status"), status: statusSchema }),
  z.object({ type: z.literal("step"), step: traceSchema }),
  z.object({ type: z.literal("proposal"), proposal: proposalSchema }),
  z.object({ type: z.literal("delta"), text: z.string().max(12000) }),
  z.object({ type: z.literal("reset"), message: z.string().max(300) }),
  z.object({ type: z.literal("done"), turn: turnSchema }),
  z.object({ type: z.literal("error"), message: z.string().max(500) }),
]);
export type AgentEvent = z.infer<typeof agentEventSchema>;
export type ProgressSink = (event: AgentEvent) => void | Promise<void>;
export const encodeAgentEvent = (event: AgentEvent) => `event: ${event.type}\ndata: ${JSON.stringify(event)}\n\n`;

/** Incremental SSE framing: UTF-8 decoding is handled by the reader, including split codepoints. */
export class AgentEventDecoder {
  private buffer = "";
  push(chunk: string): AgentEvent[] {
    this.buffer += chunk;
    if (this.buffer.length > 2000000) throw new Error("The agent stream exceeded its safe size. Please try a shorter request.");
    const events: AgentEvent[] = [];
    let boundary: RegExpExecArray | null;
    while ((boundary = /\r?\n\r?\n/.exec(this.buffer))) {
      const frame = this.buffer.slice(0, boundary.index); this.buffer = this.buffer.slice(boundary.index + boundary[0].length);
      const data = frame.split(/\r?\n/).filter((line) => line.startsWith("data:")).map((line) => line.slice(5).trimStart()).join("\n");
      if (!data) continue; // comments / heartbeats
      try { events.push(agentEventSchema.parse(JSON.parse(data))); }
      catch { throw new Error("The agent sent an invalid progress event. No changes were saved."); }
    }
    return events;
  }
}

/** JSON compatibility for older servers; partial SSE turns are never returned or persisted. */
export async function readAgentResponse(response: Response, onEvent: ProgressSink): Promise<AgentTurn> {
  if (!response.ok) {
    let detail = "The agent is unavailable. No changes were saved.";
    try { const data = await response.json(); detail = data.error?.detail || data.error?.title || detail; } catch { /* safe fallback */ }
    throw new Error(detail);
  }
  if (!response.headers.get("content-type")?.includes("text/event-stream")) {
    const data = await response.json(); const parsed = turnSchema.safeParse(data.turn);
    if (!parsed.success) throw new Error("The agent returned an invalid response. No changes were saved.");
    await onEvent({ type: "done", turn: parsed.data }); return parsed.data;
  }
  if (!response.body) throw new Error("Streaming is unavailable. Please try again. No changes were saved.");
  const reader = response.body.getReader(), decoder = new TextDecoder(), frames = new AgentEventDecoder();
  let complete = false;
  try {
    while (true) {
      const { value, done } = await reader.read();
      for (const event of frames.push(decoder.decode(value, { stream: !done }))) {
        if (event.type === "error") throw new Error(event.message);
        await onEvent(event);
        if (event.type === "done") { complete = true; return event.turn; }
      }
      if (done) throw new Error("The connection ended before the review was complete. Try again; no changes were saved.");
    }
  } finally {
    // A valid done is the final frame. Let its EOF finish normally rather than marking a
    // successful fetch as canceled; abort/error paths still discard the partial stream.
    if (!complete) await reader.cancel().catch(() => {});
    reader.releaseLock();
  }
}
