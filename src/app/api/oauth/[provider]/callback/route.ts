import { NextResponse } from "next/server";
import { verify } from "@/lib/server/crypto";
import { loadWorkspace, saveWorkspace } from "@/lib/server/store";
import { storageMode } from "@/lib/server/env";

export const dynamic = "force-dynamic";

/** OAuth callback: verifies the signed state and marks the calendar connected. Token exchange needs the client secret env var. */
export async function GET(req: Request, { params }: { params: Promise<{ provider: string }> }) {
  const { provider } = await params;
  const u = new URL(req.url);
  const st = verify<{ wid: string; p: string }>(u.searchParams.get("state") ?? undefined);
  if (!st || st.p !== provider || !u.searchParams.get("code")) return NextResponse.redirect(new URL(`/app/settings/integrations?oauth=${provider}&error=invalid_state`, req.url));
  if (storageMode() === "sqlite") {
    const ws = loadWorkspace(st.wid);
    const i = ws.integrations.find((x) => x.id === provider);
    if (i) Object.assign(i, { connected: true, keyHint: "OAuth", updatedAt: new Date().toISOString() });
    saveWorkspace(ws);
  }
  return NextResponse.redirect(new URL(`/app/settings/integrations?oauth=${provider}&connected=1`, req.url));
}
