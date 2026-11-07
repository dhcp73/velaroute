import { afterEach, describe, expect, it, vi } from "vitest";
import { ToolLoopAgent, isStepCount } from "ai";
import { MockLanguageModelV4 } from "ai/test";
import { Valyu, type SearchResponse } from "valyu-js";
import { demoWorkspace } from "@/lib/engine/seed";
import { confirmedAction, historySchema, propose } from "@/lib/agent/contracts";
import { agentProvider, createAgentTools, runBuilder } from "@/lib/server/agent";
import { runAction } from "@/lib/server/service";
import { NOW } from "./helpers";
const workspace = () => demoWorkspace("ws_agent_test", NOW);
afterEach(() => vi.restoreAllMocks());

describe("Agent builder: proposals before writes", () => {
  it("builds a real multi-step form through read → draft tools, without saving", async () => {
    const ws = workspace(), before = JSON.stringify(ws);
    const turn = await runBuilder(ws, "Build a two-step demo form with company size and budget", []);
    expect(turn.mode).toContain("Demo planner");
    expect(turn.steps.map((s) => s.tool)).toEqual(["list_forms", "draft_form"]);
    expect(turn.proposals).toHaveLength(1);
    const proposal = turn.proposals[0];
    expect(proposal.action.type).toBe("form.save");
    if (proposal.action.type !== "form.save") throw Error("Expected form");
    expect(proposal.action.form.steps).toHaveLength(2);
    expect(proposal.action.form.steps.flatMap((s) => s.fields).map((f) => f.id)).toContain("budget");
    expect(JSON.stringify(ws)).toBe(before);
    await runAction(ws, confirmedAction(proposal, ws), "test", NOW);
    expect(ws.forms.find((f) => f.id === (proposal.action.type === "form.save" ? proposal.action.form.id : ""))?.status).toBe("draft");
    expect(() => confirmedAction(proposal, ws)).toThrow(); // stale duplicate cannot be saved twice
  });
  it("updates the same manual form, preserves unrelated fields and requires confirmation", async () => {
    const ws = workspace(), original = structuredClone(ws.forms[0]);
    const turn = await runBuilder(ws, `Add a phone field to ${original.name}`, []);
    expect(ws.forms[0]).toEqual(original);
    expect(turn.proposals, turn.answer).toHaveLength(1);
    const action = confirmedAction(turn.proposals[0], ws);
    expect(action.type).toBe("form.save");
    await runAction(ws, action, "test", NOW);
    expect(ws.forms[0].id).toBe(original.id);
    expect(ws.forms[0].steps.flatMap((s) => s.fields)).toEqual(expect.arrayContaining(original.steps.flatMap((s) => s.fields)));
    expect(ws.forms[0].steps.flatMap((s) => s.fields).map((f) => f.id)).toContain("phone");
  });
  it("applies a live-tool description to the selected existing form ID", async () => {
    const ws = workspace(); const ctx = createAgentTools(ws, []);
    const result = await ctx.run("draft_form", { formId: ws.forms[0].id, description: "Add a phone field" });
    const action = result.proposal?.action;
    if (action?.type !== "form.save") throw Error(result.summary);
    expect(action.form.id).toBe(ws.forms[0].id);
    expect(action.form.steps.flatMap((s) => s.fields).map((f) => f.id)).toContain("phone");
  });
  it("continues an unsaved form proposal with a new field", async () => {
    const ws = workspace();
    const first = await runBuilder(ws, "Build a demo form", []);
    const next = await runBuilder(ws, "Add a phone field", [first]);
    const a = first.proposals[0].action, b = next.proposals[0].action;
    if (a.type !== "form.save" || b.type !== "form.save") throw Error("Expected forms");
    expect(a.form.id).toBe(b.form.id);
    expect(b.form.steps.flatMap((s) => s.fields).map((f) => f.id)).toContain("phone");
  });
  it("clarifies enterprise thresholds then drafts Germany → actual Jonas", async () => {
    const ws = workspace();
    const first = await runBuilder(ws, "enterprise leads in Germany go to Jonas, everyone else round-robin", []);
    expect(first.needsClarification).toBe(true); expect(first.proposals).toHaveLength(0);
    const next = await runBuilder(ws, "at least 1000 employees", [first]);
    expect(next.needsClarification).toBe(false);
    const action = next.proposals[0].action;
    if (action.type !== "rule.save") throw Error("Expected routing");
    expect(action.rule.conditions).toEqual(expect.arrayContaining([{ field: "country", op: "equals", value: "DE" }, { field: "employees", op: "gte", value: "1000" }]));
    expect(action.rule.repIds).toEqual([ws.reps.find((r) => r.name === "Jonas Weber")!.id]);
    const count = ws.rules.length;
    await runAction(ws, confirmedAction(next.proposals[0], ws), "test", NOW);
    expect(ws.rules).toHaveLength(count + 1);
  });
  it("proposes provider order and cent caps that appear in normal settings after confirmation", async () => {
    const ws = workspace(), before = { ...ws.settings };
    const turn = await runBuilder(ws, "Apollo then Valyu, 50 cents per lead, $100 per month", []);
    expect(ws.settings).toEqual(before);
    const action = confirmedAction(turn.proposals[0], ws);
    expect(action).toEqual({ type: "settings.save", settings: { enrichOrder: ["apollo", "valyu"], perLeadCapCents: 50, monthlySpendCapCents: 10000 } });
    await runAction(ws, action, "test", NOW);
    expect(ws.settings.perLeadCapCents).toBe(50); expect(ws.settings.enrichOrder).toEqual(["apollo", "valyu"]);
  });
  it("supports explicit guard and SLA settings", async () => {
    const ws = workspace();
    const turn = await runBuilder(ws, "Set SLA to 5 minutes, escalate after 10 minutes, guard block at 80 and review at 40", []);
    expect(turn.proposals[0].action).toMatchObject({ type: "settings.save", settings: { slaMinutes: 5, escalateAfterMinutes: 10, botBlockScore: 80, botReviewScore: 40 } });
  });
  it("supports comma-separated dollar caps and rejects negative budgets", async () => {
    const ws = workspace();
    const result = await runBuilder(ws, "Apollo then Valyu, $1,000 per month", []);
    expect(result.proposals[0].action).toMatchObject({ settings: { monthlySpendCapCents: 100000 } });
    expect((await runBuilder(ws, "Apollo then Valyu, -50 cents per lead", [])).proposals).toHaveLength(0);
  });
  it("can propose a connected form and routing workflow in one request", async () => {
    const ws = workspace();
    const turn = await runBuilder(ws, "Build a demo form; Germany leads go to Jonas", []);
    expect(turn.proposals.map((p) => p.action.type)).toEqual(["form.save", "rule.save"]);
    expect(ws.forms.some((f) => f.name === "Demo request")).toBe(false);
  });
  it("denies settings changes for members", async () => {
    const turn = await runBuilder(workspace(), "Apollo then Valyu", [], false);
    expect(turn.proposals).toHaveLength(0); expect(turn.answer).toContain("admins");
  });
  it("does not confuse list forms with building a form", async () => {
    const turn = await runBuilder(workspace(), "List forms", []);
    expect(turn.proposals).toHaveLength(0); expect(turn.steps[0].tool).toBe("list_forms");
  });
  it("reads and explains actual routing without modifying the workspace", async () => {
    const ws = workspace(), before = JSON.stringify(ws);
    const turn = await runBuilder(ws, "Explain routing for maya@kestrel.ai", []);
    expect(turn.steps[0].tool).toBe("explain_route"); expect(turn.answer).toContain("Router dry-run");
    expect(JSON.stringify(ws)).toBe(before); expect(turn.proposals).toHaveLength(0);
  });
  it.each(["create_lead", "book_meeting", "update_stage", "log_touch"])("wraps existing write tool %s as a proposal, never direct execution", async (name) => {
    const ws = workspace(), before = JSON.stringify(ws), ctx = createAgentTools(ws, []);
    const args = name === "create_lead" ? { email: "new@example.test", name: "New Lead" } : name === "book_meeting" ? { leadId: ws.leads[0].id, start: "2026-11-09T15:00:00.000Z" } : name === "update_stage" ? { leadId: ws.leads[0].id, stage: "working" } : { leadId: ws.leads[0].id, kind: "note", text: "Follow up" };
    const result = await ctx.run(name, args);
    expect(result.proposal).toBeDefined(); expect(JSON.stringify(ws)).toBe(before);
  });
  it("cannot override a tool's action type through extra arguments", async () => {
    const ws = workspace(), ctx = createAgentTools(ws, [], false);
    const r = await ctx.run("book_meeting", { type: "settings.save", settings: { perLeadCapCents: 10 }, leadId: ws.leads[0].id, start: "2026-11-09T15:00:00.000Z" });
    expect(r.proposal?.action.type).toBe("lead.book");
  });
  it("rejects stale setting proposals instead of overwriting manual changes", async () => {
    const ws = workspace();
    const p = propose(ws, { type: "settings.save", settings: { slaMinutes: 3 } }, "SLA", "Change SLA");
    ws.settings.slaMinutes = 20;
    expect(() => confirmedAction(p, ws)).toThrow("changed since");
  });
  it("rejects fabricated reps, invalid ranges and unsafe persisted actions", () => {
    const ws = workspace();
    expect(() => propose(ws, { type: "rule.save", rule: { name: "Bad", enabled: true, match: "all", conditions: [], repIds: ["invented"] } }, "Bad", "Bad")).toThrow();
    expect(() => propose(ws, { type: "settings.save", settings: { botReviewScore: 99, botBlockScore: 80 } }, "Bad", "Bad")).toThrow();
    expect(() => propose(ws, { type: "integration.connect", id: "openrouter", secret: "not-allowed" }, "Bad", "Bad")).toThrow();
    const p = propose(ws, { type: "settings.save", settings: { slaMinutes: 3 } }, "SLA", "Change SLA");
    p.status = "dismissed"; expect(() => confirmedAction(p, ws)).toThrow("no longer pending");
  });
  it("validates persisted conversation schema", async () => {
    const turn = await runBuilder(workspace(), "Build a demo form", []);
    expect(historySchema.parse(JSON.parse(JSON.stringify([turn])))).toHaveLength(1);
    const bad = structuredClone(turn); bad.proposals[0].href = "javascript:alert(1)";
    expect(historySchema.safeParse([bad]).success).toBe(false);
  });
  it("does not fabricate live research when Valyu is missing or sandbox", async () => {
    const ws = workspace(), spy = vi.spyOn(Valyu.prototype, "search");
    const r = await createAgentTools(ws, []).run("valyu_search", { query: "Research Acme company" });
    expect(r.summary).toContain("did not run"); expect(spy).not.toHaveBeenCalled();
  });
  it("uses the existing Valyu SDK and returns real SDK sources without leaking its key", async () => {
    const ws = workspace(); ws.integrations.find((i) => i.id === "valyu")!.connected = true; ws.integrations.find((i) => i.id === "valyu")!.secret = "unit-test-placeholder";
    const search = vi.spyOn(Valyu.prototype, "search").mockResolvedValue({ success: true, results: [{ title: "Company source", url: "https://example.com", content: "Verified company context" }] } as SearchResponse);
    const ctx = createAgentTools(ws, []); const r = await ctx.run("valyu_search", { query: "Research Acme company" });
    expect(search).toHaveBeenCalledWith("Research Acme company", expect.objectContaining({ maxNumResults: 3 }));
    expect(r.summary).toContain("Verified company context"); expect(JSON.stringify(ctx.steps)).not.toContain("unit-test-placeholder");
  });
  it("prefers connected OpenRouter and falls back to the configured provider", () => {
    const ws = workspace(); ws.settings.aiProvider = "openai";
    for (const id of ["openrouter", "openai"] as const) { const i = ws.integrations.find((x) => x.id === id)!; i.connected = true; i.secret = "unit-test-placeholder"; }
    expect(agentProvider(ws)).toMatchObject({ provider: "openrouter", modelId: "openai/gpt-4.1-mini" });
    ws.integrations.find((i) => i.id === "openrouter")!.secret = "sandbox";
    expect(agentProvider(ws)?.provider).toBe("openai");
  });
  it("executes a real SDK ReAct loop: inspect → observe → propose → final", async () => {
    const ws = workspace(), before = JSON.stringify(ws), ctx = createAgentTools(ws, []);
    const usage = { inputTokens: { total: 10, noCache: 10, cacheRead: undefined, cacheWrite: undefined }, outputTokens: { total: 5, text: 5, reasoning: undefined } };
    const model = new MockLanguageModelV4({ doGenerate: [
      { content: [{ type: "tool-call", toolCallId: "c1", toolName: "list_forms", input: "{}" }], finishReason: { unified: "tool-calls", raw: undefined }, usage, warnings: [] },
      { content: [{ type: "tool-call", toolCallId: "c2", toolName: "draft_form", input: '{"description":"Build a demo form"}' }], finishReason: { unified: "tool-calls", raw: undefined }, usage, warnings: [] },
      { content: [{ type: "text", text: "Review your form proposal. Nothing is saved." }], finishReason: { unified: "stop", raw: undefined }, usage, warnings: [] },
    ] });
    const result = await new ToolLoopAgent({ model, tools: ctx.tools, stopWhen: isStepCount(5) }).generate({ prompt: "Build a demo form" });
    expect(result.text).toContain("Nothing is saved"); expect(model.doGenerateCalls).toHaveLength(3);
    expect(ctx.steps.map((s) => s.tool)).toEqual(["list_forms", "draft_form"]); expect(ctx.proposals).toHaveLength(1); expect(JSON.stringify(ws)).toBe(before);
  });
});
