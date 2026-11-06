import { NextResponse } from "next/server";
import { getSession } from "@/lib/server/auth";
import { sign } from "@/lib/server/crypto";
import { publicUrl } from "@/lib/server/env";

export const dynamic = "force-dynamic";

const CONF = {
  google: { env: "GOOGLE_CLIENT_ID", auth: "https://accounts.google.com/o/oauth2/v2/auth", scope: "openid email https://www.googleapis.com/auth/calendar.events https://www.googleapis.com/auth/calendar.freebusy" },
  microsoft: { env: "MICROSOFT_CLIENT_ID", auth: "https://login.microsoftonline.com/common/oauth2/v2.0/authorize", scope: "openid email offline_access Calendars.ReadWrite" },
} as const;

/** Start Google / Microsoft calendar OAuth for the signed-in rep. Needs GOOGLE_CLIENT_ID / MICROSOFT_CLIENT_ID. */
export async function GET(req: Request, { params }: { params: Promise<{ provider: string }> }) {
  const { provider } = await params;
  const s = await getSession();
  if (!s) return NextResponse.redirect(new URL("/login", req.url));
  const c = CONF[provider as keyof typeof CONF];
  if (!c) return NextResponse.json({ error: "Unknown provider" }, { status: 404 });
  const clientId = process.env[c.env];
  if (!clientId) return NextResponse.redirect(new URL(`/app/settings/integrations?oauth=${provider}&error=not_configured`, req.url));
  const state = sign({ wid: s.wid, uid: s.uid, p: provider, exp: Date.now() + 10 * 60000 });
  const u = new URL(c.auth);
  u.search = new URLSearchParams({ client_id: clientId, redirect_uri: `${publicUrl()}/api/oauth/${provider}/callback`, response_type: "code", scope: c.scope, access_type: "offline", prompt: "consent", state }).toString();
  return NextResponse.redirect(u);
}
