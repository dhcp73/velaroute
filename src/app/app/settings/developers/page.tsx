"use client";
import Link from "next/link";
import { useState } from "react";
import { Copy, KeyRound, Plus, Send, Trash2, Webhook } from "lucide-react";
import { useWs } from "@/components/app/workspace";
import { Loading, PageHeader } from "@/components/app/shell";
import { Button, Card, CardHeader, Chip, Empty, Field, Input, Modal } from "@/components/ui";
import { fmtDate } from "@/components/app/format";
import { cn } from "@/lib/cn";

const SCOPES = ["leads:read", "leads:write", "routing:read", "routing:write", "meetings:write", "analytics:read"];
const EVENTS = ["lead.created", "lead.routed", "lead.blocked", "meeting.booked", "sla.breached", "lead.escalated", "lead.stage_changed", "lead.touched"];

export default function Developers() {
  const { ws, dispatch, busy, toast } = useWs();
  const [keyModal, setKeyModal] = useState(false);
  const [keyName, setKeyName] = useState("");
  const [scopes, setScopes] = useState<string[]>(["leads:read", "leads:write"]);
  const [plain, setPlain] = useState("");
  const [hook, setHook] = useState<{ url: string; events: string[] } | null>(null);
  if (!ws) return <Loading />;
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const copy = (t: string) => { void navigator.clipboard?.writeText(t); toast("Copied"); };
  const mcpConfig = JSON.stringify({ mcpServers: { velaroute: { url: `${origin}/api/mcp`, headers: { Authorization: "Bearer YOUR_API_KEY" } } } }, null, 2);

  return (
    <>
      <PageHeader title="Developers" subtitle="REST API, signed webhooks and an MCP server for your AI tools." actions={<Link href="/docs/api" className="inline-flex h-10 items-center rounded-full border border-line bg-surface px-4 text-sm font-medium hover:bg-surface-2">API reference</Link>} />
      <Card>
        <CardHeader title="API keys" subtitle="Scoped keys. The full key is shown once — we store only a SHA-256 hash." action={<Button size="sm" icon={<Plus className="h-4 w-4" />} onClick={() => { setKeyModal(true); setPlain(""); setKeyName(""); }}>Create key</Button>} />
        {ws.apiKeys.length === 0 ? <Empty icon={<KeyRound className="h-5 w-5" />} title="No API keys" /> : (
          <ul className="mt-3 divide-y divide-line">
            {ws.apiKeys.map((k) => (
              <li key={k.id} className={cn("flex flex-wrap items-center gap-3 px-5 py-3", k.revoked && "opacity-50")}>
                <KeyRound className="h-4 w-4 text-faint" />
                <div className="min-w-0 flex-1"><p className="truncate text-sm font-medium">{k.name} <code className="ml-1 text-xs text-muted">{k.prefix}…</code></p><p className="mt-0.5 flex flex-wrap gap-1">{k.scopes.map((s) => <Chip key={s}>{s}</Chip>)}</p></div>
                <span className="text-xs text-faint">{k.lastUsedAt ? `Used ${fmtDate(k.lastUsedAt)}` : `Created ${fmtDate(k.createdAt, { dateStyle: "medium" })}`}</span>
                {k.revoked ? <Chip tone="rose">Revoked</Chip> : <Button size="sm" variant="ghost" onClick={() => dispatch({ type: "apikey.revoke", id: k.id }, { success: "Key revoked" })}>Revoke</Button>}
              </li>
            ))}
          </ul>
        )}
        <div className="border-t border-line px-5 py-4">
          <p className="mb-2 text-xs font-medium text-muted">Quick start</p>
          <pre className="overflow-x-auto rounded-2xl bg-[#14152a] p-4 text-xs leading-relaxed text-[#e4e1ff]">{`curl -X POST ${origin}/api/v1/leads \\
  -H "Authorization: Bearer $VELAROUTE_KEY" -H "Content-Type: application/json" \\
  -d '{"email":"maya@kestrel.ai","name":"Maya Brooks","title":"Head of Revenue"}'`}</pre>
        </div>
      </Card>

      <Card className="mt-4">
        <CardHeader title="Webhooks" subtitle="Signed with HMAC-SHA256: header X-Velaroute-Signature = sha256(secret, timestamp + '.' + body)." action={<Button size="sm" icon={<Plus className="h-4 w-4" />} onClick={() => setHook({ url: "https://", events: ["lead.routed", "meeting.booked", "sla.breached"] })}>Add endpoint</Button>} />
        {ws.webhooks.length === 0 ? <Empty icon={<Webhook className="h-5 w-5" />} title="No endpoints" /> : (
          <ul className="mt-3 divide-y divide-line">
            {ws.webhooks.map((h) => {
              const d = ws.deliveries.filter((x) => x.webhookId === h.id);
              return (
                <li key={h.id} className="px-5 py-3">
                  <div className="flex flex-wrap items-center gap-3">
                    <Webhook className="h-4 w-4 text-faint" />
                    <code className="min-w-0 flex-1 truncate text-sm">{h.url}</code>
                    <span className="text-xs text-muted">{d.length ? `${Math.round((d.filter((x) => x.ok).length / d.length) * 100)}% delivered` : "No deliveries"}</span>
                    <Button size="sm" variant="secondary" icon={<Send className="h-3.5 w-3.5" />} loading={busy} onClick={async () => { const r = await dispatch<{ status: number; ok: boolean } | null>({ type: "webhook.test", id: h.id }); if (r !== undefined) toast(r ? `Test sent — endpoint answered ${r.status || "no response"}` : "Test sent", r && !r.ok ? "error" : "ok"); }}>Test</Button>
                    <button type="button" className="rounded-full p-2 text-muted hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-500/10" aria-label="Delete webhook" onClick={() => dispatch({ type: "webhook.delete", id: h.id }, { success: "Endpoint removed" })}><Trash2 className="h-4 w-4" /></button>
                  </div>
                  <p className="mt-1.5 flex flex-wrap gap-1">{h.events.map((e) => <Chip key={e} tone="sky">{e}</Chip>)}</p>
                  <p className="mt-1.5 flex items-center gap-2 text-xs text-faint">Secret <code>{h.secret.slice(0, 10)}…</code><button type="button" className="text-primary-600 hover:underline dark:text-primary-300" onClick={() => copy(h.secret)}>Copy secret</button></p>
                </li>
              );
            })}
          </ul>
        )}
      </Card>

      <Card className="mt-4" id="mcp">
        <CardHeader title="MCP server" subtitle="Let Claude, Cursor or any MCP client work your inbound queue. Streamable HTTP, authenticated with an API key." />
        <div className="grid gap-4 p-5 lg:grid-cols-2">
          <div>
            <Field label="Endpoint" htmlFor="mcp-url"><div className="flex gap-2"><Input id="mcp-url" readOnly value={`${origin}/api/mcp`} /><Button variant="secondary" icon={<Copy className="h-4 w-4" />} onClick={() => copy(`${origin}/api/mcp`)}>Copy</Button></div></Field>
            <p className="label mt-4">Client config</p>
            <pre className="overflow-x-auto rounded-2xl bg-[#14152a] p-4 text-xs text-[#e4e1ff]">{mcpConfig}</pre>
            <Button size="sm" variant="ghost" className="mt-2" icon={<Copy className="h-4 w-4" />} onClick={() => copy(mcpConfig)}>Copy config</Button>
          </div>
          <div>
            <p className="label">Tools</p>
            <ul className="grid gap-1.5 text-sm">{["list_leads", "get_lead", "create_lead", "explain_route", "get_sla_breaches", "get_free_slots", "book_meeting", "update_stage", "log_touch", "get_analytics", "list_rules"].map((t) => <li key={t} className="rounded-xl bg-surface-2 px-3 py-1.5"><code>{t}</code></li>)}</ul>
            <p className="mt-3 text-xs text-muted">Local stdio bridge: <code>VELAROUTE_URL=… VELAROUTE_KEY=… npm run mcp</code></p>
          </div>
        </div>
      </Card>

      <Modal open={keyModal} onClose={() => setKeyModal(false)} title={plain ? "Copy your key" : "Create API key"} footer={plain ? <Button onClick={() => setKeyModal(false)}>Done</Button> : <><Button variant="ghost" onClick={() => setKeyModal(false)}>Cancel</Button><Button loading={busy} onClick={async () => { const r = await dispatch<string>({ type: "apikey.create", name: keyName, scopes }, { success: "Key created" }); if (r) setPlain(r); }}>Create</Button></>}>
        {plain ? (
          <><p className="text-sm text-muted">This is the only time the full key is shown.</p><div className="mt-3 flex gap-2"><Input readOnly value={plain} aria-label="New API key" className="font-mono text-xs" /><Button variant="secondary" icon={<Copy className="h-4 w-4" />} onClick={() => copy(plain)}>Copy</Button></div></>
        ) : (
          <div className="grid gap-4">
            <Field label="Name" htmlFor="key-name"><Input id="key-name" value={keyName} onChange={(e) => setKeyName(e.target.value)} placeholder="e.g. Website backend" /></Field>
            <div><p className="label">Scopes</p><div className="flex flex-wrap gap-2">{SCOPES.map((s) => { const on = scopes.includes(s); return <button key={s} type="button" aria-pressed={on} onClick={() => setScopes(on ? scopes.filter((x) => x !== s) : [...scopes, s])} className={cn("rounded-full border px-3 py-1.5 text-sm", on ? "border-primary-400 bg-primary-50 text-primary-900 dark:bg-primary-500/15 dark:text-primary-100" : "border-line text-muted")}>{s}</button>; })}</div></div>
          </div>
        )}
      </Modal>
      <Modal open={!!hook} onClose={() => setHook(null)} title="Add webhook endpoint" footer={<><Button variant="ghost" onClick={() => setHook(null)}>Cancel</Button><Button loading={busy} onClick={async () => { const r = await dispatch({ type: "webhook.save", webhook: hook! }, { success: "Endpoint added" }); if (r !== undefined) setHook(null); }}>Add</Button></>}>
        {hook && <div className="grid gap-4">
          <Field label="Endpoint URL" htmlFor="wh-url"><Input id="wh-url" value={hook.url} onChange={(e) => setHook({ ...hook, url: e.target.value })} /></Field>
          <div><p className="label">Events</p><div className="flex flex-wrap gap-2">{EVENTS.map((e) => { const on = hook.events.includes(e); return <button key={e} type="button" aria-pressed={on} onClick={() => setHook({ ...hook, events: on ? hook.events.filter((x) => x !== e) : [...hook.events, e] })} className={cn("rounded-full border px-3 py-1.5 text-sm", on ? "border-primary-400 bg-primary-50 text-primary-900 dark:bg-primary-500/15 dark:text-primary-100" : "border-line text-muted")}>{e}</button>; })}</div></div>
        </div>}
      </Modal>
    </>
  );
}
