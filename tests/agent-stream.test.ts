import { describe, expect, it, vi } from "vitest";
import { simulateReadableStream } from "ai";
import { MockLanguageModelV4 } from "ai/test";
import { demoWorkspace } from "@/lib/engine/seed";
import { runBuilder } from "@/lib/server/agent";
import { appendCompletedTurn, confirmedAction, historySchema } from "@/lib/agent/contracts";
import { AgentEventDecoder, encodeAgentEvent, readAgentResponse, type AgentEvent } from "@/lib/agent/stream";

const provider = vi.hoisted(() => ({ model: undefined as unknown }));
vi.mock("@openrouter/ai-sdk-provider", () => ({ createOpenRouter: () => ({ chat: () => provider.model }) }));
const workspace = () => demoWorkspace("ws_stream_test", new Date("2026-11-07T01:00:00.000Z"));
const request = "Build a two-step demo form with company size and budget";
type Chunk = Awaited<ReturnType<MockLanguageModelV4["doStream"]>>["stream"] extends ReadableStream<infer Part> ? Part : never;
const usage = { inputTokens: { total: 10, noCache: 10, cacheRead: undefined, cacheWrite: undefined }, outputTokens: { total: 5, text: 5, reasoning: undefined } };
const finish = (reason: "stop" | "tool-calls"): Chunk => ({ type: "finish", finishReason: { unified: reason, raw: undefined }, usage });
const sdkStream = (chunks: Chunk[]) => ({ stream: simulateReadableStream({ chunks, initialDelayInMs: 0, chunkDelayInMs: 0 }) });
function liveWorkspace() { const ws = workspace(); const integration = ws.integrations.find((i) => i.id === "openrouter")!; integration.connected = true; integration.secret = "unit-test-placeholder"; return ws; }

describe("real agent progress and conversational drafts", () => {
  it("emits ordered real statuses, observations and proposals before returning a complete demo turn", async () => {
    const ws = workspace(), before = JSON.stringify(ws), events: AgentEvent[] = [];
    const turn = await runBuilder(ws, request, [], true, undefined, (e) => { events.push(e); });
    expect(events.map((e) => e.type)).toEqual(["status", "status", "step", "status", "step", "proposal", "delta", "status"]);
    expect(events.filter((e) => e.type === "status").map((e) => e.status.phase)).toEqual(["thinking", "reading", "drafting", "review"]);
    expect(turn.answer).toContain("two-step"); expect(turn.answer).toContain("Company size, Budget");
    expect(turn.questions).toHaveLength(3); expect(turn.proposals[0].title).toBe("Create form: Demo request");
    expect(turn.steps[1].observation).toContain("Booking is on"); expect(JSON.stringify(ws)).toBe(before);
    expect(historySchema.safeParse([turn]).success).toBe(true);
  });
  it("understands name, field and booking follow-ups and replaces only the old pending draft", async () => {
    const ws = workspace(), first = await runBuilder(ws, request, []);
    const refined = await runBuilder(ws, "Call it Revenue demo, add phone and role, booking off", [first]);
    const a = refined.proposals[0].action, initial = first.proposals[0].action;
    if (a.type !== "form.save" || initial.type !== "form.save") throw Error("Expected forms");
    expect(a.form.id).toBe(initial.form.id); expect(a.form.name).toBe("Revenue demo"); expect(a.form.steps).toHaveLength(2);
    expect(a.form.steps.flatMap((s) => s.fields).map((f) => f.id)).toEqual(expect.arrayContaining(["email", "employees", "budget", "phone", "role"]));
    expect(a.form.showBooking).toBe(false); expect(refined.answer).toContain("Job role"); expect(refined.questions).toHaveLength(1);
    const history = appendCompletedTurn([first], refined); expect(history[0].proposals[0].status).toBe("superseded");
    expect(() => confirmedAction(history[0].proposals[0], ws)).toThrow("no longer pending");
    expect(confirmedAction(refined.proposals[0], ws).type).toBe("form.save");
    const yes = await runBuilder(ws, "yes", history); expect(yes.answer).toContain("Saying yes here does not save"); expect(yes.proposals).toHaveLength(0);
    const reenabled = await runBuilder(ws, "Turn on booking", [...history, yes]);
    expect(reenabled.proposals[0].action).toMatchObject({ type: "form.save", form: { id: a.form.id, showBooking: true } });
    expect(ws.forms.some((f) => f.id === a.form.id)).toBe(false);
  });
  it("keeps routing and setting proposals conversational and refinable", async () => {
    const ws = workspace(), rule = await runBuilder(ws, "Germany leads go to Jonas", []);
    const revised = await runBuilder(ws, "also include Sofia", [rule]);
    expect(revised.answer).toContain("Jonas Weber + Sofia Alvarez"); expect(revised.questions?.length).toBeGreaterThan(0);
    expect(revised.proposals[0].action).toMatchObject({ type: "rule.save", rule: { id: rule.proposals[0].action.type === "rule.save" ? rule.proposals[0].action.rule.id : "" } });
    const settings = await runBuilder(ws, "Apollo then Valyu, 50 cents per lead, $100 per month", []);
    const revisedSettings = await runBuilder(ws, "75 cents per lead", [settings]);
    expect(revisedSettings.proposals[0].action).toMatchObject({ type: "settings.save", settings: { enrichOrder: ["apollo", "valyu"], perLeadCapCents: 75, monthlySpendCapCents: 10000 } });
    expect(revisedSettings.answer).toContain("$0.75");
  });
  it("aborts before the next tool and never produces a partially saved draft", async () => {
    const ws = workspace(), before = JSON.stringify(ws), controller = new AbortController(), events: AgentEvent[] = [];
    await expect(runBuilder(ws, request, [], true, controller.signal, (e) => { events.push(e); if (e.type === "status" && e.status.tool === "draft_form") controller.abort(); })).rejects.toThrow();
    expect(events.some((e) => e.type === "proposal")).toBe(false); expect(JSON.stringify(ws)).toBe(before);
  });
  it("streams the real SDK tool loop and answer deltas, but never reasoning tokens or credentials", async () => {
    const model = new MockLanguageModelV4({ doStream: [
      sdkStream([{ type: "tool-call", toolCallId: "c1", toolName: "list_forms", input: "{}" }, finish("tool-calls")]),
      sdkStream([{ type: "tool-call", toolCallId: "c2", toolName: "draft_form", input: JSON.stringify({ description: request }) }, finish("tool-calls")]),
      sdkStream([{ type: "reasoning-start", id: "r" }, { type: "reasoning-delta", id: "r", delta: "private-test-reasoning" }, { type: "reasoning-end", id: "r" }, { type: "text-start", id: "t" }, { type: "text-delta", id: "t", delta: "I drafted your " }, { type: "text-delta", id: "t", delta: "two-step form." }, { type: "text-end", id: "t" }, finish("stop")]),
    ] }); provider.model = model;
    const events: AgentEvent[] = [], ws = liveWorkspace(), before = JSON.stringify(ws);
    const turn = await runBuilder(ws, request, [], true, undefined, (e) => { events.push(e); });
    expect(turn.mode).toContain("openrouter"); expect(model.doStreamCalls).toHaveLength(3);
    expect(events.filter((e) => e.type === "step").map((e) => e.step.tool)).toEqual(["list_forms", "draft_form"]);
    expect(events.filter((e) => e.type === "delta").map((e) => e.text).join("")).toBe("I drafted your two-step form.");
    expect(events.findIndex((e) => e.type === "proposal")).toBeLessThan(events.findIndex((e) => e.type === "delta"));
    expect(JSON.stringify(events)).not.toMatch(/private-test-reasoning|unit-test-placeholder/); expect(JSON.stringify(ws)).toBe(before);
  });
  it("explicitly resets unfinished live drafts before a labeled demo fallback", async () => {
    provider.model = new MockLanguageModelV4({ doStream: [
      sdkStream([{ type: "tool-call", toolCallId: "c", toolName: "draft_form", input: JSON.stringify({ description: request }) }, finish("tool-calls")]),
      sdkStream([{ type: "error", error: new Error("unit-test-provider-failure") }]),
    ] });
    const events: AgentEvent[] = [];
    const turn = await runBuilder(liveWorkspace(), request, [], true, undefined, (e) => { events.push(e); });
    expect(turn.mode).toContain("live provider unavailable"); expect(events.some((e) => e.type === "reset")).toBe(true);
    expect(turn.proposals).toHaveLength(1); expect(JSON.stringify(events)).not.toContain("unit-test-provider-failure");
  });
});

