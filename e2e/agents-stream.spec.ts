import fs from "node:fs/promises";
import { test, expect } from "@playwright/test";
import { AgentEventDecoder, encodeAgentEvent } from "@/lib/agent/stream";
const baseURL = process.env.BASE_URL || "http://localhost:3307";
const local = /^https?:\/\/(localhost|127\.0\.0\.1)(:|\/|$)/.test(baseURL);
const request = "Build a two-step demo form with company size and budget";
type Observed = { phases: string[]; steps: number; proposalWhileWorking: boolean; pendingPersisted: boolean };
declare global { interface Window { __vrProgress: Observed } }

for (const width of [375, 1280]) test(`Live progress and conversational form refinements at ${width}px`, async ({ page, context }) => {
  test.skip(!local, "Isolated local workspace only — never save production config");
  await page.setViewportSize({ width, height: 1000 });
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.addInitScript(() => {
    window.__vrProgress = { phases: [], steps: 0, proposalWhileWorking: false, pendingPersisted: false };
    new MutationObserver(() => {
      const live = document.querySelector("[data-agent-live]"); if (!live) return;
      const status = live.querySelector("[data-agent-status]");
      const phase = status?.getAttribute("data-phase"); if (phase && !window.__vrProgress.phases.includes(phase)) window.__vrProgress.phases.push(phase);
      window.__vrProgress.steps = Math.max(window.__vrProgress.steps, live.querySelectorAll("[data-agent-live-step]").length);
      if (status && live.querySelector("[data-agent-live-proposal]")) window.__vrProgress.proposalWhileWorking = true;
      if (status && Object.keys(localStorage).filter((k) => k.startsWith("vr:agent-chat:v1:")).some((k) => JSON.parse(localStorage.getItem(k) || "[]").length)) window.__vrProgress.pendingPersisted = true;
    }).observe(document, { childList: true, subtree: true, attributes: true });
  });
  await context.request.post(baseURL + "/api/auth/login", { data: { email: "demo@velaroute.dev", password: "demo1234" } });
  await page.goto(baseURL + "/app/agents");
  await expect(page.getByRole("textbox", { name: "Ask the agent", exact: true })).toBeEnabled();
  const before = await page.evaluate(() => { const k = Object.keys(localStorage).find((k) => k.startsWith("vr:ws:"))!; const ws = JSON.parse(localStorage.getItem(k)!); return JSON.stringify({ forms: ws.forms, rules: ws.rules, settings: ws.settings }); });
  const response = page.waitForResponse((r) => r.url().endsWith("/api/app/agent") && r.request().method() === "POST");
  await page.getByRole("button", { name: "Build a demo form", exact: true }).click();
  await expect(page.locator("[data-agent-live]")).toContainText(request);
  await expect(page.locator("[data-agent-status]")).toBeVisible();
  expect(await page.locator(".agent-working-mark").evaluate((el) => getComputedStyle(el, "::before").animationName)).toBe("agent-orbit");
  await page.locator("[data-agent-live]").scrollIntoViewIfNeeded();
  await page.screenshot({ path: `reports/screens/agents-chat-thinking-${width}.png` });
  await page.waitForFunction(() => window.__vrProgress.proposalWhileWorking);
  await page.screenshot({ path: `reports/screens/agents-chat-building-${width}.png` });
  const r = await response; expect(r.headers()["content-type"]).toContain("text/event-stream");
  const done = new AgentEventDecoder().push(await r.text()).find((e) => e.type === "done"); expect(done?.type).toBe("done");
  const first = page.locator("[data-agent-turn]").last();
  await expect(first).toContainText("I drafted “Demo request” as a two-step form");
  await expect(first.locator("[data-agent-questions]")).toContainText("What should we call this form?");
  await expect(first.locator("[data-agent-questions] li")).toHaveCount(3);
  const observed = await page.evaluate(() => window.__vrProgress);
  expect(observed.phases).toEqual(expect.arrayContaining(["thinking", "reading", "drafting", "review"]));
  expect(observed.steps).toBe(2); expect(observed.proposalWhileWorking).toBe(true); expect(observed.pendingPersisted).toBe(false);
  await page.evaluate(() => scrollTo(0, 0));
  const bounds = await first.boundingBox();
  await fs.writeFile(`reports/screens/agents-chat-conversation-${width}.bounds.json`, JSON.stringify(bounds));
  await page.screenshot({ path: `reports/screens/agents-chat-conversation-full-${width}.png`, fullPage: true });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.emulateMedia({ reducedMotion: "reduce" });
  // Replies refine the same pending form, not a disconnected replacement or an implicit save.
  await page.getByRole("textbox", { name: "Ask the agent", exact: true }).fill("Call it Revenue demo, add phone and role, booking off");
  await page.getByRole("button", { name: "Send request", exact: true }).click();
  await expect(page.locator("[data-agent-status]")).toBeVisible();
  expect(await page.locator(".agent-working-mark").evaluate((el) => getComputedStyle(el, "::before").animationName)).toBe("none");
  const refined = page.locator("[data-agent-turn]").last();
  await expect(refined).toContainText("Revenue demo"); await expect(refined).toContainText("Job role");
  await expect(refined).toContainText("Booking is off");
  await expect(page.locator("[data-agent-turn]").first().locator("[data-agent-proposal]")).toContainText("Replaced");
  expect(await page.evaluate(() => { const k = Object.keys(localStorage).find((k) => k.startsWith("vr:ws:"))!; const ws = JSON.parse(localStorage.getItem(k)!); return JSON.stringify({ forms: ws.forms, rules: ws.rules, settings: ws.settings }); })).toBe(before);
});

test("Stop cancels live work without persisting a partial turn", async ({ page, context }) => {
  test.skip(!local, "Local demo only");
  await context.request.post(baseURL + "/api/auth/login", { data: { email: "demo@velaroute.dev", password: "demo1234" } });
  await page.goto(baseURL + "/app/agents"); await expect(page.getByRole("textbox", { name: "Ask the agent", exact: true })).toBeEnabled();
  await page.getByRole("button", { name: "Build a demo form", exact: true }).click();
  await page.getByRole("button", { name: "Stop building", exact: true }).click();
  await expect(page.locator("[data-agent-chat]").getByRole("alert")).toContainText("Request stopped");
  await expect(page.locator("[data-agent-proposal]")).toHaveCount(0);
  expect(await page.evaluate(() => Object.keys(localStorage).filter((k) => k.startsWith("vr:agent-chat:v1:")).every((k) => JSON.parse(localStorage.getItem(k)!).length === 0))).toBe(true);
  await page.reload(); await expect(page.locator("[data-agent-turn]")).toHaveCount(0);
});

test("Stream errors restore the request and show a safe retry message", async ({ page, context }) => {
  test.skip(!local, "Local demo only");
  await context.request.post(baseURL + "/api/auth/login", { data: { email: "demo@velaroute.dev", password: "demo1234" } });
  await page.goto(baseURL + "/app/agents"); await expect(page.getByRole("textbox", { name: "Ask the agent", exact: true })).toBeEnabled();
  await page.route("**/api/app/agent", (route) => route.fulfill({ contentType: "text/event-stream", body: encodeAgentEvent({ type: "error", message: "The connection stopped. Try again; no changes saved." }) }));
  await page.getByRole("button", { name: "Build a demo form", exact: true }).click();
  await expect(page.locator("[data-agent-chat]").getByRole("alert")).toContainText("Try again");
  await expect(page.getByRole("textbox", { name: "Ask the agent", exact: true })).toHaveValue(request);
  await expect(page.locator("[data-agent-turn]")).toHaveCount(0);
});
