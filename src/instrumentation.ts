export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs" || process.env.VERCEL || process.env.VR_DISABLE_WORKER) return;
  // Local SLA agent + health monitor: tick every 30s (Vercel uses Cron + ticks on every request).
  const port = process.env.PORT || "3300";
  const run = () => fetch(`http://127.0.0.1:${port}/api/cron/tick`, { headers: process.env.CRON_SECRET ? { authorization: `Bearer ${process.env.CRON_SECRET}` } : {} }).catch(() => undefined);
  setTimeout(run, 8000);
  setInterval(run, 30000);
}
