---
title: REST API
description: Authenticate, create leads, test routes and book meetings over HTTP.
---
The full, interactive reference lives at [/docs/api](/docs/api) and the raw spec at [/api/v1/openapi.json](/api/v1/openapi.json).

## Authentication

Create a key in **Settings → Developers**. Send it as a bearer token:

```bash
curl https://YOUR_HOST/api/v1/leads \
  -H "Authorization: Bearer vr_..."
```

Keys have scopes (`leads:read`, `leads:write`, `routing:read`, `routing:write`, `meetings:write`, `analytics:read`) and are rate-limited per key. The demo workspace key is `vr_demo_7Kq2Lm9Xp4Rt8Wz3`.

## Create a lead

```bash
curl -X POST https://YOUR_HOST/api/v1/leads \
  -H "Authorization: Bearer vr_demo_7Kq2Lm9Xp4Rt8Wz3" \
  -H "Content-Type: application/json" \
  -d '{"email":"maya@kestrel.ai","name":"Maya Brooks","company":"Kestrel AI","source":"api"}'
```

The response contains the lead with its owner, guard verdict, enrichment and full trace.

## Other endpoints

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/api/v1/leads` | List and filter leads |
| GET / PATCH | `/api/v1/leads/{id}` | Read or update a lead |
| GET | `/api/v1/leads/{id}/slots` | Owner's free slots |
| POST | `/api/v1/leads/{id}/book` | Book a slot |
| POST | `/api/v1/leads/{id}/touch` | Log first touch |
| POST | `/api/v1/route/test` | Dry-run routing |
| GET | `/api/v1/rules`, `/api/v1/reps` | Read config |
| GET | `/api/v1/analytics` | Funnel, speed, spend |

Errors use `application/problem+json`.
