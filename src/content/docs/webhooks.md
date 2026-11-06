---
title: Webhooks
description: Signed event delivery for lead, meeting and SLA events.
---
Add an endpoint in **Settings → Developers → Webhooks** and choose events:

- `lead.created`, `lead.routed`, `lead.blocked`
- `lead.stage_changed`, `lead.touched`, `lead.escalated`
- `meeting.booked`
- `sla.breached`

## Verifying signatures

Each request has three headers:

- `X-Velaroute-Event` — the event type

- `X-Velaroute-Timestamp` — Unix seconds
- `X-Velaroute-Signature` — `sha256=` + HMAC-SHA256 of `timestamp + "." + rawBody` using your endpoint secret

```ts
import { createHmac, timingSafeEqual } from "node:crypto";

export function verify(secret: string, ts: string, body: string, sig: string) {
  const expected = "sha256=" + createHmac("sha256", secret).update(`${ts}.${body}`).digest("hex");
  const ok = expected.length === sig.length && timingSafeEqual(Buffer.from(expected), Buffer.from(sig));
  return ok && Math.abs(Date.now() / 1000 - Number(ts)) < 300;
}
```

Reject requests older than five minutes to prevent replays. Recent deliveries and their status codes are listed under **Deliveries**.
