import { test, expect, type Page } from "@playwright/test";
import fs from "node:fs/promises";
import type { AgentTurn } from "@/lib/agent/contracts";
const baseURL = process.env.BASE_URL || "http://localhost:3307";
const local = /^https?:\/\/(localhost|127\.0\.0\.1)(:|\/|$)/.test(baseURL);
async function send(page: Page, request: string): Promise<AgentTurn> {
  await page.getByRole("textbox", { name: "Ask the agent", exact: true }).fill(request);
  const response = page.waitForResponse((r) => r.url().endsWith("/api/app/agent") && r.request().method() === "POST");
  await page.getByRole("button", { name: "Send request", exact: true }).click();
  const r = await response; expect(r.status()).toBe(200);
  return (await r.json()).turn;
}
async function savedInSnapshot(page: Page, kind: "forms" | "rules", id: string) {
  return page.evaluate(({ kind, id }) => Object.keys(localStorage).filter((k) => k.startsWith("vr:ws:")).some((k) => JSON.parse(localStorage.getItem(k)!)[kind]?.some((item: { id: string }) => item.id === id)), { kind, id });
}
for (const width of [375, 1280]) test(`Agents builder connects confirmed forms, routing and settings at ${width}px`, async ({ page, context }) => {
  test.skip(!local, "Never save production customer data during QA");
  await fs.mkdir("reports/screens", { recursive: true });
  await page.setViewportSize({ width, height: 1000 });
  expect((await context.request.post(baseURL + "/api/auth/login", { data: { email: "demo@velaroute.dev", password: "demo1234" } })).ok()).toBeTruthy();
  await page.goto(baseURL + "/app/agents");
  await expect(page.getByRole("textbox", { name: "Ask the agent", exact: true })).toBeEnabled();
  await page.evaluate(() => document.fonts.ready);
  await expect(page.getByRole("heading", { level: 1 })).not.toContainText("Dylan");
  await expect(page.getByRole("region", { name: "Pipeline agents" }).getByRole("link")).toHaveCount(8);
  await page.screenshot({ path: `reports/screens/agents-chat-${width}.png` });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBeTruthy();

  const response = page.waitForResponse((r) => r.url().endsWith("/api/app/agent") && r.request().method() === "POST");
  await page.getByRole("button", { name: "Build a demo form", exact: true }).click();
  const formTurn: AgentTurn = (await (await response).json()).turn;
  const formAction = formTurn.proposals[0].action;
  if (formAction.type !== "form.save") throw Error("Expected form proposal");
  const formCard = page.locator("[data-agent-proposal]").last();
  await expect(formCard).toContainText("Work email"); await expect(formCard).toContainText("Budget");
  await expect(page.getByText("Action · list_forms", { exact: true })).toBeVisible();
  expect(await savedInSnapshot(page, "forms", formAction.form.id)).toBe(false);
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: `reports/screens/agents-chat-proposal-${width}.png`, fullPage: true });
  await formCard.screenshot({ path: `reports/screens/agents-chat-proposal-card-${width}.png` });
  await formCard.getByRole("button", { name: "Confirm & save", exact: true }).click();
  await expect(formCard.locator("[data-agent-saved]")).toBeVisible();
  expect(await savedInSnapshot(page, "forms", formAction.form.id)).toBe(true);
  await formCard.screenshot({ path: `reports/screens/agents-chat-confirmed-card-${width}.png` });
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: `reports/screens/agents-chat-confirmed-${width}.png`, fullPage: true });
  await page.reload(); await expect(page.locator("[data-agent-saved]")).toBeVisible();
  await page.getByRole("link", { name: "Open in form editor", exact: true }).click();
  await expect(page).toHaveURL(new RegExp(`/app/forms/${formAction.form.id}$`));
  await expect(page.getByRole("textbox", { name: "Form name", exact: true })).toHaveValue(formAction.form.name);
  await expect(page.locator('input[value="Company size"]')).toHaveValue("Company size");

  await page.goto(baseURL + "/app/agents");
  await send(page, "enterprise leads in Germany go to Jonas, everyone else round-robin");
  await expect(page.locator("[data-agent-turn]").last()).toContainText("employee threshold");
  const ruleTurn = await send(page, "at least 1000 employees");
  const ruleAction = ruleTurn.proposals[0].action;
  if (ruleAction.type !== "rule.save" || !ruleAction.rule.id) throw Error("Expected routing proposal");
  const ruleCard = page.locator("[data-agent-proposal]").last();
  await expect(ruleCard).toContainText("Country is DE"); await expect(ruleCard).toContainText("Jonas Weber");
  expect(await savedInSnapshot(page, "rules", ruleAction.rule.id)).toBe(false);
  await ruleCard.getByRole("button", { name: "Confirm & save", exact: true }).click();
  await expect(ruleCard.locator("[data-agent-saved]")).toBeVisible();
  expect(await savedInSnapshot(page, "rules", ruleAction.rule.id)).toBe(true);
  await ruleCard.getByRole("link", { name: "Open in Routing", exact: true }).click();
  await expect(page.getByText(ruleAction.rule.name, { exact: true })).toBeVisible();

  await page.goto(baseURL + "/app/agents");
  const cap = width === 375 ? 55 : 65;
  const settingsTurn = await send(page, `Set enrichment to Valyu then Apollo, ${cap} cents per lead, $120 per month`);
  expect(settingsTurn.proposals[0].action.type).toBe("settings.save");
  const settingsCard = page.locator("[data-agent-proposal]").last();
  await expect(settingsCard).toContainText(`$0.${cap}`);
  await settingsCard.getByRole("button", { name: "Confirm & save", exact: true }).click();
  await expect(settingsCard.locator("[data-agent-saved]")).toBeVisible();
  await settingsCard.getByRole("link", { name: "Open in Settings", exact: true }).click();
  await expect(page.getByLabel("Per-lead cap (cents)", { exact: true })).toHaveValue(String(cap));
  await expect(page.getByRole("button", { name: /valyu.*#1/i })).toBeVisible();
});

test("Agent API requires a session, validates input and never saves a proposal", async ({ request }) => {
  test.skip(!local, "Isolated local workspace only");
  expect((await request.post(baseURL + "/api/app/agent", { data: { message: "Build a demo form" } })).status()).toBe(401);
  await request.post(baseURL + "/api/auth/login", { data: { email: "demo@velaroute.dev", password: "demo1234" } });
  expect((await request.post(baseURL + "/api/app/agent", { data: { message: "" } })).status()).toBe(400);
  const before = (await (await request.get(baseURL + "/api/app/state")).json()).ws;
  const r = await request.post(baseURL + "/api/app/agent", { data: { message: "Build a demo form", history: [], snapshot: before } });
  expect(r.status()).toBe(200);
  const data = await r.json(); expect(data.turn.proposals).toHaveLength(1); expect(data.ws).toBeUndefined();
  const after = (await (await request.get(baseURL + "/api/app/state")).json()).ws;
  expect(after.forms).toEqual(before.forms); expect(after.rules).toEqual(before.rules); expect(after.settings).toEqual(before.settings);
});
