import { chromium } from "@playwright/test";
const b = await chromium.launch(); const ctx = await b.newContext();
await ctx.request.post("http://localhost:3300/api/auth/login", { data: { email: "demo@velaroute.dev", password: "demo1234" } });
const p = await ctx.newPage();
const urls = process.argv.slice(2);
p.on("console", (m) => { if (["error", "warning"].includes(m.type())) console.log("[" + m.type() + "]", p.url(), m.text().slice(0, 400)); });
p.on("pageerror", (e) => console.log("[pageerror]", p.url(), e.message.slice(0, 400)));
for (const u of urls) { await p.goto("http://localhost:3300" + u); await p.waitForTimeout(2500); }
await b.close();
