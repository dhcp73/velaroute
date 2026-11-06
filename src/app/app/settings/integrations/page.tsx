"use client";
import { useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { Bot, Building, Calendar, Database, MessageSquare, Search } from "lucide-react";
import { useWs } from "@/components/app/workspace";
import { Loading, PageHeader } from "@/components/app/shell";
import { Button, Card, Chip, Field, Input, Modal } from "@/components/ui";
import type { ProviderId } from "@/lib/engine/types";

const META: Record<ProviderId, { name: string; cat: string; icon: typeof Bot; desc: string; keyLabel: string; placeholder: string; oauth?: boolean; docs: string }> = {
  openai: { name: "OpenAI", cat: "AI models", icon: Bot, desc: "Copilot via the OpenAI SDK and Vercel AI SDK (@ai-sdk/openai).", keyLabel: "API key", placeholder: "sk-…", docs: "https://platform.openai.com/api-keys" },
  openrouter: { name: "OpenRouter", cat: "AI models", icon: Bot, desc: "Any model through @openrouter/ai-sdk-provider.", keyLabel: "API key", placeholder: "sk-or-…", docs: "https://openrouter.ai/keys" },
  anthropic: { name: "Anthropic", cat: "AI models", icon: Bot, desc: "Claude models via @ai-sdk/anthropic.", keyLabel: "API key", placeholder: "sk-ant-…", docs: "https://console.anthropic.com/settings/keys" },
  apollo: { name: "Apollo", cat: "Enrichment", icon: Search, desc: "People + company enrichment (People Match API), first in the waterfall.", keyLabel: "API key", placeholder: "Apollo master API key", docs: "https://docs.apollo.io/reference/people-enrichment" },
  clay: { name: "Clay", cat: "Enrichment", icon: Database, desc: "Push rows to a Clay table webhook; Clay posts results back to /api/integrations/clay/callback.", keyLabel: "Table webhook URL", placeholder: "https://api.clay.com/v3/sources/webhook/…", docs: "https://university.clay.com/docs/webhook-integration-guide" },
  valyu: { name: "Valyu", cat: "Enrichment", icon: Search, desc: "Web + deep research search (valyu-js) for company facts and meeting briefs.", keyLabel: "API key", placeholder: "val_…", docs: "https://docs.valyu.ai" },
  hubspot: { name: "HubSpot", cat: "CRM", icon: Building, desc: "Create/update contacts, companies, owners and meetings.", keyLabel: "Private app token", placeholder: "pat-na1-…", docs: "https://developers.hubspot.com/docs/api/private-apps" },
  salesforce: { name: "Salesforce", cat: "CRM", icon: Building, desc: "Leads, contacts and events via the REST API.", keyLabel: "Access token", placeholder: "00D…", docs: "https://developer.salesforce.com/docs/atlas.en-us.api_rest.meta/api_rest/" },
  attio: { name: "Attio", cat: "CRM", icon: Building, desc: "People, companies and list entries via the Attio API.", keyLabel: "Access token", placeholder: "Attio API token", docs: "https://docs.attio.com" },
  slack: { name: "Slack", cat: "Alerts", icon: MessageSquare, desc: "New-lead, SLA breach and escalation alerts to a channel.", keyLabel: "Incoming webhook URL", placeholder: "https://hooks.slack.com/services/…", docs: "https://api.slack.com/messaging/webhooks" },
  google: { name: "Google Calendar", cat: "Calendars", icon: Calendar, desc: "Free/busy and Meet links for each rep (OAuth).", keyLabel: "", placeholder: "", oauth: true, docs: "https://developers.google.com/calendar/api" },
  microsoft: { name: "Microsoft Outlook", cat: "Calendars", icon: Calendar, desc: "Outlook calendar and Teams links via Microsoft Graph (OAuth).", keyLabel: "", placeholder: "", oauth: true, docs: "https://learn.microsoft.com/graph/api/resources/calendar" },
};

function Inner() {
  const { ws, dispatch, busy } = useWs();
  const q = useSearchParams();
  const [open, setOpen] = useState<ProviderId | null>(null);
  const [key, setKey] = useState("");
  const [msg, setMsg] = useState("");
  if (!ws) return <Loading />;
  const oauthErr = q.get("error");
  const cats = [...new Set(Object.values(META).map((m) => m.cat))];
  const connect = async (secret: string) => {
    const r = await dispatch<string>({ type: "integration.connect", id: open!, secret }, { success: `${META[open!].name} connected` });
    if (r) { setMsg(r); setOpen(null); setKey(""); }
  };
  return (
    <>
      <PageHeader title="Integrations" subtitle="Bring your own keys. Keys are encrypted at rest (AES-256-GCM) and never shown again. Sandbox mode simulates a provider so you can test the flow first." />
      {oauthErr && <Card className="mb-4 border-amber-300 bg-amber-50 p-4 text-sm text-amber-900 dark:bg-amber-500/10 dark:text-amber-100">{oauthErr === "not_configured" ? `${q.get("oauth") === "google" ? "Google" : "Microsoft"} sign-in isn't configured on this server yet. Set ${q.get("oauth") === "google" ? "GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET" : "MICROSOFT_CLIENT_ID / MICROSOFT_CLIENT_SECRET"} and the redirect URL /api/oauth/${q.get("oauth")}/callback.` : "The sign-in didn't complete. Try again."}</Card>}
      {q.get("connected") && <Card className="mb-4 p-4 text-sm">Calendar connected.</Card>}
      {msg && <p className="mb-4 text-sm text-muted" aria-live="polite">Last check: {msg}</p>}
      {cats.map((c) => (
        <section key={c} className="mb-6">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-faint">{c}</h2>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {(Object.keys(META) as ProviderId[]).filter((id) => META[id].cat === c).map((id) => {
              const m = META[id];
              const i = ws.integrations.find((x) => x.id === id)!;
              return (
                <Card key={id} className="flex flex-col p-5">
                  <div className="flex items-center justify-between gap-2"><span className="grid h-10 w-10 place-items-center rounded-2xl bg-surface-2"><m.icon className="h-5 w-5 text-primary-600 dark:text-primary-300" /></span>{i.connected ? <Chip tone={i.keyHint === "sandbox" ? "amber" : "mint"} dot>{i.keyHint === "sandbox" ? "Sandbox" : "Connected"}</Chip> : <Chip>Not connected</Chip>}</div>
                  <h3 className="mt-3 font-semibold">{m.name}</h3>
                  <p className="mt-1 flex-1 text-sm text-muted">{m.desc}</p>
                  {i.connected && i.keyHint && <p className="mt-2 text-xs text-faint">Key {i.keyHint}</p>}
                  <div className="mt-4 flex gap-2">
                    {m.oauth ? <a href={`/api/oauth/${id}/start`} className="inline-flex h-8 items-center rounded-full bg-primary-500 px-3 text-[13px] font-medium text-white hover:bg-primary-600">{i.connected ? "Reconnect" : "Connect"}</a>
                      : <Button size="sm" variant={i.connected ? "secondary" : "primary"} onClick={() => { setOpen(id); setKey(""); }}>{i.connected ? "Update key" : "Connect"}</Button>}
                    {i.connected && <Button size="sm" variant="ghost" onClick={() => dispatch({ type: "integration.disconnect", id }, { success: `${m.name} disconnected` })}>Disconnect</Button>}
                  </div>
                </Card>
              );
            })}
          </div>
        </section>
      ))}
      <Modal open={!!open} onClose={() => setOpen(null)} title={open ? `Connect ${META[open].name}` : ""} footer={<><Button variant="ghost" onClick={() => connect("sandbox")} disabled={busy}>Use sandbox</Button><Button loading={busy} onClick={() => connect(key)} disabled={!key.trim()}>Verify & save</Button></>}>
        {open && <>
          <Field label={META[open].keyLabel} htmlFor="int-key" hint="We make one cheap test call to verify it before saving."><Input id="int-key" type="password" autoComplete="off" value={key} onChange={(e) => setKey(e.target.value)} placeholder={META[open].placeholder} /></Field>
          <a href={META[open].docs} target="_blank" rel="noreferrer" className="mt-3 inline-block text-sm font-medium text-primary-600 hover:underline dark:text-primary-300">Where do I find this?</a>
        </>}
      </Modal>
    </>
  );
}

export default function Integrations() {
  return <Suspense fallback={<Loading />}><Inner /></Suspense>;
}