describe("SSE framing and safe response consumption", () => {
  it("handles arbitrary chunk splits, CRLF and comments", () => {
    const event: AgentEvent = { type: "status", status: { phase: "thinking", label: "Thinking → building" } };
    const text = ": heartbeat\r\n\r\n" + encodeAgentEvent(event).replaceAll("\n", "\r\n"), decoder = new AgentEventDecoder(), result: AgentEvent[] = [];
    for (const char of text) result.push(...decoder.push(char));
    expect(result).toEqual([event]); expect(() => decoder.push('data: {"bad":true}\n\n')).toThrow("invalid progress");
  });
  it("delivers proposals while the response is still open and only returns a valid done turn", async () => {
    const turn = await runBuilder(workspace(), request, []), events: AgentEvent[] = [];
    let controller!: ReadableStreamDefaultController<Uint8Array>;
    const body = new ReadableStream<Uint8Array>({ start(c) { controller = c; } });
    const response = new Response(body, { headers: { "Content-Type": "text/event-stream" } });
    let finished = false;
    const reading = readAgentResponse(response, (e) => { events.push(e); }).then((t) => { finished = true; return t; });
    controller.enqueue(new TextEncoder().encode(encodeAgentEvent({ type: "proposal", proposal: turn.proposals[0] })));
    await new Promise((resolve) => setTimeout(resolve, 0)); expect(events).toHaveLength(1); expect(finished).toBe(false);
    controller.enqueue(new TextEncoder().encode(encodeAgentEvent({ type: "done", turn }))); controller.close();
    expect((await reading).id).toBe(turn.id);
  });
  it("decodes split UTF-8 codepoints and supports the complete JSON compatibility path", async () => {
    const turn = await runBuilder(workspace(), request, []), bytes = new TextEncoder().encode(encodeAgentEvent({ type: "done", turn }));
    const body = new ReadableStream<Uint8Array>({ start(c) { for (const byte of bytes) c.enqueue(Uint8Array.of(byte)); c.close(); } });
    expect((await readAgentResponse(new Response(body, { headers: { "Content-Type": "text/event-stream" } }), () => {})).answer).toBe(turn.answer);
    expect((await readAgentResponse(new Response(JSON.stringify({ turn })), () => {})).id).toBe(turn.id);
  });
  it("rejects truncated/error streams instead of persisting half a turn", async () => {
    const event: AgentEvent = { type: "status", status: { phase: "thinking", label: "Thinking" } };
    await expect(readAgentResponse(new Response(encodeAgentEvent(event), { headers: { "Content-Type": "text/event-stream" } }), () => {})).rejects.toThrow("before the review was complete");
    await expect(readAgentResponse(new Response(encodeAgentEvent({ type: "error", message: "Safe error; no changes saved" }), { headers: { "Content-Type": "text/event-stream" } }), () => {})).rejects.toThrow("Safe error");
  });
});
