/**
 * stdio ⇄ Streamable HTTP bridge for MCP clients that only speak stdio.
 *   VELAROUTE_URL=http://localhost:3300 VELAROUTE_KEY=vr_demo_7Kq2Lm9Xp4Rt8Wz3 npm run mcp
 * Each JSON-RPC line on stdin is POSTed to /api/mcp; responses are written to stdout.
 */
import readline from "node:readline";

const URL_ = (process.env.VELAROUTE_URL ?? "http://localhost:3300").replace(/\/$/, "") + "/api/mcp";
const KEY = process.env.VELAROUTE_KEY ?? "vr_demo_7Kq2Lm9Xp4Rt8Wz3";
let session: string | undefined;

const rl = readline.createInterface({ input: process.stdin });
rl.on("line", async (line) => {
  if (!line.trim()) return;
  let id: unknown = null;
  try { id = JSON.parse(line).id ?? null; } catch { /* forwarded as-is */ }
  try {
    const r = await fetch(URL_, { method: "POST", headers: { "Content-Type": "application/json", Accept: "application/json, text/event-stream", Authorization: `Bearer ${KEY}`, ...(session ? { "Mcp-Session-Id": session } : {}) }, body: line });
    session = r.headers.get("mcp-session-id") ?? session;
    const text = await r.text();
    if (!text.trim()) return; // notifications
    for (const chunk of text.split("\n")) {
      const t = chunk.startsWith("data:") ? chunk.slice(5).trim() : chunk.trim();
      if (t.startsWith("{")) process.stdout.write(t + "\n");
    }
  } catch (e) {
    if (id !== null) process.stdout.write(JSON.stringify({ jsonrpc: "2.0", id, error: { code: -32000, message: `Bridge error: ${(e as Error).message}` } }) + "\n");
  }
});
