import { chromium } from "@playwright/test";
const b = await chromium.launch(); const ctx = await b.newContext({ reducedMotion: "reduce" });
await ctx.request.post("http://localhost:3300/api/auth/login", { data: { email: "demo@velaroute.dev", password: "demo1234" } });
const p = await ctx.newPage();
const urls = process.argv.slice(2);
for (const vw of [375, 768, 1280]) {
  await p.setViewportSize({ width: vw, height: 800 });
  for (const u of urls) {
    await p.goto("http://localhost:3300" + u, { waitUntil: "load" }).catch(() => {});
    await p.waitForTimeout(1200);
    const res = await p.evaluate(() => {
      const W = document.documentElement.clientWidth; const out = [];
      if (document.documentElement.scrollWidth > W + 1) out.push(`DOC scrollWidth ${document.documentElement.scrollWidth} > ${W}`);
      for (const el of document.querySelectorAll("body *")) {
        const r = el.getBoundingClientRect(); if (!r.width) continue;
        let clip = false; for (let a = el.parentElement; a; a = a.parentElement) { const cs = getComputedStyle(a); if (/(hidden|auto|scroll|clip)/.test(cs.overflowX)) { clip = true; break; } }
        if (!clip && (r.right > W + 1 || r.left < -1)) out.push(`${el.tagName.toLowerCase()}.${String(el.className).slice(0, 60)} [${Math.round(r.left)},${Math.round(r.right)}]`);
      }
      return out.slice(0, 6);
    });
    if (res.length) console.log(vw, u, "\n  " + res.join("\n  "));
  }
}
await b.close();
