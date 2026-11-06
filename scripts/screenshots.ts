/**
 * Captures real product screenshots for the in-app docs (public/docs/screens) and a QA set (reports/screens).
 * Usage: BASE_URL=http://localhost:3300 npm run screenshots
 */
import { chromium, type Page } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";

const BASE = process.env.BASE_URL ?? "http://localhost:3300";
const DOCS = path.join(process.cwd(), "public/docs/screens");
const QA = path.join(process.cwd(), "reports/screens");
const ONLY_QA = process.argv.includes("--qa");

const APP_SHOTS: [string, string][] = [
  ["overview", "/app"], ["inbox", "/app/inbox"], ["routing", "/app/routing"], ["forms", "/app/forms"], ["form-builder", "/app/forms/frm_demo"],
  ["analytics", "/app/analytics"], ["settings", "/app/settings"], ["integrations", "/app/settings/integrations"], ["developers", "/app/settings/developers"], ["health", "/app/health"],
  ["meetings", "/app/meetings"], ["agents", "/app/agents"], ["accounts", "/app/accounts"],
];
const SITE = ["/", "/product", "/how-it-works", "/pricing", "/customers", "/about", "/blog", "/blog/fair-round-robin", "/docs", "/docs/routing", "/contact", "/status", "/changelog", "/careers", "/security", "/legal/privacy", "/login", "/signup", "/f/ws_demo/book-a-demo"];

async function settle(page: Page) {
  await page.waitForLoadState("networkidle").catch(() => {});
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(900);
}

async function main() {
  fs.mkdirSync(DOCS, { recursive: true });
  fs.mkdirSync(QA, { recursive: true });
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1, reducedMotion: "reduce" });
  const r = await ctx.request.post(`${BASE}/api/auth/login`, { data: { email: "demo@velaroute.dev", password: "demo1234" } });
  if (!r.ok()) throw new Error(`login failed: ${r.status()}`);
  const page = await ctx.newPage();
  // a lead with a rich trace
  await page.goto(`${BASE}/app/inbox`); await settle(page);
  const href = await page.locator('a[href^="/app/leads/"]').first().getAttribute("href");
  const shots: [string, string][] = [...APP_SHOTS, ...(href ? [["lead", href] as [string, string]] : [])];
  for (const [name, url] of shots) {
    await page.goto(`${BASE}${url}`); await settle(page);
    if (!ONLY_QA) await page.screenshot({ path: path.join(DOCS, `${name}.png`) });
    await page.screenshot({ path: path.join(QA, `app-${name}.png`), fullPage: true });
    console.log("app", name);
  }
  for (const theme of ["light", "dark"]) {
    await page.evaluate((t) => localStorage.setItem("theme", t), theme);
    for (const vw of [1280, 375]) {
      await page.setViewportSize({ width: vw, height: vw === 375 ? 812 : 800 });
      for (const u of theme === "dark" ? SITE.slice(0, 4) : SITE) {
        await page.goto(`${BASE}${u}`); await settle(page);
        const name = `site-${theme}-${vw}-${u === "/" ? "home" : u.slice(1).replace(/\//g, "_")}.png`;
        await page.screenshot({ path: path.join(QA, name), fullPage: true });
      }
      console.log("site", theme, vw);
    }
  }
  await browser.close();
}
main().catch((e) => { console.error(e); process.exit(1); });
