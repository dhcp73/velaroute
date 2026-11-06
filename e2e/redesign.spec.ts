import { test, expect } from "@playwright/test";

const baseURL = process.env.BASE_URL || "http://localhost:3307";
// Interactive checks only touch an isolated local demo workspace.
const local = /^https?:\/\/(localhost|127\.0\.0\.1)(:|\/|$)/.test(baseURL);
const site = ["/", "/product", "/pricing", "/about", "/blog", "/customers", "/careers", "/changelog", "/contact", "/how-it-works", "/security", "/status", "/docs", "/docs/pricing", "/legal/privacy", "/legal/terms", "/legal/dpa", "/login", "/signup"];
const app = ["/app", "/app/inbox", "/app/routing", "/app/forms", "/app/settings/integrations", "/app/settings", "/app/analytics", "/app/agents", "/app/accounts", "/app/meetings", "/app/health", "/app/settings/developers", "/app/forms/frm_demo"];

for (const width of [375, 1280]) {
  test(`marketing routes have no horizontal overflow at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    for (const path of site) {
      const res = await page.goto(baseURL + path);
      expect(res?.status(), path).toBe(200);
      await (path === "/app/forms/frm_demo" ? page.getByRole("textbox", { name: "Form name", exact: true }) : page.locator("h1").first()).waitFor({ timeout: 10_000 });
      await page.evaluate(() => document.fonts.ready);
      const overflow = await page.evaluate(() => Array.from(document.querySelectorAll("body *")).filter((el) => { const r = el.getBoundingClientRect(); return r.right > innerWidth + 1 && getComputedStyle(el).position !== "fixed"; }).map((el) => `${el.tagName}.${el.className}: ${Math.round(el.getBoundingClientRect().width)}`).slice(0, 15));
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1), `${path}: ${overflow.join("; ")}`).toBeTruthy();
    }
  });
  test(`workspace routes have no horizontal overflow at ${width}px`, async ({ page, context }) => {
    test.skip(!local, "Local demo workspace only");
    await page.setViewportSize({ width, height: 900 });
    const r = await context.request.post(baseURL + "/api/auth/login", { data: { email: "demo@velaroute.dev", password: "demo1234" } });
    expect(r.ok()).toBeTruthy();
    for (const path of app) {
      const res = await page.goto(baseURL + path);
      expect(res?.status(), path).toBe(200);
      await (path === "/app/forms/frm_demo" ? page.getByRole("textbox", { name: "Form name", exact: true }) : page.locator("h1").first()).waitFor({ timeout: 10_000 });
      const overflow = await page.evaluate(() => Array.from(document.querySelectorAll("body *")).filter((el) => { const r = el.getBoundingClientRect(); return r.right > innerWidth + 1 && getComputedStyle(el).position !== "fixed"; }).map((el) => `${el.tagName}.${el.className}: ${Math.round(el.getBoundingClientRect().width)}`).slice(0, 15));
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1), `${path}: ${overflow.join("; ")}`).toBeTruthy();
    }
  });
}

test("modern sans, white/orange tokens and dark mode render", async ({ page }) => {
  await page.goto(baseURL);
  await expect(page.locator("h1")).toContainText("clear next step");
  await page.evaluate(() => document.fonts.ready);
  expect(await page.locator("h1").evaluate((el) => getComputedStyle(el).fontFamily)).toContain("Plus Jakarta Sans");
  expect(await page.locator("body").evaluate((el) => getComputedStyle(el).fontFamily)).toContain("Plus Jakarta Sans");
  await expect(page.locator("body")).toHaveCSS("background-color", "rgb(255, 255, 255)");
  await expect(page.getByRole("link", { name: "Start free for 14 days", exact: true })).toHaveCSS("background-color", "rgb(207, 63, 22)");
  expect(await page.locator("h1").evaluate((el) => getComputedStyle(el).fontStyle)).toBe("normal");
  await page.evaluate(() => localStorage.setItem("theme", "dark"));
  await page.reload();
  await expect(page.locator("html")).toHaveClass(/dark/);
  await expect(page.locator("body")).toHaveCSS("background-color", "rgb(16, 18, 22)");
});

test("mobile navigation opens and routes", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto(baseURL);
  await page.getByRole("button", { name: "Open menu", exact: true }).click();
  await page.getByRole("navigation", { name: "Mobile", exact: true }).getByRole("link", { name: "Pricing", exact: true }).click();
  await expect(page).toHaveURL(/pricing/);
  await expect(page.getByRole("navigation", { name: "Mobile", exact: true })).toHaveCount(0);
});

test("demo login, sandbox integration and plan switch survive reload", async ({ page }) => {
  test.skip(!local, "Local demo workspace only");
  await page.goto(baseURL + "/login?demo=1");
  await page.getByRole("button", { name: /sign in|log in/i }).click();
  await expect(page).toHaveURL(/\/app/);
  await page.goto(baseURL + "/app/settings/integrations");
  await page.getByRole("heading", { name: "Integrations", exact: true }).waitFor();
  const provider = page.locator(".card").filter({ has: page.getByRole("heading", { name: "OpenAI", exact: true }) });
  await provider.getByRole("button", { name: /Connect|Update key/, exact: true }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.getByRole("button", { name: "Use sandbox", exact: true }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(provider).toContainText("Sandbox");
  await page.goto(baseURL + "/app/settings");
  await page.getByRole("button", { name: "Switch to Scale", exact: true }).click();
  const scale = page.locator(".card").filter({ has: page.getByRole("heading", { name: "Scale", exact: true }) });
  await expect(scale).toContainText("Current plan");
  await expect(scale).toContainText("10,000 inbound leads");
  await page.reload();
  await expect(scale).toContainText("Current plan");
  await page.getByRole("button", { name: "Switch to Growth", exact: true }).click();
  const growth = page.locator(".card").filter({ has: page.getByRole("heading", { name: "Growth", exact: true }) });
  await expect(growth).toContainText("Current plan");
  await expect(growth).toContainText("2,500 inbound leads");
  await expect(page.getByText(/No card is charged/)).toBeVisible();
});
