import { json, withKey } from "@/lib/server/api";
import { saveWorkspace } from "@/lib/server/store";
import { TOOLS } from "@/lib/server/tools";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

type Rpc = { jsonrpc: "2.0"; id?: string | number | null; method: string; params?: Record<string, unknown> };
const PROTOCOL = "2025-06-18";

/**
 * MCP server over Streamable HTTP (stateless, JSON responses). Auth: Bearer API key; each tool
 * enforces its scope. Works with Claude Desktop/Code, Cursor and any MCP client.
 */
export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as Rpc | Rpc[] | null;
  if (!body) return json({ jsonrpc: "2.0", id: null, error: { code: -32700, message: "Parse error" } }, 400);
  const batch = Array.isArray(body) ? body : [body];
  const out: unknown[] = [];
  for (const m of batch) {
    const reply = (result: unknown) => out.push({ jsonrpc: "2.0", id: m.id ?? null, result });
    const fail = (code: number, message: string) => out.push({ jsonrpc: "2.0", id: m.id ?? null, error: { code, message } });
    if (m.id === undefined || m.method.startsWith("notifications/")) continue;
    switch (m.method) {
      case "initialize":
        reply({ protocolVersion: (m.params?.protocolVersion as string) || PROTOCOL, capabilities: { tools: { listChanged: false } }, serverInfo: { name: "velaroute", title: "Velaroute inbound engine", version: "1.0.0" }, instructions: "Tools to inspect and act on inbound leads: list, explain routing, find SLA breaches, book meetings, update stages." });
        break;
      case "ping": reply({}); break;
      case "tools/list":
        reply({ tools: TOOLS.map((t) => ({ name: t.name, description: `${t.description} (scope: ${t.scope})`, inputSchema: t.inputSchema })) });
        break;
      case "tools/call": {
        const name = String(m.params?.name ?? "");
        const tool = TOOLS.find((t) => t.name === name);
        if (!tool) { fail(-32602, `Unknown tool: ${name}`); break; }
        const ctx = withKey(req, tool.scope);
        if (ctx instanceof Response) { const e = (await ctx.json()) as { error: { detail: string } }; reply({ isError: true, content: [{ type: "text", text: `Auth error: ${e.error.detail}` }] }); break; }
        try {
          const data = await tool.run(ctx.ws, (m.params?.arguments as Record<string, unknown>) ?? {});
          saveWorkspace(ctx.ws);
          reply({ content: [{ type: "text", text: JSON.stringify(data, null, 2) }], structuredContent: { result: data } });
        } catch (e) {
          reply({ isError: true, content: [{ type: "text", text: (e as Error).message }] });
        }
        break;
      }
      default: fail(-32601, `Method not found: ${m.method}`);
    }
  }
  if (!out.length) return new Response(null, { status: 202 });
  return json(Array.isArray(body) ? out : out[0]);
}

export async function GET() {
  return json({ name: "velaroute", transport: "streamable-http", endpoint: "/api/mcp", auth: "Authorization: Bearer <API key>", tools: TOOLS.map((t) => t.name) }, 200);
}
