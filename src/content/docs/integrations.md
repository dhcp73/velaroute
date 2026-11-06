---
title: Integrations
description: Connect enrichment, AI, CRM, Slack and calendars.
---
Open **Settings → Integrations**. Until you add credentials, each integration runs in **sandbox** mode (realistic simulated results). Once connected it makes live calls. Secrets are encrypted at rest (AES-256-GCM) and only a short hint is ever shown again.

| Integration | What it does | How to connect |
| --- | --- | --- |
| Apollo | Enrichment (people/match) | API key |
| Clay | Enrichment via webhook table | Webhook URL + callback |
| Valyu | Web research fallback | API key |
| OpenAI / Anthropic / OpenRouter | Copilot | API key + model |
| HubSpot | Contact, company and meeting write-back | Private app token |
| Salesforce, Attio | CRM write-back | OAuth (requires your OAuth client) |
| Slack | SLA and routing alerts | Incoming webhook URL |
| Google Calendar / Microsoft 365 | Real availability | OAuth client |

Use **Test** on any integration to make a single verification call.

![Integrations](/docs/screens/integrations.png)

## Where keys live

Keys are stored per workspace, so each workspace pays its own providers. Self-hosters set `SESSION_SECRET` (signing and encryption), `STORAGE_MODE` (`sqlite` or `browser`) and `PUBLIC_URL`; see the README.
